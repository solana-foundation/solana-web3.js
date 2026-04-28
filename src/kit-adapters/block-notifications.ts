/**
 * Boundary: Kit block websocket payloads -> Connection block result shapes.
 *
 * This module translates raw `blockSubscribe` notification payloads into the
 * block subscription results exposed by Connection. The controller delegates
 * block-specific decoding here during dispatch; the runtime only emits raw
 * events and the registry only tracks state and callbacks.
 */
import type {
  TransactionError as RpcTransactionError,
  TransactionForAccounts,
  TransactionForFullBase58,
  TransactionForFullBase64,
  TransactionForFullJson,
  TransactionForFullJsonParsed,
} from '@solana/rpc-types';

import type {
  BlockSubscriptionAccountsModeBlockResponse,
  BlockSubscriptionBase58BlockResponse,
  BlockSubscriptionBase64BlockResponse,
  BlockSubscriptionJsonBlockResponse,
  BlockSubscriptionJsonParsedBlockResponse,
} from '../connection';
import type {
  BlockNotificationBlock,
  BlockSubscriptionConfig,
} from './subscription-types';
import type {TransactionVersion} from '../transaction';
import assert from '../utils/assert';
import {coerceNumericToBigInt} from '../utils/bigint';
import {
  mapBlockBase,
  normalizeTransactionVersion,
} from './response';

type RawBlockReward = Readonly<{
  commission?: number | null;
  lamports: number | bigint;
  postBalance: number | bigint | null;
  pubkey: string;
  rewardType: string | null;
}>;

type RawBlockLike = Readonly<{
  blockhash: string;
  previousBlockhash: string;
  parentSlot: number | bigint;
  blockTime: number | bigint | null;
  blockHeight: number | bigint | null;
  rewards?: readonly RawBlockReward[];
}>;

type BlockNotificationDispatchConfig = BlockSubscriptionConfig | 'default';

type BlockNotificationTransactionKind =
  | 'accounts'
  | 'base58'
  | 'base64'
  | 'parsed'
  | 'json';

type BlockNotificationTransactionsSource<TTransaction = unknown> =
  RawBlockLike &
    Readonly<{
      transactions: readonly TTransaction[];
    }>;

type BlockNotificationAccountsTransaction = (
  | TransactionForAccounts<void>
  | TransactionForAccounts<0>
) &
  Readonly<{version?: TransactionVersion | bigint}>;

type BlockNotificationBase58Transaction = (
  | TransactionForFullBase58<void>
  | TransactionForFullBase58<0>
) &
  Readonly<{version?: TransactionVersion | bigint}>;

type BlockNotificationBase64Transaction = (
  | TransactionForFullBase64<void>
  | TransactionForFullBase64<0>
) &
  Readonly<{version?: TransactionVersion | bigint}>;

type BlockNotificationJsonTransaction = (
  | TransactionForFullJson<void>
  | TransactionForFullJson<0>
) &
  Readonly<{version?: TransactionVersion | bigint}>;

type BlockNotificationJsonParsedTransaction = (
  | TransactionForFullJsonParsed<void>
  | TransactionForFullJsonParsed<0>
) &
  Readonly<{version?: TransactionVersion | bigint}>;

type BlockNotificationTransactionByKind = Readonly<{
  accounts: BlockNotificationAccountsTransaction;
  base58: BlockNotificationBase58Transaction;
  base64: BlockNotificationBase64Transaction;
  parsed: BlockNotificationJsonParsedTransaction;
  json: BlockNotificationJsonTransaction;
}>;

type BlockNotificationFullTransactionMetaSource =
  | BlockNotificationBase58Transaction['meta']
  | BlockNotificationBase64Transaction['meta']
  | BlockNotificationJsonTransaction['meta'];

type BlockNotificationMetaWithInnerInstructionsSource =
  | BlockNotificationFullTransactionMetaSource
  | BlockNotificationJsonParsedTransaction['meta'];

type BlockNotificationMetaWithTokenBalancesSource =
  | BlockNotificationAccountsTransaction['meta']
  | BlockNotificationMetaWithInnerInstructionsSource;

type BlockNotificationRawTokenBalanceSet = NonNullable<
  NonNullable<BlockNotificationMetaWithTokenBalancesSource>['postTokenBalances']
>;

type BlockNotificationRawMeta = {
  computeUnitsConsumed?: number | bigint;
  costUnits?: number | bigint;
  err: RpcTransactionError | null;
  fee: number | bigint;
  logMessages?: readonly string[] | null;
  postBalances: readonly (number | bigint)[];
  postTokenBalances?: BlockNotificationRawTokenBalanceSet | null;
  preBalances: readonly (number | bigint)[];
  preTokenBalances?: BlockNotificationRawTokenBalanceSet | null;
};

type BlockNotificationTransactionMeta = Exclude<
  | BlockSubscriptionBase58BlockResponse['transactions'][number]['meta']
  | BlockSubscriptionBase64BlockResponse['transactions'][number]['meta']
  | BlockSubscriptionJsonBlockResponse['transactions'][number]['meta']
  | BlockSubscriptionJsonParsedBlockResponse['transactions'][number]['meta'],
  null
>;

type BlockNotificationAccountsTransactionMeta = Exclude<
  BlockSubscriptionAccountsModeBlockResponse['transactions'][number]['meta'],
  null
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object';
}

function inferBlockNotificationTransactionKind(
  value: unknown,
): BlockNotificationTransactionKind | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const transaction = (value as {transaction?: unknown}).transaction;
  if (Array.isArray(transaction) && transaction.length === 2) {
    switch (transaction[1]) {
      case 'base58':
        return 'base58';
      case 'base64':
        return 'base64';
      default:
        return undefined;
    }
  }

  if (!isRecord(transaction)) {
    return undefined;
  }

  if (Array.isArray((transaction as {accountKeys?: unknown}).accountKeys)) {
    return 'accounts';
  }

  const message = (transaction as {message?: unknown}).message;
  if (!isRecord(message)) {
    return undefined;
  }

  const accountKeys = (message as {accountKeys?: unknown}).accountKeys;
  if (!Array.isArray(accountKeys)) {
    return undefined;
  }

  if (
    accountKeys.length === 0 ||
    (isRecord(accountKeys[0]) &&
      typeof (accountKeys[0] as {pubkey?: unknown}).pubkey === 'string')
  ) {
    return 'parsed';
  }

  return typeof accountKeys[0] === 'string' ? 'json' : undefined;
}

function inferBlockNotificationTransactionsSourceKind(
  blockSource: BlockNotificationTransactionsSource,
): BlockNotificationTransactionKind | undefined {
  let sourceKind: BlockNotificationTransactionKind | undefined;

  for (const transaction of blockSource.transactions) {
    const transactionKind = inferBlockNotificationTransactionKind(transaction);
    if (transactionKind == null) {
      return undefined;
    }
    if (sourceKind == null) {
      sourceKind = transactionKind;
    } else if (sourceKind !== transactionKind) {
      return undefined;
    }
  }

  return sourceKind ?? 'json';
}

function hasTransactionsArray(
  block: unknown,
): block is BlockNotificationTransactionsSource {
  return (
    isRecord(block) &&
    Array.isArray((block as {transactions?: unknown}).transactions)
  );
}

function hasSignaturesArray(
  block: unknown,
): block is RawBlockLike & Readonly<{signatures: readonly string[]}> {
  return (
    isRecord(block) &&
    Array.isArray((block as {signatures?: unknown}).signatures)
  );
}

function normalizeBlockNotificationMeta<TMeta extends BlockNotificationRawMeta>(
  meta: TMeta,
  expectation: string,
) {
  return {
    ...meta,
    fee: coerceNumericToBigInt(meta.fee, `${expectation}.fee`),
    postBalances: meta.postBalances.map((balance, index) =>
      coerceNumericToBigInt(balance, `${expectation}.postBalances[${index}]`),
    ),
    preBalances: meta.preBalances.map((balance, index) =>
      coerceNumericToBigInt(balance, `${expectation}.preBalances[${index}]`),
    ),
    ...(meta.computeUnitsConsumed != null
      ? {
          computeUnitsConsumed: coerceNumericToBigInt(
            meta.computeUnitsConsumed,
            `${expectation}.computeUnitsConsumed`,
          ),
        }
      : null),
    ...(meta.costUnits != null
      ? {
          costUnits: coerceNumericToBigInt(
            meta.costUnits,
            `${expectation}.costUnits`,
          ),
        }
      : null),
  };
}

function mapBlockNotificationLoadedAddresses(
  meta: NonNullable<BlockNotificationMetaWithInnerInstructionsSource>,
): NonNullable<BlockNotificationTransactionMeta['loadedAddresses']> {
  return 'loadedAddresses' in meta && meta.loadedAddresses != null
    ? meta.loadedAddresses
    : {readonly: [], writable: []};
}

function mapBlockNotificationTransactionMeta(
  meta: BlockNotificationMetaWithInnerInstructionsSource,
  expectation: string,
): BlockNotificationTransactionMeta | null {
  if (meta == null) {
    return null;
  }

  return {
    ...normalizeBlockNotificationMeta(meta, expectation),
    loadedAddresses: mapBlockNotificationLoadedAddresses(meta),
  };
}

function mapBlockNotificationAccountsTransactionMeta(
  meta: BlockNotificationAccountsTransaction['meta'],
  expectation: string,
): BlockNotificationAccountsTransactionMeta | null {
  if (meta == null) {
    return null;
  }

  return normalizeBlockNotificationMeta(meta, expectation);
}

function assertBlockNotificationTransactionsSourceHasKind<
  TKind extends BlockNotificationTransactionKind,
>(
  blockSource: BlockNotificationTransactionsSource,
  kind: TKind,
  expectation: string,
): asserts blockSource is BlockNotificationTransactionsSource<
  BlockNotificationTransactionByKind[TKind]
> {
  assert(
    blockSource.transactions.every(
      transaction =>
        inferBlockNotificationTransactionKind(transaction) === kind,
    ),
    expectation,
  );
}

function mapBlockNotificationTransactions<
  TTransactionResponse extends Readonly<{
    meta: unknown;
    version?: TransactionVersion | bigint;
  }>,
  TMappedMeta,
>(
  transactions: readonly TTransactionResponse[],
  expectationPrefix: string,
  mapMeta: (
    meta: TTransactionResponse['meta'],
    expectation: string,
  ) => TMappedMeta,
): Array<
  Omit<TTransactionResponse, 'version'> & {
    meta: TMappedMeta;
    version?: TransactionVersion;
  }
> {
  return transactions.map((transactionResponse, index) => {
    const {version: rawVersion, ...transaction} = transactionResponse;
    const version = normalizeTransactionVersion(rawVersion);

    return {
      ...transaction,
      ...(version != null ? {version} : null),
      meta: mapMeta(
        transaction.meta,
        `Expected block subscription ${expectationPrefix} transactions[${index}].meta`,
      ),
    };
  });
}

function mapBlockNotificationWithTransactionKind(
  blockSource: BlockNotificationTransactionsSource,
  kind: BlockNotificationTransactionKind,
): BlockNotificationBlock {
  switch (kind) {
    case 'accounts':
      assertBlockNotificationTransactionsSourceHasKind(
        blockSource,
        'accounts',
        'Expected block subscription accounts transactions',
      );
      return {
        ...mapBlockBase(blockSource),
        transactions: mapBlockNotificationTransactions(
          blockSource.transactions,
          'accounts',
          mapBlockNotificationAccountsTransactionMeta,
        ),
      } as BlockSubscriptionAccountsModeBlockResponse;
    case 'parsed':
      assertBlockNotificationTransactionsSourceHasKind(
        blockSource,
        'parsed',
        'Expected block subscription parsed transactions',
      );
      return {
        ...mapBlockBase(blockSource),
        transactions: mapBlockNotificationTransactions(
          blockSource.transactions,
          'parsed',
          mapBlockNotificationTransactionMeta,
        ),
      } as BlockSubscriptionJsonParsedBlockResponse;
    case 'base58':
      assertBlockNotificationTransactionsSourceHasKind(
        blockSource,
        'base58',
        'Expected block subscription base58 transactions',
      );
      return {
        ...mapBlockBase(blockSource),
        transactions: mapBlockNotificationTransactions(
          blockSource.transactions,
          'base58',
          mapBlockNotificationTransactionMeta,
        ),
      } as BlockSubscriptionBase58BlockResponse;
    case 'base64':
      assertBlockNotificationTransactionsSourceHasKind(
        blockSource,
        'base64',
        'Expected block subscription base64 transactions',
      );
      return {
        ...mapBlockBase(blockSource),
        transactions: mapBlockNotificationTransactions(
          blockSource.transactions,
          'base64',
          mapBlockNotificationTransactionMeta,
        ),
      } as BlockSubscriptionBase64BlockResponse;
    case 'json':
      assertBlockNotificationTransactionsSourceHasKind(
        blockSource,
        'json',
        'Expected block subscription json transactions',
      );
      return {
        ...mapBlockBase(blockSource),
        transactions: mapBlockNotificationTransactions(
          blockSource.transactions,
          'json',
          mapBlockNotificationTransactionMeta,
        ),
      } as BlockSubscriptionJsonBlockResponse;
  }
}

function mapBlockNotificationSignaturesBlock(
  block: RawBlockLike & Readonly<{signatures: readonly string[]}>,
): BlockNotificationBlock {
  const {signatures, ...mappedBlock} = mapBlockBase(block);
  return {
    ...mappedBlock,
    signatures: [...signatures],
  };
}

export function mapBlockNotificationBlock(
  notificationBlock: unknown,
  dispatchConfig: BlockNotificationDispatchConfig | undefined,
): BlockNotificationBlock | null {
  if (notificationBlock == null) {
    return null;
  }

  if (dispatchConfig == null || dispatchConfig === 'default') {
    if (hasTransactionsArray(notificationBlock)) {
      const transactionKind =
        inferBlockNotificationTransactionsSourceKind(notificationBlock);
      assert(
        transactionKind != null,
        'Expected block subscription transactions',
      );
      return mapBlockNotificationWithTransactionKind(
        notificationBlock,
        transactionKind,
      );
    }

    if (hasSignaturesArray(notificationBlock)) {
      return mapBlockNotificationSignaturesBlock(notificationBlock);
    }

    return mapBlockBase(notificationBlock as RawBlockLike);
  }

  switch (dispatchConfig.transactionDetails ?? 'full') {
    case 'accounts':
      assert(
        hasTransactionsArray(notificationBlock),
        'Expected block subscription accounts transactions',
      );
      return mapBlockNotificationWithTransactionKind(
        notificationBlock,
        'accounts',
      );
    case 'none':
      return mapBlockBase(notificationBlock as RawBlockLike);
    case 'signatures':
      assert(
        hasSignaturesArray(notificationBlock),
        'Expected block subscription signatures',
      );
      return mapBlockNotificationSignaturesBlock(notificationBlock);
    case 'full':
      assert(
        hasTransactionsArray(notificationBlock),
        'Expected block subscription transactions',
      );
      return mapBlockNotificationWithTransactionKind(
        notificationBlock,
        dispatchConfig.encoding === 'jsonParsed'
          ? 'parsed'
          : (dispatchConfig.encoding ?? 'json'),
      );
  }
}
