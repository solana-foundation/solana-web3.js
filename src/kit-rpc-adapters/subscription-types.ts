/**
 * Boundary: Connection's public subscription type surface.
 *
 * This module defines the declarative config, callback, and result types that
 * Connection exposes for subscriptions. The request-spec builders,
 * notification adapters, and controller align to these types, while the
 * runtime and registry own the operational mechanics.
 */
import type {
  Base64EncodedZStdCompressedDataResponse,
  Commitment,
} from '@solana/rpc-types';

import type {Address} from '../address';
import type {
  AccountInfoWithSpace,
  BlockSubscriptionAccountsModeBlockResponse,
  BlockSubscriptionBase58BlockResponse,
  BlockSubscriptionBase64BlockResponse,
  BlockSubscriptionJsonBlockResponse,
  BlockSubscriptionJsonParsedBlockResponse,
  Context,
  Finality,
  GetProgramAccountsFilter,
  GetVersionedBlockConfig,
  KeyedAccountInfo,
  Logs,
  ParsedAccountData,
  SignatureReceivedNotification,
  SignatureResult,
  SignatureStatusNotification,
  SlotInfo,
  SlotUpdate,
  VersionedNoneModeBlockResponse,
  VersionedSignaturesModeBlockResponse,
  Vote,
} from '../connection';

export type AccountSubscriptionConfig = Readonly<{
  commitment?: Commitment;
  encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed';
}>;

export type AccountSubscriptionBinaryConfig = Readonly<{
  commitment?: Commitment;
  encoding?: 'base58' | 'base64';
}>;

export type AccountSubscriptionBase64ZstdConfig = Readonly<{
  commitment?: Commitment;
  encoding: 'base64+zstd';
}>;

export type AccountSubscriptionParsedConfig = Readonly<{
  commitment?: Commitment;
  encoding: 'jsonParsed';
}>;

export type ProgramAccountSubscriptionConfig = Readonly<{
  commitment?: Commitment;
  encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed';
  filters?: ReadonlyArray<GetProgramAccountsFilter>;
}>;

export type ProgramAccountSubscriptionBinaryConfig = Readonly<{
  commitment?: Commitment;
  encoding?: 'base58' | 'base64';
  filters?: ProgramAccountSubscriptionConfig['filters'];
}>;

export type ProgramAccountSubscriptionBase64ZstdConfig = Readonly<{
  commitment?: Commitment;
  encoding: 'base64+zstd';
  filters?: ProgramAccountSubscriptionConfig['filters'];
}>;

export type ProgramAccountSubscriptionParsedConfig = Readonly<{
  commitment?: Commitment;
  encoding: 'jsonParsed';
  filters?: ProgramAccountSubscriptionConfig['filters'];
}>;

export type AccountChangeCallback = (
  accountInfo: AccountInfoWithSpace<Uint8Array>,
  context: Context,
) => void;

export type ParsedAccountChangeCallback = (
  accountInfo: AccountInfoWithSpace<Uint8Array | ParsedAccountData>,
  context: Context,
) => void;

export type Base64ZstdAccountChangeCallback = (
  accountInfo: AccountInfoWithSpace<Base64EncodedZStdCompressedDataResponse>,
  context: Context,
) => void;

export type ProgramAccountChangeCallback = (
  keyedAccountInfo: KeyedAccountInfo,
  context: Context,
) => void;

export type ParsedProgramAccountChangeCallback = (
  keyedAccountInfo: KeyedAccountInfo<Uint8Array | ParsedAccountData>,
  context: Context,
) => void;

export type Base64ZstdProgramAccountChangeCallback = (
  keyedAccountInfo: KeyedAccountInfo<Base64EncodedZStdCompressedDataResponse>,
  context: Context,
) => void;

export type SlotChangeCallback = (slotInfo: SlotInfo) => void;

export type SlotUpdateCallback = (slotUpdate: SlotUpdate) => void;

export type SignatureResultCallback = (
  signatureResult: SignatureResult,
  context: Context,
) => void;

export type SignatureSubscriptionCallback = (
  notification: SignatureStatusNotification | SignatureReceivedNotification,
  context: Context,
) => void;

export type SignatureSubscriptionStatusOptions = {
  commitment?: Commitment;
  enableReceivedNotification?: false;
};

export type SignatureSubscriptionReceivedOptions = {
  commitment?: Commitment;
  enableReceivedNotification: true;
};

export type SignatureSubscriptionOptions =
  | SignatureSubscriptionStatusOptions
  | SignatureSubscriptionReceivedOptions;

export type RootChangeCallback = (root: bigint) => void;

export type VoteCallback = (vote: Vote) => void;

export type LogsFilter = Address | 'all' | 'allWithVotes';

export type LogsCallback = (logs: Logs, ctx: Context) => void;

export type BlockSubscriptionFilter = Address | 'all';

export type BlockSubscriptionEncoding =
  | 'base58'
  | 'base64'
  | 'json'
  | 'jsonParsed';

export type BlockSubscriptionTransactionDetails = NonNullable<
  GetVersionedBlockConfig['transactionDetails']
>;

export type BlockSubscriptionConfig = Readonly<{
  commitment?: Finality;
  encoding?: BlockSubscriptionEncoding;
  maxSupportedTransactionVersion?: GetVersionedBlockConfig['maxSupportedTransactionVersion'];
  rewards?: boolean;
  transactionDetails?: BlockSubscriptionTransactionDetails;
}>;

export type BlockSubscriptionAccountsConfig = BlockSubscriptionConfig &
  Readonly<{
    transactionDetails: 'accounts';
  }>;

export type BlockSubscriptionNoneConfig = BlockSubscriptionConfig &
  Readonly<{
    transactionDetails: 'none';
  }>;

export type BlockSubscriptionSignaturesConfig = BlockSubscriptionConfig &
  Readonly<{
    transactionDetails: 'signatures';
  }>;

export type BlockSubscriptionBase58Config = BlockSubscriptionConfig &
  Readonly<{
    encoding: 'base58';
    transactionDetails?: 'full';
  }>;

export type BlockSubscriptionBase64Config = BlockSubscriptionConfig &
  Readonly<{
    encoding: 'base64';
    transactionDetails?: 'full';
  }>;

export type BlockSubscriptionJsonParsedConfig = BlockSubscriptionConfig &
  Readonly<{
    encoding: 'jsonParsed';
    transactionDetails?: 'full';
  }>;

export type BlockSubscriptionJsonConfig = BlockSubscriptionConfig &
  Readonly<{
    encoding?: 'json';
    transactionDetails?: 'full';
  }>;

export type BlockNotificationBlock =
  | BlockSubscriptionAccountsModeBlockResponse
  | BlockSubscriptionBase58BlockResponse
  | BlockSubscriptionBase64BlockResponse
  | BlockSubscriptionJsonBlockResponse
  | BlockSubscriptionJsonParsedBlockResponse
  | VersionedNoneModeBlockResponse
  | VersionedSignaturesModeBlockResponse;

export type BlockNotificationResult = {
  block: BlockNotificationBlock | null;
  err: string | null;
  slot: bigint;
};

export type BlockSubscriptionAccountsResult = BlockNotificationResult & {
  block: BlockSubscriptionAccountsModeBlockResponse | null;
};

export type BlockSubscriptionNoneResult = BlockNotificationResult & {
  block: VersionedNoneModeBlockResponse | null;
};

export type BlockSubscriptionSignaturesResult = BlockNotificationResult & {
  block: VersionedSignaturesModeBlockResponse | null;
};

export type BlockSubscriptionBase58Result = BlockNotificationResult & {
  block: BlockSubscriptionBase58BlockResponse | null;
};

export type BlockSubscriptionBase64Result = BlockNotificationResult & {
  block: BlockSubscriptionBase64BlockResponse | null;
};

export type BlockSubscriptionJsonParsedResult = BlockNotificationResult & {
  block: BlockSubscriptionJsonParsedBlockResponse | null;
};

export type BlockSubscriptionJsonResult = BlockNotificationResult & {
  block: BlockSubscriptionJsonBlockResponse | null;
};

export type BlockSubscriptionAccountsCallback = (
  block: BlockSubscriptionAccountsResult,
  context: Context,
) => void;

export type BlockSubscriptionNoneCallback = (
  block: BlockSubscriptionNoneResult,
  context: Context,
) => void;

export type BlockSubscriptionSignaturesCallback = (
  block: BlockSubscriptionSignaturesResult,
  context: Context,
) => void;

export type BlockSubscriptionBase58Callback = (
  block: BlockSubscriptionBase58Result,
  context: Context,
) => void;

export type BlockSubscriptionBase64Callback = (
  block: BlockSubscriptionBase64Result,
  context: Context,
) => void;

export type BlockSubscriptionJsonParsedCallback = (
  block: BlockSubscriptionJsonParsedResult,
  context: Context,
) => void;

export type BlockSubscriptionJsonCallback = (
  block: BlockSubscriptionJsonResult,
  context: Context,
) => void;

export type BlockSubscriptionCallback = (
  block: BlockNotificationResult,
  context: Context,
) => void;
