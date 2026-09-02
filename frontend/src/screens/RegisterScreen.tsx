import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../services/api';
import { COLORS } from '../utils/constants';

interface RegisterScreenProps {
  onNavigate: (screen: 'Home' | 'Login' | 'Register' | 'StudentDashboard' | 'AdminDashboard') => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');
  const [loading, setLoading] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminCode, setAdminCode] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter your full name.');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password || password.length < 8) {
      Alert.alert('Password Too Short', 'Password must be at least 8 characters.');
      return;
    }
    if (activeTab === 'admin' && !adminCode) {
      Alert.alert('Passcode Required', 'Admin authorization code is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
        }),
      });

      setLoading(false);
      if (res.success || res.user) {
        Alert.alert(
          'Registration Success 🎉',
          `Account created successfully for ${name}! Please sign in now with your credentials.`,
          [{ text: 'Sign In Now', onPress: () => onNavigate('Login') }]
        );
      } else {
        Alert.alert('Registration Failed', res.error || 'Could not create account. Email or phone might already exist.');
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Could not connect to the registration server.');
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
            <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('Home')} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.topBarBrand}>LibReserve</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Heading Section */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join LibReserve to book your preferred study space effortlessly.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Account Type Selector */}
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

            {/* Field: Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Praveen Sharma"
                placeholderTextColor={COLORS.outline}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Field: Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.phoneInputRow}>
                <View style={styles.prefixBox}>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="9876543210"
                  placeholderTextColor={COLORS.outline}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Field: Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="praveen@university.edu"
                placeholderTextColor={COLORS.outline}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Field: Password */}
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
              <Text style={styles.helperText}>Must be at least 8 characters.</Text>
            </View>

            {/* Field: Admin Passcode (If admin selected) */}
            {activeTab === 'admin' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Admin Passcode</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter secret invite code"
                  placeholderTextColor={COLORS.outline}
                  value={adminCode}
                  onChangeText={setAdminCode}
                  secureTextEntry
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Continue with Google */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => {
                Alert.alert('Google Sign Up', 'Please use Sign In screen to authenticate with your Google account.', [
                  { text: 'Go to Sign In', onPress: () => onNavigate('Login') }
                ]);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={18} color="#4285F4" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text style={styles.signinLink} onPress={() => onNavigate('Login')}>
                Sign in
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 20,
    marginTop: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
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
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefixBox: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: COLORS.outlineVariant,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  phoneInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
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
    height: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  helperText: {
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
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
  signinLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});

export default RegisterScreen;
