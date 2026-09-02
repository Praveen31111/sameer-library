import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

export type BottomNavTab = 'Home' | 'Book' | 'My Bookings' | 'Profile';

export interface BottomNavBarProps {
  activeTab: BottomNavTab;
  onTabPress: (tab: BottomNavTab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onTabPress }) => {
  const tabs: { id: BottomNavTab; label: string; activeIcon: keyof typeof Ionicons.glyphMap; inactiveIcon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'Home', label: 'Home', activeIcon: 'home', inactiveIcon: 'home-outline' },
    { id: 'Book', label: 'Book', activeIcon: 'bookmark', inactiveIcon: 'bookmark-outline' },
    { id: 'My Bookings', label: 'My Bookings', activeIcon: 'time', inactiveIcon: 'time-outline' },
    { id: 'Profile', label: 'Profile', activeIcon: 'person', inactiveIcon: 'person-outline' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabButton, isActive && styles.activeTabButton]}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.inactiveIcon}
              size={20}
              color={isActive ? COLORS.onSecondaryContainer : COLORS.textSecondary}
            />
            <Text style={[styles.tabLabel, isActive ? styles.activeTabLabel : styles.inactiveTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    backgroundColor: COLORS.surfaceBright,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        position: 'fixed' as any,
        bottom: 0,
        left: 0,
        right: 0,
        boxShadow: '0px -3px 12px rgba(0, 0, 0, 0.04)',
        zIndex: 1000,
      } as any,
    }),
  },
  tabButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  activeTabButton: {
    backgroundColor: COLORS.secondaryContainer,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  activeTabLabel: {
    color: COLORS.onSecondaryContainer,
    fontWeight: '700',
  },
  inactiveTabLabel: {
    color: COLORS.textSecondary,
  },
});

export default BottomNavBar;
