import { apiRequest } from './api';
import { AdminStats, Booking, Branch, User } from '../types';

export const adminService = {
  /**
   * Fetch admin dashboard metrics & stats
   */
  async getDashboardStats(): Promise<{
    success: boolean;
    stats: AdminStats;
    occupancy: any[];
    activity: any[];
  }> {
    return apiRequest('/admin/stats');
  },

  /**
   * Fetch all bookings with optional status filter
   */
  async getBookings(status?: string): Promise<{ success: boolean; bookings: Booking[] }> {
    const query = status && status !== 'ALL' ? `?status=${status}` : '';
    return apiRequest(`/admin/bookings${query}`);
  },

  /**
   * Approve or reject a booking
   */
  async updateBookingStatus(bookingId: string, action: 'APPROVE' | 'REJECT'): Promise<{ success: boolean; error?: string }> {
    return apiRequest('/admin/bookings', {
      method: 'PATCH',
      body: JSON.stringify({ bookingId, action }),
    });
  },

  /**
   * Fetch live seat status across branches
   */
  async getLiveSeats(): Promise<{ success: boolean; branches: any[]; stats: any }> {
    return apiRequest('/admin/live');
  },

  /**
   * Fetch registered students
   */
  async getStudents(): Promise<{ success: boolean; students: User[] }> {
    return apiRequest('/admin/students');
  },

  /**
   * Fetch facility branches
   */
  async getBranches(): Promise<{ success: boolean; branches: Branch[] }> {
    return apiRequest('/admin/branches');
  },

  /**
   * Create or update a branch
   */
  async saveBranch(data: Partial<Branch>): Promise<{ success: boolean; branch?: Branch; error?: string }> {
    return apiRequest('/admin/branches', {
      method: data.id ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Create or update a room
   */
  async saveRoom(data: { id?: string; name: string; capacity: number; photo?: string; branchId: string }): Promise<{ success: boolean; error?: string }> {
    return apiRequest('/admin/rooms', {
      method: data.id ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Add seats to a room
   */
  async addSeats(roomId: string, count: number): Promise<{ success: boolean; error?: string }> {
    return apiRequest(`/rooms/${roomId}/seats`, {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
  },

  /**
   * Fetch attendance logs
   */
  async getAttendanceLogs(): Promise<{ success: boolean; logs: any[] }> {
    return apiRequest('/admin/attendance');
  },

  /**
   * Fetch payment transaction logs
   */
  async getPaymentLogs(): Promise<{ success: boolean; logs: any[] }> {
    return apiRequest('/admin/payments');
  },
};
