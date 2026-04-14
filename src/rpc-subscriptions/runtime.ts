/**
 * Boundary: Kit websocket transport -> internal subscription events.
 *
 * This module opens and maintains Solana Kit websocket subscriptions and emits
 * typed notification and lifecycle events for the controller. It consumes
 * normalized subscription specs from the Connection edge and deliberately does
 * not own callback dispatch or durable subscription state.
 */
import {assertIsAddress, type Address as KitAddress} from '@solana/addresses';
import {assertIsSignature, type Signature} from '@solana/keys';
import {
  createDefaultSolanaRpcSubscriptionsChannelCreator,
  createSolanaRpcSubscriptions,
  createSolanaRpcSubscriptions_UNSTABLE,
  type RpcSubscriptions as SubscriptionClient,
  type RpcSubscriptionsChannel as SubscriptionTransportChannel,
  type RpcSubscriptionsChannelCreator as SubscriptionChannelCreator,
} from '@solana/rpc-subscriptions';
import type {
  SolanaRpcSubscriptionsApi,
  SolanaRpcSubscriptionsApiUnstable,
} from '@solana/rpc-subscriptions-api';
import type {
  AccountInfoBase,
  AccountInfoWithBase58Bytes,
  AccountInfoWithBase58EncodedData,
  AccountInfoWithBase64EncodedData,
  AccountInfoWithBase64EncodedZStdCompressedData,
  AccountInfoWithJsonData,
  AccountInfoWithPubkey,
  Blockhash,
  Commitment,
  GetProgramAccountsDatasizeFilter,
  GetProgramAccountsMemcmpFilter,
  Slot,
  SolanaRpcResponse,
  TransactionError,
  UnixTimestamp,
} from '@solana/rpc-types';

import {
  ConnectionSubscriptionRegistry,
  type SubscriptionHandle,
  type ServerSubscriptionId,
} from './registry';

const SUBSCRIPTION_CHANNEL_CLOSE_CODE_NORMAL = 1000;
const SUBSCRIPTION_CHANNEL_CLOSE_CODE_UNEXPECTED = 1006;
const SUBSCRIPTION_CHANNEL_IDLE_CLOSE_DELAY_MS = 500;

type StableSubscriptions = SubscriptionClient<SolanaRpcSubscriptionsApi>;

type UnstableSubscriptions = SubscriptionClient<
  SolanaRpcSubscriptionsApi & SolanaRpcSubscriptionsApiUnstable
>;

type RpcWebSocketSubscriptionNotification<TResult> = Readonly<{
  result: TResult;
  subscription: number;
}>;

type RpcWebSocketAccountData =
  | AccountInfoWithBase58Bytes
  | AccountInfoWithBase58EncodedData
  | AccountInfoWithBase64EncodedData
  | AccountInfoWithBase64EncodedZStdCompressedData
  | AccountInfoWithJsonData;

export type RpcWebSocketAccountInfo = AccountInfoBase &
  RpcWebSocketAccountData &
  Readonly<{
    rentEpoch?: bigint;
  }>;

export type RpcWebSocketAccountNotification =
  RpcWebSocketSubscriptionNotification<
    SolanaRpcResponse<RpcWebSocketAccountInfo>
  >;

export type RpcWebSocketProgramNotification =
  RpcWebSocketSubscriptionNotification<
    SolanaRpcResponse<AccountInfoWithPubkey<RpcWebSocketAccountInfo>>
  >;

export type RpcWebSocketLogsNotification = RpcWebSocketSubscriptionNotification<
  SolanaRpcResponse<
    Readonly<{
      err: TransactionError | null;
      logs: readonly string[];
      signature: Signature;
    }>
  >
>;

export type RpcWebSocketSignatureNotificationResult =
  | 'receivedSignature'
  | Readonly<{
      err: TransactionError | null;
    }>;

export type RpcWebSocketSignatureNotification =
  RpcWebSocketSubscriptionNotification<
    SolanaRpcResponse<RpcWebSocketSignatureNotificationResult>
  >;

export type RpcWebSocketSlotNotification = RpcWebSocketSubscriptionNotification<
  Readonly<{
    parent: Slot;
    root: Slot;
    slot: Slot;
  }>
>;

export type RpcWebSocketSlotUpdate =
  | Readonly<{
      slot: Slot;
      timestamp: bigint;
      type:
        | 'completed'
        | 'firstShredReceived'
        | 'optimisticConfirmation'
        | 'root';
    }>
  | Readonly<{
      parent: Slot;
      slot: Slot;
      timestamp: bigint;
      type: 'createdBank';
    }>
  | Readonly<{
      err: string;
      slot: Slot;
      timestamp: bigint;
      type: 'dead';
    }>
  | Readonly<{
      slot: Slot;
      stats: Readonly<{
        maxTransactionsPerEntry: bigint;
        numFailedTransactions: bigint;
        numSuccessfulTransactions: bigint;
        numTransactionEntries: bigint;
      }>;
      timestamp: bigint;
      type: 'frozen';
    }>;

export type RpcWebSocketSlotsUpdatesNotification =
  RpcWebSocketSubscriptionNotification<RpcWebSocketSlotUpdate>;

export type RpcWebSocketRootNotification =
  RpcWebSocketSubscriptionNotification<Slot>;

export type RpcWebSocketBlockNotification =
  RpcWebSocketSubscriptionNotification<
    SolanaRpcResponse<
      Readonly<{
        block: object | null;
        err: string | null;
        slot: Slot;
      }>
    >
  >;

export type RpcWebSocketVoteNotification = RpcWebSocketSubscriptionNotification<
  Readonly<{
    hash: Blockhash;
    signature: Signature;
    slots: readonly Slot[];
    timestamp: UnixTimestamp | null;
    votePubkey: KitAddress;
  }>
>;

export type RpcWebSocketNotificationByKind = {
  account: RpcWebSocketAccountNotification;
  block: RpcWebSocketBlockNotification;
  logs: RpcWebSocketLogsNotification;
  program: RpcWebSocketProgramNotification;
  root: RpcWebSocketRootNotification;
  signature: RpcWebSocketSignatureNotification;
  slot: RpcWebSocketSlotNotification;
  slotsUpdates: RpcWebSocketSlotsUpdatesNotification;
  vote: RpcWebSocketVoteNotification;
};

type RpcWebSocketNotificationKind = keyof RpcWebSocketNotificationByKind;

export type AnyRpcWebSocketNotification =
  RpcWebSocketNotificationByKind[RpcWebSocketNotificationKind];

type BlockSubscriptionOptions = Parameters<
  UnstableSubscriptions['blockNotifications']
>[1];

type LogsSubscriptionOptions = Parameters<
  StableSubscriptions['logsNotifications']
>[1];

type SignatureSubscriptionOptions = Parameters<
  StableSubscriptions['signatureNotifications']
>[1];

export type AccountSubscriptionSpec = Readonly<{
  address: string;
  kind: 'account';
  options?: Readonly<{
    commitment?: Commitment;
    encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed';
  }>;
}>;

export type BlockSubscriptionSpec = Readonly<{
  filter: 'all' | Readonly<{mentionsAccountOrProgram: string}>;
  kind: 'block';
  options?: BlockSubscriptionOptions;
}>;

export type LogsSubscriptionSpec = Readonly<{
  filter: 'all' | 'allWithVotes' | Readonly<{mentions: readonly [string]}>;
  kind: 'logs';
  options?: LogsSubscriptionOptions;
}>;

export type ProgramSubscriptionSpec = Readonly<{
  address: string;
  kind: 'program';
  options?: Readonly<{
    commitment?: Commitment;
    encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed';
    filters?: readonly Readonly<
      GetProgramAccountsDatasizeFilter | GetProgramAccountsMemcmpFilter
    >[];
  }>;
}>;

export type RootSubscriptionSpec = Readonly<{
  kind: 'root';
}>;

export type SignatureSubscriptionSpec = Readonly<{
  kind: 'signature';
  options?: SignatureSubscriptionOptions;
  signature: string;
}>;

export type SlotSubscriptionSpec = Readonly<{
  kind: 'slot';
}>;

export type SlotsUpdatesSubscriptionSpec = Readonly<{
  kind: 'slotsUpdates';
}>;

export type VoteSubscriptionSpec = Readonly<{
  kind: 'vote';
}>;

export type SubscriptionSpecByKind = {
  account: AccountSubscriptionSpec;
  block: BlockSubscriptionSpec;
  logs: LogsSubscriptionSpec;
  program: ProgramSubscriptionSpec;
  root: RootSubscriptionSpec;
  signature: SignatureSubscriptionSpec;
  slot: SlotSubscriptionSpec;
  slotsUpdates: SlotsUpdatesSubscriptionSpec;
  vote: VoteSubscriptionSpec;
};

export type SubscriptionKind = keyof SubscriptionSpecByKind;

export type SubscriptionSpec = SubscriptionSpecByKind[SubscriptionKind];

export type SubscriptionChannelConfig = Readonly<{
  intervalMs?: number;
  maxSubscriptionsPerChannel?: number;
  minChannels?: number;
}>;

type ResolvedSubscriptionChannelConfig = Readonly<{
  intervalMs: number;
  maxSubscriptionsPerChannel: number;
  minChannels: number;
}>;

export const DEFAULT_SUBSCRIPTION_CHANNEL_CONFIG = Object.freeze({
  intervalMs: 5000,
  maxSubscriptionsPerChannel: Number.MAX_SAFE_INTEGER,
  minChannels: 1,
});

export type SubscriptionChannel = SubscriptionTransportChannel<
  unknown,
  unknown
>;

function resolveSubscriptionChannelConfig(
  config?: SubscriptionChannelConfig,
): ResolvedSubscriptionChannelConfig {
  return Object.freeze({
    intervalMs:
      config?.intervalMs ?? DEFAULT_SUBSCRIPTION_CHANNEL_CONFIG.intervalMs,
    maxSubscriptionsPerChannel:
      config?.maxSubscriptionsPerChannel ??
      DEFAULT_SUBSCRIPTION_CHANNEL_CONFIG.maxSubscriptionsPerChannel,
    minChannels:
      config?.minChannels ?? DEFAULT_SUBSCRIPTION_CHANNEL_CONFIG.minChannels,
  });
}

export const createSubscriptionChannel = (
  endpoint: string,
  config: ResolvedSubscriptionChannelConfig,
): SubscriptionChannelCreator<unknown, unknown> =>
  createDefaultSolanaRpcSubscriptionsChannelCreator({
    ...config,
    url: endpoint,
  });

type NotificationStream<TResult> = {
  subscribe(
    config: Readonly<{abortSignal: AbortSignal}>,
  ): Promise<AsyncIterable<TResult>>;
};

type NotificationOpener<TTarget, TConfig, TResult> = (
  target: TTarget,
  config?: TConfig,
) => NotificationStream<TResult>;

type ConnectionSubscriptionsRuntimeCallbacks = Readonly<{
  onConnected(): void;
  onDisconnected(code: number): void;
}>;

export type RpcWebSocketNotificationEvent<
  TKind extends RpcWebSocketNotificationKind = RpcWebSocketNotificationKind,
> = TKind extends RpcWebSocketNotificationKind
  ? Readonly<{
      kind: TKind;
      notification: RpcWebSocketNotificationByKind[TKind];
    }>
  : never;

export type ConnectionSubscriptionsNotificationDispatcher = (
  notification: RpcWebSocketNotificationEvent,
) => void;

export interface ConnectionSubscriptionsRuntime {
  readonly channel: SubscriptionChannel | null;
  readonly connectionGeneration: AbortController | null;
  cancelIdleClose(): void;
  ensureConnected(): void;
  openSubscription(spec: SubscriptionSpec): Promise<SubscriptionHandle>;
  scheduleIdleClose(): void;
}

export class KitSubscriptionRuntime<TBlockDispatchConfig>
  implements ConnectionSubscriptionsRuntime
{
  private _channel: SubscriptionChannel | null = null;
  private _channelAbortController: AbortController | null = null;
  private _channelIdleTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly _createSubscriptionChannel: ReturnType<
    typeof createSubscriptionChannel
  >;
  private readonly _stableSubscriptions: StableSubscriptions;
  private readonly _unstableSubscriptions: UnstableSubscriptions;

  constructor(
    endpoint: string,
    private readonly _subscriptionRegistry: ConnectionSubscriptionRegistry<TBlockDispatchConfig>,
    private readonly _callbacks: ConnectionSubscriptionsRuntimeCallbacks,
    private readonly _dispatchNotification: ConnectionSubscriptionsNotificationDispatcher,
    subscriptionChannelConfig?: SubscriptionChannelConfig,
  ) {
    const resolvedSubscriptionChannelConfig = resolveSubscriptionChannelConfig(
      subscriptionChannelConfig,
    );
    this._createSubscriptionChannel = createSubscriptionChannel(
      endpoint,
      resolvedSubscriptionChannelConfig,
    );
    this._stableSubscriptions = createSolanaRpcSubscriptions(
      endpoint,
      resolvedSubscriptionChannelConfig,
    );
    this._unstableSubscriptions = createSolanaRpcSubscriptions_UNSTABLE(
      endpoint,
      resolvedSubscriptionChannelConfig,
    );
  }

  get channel(): SubscriptionChannel | null {
    return this._channel;
  }

  get connectionGeneration(): AbortController | null {
    return this._channelAbortController;
  }

  cancelIdleClose(): void {
    if (this._channelIdleTimeout !== null) {
      clearTimeout(this._channelIdleTimeout);
      this._channelIdleTimeout = null;
    }
  }

  ensureConnected(): void {
    if (this._channelAbortController !== null) {
      return;
    }

    const abortController = new AbortController();
    this._channelAbortController = abortController;
    void this._createSubscriptionChannel({
      abortSignal: abortController.signal,
    })
      .then(channel => {
        if (
          this._channelAbortController !== abortController ||
          abortController.signal.aborted
        ) {
          return;
        }
        this._channel = channel;
        channel.on(
          'error',
          error => {
            if (this._channelAbortController !== abortController) {
              return;
            }
            this._disconnectChannel(
              SUBSCRIPTION_CHANNEL_CLOSE_CODE_UNEXPECTED,
              error instanceof Error ? error : new Error(String(error)),
            );
          },
          {signal: abortController.signal},
        );
        this._callbacks.onConnected();
      })
      .catch(error => {
        if (
          this._channelAbortController !== abortController ||
          abortController.signal.aborted
        ) {
          return;
        }
        this._disconnectChannel(
          SUBSCRIPTION_CHANNEL_CLOSE_CODE_UNEXPECTED,
          error instanceof Error ? error : new Error(String(error)),
        );
      });
  }

  openSubscription(spec: SubscriptionSpec): Promise<SubscriptionHandle> {
    const {abortController, serverSubscriptionId} =
      this._subscriptionRegistry.createServerSubscription();
    const abortSignal = abortController.signal;

    try {
      switch (spec.kind) {
        case 'account': {
          const typedAddress = spec.address;
          assertIsAddress(typedAddress);
          const openAccountNotifications = this._stableSubscriptions
            .accountNotifications as NotificationOpener<
            KitAddress,
            NonNullable<AccountSubscriptionSpec['options']>,
            RpcWebSocketAccountNotification['result']
          >;
          const notificationStream = openAccountNotifications(
            typedAddress,
            spec.options,
          ).subscribe({abortSignal});
          return this._createSubscriptionHandle(
            notificationStream,
            serverSubscriptionId,
            abortController,
            result => {
              this._dispatchNotification({
                kind: 'account',
                notification: {
                  result,
                  subscription: serverSubscriptionId,
                },
              });
            },
          );
        }

        case 'block': {
          let filter: Parameters<
            UnstableSubscriptions['blockNotifications']
          >[0];
          if (spec.filter !== 'all') {
            assertIsAddress(spec.filter.mentionsAccountOrProgram);
            filter = {
              mentionsAccountOrProgram: spec.filter.mentionsAccountOrProgram,
            };
          } else {
            filter = 'all';
          }
          return this._createSubscriptionHandle(
            this._unstableSubscriptions
              .blockNotifications(filter, spec.options)
              .subscribe({abortSignal}),
            serverSubscriptionId,
            abortController,
            result => {
              this._dispatchNotification({
                kind: 'block',
                notification: {
                  result,
                  subscription: serverSubscriptionId,
                },
              });
            },
          );
        }

        case 'logs': {
          const openLogsNotifications = this._stableSubscriptions
            .logsNotifications as NotificationOpener<
            | 'all'
            | 'allWithVotes'
            | Readonly<{mentions: readonly [KitAddress]}>,
            Parameters<StableSubscriptions['logsNotifications']>[1],
            RpcWebSocketLogsNotification['result']
          >;
          const filter =
            spec.filter === 'all' || spec.filter === 'allWithVotes'
              ? spec.filter
              : (() => {
                  const address = spec.filter.mentions[0];
                  assertIsAddress(address);
                  return {mentions: [address] as const};
                })();
          return this._createSubscriptionHandle(
            openLogsNotifications(filter, spec.options).subscribe({
              abortSignal,
            }),
            serverSubscriptionId,
            abortController,
            result => {
              this._dispatchNotification({
                kind: 'logs',
                notification: {
                  result,
                  subscription: serverSubscriptionId,
                },
              });
            },
          );
        }

        case 'program': {
          const typedAddress = spec.address;
          assertIsAddress(typedAddress);
          const openProgramNotifications = this._stableSubscriptions
            .programNotifications as NotificationOpener<
            KitAddress,
            NonNullable<ProgramSubscriptionSpec['options']>,
            RpcWebSocketProgramNotification['result']
          >;
          const notificationStream = openProgramNotifications(
            typedAddress,
            spec.options,
          ).subscribe({abortSignal});
          return this._createSubscriptionHandle(
            notificationStream,
            serverSubscriptionId,
            abortController,
            result => {
              this._dispatchNotification({
                kind: 'program',
                notification: {
                  result,
                  subscription: serverSubscriptionId,
                },
              });
            },
          );
        }

        case 'root': {
          return this._createSubscriptionHandle(
            this._stableSubscriptions
              .rootNotifications()
              .subscribe({abortSignal}),
            serverSubscriptionId,
            abortController,
            result => {
              this._dispatchNotification({
                kind: 'root',
                notification: {
                  result,
                  subscription: serverSubscriptionId,
                },
              });
            },
          );
        }

        case 'signature': {
          const typedSignature = spec.signature;
          assertIsSignature(typedSignature);
          return this._createSubscriptionHandle(
            this._stableSubscriptions
              .signatureNotifications(typedSignature, spec.options)
              .subscribe({abortSignal}),
            serverSubscriptionId,
            abortController,
            result => {
              this._dispatchNotification({
                kind: 'signature',
                notification: {
                  result,
                  subscription: serverSubscriptionId,
                },
              });
            },
          );
        }

        case 'slot': {
          return this._createSubscriptionHandle(
            this._stableSubscriptions
              .slotNotifications()
              .subscribe({abortSignal}),
            serverSubscriptionId,
            abortController,
            result => {
              this._dispatchNotification({
                kind: 'slot',
                notification: {
                  result,
                  subscription: serverSubscriptionId,
                },
              });
            },
          );
        }

        case 'slotsUpdates': {
          return this._createSubscriptionHandle(
            this._unstableSubscriptions
              .slotsUpdatesNotifications()
              .subscribe({abortSignal}),
            serverSubscriptionId,
            abortController,
            result => {
              this._dispatchNotification({
                kind: 'slotsUpdates',
                notification: {
                  result,
                  subscription: serverSubscriptionId,
                },
              });
            },
          );
        }

        case 'vote': {
          return this._createSubscriptionHandle(
            this._unstableSubscriptions
              .voteNotifications()
              .subscribe({abortSignal}),
            serverSubscriptionId,
            abortController,
            result => {
              this._dispatchNotification({
                kind: 'vote',
                notification: {
                  result,
                  subscription: serverSubscriptionId,
                },
              });
            },
          );
        }
      }
    } catch (error) {
      this._subscriptionRegistry.deleteServerSubscription(serverSubscriptionId);
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
      throw error;
    }
  }

  scheduleIdleClose(): void {
    if (this._channel === null || this._channelIdleTimeout !== null) {
      return;
    }

    this._channelIdleTimeout = setTimeout(() => {
      this._channelIdleTimeout = null;
      this._disconnectChannel(SUBSCRIPTION_CHANNEL_CLOSE_CODE_NORMAL);
    }, SUBSCRIPTION_CHANNEL_IDLE_CLOSE_DELAY_MS);
  }

  private async _createSubscriptionHandle<TResult>(
    stream: Promise<AsyncIterable<TResult>>,
    serverSubscriptionId: ServerSubscriptionId,
    abortController: AbortController,
    onNotification: (result: TResult) => void,
  ): Promise<SubscriptionHandle> {
    const notificationStream = await stream;
    void (async () => {
      try {
        for await (const result of notificationStream) {
          if (
            abortController.signal.aborted ||
            !this._subscriptionRegistry.hasServerSubscription(
              serverSubscriptionId,
            )
          ) {
            return;
          }
          onNotification(result);
        }
      } catch (error) {
        if (
          abortController.signal.aborted ||
          !this._subscriptionRegistry.hasServerSubscription(
            serverSubscriptionId,
          )
        ) {
          return;
        }
        const normalizedError =
          error instanceof Error ? error : new Error(String(error));
        if (this._channel !== null) {
          this._disconnectChannel(
            SUBSCRIPTION_CHANNEL_CLOSE_CODE_UNEXPECTED,
            normalizedError,
          );
        } else {
          console.error('ws error:', normalizedError.message);
        }
        return;
      }

      this._subscriptionRegistry.abortServerSubscription(serverSubscriptionId);
    })();

    return {
      serverSubscriptionId,
      unsubscribe: () =>
        Promise.resolve(
          this._subscriptionRegistry.abortServerSubscription(
            serverSubscriptionId,
          ),
        ),
    };
  }

  private _disconnectChannel(code: number, error?: Error): void {
    const abortController = this._channelAbortController;
    this._channel = null;
    this._channelAbortController = null;
    this.cancelIdleClose();
    if (abortController != null && !abortController.signal.aborted) {
      abortController.abort();
    }
    if (error != null) {
      console.error('ws error:', error.message);
    }
    this._subscriptionRegistry.abortAllServerSubscriptions();
    this._callbacks.onDisconnected(code);
  }
}
