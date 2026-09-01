import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { COLORS } from '../../utils/constants';

export interface LoadingSpinnerProps {
  message?: string;
  color?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  color = COLORS.primary,
  size = 'large',
  fullScreen = false,
  style,
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <ActivityIndicator size={size} color={color} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  message: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});

export default LoadingSpinner;
