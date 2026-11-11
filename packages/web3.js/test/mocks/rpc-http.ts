import {getBase58Decoder} from '@solana/kit';
import {stringifyJsonWithBigInts} from '@solana/rpc-spec-types';
import {vi} from 'vitest';

import {
  Connection,
  PublicKey,
  Transaction,
  Signer,
  VersionedMessage,
} from '../../src';
import type {
  Commitment,
  HttpHeaders,
  SignatureResult,
} from '../../src/connection';
import invariant from '../../src/utils/assert';
import {isLive} from '../url';
import {MockHttpServer} from './http-server';
import {
  createSignatureStatusRpcResult,
  mockRpcMessage,
} from './rpc-subscriptions';

export const mockServer: MockHttpServer | undefined = isLive
  ? undefined
  : new MockHttpServer();

let uniqueCounter = 0;
const BASE58_DECODER = getBase58Decoder();

const toFixedLengthBigEndian = (value: number, length: number): Uint8Array => {
  const out = new Uint8Array(length);
  let remainder = BigInt(value);
  for (let index = length - 1; index >= 0 && remainder > 0n; index -= 1) {
    out[index] = Number(remainder & 0xffn);
    remainder >>= 8n;
  }
  return out;
};

export const uniqueSignature = () => {
  return BASE58_DECODER.decode(toFixedLengthBigEndian(++uniqueCounter, 64));
};
export const uniqueBlockhash = () => {
  return BASE58_DECODER.decode(toFixedLengthBigEndian(++uniqueCounter, 32));
};

export const mockErrorMessage = 'Invalid';
export const mockErrorResponse = {
  code: -32602,
  message: mockErrorMessage,
};

function toJsonRpcWireValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(item => toJsonRpcWireValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        toJsonRpcWireValue(entry),
      ]),
    );
  }

  return value;
}

function isPromise<T>(obj: PromiseLike<T> | T): obj is PromiseLike<T> {
  return (
    !!obj &&
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof (obj as any).then === 'function'
  );
}

/**
 * Registers a one-shot mock for a JSON-RPC request. `params` must equal the
 * request's params exactly; omit it to match any params.
 */
export const mockRpcResponse = async ({
  method,
  params,
  value,
  error,
  slot,
  preserveBigIntJsonValues,
  withContext,
  withHeaders,
}: {
  method: string;
  params?: Array<any>;
  value?: Promise<any> | any;
  error?: any;
  slot?: number | bigint;
  preserveBigIntJsonValues?: boolean;
  withContext?: boolean;
  withHeaders?: HttpHeaders;
}) => {
  if (!mockServer) return;

  await mockServer.addRule({
    body: {
      jsonrpc: '2.0',
      method,
      ...(params === undefined
        ? {}
        : {params: JSON.parse(stringifyJsonWithBigInts(params))}),
    },
    headers: withHeaders,
    respond: async () => {
      try {
        const unwrappedValue = isPromise(value) ? await value : value;
        let result = unwrappedValue;
        if (withContext) {
          result = {
            context: {
              slot: slot != null ? slot : 11,
            },
            value: unwrappedValue,
          };
        }
        return {
          statusCode: 200,
          headers: {
            'content-type': 'application/json',
          },
          body: preserveBigIntJsonValues
            ? stringifyJsonWithBigInts({
                jsonrpc: '2.0',
                id: '',
                error,
                result,
              })
            : JSON.stringify(
                toJsonRpcWireValue({
                  jsonrpc: '2.0',
                  id: '',
                  error,
                  result,
                }),
              ),
        };
      } catch {
        return {statusCode: 500};
      }
    },
  });
};

const latestBlockhash = async ({
  connection,
  commitment,
}: {
  connection: Connection;
  commitment?: Commitment;
}) => {
  const blockhash = uniqueBlockhash();
  // The underlying Kit RPC client currently serializes explicit `finalized`
  // for `getLatestBlockhash` as the bare request with no params.
  const params: Array<object> =
    commitment === 'finalized' ? [] : [{commitment: commitment ?? 'confirmed'}];

  await mockRpcResponse({
    method: 'getLatestBlockhash',
    params,
    value: {
      blockhash,
      lastValidBlockHeight: 3090,
    },
    withContext: true,
  });

  return await connection.getLatestBlockhash(commitment);
};

const getFeeForMessage = async ({
  connection,
  commitment,
  message,
}: {
  connection: Connection;
  commitment?: Commitment;
  message: VersionedMessage;
}) => {
  const params = [
    Buffer.from(message.serialize()).toString('base64'),
    {commitment: commitment ?? 'confirmed'},
  ];

  await mockRpcResponse({
    method: 'getFeeForMessage',
    params,
    value: 42,
    withContext: true,
  });

  return await connection.getFeeForMessage(message, commitment);
};

/**
 * Runs a confirmation and waits for the signature status checks it started in
 * the background, so a late request cannot consume a mock the caller registers
 * next.
 */
const settleSignatureStatusChecks = async <T>(
  connection: Connection,
  confirm: () => Promise<T>,
): Promise<T> => {
  const getSignatureStatusSpy = vi.spyOn(connection, 'getSignatureStatus');
  try {
    return await confirm();
  } finally {
    await Promise.allSettled(
      getSignatureStatusSpy.mock.results.map(({value}) => value),
    );
    getSignatureStatusSpy.mockRestore();
  }
};

const processTransaction = async ({
  connection,
  transaction,
  signers,
  commitment,
  err,
}: {
  connection: Connection;
  transaction: Transaction;
  signers: Array<Signer>;
  commitment: Commitment;
  err?: unknown;
}) => {
  const {blockhash, lastValidBlockHeight} = await latestBlockhash({
    connection,
  });
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.recentBlockhash = blockhash;
  await transaction.sign(...signers);

  const encoded = Buffer.from(await transaction.serialize()).toString('base64');
  invariant(transaction.signature);
  const signature = BASE58_DECODER.decode(transaction.signature);
  let sendOptions;
  if (err) {
    sendOptions = {
      skipPreflight: true,
    };
  } else {
    sendOptions = {
      preflightCommitment: commitment,
    };
  }

  await mockRpcResponse({
    method: 'sendTransaction',
    params: [
      encoded,
      err
        ? {
            encoding: 'base64',
            preflightCommitment: 'processed',
            skipPreflight: true,
          }
        : {encoding: 'base64', preflightCommitment: commitment},
    ],
    value: signature,
  });

  await connection.sendEncodedTransaction(encoded, sendOptions);

  mockRpcMessage({
    method: 'signatureSubscribe',
    params: [signature, {commitment}],
    result: createSignatureStatusRpcResult(
      (err ?? null) as SignatureResult['err'],
    ),
  });

  return await settleSignatureStatusChecks(connection, () =>
    connection.confirmTransaction(
      {blockhash, lastValidBlockHeight, signature},
      commitment,
    ),
  );
};

const airdrop = async ({
  connection,
  address,
  amount,
}: {
  connection: Connection;
  address: PublicKey;
  amount: number | bigint;
}) => {
  const amountNumber = Number(amount);
  await mockRpcResponse({
    method: 'requestAirdrop',
    params: [address.toBase58(), amountNumber, {commitment: 'confirmed'}],
    value: uniqueSignature(),
  });

  const signature = await connection.requestAirdrop(address, amountNumber);

  mockRpcMessage({
    method: 'signatureSubscribe',
    params: [signature, {commitment: 'confirmed'}],
    result: createSignatureStatusRpcResult(null),
  });

  await settleSignatureStatusChecks(connection, () =>
    connection.confirmTransaction(signature, 'confirmed'),
  );
  return signature;
};

export const helpers = {
  airdrop,
  getFeeForMessage,
  latestBlockhash,
  processTransaction,
};
