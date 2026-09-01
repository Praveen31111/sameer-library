import { COLORS } from './constants';

/**
 * Format number to Indian Rupee (₹)
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Format date string into human readable format (e.g., "15 Aug 2026")
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '--';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format time string (e.g., "09:30 AM")
 */
export function formatTime(dateString: string | undefined | null): string {
  if (!dateString) return '--';
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '--';
  }
}

/**
 * Calculate hours & minutes difference between two timestamps
 */
export function formatDuration(start: string, end?: string | null): string {
  if (!start) return '--';
  if (!end) return 'Active';
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs <= 0) return '0m';
    const diffMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  } catch {
    return '--';
  }
}

/**
 * Get status color scheme for UI badges
 */
export function getStatusStyle(status: string) {
  const normalized = (status || '').toUpperCase();
  switch (normalized) {
    case 'APPROVED':
    case 'ACTIVE':
    case 'AVAILABLE':
    case 'SUCCESS':
      return {
        bg: COLORS.successBg,
        text: COLORS.success,
        border: 'rgba(34, 197, 94, 0.3)',
      };
    case 'PENDING':
    case 'PENDING_VERIFICATION':
    case 'HALF_DAY':
      return {
        bg: COLORS.warningBg,
        text: COLORS.warning,
        border: 'rgba(245, 158, 11, 0.3)',
      };
    case 'REJECTED':
    case 'BLOCKED':
    case 'OCCUPIED':
    case 'FAILED':
    case 'MAINTENANCE':
      return {
        bg: COLORS.dangerBg,
        text: COLORS.danger,
        border: 'rgba(239, 68, 68, 0.3)',
      };
    case 'COMPLETED':
    default:
      return {
        bg: COLORS.infoBg,
        text: COLORS.info,
        border: 'rgba(59, 130, 246, 0.3)',
      };
  }
}
