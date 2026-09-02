import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

export interface NavbarProps {
  onMenuPress?: () => void;
  onLogoPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onMenuPress,
  onLogoPress,
  onNotificationPress,
  onProfilePress,
  title = 'LibReserve',
  showBack = false,
  onBackPress,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Left Side: Back button OR Logo & Title */}
        <View style={styles.leftSection}>
          {showBack ? (
            <TouchableOpacity style={styles.iconButton} onPress={onBackPress} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.logoContainer} activeOpacity={0.8} onPress={onLogoPress}>
              <View style={styles.logoIcon}>
                <Ionicons name="book" size={20} color="#ffffff" />
              </View>
              <Text style={styles.logoText}>{title}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Right Side: Notifications & Avatar or Menu */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={onNotificationPress || onMenuPress}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarButton}
            activeOpacity={0.8}
            onPress={onProfilePress || onMenuPress}
          >
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' }}
              style={styles.avatarImage as any}
            />
          </TouchableOpacity>

          {onMenuPress && (
            <TouchableOpacity style={styles.menuButton} activeOpacity={0.7} onPress={onMenuPress}>
              <Ionicons name="menu-outline" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
        paddingTop: StatusBar.currentHeight,
      },
      web: {
        position: 'sticky' as any,
        top: 0,
        boxShadow: '0px 4px 20px rgba(0,0,0,0.04)',
      } as any,
    }),
  },
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 34,
    height: 34,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.secondaryContainer,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});

export default Navbar;
