import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';

import { apiRequest } from '../services/api';

interface RegisterScreenProps {
  onNavigate: (screen: 'Home' | 'Login' | 'Register') => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminCode, setAdminCode] = useState(''); // Extra field for Admin register

  const handleNextStep = () => {
    if (!name || !email || !phone) {
      Alert.alert('Error', 'Please fill in all personal details.');
      return;
    }
    // Simple email validation regex
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    if (phone.trim().length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please enter password and confirm password.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (activeTab === 'admin' && !adminCode) {
      Alert.alert('Error', 'Admin passcode is required to register as an administrator.');
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
          `Account created successfully for ${name}! Please sign in now with your email and password.`,
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

  const handleGoogleSignup = () => {
    setLoading(true);
    // Simulate google signup
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Google Account linked successfully!', [
        { text: 'Proceed', onPress: () => onNavigate('Login') }
      ]);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.cardTitle}>Create account</Text>
            <Text style={styles.cardSubtitle}>Join our study community</Text>

            {/* Sliding Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'student' && styles.activeTab]}
                onPress={() => {
                  setActiveTab('student');
                  setStep(1);
                }}
              >
                <Text style={[styles.tabText, activeTab === 'student' && styles.activeTabText]}>Student</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'admin' && styles.activeTab]}
                onPress={() => {
                  setActiveTab('admin');
                  setStep(1);
                }}
              >
                <Text style={[styles.tabText, activeTab === 'admin' && styles.activeTabText]}>Admin</Text>
              </TouchableOpacity>
            </View>

            {/* Google Signup for Students only */}
            {activeTab === 'student' && step === 1 && (
              <>
                <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignup}>
                  <Ionicons name="logo-google" size={18} color="#000000" style={styles.googleIcon} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
              </>
            )}

            {/* Progress Step Bar */}
            <View style={styles.progressBar}>
              <View style={[styles.progressSegment, step >= 1 && styles.progressActive]} />
              <View style={[styles.progressSegment, step >= 2 && styles.progressActive]} />
            </View>

            {/* Multi-step Forms */}
            {step === 1 ? (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    placeholderTextColor="#525252"
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="john@example.com"
                    placeholderTextColor="#525252"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+91 99999 99999"
                    placeholderTextColor="#525252"
                    value={phone}
                    onChangeText={phoneVal => setPhone(phoneVal)}
                    keyboardType="phone-pad"
                  />
                </View>

                <Button
                  title="Continue"
                  onPress={handleNextStep}
                  style={styles.actionButton}
                />
              </View>
            ) : (
              <View style={styles.form}>
                {activeTab === 'admin' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Admin Passcode</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter Admin Invite Code"
                      placeholderTextColor="#525252"
                      value={adminCode}
                      onChangeText={setAdminCode}
                      autoCapitalize="none"
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Create password"
                    placeholderTextColor="#525252"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Repeat password"
                    placeholderTextColor="#525252"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.backStepButton}
                    onPress={() => setStep(1)}
                    disabled={loading}
                  >
                    <Text style={styles.backStepButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitStepButton, loading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    <Text style={styles.submitStepButtonText}>
                      {loading ? 'Creating...' : 'Register'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text style={styles.signinLink} onPress={() => onNavigate('Login')}>
                Sign In
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
    backgroundColor: '#0a0a0a',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
    marginTop: 20,
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
    marginBottom: 24,
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
    marginBottom: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#262626',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
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
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  googleIcon: {
    marginTop: 2,
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#262626',
  },
  dividerText: {
    color: '#a3a3a3',
    fontSize: 12,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    backgroundColor: '#262626',
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: '#0d9488',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 14,
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
  actionButton: {
    backgroundColor: '#0d9488',
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  backStepButton: {
    flex: 1,
    backgroundColor: '#262626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#404040',
  },
  backStepButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  submitStepButton: {
    flex: 2,
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitStepButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#525252',
    fontSize: 14,
  },
  signinLink: {
    color: '#0d9488',
    fontWeight: '600',
  },
});
export default RegisterScreen;
