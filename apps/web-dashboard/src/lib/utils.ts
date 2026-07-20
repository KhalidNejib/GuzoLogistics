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

  // import.meta.env.PROD is Vite's actual production-build flag — unlike
  // guessing from window.location.hostname, it can't be fooled by a real
  // production build served under a hostname that happens to look local,
  // and it doesn't silently misfire for a dev build previewed on a network
  // IP or custom domain. A production build with no VITE_API_URL set is a
  // deploy misconfiguration, not something to paper over with a guess —
  // previously this silently constructed `${origin}/api/v1`, which
  // contradicts this project's own separate-domains deploy setup
  // (see DEPLOYMENT.md) and fails in a confusing way at request time
  // instead of a clear error at startup.
  if (import.meta.env.PROD) {
    const message =
      '[Config Error] VITE_API_URL is not set in this production build. ' +
      'The dashboard cannot guess the API domain safely — set VITE_API_URL ' +
      'at build time (see DEPLOYMENT.md).';
    console.error(message);
    throw new Error(message);
  }

  // Local/Network IP testing (dev builds only, keep port 5000)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:5000`;
  }

  return envUrl || 'http://localhost:5000';
}
