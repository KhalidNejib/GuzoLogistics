/**
 * Single source of truth for the API base URL.
 *
 * Previously locationService.ts (background telemetry) and socketService.ts
 * (foreground socket) each hardcoded their own fallback when
 * EXPO_PUBLIC_API_URL was unset — 'https://guzo-api.onrender.com' in one,
 * 'http://localhost:5000' in the other. If the env var was ever missing at
 * build/runtime, foreground and background silently talked to two
 * different servers with no error. There is now exactly one fallback, and
 * a loud dev-time warning when it's used, so a misconfigured env doesn't
 * fail silently.
 */
const FALLBACK_API_URL = 'http://localhost:5000';

export const API_URL = (() => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  console.warn(
    '[Config] EXPO_PUBLIC_API_URL is not set — falling back to ' +
      `${FALLBACK_API_URL}. This is only correct for local development; ` +
      'set EXPO_PUBLIC_API_URL for any real device build.'
  );
  return FALLBACK_API_URL;
})();
