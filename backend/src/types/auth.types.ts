export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export type UserRole = 'STUDENT' | 'ADMIN' | 'OWNER';
export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'PENDING_VERIFICATION';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  profilePhoto?: string | null;
  college?: string | null;
  course?: string | null;
}
