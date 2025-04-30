import { format, formatDistanceToNow } from 'date-fns';

/**
 * Formats an ISO date string to a human-readable timestamp
 * @param isoString - ISO 8601 date string
 * @returns Formatted date string in "MMM d, yyyy HH:mm:ss" format
 */
export const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  return format(date, 'MMM d, yyyy HH:mm:ss');
};

/**
 * Formats an ISO date string to a relative time string (e.g. "2 hours ago")
 * @param isoString - ISO 8601 date string
 * @returns Relative time string with suffix
 */
export const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  return formatDistanceToNow(date, { addSuffix: true });
};

/**
 * Formats an ISO date string to a short date format
 * @param isoString - ISO 8601 date string
 * @returns Formatted date string in "MM/dd/yy" format
 */
export const formatShortDate = (isoString: string): string => {
  const date = new Date(isoString);
  return format(date, 'MM/dd/yy');
};

/**
 * Formats an ISO date string to time only
 * @param isoString - ISO 8601 date string
 * @returns Formatted time string in "HH:mm:ss" format
 */
export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return format(date, 'HH:mm:ss');
};
