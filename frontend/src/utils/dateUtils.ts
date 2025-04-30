import { format, formatDistanceToNow } from 'date-fns';

export const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  return format(date, 'MMM d, yyyy HH:mm:ss');
};

export const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  return formatDistanceToNow(date, { addSuffix: true });
};

export const formatShortDate = (isoString: string): string => {
  const date = new Date(isoString);
  return format(date, 'MM/dd/yy');
};

export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return format(date, 'HH:mm:ss');
}; 