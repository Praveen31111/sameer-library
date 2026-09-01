import { apiRequest } from './api';
import { Branch, Booking, StudentStats, Seat } from '../types';

export const studentService = {
  /**
   * Fetch student attendance logs & stats
   */
  async getAttendance(): Promise<{ success: boolean; attendance: any[]; stats: StudentStats }> {
    return apiRequest('/attendance');
  },

  /**
   * Fetch active and past bookings
   */
  async getBookings(): Promise<{ success: boolean; bookings: Booking[] }> {
    return apiRequest('/bookings');
  },

  /**
   * Create a new booking request
   */
  async createBooking(bookingData: {
    branchId: string;
    roomId: string;
    seatId: string;
    planType: string;
    startDate: string;
  }): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    return apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  /**
   * Get all active branches with their rooms
   */
  async getBranches(): Promise<{ success: boolean; branches: Branch[] }> {
    return apiRequest('/branches');
  },

  /**
   * Get seats for a specific room
   */
  async getSeatsByRoom(roomId: string): Promise<{ success: boolean; seats: Seat[] }> {
    return apiRequest(`/rooms/${roomId}/seats`);
  },
};
