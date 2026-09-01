import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import Constants from 'expo-constants';
import { apiRequest } from '../services/api';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  onNavigate: (screen: 'Home' | 'Login' | 'Register') => void;
}

const GOOGLE_ANDROID_CLIENT_ID = '560988320829-31goecj69287hpnbbm0vhuhrt6bjbl2v.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID = '560988320829-vn69cuihidkuvrt3cqhv62av9s1ja5sm.apps.googleusercontent.com';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);


  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        verifyGoogleTokenAndLogin(id_token);
      }
    } else if (response?.type === 'error') {
      setLoading(false);
      Alert.alert('Google Sign-In Error', response.error?.message || 'Sign-In failed. Please try again.');
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setLoading(false);
    }
  }, [response]);

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
        onNavigate('Home');
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
        onNavigate('Home');
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
      // Response is handled in the useEffect above
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Authentication Error', err.message || 'Could not open Google Sign-In.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Back to Home Header */}
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('Home')}>
          <Ionicons name="arrow-back-outline" size={24} color="#ffffff" />
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="book" size={24} color="white" />
          </View>
          <Text style={styles.logoText}>
            Sameer <Text style={styles.logoHighlight}>Library</Text>
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue</Text>

          {/* Sliding Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'student' && styles.activeTab]}
              onPress={() => setActiveTab('student')}
            >
              <Text style={[styles.tabText, activeTab === 'student' && styles.activeTabText]}>Student</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'admin' && styles.activeTab]}
              onPress={() => setActiveTab('admin')}
            >
              <Text style={[styles.tabText, activeTab === 'admin' && styles.activeTabText]}>Admin</Text>
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {activeTab === 'student' ? 'Student Email' : 'Admin Email'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={activeTab === 'student' ? 'student@gmail.com' : 'admin@sameerlibrary.com'}
                placeholderTextColor="#525252"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#525252"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <Button
              title={activeTab === 'student' ? 'Sign In as Student' : 'Sign In as Admin'}
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            {activeTab === 'student' && (
              <View style={styles.studentGoogleWrapper}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handleGoogleLogin}
                  disabled={loading}
                >
                  <Ionicons name="logo-google" size={18} color="#000000" style={styles.googleIcon} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text style={styles.signupLink} onPress={() => onNavigate('Register')}>
              Sign Up
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 20,
    zIndex: 10,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    marginTop: 60,
  },
  logoIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#0d9488',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  logoHighlight: {
    color: '#0d9488',
  },
  card: {
    backgroundColor: '#171717',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#a3a3a3',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#262626',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#171717',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    color: '#a3a3a3',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  studentContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  googleIcon: {
    marginTop: 2,
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  studentGoogleWrapper: {
    width: '100%',
    marginTop: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333333',
  },
  dividerText: {
    color: '#737373',
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  studentNote: {
    color: '#525252',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#a3a3a3',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#262626',
    color: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#404040',
  },
  loginButton: {
    backgroundColor: '#0d9488',
    marginTop: 10,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#525252',
    fontSize: 14,
  },
  signupLink: {
    color: '#0d9488',
    fontWeight: '600',
  },
});
export default LoginScreen;
