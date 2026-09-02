/**
 * Application Theme Colors & Design Tokens
 */
export const COLORS = {
  // Brand colors (Google Stitch LibReserve)
  primary: '#00685b',
  primaryContainer: '#008373',
  primaryDark: '#005046',
  primaryLight: '#65dac4',
  primaryFixed: '#83f6e0',
  primaryMuted: 'rgba(0, 104, 91, 0.12)',

  secondary: '#006c4c',
  secondaryContainer: '#8ef4c5',
  onSecondaryContainer: '#00714f',
  secondaryFixed: '#90f6c8',

  tertiary: '#95442c',
  tertiaryContainer: '#b45b42',
  tertiaryFixed: '#ffdbd1',

  indigo: '#00685b',
  indigoDark: '#005046',

  // Backgrounds (Clean modern light theme matching Stitch)
  background: '#f5fbf8',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  surfaceBright: '#f5fbf8',
  surfaceDim: '#d6dbd8',
  surfaceContainerLow: '#eff5f2',
  surfaceContainer: '#eaefec',
  surfaceContainerHigh: '#e4e9e6',
  surfaceContainerHighest: '#dee4e1',
  card: '#ffffff',

  // Borders & Outlines
  border: '#dee4e1',
  borderLight: '#eff5f2',
  outline: '#6d7a76',
  outlineVariant: '#bcc9c5',

  // Text
  text: '#171d1b',
  textSecondary: '#3d4946',
  textMuted: '#6d7a76',
  textDisabled: '#9eaba7',
  onPrimary: '#ffffff',
  onSurface: '#171d1b',
  onSurfaceVariant: '#3d4946',

  // Status Colors
  success: '#006c4c',
  successBg: 'rgba(142, 244, 197, 0.4)',
  warning: '#b45b42',
  warningBg: 'rgba(255, 181, 160, 0.3)',
  danger: '#ba1a1a',
  dangerBg: 'rgba(255, 218, 214, 0.5)',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  info: '#00685b',
  infoBg: 'rgba(0, 104, 91, 0.12)',
};

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
  THEME_MODE: 'theme_mode',
};

/**
 * Curated High-Aesthetic Study Space Photo Presets
 */
export const PHOTO_PRESETS = [
  { label: 'Modern Hall', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80' },
  { label: 'Silent Zone', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80' },
  { label: 'Cubicles', url: 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=800&q=80' },
  { label: 'Discussion Lounge', url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80' },
  { label: 'Classic Library', url: 'https://images.unsplash.com/photo-1507842229452-e56598c19958?auto=format&fit=crop&w=800&q=80' },
  { label: 'Executive AC Room', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80' },
];

/**
 * Booking Plans Config
 */
export const BOOKING_PLANS = [
  { id: 'DAILY', label: 'Daily Pass', duration: '1 Day', price: 99, desc: 'Flexible 1-day study access' },
  { id: 'WEEKLY', label: 'Weekly Pass', duration: '7 Days', price: 599, desc: '7 days of uninterrupted study' },
  { id: 'MONTHLY', label: 'Monthly Pass', duration: '30 Days', price: 1999, desc: 'Dedicated seat + full amenities' },
] as const;
