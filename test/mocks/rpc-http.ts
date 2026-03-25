import {Buffer} from 'buffer';
import {getBase58Decoder} from '@solana/codecs-strings';
import * as mockttp from 'mockttp';
import {stringifyJsonWithBigInts} from '@solana/rpc-spec-types';

import {mockRpcMessage} from './rpc-websocket';
import {
  Connection,
  Address,
  Transaction,
  Signer,
  VersionedMessage,
} from '../../src';
import invariant from '../../src/utils/assert';
import type {Commitment, HttpHeaders, RpcParams} from '../../src/connection';

export const mockServer: mockttp.Mockttp | undefined =
  process.env.TEST_LIVE === undefined ? mockttp.getLocal() : undefined;

let uniqueCounter = 0;
const BASE58_DECODER = getBase58Decoder();

const toFixedLengthBigEndian = (
  value: number,
  length: number,
): Uint8Array => {
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

export const mockRpcBatchResponse = async ({
  batch,
  result,
  error,
}: {
  batch: RpcParams[];
  result: any[];
  error?: string;
}) => {
  if (!mockServer) return;

  const request = batch.map((batch: RpcParams) => {
    return {
      jsonrpc: '2.0',
      method: batch.methodName,
      params: batch.args,
    };
  });

  const response = result.map((result: any) => {
    return {
      jsonrpc: '2.0',
      id: '',
      result,
      error,
    };
  });

  await mockServer
    .forPost('/')
    .withJsonBodyIncluding(request)
    .thenReply(200, JSON.stringify(toJsonRpcWireValue(response)), {
      'content-type': 'application/json',
    });
};

function isPromise<T>(obj: PromiseLike<T> | T): obj is PromiseLike<T> {
  return (
    !!obj &&
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof (obj as any).then === 'function'
  );
}

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
  params: Array<any>;
  value?: Promise<any> | any;
  error?: any;
  slot?: number | bigint;
  preserveBigIntJsonValues?: boolean;
  withContext?: boolean;
  withHeaders?: HttpHeaders;
}) => {
  if (!mockServer) return;

  await mockServer
    .forPost('/')
    .withJsonBodyIncluding({
      jsonrpc: '2.0',
      method,
      params,
    })
    .withHeaders(withHeaders || {})
    .thenCallback(async () => {
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
      } catch (_e) {
        return {statusCode: 500};
      }
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
  const params: Array<Object> = [];
  if (commitment && commitment !== 'finalized') {
    params.push({commitment});
  }

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
  const params: Array<Object> = [];
  if (commitment) {
    params.push({commitment});
  }

  await mockRpcResponse({
    method: 'getFeeForMessage',
    params,
    value: 42,
    withContext: true,
  });

  return await connection.getFeeForMessage(message, commitment);
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
  err?: any;
}) => {
  const {blockhash, lastValidBlockHeight} = await latestBlockhash({
    connection,
  });
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.recentBlockhash = blockhash;
  await transaction.sign(...signers);

  const encoded = Buffer.from(transaction.serialize()).toString('base64');
  invariant(transaction.signature);
  const signature = BASE58_DECODER.decode(transaction.signature);
  await mockRpcResponse({
    method: 'sendTransaction',
    params: [encoded],
    value: signature,
  });

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

  await connection.sendEncodedTransaction(encoded, sendOptions);

  await mockRpcMessage({
    method: 'signatureSubscribe',
    params: [signature, {commitment}],
    result: {err: err || null},
  });
  await mockRpcMessage({
    method: 'signatureUnsubscribe',
    params: [1],
    result: true,
  });

  return await connection.confirmTransaction(
    {blockhash, lastValidBlockHeight, signature},
    commitment,
  );
};

const airdrop = async ({
  connection,
  address,
  amount,
}: {
  connection: Connection;
  address: Address;
  amount: number | bigint;
}) => {
  const amountNumber = Number(amount);
  await mockRpcResponse({
    method: 'requestAirdrop',
    params: [address.toBase58(), amountNumber],
    value: uniqueSignature(),
  });

  const signature = await connection.requestAirdrop(address, amountNumber);

  await mockRpcMessage({
    method: 'signatureSubscribe',
    params: [signature, {commitment: 'confirmed'}],
    result: {err: null},
  });
  await mockRpcMessage({
    method: 'signatureUnsubscribe',
    params: [1],
    result: true,
  });

  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
};

export const helpers = {
  airdrop,
  getFeeForMessage,
  latestBlockhash,
  processTransaction,
};
