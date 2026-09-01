/**
 * Application Theme Colors & Design Tokens
 */
export const COLORS = {
  // Brand colors
  primary: '#0d9488',       // Teal / Primary brand
  primaryDark: '#0f766e',
  primaryLight: '#2dd4bf',
  primaryMuted: 'rgba(13, 148, 136, 0.15)',
  
  indigo: '#6366f1',
  indigoDark: '#4f46e5',
  
  // Backgrounds (Dark Mode default)
  background: '#0a0a0a',
  surface: '#171717',
  surfaceElevated: '#1f1f1f',
  card: '#171717',
  
  // Borders
  border: '#262626',
  borderLight: '#404040',
  
  // Text
  text: '#ffffff',
  textSecondary: '#a3a3a3',
  textMuted: '#737373',
  textDisabled: '#525252',
  
  // Status Colors
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.15)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  danger: '#ef4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  info: '#3b82f6',
  infoBg: 'rgba(59, 130, 246, 0.15)',
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
