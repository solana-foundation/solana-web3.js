import * as nodeFetch from 'node-fetch';

// Hardcoded retry settings
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;

// Simple exponential backoff
async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Testable retry helper
async function fetchWithRetry(
  fetchFn: (input: any, init?: any) => Promise<any>,
  input: any,
  init?: any
): Promise<any> {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fetchFn(input, init);
    } catch (err) {
      lastError = err;

      if (attempt === MAX_RETRIES - 1) {
        throw lastError;
      }

      await delay(BASE_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError;
}

// Default export: native fetch if available, otherwise polyfill with retry
export default (typeof globalThis.fetch === 'function'
  ? globalThis.fetch
  : (async function (
      input: nodeFetch.RequestInfo,
      init?: nodeFetch.RequestInit,
    ): Promise<nodeFetch.Response> {
      const processedInput =
        typeof input === 'string' && input.slice(0, 2) === '//'
          ? 'https:' + input
          : input;

      // Use retry logic with node-fetch
      return await fetchWithRetry(nodeFetch.default, processedInput, init);
    })) as typeof globalThis.fetch;

// Export helper for tests
export { fetchWithRetry };
