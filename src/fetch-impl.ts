import * as nodeFetch from 'node-fetch';

/**
 * Retry configuration passed via init.retry
 */
interface RetryOptions {
  retries?: number;
  initialDelay?: number;
  backoffFactor?: number;
  retryOn?: (error: any) => boolean;
}

/**
 * Extract retry options from RequestInit
 */
function getRetryOptions(init?: RequestInit & { retry?: RetryOptions }) {
  const retry = init?.retry ?? {};
  return {
    retries: retry.retries ?? 0,
    initialDelay: retry.initialDelay ?? 100,
    backoffFactor: retry.backoffFactor ?? 2,
    retryOn:
      retry.retryOn ??
      ((err: any) =>
        err instanceof TypeError ||
        err?.code === 'ECONNRESET' ||
        err?.code === 'ETIMEDOUT'),
  };
}

/**
 * Delay helper
 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generic retry wrapper
 */
async function fetchWithRetry(
  fetchFn: typeof globalThis.fetch,
  input: RequestInfo,
  init?: RequestInit & { retry?: RetryOptions },
): Promise<Response> {
  const { retries, initialDelay, backoffFactor, retryOn } =
    getRetryOptions(init);

  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchFn(input, init);
    } catch (err) {
      lastError = err;

      if (attempt === retries || !retryOn(err)) {
        throw lastError;
      }

      const delayMs = initialDelay * Math.pow(backoffFactor, attempt);
      await delay(delayMs);
    }
  }

  throw lastError;
}

/**
 * Unified fetch wrapper with optional retries
 */
export default (async function (
  input: RequestInfo,
  init?: RequestInit & { retry?: RetryOptions },
): Promise<Response> {
  const processedInput =
    typeof input === 'string' && input.startsWith('//')
      ? 'https:' + input
      : input;

  const fetchFn =
    typeof globalThis.fetch === 'function'
      ? globalThis.fetch
      : (nodeFetch.default as unknown as typeof globalThis.fetch);

  return await fetchWithRetry(fetchFn, processedInput, init);
}) as typeof globalThis.fetch;

export { fetchWithRetry };
