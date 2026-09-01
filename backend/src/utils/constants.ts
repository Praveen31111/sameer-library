export const APP_ROLES = {
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
} as const;

export const BOOKING_PLANS = {
  DAILY: { id: 'DAILY', price: 99, durationDays: 1 },
  WEEKLY: { id: 'WEEKLY', price: 599, durationDays: 7 },
  MONTHLY: { id: 'MONTHLY', price: 1999, durationDays: 30 },
} as const;

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;
