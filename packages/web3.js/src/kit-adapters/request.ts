/**
 * Boundary: Connection -> Kit RPC request shaping.
 *
 * This module translates Connection's public request inputs into the explicit
 * request configs expected by Kit RPC calls. Connection methods and
 * subscription spec builders use it at the API edge.
 */
import {
  assertIsSignature,
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
  type GetTransactionsForAddressApi,
  type Signature,
  type Slot,
  type UnixTimestamp,
} from '@solana/kit';

import type {
  DataSizeFilter,
  Finality,
  GetFullTransactionsForAddressConfig,
  GetProgramAccountsFilter,
  GetVersionedBlockConfig,
  GetVersionedTransactionConfig,
  SignatureStatusConfig,
  SimulateTransactionAccountsEncoding,
  TokenAccountsFilter,
  TransactionsForAddressFilters,
  TransactionsForAddressNumericComparison,
  TransactionsForAddressSignatureComparison,
} from '../connection';
import type {PublicKey} from '../publickey';
import {
  coerceNumericToBigInt,
  coerceOptionalNumericToBigInt,
} from '../utils/bigint';

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
  keyByVoteAccount?: boolean;
}>;

export type TypedInflationRewardRequestConfig = Parameters<
  GetInflationRewardApi['getInflationReward']
>[1];

export type TypedSimulateTransactionRequestConfig = Readonly<{
  encoding: 'base64';
  accounts?: Readonly<{
    encoding: SimulateTransactionAccountsEncoding;
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

export type TypedEncodedFullBlockConfig = TypedFullBlockConfig &
  Readonly<{
    encoding: 'base58' | 'base64';
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
  minContextSlot?: Slot;
}>;

export type TypedTransactionsForAddressInput = Omit<
  GetFullTransactionsForAddressConfig,
  'transactionDetails'
> &
  Readonly<{transactionDetails?: 'full' | 'signatures'}>;

export type TypedTransactionsForAddressRequestConfig = Omit<
  NonNullable<
    Parameters<GetTransactionsForAddressApi['getTransactionsForAddress']>[1]
  >,
  'transactionDetails'
> &
  Readonly<{
    encoding?: GetFullTransactionsForAddressConfig['encoding'];
    maxSupportedTransactionVersion?: GetVersionedTransactionConfig['maxSupportedTransactionVersion'];
    transactionDetails?: 'full' | 'signatures';
  }>;

export type TypedSignatureStatusesRequestConfig = Readonly<{
  commitment?: Commitment;
  minContextSlot?: Slot;
  searchTransactionHistory?: boolean;
}>;

export type TypedParsedTransactionConfig = TypedTransactionConfig &
  Readonly<{
    encoding: 'jsonParsed';
  }>;

export type TypedEncodedTransactionConfig = TypedTransactionConfig &
  Readonly<{
    encoding: 'base58' | 'base64';
  }>;

export type TypedBlockRequestConfig =
  | TypedBlockWithoutTransactionsConfig<TypedBlockWithoutTransactionsMode>
  | TypedAccountsModeBlockConfig
  | TypedParsedAccountsModeBlockConfig
  | TypedFullBlockConfig
  | TypedEncodedFullBlockConfig
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
    | (Pick<
        GetVersionedBlockConfig,
        'maxSupportedTransactionVersion' | 'rewards' | 'transactionDetails'
      > &
        Readonly<{encoding?: TypedEncodedFullBlockConfig['encoding']}>)
    | undefined,
  hasRawConfig: boolean,
): TypedEncodedFullBlockConfig | TypedFullBlockConfig | undefined {
  const encodingConfig =
    (config?.transactionDetails == null ||
      config.transactionDetails === 'full') &&
    (config?.encoding === 'base58' || config?.encoding === 'base64')
      ? {encoding: config.encoding}
      : null;

  if (config?.transactionDetails === 'full') {
    return {
      ...encodingConfig,
      ...getTypedBlockConfigBase(finality, config),
      transactionDetails: 'full',
    };
  }

  return hasRawConfig
    ? {...encodingConfig, ...getTypedBlockConfigBase(finality, config)}
    : undefined;
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

function getTypedTransactionConfigBase(
  finality: Finality | undefined,
  config: GetVersionedTransactionConfig | undefined,
): TypedTransactionConfig {
  const minContextSlot = coerceOptionalNumericToBigInt(
    config?.minContextSlot,
    'minContextSlot',
  );
  return {
    ...(finality != null ? {commitment: finality} : null),
    ...(config?.maxSupportedTransactionVersion != null
      ? {
          maxSupportedTransactionVersion: config.maxSupportedTransactionVersion,
        }
      : null),
    ...(minContextSlot != null ? {minContextSlot} : null),
  } satisfies TypedTransactionConfig;
}

export function buildTypedTransactionConfig(
  finality: Finality | undefined,
  config:
    | (GetVersionedTransactionConfig &
        Readonly<{encoding?: TypedEncodedTransactionConfig['encoding']}>)
    | undefined,
): TypedEncodedTransactionConfig | TypedTransactionConfig | undefined {
  const typedConfig = {
    ...(config?.encoding === 'base58' || config?.encoding === 'base64'
      ? {encoding: config.encoding}
      : null),
    ...getTypedTransactionConfigBase(finality, config),
  };
  return Object.keys(typedConfig).length > 0 ? typedConfig : undefined;
}

export function buildTypedParsedTransactionConfig(
  finality: Finality | undefined,
  config: GetVersionedTransactionConfig | undefined,
): TypedParsedTransactionConfig {
  return {
    encoding: 'jsonParsed',
    ...getTypedTransactionConfigBase(finality, config),
  } satisfies TypedParsedTransactionConfig;
}

function buildTypedNumericComparison(
  comparison: TransactionsForAddressNumericComparison,
  valueName: string,
) {
  const gt = coerceOptionalNumericToBigInt(comparison.gt, `${valueName}.gt`);
  const gte = coerceOptionalNumericToBigInt(comparison.gte, `${valueName}.gte`);
  const lt = coerceOptionalNumericToBigInt(comparison.lt, `${valueName}.lt`);
  const lte = coerceOptionalNumericToBigInt(comparison.lte, `${valueName}.lte`);
  return {
    ...(gt != null ? {gt} : null),
    ...(gte != null ? {gte} : null),
    ...(lt != null ? {lt} : null),
    ...(lte != null ? {lte} : null),
  };
}

function buildTypedBlockTimeComparison(
  comparison: NonNullable<TransactionsForAddressFilters['blockTime']>,
) {
  const {gt, gte, lt, lte} = buildTypedNumericComparison(
    comparison,
    'blockTime',
  );
  const eq = coerceOptionalNumericToBigInt(comparison.eq, 'blockTime.eq');
  return {
    ...(eq != null ? {eq: eq as UnixTimestamp} : null),
    ...(gt != null ? {gt: gt as UnixTimestamp} : null),
    ...(gte != null ? {gte: gte as UnixTimestamp} : null),
    ...(lt != null ? {lt: lt as UnixTimestamp} : null),
    ...(lte != null ? {lte: lte as UnixTimestamp} : null),
  };
}

function buildTypedSignatureComparison(
  comparison: TransactionsForAddressSignatureComparison,
) {
  const {gt, gte, lt, lte} = comparison;
  [gt, gte, lt, lte].forEach(signature => {
    if (signature != null) assertIsSignature(signature);
  });
  return {
    ...(gt != null ? {gt: gt as Signature} : null),
    ...(gte != null ? {gte: gte as Signature} : null),
    ...(lt != null ? {lt: lt as Signature} : null),
    ...(lte != null ? {lte: lte as Signature} : null),
  };
}

function buildTypedTransactionsForAddressFilters(
  filters: TransactionsForAddressFilters,
) {
  return {
    ...(filters.blockTime != null
      ? {blockTime: buildTypedBlockTimeComparison(filters.blockTime)}
      : null),
    ...(filters.signature != null
      ? {signature: buildTypedSignatureComparison(filters.signature)}
      : null),
    ...(filters.slot != null
      ? {slot: buildTypedNumericComparison(filters.slot, 'slot')}
      : null),
    ...(filters.status != null ? {status: filters.status} : null),
    ...(filters.tokenAccounts != null
      ? {tokenAccounts: filters.tokenAccounts}
      : null),
  };
}

export function buildTypedTransactionsForAddressConfig(
  finality: Finality,
  config: TypedTransactionsForAddressInput | undefined,
): TypedTransactionsForAddressRequestConfig {
  const isFull = config?.transactionDetails === 'full';
  const minContextSlot = coerceOptionalNumericToBigInt(
    config?.minContextSlot,
    'minContextSlot',
  );
  return {
    commitment: finality,
    ...(config?.filters != null
      ? {filters: buildTypedTransactionsForAddressFilters(config.filters)}
      : null),
    ...(isFull && config?.encoding != null
      ? {encoding: config.encoding}
      : null),
    ...(config?.limit != null ? {limit: config.limit} : null),
    ...(isFull && config?.maxSupportedTransactionVersion != null
      ? {maxSupportedTransactionVersion: config.maxSupportedTransactionVersion}
      : null),
    ...(minContextSlot != null ? {minContextSlot} : null),
    ...(config?.paginationToken != null
      ? {paginationToken: config.paginationToken}
      : null),
    ...(config?.sortOrder != null ? {sortOrder: config.sortOrder} : null),
    ...(isFull ? {transactionDetails: 'full' as const} : null),
  } satisfies TypedTransactionsForAddressRequestConfig;
}

/**
 * Always sends `searchTransactionHistory` when a config object is present. Agave
 * releases before anza-xyz/agave#15091 reject the config if the field is missing;
 * the explicit `false` fallback can be dropped once those releases are no longer
 * in use.
 */
export function buildTypedSignatureStatusesConfig(
  config: SignatureStatusConfig | undefined,
): TypedSignatureStatusesRequestConfig | undefined {
  const minContextSlot = coerceOptionalNumericToBigInt(
    config?.minContextSlot,
    'minContextSlot',
  );
  const typedConfig = {
    ...(config?.commitment != null ? {commitment: config.commitment} : null),
    ...(minContextSlot != null ? {minContextSlot} : null),
  } satisfies TypedSignatureStatusesRequestConfig;

  if (
    Object.keys(typedConfig).length === 0 &&
    config?.searchTransactionHistory == null
  ) {
    return undefined;
  }

  return {
    ...typedConfig,
    searchTransactionHistory: config?.searchTransactionHistory ?? false,
  };
}

export function getTokenAccountsRpcFilter(
  filter: TokenAccountsFilter,
): {mint: Address} | {programId: Address} {
  const hasMint = 'mint' in filter && filter.mint != null;
  const hasProgramId = 'programId' in filter && filter.programId != null;

  if (hasMint === hasProgramId) {
    throw new Error(
      'Ambiguous token accounts filter. Supply exactly one of `mint` or ' +
        '`programId`.',
    );
  }

  return hasMint
    ? {mint: (filter as {mint: PublicKey}).mint.toBase58()}
    : {programId: (filter as {programId: PublicKey}).programId.toBase58()};
}

export function getProgramAccountsRpcFilters(
  filters: readonly GetProgramAccountsFilter[] | undefined,
):
  | Array<GetProgramAccountsDatasizeFilter | GetProgramAccountsMemcmpFilter>
  | undefined {
  return filters?.map(filter => {
    const hasMemcmp = 'memcmp' in filter && filter.memcmp != null;
    const hasDataSize = 'dataSize' in filter && filter.dataSize != null;

    if (hasMemcmp === hasDataSize) {
      throw new Error(
        'Ambiguous program accounts filter. Supply exactly one of `memcmp` ' +
          'or `dataSize` per filter.',
      );
    }

    if (hasMemcmp) {
      const encoding = filter.memcmp.encoding ?? 'base58';
      if (encoding !== 'base58' && encoding !== 'base64') {
        throw new Error(
          `Unsupported memcmp encoding \`${String(encoding)}\`. Expected \`base58\` or \`base64\`.`,
        );
      }
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
      dataSize: coerceNumericToBigInt(
        (filter as DataSizeFilter).dataSize,
        'dataSize',
      ),
    };
  });
}
