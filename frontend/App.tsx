import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/context';
import {
  HomeScreen,
  LoginScreen,
  RegisterScreen,
  StudentDashboard,
  AdminDashboard,
} from './src/screens';
import { ScreenName } from './src/navigation';
import { COLORS } from './src/utils';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Home');

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role === 'ADMIN' || user.role === 'OWNER') {
          setCurrentScreen('AdminDashboard');
        } else {
          setCurrentScreen('StudentDashboard');
        }
      } else {
        setCurrentScreen('Home');
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Home':
        return <HomeScreen onNavigate={setCurrentScreen} />;
      case 'Login':
        return <LoginScreen onNavigate={setCurrentScreen} />;
      case 'Register':
        return <RegisterScreen onNavigate={setCurrentScreen} />;
      case 'StudentDashboard':
        return <StudentDashboard onNavigate={setCurrentScreen} />;
      case 'AdminDashboard':
        return <AdminDashboard onNavigate={setCurrentScreen} />;
      default:
        return <HomeScreen onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <>
      <StatusBar style="light" />
      {renderScreen()}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
