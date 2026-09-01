import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

export interface NavbarProps {
  onMenuPress: () => void;
  onLogoPress: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuPress, onLogoPress }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Logo and App Title */}
        <TouchableOpacity style={styles.logoContainer} activeOpacity={0.7} onPress={onLogoPress}>
          <View style={styles.logoIcon}>
            <Ionicons name="book" size={20} color="#ffffff" />
          </View>
          <Text style={styles.logoText}>
            Sameer <Text style={styles.logoHighlight}>Library</Text>
          </Text>
        </TouchableOpacity>

        {/* Hamburger Menu Toggle Button */}
        <TouchableOpacity style={styles.menuButton} activeOpacity={0.7} onPress={onMenuPress}>
          <Ionicons name="menu-outline" size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
        paddingTop: StatusBar.currentHeight,
      },
    }),
  },
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  logoHighlight: {
    color: COLORS.primary,
  },
  menuButton: {
    padding: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Navbar;
