import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { getStatusStyle } from '../../utils/formatters';

export interface BadgeProps {
  label: string;
  status?: string;
  style?: StyleProp<ViewStyle>;
}

export const Badge: React.FC<BadgeProps> = ({ label, status, style }) => {
  const statusStyles = getStatusStyle(status || label);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: statusStyles.bg,
          borderColor: statusStyles.border,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: statusStyles.text }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default Badge;
