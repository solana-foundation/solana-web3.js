/**
 * Whether unit tests run against a live validator (`TEST_LIVE=1`) instead of
 * the mock RPC server.
 */
export const isLive = !['', '0', 'false'].includes(process.env.TEST_LIVE ?? '');

export const MOCK_PORT = 9999;

/**
 * The connection url to use when running unit tests
 */
export const url = isLive ? 'http://127.0.0.1:8899/' : 'http://127.0.0.1:9999/';

export const wsUrl = isLive ? 'ws://127.0.0.1:8900/' : 'ws://127.0.0.1:9999/';
