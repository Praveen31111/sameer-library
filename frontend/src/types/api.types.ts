import { User } from './auth.types';
import { Branch, Room, Seat, Booking, AttendanceRecord, PaymentRecord } from './models.types';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface AuthApiResponse extends ApiResponse {
  token?: string;
  user?: User;
}

export interface StudentStats {
  daysPresent: number;
  totalHours: number;
  avgHoursPerDay: string;
  streak: number;
}

export interface AdminStats {
  activeStudents: number;
  todayAttendance: number;
  totalCapacity: number;
  occupancyRate: number;
  monthlyRevenue: number;
  pendingApprovals: number;
}

export interface LiveOccupancyStats {
  totalSeats: number;
  occupiedSeats: number;
  availableSeats: number;
  blockedSeats: number;
}

export interface FormattedAttendanceLog {
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
}
