export type ScreenName =
  | 'Home'
  | 'Login'
  | 'Register'
  | 'StudentDashboard'
  | 'AdminDashboard';

export interface NavigationProps {
  onNavigate: (screen: ScreenName, anchor?: string) => void;
}
