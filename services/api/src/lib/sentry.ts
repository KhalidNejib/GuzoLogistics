import * as Sentry from '@sentry/node';

/**
 * Already initialized early inside src/instrument.ts using Node's ESM --import flag.
 * This function remains as a no-op placeholder for clean backward compat.
 */
export function initSentry() {}

export { Sentry };
