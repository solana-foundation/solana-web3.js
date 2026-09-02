/**
 * Boundary: Connection -> Kit RPC request shaping.
 *
 * This module translates Connection's public request inputs into the explicit
 * request configs expected by Kit RPC calls. Connection methods and
 * subscription spec builders use it at the API edge.
 */
import {
  getBase58Encoder,
  getBase64Codec,
  type Address,
  type Base58EncodedBytes,
  type Base64EncodedBytes,
  type Commitment,
  type GetBlocksApi,
  type GetInflationRewardApi,
  type GetProgramAccountsDatasizeFilter,
  type GetProgramAccountsMemcmpFilter,
  type Slot,
} from '@solana/kit';

import type {
  Finality,
  GetProgramAccountsFilter,
  GetVersionedBlockConfig,
  GetVersionedTransactionConfig,
} from '../connection';
import {coerceNumericToBigInt} from '../utils/bigint';

const BASE58_ENCODER = getBase58Encoder();
const BASE64_CODEC = getBase64Codec();

export type TypedBlockWithoutTransactionsMode = 'none' | 'signatures';

export type TypedBlocksRequestConfig = NonNullable<
  Parameters<GetBlocksApi['getBlocks']>[2]
>;

export type TypedRpcRequestMethod<
  TArgs extends unknown[],
  TResult = unknown,
> = (...args: TArgs) => {
  send(): Promise<TResult>;
};

export type TypedLeaderScheduleRequestConfig = Readonly<{
  commitment?: Commitment;
  identity?: Address;
}>;

export type TypedInflationRewardRequestConfig = Parameters<
  GetInflationRewardApi['getInflationReward']
>[1];

export type TypedSimulateTransactionRequestConfig = Readonly<{
  encoding: 'base64';
  accounts?: Readonly<{
    encoding: 'base64';
    addresses: readonly Address[];
  }>;
  commitment?: Commitment;
  innerInstructions?: boolean;
  minContextSlot?: Slot;
}> &
  (
    | Readonly<{
        replaceRecentBlockhash?: false;
        sigVerify: true;
      }>
    | Readonly<{
        replaceRecentBlockhash: true;
        sigVerify?: false;
      }>
    | Readonly<{
        replaceRecentBlockhash?: false;
        sigVerify?: false;
      }>
  );

export type TypedBlockWithoutTransactionsConfig<
  TTransactionDetails extends TypedBlockWithoutTransactionsMode,
> = Readonly<{
  commitment?: Finality;
  maxSupportedTransactionVersion?: GetVersionedBlockConfig['maxSupportedTransactionVersion'];
  rewards?: GetVersionedBlockConfig['rewards'];
  transactionDetails: TTransactionDetails;
}>;

export type TypedAccountsModeBlockConfig = Readonly<{
  commitment?: Finality;
  maxSupportedTransactionVersion?: GetVersionedBlockConfig['maxSupportedTransactionVersion'];
  rewards?: GetVersionedBlockConfig['rewards'];
  transactionDetails: 'accounts';
}>;

export type TypedFullBlockConfig = Readonly<{
  commitment?: Finality;
  maxSupportedTransactionVersion?: GetVersionedBlockConfig['maxSupportedTransactionVersion'];
  rewards?: GetVersionedBlockConfig['rewards'];
  transactionDetails?: 'full';
}>;

export type TypedParsedBlockConfig = Readonly<{
  commitment?: Finality;
  encoding: 'jsonParsed';
  maxSupportedTransactionVersion?: GetVersionedBlockConfig['maxSupportedTransactionVersion'];
  rewards?: GetVersionedBlockConfig['rewards'];
  transactionDetails?: 'full';
}>;

export type TypedParsedAccountsModeBlockConfig = TypedAccountsModeBlockConfig &
  Readonly<{
    encoding: 'jsonParsed';
  }>;

export type TypedTransactionConfig = Readonly<{
  commitment?: Finality;
  maxSupportedTransactionVersion?: GetVersionedTransactionConfig['maxSupportedTransactionVersion'];
}>;

export type TypedParsedTransactionConfig = TypedTransactionConfig &
  Readonly<{
    encoding: 'jsonParsed';
  }>;

export type TypedBlockRequestConfig =
  | TypedBlockWithoutTransactionsConfig<TypedBlockWithoutTransactionsMode>
  | TypedAccountsModeBlockConfig
  | TypedParsedAccountsModeBlockConfig
  | TypedFullBlockConfig
  | TypedParsedBlockConfig;

function coerceToBase58EncodedBytes(bytes: string): Base58EncodedBytes {
  BASE58_ENCODER.encode(bytes);
  return bytes as Base58EncodedBytes;
}

function coerceToBase64EncodedBytes(bytes: string): Base64EncodedBytes {
  BASE64_CODEC.encode(bytes);
  return bytes as Base64EncodedBytes;
}

export function getTypedBlockConfigBase(
  finality: Finality | undefined,
  config:
    | Pick<
        GetVersionedBlockConfig,
        'maxSupportedTransactionVersion' | 'rewards'
      >
    | undefined,
): Omit<TypedAccountsModeBlockConfig, 'transactionDetails'> {
  return {
    ...(finality != null ? {commitment: finality} : null),
    ...(config?.maxSupportedTransactionVersion != null
      ? {
          maxSupportedTransactionVersion: config.maxSupportedTransactionVersion,
        }
      : null),
    ...(config?.rewards != null ? {rewards: config.rewards} : null),
  };
}

export function getTypedBlockWithoutTransactionsConfig<
  TTransactionDetails extends TypedBlockWithoutTransactionsMode,
>(
  transactionDetails: TTransactionDetails,
  finality: Finality | undefined,
  config:
    | Pick<
        GetVersionedBlockConfig,
        'maxSupportedTransactionVersion' | 'rewards'
      >
    | undefined,
): TypedBlockWithoutTransactionsConfig<TTransactionDetails> {
  return {
    ...getTypedBlockConfigBase(finality, config),
    transactionDetails,
  };
}

export function buildTypedAccountsBlockConfig(
  finality: Finality | undefined,
  config:
    | Pick<
        GetVersionedBlockConfig,
        'maxSupportedTransactionVersion' | 'rewards'
      >
    | undefined,
  parseTransactions: boolean,
): TypedAccountsModeBlockConfig | TypedParsedAccountsModeBlockConfig {
  return parseTransactions
    ? ({
        encoding: 'jsonParsed',
        ...getTypedBlockConfigBase(finality, config),
        transactionDetails: 'accounts',
      } satisfies TypedParsedAccountsModeBlockConfig)
    : ({
        ...getTypedBlockConfigBase(finality, config),
        transactionDetails: 'accounts',
      } satisfies TypedAccountsModeBlockConfig);
}

export function buildTypedFullBlockConfig(
  finality: Finality | undefined,
  config:
    | Pick<
        GetVersionedBlockConfig,
        'maxSupportedTransactionVersion' | 'rewards' | 'transactionDetails'
      >
    | undefined,
  hasRawConfig: boolean,
): TypedFullBlockConfig | undefined {
  if (config?.transactionDetails === 'full') {
    return {
      ...getTypedBlockConfigBase(finality, config),
      transactionDetails: 'full',
    };
  }

  return hasRawConfig ? getTypedBlockConfigBase(finality, config) : undefined;
}

export function buildTypedParsedFullBlockConfig(
  finality: Finality | undefined,
  config:
    | Pick<
        GetVersionedBlockConfig,
        'maxSupportedTransactionVersion' | 'rewards' | 'transactionDetails'
      >
    | undefined,
): TypedParsedBlockConfig {
  return {
    encoding: 'jsonParsed',
    ...getTypedBlockConfigBase(finality, config),
    ...(config?.transactionDetails === 'full'
      ? {transactionDetails: 'full' as const}
      : null),
  } satisfies TypedParsedBlockConfig;
}

export function buildTypedTransactionConfig(
  finality: Finality | undefined,
  config: GetVersionedTransactionConfig | undefined,
): TypedTransactionConfig | undefined {
  const typedConfig = {
    ...(finality != null ? {commitment: finality} : null),
    ...(config?.maxSupportedTransactionVersion != null
      ? {
          maxSupportedTransactionVersion: config.maxSupportedTransactionVersion,
        }
      : null),
  } satisfies TypedTransactionConfig;

  return Object.keys(typedConfig).length > 0 ? typedConfig : undefined;
}

export function buildTypedParsedTransactionConfig(
  finality: Finality | undefined,
  config: GetVersionedTransactionConfig | undefined,
): TypedParsedTransactionConfig {
  return {
    encoding: 'jsonParsed',
    ...(finality != null ? {commitment: finality} : null),
    ...(config?.maxSupportedTransactionVersion != null
      ? {
          maxSupportedTransactionVersion: config.maxSupportedTransactionVersion,
        }
      : null),
  } satisfies TypedParsedTransactionConfig;
}

export function getProgramAccountsRpcFilters(
  filters: readonly GetProgramAccountsFilter[] | undefined,
):
  | Array<GetProgramAccountsDatasizeFilter | GetProgramAccountsMemcmpFilter>
  | undefined {
  return filters?.map(filter => {
    if ('memcmp' in filter) {
      const encoding = filter.memcmp.encoding ?? 'base58';
      const offset = coerceNumericToBigInt(filter.memcmp.offset, 'offset');

      return encoding === 'base64'
        ? {
            memcmp: {
              bytes: coerceToBase64EncodedBytes(filter.memcmp.bytes),
              encoding: 'base64',
              offset,
            },
          }
        : {
            memcmp: {
              bytes: coerceToBase58EncodedBytes(filter.memcmp.bytes),
              encoding: 'base58',
              offset,
            },
          };
    }

    return {
      dataSize: coerceNumericToBigInt(filter.dataSize, 'dataSize'),
    };
  });
}
