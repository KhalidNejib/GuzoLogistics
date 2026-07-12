import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatStatus(status: string) {
  const map: Record<string, string> = {
    'PENDING': 'Finding Rider',
    'ACCEPTED': 'Rider Assigned',
    'ARRIVED': 'Rider Arrived',
    'ARRIVED_PICKUP': 'At Pickup',
    'PICKED_UP': 'Collected',
    'IN_TRANSIT': 'In Transit',
    'ARRIVED_DELIVERY': 'Near Customer',
    'DELIVERED': 'Delivered',
    'CANCELLED': 'Cancelled',
  };
  return map[status] || status;
}
export function getApiUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }
  
  // If we are on a production-like domain (no port, no localhost)
  // use the same protocol and domain but no port 5000
  const isProduction = window.location.hostname !== 'localhost' && 
                       window.location.hostname !== '127.0.0.1' && 
                       !window.location.port;

  if (isProduction) {
    return `${window.location.protocol}//${window.location.hostname}/api/v1`;
  }

  // Local/Network IP testing (keep port 5000)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:5000`;
  }

  return envUrl || 'http://localhost:5000';
}
