/**
 * Boundary: Kit payload mapping -> Connection result shapes.
 *
 * This module centralizes shared mapping helpers for data coming back from
 * Kit, including bigint coercion, address normalization, and
 * transaction/block mapping. Connection request methods use it for RPC
 * responses, and websocket notification adapters reuse the same helpers when
 * notification payloads need the same public shaping.
 */
import {
  getBase58Encoder,
  getBase64Codec,
  type Address,
  type AccountInfoBase,
  type AccountInfoWithBase64EncodedData,
  type TransactionConfig as RpcTransactionConfig,
  type TransactionForAccounts,
  type TransactionForFullJson,
  type TransactionForFullJsonParsed,
} from '@solana/kit';

import type {Blockhash} from '../blockhash';
import {PublicKey} from '../publickey';
import type {
  AccountInfoWithSpace,
  BlockhashWithExpiryBlockHeight,
  BlockResponse,
  ConfirmedTransactionMeta,
  GetProgramAccountsResponse,
  LoadedAddresses,
  ParsedAccountData,
  ParsedAddressTableLookup,
  ParsedBlockResponse,
  ParsedInnerInstruction,
  ParsedInstruction,
  ParsedMessageAccount,
  ParsedTransaction,
  ParsedTransactionMeta,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
  SimulatedTransactionAccountInfo,
  SimulatedTransactionResponse,
  TransactionError,
  TransactionReturnData,
  TransactionReturnDataEncoding,
  VersionedAccountsModeBlockResponse,
  VersionedBlockResponse,
  VersionedTransactionResponse,
} from '../connection';
import {
  Message,
  MessageV0,
  MessageV1,
  type V1TransactionConfig,
  type VersionedMessage,
} from '../message';
import type {TransactionVersion} from '../transaction';
import assert from '../utils/assert';
import {coerceNumericToBigInt} from '../utils/bigint';
import {toUint8ArrayView} from '../utils/typed-array';

const BASE58_ENCODER = getBase58Encoder();
const BASE64_CODEC = getBase64Codec();

type TypedLegacyMessageSource =
  TransactionForFullJson<void>['transaction']['message'];

type TypedVersion0MessageSource =
  TransactionForFullJson<0>['transaction']['message'];

/**
 * The shape of a v1 message in a `json`-encoded RPC response: the v0 shape
 * minus address table lookups, which v1 transactions do not support.
 */
type TypedVersion1MessageSource = Omit<
  TransactionForFullJson<1>['transaction']['message'],
  'addressTableLookups'
>;

type TypedMessageSource =
  | TypedLegacyMessageSource
  | TypedVersion0MessageSource
  | TypedVersion1MessageSource;

type TypedTransactionSource = Readonly<{
  blockTime: number | bigint | null;
  meta:
    | TransactionForFullJson<void>['meta']
    | TransactionForFullJson<0 | 1>['meta'];
  slot: number | bigint;
  transaction:
    | TransactionForFullJson<void>['transaction']
    | TransactionForFullJson<0 | 1>['transaction'];
  version?: TransactionVersion | bigint;
}>;

type TypedParsedTransactionSource = Readonly<{
  blockTime: number | bigint | null;
  meta:
    | TransactionForFullJsonParsed<void>['meta']
    | TransactionForFullJsonParsed<0 | 1>['meta'];
  slot: number | bigint;
  transaction:
    | TransactionForFullJsonParsed<void>['transaction']
    | TransactionForFullJsonParsed<0 | 1>['transaction'];
  version?: TransactionVersion | bigint;
}>;

type TypedAccountsModeBlockTransaction =
  | TransactionForAccounts<void>
  | TransactionForAccounts<0 | 1>;

type TypedFullBlockTransactionSource = Readonly<{
  meta:
    | TransactionForFullJson<void>['meta']
    | TransactionForFullJson<0 | 1>['meta'];
  transaction:
    | TransactionForFullJson<void>['transaction']
    | TransactionForFullJson<0 | 1>['transaction'];
  version?: TransactionVersion | bigint;
}>;

type TypedParsedBlockTransactionSource = Readonly<{
  meta:
    | TransactionForFullJsonParsed<void>['meta']
    | TransactionForFullJsonParsed<0 | 1>['meta'];
  transaction:
    | TransactionForFullJsonParsed<void>['transaction']
    | TransactionForFullJsonParsed<0 | 1>['transaction'];
  version?: TransactionVersion | bigint;
}>;

type RawParsedMessageAccount =
  | TypedAccountsModeBlockTransaction['transaction']['accountKeys'][number]
  | TypedParsedTransactionSource['transaction']['message']['accountKeys'][number];

type RawParsedAddressTableLookup = Readonly<{
  accountKey: PublicKey | string;
  readonlyIndexes: readonly number[];
  writableIndexes: readonly number[];
}>;

type RawParsedMessageInstruction =
  TypedParsedTransactionSource['transaction']['message']['instructions'][number];

type RawParsedInnerInstructions = NonNullable<
  NonNullable<TypedParsedTransactionSource['meta']>['innerInstructions']
>;

type RawParsedInnerInstruction =
  RawParsedInnerInstructions[number]['instructions'][number];

type RawAccountInfo<TData> = Readonly<
  Omit<AccountInfoBase, 'owner'> & {
    data: TData;
    owner: PublicKey | Address | string;
    rentEpoch?: unknown;
  }
>;

type RawBase64AccountInfo = RawAccountInfo<
  AccountInfoWithBase64EncodedData['data']
>;

type RawParsedAccountData = Readonly<{
  parsed: ParsedAccountData['parsed'];
  program: ParsedAccountData['program'];
  space: ParsedAccountData['space'];
}>;

type RawJsonParsedAccountInfo = RawAccountInfo<
  RawBase64AccountInfo['data'] | RawParsedAccountData
>;

type RawParsedOnlyAccountInfo = RawAccountInfo<RawParsedAccountData>;

type RawKeyedAccountInfo<TAccount> = Readonly<{
  account: TAccount;
  pubkey: PublicKey | Address | string;
}>;

type RawSimulatedAccountInfo = Readonly<
  AccountInfoBase & AccountInfoWithBase64EncodedData & {rentEpoch?: unknown}
>;

type RawSimulatedReplacementBlockhash = Readonly<{
  blockhash: string;
  lastValidBlockHeight: bigint;
}>;

type RawSimulatedReturnData = Readonly<{
  data: readonly [string, TransactionReturnDataEncoding];
  programId: string;
}>;

type RawSimulatedTransactionResponse = Readonly<{
  err: TransactionError | null;
  logs: string[] | null;
  accounts?: readonly (RawSimulatedAccountInfo | null)[] | null;
  loadedAccountsDataSize?: number;
  replacementBlockhash?: unknown;
  unitsConsumed?: bigint;
  returnData?: RawSimulatedReturnData | null;
  innerInstructions?: unknown;
}>;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object';
}

function assertHasRawAccountRentEpoch<TAccount extends object>(
  account: TAccount,
  expectation: string,
): asserts account is TAccount & {rentEpoch: bigint} {
  assert(
    'rentEpoch' in account && typeof account.rentEpoch === 'bigint',
    expectation,
  );
}

function decodeBase64AccountData(value: string): Uint8Array {
  return toUint8ArrayView(BASE64_CODEC.encode(value));
}

function mapParsedAccountData(data: RawParsedAccountData): ParsedAccountData {
  return {
    parsed: data.parsed,
    program: data.program,
    space: data.space,
  };
}

export function mapBase64AccountInfo(account: null, expectation?: string): null;

export function mapBase64AccountInfo(
  account: RawBase64AccountInfo,
  expectation?: string,
): AccountInfoWithSpace<Uint8Array>;

export function mapBase64AccountInfo(
  account: RawBase64AccountInfo | null,
  expectation?: string,
): AccountInfoWithSpace<Uint8Array> | null;

export function mapBase64AccountInfo(
  account: RawBase64AccountInfo | null,
  expectation = 'Expected raw account info rentEpoch',
): AccountInfoWithSpace<Uint8Array> | null {
  if (account == null) {
    return null;
  }

  assertHasRawAccountRentEpoch(account, expectation);

  return {
    executable: account.executable,
    owner: new PublicKey(account.owner),
    lamports: account.lamports,
    data: decodeBase64AccountData(account.data[0]),
    rentEpoch: account.rentEpoch,
    space: account.space,
  };
}

export function mapJsonParsedAccountInfo(
  account: null,
  expectation?: string,
): null;

export function mapJsonParsedAccountInfo(
  account: RawJsonParsedAccountInfo,
  expectation?: string,
): AccountInfoWithSpace<Uint8Array | ParsedAccountData>;

export function mapJsonParsedAccountInfo(
  account: RawJsonParsedAccountInfo | null,
  expectation?: string,
): AccountInfoWithSpace<Uint8Array | ParsedAccountData> | null;

export function mapJsonParsedAccountInfo(
  account: RawJsonParsedAccountInfo | null,
  expectation = 'Expected parsed account info rentEpoch',
): AccountInfoWithSpace<Uint8Array | ParsedAccountData> | null {
  if (account == null) {
    return null;
  }

  assertHasRawAccountRentEpoch(account, expectation);

  return {
    executable: account.executable,
    owner: new PublicKey(account.owner),
    lamports: account.lamports,
    data: Array.isArray(account.data)
      ? decodeBase64AccountData(account.data[0])
      : mapParsedAccountData(account.data),
    rentEpoch: account.rentEpoch,
    space: account.space,
  };
}

export function mapParsedAccountInfo(account: null, expectation?: string): null;

export function mapParsedAccountInfo(
  account: RawParsedOnlyAccountInfo,
  expectation?: string,
): AccountInfoWithSpace<ParsedAccountData>;

export function mapParsedAccountInfo(
  account: RawParsedOnlyAccountInfo | null,
  expectation?: string,
): AccountInfoWithSpace<ParsedAccountData> | null;

export function mapParsedAccountInfo(
  account: RawParsedOnlyAccountInfo | null,
  expectation = 'Expected parsed account info rentEpoch',
): AccountInfoWithSpace<ParsedAccountData> | null {
  if (account == null) {
    return null;
  }

  assertHasRawAccountRentEpoch(account, expectation);

  return {
    executable: account.executable,
    owner: new PublicKey(account.owner),
    lamports: account.lamports,
    data: mapParsedAccountData(account.data),
    rentEpoch: account.rentEpoch,
    space: account.space,
  };
}

function mapKeyedAccounts<TAccount, TMappedAccount>(
  value: readonly RawKeyedAccountInfo<TAccount>[],
  mapAccount: (account: TAccount) => TMappedAccount,
): Array<{account: TMappedAccount; pubkey: PublicKey}> {
  return value.map(({account, pubkey}) => ({
    account: mapAccount(account),
    pubkey: new PublicKey(pubkey),
  }));
}

export function mapKeyedBase64AccountInfos(
  value: readonly RawKeyedAccountInfo<RawBase64AccountInfo>[],
  expectation = 'Expected raw account info rentEpoch',
): GetProgramAccountsResponse {
  return mapKeyedAccounts(value, account =>
    mapBase64AccountInfo(account, expectation),
  );
}

export function mapKeyedJsonParsedAccountInfos(
  value: readonly RawKeyedAccountInfo<RawJsonParsedAccountInfo>[],
  expectation = 'Expected parsed account info rentEpoch',
): Array<{
  account: AccountInfoWithSpace<Uint8Array | ParsedAccountData>;
  pubkey: PublicKey;
}> {
  return mapKeyedAccounts(value, account =>
    mapJsonParsedAccountInfo(account, expectation),
  );
}

export function mapKeyedParsedAccountInfos(
  value: readonly RawKeyedAccountInfo<RawParsedOnlyAccountInfo>[],
  expectation = 'Expected parsed account info rentEpoch',
): Array<{
  account: AccountInfoWithSpace<ParsedAccountData>;
  pubkey: PublicKey;
}> {
  return mapKeyedAccounts(value, account =>
    mapParsedAccountInfo(account, expectation),
  );
}

function mapSimulatedAccountInfo(
  account: RawSimulatedAccountInfo | null,
): SimulatedTransactionAccountInfo | null {
  if (account == null) {
    return null;
  }

  let rentEpoch: bigint | undefined;
  if (account.rentEpoch != null) {
    assert(
      typeof account.rentEpoch === 'bigint',
      'Expected simulated account rentEpoch to be bigint',
    );
    rentEpoch = account.rentEpoch;
  }

  return {
    data: [account.data[0], account.data[1]],
    executable: account.executable,
    lamports: account.lamports,
    owner: account.owner,
    rentEpoch,
    space: account.space,
  };
}

function mapSimulatedAccounts(
  accounts: readonly (RawSimulatedAccountInfo | null)[] | null,
): (SimulatedTransactionAccountInfo | null)[] | null {
  return accounts == null ? null : accounts.map(mapSimulatedAccountInfo);
}

function isRawSimulatedReplacementBlockhash(
  value: unknown,
): value is RawSimulatedReplacementBlockhash {
  return (
    isRecord(value) &&
    typeof value.blockhash === 'string' &&
    typeof value.lastValidBlockHeight === 'bigint'
  );
}

function mapSimulatedReplacementBlockhash(
  replacementBlockhash: RawSimulatedReplacementBlockhash,
): BlockhashWithExpiryBlockHeight {
  return {
    blockhash: replacementBlockhash.blockhash,
    lastValidBlockHeight: replacementBlockhash.lastValidBlockHeight,
  };
}

function mapSimulatedReturnData(
  returnData: RawSimulatedReturnData | null,
): TransactionReturnData | null {
  if (returnData == null) {
    return null;
  }

  return {
    data: [returnData.data[0], returnData.data[1]],
    programId: returnData.programId,
  };
}

function isRpcParsedInnerInstructions(
  innerInstructions: unknown,
): innerInstructions is RawParsedInnerInstructions {
  return (
    Array.isArray(innerInstructions) &&
    innerInstructions.every(({instructions}) =>
      instructions.every(
        (instruction: unknown) =>
          isRecord(instruction) && 'programId' in instruction,
      ),
    )
  );
}

function mapBlockRewards(rewards: readonly RawBlockReward[] | undefined) {
  return rewards?.map(reward => ({
    commission: reward.commission,
    lamports: coerceNumericToBigInt(reward.lamports, 'lamports'),
    postBalance:
      reward.postBalance == null
        ? null
        : coerceNumericToBigInt(reward.postBalance, 'postBalance'),
    pubkey: reward.pubkey,
    rewardType: reward.rewardType,
  }));
}

export function mapBlockBase<TBlock extends RawBlockLike>(block: TBlock) {
  return {
    ...block,
    blockhash: block.blockhash,
    blockHeight:
      block.blockHeight == null
        ? null
        : coerceNumericToBigInt(block.blockHeight, 'blockHeight'),
    blockTime:
      block.blockTime == null
        ? null
        : coerceNumericToBigInt(block.blockTime, 'blockTime'),
    parentSlot: coerceNumericToBigInt(block.parentSlot, 'parentSlot'),
    previousBlockhash: block.previousBlockhash,
    rewards: mapBlockRewards(block.rewards),
  };
}

export function mapSimulatedTransactionResponseValue(
  value: RawSimulatedTransactionResponse,
): SimulatedTransactionResponse {
  const mappedValue: SimulatedTransactionResponse = {
    err: value.err,
    logs: value.logs == null ? null : [...value.logs],
  };

  if ('accounts' in value) {
    mappedValue.accounts = mapSimulatedAccounts(value.accounts ?? null);
  }
  if (value.loadedAccountsDataSize !== undefined) {
    mappedValue.loadedAccountsDataSize = value.loadedAccountsDataSize;
  }
  if (
    'replacementBlockhash' in value &&
    isRawSimulatedReplacementBlockhash(value.replacementBlockhash)
  ) {
    mappedValue.replacementBlockhash = mapSimulatedReplacementBlockhash(
      value.replacementBlockhash,
    );
  }
  if (value.unitsConsumed !== undefined) {
    mappedValue.unitsConsumed = value.unitsConsumed;
  }
  if ('returnData' in value) {
    mappedValue.returnData = mapSimulatedReturnData(value.returnData ?? null);
  }
  if ('innerInstructions' in value) {
    const innerInstructions = value.innerInstructions;
    assert(
      innerInstructions == null ||
        isRpcParsedInnerInstructions(innerInstructions),
      'Expected parsed inner instructions in simulateTransaction result',
    );
    mappedValue.innerInstructions = mapRpcParsedInnerInstructions(
      innerInstructions ?? null,
    );
  }

  return mappedValue;
}

function legacyMessageFromResponse(
  message: TypedLegacyMessageSource,
  recentBlockhash: Blockhash,
): Message {
  return new Message({
    accountKeys: [...message.accountKeys],
    header: message.header,
    instructions: message.instructions.map(ix => ({
      ...(ix.stackHeight != null ? {stackHeight: ix.stackHeight} : null),
      accounts: [...ix.accounts],
      data: ix.data,
      programIdIndex: ix.programIdIndex,
    })),
    recentBlockhash,
  });
}

function version0MessageFromResponse(
  message: TypedVersion0MessageSource,
  recentBlockhash: Blockhash,
): MessageV0 {
  return new MessageV0({
    header: message.header,
    staticAccountKeys: message.accountKeys.map(
      accountKey => new PublicKey(accountKey),
    ),
    recentBlockhash,
    compiledInstructions: message.instructions.map(ix => ({
      programIdIndex: ix.programIdIndex,
      accountKeyIndexes: [...ix.accounts],
      data: toUint8ArrayView(BASE58_ENCODER.encode(ix.data)),
    })),
    addressTableLookups:
      message.addressTableLookups?.map(mapParsedAddressTableLookup) ?? [],
  });
}

export function mapTransactionConfigResponse(
  config: RpcTransactionConfig,
): V1TransactionConfig | undefined {
  const mapped: V1TransactionConfig = {};
  if (config.computeUnitLimit != null) {
    mapped.computeUnitLimit = Number(config.computeUnitLimit);
  }
  if (config.heapSize != null) {
    mapped.heapSize = Number(config.heapSize);
  }
  if (config.loadedAccountsDataSizeLimit != null) {
    mapped.loadedAccountsDataSizeLimit = Number(
      config.loadedAccountsDataSizeLimit,
    );
  }
  if (config.priorityFee != null) {
    mapped.priorityFeeLamports = coerceNumericToBigInt(
      config.priorityFee,
      'priorityFee',
    );
  }
  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function version1MessageFromResponse(
  message: TypedVersion1MessageSource,
  recentBlockhash: Blockhash,
): MessageV1 {
  return new MessageV1({
    header: message.header,
    staticAccountKeys: message.accountKeys.map(
      accountKey => new PublicKey(accountKey),
    ),
    recentBlockhash,
    compiledInstructions: message.instructions.map(ix => ({
      programIdIndex: ix.programIdIndex,
      accountKeyIndexes: [...ix.accounts],
      data: toUint8ArrayView(BASE58_ENCODER.encode(ix.data)),
    })),
    transactionConfig:
      message.transactionConfig != null
        ? mapTransactionConfigResponse(message.transactionConfig)
        : undefined,
  });
}

function isVersion0Message(
  version: TransactionVersion | undefined,
  message: TypedMessageSource,
): message is TypedVersion0MessageSource {
  void message;
  return version === 0;
}

function isVersion1Message(
  version: TransactionVersion | undefined,
  message: TypedMessageSource,
): message is TypedVersion1MessageSource {
  void message;
  return version === 1;
}

function versionedMessageFromResponse(
  version: TransactionVersion | undefined,
  message: TypedMessageSource,
): VersionedMessage {
  const recentBlockhash = message.recentBlockhash;

  if (isVersion0Message(version, message)) {
    return version0MessageFromResponse(message, recentBlockhash);
  }
  if (isVersion1Message(version, message)) {
    return version1MessageFromResponse(message, recentBlockhash);
  }
  return legacyMessageFromResponse(message, recentBlockhash);
}

function mapLoadedAddresses(loadedAddresses: {
  readonly: readonly (Address | PublicKey)[];
  writable: readonly (Address | PublicKey)[];
}): LoadedAddresses {
  return {
    readonly: loadedAddresses.readonly.map(address =>
      address instanceof PublicKey ? address : new PublicKey(address),
    ),
    writable: loadedAddresses.writable.map(address =>
      address instanceof PublicKey ? address : new PublicKey(address),
    ),
  };
}

function hasCostUnits(value: object): value is {
  costUnits: number | bigint;
} {
  return (
    'costUnits' in value &&
    (typeof (value as {costUnits?: unknown}).costUnits === 'number' ||
      typeof (value as {costUnits?: unknown}).costUnits === 'bigint')
  );
}

function hasLoadedAddresses(value: object): value is {
  loadedAddresses?: {
    readonly: readonly Address[];
    writable: readonly Address[];
  } | null;
} {
  return 'loadedAddresses' in value;
}

function mapParsedMessageAccount(
  account: RawParsedMessageAccount | ParsedMessageAccount,
): ParsedMessageAccount {
  return {
    ...account,
    pubkey:
      account.pubkey instanceof PublicKey
        ? account.pubkey
        : new PublicKey(account.pubkey),
  };
}

function mapParsedAddressTableLookup(
  lookup: RawParsedAddressTableLookup | ParsedAddressTableLookup,
): ParsedAddressTableLookup {
  return {
    ...lookup,
    accountKey:
      lookup.accountKey instanceof PublicKey
        ? lookup.accountKey
        : new PublicKey(lookup.accountKey),
    readonlyIndexes: [...lookup.readonlyIndexes],
    writableIndexes: [...lookup.writableIndexes],
  };
}

function mapRpcParsedInstruction(
  instruction:
    | RawParsedMessageInstruction
    | RawParsedInnerInstruction
    | ParsedInstruction
    | PartiallyDecodedInstruction,
): ParsedInstruction | PartiallyDecodedInstruction {
  if ('parsed' in instruction) {
    return {
      parsed: instruction.parsed,
      program: instruction.program,
      programId:
        instruction.programId instanceof PublicKey
          ? instruction.programId
          : new PublicKey(instruction.programId),
    };
  }

  return {
    accounts: instruction.accounts.map(account =>
      account instanceof PublicKey ? account : new PublicKey(account),
    ),
    data: instruction.data,
    programId:
      instruction.programId instanceof PublicKey
        ? instruction.programId
        : new PublicKey(instruction.programId),
  };
}

export function mapRpcParsedInnerInstructions(
  innerInstructions: RawParsedInnerInstructions | null,
): ParsedInnerInstruction[] | null {
  if (innerInstructions == null) {
    return null;
  }

  return innerInstructions.map(({index, instructions}) => ({
    index,
    instructions: instructions.map(mapRpcParsedInstruction),
  }));
}

export function mapTypedFullBlockMeta(
  meta: TypedTransactionSource['meta'],
):
  | BlockResponse['transactions'][number]['meta']
  | VersionedBlockResponse['transactions'][number]['meta'] {
  if (meta == null) {
    return null;
  }

  const mappedMeta = hasCostUnits(meta)
    ? {
        ...meta,
        costUnits: coerceNumericToBigInt(meta.costUnits, 'costUnits'),
      }
    : meta;

  if (hasLoadedAddresses(mappedMeta) && mappedMeta.loadedAddresses != null) {
    return {
      ...mappedMeta,
      loadedAddresses: mapLoadedAddresses(mappedMeta.loadedAddresses),
    };
  }

  return mappedMeta;
}

export function mapTypedParsedBlockMeta(
  meta: TypedParsedTransactionSource['meta'],
): ParsedBlockResponse['transactions'][number]['meta'] {
  if (meta == null) {
    return null;
  }

  const mappedMeta = hasCostUnits(meta)
    ? {
        ...meta,
        costUnits: coerceNumericToBigInt(meta.costUnits, 'costUnits'),
      }
    : meta;

  if (hasLoadedAddresses(mappedMeta)) {
    const {innerInstructions, loadedAddresses, ...rest} = mappedMeta;

    return {
      ...rest,
      ...(innerInstructions != null
        ? {
            innerInstructions: mapRpcParsedInnerInstructions(innerInstructions),
          }
        : null),
      ...(loadedAddresses != null
        ? {
            loadedAddresses: mapLoadedAddresses(loadedAddresses),
          }
        : null),
    };
  }

  const {innerInstructions, ...rest} = mappedMeta;

  return {
    ...rest,
    ...(innerInstructions != null
      ? {
          innerInstructions: mapRpcParsedInnerInstructions(innerInstructions),
        }
      : null),
  };
}

export function mapTypedAccountsModeBlockTransactions(
  transactions: readonly TypedAccountsModeBlockTransaction[],
): VersionedAccountsModeBlockResponse['transactions'] {
  return transactions.map(transactionResponse => {
    const meta =
      transactionResponse.meta != null && hasCostUnits(transactionResponse.meta)
        ? {
            ...transactionResponse.meta,
            costUnits: coerceNumericToBigInt(
              transactionResponse.meta.costUnits,
              'costUnits',
            ),
          }
        : transactionResponse.meta;

    return {
      ...('version' in transactionResponse
        ? {
            version: normalizeTransactionVersion(transactionResponse.version),
          }
        : null),
      meta,
      transaction: {
        ...transactionResponse.transaction,
        accountKeys: transactionResponse.transaction.accountKeys.map(
          mapParsedMessageAccount,
        ),
        signatures: [...transactionResponse.transaction.signatures],
      },
    };
  });
}

export function mapTypedFullBlockTransaction(
  transactionResponse: TypedFullBlockTransactionSource,
): VersionedBlockResponse['transactions'][number] {
  const version = normalizeTransactionVersion(
    'version' in transactionResponse ? transactionResponse.version : undefined,
  );

  return {
    ...(version != null ? {version} : null),
    meta: mapTypedFullBlockMeta(transactionResponse.meta),
    transaction: {
      ...transactionResponse.transaction,
      signatures: [...transactionResponse.transaction.signatures],
      message: versionedMessageFromResponse(
        version,
        transactionResponse.transaction.message,
      ),
    },
  };
}

export function mapParsedTransaction(
  transaction: TypedParsedTransactionSource['transaction'],
): ParsedTransaction {
  const addressTableLookups =
    'addressTableLookups' in transaction.message &&
    Array.isArray(transaction.message.addressTableLookups)
      ? transaction.message.addressTableLookups.map(mapParsedAddressTableLookup)
      : null;

  const {transactionConfig: rawTransactionConfig, ...rawMessage} =
    transaction.message;
  const transactionConfig =
    rawTransactionConfig != null
      ? mapTransactionConfigResponse(rawTransactionConfig)
      : undefined;

  return {
    ...transaction,
    signatures: [...transaction.signatures],
    message: {
      ...rawMessage,
      accountKeys: transaction.message.accountKeys.map(mapParsedMessageAccount),
      ...(addressTableLookups != null ? {addressTableLookups} : null),
      ...(transactionConfig != null ? {transactionConfig} : null),
      instructions: transaction.message.instructions.map(
        mapRpcParsedInstruction,
      ),
    },
  };
}

export function mapTypedParsedBlockTransaction(
  transactionResponse: TypedParsedBlockTransactionSource,
): ParsedBlockResponse['transactions'][number] {
  const version = normalizeTransactionVersion(
    'version' in transactionResponse ? transactionResponse.version : undefined,
  );

  return {
    ...(version != null ? {version} : null),
    meta: mapTypedParsedBlockMeta(transactionResponse.meta),
    transaction: mapParsedTransaction(transactionResponse.transaction),
  };
}

function mapTransactionMetaCompat(
  meta: TypedTransactionSource['meta'],
): ConfirmedTransactionMeta | null {
  if (meta == null) {
    return null;
  }

  return {
    ...(meta.computeUnitsConsumed != null
      ? {
          computeUnitsConsumed: coerceNumericToBigInt(
            meta.computeUnitsConsumed,
            'computeUnitsConsumed',
          ),
        }
      : null),
    err: meta.err,
    fee: coerceNumericToBigInt(meta.fee, 'fee'),
    innerInstructions:
      meta.innerInstructions == null
        ? meta.innerInstructions
        : meta.innerInstructions.map(({index, instructions}) => ({
            index,
            instructions: instructions.map(ix => ({
              ...(ix.stackHeight != null
                ? {stackHeight: ix.stackHeight}
                : null),
              accounts: [...ix.accounts],
              data: ix.data,
              programIdIndex: ix.programIdIndex,
            })),
          })),
    ...(hasLoadedAddresses(meta) && meta.loadedAddresses != null
      ? {loadedAddresses: mapLoadedAddresses(meta.loadedAddresses)}
      : null),
    logMessages: meta.logMessages == null ? null : [...meta.logMessages],
    postBalances: meta.postBalances.map(balance =>
      coerceNumericToBigInt(balance, 'postBalance'),
    ),
    ...(meta.postTokenBalances != null
      ? {postTokenBalances: [...meta.postTokenBalances]}
      : null),
    preBalances: meta.preBalances.map(balance =>
      coerceNumericToBigInt(balance, 'preBalance'),
    ),
    ...(meta.preTokenBalances != null
      ? {preTokenBalances: [...meta.preTokenBalances]}
      : null),
    ...(hasCostUnits(meta)
      ? {costUnits: coerceNumericToBigInt(meta.costUnits, 'costUnits')}
      : null),
  };
}

function mapParsedTransactionMetaCompat(
  meta: TypedParsedTransactionSource['meta'],
): ParsedTransactionMeta | null {
  if (meta == null) {
    return null;
  }

  return {
    ...(meta.computeUnitsConsumed != null
      ? {
          computeUnitsConsumed: coerceNumericToBigInt(
            meta.computeUnitsConsumed,
            'computeUnitsConsumed',
          ),
        }
      : null),
    err: meta.err,
    fee: coerceNumericToBigInt(meta.fee, 'fee'),
    innerInstructions:
      meta.innerInstructions == null
        ? meta.innerInstructions
        : meta.innerInstructions.map(({index, instructions}) => ({
            index,
            instructions: instructions.map(mapRpcParsedInstruction),
          })),
    ...(hasLoadedAddresses(meta) && meta.loadedAddresses != null
      ? {loadedAddresses: mapLoadedAddresses(meta.loadedAddresses)}
      : null),
    logMessages: meta.logMessages == null ? null : [...meta.logMessages],
    postBalances: meta.postBalances.map(balance =>
      coerceNumericToBigInt(balance, 'postBalance'),
    ),
    ...(meta.postTokenBalances != null
      ? {postTokenBalances: [...meta.postTokenBalances]}
      : null),
    preBalances: meta.preBalances.map(balance =>
      coerceNumericToBigInt(balance, 'preBalance'),
    ),
    ...(meta.preTokenBalances != null
      ? {preTokenBalances: [...meta.preTokenBalances]}
      : null),
    ...(hasCostUnits(meta)
      ? {costUnits: coerceNumericToBigInt(meta.costUnits, 'costUnits')}
      : null),
  };
}

export function normalizeTransactionVersion(
  version: TransactionVersion | bigint | undefined,
): TransactionVersion | undefined {
  if (version === undefined || version === 'legacy') {
    return version;
  }

  return typeof version === 'bigint'
    ? (Number(version) as TransactionVersion)
    : version;
}

export function mapTypedTransactionResponse(
  response: TypedTransactionSource,
): VersionedTransactionResponse {
  const version = normalizeTransactionVersion(
    'version' in response ? response.version : undefined,
  );

  return {
    blockTime:
      response.blockTime == null
        ? null
        : coerceNumericToBigInt(response.blockTime, 'blockTime'),
    meta: mapTransactionMetaCompat(response.meta),
    slot: coerceNumericToBigInt(response.slot, 'slot'),
    transaction: {
      ...response.transaction,
      message: versionedMessageFromResponse(
        version,
        response.transaction.message,
      ),
      signatures: [...response.transaction.signatures],
    },
    ...(version != null ? {version} : null),
  };
}

export function mapTypedParsedTransactionResponse(
  response: TypedParsedTransactionSource,
): ParsedTransactionWithMeta {
  const version = normalizeTransactionVersion(
    'version' in response ? response.version : undefined,
  );

  return {
    blockTime:
      response.blockTime == null
        ? null
        : coerceNumericToBigInt(response.blockTime, 'blockTime'),
    meta: mapParsedTransactionMetaCompat(response.meta),
    slot: coerceNumericToBigInt(response.slot, 'slot'),
    transaction: mapParsedTransaction(response.transaction),
    ...(version != null ? {version} : null),
  };
}
