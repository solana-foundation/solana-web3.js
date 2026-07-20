import {
  assertIsAddress,
  assertIsSignature,
  DEFAULT_RPC_CONFIG,
  createSolanaRpcApi,
  createRpc,
  getBase58Encoder,
  getBase64Codec,
  isSolanaError,
  lamports as rpcLamports,
  SolanaError,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
  type Address as KitAddress,
  type GetBalanceApi,
  type GetBlocksApi,
  type GetBlocksWithLimitApi,
  type GetBlockCommitmentApi,
  type GetBlockProductionApi,
  type GetBlockTimeApi,
  type GetClusterNodesApi,
  type GetEpochInfoApi,
  type GetFeeForMessageApi,
  type GetFirstAvailableBlockApi,
  type GetGenesisHashApi,
  type GetHealthApi,
  type GetHighestSnapshotSlotApi,
  type GetInflationRateApi,
  type GetInflationRewardApi,
  type GetLargestAccountsApi,
  type GetLatestBlockhashApi,
  type GetMaxRetransmitSlotApi,
  type GetMaxShredInsertSlotApi,
  type GetMinimumBalanceForRentExemptionApi,
  type GetRecentPerformanceSamplesApi,
  type GetRecentPrioritizationFeesApi,
  type GetSignatureStatusesApi,
  type GetSignaturesForAddressApi,
  type GetSlotApi,
  type GetStakeMinimumDelegationApi,
  type GetSupplyApi,
  type GetTokenAccountBalanceApi,
  type GetTokenLargestAccountsApi,
  type GetTokenSupplyApi,
  type GetVersionApi,
  type GetVoteAccountsApi,
  type IsBlockhashValidApi,
  type MinimumLedgerSlotApi,
  type SendTransactionApi,
  type Base64EncodedWireTransaction,
  type Commitment,
  type RpcTransport,
  type Signature,
  type AccountInfoBase,
  type AccountInfoWithBase64EncodedData,
  type Base64EncodedBytes,
  type Blockhash,
  type Blockhash as RpcBlockhash,
  type Reward,
  type Slot,
  type TransactionError as RpcTransactionError,
  type TransactionForAccounts,
  type TransactionForFullBase58,
  type TransactionForFullBase64,
  type TransactionForFullJson,
  type TransactionForFullJsonParsed,
  type UnixTimestamp,
} from '@solana/kit';
import fastStableStringify from '@solana/fast-stable-stringify';
import {
  parseJsonWithBigInts,
  stringifyJsonWithBigInts,
} from '@solana/rpc-spec-types';

import {EpochSchedule} from './epoch-schedule';
import {SendTransactionError, SolanaJSONRPCError} from './errors';
import {DurableNonce, NonceAccount} from './nonce-account';
import {Address} from './address';
import type {Signer} from './keypair';
import {
  coerceNumericToBigInt,
  coerceOptionalNumericToBigInt,
} from './utils/bigint';
import type {
  BlockSubscriptionAccountsCallback,
  BlockSubscriptionAccountsConfig,
  BlockSubscriptionBase58Callback,
  BlockSubscriptionBase58Config,
  BlockSubscriptionBase64Callback,
  BlockSubscriptionBase64Config,
  BlockSubscriptionCallback,
  BlockSubscriptionConfig,
  BlockSubscriptionFilter,
  BlockSubscriptionJsonCallback,
  BlockSubscriptionJsonConfig,
  BlockSubscriptionJsonParsedCallback,
  BlockSubscriptionJsonParsedConfig,
  BlockSubscriptionNoneCallback,
  BlockSubscriptionNoneConfig,
  BlockSubscriptionSignaturesCallback,
  BlockSubscriptionSignaturesConfig,
  AccountChangeCallback,
  AccountSubscriptionBase64ZstdConfig,
  AccountSubscriptionBinaryConfig,
  AccountSubscriptionConfig,
  AccountSubscriptionParsedConfig,
  Base64ZstdAccountChangeCallback,
  Base64ZstdProgramAccountChangeCallback,
  LogsCallback,
  LogsFilter,
  ParsedAccountChangeCallback,
  ParsedProgramAccountChangeCallback,
  ProgramAccountChangeCallback,
  ProgramAccountSubscriptionBase64ZstdConfig,
  ProgramAccountSubscriptionBinaryConfig,
  ProgramAccountSubscriptionConfig,
  ProgramAccountSubscriptionParsedConfig,
  RootChangeCallback,
  SignatureResultCallback,
  SignatureSubscriptionReceivedOptions,
  SignatureSubscriptionCallback,
  SignatureSubscriptionOptions,
  SignatureSubscriptionStatusOptions,
  SlotChangeCallback,
  SlotUpdateCallback,
  VoteCallback,
} from './kit-adapters/subscription-types';
import {
  buildAccountSubscriptionSpec,
  buildBlockSubscriptionSpec,
  buildLogsSubscriptionSpec,
  buildProgramSubscriptionSpec,
  buildSignatureSubscriptionSpec,
} from './kit-adapters/subscription-specs';
import {
  buildTypedAccountsBlockConfig,
  buildTypedFullBlockConfig,
  buildTypedParsedFullBlockConfig,
  buildTypedParsedTransactionConfig,
  buildTypedTransactionConfig,
  getProgramAccountsRpcFilters,
  getTypedBlockWithoutTransactionsConfig,
  type TypedBlocksRequestConfig,
  type TypedBlockRequestConfig,
  type TypedFullBlockConfig,
  type TypedInflationRewardRequestConfig,
  type TypedLeaderScheduleRequestConfig,
  type TypedParsedBlockConfig,
  type TypedParsedTransactionConfig,
  type TypedRpcRequestMethod,
  type TypedSimulateTransactionRequestConfig,
  type TypedTransactionConfig,
} from './kit-adapters/request';
import {
  mapBase64AccountInfo,
  mapBlockBase,
  mapJsonParsedAccountInfo,
  mapKeyedBase64AccountInfos,
  mapKeyedJsonParsedAccountInfos,
  mapKeyedParsedAccountInfos,
  mapSimulatedTransactionResponseValue,
  mapTypedAccountsModeBlockTransactions,
  mapTypedFullBlockTransaction,
  mapTypedParsedBlockTransaction,
  mapTypedParsedTransactionResponse,
  mapTypedTransactionResponse,
} from './kit-adapters/response';
import {
  type ConnectionSubscriptionsNotificationDispatcher,
  KitSubscriptionRuntime,
  type ConnectionSubscriptionsRuntime,
  type SubscriptionChannelConfig,
  type SubscriptionChannel,
  type SubscriptionKind,
} from './rpc-subscriptions/runtime';
import {
  ConnectionSubscriptionRegistry,
  type ClientSubscriptionId,
  type ObservedSubscriptionState,
  type SubscriptionConfigByKind,
} from './rpc-subscriptions/registry';
import {ConnectionSubscriptionsController} from './rpc-subscriptions/controller';
import {MS_PER_SLOT} from './timing';
import {
  Transaction,
  TransactionStatus,
  TransactionVersion,
  VersionedTransaction,
} from './transaction';
import {Message, VersionedMessage} from './message';
import {AddressLookupTableAccount} from './programs/address-lookup-table/state';
import {getRuntimeVersion} from './runtime-config';
import assert from './utils/assert';
import {sleep} from './utils/sleep';
import {toUint8ArrayView} from './utils/typed-array';
import {
  TransactionExpiredBlockheightExceededError,
  TransactionExpiredNonceInvalidError,
  TransactionExpiredTimeoutError,
} from './transaction/expiry-custom-errors';
import {makeWebsocketUrl} from './utils/makeWebsocketUrl';
import type {TransactionSignature} from './transaction';
import type {CompiledInstruction} from './message';
import {toKitAddress} from './kit-adapters/address';
export type {
  BlockNotificationBlock,
  BlockNotificationResult,
  BlockSubscriptionAccountsCallback,
  BlockSubscriptionAccountsConfig,
  BlockSubscriptionAccountsResult,
  BlockSubscriptionBase58Callback,
  BlockSubscriptionBase58Config,
  BlockSubscriptionBase58Result,
  BlockSubscriptionBase64Callback,
  BlockSubscriptionBase64Config,
  BlockSubscriptionBase64Result,
  BlockSubscriptionCallback,
  BlockSubscriptionConfig,
  BlockSubscriptionFilter,
  BlockSubscriptionJsonCallback,
  BlockSubscriptionJsonConfig,
  BlockSubscriptionJsonParsedCallback,
  BlockSubscriptionJsonParsedConfig,
  BlockSubscriptionJsonParsedResult,
  BlockSubscriptionJsonResult,
  BlockSubscriptionNoneCallback,
  BlockSubscriptionNoneConfig,
  BlockSubscriptionNoneResult,
  BlockSubscriptionSignaturesCallback,
  BlockSubscriptionSignaturesConfig,
  BlockSubscriptionSignaturesResult,
} from './kit-adapters/subscription-types';
export type {
  AccountChangeCallback,
  AccountSubscriptionBase64ZstdConfig,
  AccountSubscriptionBinaryConfig,
  AccountSubscriptionConfig,
  AccountSubscriptionParsedConfig,
  Base64ZstdAccountChangeCallback,
  Base64ZstdProgramAccountChangeCallback,
  LogsCallback,
  LogsFilter,
  ParsedAccountChangeCallback,
  ParsedProgramAccountChangeCallback,
  ProgramAccountChangeCallback,
  ProgramAccountSubscriptionBase64ZstdConfig,
  ProgramAccountSubscriptionBinaryConfig,
  ProgramAccountSubscriptionConfig,
  ProgramAccountSubscriptionParsedConfig,
  RootChangeCallback,
  SignatureResultCallback,
  SignatureSubscriptionReceivedOptions,
  SignatureSubscriptionCallback,
  SignatureSubscriptionOptions,
  SignatureSubscriptionStatusOptions,
  SlotChangeCallback,
  SlotUpdateCallback,
  VoteCallback,
} from './kit-adapters/subscription-types';

/**
 * Extra contextual information for RPC responses
 */
export type Context = {
  slot: bigint;
};

/**
 * Information describing an account
 */
export type AccountInfo<T> = {
  /** `true` if this account's data contains a loaded program */
  executable: boolean;
  /** Identifier of the program that owns the account */
  owner: Address;
  /** Number of lamports assigned to the account */
  lamports: bigint;
  /** Optional data assigned to the account */
  data: T;
  /** Rent epoch info for account */
  rentEpoch: bigint;
};

export type AccountInfoWithSpace<T> = Readonly<
  AccountInfo<T> & {
    space: bigint;
  }
>;

/**
 * Account information identified by pubkey.
 *
 * The payload is generic so subscription callbacks can surface either raw
 * bytes or parsed account data depending on the requested encoding.
 */
export type KeyedAccountInfo<T = Uint8Array> = {
  accountId: Address;
  accountInfo: AccountInfoWithSpace<T>;
};

/**
 * Information about the latest slot being processed by a node
 */
export type SlotInfo = {
  /** Currently processing slot */
  slot: bigint;
  /** Parent of the current slot */
  parent: bigint;
  /** The root block of the current slot's fork */
  root: bigint;
};

/**
 * A slot update notification.
 *
 * - `"firstShredReceived"`: connected node received the first shred of a block.
 * - `"completed"`: connected node received all shreds of a block.
 * - `"createdBank"`: connected node has started validating this block.
 * - `"frozen"`: connected node has validated this block.
 * - `"dead"`: connected node failed to validate this block.
 * - `"optimisticConfirmation"`: block was optimistically confirmed by the cluster.
 * - `"root"`: the connected node rooted this block.
 */
export type SlotUpdate =
  | {
      type: 'firstShredReceived';
      slot: bigint;
      timestamp: bigint;
    }
  | {
      type: 'completed';
      slot: bigint;
      timestamp: bigint;
    }
  | {
      type: 'createdBank';
      slot: bigint;
      timestamp: bigint;
      parent: bigint;
    }
  | {
      type: 'frozen';
      slot: bigint;
      timestamp: bigint;
      stats: {
        numTransactionEntries: bigint;
        numSuccessfulTransactions: bigint;
        numFailedTransactions: bigint;
        maxTransactionsPerEntry: bigint;
      };
    }
  | {
      type: 'dead';
      slot: bigint;
      timestamp: bigint;
      err: string;
    }
  | {
      type: 'optimisticConfirmation';
      slot: bigint;
      timestamp: bigint;
    }
  | {
      type: 'root';
      slot: bigint;
      timestamp: bigint;
    };

/**
 * Transaction error
 */
export type TransactionError = RpcTransactionError;

/**
 * Signature result
 */
export type SignatureResult = {
  err: TransactionError | null;
};

/**
 * Signature status notification
 */
export type SignatureStatusNotification = {
  type: 'status';
  result: SignatureResult;
};

/**
 * Signature received notification
 */
export type SignatureReceivedNotification = {
  type: 'received';
};

/**
 * Vote observed in gossip.
 *
 * These votes are pre-consensus and are not guaranteed to land in the ledger.
 */
export type Vote = {
  hash: Blockhash;
  signature: TransactionSignature;
  slots: bigint[];
  timestamp: bigint | null;
  votePubkey: Address;
};

/**
 * Logs result.
 */
export type Logs = {
  err: TransactionError | null;
  logs: string[];
  signature: string;
};

function assertIsTransactionSignatureArray(
  signatures: readonly TransactionSignature[],
): asserts signatures is Parameters<
  GetSignatureStatusesApi['getSignatureStatuses']
>[0] {
  for (const signature of signatures) {
    assertIsSignature(signature);
  }
}

function encodeBase64WireData(value: Uint8Array): string {
  return BASE64_CODEC.decode(value);
}

const BASE58_ENCODER = getBase58Encoder();
const BASE64_CODEC = getBase64Codec();

/**
 * Attempt to use a recent blockhash for up to 30 seconds
 * @internal
 */
export const BLOCKHASH_CACHE_TIMEOUT_MS = 30 * 1000;

type StoredBlockSubscriptionDispatchConfig =
  | BlockSubscriptionConfig
  | 'default';

type Overwrite<T, U extends Partial<Record<keyof T, unknown>>> = Omit<
  T,
  keyof U
> &
  U;

type JsonRpcErrorLike = Readonly<{
  code: unknown;
  data?: unknown;
  message: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * @internal
 */
export type RpcParams = {
  methodName: string;
  args: Array<any>;
};

export type TokenAccountsFilter =
  | {
      mint: Address;
    }
  | {
      programId: Address;
    };

/**
 * Options for sending transactions
 */
export type SendOptions = Omit<
  NonNullable<Parameters<SendTransactionApi['sendTransaction']>[1]>,
  'encoding'
>;

/**
 * Options for confirming transactions
 */
export type ConfirmOptions = SendOptions & {
  /** desired commitment level */
  commitment?: Commitment;
};

/**
 * Options for getSignaturesForAddress
 */
export type SignaturesForAddressOptions = {
  /**
   * Start searching backwards from this transaction signature.
   * @remarks If not provided the search starts from the highest max confirmed block.
   */
  before?: TransactionSignature;
  /** Search until this transaction signature is reached, if found before `limit`. */
  until?: TransactionSignature;
  /** Maximum transaction signatures to return (between 1 and 1,000, default: 1,000). */
  limit?: number;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * RPC Response with extra contextual information
 */
export type RpcResponseAndContext<T> = {
  /** response context */
  context: Context;
  /** response value */
  value: T;
};

type GetBalanceKitResult = ReturnType<GetBalanceApi['getBalance']>;
type GetBlocksResult = ReturnType<GetBlocksApi['getBlocks']>;
type GetBlocksWithLimitResult = ReturnType<
  GetBlocksWithLimitApi['getBlocksWithLimit']
>;
type GetLatestBlockhashKitResult = ReturnType<
  GetLatestBlockhashApi['getLatestBlockhash']
>;
type GetSignaturesForAddressKitResult = ReturnType<
  GetSignaturesForAddressApi['getSignaturesForAddress']
>;

export type BlockhashWithExpiryBlockHeight = Readonly<
  Overwrite<GetLatestBlockhashKitResult['value'], {blockhash: Blockhash}>
>;

/**
 * A strategy for confirming transactions that uses the last valid
 * block height for a given blockhash to check for transaction expiration.
 */
export type BlockheightBasedTransactionConfirmationStrategy =
  BaseTransactionConfirmationStrategy &
    Readonly<
      Overwrite<
        BlockhashWithExpiryBlockHeight,
        {lastValidBlockHeight: number | bigint}
      >
    >;

/**
 * A strategy for confirming durable nonce transactions.
 */
export type DurableNonceTransactionConfirmationStrategy =
  BaseTransactionConfirmationStrategy & {
    /**
     * The lowest slot at which to fetch the nonce value from the
     * nonce account. This should be no lower than the slot at
     * which the last-known value of the nonce was fetched.
     */
    minContextSlot: number | bigint;
    /**
     * The account where the current value of the nonce is stored.
     */
    nonceAccountPubkey: Address;
    /**
     * The nonce value that was used to sign the transaction
     * for which confirmation is being sought.
     */
    nonceValue: DurableNonce;
  };

/**
 * Properties shared by all transaction confirmation strategies
 */
export type BaseTransactionConfirmationStrategy = Readonly<{
  /** A signal that, when aborted, cancels any outstanding transaction confirmation operations */
  abortSignal?: AbortSignal;
  signature: TransactionSignature;
}>;

export type SubscriptionReadyConfig = Readonly<{
  /**
   * A signal that, when aborted, cancels waiting for a subscription to become
   * ready.
   */
  abortSignal?: AbortSignal;
}>;

/**
 * This type represents all transaction confirmation strategies
 */
export type TransactionConfirmationStrategy =
  | BlockheightBasedTransactionConfirmationStrategy
  | DurableNonceTransactionConfirmationStrategy;

/* @internal */
function assertEndpointUrl(putativeUrl: string) {
  if (/^https?:/.test(putativeUrl) === false) {
    throw new TypeError('Endpoint URL must start with `http:` or `https:`.');
  }
  return putativeUrl;
}

/** @internal */
function extractCommitmentFromConfig<TConfig>(
  commitmentOrConfig?: Commitment | ({commitment?: Commitment} & TConfig),
) {
  let commitment: Commitment | undefined;
  let config: Omit<TConfig, 'commitment'> | undefined;
  if (typeof commitmentOrConfig === 'string') {
    commitment = commitmentOrConfig;
  } else if (commitmentOrConfig) {
    const {commitment: specifiedCommitment, ...specifiedConfig} =
      commitmentOrConfig;
    commitment = specifiedCommitment;
    config = specifiedConfig;
  }
  return {commitment, config};
}

/**
 * @internal
 */
function coerceToBase64EncodedWireTransaction(
  transaction: string,
): Base64EncodedWireTransaction {
  BASE64_CODEC.encode(transaction);
  return transaction as Base64EncodedWireTransaction;
}

/**
 * The level of commitment desired when querying state
 * <pre>
 *   'processed': Query the most recent block which has reached 1 confirmation by the connected node
 *   'confirmed': Query the most recent block which has reached 1 confirmation by the cluster
 *   'finalized': Query the most recent block which has been finalized by the cluster
 * </pre>
 */
export type {Commitment};

/**
 * A subset of Commitment levels, which are at least optimistically confirmed
 * <pre>
 *   'confirmed': Query the most recent block which has reached 1 confirmation by the cluster
 *   'finalized': Query the most recent block which has been finalized by the cluster
 * </pre>
 */
export type Finality = 'confirmed' | 'finalized';

/**
 * Filter for largest accounts query
 * <pre>
 *   'circulating':    Return the largest accounts that are part of the circulating supply
 *   'nonCirculating': Return the largest accounts that are not part of the circulating supply
 * </pre>
 */
export type LargestAccountsFilter = 'circulating' | 'nonCirculating';

/**
 * Configuration object for changing `getAccountInfo` query behavior
 */
export type GetAccountInfoConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
  /** Optional data slice to limit the returned account data */
  dataSlice?: DataSlice;
};

/**
 * Configuration object for changing `getBalance` query behavior
 */
export type GetBalanceConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for changing `getBlock` query behavior
 */
export type GetBlockConfig = {
  /** The level of finality desired */
  commitment?: Finality;
  /**
   * Whether to populate the rewards array. If parameter not provided, the default includes rewards.
   */
  rewards?: boolean;
  /**
   * Level of transaction detail to return, either "full", "accounts", "signatures", or "none". If
   * parameter not provided, the default detail level is "full". If "accounts" are requested,
   * transaction details only include signatures and an annotated list of accounts in each
   * transaction. Transaction metadata is limited to only: fee, err, pre_balances, post_balances,
   * pre_token_balances, and post_token_balances.
   */
  transactionDetails?: 'accounts' | 'full' | 'none' | 'signatures';
};

/**
 * Configuration object for changing `getBlock` query behavior
 */
export type GetVersionedBlockConfig = {
  /** The level of finality desired */
  commitment?: Finality;
  /** The max transaction version to return in responses. If the requested transaction is a higher version, an error will be returned */
  maxSupportedTransactionVersion?: number;
  /**
   * Whether to populate the rewards array. If parameter not provided, the default includes rewards.
   */
  rewards?: boolean;
  /**
   * Level of transaction detail to return, either "full", "accounts", "signatures", or "none". If
   * parameter not provided, the default detail level is "full". If "accounts" are requested,
   * transaction details only include signatures and an annotated list of accounts in each
   * transaction. Transaction metadata is limited to only: fee, err, pre_balances, post_balances,
   * pre_token_balances, and post_token_balances.
   */
  transactionDetails?: 'accounts' | 'full' | 'none' | 'signatures';
};

/**
 * Configuration object for changing `getStakeMinimumDelegation` query behavior
 */
export type GetStakeMinimumDelegationConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
};

/**
 * Configuration object for changing `getBlockHeight` query behavior
 */
export type GetBlockHeightConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for changing `getEpochInfo` query behavior
 */
export type GetEpochInfoConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for changing `getLeaderSchedule` query behavior
 */
export type GetLeaderScheduleConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
  /** Only return results for this validator identity */
  identity?: string;
};

/**
 * Configuration object for changing `getInflationReward` query behavior
 */
export type GetInflationRewardConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
  /** An epoch for which the reward occurs. If omitted, the previous epoch will be used */
  epoch?: number | bigint;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for changing `getLatestBlockhash` query behavior
 */
export type GetLatestBlockhashConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for changing `getFeeForMessage` query behavior
 */
export type GetFeeForMessageConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for changing `requestAirdrop` query behavior
 */
export type RequestAirdropConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
};

/**
 * Configuration object for changing `isBlockhashValid` query behavior
 */
export type IsBlockhashValidConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for changing `getSlot` query behavior
 */
export type GetSlotConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for changing `getSlotLeader` query behavior
 */
export type GetSlotLeaderConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for changing `getTransaction` query behavior
 */
export type GetTransactionConfig = {
  /** The level of finality desired */
  commitment?: Finality;
};

/**
 * Configuration object for changing `getTransaction` query behavior
 */
export type GetVersionedTransactionConfig = {
  /** The level of finality desired */
  commitment?: Finality;
  /** The max transaction version to return in responses. If the requested transaction is a higher version, an error will be returned */
  maxSupportedTransactionVersion?: number;
};

/**
 * Configuration object for changing `getLargestAccounts` query behavior
 */
export type GetLargestAccountsConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
  /** Filter largest accounts by whether they are part of the circulating supply */
  filter?: LargestAccountsFilter;
};

/**
 * Configuration object for changing `getSupply` request behavior
 */
export type GetSupplyConfig = {
  /** The level of commitment desired */
  commitment?: Commitment;
  /** Exclude non circulating accounts list from response */
  excludeNonCirculatingAccountsList?: boolean;
};

/**
 * Configuration object for changing query behavior
 */
export type SignatureStatusConfig = {
  /** enable searching status history, not needed for recent transactions */
  searchTransactionHistory: boolean;
};

/**
 * Information describing a cluster node
 */
export type ContactInfo = {
  /** Identity public key of the node */
  pubkey: string;
  /** Gossip network address for the node */
  gossip: string | null;
  /** TPU network address for the node (null if not available) */
  tpu: string | null;
  /** JSON RPC network address for the node (null if not available) */
  rpc: string | null;
  /** Software version of the node (null if not available) */
  version: string | null;
};

/**
 * Information describing a vote account
 */
type GetVoteAccountsKitResult = ReturnType<
  GetVoteAccountsApi['getVoteAccounts']
>;

export type VoteAccountInfo = Overwrite<
  GetVoteAccountsKitResult['current'][number],
  {
    rootSlot: bigint | null;
  }
>;

/**
 * A collection of cluster vote accounts
 */
export type VoteAccountStatus = Overwrite<
  GetVoteAccountsKitResult,
  {
    current: readonly VoteAccountInfo[];
    delinquent: readonly VoteAccountInfo[];
  }
>;

/**
 * Network Inflation
 * (see https://docs.solana.com/implemented-proposals/ed_overview)
 */
export type InflationGovernor = {
  foundation: number;
  foundationTerm: number;
  initial: number;
  taper: number;
  terminal: number;
};

/**
 * The inflation reward for an epoch
 */
export type InflationReward = NonNullable<
  ReturnType<GetInflationRewardApi['getInflationReward']>[number]
>;

export type RecentPrioritizationFees = ReturnType<
  GetRecentPrioritizationFeesApi['getRecentPrioritizationFees']
>[number];

/**
 * Configuration object for changing `getRecentPrioritizationFees` query behavior
 */
export type GetRecentPrioritizationFeesConfig = {
  /**
   * If this parameter is provided, the response will reflect a fee to land a transaction locking
   * all of the provided accounts as writable.
   */
  lockedWritableAccounts?: Address[];
};

export type InflationRate = ReturnType<GetInflationRateApi['getInflationRate']>;

/**
 * Information about the current epoch
 */
export type EpochInfo = ReturnType<GetEpochInfoApi['getEpochInfo']>;

/**
 * Leader schedule
 * (see https://docs.solana.com/terminology#leader-schedule)
 */
export type LeaderSchedule = {
  [address: string]: bigint[];
};

/**
 * Identity for an RPC node.
 */
export type Identity = {
  identity: Address;
};

export type SimulatedTransactionAccountInfo = {
  /** `true` if this account's data contains a loaded program */
  executable: boolean;
  /** Identifier of the program that owns the account */
  owner: string;
  /** Number of lamports assigned to the account */
  lamports: bigint;
  /** Optional data assigned to the account */
  data: string[];
  /** Optional rent epoch info for account */
  rentEpoch?: bigint;
  /** Size of the account data */
  space: bigint;
};

export type TransactionReturnDataEncoding = 'base64';

export type TransactionReturnData = {
  programId: string;
  data: [string, TransactionReturnDataEncoding];
};

export type SimulateTransactionConfig = {
  /** Optional parameter used to enable signature verification before simulation */
  sigVerify?: boolean;
  /** Optional parameter used to replace the simulated transaction's recent blockhash with the latest blockhash */
  replaceRecentBlockhash?: boolean;
  /** Optional parameter used to set the commitment level when selecting the latest block */
  commitment?: Commitment;
  /** Optional parameter used to specify a list of base58-encoded account addresses to return post simulation state for */
  accounts?: {
    /** The encoding of the returned account's data */
    encoding: 'base64';
    addresses: string[];
  };
  /** Optional parameter used to specify the minimum block slot that can be used for simulation */
  minContextSlot?: number | bigint;
  /** Optional parameter used to include inner instructions in the simulation */
  innerInstructions?: boolean;
};

export type SimulatedTransactionResponse = {
  err: TransactionError | null;
  logs: Array<string> | null;
  accounts?: (SimulatedTransactionAccountInfo | null)[] | null;
  loadedAccountsDataSize?: number;
  replacementBlockhash?: BlockhashWithExpiryBlockHeight;
  unitsConsumed?: bigint;
  returnData?: TransactionReturnData | null;
  innerInstructions?: ParsedInnerInstruction[] | null;
};

export type ParsedInnerInstruction = {
  index: number;
  instructions: (ParsedInstruction | PartiallyDecodedInstruction)[];
};

export type TokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  programId?: string;
  uiTokenAmount: TokenAmount;
};

/**
 * Metadata for a parsed confirmed transaction on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0. Please use {@link ParsedTransactionMeta} instead.
 */
export type ParsedConfirmedTransactionMeta = ParsedTransactionMeta;

/**
 * Collection of addresses loaded by a transaction using address table lookups
 */
export type LoadedAddresses = {
  writable: Array<Address>;
  readonly: Array<Address>;
};

/**
 * Metadata for a parsed transaction on the ledger
 */
export type CompiledInnerInstruction = {
  index: number;
  instructions: CompiledInstruction[];
};

type RpcParsedMessageInstruction =
  TransactionForFullJsonParsed<0>['transaction']['message']['instructions'][number];

type RpcPartiallyDecodedInstruction = Exclude<
  RpcParsedMessageInstruction,
  Readonly<{parsed: unknown}>
>;

type RpcParsedInstruction = Extract<
  RpcParsedMessageInstruction,
  Readonly<{parsed: unknown}>
>;

type RpcParsedMessageAccount =
  TransactionForAccounts<0>['transaction']['accountKeys'][number];

type RpcParsedAddressTableLookup = NonNullable<
  NonNullable<
    TransactionForFullJson<0>['transaction']['message']['addressTableLookups']
  >
>[number];

type RpcParsedTransaction = TransactionForFullJsonParsed<0>['transaction'];

/**
 * Metadata for a confirmed transaction on the ledger
 */
export type ConfirmedTransactionMeta = Overwrite<
  Omit<
    NonNullable<TransactionForFullJson<0>['meta']>,
    'returnData' | 'rewards' | 'status'
  >,
  {
    /** The fee charged for processing the transaction */
    fee: bigint;
    /** An array of cross program invoked instructions */
    innerInstructions?: CompiledInnerInstruction[] | null;
    /** The balances of the transaction accounts before processing */
    preBalances: Array<bigint>;
    /** The balances of the transaction accounts after processing */
    postBalances: Array<bigint>;
    /** An array of program log messages emitted during a transaction */
    logMessages?: Array<string> | null;
    /** The token balances of the transaction accounts before processing */
    preTokenBalances?: Array<TokenBalance> | null;
    /** The token balances of the transaction accounts after processing */
    postTokenBalances?: Array<TokenBalance> | null;
    /** The error result of transaction processing */
    err: TransactionError | null;
    /** The collection of addresses loaded using address lookup tables */
    loadedAddresses?: LoadedAddresses;
    /** The compute units consumed after processing the transaction */
    computeUnitsConsumed?: bigint;
  }
> & {
  /** The cost units consumed after processing the transaction */
  costUnits?: bigint;
};

/**
 * Metadata for a parsed transaction on the ledger
 */
export type ParsedTransactionMeta = Overwrite<
  Omit<
    NonNullable<TransactionForFullJsonParsed<0>['meta']>,
    'returnData' | 'rewards' | 'status'
  >,
  {
    /** The fee charged for processing the transaction */
    fee: bigint;
    /** An array of cross program invoked parsed instructions */
    innerInstructions?: ParsedInnerInstruction[] | null;
    /** The balances of the transaction accounts before processing */
    preBalances: Array<bigint>;
    /** The balances of the transaction accounts after processing */
    postBalances: Array<bigint>;
    /** An array of program log messages emitted during a transaction */
    logMessages?: Array<string> | null;
    /** The token balances of the transaction accounts before processing */
    preTokenBalances?: Array<TokenBalance> | null;
    /** The token balances of the transaction accounts after processing */
    postTokenBalances?: Array<TokenBalance> | null;
    /** The error result of transaction processing */
    err: TransactionError | null;
    /** The collection of addresses loaded using address lookup tables */
    loadedAddresses?: LoadedAddresses;
    /** The compute units consumed after processing the transaction */
    computeUnitsConsumed?: bigint;
  }
> & {
  /** The cost units consumed after processing the transaction */
  costUnits?: bigint;
};

type TransactionResponseBase = {
  slot: bigint;
  blockTime?: bigint | null;
};

/**
 * A processed transaction from the RPC API
 */
export type TransactionResponse = TransactionResponseBase &
  Overwrite<
    TransactionForFullJson<void>,
    {
      /** The transaction */
      transaction: {
        /** The transaction message */
        message: Message;
        /** The transaction signatures */
        signatures: string[];
      };
      /** Metadata produced from the transaction */
      meta: ConfirmedTransactionMeta | null;
    }
  >;

/**
 * A processed transaction from the RPC API
 */
export type VersionedTransactionResponse = TransactionResponseBase &
  Overwrite<
    TransactionForFullJson<0>,
    {
      /** The transaction */
      transaction: {
        /** The transaction message */
        message: VersionedMessage;
        /** The transaction signatures */
        signatures: string[];
      };
      /** Metadata produced from the transaction */
      meta: ConfirmedTransactionMeta | null;
      /** The transaction version */
      version?: TransactionVersion;
    }
  >;

/**
 * A confirmed transaction on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0.
 */
export type ConfirmedTransaction = {
  /** The slot during which the transaction was processed */
  slot: bigint;
  /** The details of the transaction */
  transaction: Transaction;
  /** Metadata produced from the transaction */
  meta: ConfirmedTransactionMeta | null;
  /** The unix timestamp of when the transaction was processed */
  blockTime?: bigint | null;
};

/**
 * A partially decoded transaction instruction
 */
export type PartiallyDecodedInstruction = Overwrite<
  RpcPartiallyDecodedInstruction,
  {
    /** Program id called by this instruction */
    programId: Address;
    /** Public keys of accounts passed to this instruction */
    accounts: Array<Address>;
    /** Raw base-58 instruction data */
    data: string;
  }
>;

/**
 * A parsed transaction message account
 */
export type ParsedMessageAccount = Overwrite<
  RpcParsedMessageAccount,
  {
    /** Public key of the account */
    pubkey: Address;
    /** Indicates if the account signed the transaction */
    signer: boolean;
    /** Indicates if the account is writable for this transaction */
    writable: boolean;
    /** Indicates if the account key came from the transaction or a lookup table */
    source?: 'transaction' | 'lookupTable';
  }
>;

/**
 * A parsed transaction instruction
 */
export type ParsedInstruction = Overwrite<
  RpcParsedInstruction,
  {
    /** ID of the program for this instruction */
    programId: Address;
    /** Parsed instruction info */
    parsed: any;
  }
>;

/**
 * A parsed address table lookup
 */
export type ParsedAddressTableLookup = Overwrite<
  RpcParsedAddressTableLookup,
  {
    /** Address lookup table account key */
    accountKey: Address;
    /** Parsed instruction info */
    writableIndexes: number[];
    /** Parsed instruction info */
    readonlyIndexes: number[];
  }
>;

/**
 * A parsed transaction message
 */
export type ParsedMessage = Overwrite<
  Omit<RpcParsedTransaction['message'], 'header'>,
  {
    /** Accounts used in the instructions */
    accountKeys: ParsedMessageAccount[];
    /** The atomically executed instructions for the transaction */
    instructions: (ParsedInstruction | PartiallyDecodedInstruction)[];
    /** Recent blockhash */
    recentBlockhash: string;
    /** Address table lookups used to load additional accounts */
    addressTableLookups?: ParsedAddressTableLookup[] | null;
  }
>;

/**
 * A parsed transaction
 */
export type ParsedTransaction = Overwrite<
  RpcParsedTransaction,
  {
    /** Signatures for the transaction */
    signatures: Array<string>;
    /** Message of the transaction */
    message: ParsedMessage;
  }
>;

/**
 * A parsed and confirmed transaction on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0. Please use {@link ParsedTransactionWithMeta} instead.
 */
export type ParsedConfirmedTransaction = ParsedTransactionWithMeta;

/**
 * A parsed transaction on the ledger with meta
 */
export type ParsedTransactionWithMeta = TransactionResponseBase &
  Overwrite<
    TransactionForFullJsonParsed<0>,
    {
      /** The details of the transaction */
      transaction: ParsedTransaction;
      /** Metadata produced from the transaction */
      meta: ParsedTransactionMeta | null;
      /** The version of the transaction message */
      version?: TransactionVersion;
    }
  >;

type BlockResponseTransactionMeta = NonNullable<
  TransactionForFullJson<void>['meta']
> & {
  costUnits?: bigint;
};

type ParsedBlockResponseTransactionMeta = Overwrite<
  NonNullable<TransactionForFullJsonParsed<0>['meta']>,
  {
    innerInstructions?: ParsedInnerInstruction[] | null;
    loadedAddresses?: LoadedAddresses;
  }
> & {
  costUnits?: bigint;
};

type AccountsModeBlockResponseTransactionMeta = NonNullable<
  TransactionForAccounts<0>['meta']
> & {
  costUnits?: bigint;
};

type VersionedBlockResponseTransactionMeta = Overwrite<
  NonNullable<TransactionForFullJson<0>['meta']>,
  {
    loadedAddresses?: LoadedAddresses;
  }
> & {
  costUnits?: bigint;
};

type NormalizedBlockSubscriptionMetaFields = {
  computeUnitsConsumed?: bigint;
  fee: bigint;
  postBalances: Array<bigint>;
  preBalances: Array<bigint>;
};

type BlockSubscriptionMetaWithCostUnits = {
  costUnits?: bigint;
};

type BlockSubscriptionTransactionMeta = Overwrite<
  NonNullable<TransactionForFullJson<0>['meta']>,
  NormalizedBlockSubscriptionMetaFields
> &
  BlockSubscriptionMetaWithCostUnits;

type BlockSubscriptionParsedTransactionMeta = Overwrite<
  NonNullable<TransactionForFullJsonParsed<0>['meta']>,
  NormalizedBlockSubscriptionMetaFields
> &
  BlockSubscriptionMetaWithCostUnits;

type BlockSubscriptionAccountsTransactionMeta = Overwrite<
  NonNullable<TransactionForAccounts<0>['meta']>,
  NormalizedBlockSubscriptionMetaFields
> &
  BlockSubscriptionMetaWithCostUnits;

type BlockResponseBase = {
  blockhash: Blockhash;
  previousBlockhash: Blockhash;
  parentSlot: bigint;
  blockTime: bigint | null;
  blockHeight: bigint | null;
  rewards?: Array<{
    commission?: number | null;
    lamports: bigint;
    postBalance: bigint | null;
    pubkey: string;
    rewardType: string | null;
  }>;
};

/**
 * A processed block fetched from the RPC API
 */
export type BlockResponse = BlockResponseBase & {
  /** Vector of transactions with status meta and original message */
  transactions: Array<
    Overwrite<
      TransactionForFullJson<void>,
      {
        transaction: {
          message: Message;
          signatures: string[];
        };
        meta: BlockResponseTransactionMeta | null;
      }
    >
  >;
};

/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `accounts`
 */
export type AccountsModeBlockResponse = VersionedAccountsModeBlockResponse;

/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `none`
 */
export type NoneModeBlockResponse = VersionedNoneModeBlockResponse;

/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `signatures`
 */
export type SignaturesModeBlockResponse = VersionedSignaturesModeBlockResponse;

/**
 * A block with parsed transactions
 */
export type ParsedBlockResponse = BlockResponseBase & {
  /** Vector of transactions with status meta and original message */
  transactions: Array<
    Overwrite<
      TransactionForFullJsonParsed<0>,
      {
        transaction: ParsedTransaction;
        meta: ParsedBlockResponseTransactionMeta | null;
        version?: TransactionVersion;
      }
    >
  >;
};

/**
 * A block with parsed transactions where the `transactionDetails` mode is `accounts`
 */
export type ParsedAccountsModeBlockResponse = Omit<
  ParsedBlockResponse,
  'transactions'
> & {
  transactions: Array<
    Overwrite<
      TransactionForAccounts<0>,
      {
        transaction: Pick<ParsedTransaction, 'signatures'> & {
          accountKeys: ParsedMessageAccount[];
        };
        meta: AccountsModeBlockResponseTransactionMeta | null;
        version?: TransactionVersion;
      }
    >
  >;
};

/**
 * A block with parsed transactions where the `transactionDetails` mode is `none`
 */
export type ParsedNoneModeBlockResponse = Omit<
  ParsedBlockResponse,
  'transactions'
>;

/**
 * A block with parsed transactions where the `transactionDetails` mode is `signatures`
 */
export type ParsedSignaturesModeBlockResponse = Omit<
  ParsedBlockResponse,
  'transactions'
> & {
  signatures: Array<string>;
};

/**
 * A processed block fetched from the RPC API
 */
export type VersionedBlockResponse = BlockResponseBase & {
  /** Vector of transactions with status meta and original message */
  transactions: Array<
    Overwrite<
      TransactionForFullJson<0>,
      {
        transaction: {
          message: VersionedMessage;
          signatures: string[];
        };
        meta: VersionedBlockResponseTransactionMeta | null;
        version?: TransactionVersion;
      }
    >
  >;
};

/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `accounts`
 */
export type VersionedAccountsModeBlockResponse = Omit<
  VersionedBlockResponse,
  'transactions'
> & {
  transactions: Array<
    Overwrite<
      TransactionForAccounts<0>,
      {
        transaction: Pick<
          VersionedTransactionResponse['transaction'],
          'signatures'
        > & {
          accountKeys: ParsedMessageAccount[];
        };
        meta: AccountsModeBlockResponseTransactionMeta | null;
        version?: TransactionVersion;
      }
    >
  >;
};

/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `none`
 */
export type VersionedNoneModeBlockResponse = Omit<
  VersionedBlockResponse,
  'transactions'
>;

/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `signatures`
 */
export type VersionedSignaturesModeBlockResponse = Omit<
  VersionedBlockResponse,
  'transactions'
> & {
  signatures: Array<string>;
};

/**
 * A block subscription response where the `transactionDetails` mode is `accounts`.
 */
export type BlockSubscriptionAccountsModeBlockResponse = BlockResponseBase & {
  transactions: Array<
    Overwrite<
      TransactionForAccounts<0>,
      {
        meta: BlockSubscriptionAccountsTransactionMeta | null;
        version?: TransactionVersion;
      }
    >
  >;
};

/**
 * A block subscription response where transactions are base58 encoded.
 */
export type BlockSubscriptionBase58BlockResponse = BlockResponseBase & {
  transactions: Array<
    Overwrite<
      TransactionForFullBase58<0>,
      {
        meta: BlockSubscriptionTransactionMeta | null;
        version?: TransactionVersion;
      }
    >
  >;
};

/**
 * A block subscription response where transactions are base64 encoded.
 */
export type BlockSubscriptionBase64BlockResponse = BlockResponseBase & {
  transactions: Array<
    Overwrite<
      TransactionForFullBase64<0>,
      {
        meta: BlockSubscriptionTransactionMeta | null;
        version?: TransactionVersion;
      }
    >
  >;
};

/**
 * A block subscription response where transactions are JSON encoded.
 */
export type BlockSubscriptionJsonBlockResponse = BlockResponseBase & {
  transactions: Array<
    Overwrite<
      TransactionForFullJson<0>,
      {
        meta: BlockSubscriptionTransactionMeta | null;
        version?: TransactionVersion;
      }
    >
  >;
};

/**
 * A block subscription response where transactions are JSON parsed.
 */
export type BlockSubscriptionJsonParsedBlockResponse = BlockResponseBase & {
  transactions: Array<
    Overwrite<
      TransactionForFullJsonParsed<0>,
      {
        meta: BlockSubscriptionParsedTransactionMeta | null;
        version?: TransactionVersion;
      }
    >
  >;
};

/**
 * A confirmed block on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0.
 */
export type ConfirmedBlock = {
  /** Blockhash of this block */
  blockhash: Blockhash;
  /** Blockhash of this block's parent */
  previousBlockhash: Blockhash;
  /** Slot index of this block's parent */
  parentSlot: bigint;
  /** Vector of transactions and status metas */
  transactions: Array<{
    transaction: Transaction;
    meta: ConfirmedTransactionMeta | null;
  }>;
  /** Vector of block rewards */
  rewards?: Array<{
    pubkey: string;
    lamports: bigint;
    postBalance: bigint | null;
    rewardType: string | null;
    commission?: number | null;
  }>;
  /** The unix timestamp of when the block was processed */
  blockTime: bigint | null;
};

/**
 * A Block on the ledger with signatures only
 */
export type BlockSignatures = {
  /** Blockhash of this block */
  blockhash: Blockhash;
  /** Blockhash of this block's parent */
  previousBlockhash: Blockhash;
  /** Slot index of this block's parent */
  parentSlot: bigint;
  /** Vector of signatures */
  signatures: Array<string>;
  /** The unix timestamp of when the block was processed */
  blockTime: bigint | null;
  /** The number of blocks beneath this block */
  blockHeight: bigint | null;
};

/**
 * Amount of stake committed to a block at each depth.
 */
export type BlockCommitment = {
  /**
   * Amount of cluster stake in lamports that has voted on the block at each lockout depth.
   */
  commitment: Array<bigint> | null;
  /** Total active stake, in lamports, for the current epoch. */
  totalStake: bigint;
};

/**
 * recent block production information
 */
export type BlockProduction = ReturnType<
  GetBlockProductionApi['getBlockProduction']
>['value'];

export type GetBlockProductionConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
  /** Slot range to return block production for. If parameter not provided, defaults to current epoch. */
  range?: {
    /** first slot to return block production information for (inclusive) */
    firstSlot: number | bigint;
    /** last slot to return block production information for (inclusive). If parameter not provided, defaults to the highest slot */
    lastSlot?: number | bigint;
  };
  /** Only return results for this validator identity (base-58 encoded) */
  identity?: string;
};

type ConnectionHttpRequestInit = Readonly<{
  body: string;
  headers: Record<string, string>;
  method: 'POST';
  signal?: AbortSignal;
}>;

type ConnectionHttpTransportFetch = (
  url: string,
  requestInfo: ConnectionHttpRequestInit,
) => Promise<Response>;

function createConnectionHttpTransport(
  url: string,
  config: Readonly<{
    fetch: ConnectionHttpTransportFetch;
    headers?: HttpHeaders;
  }>,
): RpcTransport {
  const normalizedHeaders: Record<string, string> = {
    'solana-client': `js/${getRuntimeVersion() ?? 'UNKNOWN'}`,
  };
  if (config.headers != null) {
    for (const headerName in config.headers) {
      normalizedHeaders[headerName.toLowerCase()] = config.headers[headerName];
    }
  }

  return async <TResponse>({
    payload,
    signal,
  }: Readonly<{
    payload: unknown;
    signal?: AbortSignal;
  }>) => {
    const body = stringifyJsonWithBigInts(payload);
    const requestInfo: ConnectionHttpRequestInit = {
      body,
      headers: {
        ...normalizedHeaders,
        accept: 'application/json',
        'content-length': body.length.toString(),
        'content-type': 'application/json; charset=utf-8',
      },
      method: 'POST',
      signal,
    };
    const response = await config.fetch(url, requestInfo);

    if (!response.ok) {
      throw new SolanaError(SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR, {
        headers: response.headers,
        message: response.statusText,
        statusCode: response.status,
      });
    }

    const rawResponse = await response.text();
    return (
      rawResponse.length === 0 ? null : parseJsonWithBigInts(rawResponse)
    ) as TResponse;
  };
}

function createRpcTransport(
  url: string,
  config: RpcTransportConfig = {},
): RpcTransport {
  const {disableRetryOnRateLimit, fetch, fetchMiddleware, httpHeaders} = config;
  const transport = createFetchRpcTransport(url, {
    fetch,
    fetchMiddleware,
    httpHeaders,
  });

  return async <TResponse>({
    payload,
    signal,
  }: Readonly<{
    payload: unknown;
    signal?: AbortSignal;
  }>) => {
    let too_many_requests_retries = 5;
    let waitTime = 500;
    for (;;) {
      try {
        return (await transport({payload, signal})) as TResponse;
      } catch (error) {
        if (
          disableRetryOnRateLimit === true ||
          !isSolanaError(error, SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR) ||
          error.context.statusCode !== 429
        ) {
          throw error;
        }

        too_many_requests_retries -= 1;
        if (too_many_requests_retries === 0) {
          throw error;
        }
      }

      console.error(
        `Server responded with 429 Too Many Requests.  Retrying after ${waitTime}ms delay...`,
      );
      await sleep(waitTime);
      waitTime *= 2;
    }
  };
}

function createFetchRpcTransport(
  url: string,
  config: Pick<ConnectionConfig, 'fetch' | 'fetchMiddleware' | 'httpHeaders'>,
): RpcTransport {
  const {fetch: customFetch, fetchMiddleware, httpHeaders} = config;
  const fetch = (customFetch ??
    globalThis.fetch) as ConnectionHttpTransportFetch;
  const callFetch =
    fetchMiddleware == null
      ? async (requestUrl: string, options: ConnectionHttpRequestInit) =>
          await fetch(requestUrl, options)
      : async (requestUrl: string, options: ConnectionHttpRequestInit) => {
          const [modifiedUrl, modifiedOptions] = await new Promise<
            [string, ConnectionHttpRequestInit]
          >((resolve, reject) => {
            try {
              fetchMiddleware(requestUrl, options, (nextUrl, nextOptions) =>
                resolve([nextUrl, nextOptions as ConnectionHttpRequestInit]),
              );
            } catch (error) {
              reject(error);
            }
          });
          return await fetch(modifiedUrl, modifiedOptions);
        };

  return createConnectionHttpTransport(url, {
    fetch: callFetch,
    headers: httpHeaders,
  });
}

function createKitRpcClient(url: string, config: RpcTransportConfig) {
  const typedTransport = createRpcTransport(url, config);
  return {
    typedRpc: createRpc({
      api: createSolanaRpcApi({
        ...DEFAULT_RPC_CONFIG,
        // Match Kit's client-side default commitment when unspecified.
        defaultCommitment: 'confirmed',
      }),
      transport: typedTransport,
    }),
  };
}

function isJsonRpcErrorLike(value: unknown): value is JsonRpcErrorLike {
  return (
    !!value &&
    typeof value === 'object' &&
    'code' in value &&
    typeof (value as {message?: unknown}).message === 'string'
  );
}

function throwSolanaRpcErrorIfNeeded(error: unknown, context: string): never {
  if (isJsonRpcErrorLike(error)) {
    throw new SolanaJSONRPCError(error, context);
  }
  throw error;
}

function extractSendTransactionErrorDetails(
  error: unknown,
): {logs?: string[]; transactionMessage: string} | null {
  if (
    isSolanaError(
      error,
      SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
    )
  ) {
    const logs =
      error.context.logs == null
        ? undefined
        : error.context.logs.filter(
            (log): log is string => typeof log === 'string',
          );
    const transactionMessage =
      logs?.at(-1) ??
      (error.cause instanceof Error ? error.cause.message : undefined) ??
      error.message;

    return {logs, transactionMessage};
  }

  if (!isJsonRpcErrorLike(error)) {
    return null;
  }

  let logs = undefined;
  if ('data' in error && isRecord(error.data)) {
    const maybeLogs = error.data.logs;
    if (
      Array.isArray(maybeLogs) &&
      maybeLogs.every(log => typeof log === 'string')
    ) {
      logs = maybeLogs;
    }
  }

  return {
    logs,
    transactionMessage: error.message,
  };
}

/**
 * Supply
 */
type GetSupplyKitResult = ReturnType<GetSupplyApi['getSupply']>;

export type Supply = Overwrite<
  GetSupplyKitResult['value'],
  {nonCirculatingAccounts: Array<Address>}
>;

type GetSupplyResult = Overwrite<
  GetSupplyKitResult,
  {
    value: Supply;
  }
>;

/**
 * Token amount object which returns a token amount in different formats
 * for various client use cases.
 */
export type TokenAmount = {
  /** Raw amount of tokens as string ignoring decimals */
  amount: string;
  /** Number of decimals configured for token's mint */
  decimals: number;
  /** Token amount as float, accounts for decimals */
  uiAmount: number | null;
  /** Token amount as string, accounts for decimals */
  uiAmountString?: string;
};

/**
 * Token address and balance.
 */
export type TokenAccountBalancePair = {
  /** Address of the token account */
  address: Address;
  /** Raw amount of tokens as string ignoring decimals */
  amount: string;
  /** Number of decimals configured for token's mint */
  decimals: number;
  /** Token amount as float, accounts for decimals */
  uiAmount: number | null;
  /** Token amount as string, accounts for decimals */
  uiAmountString?: string;
};

type GetTokenLargestAccountsKitResult = ReturnType<
  GetTokenLargestAccountsApi['getTokenLargestAccounts']
>;

type GetLargestAccountsKitResult = ReturnType<
  GetLargestAccountsApi['getLargestAccounts']
>;

type GetTokenLargestAccountsWithPublicKeys = Overwrite<
  GetTokenLargestAccountsKitResult,
  {
    value: ReadonlyArray<
      Overwrite<
        GetTokenLargestAccountsKitResult['value'][number],
        {address: Address}
      >
    >;
  }
>;

type GetLargestAccountsWithPublicKeys = Overwrite<
  GetLargestAccountsKitResult,
  {
    value: ReadonlyArray<
      Overwrite<
        GetLargestAccountsKitResult['value'][number],
        {address: Address}
      >
    >;
  }
>;

/**
 * Pair of an account address and its balance
 */
export type AccountBalancePair = {
  readonly address: Address;
  readonly lamports: bigint;
};

type KitRawBase64AccountInfo = AccountInfoBase &
  AccountInfoWithBase64EncodedData;

type SimulatedAccountInfoLike = Readonly<
  KitRawBase64AccountInfo & {rentEpoch?: unknown}
>;

type SimulatedReturnDataLike = Readonly<{
  data: readonly [Base64EncodedBytes, TransactionReturnDataEncoding];
  programId: string;
}>;

type RpcBlockRewardLike = Overwrite<
  Reward,
  {
    commission?: number | null;
    lamports: number | bigint;
    postBalance: number | bigint | null;
    pubkey: string;
    rewardType: string | null;
  }
>;

type RpcBlockLike = Overwrite<
  Readonly<{
    blockhash: RpcBlockhash;
    previousBlockhash: RpcBlockhash;
    parentSlot: Slot;
    blockTime: UnixTimestamp | null;
    blockHeight: bigint | null;
    rewards?: readonly Reward[];
  }>,
  {
    blockhash: Blockhash;
    previousBlockhash: Blockhash;
    parentSlot: number | bigint;
    blockTime: number | bigint | null;
    blockHeight: number | bigint | null;
    rewards?: readonly RpcBlockRewardLike[];
  }
>;

type TypedAccountsModeBlockSource = RpcBlockLike & {
  transactions: readonly (
    | TransactionForAccounts<void>
    | TransactionForAccounts<0>
  )[];
};

type TypedFullBlockSource = RpcBlockLike & {
  transactions: readonly (
    | TransactionForFullJson<void>
    | TransactionForFullJson<0>
  )[];
};

type TypedParsedBlockSource = RpcBlockLike & {
  transactions: readonly (
    | TransactionForFullJsonParsed<void>
    | TransactionForFullJsonParsed<0>
  )[];
};

type TypedSimulateTransactionResponse = RpcResponseAndContext<
  Readonly<{
    err: TransactionError | null;
    logs: string[] | null;
    accounts?: readonly (SimulatedAccountInfoLike | null)[] | null;
    loadedAccountsDataSize?: number;
    replacementBlockhash?: unknown;
    unitsConsumed?: bigint;
    returnData?: SimulatedReturnDataLike | null;
    innerInstructions?: unknown;
  }>
>;

type TypedTransactionSource = Readonly<{
  blockTime: number | bigint | null;
  meta:
    | TransactionForFullJson<void>['meta']
    | TransactionForFullJson<0>['meta'];
  slot: number | bigint;
  transaction:
    | TransactionForFullJson<void>['transaction']
    | TransactionForFullJson<0>['transaction'];
  version?: TransactionVersion;
}>;

type TypedParsedTransactionSource = Readonly<{
  blockTime: number | bigint | null;
  meta:
    | TransactionForFullJsonParsed<void>['meta']
    | TransactionForFullJsonParsed<0>['meta'];
  slot: number | bigint;
  transaction:
    | TransactionForFullJsonParsed<void>['transaction']
    | TransactionForFullJsonParsed<0>['transaction'];
  version?: TransactionVersion;
}>;

type TypedRpcClient = ReturnType<typeof createKitRpcClient>['typedRpc'];

type TypedBlockMappers<
  TAccountsBlockResult,
  TFullBlockSource extends TypedFullBlockSource | TypedParsedBlockSource,
  TFullBlockResult,
> = Readonly<{
  mapAccountsBlock: (
    block: TypedAccountsModeBlockSource,
  ) => TAccountsBlockResult;
  fullConfig: TypedFullBlockConfig | TypedParsedBlockConfig | undefined;
  mapFullBlock: (block: TFullBlockSource) => TFullBlockResult;
}>;

async function fetchTypedBlockWithMappers<
  TAccountsBlockResult,
  TFullBlockSource extends TypedFullBlockSource | TypedParsedBlockSource,
  TFullBlockResult,
>(
  typedRpc: TypedRpcClient,
  slot: Slot,
  finality: Finality | undefined,
  config: GetBlockConfig | GetVersionedBlockConfig | undefined,
  args: TypedBlockMappers<
    TAccountsBlockResult,
    TFullBlockSource,
    TFullBlockResult
  >,
): Promise<
  | VersionedNoneModeBlockResponse
  | VersionedSignaturesModeBlockResponse
  | TAccountsBlockResult
  | TFullBlockResult
  | null
> {
  switch (config?.transactionDetails) {
    case 'none': {
      const result =
        await sendTypedBlockRequest<VersionedNoneModeBlockResponse>(
          typedRpc,
          slot,
          getTypedBlockWithoutTransactionsConfig('none', finality, config),
        );
      return result ? mapBlockBase(result) : null;
    }
    case 'signatures': {
      const result =
        await sendTypedBlockRequest<VersionedSignaturesModeBlockResponse>(
          typedRpc,
          slot,
          getTypedBlockWithoutTransactionsConfig(
            'signatures',
            finality,
            config,
          ),
        );
      return result
        ? {
            ...mapBlockBase(result),
            signatures: [...result.signatures],
          }
        : null;
    }
    case 'accounts': {
      const accountsConfig = buildTypedAccountsBlockConfig(
        finality,
        config,
        args.fullConfig != null && 'encoding' in args.fullConfig,
      );
      const result = await sendTypedBlockRequest<TypedAccountsModeBlockSource>(
        typedRpc,
        slot,
        accountsConfig,
      );
      return result ? args.mapAccountsBlock(result) : null;
    }
    default: {
      const result = await sendTypedBlockRequest<TFullBlockSource>(
        typedRpc,
        slot,
        args.fullConfig,
      );
      return result ? args.mapFullBlock(result) : null;
    }
  }
}

function sendTypedBlockRequest<TResponse>(
  typedRpc: TypedRpcClient,
  slot: Slot,
  config?: TypedBlockRequestConfig,
): Promise<TResponse | null> {
  const getBlock = typedRpc.getBlock as TypedRpcRequestMethod<
    [slot: Slot, config?: TypedBlockRequestConfig],
    TResponse | null
  >;
  return getBlock(slot, config).send();
}

function sendTypedTransactionRequest<TResponse>(
  typedRpc: TypedRpcClient,
  signature: string,
  config?: TypedTransactionConfig | TypedParsedTransactionConfig,
): Promise<TResponse | null> {
  const getTransaction = typedRpc.getTransaction as TypedRpcRequestMethod<
    [
      signature: Signature,
      config?: TypedTransactionConfig | TypedParsedTransactionConfig,
    ],
    TResponse | null
  >;
  return getTransaction(signature as Signature, config).send();
}

async function fetchBlockSignaturesFromRpc(
  typedRpc: TypedRpcClient,
  slot: number | bigint,
  commitment: Finality | undefined,
  notFoundMessage: string,
  errorContext: string,
): Promise<BlockSignatures> {
  try {
    const result = await typedRpc
      .getBlock(coerceNumericToBigInt(slot, 'slot'), {
        ...(commitment != null ? {commitment} : null),
        transactionDetails: 'signatures',
        rewards: false,
      })
      .send();

    if (!result) {
      throw new Error(notFoundMessage);
    }

    return {
      ...result,
      signatures: [...result.signatures],
    };
  } catch (error) {
    if (error instanceof Error && error.message === notFoundMessage) {
      throw error;
    }
    throwSolanaRpcErrorIfNeeded(error, errorContext);
  }
}

async function fetchTransactionsBySignature<TResponse>(
  signatures: TransactionSignature[],
  config: GetVersionedTransactionConfig | undefined,
  fetcher: (
    signature: TransactionSignature,
    config: GetVersionedTransactionConfig | undefined,
  ) => Promise<TResponse>,
): Promise<TResponse[]> {
  return await Promise.all(
    signatures.map(signature => fetcher(signature, config)),
  );
}

function confirmationStatusSatisfiesCommitment(
  commitment: TransactionConfirmationStatus | undefined,
  confirmationStatus: TransactionConfirmationStatus | null | undefined,
  allowMissingConfirmationStatus = true,
): boolean {
  switch (commitment) {
    case undefined:
      return true;
    case 'processed':
      return allowMissingConfirmationStatus || confirmationStatus != null;
    case 'confirmed':
      return (
        confirmationStatus === 'confirmed' || confirmationStatus === 'finalized'
      );
    case 'finalized':
      return confirmationStatus === 'finalized';
    default:
      // Exhaustive switch.

      ((_: never) => {})(commitment);
      return false;
  }
}

function getLegacyTransactionConfirmationTimeoutMs(
  initialTimeoutMs: number | undefined,
  commitment?: Commitment,
): number {
  switch (commitment) {
    case 'processed':
    case 'confirmed':
      return initialTimeoutMs || 30 * 1000;
    case 'finalized':
    case undefined:
      return initialTimeoutMs || 60 * 1000;
    default:
      // Exhaustive switch.

      ((_: never) => {})(commitment);
      return initialTimeoutMs || 60 * 1000;
  }
}

/**
 * Parsed account data
 */
export type ParsedAccountData = {
  /** Name of the program that owns this account */
  program: string;
  /** Parsed account data */
  parsed: any;
  /** Space used by account data */
  space: bigint;
};

/**
 * Data slice argument for getProgramAccounts
 */
export type DataSlice = {
  /** offset of data slice */
  offset: number;
  /** length of data slice */
  length: number;
};

/**
 * Memory comparison filter for getProgramAccounts
 */
export type MemcmpFilter = {
  memcmp: {
    /** offset into program account data to start comparison */
    offset: number | bigint;
  } & (
    | {
        encoding?: 'base58'; // Base-58 is the default when not supplied.
        /** data to match, as base-58 encoded string and limited to less than 129 bytes */
        bytes: string;
      }
    | {
        encoding: 'base64';
        /** data to match, as base-64 encoded string */
        bytes: string;
      }
  );
};

/**
 * Data size comparison filter for getProgramAccounts
 */
export type DataSizeFilter = {
  /** Size of data for program account data length comparison */
  dataSize: number | bigint;
};

/**
 * A filter object for getProgramAccounts
 */
export type GetProgramAccountsFilter = MemcmpFilter | DataSizeFilter;

/**
 * Configuration object for getProgramAccounts requests
 */
export type GetProgramAccountsConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
  /** Optional encoding for account data (default base64)
   * To use "jsonParsed" encoding, please refer to `getParsedProgramAccounts` in connection.ts
   * */
  encoding?: 'base64';
  /** Optional data slice to limit the returned account data */
  dataSlice?: DataSlice;
  /** Optional array of filters to apply to accounts */
  filters?: GetProgramAccountsFilter[];
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
  /** wrap the result in an RpcResponse JSON object */
  withContext?: boolean;
};

export type GetProgramAccountsResponse = readonly Readonly<{
  account: AccountInfoWithSpace<Uint8Array>;
  /** the account Pubkey as base-58 encoded string */
  pubkey: Address;
}>[];

/**
 * Configuration object for getParsedProgramAccounts
 */
export type GetParsedProgramAccountsConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
  /** Optional array of filters to apply to accounts */
  filters?: GetProgramAccountsFilter[];
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for getMultipleAccounts
 */
export type GetMultipleAccountsConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
  /** Optional data slice to limit the returned account data */
  dataSlice?: DataSlice;
};

/**
 * Configuration object for `getTokenAccountsByOwner`
 */
export type GetTokenAccountsByOwnerConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
  /** Optional encoding for account data (default base64) */
  encoding?: 'base64';
  /** Optional data slice to limit the returned account data */
  dataSlice?: DataSlice;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for `getTokenAccountsByDelegate`
 */
export type GetTokenAccountsByDelegateConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
  /** Optional encoding for account data (default base64) */
  encoding?: 'base64';
  /** Optional data slice to limit the returned account data */
  dataSlice?: DataSlice;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for `getTransactionCount`
 */
export type GetTransactionCountConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for `getBlocks` and `getBlocksWithLimit`
 */
export type GetBlocksConfig = {
  /** Optional finality level */
  commitment?: Finality;
};

/**
 * Configuration object for `getTokenSupply`
 */
export type GetTokenSupplyConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
};

/**
 * Configuration object for `getTokenAccountBalance`
 */
export type GetTokenAccountBalanceConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
};

/**
 * Configuration object for `getTokenLargestAccounts`
 */
export type GetTokenLargestAccountsConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
};

/**
 * Configuration object for `getInflationGovernor`
 */
export type GetInflationGovernorConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
};

/**
 * Configuration object for `getVoteAccounts`
 */
export type GetVoteAccountsConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
  /** Return only results for this validator vote account */
  votePubkey?: string;
  /** Keep unstaked delinquent validators */
  keepUnstakedDelinquents?: boolean;
  /** Custom delinquent slot distance */
  delinquentSlotDistance?: number | bigint;
};

/**
 * Configuration object for `getMinimumBalanceForRentExemption`
 */
export type GetMinimumBalanceForRentExemptionConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
};

/**
 * Configuration object for `getNonce`
 */
export type GetNonceConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

/**
 * Configuration object for `getNonceAndContext`
 */
export type GetNonceAndContextConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number | bigint;
};

type AnySignatureSubscriptionCallback =
  | SignatureResultCallback
  | SignatureSubscriptionCallback;
type AnyAccountChangeCallback =
  | AccountChangeCallback
  | Base64ZstdAccountChangeCallback
  | ParsedAccountChangeCallback;
type AnyProgramAccountChangeCallback =
  | ProgramAccountChangeCallback
  | Base64ZstdProgramAccountChangeCallback
  | ParsedProgramAccountChangeCallback;

type AnyBlockSubscriptionCallback =
  | BlockSubscriptionCallback
  | BlockSubscriptionAccountsCallback
  | BlockSubscriptionNoneCallback
  | BlockSubscriptionSignaturesCallback
  | BlockSubscriptionBase58Callback
  | BlockSubscriptionBase64Callback
  | BlockSubscriptionJsonParsedCallback
  | BlockSubscriptionJsonCallback;

/**
 * Transaction confirmation status
 * <pre>
 *   'processed': Transaction landed in a block which has reached 1 confirmation by the connected node
 *   'confirmed': Transaction landed in a block which has reached 1 confirmation by the cluster
 *   'finalized': Transaction landed in a block which has been finalized by the cluster
 * </pre>
 */
export type TransactionConfirmationStatus =
  | 'processed'
  | 'confirmed'
  | 'finalized';

/**
 * Signature status
 */
export type SignatureStatus = {
  /** when the transaction was processed */
  slot: bigint;
  /** the number of blocks that have been confirmed and voted on in the fork containing `slot` */
  confirmations: bigint | null;
  /** transaction error, if any */
  err: TransactionError | null;
  /** cluster confirmation status, if data available. Possible responses: `processed`, `confirmed`, `finalized` */
  confirmationStatus: TransactionConfirmationStatus | null;
};

/**
 * A confirmed signature with its status
 */
export type ConfirmedSignatureInfo = Readonly<
  Overwrite<GetSignaturesForAddressKitResult[number], {signature: string}>
>;

/**
 * An object defining headers to be passed to the RPC server
 */
export type HttpHeaders = {
  [header: string]: string;
} & {
  // Prohibited headers; for internal use only.
  'solana-client'?: never;
};

/**
 * A callback used to augment the outgoing HTTP request.
 */
export type FetchMiddleware = (
  url: string,
  options: any,
  fetch: (modifiedUrl: string, modifiedOptions: any) => void,
) => void;

/**
 * Configuration for instantiating a Connection
 */
export type ConnectionConfig = {
  /** Optional commitment level */
  commitment?: Commitment;
  /** Optional endpoint URL to the fullnode JSON RPC PubSub WebSocket Endpoint */
  wsEndpoint?: string;
  /** Optional subscriptions runtime configuration */
  subscriptions?: Readonly<{
    /** Optional websocket channel pool configuration */
    channelConfig?: SubscriptionChannelConfig;
  }>;
  /** Optional HTTP headers object */
  httpHeaders?: HttpHeaders;
  /** Optional custom fetch function */
  fetch?: typeof globalThis.fetch;
  /** Optional fetch middleware callback */
  fetchMiddleware?: FetchMiddleware;
  /** Optional Disable retrying calls when server responds with HTTP 429 (Too Many Requests) */
  disableRetryOnRateLimit?: boolean;
  /** time to allow for the server to initially process a transaction (in milliseconds) */
  confirmTransactionInitialTimeout?: number;
};

/**
 * Configuration used to construct an HTTP JSON-RPC transport.
 */
type RpcTransportConfig = Readonly<
  Pick<
    ConnectionConfig,
    'disableRetryOnRateLimit' | 'fetch' | 'fetchMiddleware' | 'httpHeaders'
  >
>;

/**
 * A connection to a fullnode JSON RPC endpoint
 */
export class Connection {
  /** @internal */ _commitment?: Commitment;
  /** @internal */ _confirmTransactionInitialTimeout?: number;
  /** @internal */ _rpcEndpoint: string;
  /** @internal */ _rpcHttpHeaders?: HttpHeaders;
  /** @internal */ _rpcWsEndpoint: string;
  /** @internal */ _typedRpc: ReturnType<typeof createKitRpcClient>['typedRpc'];
  /** @internal */ private _subscriptionsRuntime: ConnectionSubscriptionsRuntime;
  /** @internal */ private _subscriptionController: ConnectionSubscriptionsController<StoredBlockSubscriptionDispatchConfig>;
  /** @internal */ private readonly _subscriptionRegistry =
    new ConnectionSubscriptionRegistry<StoredBlockSubscriptionDispatchConfig>();

  /** @internal */ _disableBlockhashCaching: boolean = false;
  /** @internal */ _pollingBlockhash: boolean = false;
  /** @internal */ _blockhashInfo: {
    latestBlockhash: BlockhashWithExpiryBlockHeight | null;
    lastFetch: number;
    simulatedSignatures: Array<string>;
    transactionSignatures: Array<string>;
  } = {
    latestBlockhash: null,
    lastFetch: 0,
    transactionSignatures: [],
    simulatedSignatures: [],
  };

  /**
   * Establish a JSON RPC connection
   *
   * @param endpoint URL to the fullnode JSON RPC endpoint
   * @param commitmentOrConfig optional default commitment level or optional ConnectionConfig configuration object
   */
  constructor(
    endpoint: string,
    commitmentOrConfig?: Commitment | ConnectionConfig,
  );

  /**
   * Establish a JSON RPC connection
   *
   * @param endpoint URL to the fullnode JSON RPC endpoint
   * @param commitmentOrConfig optional default commitment level or optional ConnectionConfig configuration object
   */
  constructor(
    endpoint: string,
    commitmentOrConfig?: Commitment | ConnectionConfig,
  ) {
    let customFetch;
    let fetchMiddleware;
    let wsEndpoint;
    let httpHeaders;
    let disableRetryOnRateLimit;
    let subscriptionChannelConfig;
    if (commitmentOrConfig && typeof commitmentOrConfig === 'string') {
      this._commitment = commitmentOrConfig;
    } else if (commitmentOrConfig) {
      this._commitment = commitmentOrConfig.commitment;
      this._confirmTransactionInitialTimeout =
        commitmentOrConfig.confirmTransactionInitialTimeout;
      wsEndpoint = commitmentOrConfig.wsEndpoint;
      subscriptionChannelConfig =
        commitmentOrConfig.subscriptions?.channelConfig;
      customFetch = commitmentOrConfig.fetch;
      fetchMiddleware = commitmentOrConfig.fetchMiddleware;
      httpHeaders = commitmentOrConfig.httpHeaders;
      disableRetryOnRateLimit = commitmentOrConfig.disableRetryOnRateLimit;
    }

    this._rpcEndpoint = assertEndpointUrl(endpoint);
    this._rpcHttpHeaders = httpHeaders;
    this._rpcWsEndpoint = wsEndpoint || makeWebsocketUrl(endpoint);

    const rpcTransportConfig: RpcTransportConfig = Object.freeze({
      disableRetryOnRateLimit,
      fetch: customFetch,
      fetchMiddleware,
      httpHeaders,
    });

    const {typedRpc} = createKitRpcClient(endpoint, rpcTransportConfig);
    this._typedRpc = typedRpc;
    const subscriptionController = new ConnectionSubscriptionsController(
      this._subscriptionRegistry,
      () => this._subscriptionsRuntime,
      spec => fastStableStringify(spec),
    );
    this._subscriptionController = subscriptionController;
    const dispatchSubscriptionNotification: ConnectionSubscriptionsNotificationDispatcher =
      notificationEvent => {
        subscriptionController.handleNotification(notificationEvent);
      };
    this._subscriptionsRuntime = new KitSubscriptionRuntime(
      this._rpcWsEndpoint,
      this._subscriptionRegistry,
      {
        onConnected: () => {
          void subscriptionController.updateSubscriptions();
        },
        onDisconnected: code => {
          subscriptionController.handleRuntimeDisconnected(code);
        },
      },
      dispatchSubscriptionNotification,
      subscriptionChannelConfig,
    );
  }

  /** @internal */
  get _subscriptionChannel(): SubscriptionChannel | null {
    return this._subscriptionsRuntime.channel;
  }

  /**
   * The default commitment used for requests
   */
  get commitment(): Commitment | undefined {
    return this._commitment;
  }

  /**
   * The RPC endpoint
   */
  get rpcEndpoint(): string {
    return this._rpcEndpoint;
  }

  /**
   * The HTTP headers used by this connection for JSON-RPC requests.
   */
  get rpcHttpHeaders(): HttpHeaders | undefined {
    return this._rpcHttpHeaders;
  }

  /**
   * Fetch the balance for the specified public key, return with context
   */
  async getBalanceAndContext(
    publicKey: Address,
    commitmentOrConfig?: Commitment | GetBalanceConfig,
  ): Promise<GetBalanceKitResult> {
    const {commitment, config} =
      extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = this._resolveCommitment(commitment);
    const minContextSlot = coerceOptionalNumericToBigInt(
      config?.minContextSlot,
      'minContextSlot',
    );

    try {
      return await (
        rpcCommitment == null && minContextSlot == null
          ? this._typedRpc.getBalance(toKitAddress(publicKey))
          : this._typedRpc.getBalance(toKitAddress(publicKey), {
              ...(rpcCommitment != null ? {commitment: rpcCommitment} : null),
              ...(minContextSlot != null ? {minContextSlot} : null),
            })
      ).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        `failed to get balance for ${publicKey.toBase58()}`,
      );
    }
  }

  /**
   * Fetch the balance for the specified public key
   */
  async getBalance(
    publicKey: Address,
    commitmentOrConfig?: Commitment | GetBalanceConfig,
  ): Promise<GetBalanceKitResult['value']> {
    return (await this.getBalanceAndContext(publicKey, commitmentOrConfig))
      .value;
  }

  /**
   * Fetch the estimated production time of a block
   */
  async getBlockTime(
    slot: number | bigint,
  ): Promise<ReturnType<GetBlockTimeApi['getBlockTime']>> {
    try {
      return await this._typedRpc
        .getBlockTime(coerceNumericToBigInt(slot, 'slot'))
        .send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        `failed to get block time for slot ${slot}`,
      );
    }
  }

  /**
   * Fetch the lowest slot that the node has information about in its ledger.
   * This value may increase over time if the node is configured to purge older ledger data
   */
  async getMinimumLedgerSlot(): Promise<
    ReturnType<MinimumLedgerSlotApi['minimumLedgerSlot']>
  > {
    try {
      return await this._typedRpc.minimumLedgerSlot().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get minimum ledger slot');
    }
  }

  /**
   * Fetch the slot of the lowest confirmed block that has not been purged from the ledger
   */
  async getFirstAvailableBlock(): Promise<
    ReturnType<GetFirstAvailableBlockApi['getFirstAvailableBlock']>
  > {
    try {
      return await this._typedRpc.getFirstAvailableBlock().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get first available block');
    }
  }

  /**
   * Fetch information about the current supply
   */
  async getSupply(
    config?: GetSupplyConfig | Commitment,
  ): Promise<GetSupplyResult> {
    const {commitment, config: rawConfig} = extractCommitmentFromConfig(config);
    const rpcCommitment = this._resolveCommitment(commitment);
    try {
      const response = await (
        rawConfig?.excludeNonCirculatingAccountsList === true
          ? this._typedRpc.getSupply({
              ...(rpcCommitment != null ? {commitment: rpcCommitment} : null),
              excludeNonCirculatingAccountsList: true,
            })
          : rpcCommitment != null
            ? this._typedRpc.getSupply({commitment: rpcCommitment})
            : this._typedRpc.getSupply()
      ).send();

      return {
        ...response,
        value: {
          ...response.value,
          nonCirculatingAccounts: response.value.nonCirculatingAccounts.map(
            address => new Address(address),
          ),
        },
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get supply');
    }
  }

  /**
   * Fetch the current supply of a token mint
   */
  async getTokenSupply(
    tokenMintAddress: Address,
    commitmentOrConfig?: Commitment | GetTokenSupplyConfig,
  ): Promise<ReturnType<GetTokenSupplyApi['getTokenSupply']>> {
    const {commitment} = extractCommitmentFromConfig(commitmentOrConfig);
    const typedMintAddress = toKitAddress(tokenMintAddress);
    const rpcCommitment = this._resolveCommitment(commitment);
    try {
      return await (
        rpcCommitment == null
          ? this._typedRpc.getTokenSupply(typedMintAddress)
          : this._typedRpc.getTokenSupply(typedMintAddress, {
              commitment: rpcCommitment,
            })
      ).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get token supply');
    }
  }

  /**
   * Fetch the current balance of a token account
   */
  async getTokenAccountBalance(
    tokenAddress: Address,
    commitmentOrConfig?: Commitment | GetTokenAccountBalanceConfig,
  ): Promise<ReturnType<GetTokenAccountBalanceApi['getTokenAccountBalance']>> {
    const {commitment} = extractCommitmentFromConfig(commitmentOrConfig);
    const typedTokenAddress = toKitAddress(tokenAddress);
    const rpcCommitment = this._resolveCommitment(commitment);
    try {
      return await (
        rpcCommitment == null
          ? this._typedRpc.getTokenAccountBalance(typedTokenAddress)
          : this._typedRpc.getTokenAccountBalance(typedTokenAddress, {
              commitment: rpcCommitment,
            })
      ).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get token account balance');
    }
  }

  /**
   * Fetch all the token accounts owned by the specified account
   *
   * @return {Promise<RpcResponseAndContext<GetProgramAccountsResponse>}
   */
  async getTokenAccountsByOwner(
    ownerAddress: Address,
    filter: TokenAccountsFilter,
    commitmentOrConfig?: Commitment | GetTokenAccountsByOwnerConfig,
  ): Promise<RpcResponseAndContext<GetProgramAccountsResponse>> {
    const {commitment, config} =
      extractCommitmentFromConfig(commitmentOrConfig);
    const typedFilter =
      'mint' in filter
        ? {mint: toKitAddress(filter.mint)}
        : {programId: toKitAddress(filter.programId)};
    const rpcCommitment = this._resolveCommitment(commitment);
    const minContextSlot = coerceOptionalNumericToBigInt(
      config?.minContextSlot,
      'minContextSlot',
    );

    try {
      const response = await this._typedRpc
        .getTokenAccountsByOwner(toKitAddress(ownerAddress), typedFilter, {
          commitment: rpcCommitment,
          dataSlice: config?.dataSlice,
          encoding: 'base64',
          minContextSlot,
        })
        .send();

      return {
        context: response.context,
        value: mapKeyedBase64AccountInfos(
          response.value,
          'Expected token account rentEpoch',
        ),
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        `failed to get token accounts owned by account ${ownerAddress.toBase58()}`,
      );
    }
  }

  /**
   * Fetch all the token accounts delegated to the specified account
   *
   * @return {Promise<RpcResponseAndContext<GetProgramAccountsResponse>}
   */
  async getTokenAccountsByDelegate(
    delegateAddress: Address,
    filter: TokenAccountsFilter,
    commitmentOrConfig?: Commitment | GetTokenAccountsByDelegateConfig,
  ): Promise<RpcResponseAndContext<GetProgramAccountsResponse>> {
    const {commitment, config} =
      extractCommitmentFromConfig(commitmentOrConfig);
    const typedFilter =
      'mint' in filter
        ? {mint: toKitAddress(filter.mint)}
        : {programId: toKitAddress(filter.programId)};
    const rpcCommitment = this._resolveCommitment(commitment);
    const minContextSlot = coerceOptionalNumericToBigInt(
      config?.minContextSlot,
      'minContextSlot',
    );

    try {
      const response = await this._typedRpc
        .getTokenAccountsByDelegate(
          toKitAddress(delegateAddress),
          typedFilter,
          {
            commitment: rpcCommitment,
            dataSlice: config?.dataSlice,
            encoding: 'base64',
            minContextSlot,
          },
        )
        .send();

      return {
        context: response.context,
        value: mapKeyedBase64AccountInfos(
          response.value,
          'Expected delegated token account rentEpoch',
        ),
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        `failed to get token accounts delegated to account ${delegateAddress.toBase58()}`,
      );
    }
  }

  /**
   * Fetch parsed token accounts owned by the specified account
   *
   * @return {Promise<RpcResponseAndContext<Array<{pubkey: Address, account: AccountInfo<ParsedAccountData>}>>>}
   */
  async getParsedTokenAccountsByOwner(
    ownerAddress: Address,
    filter: TokenAccountsFilter,
    commitment?: Commitment,
  ): Promise<
    RpcResponseAndContext<
      Array<{pubkey: Address; account: AccountInfoWithSpace<ParsedAccountData>}>
    >
  > {
    const typedFilter =
      'mint' in filter
        ? {mint: toKitAddress(filter.mint)}
        : {programId: toKitAddress(filter.programId)};
    const rpcCommitment = this._resolveCommitment(commitment);

    try {
      const response = await this._typedRpc
        .getTokenAccountsByOwner(toKitAddress(ownerAddress), typedFilter, {
          commitment: rpcCommitment,
          encoding: 'jsonParsed',
        })
        .send();

      return {
        context: response.context,
        value: mapKeyedParsedAccountInfos(
          response.value,
          'Expected token account rentEpoch',
        ),
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        `failed to get token accounts owned by account ${ownerAddress.toBase58()}`,
      );
    }
  }

  /**
   * Fetch the 20 largest accounts with their current balances
   */
  async getLargestAccounts(
    config?: GetLargestAccountsConfig,
  ): Promise<GetLargestAccountsWithPublicKeys> {
    const rpcCommitment = this._resolveCommitment(config?.commitment);
    const rpcConfig = {
      ...(config?.filter != null ? {filter: config.filter} : null),
      ...(rpcCommitment != null ? {commitment: rpcCommitment} : null),
    };
    try {
      const result = await (
        config?.filter != null || rpcCommitment != null
          ? this._typedRpc.getLargestAccounts(rpcConfig)
          : this._typedRpc.getLargestAccounts()
      ).send();

      return {
        ...result,
        context: result.context,
        value: result.value.map(account => ({
          ...account,
          address: new Address(account.address),
        })),
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get largest accounts');
    }
  }

  /**
   * Fetch the 20 largest token accounts with their current balances
   * for a given mint.
   */
  async getTokenLargestAccounts(
    mintAddress: Address,
    commitmentOrConfig?: Commitment | GetTokenLargestAccountsConfig,
  ): Promise<GetTokenLargestAccountsWithPublicKeys> {
    const {commitment} = extractCommitmentFromConfig(commitmentOrConfig);
    const typedMintAddress = toKitAddress(mintAddress);
    const rpcCommitment = this._resolveCommitment(commitment);
    try {
      const result = await (
        rpcCommitment == null
          ? this._typedRpc.getTokenLargestAccounts(typedMintAddress)
          : this._typedRpc.getTokenLargestAccounts(typedMintAddress, {
              commitment: rpcCommitment,
            })
      ).send();

      return {
        ...result,
        context: result.context,
        value: result.value.map(account => ({
          ...account,
          address: new Address(account.address),
        })),
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        'failed to get token largest accounts',
      );
    }
  }

  /**
   * Fetch all the account info for the specified public key, return with context
   */
  async getAccountInfoAndContext(
    publicKey: Address,
    commitmentOrConfig?: Commitment | GetAccountInfoConfig,
  ): Promise<RpcResponseAndContext<AccountInfoWithSpace<Uint8Array> | null>> {
    try {
      const {commitment, config} =
        extractCommitmentFromConfig(commitmentOrConfig);
      const typedPublicKey = toKitAddress(publicKey);
      const rpcCommitment = this._resolveCommitment(commitment);
      const minContextSlot = config?.minContextSlot;

      const response = await this._typedRpc
        .getAccountInfo(typedPublicKey, {
          commitment: rpcCommitment,
          dataSlice: config?.dataSlice,
          encoding: 'base64',
          minContextSlot: coerceOptionalNumericToBigInt(
            minContextSlot,
            'minContextSlot',
          ),
        })
        .send();

      return {
        context: response.context,
        value: mapBase64AccountInfo(
          response.value,
          'Expected raw account info rentEpoch',
        ),
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        `failed to get info about account ${publicKey.toBase58()}`,
      );
    }
  }

  /**
   * Fetch parsed account info for the specified public key
   */
  async getParsedAccountInfo(
    publicKey: Address,
    commitmentOrConfig?: Commitment | GetAccountInfoConfig,
  ): Promise<
    RpcResponseAndContext<AccountInfoWithSpace<
      Uint8Array | ParsedAccountData
    > | null>
  > {
    try {
      const {commitment, config} =
        extractCommitmentFromConfig(commitmentOrConfig);
      const typedPublicKey = toKitAddress(publicKey);
      const rpcCommitment = this._resolveCommitment(commitment);
      const minContextSlot = config?.minContextSlot;

      const response = await this._typedRpc
        .getAccountInfo(typedPublicKey, {
          commitment: rpcCommitment,
          encoding: 'jsonParsed',
          minContextSlot: coerceOptionalNumericToBigInt(
            minContextSlot,
            'minContextSlot',
          ),
        })
        .send();

      return {
        context: response.context,
        value: mapJsonParsedAccountInfo(
          response.value,
          'Expected parsed account info rentEpoch',
        ),
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        `failed to get info about account ${publicKey.toBase58()}`,
      );
    }
  }

  /**
   * Fetch all the account info for the specified public key
   */
  async getAccountInfo(
    publicKey: Address,
    commitmentOrConfig?: Commitment | GetAccountInfoConfig,
  ): Promise<AccountInfoWithSpace<Uint8Array> | null> {
    try {
      const {commitment, config} =
        extractCommitmentFromConfig(commitmentOrConfig);
      const typedPublicKey = toKitAddress(publicKey);
      const rpcCommitment = this._resolveCommitment(commitment);
      const minContextSlot = config?.minContextSlot;

      const response = await this._typedRpc
        .getAccountInfo(typedPublicKey, {
          commitment: rpcCommitment,
          dataSlice: config?.dataSlice,
          encoding: 'base64',
          minContextSlot: coerceOptionalNumericToBigInt(
            minContextSlot,
            'minContextSlot',
          ),
        })
        .send();

      if (response.value == null) {
        return null;
      }

      return mapBase64AccountInfo(
        response.value,
        'Expected raw account info rentEpoch',
      );
    } catch (e) {
      throw new Error(
        'failed to get info about account ' + publicKey.toBase58() + ': ' + e,
      );
    }
  }

  /**
   * Fetch all the account info for multiple accounts specified by an array of public keys, return with context
   */
  async getMultipleParsedAccounts(
    publicKeys: Address[],
    rawConfig?: GetMultipleAccountsConfig,
  ): Promise<
    RpcResponseAndContext<
      (AccountInfoWithSpace<Uint8Array | ParsedAccountData> | null)[]
    >
  > {
    try {
      const {commitment, config} = extractCommitmentFromConfig(rawConfig);
      const typedPublicKeys = publicKeys.map(key => toKitAddress(key));
      const rpcCommitment = this._resolveCommitment(commitment);
      const minContextSlot = config?.minContextSlot;

      const response = await this._typedRpc
        .getMultipleAccounts(typedPublicKeys, {
          commitment: rpcCommitment,
          encoding: 'jsonParsed',
          minContextSlot: coerceOptionalNumericToBigInt(
            minContextSlot,
            'minContextSlot',
          ),
        })
        .send();

      return {
        context: response.context,
        value: response.value.map(account =>
          mapJsonParsedAccountInfo(
            account,
            'Expected parsed account info rentEpoch',
          ),
        ),
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        `failed to get info for accounts ${publicKeys.map(key => key.toBase58())}`,
      );
    }
  }

  /**
   * Fetch all the account info for multiple accounts specified by an array of public keys, return with context
   */
  async getMultipleAccountsInfoAndContext(
    publicKeys: Address[],
    commitmentOrConfig?: Commitment | GetMultipleAccountsConfig,
  ): Promise<
    RpcResponseAndContext<(AccountInfoWithSpace<Uint8Array> | null)[]>
  > {
    try {
      const {commitment, config} =
        extractCommitmentFromConfig(commitmentOrConfig);
      const typedPublicKeys = publicKeys.map(key => toKitAddress(key));
      const rpcCommitment = this._resolveCommitment(commitment);
      const minContextSlot = config?.minContextSlot;

      const response = await this._typedRpc
        .getMultipleAccounts(typedPublicKeys, {
          commitment: rpcCommitment,
          dataSlice: config?.dataSlice,
          encoding: 'base64',
          minContextSlot: coerceOptionalNumericToBigInt(
            minContextSlot,
            'minContextSlot',
          ),
        })
        .send();

      return {
        context: response.context,
        value: response.value.map(account =>
          mapBase64AccountInfo(account, 'Expected raw account info rentEpoch'),
        ),
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        `failed to get info for accounts ${publicKeys.map(key => key.toBase58())}`,
      );
    }
  }

  /**
   * Fetch all the account info for multiple accounts specified by an array of public keys
   */
  async getMultipleAccountsInfo(
    publicKeys: Address[],
    commitmentOrConfig?: Commitment | GetMultipleAccountsConfig,
  ): Promise<(AccountInfoWithSpace<Uint8Array> | null)[]> {
    const res = await this.getMultipleAccountsInfoAndContext(
      publicKeys,
      commitmentOrConfig,
    );
    return res.value;
  }

  /**
   * Fetch all the accounts owned by the specified program id
   *
   * @return {Promise<Array<{pubkey: Address, account: AccountInfo<Uint8Array>}>>}
   */
  async getProgramAccounts(
    programId: Address,
    configOrCommitment: GetProgramAccountsConfig &
      Readonly<{withContext: true}>,
  ): Promise<RpcResponseAndContext<GetProgramAccountsResponse>>;

  async getProgramAccounts(
    programId: Address,
    configOrCommitment?: GetProgramAccountsConfig | Commitment,
  ): Promise<GetProgramAccountsResponse>;

  async getProgramAccounts(
    programId: Address,
    configOrCommitment?: GetProgramAccountsConfig | Commitment,
  ): Promise<
    | GetProgramAccountsResponse
    | RpcResponseAndContext<GetProgramAccountsResponse>
  > {
    const {commitment, config} =
      extractCommitmentFromConfig(configOrCommitment);
    const configWithoutEncoding = config || {};
    const rpcCommitment = this._resolveCommitment(commitment);
    const filters = getProgramAccountsRpcFilters(configWithoutEncoding.filters);
    const minContextSlot = coerceOptionalNumericToBigInt(
      configWithoutEncoding.minContextSlot,
      'minContextSlot',
    );
    const typedProgramId = toKitAddress(programId);
    const rpcConfig = {
      commitment: rpcCommitment,
      dataSlice: configWithoutEncoding.dataSlice,
      encoding: 'base64' as const,
      filters,
      minContextSlot,
    };
    try {
      if (configWithoutEncoding.withContext === true) {
        const response = await this._typedRpc
          .getProgramAccounts(typedProgramId, {
            ...rpcConfig,
            withContext: true,
          })
          .send();

        return {
          context: response.context,
          value: mapKeyedBase64AccountInfos(
            response.value,
            'Expected program account rentEpoch',
          ),
        };
      }

      const response = await this._typedRpc
        .getProgramAccounts(typedProgramId, rpcConfig)
        .send();

      return mapKeyedBase64AccountInfos(
        response,
        'Expected program account rentEpoch',
      );
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        `failed to get accounts owned by program ${programId.toBase58()}`,
      );
    }
  }

  /**
   * Fetch and parse all the accounts owned by the specified program id
   *
   * @return {Promise<Array<{pubkey: Address, account: AccountInfo<Uint8Array | ParsedAccountData>}>>}
   */
  async getParsedProgramAccounts(
    programId: Address,
    configOrCommitment?: GetParsedProgramAccountsConfig | Commitment,
  ): Promise<
    Array<{
      pubkey: Address;
      account: AccountInfoWithSpace<Uint8Array | ParsedAccountData>;
    }>
  > {
    const {commitment, config} =
      extractCommitmentFromConfig(configOrCommitment);
    const rpcCommitment = this._resolveCommitment(commitment);
    const filters = getProgramAccountsRpcFilters(config?.filters);
    const minContextSlot = coerceOptionalNumericToBigInt(
      config?.minContextSlot,
      'minContextSlot',
    );

    try {
      const response = await this._typedRpc
        .getProgramAccounts(toKitAddress(programId), {
          commitment: rpcCommitment,
          encoding: 'jsonParsed',
          filters,
          minContextSlot,
        })
        .send();

      return mapKeyedJsonParsedAccountInfos(
        response,
        'Expected program account rentEpoch',
      );
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        `failed to get accounts owned by program ${programId.toBase58()}`,
      );
    }
  }

  confirmTransaction(
    strategy: TransactionConfirmationStrategy,
    commitment?: Commitment,
  ): Promise<RpcResponseAndContext<SignatureResult>>;

  /** @deprecated Instead, call `confirmTransaction` and pass in {@link TransactionConfirmationStrategy} */

  confirmTransaction(
    strategy: TransactionSignature,
    commitment?: Commitment,
  ): Promise<RpcResponseAndContext<SignatureResult>>;

  async confirmTransaction(
    strategy: TransactionConfirmationStrategy | TransactionSignature,
    commitment?: Commitment,
  ): Promise<RpcResponseAndContext<SignatureResult>> {
    let rawSignature: string;

    if (typeof strategy == 'string') {
      rawSignature = strategy;
    } else {
      const config = strategy as TransactionConfirmationStrategy;

      if (config.abortSignal?.aborted) {
        throw config.abortSignal.reason;
      }
      rawSignature = config.signature;
    }

    let decodedSignature;

    try {
      decodedSignature = BASE58_ENCODER.encode(rawSignature);
    } catch {
      throw new Error('signature must be base58 encoded: ' + rawSignature);
    }

    assert(decodedSignature.length === 64, 'signature has invalid length');

    if (typeof strategy === 'string') {
      return await this.confirmTransactionUsingLegacyTimeoutStrategy({
        commitment: this._resolveCommitment(commitment),
        signature: rawSignature,
      });
    } else if ('lastValidBlockHeight' in strategy) {
      return await this.confirmTransactionUsingBlockHeightExceedanceStrategy({
        commitment: this._resolveCommitment(commitment),
        strategy,
      });
    } else {
      return await this.confirmTransactionUsingDurableNonceStrategy({
        commitment: this._resolveCommitment(commitment),
        strategy,
      });
    }
  }

  private getCancellationPromise(signal?: AbortSignal): Promise<never> {
    return new Promise<never>((_, reject) => {
      if (signal == null) {
        return;
      }
      if (signal.aborted) {
        reject(signal.reason);
      } else {
        signal.addEventListener('abort', () => {
          reject(signal.reason);
        });
      }
    });
  }

  private _resolveCommitment(requestedCommitment?: Commitment): Commitment {
    return requestedCommitment ?? this._commitment ?? 'confirmed';
  }

  private _resolveSupportedFinality(
    requestedCommitment?: Commitment,
  ): Finality {
    const rpcCommitment = this._resolveCommitment(requestedCommitment);
    if (!['confirmed', 'finalized'].includes(rpcCommitment)) {
      throw new Error('Method does not support commitment below `confirmed`');
    }
    return rpcCommitment as Finality;
  }

  private _resolveSubscriptionCommitment(
    requestedCommitment: Commitment | undefined,
  ): Commitment {
    return this._resolveCommitment(requestedCommitment);
  }

  /**
   * Normalize a subscription's commitment-or-config input into a config object
   * with an explicit commitment.
   */
  private _resolveSubscriptionConfig<TConfig extends {commitment?: Commitment}>(
    commitmentOrConfig: Commitment | TConfig | undefined,
  ): Omit<TConfig, 'commitment'> & {commitment: Commitment} {
    const {commitment, config} =
      extractCommitmentFromConfig<TConfig>(commitmentOrConfig);
    return {
      ...config,
      commitment: this._resolveSubscriptionCommitment(commitment),
    } as Omit<TConfig, 'commitment'> & {commitment: Commitment};
  }

  private getTransactionConfirmationPromise({
    commitment,
    signature,
  }: {
    commitment: Commitment;
    signature: string;
  }): {
    abortConfirmation(): Promise<void>;
    confirmationPromise: Promise<{
      __type: TransactionStatus.PROCESSED;
      response: RpcResponseAndContext<SignatureResult>;
    }>;
  } {
    let signatureSubscriptionId: number | undefined;
    let disposeSignatureSubscriptionStateChangeObserver:
      | (() => void)
      | undefined;
    let done = false;
    const confirmationPromise = new Promise<{
      __type: TransactionStatus.PROCESSED;
      response: RpcResponseAndContext<SignatureResult>;
    }>((resolve, reject) => {
      try {
        signatureSubscriptionId = this.onSignature(
          signature,
          (result: SignatureResult, context: Context) => {
            signatureSubscriptionId = undefined;
            const response = {
              context,
              value: result,
            };
            resolve({__type: TransactionStatus.PROCESSED, response});
          },
          commitment,
        );
        const subscriptionSetupPromise = new Promise<void>(
          resolveSubscriptionSetup => {
            if (signatureSubscriptionId == null) {
              resolveSubscriptionSetup();
            } else {
              const settleSubscriptionSetup = (
                nextState: ObservedSubscriptionState,
              ) => {
                if (
                  nextState !== 'failed' &&
                  nextState !== 'inactive' &&
                  nextState !== 'subscribed'
                ) {
                  return;
                }
                if (disposeSignatureSubscriptionStateChangeObserver) {
                  disposeSignatureSubscriptionStateChangeObserver();
                  disposeSignatureSubscriptionStateChangeObserver = undefined;
                }
                resolveSubscriptionSetup();
              };
              const {currentState, dispose} =
                this._subscriptionRegistry.observeStateChanges(
                  signatureSubscriptionId,
                  settleSubscriptionSetup,
                );
              disposeSignatureSubscriptionStateChangeObserver = dispose;
              settleSubscriptionSetup(currentState);
            }
          },
        );
        (async () => {
          await subscriptionSetupPromise;
          if (done) return;
          const response = await this.getSignatureStatus(signature);
          if (done) return;
          if (response == null) {
            return;
          }
          const {context, value} = response;
          if (value == null) {
            return;
          }
          if (value?.err) {
            reject(value.err);
          } else if (
            confirmationStatusSatisfiesCommitment(
              commitment,
              value.confirmationStatus,
            )
          ) {
            done = true;
            resolve({
              __type: TransactionStatus.PROCESSED,
              response: {
                context: {slot: context.slot},
                value,
              },
            });
          }
        })();
      } catch (err) {
        reject(err);
      }
    });
    const abortConfirmation = async () => {
      if (disposeSignatureSubscriptionStateChangeObserver) {
        disposeSignatureSubscriptionStateChangeObserver();
        disposeSignatureSubscriptionStateChangeObserver = undefined;
      }
      if (signatureSubscriptionId != null) {
        await this.removeSignatureListener(signatureSubscriptionId);
        signatureSubscriptionId = undefined;
      }
    };
    return {abortConfirmation, confirmationPromise};
  }

  private async confirmTransactionUsingBlockHeightExceedanceStrategy({
    commitment,
    strategy: {abortSignal, lastValidBlockHeight, signature},
  }: {
    commitment: Commitment;
    strategy: BlockheightBasedTransactionConfirmationStrategy;
  }) {
    let done: boolean = false;
    const lastValidBlockHeightBigInt = coerceNumericToBigInt(
      lastValidBlockHeight,
      'lastValidBlockHeight',
    );
    const cancellationPromise = this.getCancellationPromise(abortSignal);
    const cancellationSentinel = Symbol('blockheight-cancelled');
    const expiryPromise = new Promise<{
      __type: TransactionStatus.BLOCKHEIGHT_EXCEEDED;
    }>(resolve => {
      const checkBlockHeight = async (): Promise<bigint> => {
        try {
          const blockHeight = await this._typedRpc
            .getBlockHeight({commitment})
            .send(abortSignal == null ? undefined : {abortSignal});
          return blockHeight;
        } catch (_e) {
          return -1n;
        }
      };
      (async () => {
        let currentBlockHeight = await Promise.race<
          bigint | typeof cancellationSentinel
        >([
          checkBlockHeight(),
          cancellationPromise.catch(() => cancellationSentinel),
        ]);
        if (done || currentBlockHeight === cancellationSentinel) return;
        while (currentBlockHeight <= lastValidBlockHeightBigInt) {
          const sleepResult = await Promise.race<
            void | typeof cancellationSentinel
          >([
            sleep(1000),
            cancellationPromise.catch(() => cancellationSentinel),
          ]);
          if (done || sleepResult === cancellationSentinel) return;
          currentBlockHeight = await Promise.race<
            bigint | typeof cancellationSentinel
          >([
            checkBlockHeight(),
            cancellationPromise.catch(() => cancellationSentinel),
          ]);
          if (done || currentBlockHeight === cancellationSentinel) return;
        }
        resolve({__type: TransactionStatus.BLOCKHEIGHT_EXCEEDED});
      })();
    });
    const {abortConfirmation, confirmationPromise} =
      this.getTransactionConfirmationPromise({commitment, signature});
    let result: RpcResponseAndContext<SignatureResult>;
    try {
      const outcome = await Promise.race([
        cancellationPromise,
        confirmationPromise,
        expiryPromise,
      ]);
      if (outcome.__type === TransactionStatus.PROCESSED) {
        result = outcome.response;
      } else {
        throw new TransactionExpiredBlockheightExceededError(signature);
      }
    } finally {
      done = true;
      await abortConfirmation();
    }
    return result;
  }

  private async confirmTransactionUsingDurableNonceStrategy({
    commitment,
    strategy: {
      abortSignal,
      minContextSlot,
      nonceAccountPubkey,
      nonceValue,
      signature,
    },
  }: {
    commitment: Commitment;
    strategy: DurableNonceTransactionConfirmationStrategy;
  }) {
    let done: boolean = false;
    const nonceMinContextSlot = coerceNumericToBigInt(
      minContextSlot,
      'minContextSlot',
    );
    const cancellationPromise = this.getCancellationPromise(abortSignal);
    const cancellationSentinel = Symbol('nonce-cancelled');
    const expiryPromise = new Promise<{
      __type: TransactionStatus.NONCE_INVALID;
      slotInWhichNonceDidAdvance: bigint | null;
    }>(resolve => {
      let currentNonceValue: string | undefined = nonceValue;
      let lastCheckedSlot: bigint | null = null;
      const getCurrentNonceValue = async () => {
        try {
          const {context, value: nonceAccount} = await this.getNonceAndContext(
            nonceAccountPubkey,
            {
              commitment,
              minContextSlot,
            },
          );
          lastCheckedSlot = context.slot;
          return nonceAccount?.nonce;
        } catch (_e) {
          // If for whatever reason we can't reach/read the nonce
          // account, just keep using the last-known value.
          return currentNonceValue;
        }
      };
      (async () => {
        const initialNonceValue = await Promise.race<
          string | undefined | typeof cancellationSentinel
        >([
          getCurrentNonceValue(),
          cancellationPromise.catch(() => cancellationSentinel),
        ]);
        if (done || initialNonceValue === cancellationSentinel) return;
        currentNonceValue = initialNonceValue;
        while (true) {
          if (nonceValue !== currentNonceValue) {
            resolve({
              __type: TransactionStatus.NONCE_INVALID,
              slotInWhichNonceDidAdvance: lastCheckedSlot,
            });
            return;
          }
          const sleepResult = await Promise.race<
            void | typeof cancellationSentinel
          >([
            sleep(2000),
            cancellationPromise.catch(() => cancellationSentinel),
          ]);
          if (done || sleepResult === cancellationSentinel) return;
          const nextNonceValue = await Promise.race<
            string | undefined | typeof cancellationSentinel
          >([
            getCurrentNonceValue(),
            cancellationPromise.catch(() => cancellationSentinel),
          ]);
          if (done || nextNonceValue === cancellationSentinel) return;
          currentNonceValue = nextNonceValue;
        }
      })();
    });
    const {abortConfirmation, confirmationPromise} =
      this.getTransactionConfirmationPromise({commitment, signature});
    let result: RpcResponseAndContext<SignatureResult>;
    try {
      const outcome = await Promise.race([
        cancellationPromise,
        confirmationPromise,
        expiryPromise,
      ]);
      if (outcome.__type === TransactionStatus.PROCESSED) {
        result = outcome.response;
      } else {
        // Double check that the transaction is indeed unconfirmed.
        let signatureStatus:
          | RpcResponseAndContext<SignatureStatus | null>
          | null
          | undefined;
        while (true) {
          const status = await this.getSignatureStatus(signature);
          if (status == null) {
            break;
          }
          if (
            status.context.slot <
            (outcome.slotInWhichNonceDidAdvance ?? nonceMinContextSlot)
          ) {
            await sleep(400);
            continue;
          }
          signatureStatus = status;
          break;
        }
        if (signatureStatus?.value) {
          const {confirmationStatus} = signatureStatus.value;
          if (
            !confirmationStatusSatisfiesCommitment(
              commitment,
              confirmationStatus,
              false,
            )
          ) {
            throw new TransactionExpiredNonceInvalidError(signature);
          }
          result = {
            context: {slot: signatureStatus.context.slot},
            value: {err: signatureStatus.value.err},
          };
        } else {
          throw new TransactionExpiredNonceInvalidError(signature);
        }
      }
    } finally {
      done = true;
      await abortConfirmation();
    }
    return result;
  }

  private async confirmTransactionUsingLegacyTimeoutStrategy({
    commitment,
    signature,
  }: {
    commitment: Commitment;
    signature: string;
  }) {
    let timeoutId;
    const expiryPromise = new Promise<{
      __type: TransactionStatus.TIMED_OUT;
      timeoutMs: number;
    }>(resolve => {
      const timeoutMs = getLegacyTransactionConfirmationTimeoutMs(
        this._confirmTransactionInitialTimeout,
        commitment,
      );
      timeoutId = setTimeout(
        () => resolve({__type: TransactionStatus.TIMED_OUT, timeoutMs}),
        timeoutMs,
      );
    });
    const {abortConfirmation, confirmationPromise} =
      this.getTransactionConfirmationPromise({
        commitment,
        signature,
      });
    let result: RpcResponseAndContext<SignatureResult>;
    try {
      const outcome = await Promise.race([confirmationPromise, expiryPromise]);
      if (outcome.__type === TransactionStatus.PROCESSED) {
        result = outcome.response;
      } else {
        throw new TransactionExpiredTimeoutError(
          signature,
          outcome.timeoutMs / 1000,
        );
      }
    } finally {
      clearTimeout(timeoutId);
      await abortConfirmation();
    }
    return result;
  }

  /**
   * Return the list of nodes that are currently participating in the cluster
   */
  async getClusterNodes(): Promise<
    ReturnType<GetClusterNodesApi['getClusterNodes']>
  > {
    try {
      return await this._typedRpc.getClusterNodes().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get cluster nodes');
    }
  }

  /**
   * Fetch the RPC node health status.
   */
  async getHealth(): Promise<ReturnType<GetHealthApi['getHealth']>> {
    try {
      return await this._typedRpc.getHealth().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get health');
    }
  }

  /**
   * Fetch the RPC node identity.
   */
  async getIdentity(): Promise<Identity> {
    try {
      const response = await this._typedRpc.getIdentity().send();
      return {
        identity: new Address(response.identity),
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get identity');
    }
  }

  /**
   * Fetch the highest full and incremental snapshot slots available on the RPC node.
   */
  async getHighestSnapshotSlot(): Promise<
    ReturnType<GetHighestSnapshotSlotApi['getHighestSnapshotSlot']>
  > {
    try {
      return await this._typedRpc.getHighestSnapshotSlot().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get highest snapshot slot');
    }
  }

  /**
   * Fetch the highest slot seen by retransmit stage.
   */
  async getMaxRetransmitSlot(): Promise<
    ReturnType<GetMaxRetransmitSlotApi['getMaxRetransmitSlot']>
  > {
    try {
      return await this._typedRpc.getMaxRetransmitSlot().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get max retransmit slot');
    }
  }

  /**
   * Fetch the highest slot seen by blockstore.
   */
  async getMaxShredInsertSlot(): Promise<
    ReturnType<GetMaxShredInsertSlotApi['getMaxShredInsertSlot']>
  > {
    try {
      return await this._typedRpc.getMaxShredInsertSlot().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get max shred insert slot');
    }
  }

  /**
   * Return the list of nodes that are currently participating in the cluster
   */
  async getVoteAccounts(
    commitmentOrConfig?: Commitment | GetVoteAccountsConfig,
  ): Promise<VoteAccountStatus> {
    const {commitment, config} =
      extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = this._resolveCommitment(commitment);
    const typedVotePubkey =
      config?.votePubkey == null
        ? undefined
        : toKitAddress(new Address(config.votePubkey));
    const delinquentSlotDistance =
      config?.delinquentSlotDistance == null
        ? undefined
        : coerceNumericToBigInt(
            config.delinquentSlotDistance,
            'delinquentSlotDistance',
          );
    const rpcConfig = {
      ...(rpcCommitment != null ? {commitment: rpcCommitment} : null),
      ...(typedVotePubkey != null ? {votePubkey: typedVotePubkey} : null),
      ...(config?.keepUnstakedDelinquents != null
        ? {keepUnstakedDelinquents: config.keepUnstakedDelinquents}
        : null),
      ...(delinquentSlotDistance != null ? {delinquentSlotDistance} : null),
    };

    try {
      const response = await (
        rpcCommitment != null ||
        typedVotePubkey != null ||
        config?.keepUnstakedDelinquents != null ||
        delinquentSlotDistance != null
          ? this._typedRpc.getVoteAccounts(rpcConfig)
          : this._typedRpc.getVoteAccounts()
      ).send();
      return response;
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get vote accounts');
    }
  }

  /**
   * Fetch the current slot that the node is processing
   */
  async getSlot(
    commitmentOrConfig?: Commitment | GetSlotConfig,
  ): Promise<ReturnType<GetSlotApi['getSlot']>> {
    const {commitment, config} =
      extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = this._resolveCommitment(commitment);
    const minContextSlot = config?.minContextSlot;

    try {
      if (rpcCommitment == null && minContextSlot == null) {
        return await this._typedRpc.getSlot().send();
      }

      return await this._typedRpc
        .getSlot({
          commitment: rpcCommitment,
          minContextSlot: coerceOptionalNumericToBigInt(
            minContextSlot,
            'minContextSlot',
          ),
        })
        .send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get slot');
    }
  }

  /**
   * Fetch the current slot leader of the cluster
   */
  async getSlotLeader(
    commitmentOrConfig?: Commitment | GetSlotLeaderConfig,
  ): Promise<string> {
    const {commitment, config} =
      extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = this._resolveCommitment(commitment);
    const minContextSlot = config?.minContextSlot;

    try {
      return await (
        rpcCommitment == null && minContextSlot == null
          ? this._typedRpc.getSlotLeader()
          : this._typedRpc.getSlotLeader({
              commitment: rpcCommitment,
              minContextSlot: coerceOptionalNumericToBigInt(
                minContextSlot,
                'minContextSlot',
              ),
            })
      ).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get slot leader');
    }
  }

  /**
   * Fetch `limit` number of slot leaders starting from `startSlot`
   *
   * @param startSlot fetch slot leaders starting from this slot
   * @param limit number of slot leaders to return
   */
  async getSlotLeaders(
    startSlot: number | bigint,
    limit: number,
  ): Promise<Array<Address>> {
    try {
      const response = await this._typedRpc
        .getSlotLeaders(coerceNumericToBigInt(startSlot, 'startSlot'), limit)
        .send();
      return response.map(address => new Address(address));
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get slot leaders');
    }
  }

  /**
   * Fetch the current status of a signature
   */
  async getSignatureStatus(
    signature: TransactionSignature,
    config?: SignatureStatusConfig,
  ): Promise<RpcResponseAndContext<SignatureStatus | null>> {
    const {context, value: values} = await this.getSignatureStatuses(
      [signature],
      config,
    );
    assert(values.length === 1);
    const value = values[0];
    return {context, value};
  }

  /**
   * Fetch the current statuses of a batch of signatures
   */
  async getSignatureStatuses(
    signatures: Array<TransactionSignature>,
    config?: SignatureStatusConfig,
  ): Promise<RpcResponseAndContext<Array<SignatureStatus | null>>> {
    try {
      assertIsTransactionSignatureArray(signatures);

      const response = await (
        config == null
          ? this._typedRpc.getSignatureStatuses(signatures)
          : this._typedRpc.getSignatureStatuses(signatures, config)
      ).send();

      return {
        context: response.context,
        value: response.value.map(status =>
          status == null
            ? null
            : {
                confirmationStatus: status.confirmationStatus,
                confirmations: status.confirmations,
                err: status.err,
                slot: status.slot,
              },
        ),
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get signature status');
    }
  }

  /**
   * Fetch the current transaction count of the cluster
   */
  async getTransactionCount(
    commitmentOrConfig?: Commitment | GetTransactionCountConfig,
  ): Promise<bigint> {
    const {commitment, config} =
      extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = this._resolveCommitment(commitment);
    const minContextSlot = config?.minContextSlot;

    try {
      if (rpcCommitment == null && minContextSlot == null) {
        return await this._typedRpc.getTransactionCount().send();
      }

      return await this._typedRpc
        .getTransactionCount({
          commitment: rpcCommitment,
          minContextSlot: coerceOptionalNumericToBigInt(
            minContextSlot,
            'minContextSlot',
          ),
        })
        .send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get transaction count');
    }
  }

  /**
   * Fetch the cluster InflationGovernor parameters
   */
  async getInflationGovernor(
    commitmentOrConfig?: Commitment | GetInflationGovernorConfig,
  ): Promise<InflationGovernor> {
    const {commitment} = extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = this._resolveCommitment(commitment);
    try {
      return await (
        rpcCommitment == null
          ? this._typedRpc.getInflationGovernor()
          : this._typedRpc.getInflationGovernor({
              commitment: rpcCommitment,
            })
      ).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get inflation');
    }
  }

  /**
   * Fetch the inflation reward for a list of addresses for an epoch
   */
  async getInflationReward(
    addresses: Address[],
    epoch?: number | bigint,
    commitmentOrConfig?: Commitment | GetInflationRewardConfig,
  ): Promise<(InflationReward | null)[]> {
    const {commitment, config} =
      extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = this._resolveCommitment(commitment);
    const rpcEpoch =
      epoch != null
        ? coerceNumericToBigInt(epoch, 'epoch')
        : config?.epoch == null
          ? undefined
          : coerceNumericToBigInt(config.epoch, 'epoch');
    const minContextSlot = coerceOptionalNumericToBigInt(
      config?.minContextSlot,
      'minContextSlot',
    );
    const typedAddresses = addresses.map(address => toKitAddress(address));
    const rpcConfig: TypedInflationRewardRequestConfig | undefined =
      rpcCommitment != null || rpcEpoch != null || minContextSlot != null
        ? {
            ...(rpcCommitment != null ? {commitment: rpcCommitment} : null),
            ...(rpcEpoch != null ? {epoch: rpcEpoch} : null),
            ...(minContextSlot != null ? {minContextSlot} : null),
          }
        : undefined;
    const getInflationReward = this._typedRpc
      .getInflationReward as TypedRpcRequestMethod<
      [
        addresses: readonly KitAddress[],
        config?: TypedInflationRewardRequestConfig,
      ],
      readonly (InflationReward | null)[]
    >;

    try {
      const response = await getInflationReward(
        typedAddresses,
        rpcConfig,
      ).send();
      return [...response];
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get inflation reward');
    }
  }

  /**
   * Fetch the specific inflation values for the current epoch
   */
  async getInflationRate(): Promise<InflationRate> {
    try {
      return await this._typedRpc.getInflationRate().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get inflation rate');
    }
  }

  /**
   * Fetch the Epoch Info parameters
   */
  async getEpochInfo(
    commitmentOrConfig?: Commitment | GetEpochInfoConfig,
  ): Promise<EpochInfo> {
    const {commitment, config} =
      extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = this._resolveCommitment(commitment);
    const minContextSlot = config?.minContextSlot;

    try {
      return await (
        rpcCommitment == null && minContextSlot == null
          ? this._typedRpc.getEpochInfo()
          : this._typedRpc.getEpochInfo({
              commitment: rpcCommitment,
              minContextSlot: coerceOptionalNumericToBigInt(
                minContextSlot,
                'minContextSlot',
              ),
            })
      ).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get epoch info');
    }
  }

  /**
   * Fetch the Epoch Schedule parameters
   */
  async getEpochSchedule(): Promise<EpochSchedule> {
    try {
      const epochSchedule = await this._typedRpc.getEpochSchedule().send();
      return new EpochSchedule(
        epochSchedule.slotsPerEpoch,
        epochSchedule.leaderScheduleSlotOffset,
        epochSchedule.warmup,
        epochSchedule.firstNormalEpoch,
        epochSchedule.firstNormalSlot,
      );
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get epoch schedule');
    }
  }

  /**
   * Fetch the leader schedule for the current epoch
   * @return {Promise<RpcResponseAndContext<LeaderSchedule>>}
   */
  async getLeaderSchedule(
    slotOrCommitmentOrConfig?:
      | number
      | bigint
      | null
      | Commitment
      | GetLeaderScheduleConfig,
    commitmentOrConfig?: Commitment | GetLeaderScheduleConfig,
  ): Promise<LeaderSchedule | null> {
    let slot: number | bigint | null | undefined;
    let rawCommitmentOrConfig: Commitment | GetLeaderScheduleConfig | undefined;
    if (
      typeof slotOrCommitmentOrConfig === 'number' ||
      typeof slotOrCommitmentOrConfig === 'bigint' ||
      slotOrCommitmentOrConfig === null
    ) {
      slot = slotOrCommitmentOrConfig;
      rawCommitmentOrConfig = commitmentOrConfig;
    } else {
      rawCommitmentOrConfig = slotOrCommitmentOrConfig;
    }

    const {commitment, config} = extractCommitmentFromConfig(
      rawCommitmentOrConfig,
    );
    const rpcCommitment = this._resolveCommitment(commitment);
    const rpcIdentity = config?.identity;
    if (rpcIdentity != null) {
      assertIsAddress(rpcIdentity);
    }
    const rpcConfig: TypedLeaderScheduleRequestConfig | undefined =
      rpcCommitment != null || rpcIdentity != null
        ? {
            ...(rpcCommitment != null ? {commitment: rpcCommitment} : null),
            ...(rpcIdentity != null ? {identity: rpcIdentity} : null),
          }
        : undefined;
    const getLeaderSchedule = this._typedRpc
      .getLeaderSchedule as TypedRpcRequestMethod<
      [slot?: Slot | null, config?: TypedLeaderScheduleRequestConfig],
      LeaderSchedule | null
    >;
    const rpcSlot =
      typeof slot === 'number' || typeof slot === 'bigint'
        ? coerceNumericToBigInt(slot, 'slot')
        : slot;

    try {
      if (rpcSlot === undefined && rpcConfig == null) {
        return await getLeaderSchedule().send();
      }

      return await getLeaderSchedule(rpcSlot ?? null, rpcConfig).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get leader schedule');
    }
  }

  /**
   * Fetch the minimum balance needed to exempt an account of `dataLength`
   * size from rent
   */
  async getMinimumBalanceForRentExemption(
    dataLength: number,
    commitmentOrConfig?: Commitment | GetMinimumBalanceForRentExemptionConfig,
  ): Promise<
    ReturnType<
      GetMinimumBalanceForRentExemptionApi['getMinimumBalanceForRentExemption']
    >
  > {
    const {commitment} = extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = this._resolveCommitment(commitment);
    const rpcDataLength = coerceNumericToBigInt(dataLength, 'dataLength');

    try {
      return await (
        rpcCommitment == null
          ? this._typedRpc.getMinimumBalanceForRentExemption(rpcDataLength)
          : this._typedRpc.getMinimumBalanceForRentExemption(rpcDataLength, {
              commitment: rpcCommitment,
            })
      ).send();
    } catch (_error) {
      console.warn('Unable to fetch minimum balance for rent exemption');
      return 0n as ReturnType<
        GetMinimumBalanceForRentExemptionApi['getMinimumBalanceForRentExemption']
      >;
    }
  }

  /**
   * Fetch recent performance samples
   * @return {Promise<readonly PerfSample[]>}
   */
  async getRecentPerformanceSamples(
    limit?: number,
  ): Promise<
    ReturnType<GetRecentPerformanceSamplesApi['getRecentPerformanceSamples']>
  > {
    try {
      return await (
        limit
          ? this._typedRpc.getRecentPerformanceSamples(limit)
          : this._typedRpc.getRecentPerformanceSamples()
      ).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        'failed to get recent performance samples',
      );
    }
  }

  /**
   * Fetch the fee for a message from the cluster, return with context
   */
  async getFeeForMessage(
    message: VersionedMessage,
    commitmentOrConfig?: Commitment | GetFeeForMessageConfig,
  ): Promise<ReturnType<GetFeeForMessageApi['getFeeForMessage']>> {
    const {commitment, config} =
      extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = this._resolveCommitment(commitment);
    const minContextSlot = config?.minContextSlot;
    const wireMessage = encodeBase64WireData(message.serialize()) as Parameters<
      GetFeeForMessageApi['getFeeForMessage']
    >[0];

    try {
      const response = await (
        rpcCommitment == null && minContextSlot == null
          ? this._typedRpc.getFeeForMessage(wireMessage)
          : this._typedRpc.getFeeForMessage(wireMessage, {
              commitment: rpcCommitment,
              minContextSlot: coerceOptionalNumericToBigInt(
                minContextSlot,
                'minContextSlot',
              ),
            })
      ).send();
      if (response.value === null) {
        throw new Error('invalid blockhash');
      }
      return response;
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get fee for message');
    }
  }

  /**
   * Fetch a list of prioritization fees from recent blocks.
   */
  async getRecentPrioritizationFees(
    config?: GetRecentPrioritizationFeesConfig,
  ): Promise<readonly RecentPrioritizationFees[]> {
    const accounts = config?.lockedWritableAccounts?.map(key =>
      toKitAddress(key),
    );
    try {
      return await (
        accounts == null
          ? this._typedRpc.getRecentPrioritizationFees()
          : this._typedRpc.getRecentPrioritizationFees(accounts)
      ).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        'failed to get recent prioritization fees',
      );
    }
  }
  /**
   * Fetch the latest blockhash from the cluster
   * @return {Promise<BlockhashWithExpiryBlockHeight>}
   */
  getLatestBlockhash(
    commitmentOrConfig?: Commitment | GetLatestBlockhashConfig,
  ): Promise<BlockhashWithExpiryBlockHeight> {
    return this.getLatestBlockhashAndContext(commitmentOrConfig)
      .then(response => response.value)
      .catch(e => {
        throw new Error('failed to get recent blockhash: ' + e);
      });
  }

  /**
   * Fetch the latest blockhash from the cluster
   * @return {Promise<BlockhashWithExpiryBlockHeight>}
   */
  async getLatestBlockhashAndContext(
    commitmentOrConfig?: Commitment | GetLatestBlockhashConfig,
  ): Promise<RpcResponseAndContext<BlockhashWithExpiryBlockHeight>> {
    const {commitment, config} =
      extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = this._resolveCommitment(commitment);
    const minContextSlot = config?.minContextSlot;

    try {
      const response = await (
        rpcCommitment == null && minContextSlot == null
          ? this._typedRpc.getLatestBlockhash()
          : this._typedRpc.getLatestBlockhash({
              ...(rpcCommitment != null ? {commitment: rpcCommitment} : null),
              ...(minContextSlot != null
                ? {
                    minContextSlot: coerceNumericToBigInt(
                      minContextSlot,
                      'minContextSlot',
                    ),
                  }
                : null),
            })
      ).send();

      return {
        context: response.context,
        value: {
          blockhash: response.value.blockhash as Blockhash,
          lastValidBlockHeight: response.value.lastValidBlockHeight,
        },
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get latest blockhash');
    }
  }

  /**
   * Returns whether a blockhash is still valid or not
   */
  async isBlockhashValid(
    blockhash: Blockhash,
    rawConfig?: IsBlockhashValidConfig,
  ): Promise<ReturnType<IsBlockhashValidApi['isBlockhashValid']>> {
    const rpcBlockhash = blockhash as RpcBlockhash;
    const {commitment, config} = extractCommitmentFromConfig(rawConfig);
    const rpcCommitment = this._resolveCommitment(commitment);
    const minContextSlot = config?.minContextSlot;

    try {
      return await (
        rpcCommitment == null && minContextSlot == null
          ? this._typedRpc.isBlockhashValid(rpcBlockhash)
          : this._typedRpc.isBlockhashValid(rpcBlockhash, {
              commitment: rpcCommitment,
              minContextSlot: coerceOptionalNumericToBigInt(
                minContextSlot,
                'minContextSlot',
              ),
            })
      ).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        'failed to determine if the blockhash `' + blockhash + '`is valid',
      );
    }
  }

  /**
   * Fetch the node version
   */
  async getVersion(): Promise<ReturnType<GetVersionApi['getVersion']>> {
    try {
      return await this._typedRpc.getVersion().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get version');
    }
  }

  /**
   * Fetch the genesis hash
   */
  async getGenesisHash(): Promise<
    ReturnType<GetGenesisHashApi['getGenesisHash']>
  > {
    try {
      return await this._typedRpc.getGenesisHash().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get genesis hash');
    }
  }

  /**
   * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
   * setting the `maxSupportedTransactionVersion` property.
   */

  async getBlock(
    slot: number | bigint,
    rawConfig: GetBlockConfig & {transactionDetails: 'accounts'},
  ): Promise<AccountsModeBlockResponse | null>;

  /**
   * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
   * setting the `maxSupportedTransactionVersion` property.
   */

  async getBlock(
    slot: number | bigint,
    rawConfig: GetBlockConfig & {transactionDetails: 'none'},
  ): Promise<NoneModeBlockResponse | null>;

  /**
   * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
   * setting the `maxSupportedTransactionVersion` property.
   */

  async getBlock(
    slot: number | bigint,
    rawConfig: GetBlockConfig & {transactionDetails: 'signatures'},
  ): Promise<SignaturesModeBlockResponse | null>;

  /**
   * Fetch a processed block from the cluster.
   *
   * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
   * setting the `maxSupportedTransactionVersion` property.
   */

  async getBlock(
    slot: number | bigint,
    rawConfig?: GetBlockConfig,
  ): Promise<BlockResponse | null>;

  /**
   * Fetch a processed block from the cluster.
   */

  async getBlock(
    slot: number | bigint,
    rawConfig: GetVersionedBlockConfig & {transactionDetails: 'accounts'},
  ): Promise<VersionedAccountsModeBlockResponse | null>;

  async getBlock(
    slot: number | bigint,
    rawConfig: GetVersionedBlockConfig & {transactionDetails: 'none'},
  ): Promise<VersionedNoneModeBlockResponse | null>;

  async getBlock(
    slot: number | bigint,
    rawConfig: GetVersionedBlockConfig & {transactionDetails: 'signatures'},
  ): Promise<VersionedSignaturesModeBlockResponse | null>;

  async getBlock(
    slot: number | bigint,
    rawConfig?: GetVersionedBlockConfig,
  ): Promise<VersionedBlockResponse | null>;

  /**
   * Fetch a processed block from the cluster.
   */

  async getBlock(
    slot: number | bigint,
    rawConfig?: GetVersionedBlockConfig,
  ): Promise<
    | VersionedBlockResponse
    | VersionedAccountsModeBlockResponse
    | VersionedNoneModeBlockResponse
    | VersionedSignaturesModeBlockResponse
    | null
  > {
    const {commitment, config} = extractCommitmentFromConfig(rawConfig);
    const finality = this._resolveSupportedFinality(commitment);
    const rpcSlot = coerceNumericToBigInt(slot, 'slot');
    const fullConfig = buildTypedFullBlockConfig(
      finality,
      config,
      rawConfig != null,
    );

    try {
      return await fetchTypedBlockWithMappers<
        VersionedAccountsModeBlockResponse,
        TypedFullBlockSource,
        VersionedBlockResponse
      >(this._typedRpc, rpcSlot, finality, config, {
        mapAccountsBlock: (result: TypedAccountsModeBlockSource) => ({
          ...mapBlockBase(result),
          transactions: mapTypedAccountsModeBlockTransactions(
            result.transactions,
          ),
        }),
        fullConfig,
        mapFullBlock: (result: TypedFullBlockSource) => ({
          ...mapBlockBase(result),
          transactions: result.transactions.map(mapTypedFullBlockTransaction),
        }),
      });
    } catch (e) {
      throw new SolanaJSONRPCError(
        e as JsonRpcErrorLike,
        'failed to get confirmed block',
      );
    }
  }

  /**
   * Fetch parsed transaction details for a confirmed or finalized block
   */
  async getParsedBlock(
    slot: number | bigint,
    rawConfig: GetVersionedBlockConfig & {transactionDetails: 'accounts'},
  ): Promise<ParsedAccountsModeBlockResponse | null>;

  async getParsedBlock(
    slot: number | bigint,
    rawConfig: GetVersionedBlockConfig & {transactionDetails: 'none'},
  ): Promise<ParsedNoneModeBlockResponse | null>;

  async getParsedBlock(
    slot: number | bigint,
    rawConfig: GetVersionedBlockConfig & {transactionDetails: 'signatures'},
  ): Promise<ParsedSignaturesModeBlockResponse | null>;

  async getParsedBlock(
    slot: number | bigint,
    rawConfig?: GetVersionedBlockConfig,
  ): Promise<ParsedBlockResponse | null>;

  async getParsedBlock(
    slot: number | bigint,
    rawConfig?: GetVersionedBlockConfig,
  ): Promise<
    | ParsedBlockResponse
    | ParsedAccountsModeBlockResponse
    | ParsedNoneModeBlockResponse
    | ParsedSignaturesModeBlockResponse
    | null
  > {
    const {commitment, config} = extractCommitmentFromConfig(rawConfig);
    const finality = this._resolveSupportedFinality(commitment);
    const rpcSlot = coerceNumericToBigInt(slot, 'slot');
    const fullConfig = buildTypedParsedFullBlockConfig(finality, config);

    try {
      return await fetchTypedBlockWithMappers<
        ParsedAccountsModeBlockResponse,
        TypedParsedBlockSource,
        ParsedBlockResponse
      >(this._typedRpc, rpcSlot, finality, config, {
        mapAccountsBlock: (result: TypedAccountsModeBlockSource) => ({
          ...mapBlockBase(result),
          transactions: mapTypedAccountsModeBlockTransactions(
            result.transactions,
          ) as ParsedAccountsModeBlockResponse['transactions'],
        }),
        fullConfig,
        mapFullBlock: (result: TypedParsedBlockSource) => ({
          ...mapBlockBase(result),
          transactions: result.transactions.map(
            mapTypedParsedBlockTransaction,
          ) as ParsedBlockResponse['transactions'],
        }),
      });
    } catch (e) {
      throw new SolanaJSONRPCError(
        e as JsonRpcErrorLike,
        'failed to get block',
      );
    }
  }

  /*
   * Returns the current block height of the node
   */
  getBlockHeight = (() => {
    const requestPromises: {[hash: string]: Promise<bigint>} = {};
    return (
      commitmentOrConfig?: Commitment | GetBlockHeightConfig,
    ): Promise<bigint> => {
      const {commitment, config} =
        extractCommitmentFromConfig(commitmentOrConfig);
      const rpcCommitment = this._resolveCommitment(commitment);
      const rpcMinContextSlot = coerceOptionalNumericToBigInt(
        config?.minContextSlot,
        'minContextSlot',
      );
      const rpcConfig =
        rpcCommitment == null && rpcMinContextSlot == null
          ? undefined
          : {
              ...(rpcCommitment != null ? {commitment: rpcCommitment} : null),
              ...(rpcMinContextSlot != null
                ? {minContextSlot: rpcMinContextSlot}
                : null),
            };
      const requestHash = fastStableStringify({
        commitment: rpcCommitment ?? null,
        minContextSlot: rpcMinContextSlot?.toString() ?? null,
      });
      requestPromises[requestHash] =
        requestPromises[requestHash] ??
        (async () => {
          try {
            return await (
              rpcConfig == null
                ? this._typedRpc.getBlockHeight()
                : this._typedRpc.getBlockHeight(rpcConfig)
            ).send();
          } catch (error) {
            throwSolanaRpcErrorIfNeeded(
              error,
              'failed to get block height information',
            );
          } finally {
            delete requestPromises[requestHash];
          }
        })();
      return requestPromises[requestHash];
    };
  })();

  /*
   * Returns recent block production information from the current or previous epoch
   */
  async getBlockProduction(
    configOrCommitment?: GetBlockProductionConfig | Commitment,
  ): Promise<ReturnType<GetBlockProductionApi['getBlockProduction']>> {
    const {commitment, config} =
      extractCommitmentFromConfig(configOrCommitment);
    const rpcCommitment = this._resolveCommitment(commitment);
    const rpcIdentity = config?.identity as Address | undefined;
    const rpcRange =
      config?.range == null
        ? undefined
        : {
            firstSlot: coerceNumericToBigInt(
              config.range.firstSlot,
              'firstSlot',
            ),
            ...(config.range.lastSlot == null
              ? null
              : {
                  lastSlot: coerceNumericToBigInt(
                    config.range.lastSlot,
                    'lastSlot',
                  ),
                }),
          };
    const rpcConfig =
      rpcCommitment == null && rpcIdentity == null && rpcRange == null
        ? undefined
        : {
            ...(rpcCommitment != null ? {commitment: rpcCommitment} : null),
            ...(rpcIdentity != null
              ? {identity: rpcIdentity as Address}
              : null),
            ...(rpcRange != null ? {range: rpcRange} : null),
          };

    try {
      return await (
        rpcConfig == null
          ? this._typedRpc.getBlockProduction()
          : this._typedRpc.getBlockProduction(rpcConfig)
      ).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        'failed to get block production information',
      );
    }
  }

  /**
   * Fetch a confirmed or finalized transaction from the cluster.
   *
   * @deprecated Instead, call `getTransaction` using a
   * `GetVersionedTransactionConfig` by setting the
   * `maxSupportedTransactionVersion` property.
   */
  async getTransaction(
    signature: string,
    rawConfig?: GetTransactionConfig,
  ): Promise<TransactionResponse | null>;

  /**
   * Fetch a confirmed or finalized transaction from the cluster.
   */

  async getTransaction(
    signature: string,
    rawConfig: GetVersionedTransactionConfig,
  ): Promise<VersionedTransactionResponse | null>;

  /**
   * Fetch a confirmed or finalized transaction from the cluster.
   */

  async getTransaction(
    signature: string,
    rawConfig?: GetVersionedTransactionConfig,
  ): Promise<VersionedTransactionResponse | null> {
    const {commitment, config} = extractCommitmentFromConfig(rawConfig);
    const typedConfig = buildTypedTransactionConfig(
      this._resolveSupportedFinality(commitment),
      config,
    );
    try {
      const result = await sendTypedTransactionRequest<TypedTransactionSource>(
        this._typedRpc,
        signature,
        typedConfig,
      );

      return result ? mapTypedTransactionResponse(result) : null;
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get transaction');
    }
  }

  /**
   * Fetch parsed transaction details for a confirmed or finalized transaction
   */
  async getParsedTransaction(
    signature: TransactionSignature,
    commitmentOrConfig?: GetVersionedTransactionConfig | Finality,
  ): Promise<ParsedTransactionWithMeta | null> {
    const {commitment, config} =
      extractCommitmentFromConfig(commitmentOrConfig);
    const typedConfig = buildTypedParsedTransactionConfig(
      this._resolveSupportedFinality(commitment),
      config,
    );
    try {
      const result =
        await sendTypedTransactionRequest<TypedParsedTransactionSource>(
          this._typedRpc,
          signature,
          typedConfig,
        );

      return result ? mapTypedParsedTransactionResponse(result) : null;
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get transaction');
    }
  }

  /**
   * Fetch parsed transaction details for a batch of confirmed transactions
   */
  async getParsedTransactions(
    signatures: TransactionSignature[],
    commitmentOrConfig?: GetVersionedTransactionConfig | Finality,
  ): Promise<(ParsedTransactionWithMeta | null)[]> {
    const config =
      commitmentOrConfig == null
        ? undefined
        : typeof commitmentOrConfig === 'string'
          ? {commitment: commitmentOrConfig}
          : commitmentOrConfig;
    return await fetchTransactionsBySignature(
      signatures,
      config,
      (signature, config) => this.getParsedTransaction(signature, config),
    );
  }

  /**
   * Fetch transaction details for a batch of confirmed transactions.
   * Similar to {@link getParsedTransactions} but returns a {@link TransactionResponse}.
   *
   * @deprecated Instead, call `getTransactions` using a
   * `GetVersionedTransactionConfig` by setting the
   * `maxSupportedTransactionVersion` property.
   */
  async getTransactions(
    signatures: TransactionSignature[],
    commitmentOrConfig?: GetTransactionConfig | Finality,
  ): Promise<(TransactionResponse | null)[]>;

  /**
   * Fetch transaction details for a batch of confirmed transactions.
   * Similar to {@link getParsedTransactions} but returns a {@link
   * VersionedTransactionResponse}.
   */

  async getTransactions(
    signatures: TransactionSignature[],
    commitmentOrConfig: GetVersionedTransactionConfig | Finality,
  ): Promise<(VersionedTransactionResponse | null)[]>;

  /**
   * Fetch transaction details for a batch of confirmed transactions.
   * Similar to {@link getParsedTransactions} but returns a {@link
   * VersionedTransactionResponse}.
   */

  async getTransactions(
    signatures: TransactionSignature[],
    commitmentOrConfig: GetVersionedTransactionConfig | Finality,
  ): Promise<(VersionedTransactionResponse | null)[]> {
    const config =
      commitmentOrConfig == null
        ? undefined
        : typeof commitmentOrConfig === 'string'
          ? {commitment: commitmentOrConfig}
          : commitmentOrConfig;
    return await fetchTransactionsBySignature(
      signatures,
      config,
      (signature, config) => this.getTransaction(signature, config),
    );
  }

  /**
   * Fetch a list of Transactions and transaction statuses from the cluster
   * for a confirmed block.
   *
   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getBlock} instead.
   */
  async getConfirmedBlock(
    slot: number | bigint,
    commitment?: Finality,
  ): Promise<ConfirmedBlock> {
    const result = await this.getBlock(slot, {
      commitment: this._resolveSupportedFinality(commitment),
    });

    if (!result) {
      throw new Error('Confirmed block ' + slot + ' not found');
    }

    return {
      blockTime: result.blockTime,
      blockhash: result.blockhash,
      parentSlot: result.parentSlot,
      previousBlockhash: result.previousBlockhash,
      rewards: result.rewards,
      transactions: result.transactions.map(({transaction, meta}) => ({
        meta: meta as ConfirmedTransactionMeta | null,
        transaction: Transaction.populate(
          transaction.message,
          transaction.signatures,
        ),
      })),
    };
  }

  /**
   * Fetch confirmed blocks between two slots
   */
  async getBlocks(
    startSlot: number | bigint,
    endSlot?: number | bigint,
    commitment?: Finality,
  ): Promise<GetBlocksResult>;

  async getBlocks(
    startSlot: number | bigint,
    endSlot?: number | bigint,
    config?: GetBlocksConfig,
  ): Promise<GetBlocksResult>;

  async getBlocks(
    startSlot: number | bigint,
    config?: GetBlocksConfig,
  ): Promise<GetBlocksResult>;

  async getBlocks(
    startSlot: number | bigint,
    endSlotOrCommitmentOrConfig?: number | bigint | Finality | GetBlocksConfig,
    commitmentOrConfig?: Finality | GetBlocksConfig,
  ): Promise<GetBlocksResult> {
    const rpcStartSlot = coerceNumericToBigInt(startSlot, 'startSlot');
    let rpcEndSlot: bigint | undefined;
    let rawCommitmentOrConfig: Finality | GetBlocksConfig | undefined;
    if (
      typeof endSlotOrCommitmentOrConfig === 'number' ||
      typeof endSlotOrCommitmentOrConfig === 'bigint'
    ) {
      rpcEndSlot = coerceNumericToBigInt(
        endSlotOrCommitmentOrConfig,
        'endSlot',
      );
      rawCommitmentOrConfig = commitmentOrConfig;
    } else {
      rawCommitmentOrConfig = endSlotOrCommitmentOrConfig;
    }

    const {commitment} = extractCommitmentFromConfig(rawCommitmentOrConfig);
    const rpcFinality = this._resolveSupportedFinality(commitment);
    const rpcConfig = {commitment: rpcFinality};
    const getBlocks = this._typedRpc.getBlocks as TypedRpcRequestMethod<
      [startSlot: Slot, endSlot?: Slot, config?: TypedBlocksRequestConfig],
      GetBlocksResult
    >;

    try {
      return await getBlocks(rpcStartSlot, rpcEndSlot, rpcConfig).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get blocks');
    }
  }

  /**
   * Fetch confirmed blocks starting at the provided slot, limited to the requested length.
   */
  async getBlocksWithLimit(
    startSlot: number | bigint,
    limit: number,
    commitment?: Finality,
  ): Promise<GetBlocksWithLimitResult>;

  async getBlocksWithLimit(
    startSlot: number | bigint,
    limit: number,
    config?: GetBlocksConfig,
  ): Promise<GetBlocksWithLimitResult>;

  async getBlocksWithLimit(
    startSlot: number | bigint,
    limit: number,
    commitmentOrConfig?: Finality | GetBlocksConfig,
  ): Promise<GetBlocksWithLimitResult> {
    const {commitment} = extractCommitmentFromConfig(commitmentOrConfig);
    const rpcFinality = this._resolveSupportedFinality(commitment);
    const rpcConfig = {commitment: rpcFinality};
    const rpcStartSlot = coerceNumericToBigInt(startSlot, 'startSlot');
    const getBlocksWithLimit = this._typedRpc
      .getBlocksWithLimit as TypedRpcRequestMethod<
      [startSlot: Slot, limit: number, config?: TypedBlocksRequestConfig],
      GetBlocksWithLimitResult
    >;

    try {
      return await getBlocksWithLimit(rpcStartSlot, limit, rpcConfig).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get blocks with limit');
    }
  }

  /**
   * Fetch the amount of cluster stake that has voted on a block.
   */
  async getBlockCommitment(
    slot: number | bigint,
  ): Promise<ReturnType<GetBlockCommitmentApi['getBlockCommitment']>> {
    try {
      return await this._typedRpc
        .getBlockCommitment(coerceNumericToBigInt(slot, 'slot'))
        .send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get block commitment');
    }
  }

  /**
   * Fetch a list of Signatures from the cluster for a block, excluding rewards
   */
  getBlockSignatures(
    slot: number | bigint,
    commitment?: Finality,
  ): Promise<BlockSignatures> {
    return fetchBlockSignaturesFromRpc(
      this._typedRpc,
      slot,
      this._resolveSupportedFinality(commitment),
      `Block ${slot} not found`,
      'failed to get block',
    );
  }

  /**
   * Fetch a list of Signatures from the cluster for a confirmed block, excluding rewards
   *
   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getBlockSignatures} instead.
   */
  getConfirmedBlockSignatures(
    slot: number | bigint,
    commitment?: Finality,
  ): Promise<BlockSignatures> {
    return fetchBlockSignaturesFromRpc(
      this._typedRpc,
      slot,
      this._resolveSupportedFinality(commitment),
      `Confirmed block ${slot} not found`,
      'failed to get confirmed block',
    );
  }

  /**
   * Fetch a transaction details for a confirmed transaction
   *
   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getTransaction} instead.
   */
  async getConfirmedTransaction(
    signature: TransactionSignature,
    commitment?: Finality,
  ): Promise<ConfirmedTransaction | null> {
    const config = {
      commitment: this._resolveSupportedFinality(commitment),
    } satisfies GetVersionedTransactionConfig;
    const result = await this.getTransaction(signature, config);

    if (!result) {
      return null;
    }

    return {
      ...result,
      transaction: Transaction.populate(
        result.transaction.message,
        result.transaction.signatures,
      ),
    };
  }

  /**
   * Fetch parsed transaction details for a confirmed transaction
   *
   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getParsedTransaction} instead.
   */
  getParsedConfirmedTransaction(
    signature: TransactionSignature,
    commitment?: Finality,
  ): Promise<ParsedConfirmedTransaction | null> {
    const config = {
      commitment: this._resolveSupportedFinality(commitment),
    } satisfies GetVersionedTransactionConfig;
    return this.getParsedTransaction(signature, config);
  }

  /**
   * Fetch parsed transaction details for a batch of confirmed transactions
   *
   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getParsedTransactions} instead.
   */
  getParsedConfirmedTransactions(
    signatures: TransactionSignature[],
    commitment?: Finality,
  ): Promise<(ParsedConfirmedTransaction | null)[]> {
    const config = {
      commitment: this._resolveSupportedFinality(commitment),
    } satisfies GetVersionedTransactionConfig;
    return this.getParsedTransactions(signatures, config);
  }

  /**
   * Returns confirmed signatures for transactions involving an
   * address backwards in time from the provided signature or most recent confirmed block
   *
   *
   * @param address queried address
   * @param options
   */
  async getSignaturesForAddress(
    address: Address,
    options?: SignaturesForAddressOptions,
    commitment?: Finality,
  ): Promise<Array<ConfirmedSignatureInfo>> {
    const rpcFinality = this._resolveSupportedFinality(commitment);

    if (options?.before != null) assertIsSignature(options.before);
    if (options?.until != null) assertIsSignature(options.until);

    const rpcConfig = {
      ...(options?.before != null ? {before: options.before} : null),
      commitment: rpcFinality,
      ...(options?.limit != null ? {limit: options.limit} : null),
      ...(options?.minContextSlot != null
        ? {
            minContextSlot: coerceNumericToBigInt(
              options.minContextSlot,
              'minContextSlot',
            ),
          }
        : null),
      ...(options?.until != null ? {until: options.until} : null),
    };

    try {
      const response = await this._typedRpc
        .getSignaturesForAddress(toKitAddress(address), rpcConfig)
        .send();
      return response.map(({signature, ...rest}) => ({signature, ...rest}));
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        'failed to get signatures for address',
      );
    }
  }

  async getAddressLookupTable(
    accountKey: Address,
    config?: GetAccountInfoConfig,
  ): Promise<RpcResponseAndContext<AddressLookupTableAccount | null>> {
    const {context, value: accountInfo} = await this.getAccountInfoAndContext(
      accountKey,
      config,
    );

    let value = null;
    if (accountInfo !== null) {
      value = new AddressLookupTableAccount({
        key: accountKey,
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
    }

    return {
      context,
      value,
    };
  }

  /**
   * Fetch the contents of a Nonce account from the cluster, return with context
   */
  async getNonceAndContext(
    nonceAccount: Address,
    commitmentOrConfig?: Commitment | GetNonceAndContextConfig,
  ): Promise<RpcResponseAndContext<NonceAccount | null>> {
    const {context, value: accountInfo} = await this.getAccountInfoAndContext(
      nonceAccount,
      commitmentOrConfig,
    );

    let value = null;
    if (accountInfo !== null) {
      value = NonceAccount.fromAccountData(accountInfo.data);
    }

    return {
      context,
      value,
    };
  }

  /**
   * Fetch the contents of a Nonce account from the cluster
   */
  async getNonce(
    nonceAccount: Address,
    commitmentOrConfig?: Commitment | GetNonceConfig,
  ): Promise<NonceAccount | null> {
    return await this.getNonceAndContext(nonceAccount, commitmentOrConfig)
      .then(x => x.value)
      .catch(e => {
        throw new Error(
          'failed to get nonce for account ' +
            nonceAccount.toBase58() +
            ': ' +
            e,
        );
      });
  }

  /**
   * Request an allocation of lamports to the specified address
   *
   * ```typescript
   * import { Connection, Address, LAMPORTS_PER_SOL } from "@solana/web3.js";
   *
   * (async () => {
   *   const connection = new Connection("https://api.testnet.solana.com", "confirmed");
   *   const myAddress = new Address("2nr1bHFT86W9tGnyvmYW4vcHKsQB3sVQfnddasz4kExM");
   *   const signature = await connection.requestAirdrop(myAddress, LAMPORTS_PER_SOL);
   *   await connection.confirmTransaction(signature);
   * })();
   * ```
   */
  async requestAirdrop(
    to: Address,
    lamports: number,
    commitmentOrConfig?: Commitment | RequestAirdropConfig,
  ): Promise<TransactionSignature> {
    const {commitment} = extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = this._resolveCommitment(commitment);

    try {
      return await (
        rpcCommitment == null
          ? this._typedRpc.requestAirdrop(
              toKitAddress(to),
              rpcLamports(coerceNumericToBigInt(lamports, 'lamports')),
            )
          : this._typedRpc.requestAirdrop(
              toKitAddress(to),
              rpcLamports(coerceNumericToBigInt(lamports, 'lamports')),
              {
                commitment: rpcCommitment,
              },
            )
      ).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, `airdrop to ${to.toBase58()} failed`);
    }
  }

  /**
   * @internal
   */
  async _blockhashWithExpiryBlockHeight(
    disableCache: boolean,
  ): Promise<BlockhashWithExpiryBlockHeight> {
    if (!disableCache) {
      // Wait for polling to finish
      while (this._pollingBlockhash) {
        await sleep(100);
      }
      const timeSinceFetch = Date.now() - this._blockhashInfo.lastFetch;
      const expired = timeSinceFetch >= BLOCKHASH_CACHE_TIMEOUT_MS;
      if (this._blockhashInfo.latestBlockhash !== null && !expired) {
        return this._blockhashInfo.latestBlockhash;
      }
    }

    return this._pollNewBlockhash();
  }

  /**
   * @internal
   */
  async _pollNewBlockhash(): Promise<BlockhashWithExpiryBlockHeight> {
    this._pollingBlockhash = true;
    try {
      const startTime = Date.now();
      const cachedLatestBlockhash = this._blockhashInfo.latestBlockhash;
      const cachedBlockhash = cachedLatestBlockhash
        ? cachedLatestBlockhash.blockhash
        : null;
      for (let i = 0; i < 50; i++) {
        const latestBlockhashResult =
          await this.getLatestBlockhash('finalized');
        const latestBlockhash: BlockhashWithExpiryBlockHeight = {
          blockhash: latestBlockhashResult.blockhash,
          lastValidBlockHeight: latestBlockhashResult.lastValidBlockHeight,
        };

        if (cachedBlockhash !== latestBlockhash.blockhash) {
          this._blockhashInfo = {
            latestBlockhash,
            lastFetch: Date.now(),
            transactionSignatures: [],
            simulatedSignatures: [],
          };
          return latestBlockhash;
        }

        // Sleep for approximately half a slot
        await sleep(MS_PER_SLOT / 2);
      }

      throw new Error(
        `Unable to obtain a new blockhash after ${Date.now() - startTime}ms`,
      );
    } finally {
      this._pollingBlockhash = false;
    }
  }

  /**
   * get the stake minimum delegation
   */
  async getStakeMinimumDelegation(
    config?: GetStakeMinimumDelegationConfig,
  ): Promise<
    ReturnType<GetStakeMinimumDelegationApi['getStakeMinimumDelegation']>
  > {
    try {
      return await this._typedRpc
        .getStakeMinimumDelegation({
          commitment: this._resolveCommitment(config?.commitment),
        })
        .send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(
        error,
        'failed to get stake minimum delegation',
      );
    }
  }

  /**
   * Simulate a transaction
   *
   * @deprecated Instead, call {@link simulateTransaction} with {@link
   * VersionedTransaction} and {@link SimulateTransactionConfig} parameters
   */
  simulateTransaction(
    transactionOrMessage: Transaction | Message,
    signers?: Array<Signer>,
    includeAccounts?: boolean | Array<Address>,
  ): Promise<RpcResponseAndContext<SimulatedTransactionResponse>>;

  /**
   * Simulate a transaction
   */

  simulateTransaction(
    transaction: VersionedTransaction,
    config?: SimulateTransactionConfig,
  ): Promise<RpcResponseAndContext<SimulatedTransactionResponse>>;

  /**
   * Simulate a transaction
   */

  async simulateTransaction(
    transactionOrMessage: VersionedTransaction | Transaction | Message,
    configOrSigners?: SimulateTransactionConfig | Array<Signer>,
    includeAccounts?: boolean | Array<Address>,
  ): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> {
    let encodedTransaction: string;
    let config: SimulateTransactionConfig;
    let useLegacySimulationError = false;

    if ('message' in transactionOrMessage) {
      const versionedTx = transactionOrMessage;
      const wireTransaction = versionedTx.serialize();
      encodedTransaction = encodeBase64WireData(wireTransaction);
      if (Array.isArray(configOrSigners) || includeAccounts !== undefined) {
        throw new Error('Invalid arguments');
      }

      config = {
        ...(configOrSigners ?? {}),
        commitment: this._resolveCommitment(configOrSigners?.commitment),
      } satisfies SimulateTransactionConfig;
    } else {
      let transaction;
      if (transactionOrMessage instanceof Transaction) {
        const originalTx: Transaction = transactionOrMessage;
        transaction = new Transaction();
        transaction.feePayer = originalTx.feePayer;
        transaction.instructions = transactionOrMessage.instructions;
        transaction.nonceInfo = originalTx.nonceInfo;
        transaction.signatures = originalTx.signatures;
      } else {
        transaction = Transaction.populate(transactionOrMessage);
        // HACK: this function relies on mutating the populated transaction
        transaction._message = transaction._json = undefined;
      }

      if (configOrSigners !== undefined && !Array.isArray(configOrSigners)) {
        throw new Error('Invalid arguments');
      }

      const signers = configOrSigners;
      if (transaction.nonceInfo && signers) {
        await transaction.sign(...signers);
      } else {
        let disableCache = this._disableBlockhashCaching;
        for (;;) {
          const latestBlockhash =
            await this._blockhashWithExpiryBlockHeight(disableCache);
          transaction.lastValidBlockHeight =
            latestBlockhash.lastValidBlockHeight;
          transaction.recentBlockhash = latestBlockhash.blockhash;

          if (!signers) break;

          await transaction.sign(...signers);
          if (!transaction.signature) {
            throw new Error('!signature'); // should never happen
          }

          const signature = encodeBase64WireData(transaction.signature);
          if (
            !this._blockhashInfo.simulatedSignatures.includes(signature) &&
            !this._blockhashInfo.transactionSignatures.includes(signature)
          ) {
            // The signature of this transaction has not been seen before with the
            // current recentBlockhash, all done. Let's break
            this._blockhashInfo.simulatedSignatures.push(signature);
            break;
          } else {
            // This transaction would be treated as duplicate (its derived signature
            // matched to one of already recorded signatures).
            // So, we must fetch a new blockhash for a different signature by disabling
            // our cache not to wait for the cache expiration (BLOCKHASH_CACHE_TIMEOUT_MS).
            disableCache = true;
          }
        }
      }

      const message = transaction._compile();
      const signData = message.serialize();
      const wireTransaction = transaction._serialize(signData);
      encodedTransaction = encodeBase64WireData(wireTransaction);
      config = {commitment: this._resolveCommitment()};

      if (includeAccounts) {
        const addresses = (
          Array.isArray(includeAccounts)
            ? includeAccounts
            : message.nonProgramIds()
        ).map(key => key.toBase58());

        config.accounts = {
          encoding: 'base64',
          addresses,
        };
      }

      if (signers) {
        config.sigVerify = true;
      }

      useLegacySimulationError = true;
    }

    const minContextSlot = coerceOptionalNumericToBigInt(
      config.minContextSlot,
      'minContextSlot',
    );
    assert(
      !(config.sigVerify === true && config.replaceRecentBlockhash === true),
      'sigVerify and replaceRecentBlockhash cannot both be true',
    );

    const rpcConfigBase = {
      encoding: 'base64' as const,
      ...(config.accounts != null
        ? {
            accounts: {
              encoding: 'base64' as const,
              addresses: config.accounts.addresses.map(address =>
                toKitAddress(new Address(address)),
              ),
            },
          }
        : null),
      ...(config.commitment != null ? {commitment: config.commitment} : null),
      ...(config.innerInstructions !== undefined
        ? {innerInstructions: config.innerInstructions}
        : null),
      ...(minContextSlot != null ? {minContextSlot} : null),
    };

    const base64EncodedWireTransaction =
      coerceToBase64EncodedWireTransaction(encodedTransaction);
    const simulateTransaction = this._typedRpc
      .simulateTransaction as TypedRpcRequestMethod<
      [
        transaction: Base64EncodedWireTransaction,
        config: TypedSimulateTransactionRequestConfig,
      ],
      TypedSimulateTransactionResponse
    >;
    const rpcConfig: TypedSimulateTransactionRequestConfig = {
      ...rpcConfigBase,
      ...(config.sigVerify === true
        ? {sigVerify: true}
        : config.replaceRecentBlockhash === true
          ? {replaceRecentBlockhash: true}
          : null),
    };

    try {
      const response = await simulateTransaction(
        base64EncodedWireTransaction,
        rpcConfig,
      ).send();
      return {
        context: response.context,
        value: mapSimulatedTransactionResponseValue(response.value),
      };
    } catch (error) {
      if (!useLegacySimulationError) {
        throw new Error(
          'failed to simulate transaction: ' +
            (isJsonRpcErrorLike(error)
              ? error.message
              : error instanceof Error
                ? error.message
                : String(error)),
        );
      }

      let logs: string[] | undefined;
      const rawLogs = (error as {data?: {logs?: unknown}}).data?.logs;
      if (
        Array.isArray(rawLogs) &&
        rawLogs.every((log): log is string => typeof log === 'string')
      ) {
        logs = rawLogs;
      }
      if (logs) {
        const traceIndent = '\n    ';
        const logTrace = traceIndent + logs.join(traceIndent);
        console.error(
          isJsonRpcErrorLike(error) ? error.message : String(error),
          logTrace,
        );
      }

      throw new SendTransactionError({
        action: 'simulate',
        signature: '',
        transactionMessage: isJsonRpcErrorLike(error)
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error),
        logs: logs,
      });
    }
  }

  /**
   * Sign and send a transaction
   *
   * @deprecated Instead, call {@link sendTransaction} with a {@link
   * VersionedTransaction}
   */
  sendTransaction(
    transaction: Transaction,
    signers: Array<Signer>,
    options?: SendOptions,
  ): Promise<TransactionSignature>;

  /**
   * Send a signed transaction
   */

  sendTransaction(
    transaction: VersionedTransaction,
    options?: SendOptions,
  ): Promise<TransactionSignature>;

  /**
   * Sign and send a transaction
   */

  async sendTransaction(
    transaction: VersionedTransaction | Transaction,
    signersOrOptions?: Array<Signer> | SendOptions,
    options?: SendOptions,
  ): Promise<TransactionSignature> {
    if ('version' in transaction) {
      if (signersOrOptions && Array.isArray(signersOrOptions)) {
        throw new Error('Invalid arguments');
      }

      const wireTransaction = transaction.serialize();
      return this.sendRawTransaction(wireTransaction, signersOrOptions);
    }

    if (signersOrOptions === undefined || !Array.isArray(signersOrOptions)) {
      throw new Error('Invalid arguments');
    }

    const signers = signersOrOptions;
    if (transaction.nonceInfo) {
      await transaction.sign(...signers);
    } else {
      let disableCache = this._disableBlockhashCaching;
      for (;;) {
        const latestBlockhash =
          await this._blockhashWithExpiryBlockHeight(disableCache);
        transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
        transaction.recentBlockhash = latestBlockhash.blockhash;
        await transaction.sign(...signers);
        if (!transaction.signature) {
          throw new Error('!signature'); // should never happen
        }

        const signature = encodeBase64WireData(transaction.signature);
        if (!this._blockhashInfo.transactionSignatures.includes(signature)) {
          // The signature of this transaction has not been seen before with the
          // current recentBlockhash, all done. Let's break
          this._blockhashInfo.transactionSignatures.push(signature);
          break;
        } else {
          // This transaction would be treated as duplicate (its derived signature
          // matched to one of already recorded signatures).
          // So, we must fetch a new blockhash for a different signature by disabling
          // our cache not to wait for the cache expiration (BLOCKHASH_CACHE_TIMEOUT_MS).
          disableCache = true;
        }
      }
    }

    const wireTransaction = await transaction.serialize();
    return this.sendRawTransaction(wireTransaction, options);
  }

  /**
   * Send a transaction that has already been signed and serialized into the
   * wire format
   */
  async sendRawTransaction(
    rawTransaction: Uint8Array | Array<number>,
    options?: SendOptions,
  ): Promise<TransactionSignature> {
    const encodedTransaction = encodeBase64WireData(
      toUint8ArrayView(rawTransaction),
    );
    return await this.sendEncodedTransaction(encodedTransaction, options);
  }

  /**
   * Send a transaction that has already been signed, serialized into the
   * wire format, and encoded as a base64 string
   */
  async sendEncodedTransaction(
    encodedTransaction: string,
    options?: SendOptions,
  ): Promise<TransactionSignature> {
    const skipPreflight = options && options.skipPreflight;
    const preflightCommitment =
      skipPreflight === true
        ? 'processed' // FIXME Remove when https://github.com/anza-xyz/agave/pull/483 is deployed.
        : (options && options.preflightCommitment) || this.commitment;

    const config = {
      encoding: 'base64' as const,
      ...(options?.maxRetries != null
        ? {
            maxRetries: options.maxRetries,
          }
        : null),
      ...(options?.minContextSlot != null
        ? {
            minContextSlot: options.minContextSlot,
          }
        : null),
      ...(skipPreflight ? {skipPreflight} : null),
      ...(preflightCommitment != null ? {preflightCommitment} : null),
    };

    try {
      return await this._typedRpc
        .sendTransaction(
          coerceToBase64EncodedWireTransaction(encodedTransaction),
          config,
        )
        .send();
    } catch (error) {
      const sendTransactionErrorDetails =
        extractSendTransactionErrorDetails(error);
      if (sendTransactionErrorDetails == null) {
        throw error;
      }

      throw new SendTransactionError({
        action: skipPreflight ? 'send' : 'simulate',
        signature: '',
        transactionMessage: sendTransactionErrorDetails.transactionMessage,
        logs: sendTransactionErrorDetails.logs,
      });
    }
  }

  /**
   * @internal
   */
  private _registerSubscription<TKind extends SubscriptionKind>(
    subscriptionConfig: SubscriptionConfigByKind<TKind>,
    dispatchConfig?: Readonly<{
      defaultDispatchConfig?: StoredBlockSubscriptionDispatchConfig;
      dispatchConfig?: StoredBlockSubscriptionDispatchConfig;
    }>,
    /**
     * When preparing `args` for a call to `_registerSubscription`, be sure
     * to carefully apply a default `commitment` property, if necessary.
     *
     * - If the user supplied a `commitment` use that.
     * - Otherwise, if the `Connection::commitment` is set, use that.
     * - Otherwise, set it to the RPC server default: `finalized`.
     *
     * This is extremely important to ensure that these two fundamentally
     * identical subscriptions produce the same identifying hash:
     *
     * - A subscription made without specifying a commitment.
     * - A subscription made where the commitment specified is the same
     *   as the default applied to the subscription above.
     *
     * Example; these two subscriptions must produce the same hash:
     *
     * - An `accountSubscribe` subscription for `'PUBKEY'`
     * - An `accountSubscribe` subscription for `'PUBKEY'` with commitment
     *   `'finalized'`.
     *
     * See the 'making a subscription with defaulted params omitted' test
     * in `connection-subscriptions.ts` for more.
     */
  ): ClientSubscriptionId {
    return this._subscriptionController.registerSubscription(
      subscriptionConfig,
      dispatchConfig,
    );
  }

  /**
   * Wait until an active subscription has either been established or failed.
   *
   * This rejects if the supplied subscription id is not active when
   * observation begins, or if the subscription becomes inactive before setup
   * reaches a terminal state.
   */
  async awaitSubscriptionReady(
    clientSubscriptionId: ClientSubscriptionId,
    config?: SubscriptionReadyConfig,
  ): Promise<void> {
    if (config?.abortSignal?.aborted) {
      throw config.abortSignal.reason;
    }

    let disposeStateChangeObserver: (() => void) | undefined;
    const readinessPromise = new Promise<void>((resolve, reject) => {
      const settleSubscriptionReadiness = (
        nextState: ObservedSubscriptionState,
      ) => {
        if (nextState === 'subscribed') {
          resolve();
          return;
        }
        if (nextState === 'failed') {
          reject(
            new Error(
              `Subscription with id \`${clientSubscriptionId}\` failed to establish.`,
            ),
          );
          return;
        }
        if (nextState === 'inactive') {
          reject(
            new Error(
              `Subscription with id \`${clientSubscriptionId}\` is no longer active.`,
            ),
          );
        }
      };

      const {currentState, dispose} =
        this._subscriptionRegistry.observeStateChanges(
          clientSubscriptionId,
          settleSubscriptionReadiness,
        );
      disposeStateChangeObserver = dispose;
      settleSubscriptionReadiness(currentState);
    });

    try {
      await Promise.race([
        readinessPromise,
        this.getCancellationPromise(config?.abortSignal),
      ]);
    } finally {
      if (disposeStateChangeObserver) {
        disposeStateChangeObserver();
        disposeStateChangeObserver = undefined;
      }
    }
  }

  /**
   * Register a callback to be invoked whenever the specified account changes
   *
   * @param publicKey Public key of the account to monitor
   * @param callback Function to invoke whenever the account is changed
   * @param config
   * @return subscription id
   */
  onAccountChange(
    publicKey: Address,
    callback: ParsedAccountChangeCallback,
    config: AccountSubscriptionParsedConfig,
  ): ClientSubscriptionId;

  onAccountChange(
    publicKey: Address,
    callback: Base64ZstdAccountChangeCallback,
    config: AccountSubscriptionBase64ZstdConfig,
  ): ClientSubscriptionId;

  onAccountChange(
    publicKey: Address,
    callback: AccountChangeCallback,
    config?: AccountSubscriptionBinaryConfig,
  ): ClientSubscriptionId;
  /** @deprecated Instead, pass in an {@link AccountSubscriptionConfig} */

  onAccountChange(
    publicKey: Address,
    callback: AccountChangeCallback,
    commitment?: Commitment,
  ): ClientSubscriptionId;

  onAccountChange(
    publicKey: Address,
    callback: AnyAccountChangeCallback,
    commitmentOrConfig?: Commitment | AccountSubscriptionConfig,
  ): ClientSubscriptionId {
    return this._registerSubscription({
      callback,
      spec: buildAccountSubscriptionSpec(
        publicKey,
        this._resolveSubscriptionConfig(commitmentOrConfig),
      ),
    });
  }

  /**
   * Deregister an account notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeAccountChangeListener(
    clientSubscriptionId: ClientSubscriptionId,
  ): Promise<void> {
    await this._unsubscribeClientSubscription(
      clientSubscriptionId,
      'account change',
    );
  }

  /**
   * Register a callback to be invoked whenever accounts owned by the
   * specified program change
   *
   * @param programId Public key of the program to monitor
   * @param callback Function to invoke whenever the account is changed
   * @param config
   * @return subscription id
   */
  onProgramAccountChange(
    programId: Address,
    callback: ParsedProgramAccountChangeCallback,
    config: ProgramAccountSubscriptionParsedConfig,
  ): ClientSubscriptionId;

  onProgramAccountChange(
    programId: Address,
    callback: Base64ZstdProgramAccountChangeCallback,
    config: ProgramAccountSubscriptionBase64ZstdConfig,
  ): ClientSubscriptionId;

  onProgramAccountChange(
    programId: Address,
    callback: ProgramAccountChangeCallback,
    config?: ProgramAccountSubscriptionBinaryConfig,
  ): ClientSubscriptionId;
  /** @deprecated Instead, pass in a {@link ProgramAccountSubscriptionConfig} */

  onProgramAccountChange(
    programId: Address,
    callback: ProgramAccountChangeCallback,
    commitment?: Commitment,
    filters?: GetProgramAccountsFilter[],
  ): ClientSubscriptionId;

  onProgramAccountChange(
    programId: Address,
    callback: AnyProgramAccountChangeCallback,
    commitmentOrConfig?: Commitment | ProgramAccountSubscriptionConfig,
    maybeFilters?: GetProgramAccountsFilter[],
  ): ClientSubscriptionId {
    return this._registerSubscription({
      callback,
      spec: buildProgramSubscriptionSpec(
        programId,
        this._resolveSubscriptionConfig(commitmentOrConfig),
        maybeFilters,
      ),
    });
  }

  /**
   * Deregister an account notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeProgramAccountChangeListener(
    clientSubscriptionId: ClientSubscriptionId,
  ): Promise<void> {
    await this._unsubscribeClientSubscription(
      clientSubscriptionId,
      'program account change',
    );
  }

  /**
   * Registers a callback to be invoked whenever logs are emitted.
   */
  onLogs(
    filter: LogsFilter,
    callback: LogsCallback,
    commitment?: Commitment,
  ): ClientSubscriptionId {
    return this._registerSubscription({
      callback,
      spec: buildLogsSubscriptionSpec(
        filter,
        this._resolveSubscriptionCommitment(commitment),
      ),
    });
  }

  /**
   * Deregister a logs callback.
   *
   * @param clientSubscriptionId client subscription id to deregister.
   */
  async removeOnLogsListener(
    clientSubscriptionId: ClientSubscriptionId,
  ): Promise<void> {
    await this._unsubscribeClientSubscription(clientSubscriptionId, 'logs');
  }

  /**
   * Register a callback to be invoked upon slot changes
   *
   * @param callback Function to invoke whenever the slot changes
   * @return subscription id
   */
  onSlotChange(callback: SlotChangeCallback): ClientSubscriptionId {
    return this._registerSubscription({
      callback,
      spec: {kind: 'slot'},
    });
  }

  /**
   * Deregister a slot notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeSlotChangeListener(
    clientSubscriptionId: ClientSubscriptionId,
  ): Promise<void> {
    await this._unsubscribeClientSubscription(
      clientSubscriptionId,
      'slot change',
    );
  }

  /**
   * Register a callback to be invoked upon slot updates. {@link SlotUpdate}'s
   * may be useful to track live progress of a cluster.
   *
   * @param callback Function to invoke whenever the slot updates
   * @return subscription id
   */
  onSlotUpdate(callback: SlotUpdateCallback): ClientSubscriptionId {
    return this._registerSubscription({
      callback,
      spec: {kind: 'slotsUpdates'},
    });
  }

  /**
   * Deregister a slot update notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeSlotUpdateListener(
    clientSubscriptionId: ClientSubscriptionId,
  ): Promise<void> {
    await this._unsubscribeClientSubscription(
      clientSubscriptionId,
      'slot update',
    );
  }

  /**
   * @internal
   */

  private async _unsubscribeClientSubscription(
    clientSubscriptionId: ClientSubscriptionId,
    subscriptionName: string,
  ) {
    await this._subscriptionController.removeClientSubscription(
      clientSubscriptionId,
      subscriptionName,
    );
  }

  /**
   * Register a callback to be invoked upon signature updates
   *
   * @param signature Transaction signature string in base 58
   * @param callback Function to invoke on signature notifications
   * @param commitment Specify the commitment level signature must reach before notification
   * @return subscription id
   */
  onSignature(
    signature: TransactionSignature,
    callback: SignatureResultCallback,
    commitment?: Commitment,
  ): ClientSubscriptionId {
    const clientSubscriptionId = this._registerSubscription({
      callback: (notification, context) => {
        if (notification.type !== 'status') {
          return;
        }
        callback(notification.result, context);
        // Signatures subscriptions are auto-removed by the RPC service
        // so no need to explicitly send an unsubscribe message.
        try {
          this.removeSignatureListener(clientSubscriptionId);
        } catch (_err) {
          // Already removed.
        }
      },
      spec: buildSignatureSubscriptionSpec(signature, {
        commitment: this._resolveSubscriptionCommitment(commitment),
      }),
    });
    return clientSubscriptionId;
  }

  /**
   * Register a callback to be invoked when a transaction is
   * received and/or processed.
   *
   * @param signature Transaction signature string in base 58
   * @param callback Function to invoke on signature notifications
   * @param options Enable received notifications and set the commitment
   *   level that signature must reach before notification
   * @return subscription id
   */
  onSignatureWithOptions(
    signature: TransactionSignature,
    callback: SignatureResultCallback,
    options?: SignatureSubscriptionStatusOptions,
  ): ClientSubscriptionId;

  onSignatureWithOptions(
    signature: TransactionSignature,
    callback: SignatureSubscriptionCallback,
    options: SignatureSubscriptionReceivedOptions,
  ): ClientSubscriptionId;

  onSignatureWithOptions(
    signature: TransactionSignature,
    callback: AnySignatureSubscriptionCallback,
    options?: SignatureSubscriptionOptions,
  ): ClientSubscriptionId {
    const clientSubscriptionId = this._registerSubscription({
      callback: (notification, context) => {
        if (options?.enableReceivedNotification !== true) {
          if (notification.type !== 'status') {
            return;
          }
          (callback as SignatureResultCallback)(notification.result, context);
        } else {
          (callback as SignatureSubscriptionCallback)(notification, context);
        }
        // Signatures subscriptions are auto-removed by the RPC service
        // so no need to explicitly send an unsubscribe message.
        try {
          this.removeSignatureListener(clientSubscriptionId);
        } catch (_err) {
          // Already removed.
        }
      },
      spec: buildSignatureSubscriptionSpec(
        signature,
        this._resolveSubscriptionConfig(options),
      ),
    });
    return clientSubscriptionId;
  }

  /**
   * Deregister a signature notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeSignatureListener(
    clientSubscriptionId: ClientSubscriptionId,
  ): Promise<void> {
    await this._unsubscribeClientSubscription(
      clientSubscriptionId,
      'signature result',
    );
  }

  /**
   * Register a callback to be invoked upon root changes
   *
   * @param callback Function to invoke whenever the root changes
   * @return subscription id
   */
  onRootChange(callback: RootChangeCallback): ClientSubscriptionId {
    return this._registerSubscription({
      callback,
      spec: {kind: 'root'},
    });
  }

  /**
   * Deregister a root notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeRootChangeListener(
    clientSubscriptionId: ClientSubscriptionId,
  ): Promise<void> {
    await this._unsubscribeClientSubscription(
      clientSubscriptionId,
      'root change',
    );
  }

  /**
   * Register a callback to be invoked whenever a matching block is observed.
   *
   * This subscription is unstable and requires the validator to be started with
   * `--rpc-pubsub-enable-block-subscription`.
   *
   * @param filter Blocks will only be published if they match this filter
   * @param callback Function to invoke whenever a matching block is published
   * @param config Subscription configuration
   * @return subscription id
   */
  onBlock(
    filter: BlockSubscriptionFilter,
    callback: BlockSubscriptionCallback,
    config?: undefined,
  ): ClientSubscriptionId;

  onBlock(
    filter: BlockSubscriptionFilter,
    callback: BlockSubscriptionAccountsCallback,
    config: BlockSubscriptionAccountsConfig,
  ): ClientSubscriptionId;

  onBlock(
    filter: BlockSubscriptionFilter,
    callback: BlockSubscriptionNoneCallback,
    config: BlockSubscriptionNoneConfig,
  ): ClientSubscriptionId;

  onBlock(
    filter: BlockSubscriptionFilter,
    callback: BlockSubscriptionSignaturesCallback,
    config: BlockSubscriptionSignaturesConfig,
  ): ClientSubscriptionId;

  onBlock(
    filter: BlockSubscriptionFilter,
    callback: BlockSubscriptionBase58Callback,
    config: BlockSubscriptionBase58Config,
  ): ClientSubscriptionId;

  onBlock(
    filter: BlockSubscriptionFilter,
    callback: BlockSubscriptionBase64Callback,
    config: BlockSubscriptionBase64Config,
  ): ClientSubscriptionId;

  onBlock(
    filter: BlockSubscriptionFilter,
    callback: BlockSubscriptionJsonParsedCallback,
    config: BlockSubscriptionJsonParsedConfig,
  ): ClientSubscriptionId;

  onBlock(
    filter: BlockSubscriptionFilter,
    callback: BlockSubscriptionJsonCallback,
    config: BlockSubscriptionJsonConfig,
  ): ClientSubscriptionId;

  onBlock(
    filter: BlockSubscriptionFilter,
    callback: AnyBlockSubscriptionCallback,
    config?: BlockSubscriptionConfig,
  ): ClientSubscriptionId {
    const normalizedConfig = this._resolveSubscriptionConfig(config);
    const {commitment} = normalizedConfig;
    if (commitment !== 'confirmed' && commitment !== 'finalized') {
      throw new Error(
        'Using Connection with default commitment: `' +
          this._commitment +
          '`, but method requires at least `confirmed`',
      );
    }
    return this._registerSubscription(
      {
        callback,
        spec: buildBlockSubscriptionSpec(filter, {
          ...normalizedConfig,
          commitment,
        }),
      },
      config == null
        ? {defaultDispatchConfig: 'default'}
        : {dispatchConfig: config},
    );
  }

  /**
   * Deregister a block notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeBlockListener(
    clientSubscriptionId: ClientSubscriptionId,
  ): Promise<void> {
    await this._unsubscribeClientSubscription(clientSubscriptionId, 'block');
  }

  /**
   * Register a callback to be invoked when a new vote is observed in gossip.
   *
   * This subscription is unstable and requires the validator to be started with
   * `--rpc-pubsub-enable-vote-subscription`.
   *
   * @param callback Function to invoke whenever a vote is observed
   * @return subscription id
   */
  onVote(callback: VoteCallback): ClientSubscriptionId {
    return this._registerSubscription({
      callback,
      spec: {kind: 'vote'},
    });
  }

  /**
   * Deregister a vote notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeVoteListener(
    clientSubscriptionId: ClientSubscriptionId,
  ): Promise<void> {
    await this._unsubscribeClientSubscription(clientSubscriptionId, 'vote');
  }
}
