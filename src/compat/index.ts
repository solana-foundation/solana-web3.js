/**
 * This package contains utilities for converting from Web3.js classes to the data
 * structures in Kit. Adopted from
 * [`@solana/compat`](https://github.com/anza-xyz/kit/tree/main/packages/compat).
 *
 * @packageDocumentation
 */
import {createJsonRpcApi, createRpc} from '@solana/rpc';
import type {HttpHeaders} from '../connection';

export * from './address';
export * from './instruction';
export * from './keypair';
export * from './transaction';

type RpcCompatibleConnection = Readonly<{
	rpcEndpoint: string;
	rpcHttpHeaders?: HttpHeaders;
}>;

type RpcTransport = (request: {
		payload: unknown;
		signal?: AbortSignal;
	}) => Promise<unknown>;

const defaultFetch: typeof globalThis.fetch = (input, init) => {
	if (typeof globalThis.fetch !== 'function') {
		throw new Error('globalThis.fetch is not available in this environment');
	}
	const processedInput =
		typeof input === 'string' && input.slice(0, 2) === '//'
			? `https:${input}`
			: input;
	return globalThis.fetch(processedInput, init);
};

function createRpcTransport(
	url: string,
	httpHeaders?: HttpHeaders,
): RpcTransport {
	return async ({payload, signal}) => {
		const response = await defaultFetch(url, {
			body: JSON.stringify(payload),
			headers: Object.assign(
				{
					'Content-Type': 'application/json',
				},
				httpHeaders ?? {},
			),
			method: 'POST',
			signal,
		});

		const text = await response.text();
		if (!response.ok) {
			throw new Error(`${response.status} ${response.statusText}: ${text}`);
		}

		return text ? JSON.parse(text) : null;
	};
}

/**
 * Creates a Kit RPC client from a Web3.js connection using its HTTP JSON-RPC transport.
 */
export function toKitRpcClient<TApi = ReturnType<typeof createJsonRpcApi>>(
	connection: RpcCompatibleConnection,
	api?: TApi,
) {
	return createRpc({
		api: (api ?? createJsonRpcApi()) as never,
		transport: createRpcTransport(
			connection.rpcEndpoint,
			connection.rpcHttpHeaders,
		) as never,
	});
}
