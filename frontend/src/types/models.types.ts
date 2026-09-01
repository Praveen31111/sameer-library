export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  photo?: string | null;
  isActive: boolean;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
  rooms?: Room[];
  _count?: {
    rooms?: number;
    bookings?: number;
    attendances?: number;
  };
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  photo?: string | null;
  isActive: boolean;
  branchId: string;
  branch?: Branch;
  seats?: Seat[];
  createdAt?: string;
  updatedAt?: string;
}

export type SeatStatus = 'AVAILABLE' | 'OCCUPIED' | 'BLOCKED' | 'MAINTENANCE';

export interface Seat {
  id: string;
  seatNumber: string;
  status: SeatStatus | string;
  roomId: string;
  room?: Room;
  currentBooking?: {
    id: string;
    studentName?: string;
    planType?: string;
    endDate?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export type BookingPlanType = 'HOURLY' | 'HALF_DAY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  planType: BookingPlanType | string;
  status: BookingStatus | string;
  amount: number;
  notes?: string | null;
  studentId: string;
  student?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    profilePhoto?: string | null;
  };
  branchId: string;
  branch?: {
    id: string;
    name: string;
    code: string;
    address?: string;
    city?: string;
  };
  roomId: string;
  room?: {
    id: string;
    name: string;
  };
  seatId: string;
  seat?: {
    id: string;
    seatNumber: string;
  };
  approvedById?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  checkIn: string;
  checkOut?: string | null;
  source: 'FINGERPRINT_DEVICE' | 'MANUAL_ADMIN' | 'QR_CODE' | string;
  studentId: string;
  student?: {
    id: string;
    name: string;
    email: string;
  };
  branchId: string;
  branch?: {
    id: string;
    name: string;
  };
  roomId?: string | null;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | string;
  provider: string;
  providerPaymentId?: string | null;
  providerOrderId?: string | null;
  bookingId: string;
  studentId: string;
  student?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt?: string;
}
