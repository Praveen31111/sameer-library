export type UserRole = 'STUDENT' | 'ADMIN' | 'OWNER';

export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'PENDING_VERIFICATION';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole | string;
  status?: UserStatus | string;
  profilePhoto?: string | null;
  college?: string | null;
  course?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

export interface LoginCredentials {
  email: string;
  password?: string;
  token?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password?: string;
  college?: string;
  course?: string;
}
