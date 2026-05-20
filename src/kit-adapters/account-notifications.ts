/**
 * Boundary: Kit websocket account payloads -> Connection account info shapes.
 *
 * This module translates the shared raw account payload carried by both
 * `accountSubscribe` and `programSubscribe` notifications into the normalized
 * account-info values that Connection callbacks expect. The controller uses it
 * during dispatch; the runtime only transports raw events and the registry
 * only stores subscription state and callbacks.
 */
import {
  getBase58Encoder,
  getBase64Codec,
  type Base64EncodedZStdCompressedDataResponse,
} from '@solana/kit';

import {Address} from '../address';
import type {RpcWebSocketAccountNotification} from '../rpc-subscriptions/runtime';
import assert from '../utils/assert';
import {toUint8ArrayView} from '../utils/typed-array';

const BASE58_ENCODER = getBase58Encoder();
const BASE64_CODEC = getBase64Codec();

export type WebSocketBase64ZstdAccountValue =
  RpcWebSocketAccountNotification['result']['value'] &
    Readonly<{
      data: Base64EncodedZStdCompressedDataResponse;
    }>;

export type WebSocketParsedAccountData = Readonly<{
  parsed: unknown;
  program: string;
  space: bigint;
}>;

export type WebSocketParsedAccountValue =
  RpcWebSocketAccountNotification['result']['value'] &
    Readonly<{
      data: WebSocketParsedAccountData;
    }>;

export type WebSocketBinaryAccountValue =
  RpcWebSocketAccountNotification['result']['value'] &
    Readonly<{
      data: string | readonly [string, 'base58' | 'base64'];
    }>;

export type NormalizedWebSocketAccountInfo<TData> = Readonly<{
  data: TData;
  executable: boolean;
  lamports: bigint;
  owner: Address;
  rentEpoch: bigint;
  space: bigint;
}>;

function decodeBase64WireData(value: string): Uint8Array {
  return toUint8ArrayView(BASE64_CODEC.encode(value));
}

function decodeBase58WireData(value: string): Uint8Array {
  return toUint8ArrayView(BASE58_ENCODER.encode(value));
}

export function isWebSocketBase64ZstdAccountValue(
  value: RpcWebSocketAccountNotification['result']['value'],
): value is WebSocketBase64ZstdAccountValue {
  return Array.isArray(value.data) && value.data[1] === 'base64+zstd';
}

export function isWebSocketParsedAccountValue(
  value: RpcWebSocketAccountNotification['result']['value'],
): value is WebSocketParsedAccountValue {
  return (
    typeof value.data === 'object' &&
    value.data !== null &&
    !Array.isArray(value.data)
  );
}

export function isWebSocketBinaryAccountValue(
  value: RpcWebSocketAccountNotification['result']['value'],
): value is WebSocketBinaryAccountValue {
  return (
    typeof value.data === 'string' ||
    (Array.isArray(value.data) && value.data[1] !== 'base64+zstd')
  );
}

export function normalizeWebSocketAccountInfo(
  value: WebSocketBase64ZstdAccountValue,
): NormalizedWebSocketAccountInfo<Base64EncodedZStdCompressedDataResponse>;

export function normalizeWebSocketAccountInfo(
  value: WebSocketParsedAccountValue,
): NormalizedWebSocketAccountInfo<WebSocketParsedAccountData>;

export function normalizeWebSocketAccountInfo(
  value: WebSocketBinaryAccountValue,
): NormalizedWebSocketAccountInfo<Uint8Array>;

export function normalizeWebSocketAccountInfo(
  value: RpcWebSocketAccountNotification['result']['value'],
): NormalizedWebSocketAccountInfo<
  | Uint8Array
  | Base64EncodedZStdCompressedDataResponse
  | WebSocketParsedAccountData
>;

export function normalizeWebSocketAccountInfo(
  value: RpcWebSocketAccountNotification['result']['value'],
): NormalizedWebSocketAccountInfo<
  | Uint8Array
  | Base64EncodedZStdCompressedDataResponse
  | WebSocketParsedAccountData
> {
  let data:
    | Uint8Array
    | Base64EncodedZStdCompressedDataResponse
    | WebSocketParsedAccountData;
  if (typeof value.data === 'string') {
    data = decodeBase58WireData(value.data);
  } else if (Array.isArray(value.data)) {
    const [wireData, encoding] = value.data;
    switch (encoding) {
      case 'base58':
        data = decodeBase58WireData(wireData);
        break;
      case 'base64':
        data = decodeBase64WireData(wireData);
        break;
      case 'base64+zstd':
        data = value.data;
        break;
      default:
        assert(false, `Unsupported account notification encoding: ${encoding}`);
    }
  } else {
    data = {
      parsed: value.data.parsed,
      program: value.data.program,
      space: value.data.space,
    };
  }
  assert(value.rentEpoch != null, 'Expected account notification rentEpoch');

  return {
    data,
    executable: value.executable,
    lamports: value.lamports,
    owner: new Address(value.owner),
    rentEpoch: value.rentEpoch,
    space: value.space,
  };
}
