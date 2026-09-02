import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { COLORS } from '../utils/constants';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  onNavigate: (screen: 'Home' | 'Login' | 'Register' | 'StudentDashboard' | 'AdminDashboard') => void;
}

const GOOGLE_ANDROID_CLIENT_ID = '560988320829-31goecj69287hpnbbm0vhuhrt6bjbl2v.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID = '560988320829-vn69cuihidkuvrt3cqhv62av9s1ja5sm.apps.googleusercontent.com';
const ANDROID_REDIRECT_URI = 'com.googleusercontent.apps.560988320829-31goecj69287hpnbbm0vhuhrt6bjbl2v:/oauth2redirect/google';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({
    native: ANDROID_REDIRECT_URI,
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token || (response as any).authentication?.idToken;
      const accessToken = (response as any).authentication?.accessToken;

      if (idToken) {
        verifyGoogleTokenAndLogin(idToken);
      } else if (accessToken) {
        fetchUserInfoAndLogin(accessToken);
      } else {
        setLoading(false);
        Alert.alert('Sign-In Error', 'No authorization token returned from Google.');
      }
    } else if (response?.type === 'error') {
      setLoading(false);
      Alert.alert('Google Sign-In Error', response.error?.message || 'Sign-In failed. Please try again.');
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setLoading(false);
    }
  }, [response]);

  const fetchUserInfoAndLogin = async (accessToken: string) => {
    setLoading(true);
    try {
      const userRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userRes.json();

      if (userInfo?.email) {
        const res = await apiRequest('/auth/google', {
          method: 'POST',
          body: JSON.stringify({
            email: userInfo.email,
            directEmail: userInfo.email,
            name: userInfo.name || 'Google Student',
            directName: userInfo.name || 'Google Student',
            picture: userInfo.picture,
            directPicture: userInfo.picture,
            token: accessToken,
          }),
        });

        setLoading(false);
        if (res.success && res.token && res.user) {
          await login(res.token, res.user);
          Alert.alert('Success', `Welcome, ${res.user.name}!`);
          onNavigate(res.user.role === 'ADMIN' || res.user.role === 'OWNER' ? 'AdminDashboard' : 'StudentDashboard');
        } else {
          Alert.alert('Authentication Failed', res.error || 'Could not sign in with Google.');
        }
      } else {
        throw new Error('Could not fetch user profile from Google.');
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Google Auth Error', error.message || 'Failed to authenticate with Google profile.');
    }
  };

  const verifyGoogleTokenAndLogin = async (idToken: string) => {
    setLoading(true);
    try {
      const res = await apiRequest('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ token: idToken }),
      });

      setLoading(false);
      if (res.success && res.token && res.user) {
        await login(res.token, res.user);
        Alert.alert('Success', `Welcome, ${res.user.name}!`);
        onNavigate(res.user.role === 'ADMIN' || res.user.role === 'OWNER' ? 'AdminDashboard' : 'StudentDashboard');
      } else {
        Alert.alert('Authentication Failed', res.error || 'Could not sign in with Google.');
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Authentication Error', error.message || 'An error occurred during authentication.');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      setLoading(false);
      if (res.success && res.token && res.user) {
        if (activeTab === 'admin' && res.user.role !== 'ADMIN' && res.user.role !== 'OWNER') {
          Alert.alert('Unauthorized', 'This account does not have Admin access.');
          return;
        }
        await login(res.token, res.user);
        Alert.alert('Success', `Welcome back, ${res.user.name}!`);
        onNavigate(res.user.role === 'ADMIN' || res.user.role === 'OWNER' ? 'AdminDashboard' : 'StudentDashboard');
      } else {
        Alert.alert('Login Failed', res.error || 'Invalid email or password.');
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Connection Error', error.message || 'Could not connect to the backend server.');
    }
  };

  const handleGoogleLogin = async () => {
    if (!request) {
      Alert.alert('Error', 'Google Sign-In is not ready yet. Please wait a moment and try again.');
      return;
    }
    setLoading(true);
    try {
      await promptAsync();
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Authentication Error', err.message || 'Could not open Google Sign-In.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => onNavigate('Home')} 
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.topBarBrand}>Sameer Library</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Logo & Header */}
          <View style={styles.headerSection}>
            <Text style={styles.brandTitle}>Sameer Library</Text>
            <Text style={styles.brandSubtitle}>Premium space for deep work.</Text>
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>
              {activeTab === 'student' ? 'Access your student dashboard and seat bookings.' : 'Access administrator controls & management.'}
            </Text>

            {/* Role Tab Selector */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'student' && styles.activeTab]}
                onPress={() => setActiveTab('student')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, activeTab === 'student' && styles.activeTabText]}>Student</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'admin' && styles.activeTab]}
                onPress={() => setActiveTab('admin')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, activeTab === 'admin' && styles.activeTabText]}>Admin</Text>
              </TouchableOpacity>
            </View>

            {/* Input: Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {activeTab === 'student' ? 'Student Email' : 'Admin Email'}
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor={COLORS.outline}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Input: Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { paddingRight: 44 }]}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.outline}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.eyeButton} 
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.outline} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Signing In...' : activeTab === 'student' ? 'Sign In as Student' : 'Sign In as Admin'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            {activeTab === 'student' && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Google Sign-In */}
                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handleGoogleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-google" size={18} color="#4285F4" style={styles.googleIcon} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text style={styles.signupLink} onPress={() => onNavigate('Register')}>
                Create account
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarBrand: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 4px 20px rgba(0,0,0,0.04)',
      },
    }),
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: COLORS.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',
      },
    }),
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.outline,
    marginBottom: 6,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 4px 14px rgba(0, 104, 91, 0.2)',
      },
    }),
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  demoBox: {
    marginTop: 14,
    padding: 10,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 10,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.outline,
    marginBottom: 4,
  },
  demoChipsRow: {
    flexDirection: 'row',
  },
  demoChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  demoChipText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.outlineVariant,
    opacity: 0.5,
  },
  dividerText: {
    fontSize: 12,
    color: COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    paddingVertical: 13,
    gap: 10,
  },
  googleIcon: {
    marginRight: 4,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signupLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});

export default LoginScreen;
