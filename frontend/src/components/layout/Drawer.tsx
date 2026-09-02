import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, SafeAreaView, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/constants';

export interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: 'Home' | 'Login' | 'Register' | 'StudentDashboard' | 'AdminDashboard', anchor?: string) => void;
}

const { width } = Dimensions.get('window');

export const Drawer: React.FC<DrawerProps> = ({ visible, onClose, onNavigate }) => {
  const { user, logout } = useAuth();
  
  const handleLinkPress = (screen: 'Home' | 'Login' | 'Register' | 'StudentDashboard' | 'AdminDashboard', anchor?: string) => {
    onNavigate(screen, anchor);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.drawerContainer}>
          <SafeAreaView style={styles.drawerContent}>
            {/* Header / Close button */}
            <View style={styles.header}>
              <Text style={styles.logoText}>
                Sameer <Text style={styles.logoHighlight}>Library</Text>
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close-outline" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Nav Links */}
            <View style={styles.linksContainer}>
              <TouchableOpacity
                style={styles.linkItem}
                onPress={() => handleLinkPress('Home', 'features')}
              >
                <Ionicons name="sparkles-outline" size={22} color={COLORS.primary} />
                <Text style={styles.linkText}>Features</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkItem}
                onPress={() => handleLinkPress('Home', 'about')}
              >
                <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
                <Text style={styles.linkText}>About Us</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkItem}
                onPress={() => handleLinkPress('Home', 'contact')}
              >
                <Ionicons name="mail-outline" size={22} color={COLORS.primary} />
                <Text style={styles.linkText}>Contact</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Action Buttons */}
              {user ? (
                <>
                  <TouchableOpacity
                    style={styles.registerBtn}
                    onPress={() => {
                      if (user.role === 'ADMIN' || user.role === 'OWNER') {
                        handleLinkPress('AdminDashboard');
                      } else {
                        handleLinkPress('StudentDashboard');
                      }
                    }}
                  >
                    <Text style={styles.registerBtnText}>Go to Dashboard</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.loginBtn, { marginTop: 12 }]}
                    onPress={async () => {
                      await logout();
                      onClose();
                    }}
                  >
                    <Text style={styles.loginBtnText}>Sign Out</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.loginBtn}
                    onPress={() => handleLinkPress('Login')}
                  >
                    <Text style={styles.loginBtnText}>Sign In</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.registerBtn}
                    onPress={() => handleLinkPress('Register')}
                  >
                    <Text style={styles.registerBtnText}>Sign Up</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Footer info */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>✨ Now Open in Lucknow</Text>
            </View>
          </SafeAreaView>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    width: width * 0.75,
    height: '100%',
    backgroundColor: COLORS.surface,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  drawerContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logoText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  logoHighlight: {
    color: COLORS.secondary,
  },
  closeButton: {
    padding: 4,
  },
  linksContainer: {
    flex: 1,
    marginTop: 30,
    gap: 16,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  linkText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  loginBtn: {
    backgroundColor: COLORS.surfaceContainerLow,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: 12,
  },
  loginBtnText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  registerBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  registerBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  footerText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Drawer;
