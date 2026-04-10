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
  type Subscription,
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

export type RpcWebSocketLogsNotification =
  RpcWebSocketSubscriptionNotification<
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

export type RpcWebSocketSlotNotification =
  RpcWebSocketSubscriptionNotification<
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
      type: 'completed' | 'firstShredReceived' | 'optimisticConfirmation' | 'root';
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

export type RpcWebSocketVoteNotification =
  RpcWebSocketSubscriptionNotification<
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

export type AnyRpcWebSocketNotification =
  RpcWebSocketNotificationByKind[keyof RpcWebSocketNotificationByKind];

type BlockSubscriptionOptions =
  Parameters<UnstableSubscriptions['blockNotifications']>[1];

type LogsSubscriptionOptions =
  Parameters<StableSubscriptions['logsNotifications']>[1];

type SignatureSubscriptionOptions =
  Parameters<StableSubscriptions['signatureNotifications']>[1];

export type AccountSubscriptionOptions = Readonly<{
  commitment?: Commitment;
  encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed';
}>;

export type ProgramSubscriptionOptions = Readonly<{
  commitment?: Commitment;
  encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed';
  filters?: readonly Readonly<
    GetProgramAccountsDatasizeFilter | GetProgramAccountsMemcmpFilter
  >[];
}>;

export type AccountSubscriptionSpec = Readonly<{
  address: string;
  kind: 'account';
  options?: AccountSubscriptionOptions;
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
  options?: ProgramSubscriptionOptions;
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

export type SubscriptionSpec =
  | AccountSubscriptionSpec
  | BlockSubscriptionSpec
  | LogsSubscriptionSpec
  | ProgramSubscriptionSpec
  | RootSubscriptionSpec
  | SignatureSubscriptionSpec
  | SlotSubscriptionSpec
  | SlotsUpdatesSubscriptionSpec
  | VoteSubscriptionSpec;

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

export type SubscriptionChannel = SubscriptionTransportChannel<unknown, unknown>;

function resolveSubscriptionChannelConfig(
  config?: SubscriptionChannelConfig,
): ResolvedSubscriptionChannelConfig {
  return Object.freeze({
    intervalMs: config?.intervalMs ?? DEFAULT_SUBSCRIPTION_CHANNEL_CONFIG.intervalMs,
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
  subscribe(config: Readonly<{abortSignal: AbortSignal}>): Promise<
    AsyncIterable<TResult>
  >;
};

type NotificationOpener<TTarget, TConfig, TResult> = (
  target: TTarget,
  config?: TConfig,
) => NotificationStream<TResult>;

type ConnectionSubscriptionsRuntimeCallbacks = Readonly<{
  onConnected(): void;
  onDisconnected(code: number): void;
}>;

export type ConnectionSubscriptionsNotificationHandlers = Readonly<{
  account(notification: RpcWebSocketAccountNotification): void;
  block(notification: RpcWebSocketBlockNotification): void;
  logs(notification: RpcWebSocketLogsNotification): void;
  program(notification: RpcWebSocketProgramNotification): void;
  root(notification: RpcWebSocketRootNotification): void;
  signature(notification: RpcWebSocketSignatureNotification): void;
  slot(notification: RpcWebSocketSlotNotification): void;
  slotsUpdates(notification: RpcWebSocketSlotsUpdatesNotification): void;
  vote(notification: RpcWebSocketVoteNotification): void;
}>;

export type ConnectionSubscriptionsNotificationPublishers = Readonly<{
  account(
    result: RpcWebSocketAccountNotification['result'],
    serverSubscriptionId: ServerSubscriptionId,
  ): void;
  block(
    result: RpcWebSocketBlockNotification['result'],
    serverSubscriptionId: ServerSubscriptionId,
  ): void;
  logs(
    result: RpcWebSocketLogsNotification['result'],
    serverSubscriptionId: ServerSubscriptionId,
  ): void;
  program(
    result: RpcWebSocketProgramNotification['result'],
    serverSubscriptionId: ServerSubscriptionId,
  ): void;
  root(
    result: RpcWebSocketRootNotification['result'],
    serverSubscriptionId: ServerSubscriptionId,
  ): void;
  signature(
    result: RpcWebSocketSignatureNotification['result'],
    serverSubscriptionId: ServerSubscriptionId,
  ): void;
  slot(
    result: RpcWebSocketSlotNotification['result'],
    serverSubscriptionId: ServerSubscriptionId,
  ): void;
  slotsUpdates(
    result: RpcWebSocketSlotsUpdatesNotification['result'],
    serverSubscriptionId: ServerSubscriptionId,
  ): void;
  vote(
    result: RpcWebSocketVoteNotification['result'],
    serverSubscriptionId: ServerSubscriptionId,
  ): void;
}>;

export const createSubscriptionNotificationPublishers = (
  handlers: ConnectionSubscriptionsNotificationHandlers,
): ConnectionSubscriptionsNotificationPublishers => ({
  account: (result, serverSubscriptionId) => {
    handlers.account({result, subscription: serverSubscriptionId});
  },
  block: (result, serverSubscriptionId) => {
    handlers.block({result, subscription: serverSubscriptionId});
  },
  logs: (result, serverSubscriptionId) => {
    handlers.logs({result, subscription: serverSubscriptionId});
  },
  program: (result, serverSubscriptionId) => {
    handlers.program({result, subscription: serverSubscriptionId});
  },
  root: (result, serverSubscriptionId) => {
    handlers.root({result, subscription: serverSubscriptionId});
  },
  signature: (result, serverSubscriptionId) => {
    handlers.signature({result, subscription: serverSubscriptionId});
  },
  slot: (result, serverSubscriptionId) => {
    handlers.slot({result, subscription: serverSubscriptionId});
  },
  slotsUpdates: (result, serverSubscriptionId) => {
    handlers.slotsUpdates({result, subscription: serverSubscriptionId});
  },
  vote: (result, serverSubscriptionId) => {
    handlers.vote({result, subscription: serverSubscriptionId});
  },
});

export interface ConnectionSubscriptionsRuntime {
  readonly channel: SubscriptionChannel | null;
  readonly connectionGeneration: AbortController | null;
  cancelIdleClose(): void;
  ensureConnected(): void;
  openSubscription(subscription: Subscription): Promise<SubscriptionHandle>;
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
    private readonly _publishNotification: ConnectionSubscriptionsNotificationPublishers,
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

  openSubscription(
    subscription: Subscription,
  ): Promise<SubscriptionHandle> {
    const {abortController, serverSubscriptionId} =
      this._subscriptionRegistry.createServerSubscription();
    const startSubscription = async <TResult>(
      notificationStream: Promise<AsyncIterable<TResult>>,
      publishNotification: (
        result: TResult,
        subscription: ServerSubscriptionId,
      ) => void,
    ): Promise<SubscriptionHandle> => {
      const stream = await notificationStream;
      return this._createSubscriptionHandle(
        stream,
        serverSubscriptionId,
        abortController,
        result => {
          publishNotification(result, serverSubscriptionId);
        },
      );
    };

    try {
      switch (subscription.kind) {
        case 'account': {
          const typedAddress = subscription.spec.address;
          assertIsAddress(typedAddress);
          const openAccountNotifications = this._stableSubscriptions
            .accountNotifications as NotificationOpener<
            KitAddress,
            AccountSubscriptionOptions,
            RpcWebSocketAccountNotification['result']
          >;
          const notificationStream = openAccountNotifications(
            typedAddress,
            subscription.spec.options,
          ).subscribe({abortSignal: abortController.signal});
          return startSubscription(
            notificationStream,
            (result, serverSubscription) => {
              this._publishNotification.account(result, serverSubscription);
            },
          );
        }

        case 'block': {
          let filter: Parameters<UnstableSubscriptions['blockNotifications']>[0];
          if (subscription.spec.filter !== 'all') {
            assertIsAddress(subscription.spec.filter.mentionsAccountOrProgram);
            filter = {
              mentionsAccountOrProgram:
                subscription.spec.filter.mentionsAccountOrProgram,
            };
          } else {
            filter = 'all';
          }
          return startSubscription(
            this._unstableSubscriptions
              .blockNotifications(filter, subscription.spec.options)
              .subscribe({abortSignal: abortController.signal}),
            (result, serverSubscription) => {
              this._publishNotification.block(result, serverSubscription);
            },
          );
        }

        case 'logs': {
          const openLogsNotifications = this._stableSubscriptions
            .logsNotifications as NotificationOpener<
            'all' | 'allWithVotes' | Readonly<{mentions: readonly [KitAddress]}>,
            Parameters<StableSubscriptions['logsNotifications']>[1],
            RpcWebSocketLogsNotification['result']
          >;
          const filter =
            subscription.spec.filter === 'all' ||
            subscription.spec.filter === 'allWithVotes'
              ? subscription.spec.filter
              : (() => {
                  const address = subscription.spec.filter.mentions[0];
                  assertIsAddress(address);
                  return {mentions: [address] as const};
                })();
          return startSubscription(
            openLogsNotifications(filter, subscription.spec.options).subscribe({
              abortSignal: abortController.signal,
            }),
            (result, serverSubscription) => {
              this._publishNotification.logs(result, serverSubscription);
            },
          );
        }

        case 'program': {
          const typedAddress = subscription.spec.address;
          assertIsAddress(typedAddress);
          const openProgramNotifications = this._stableSubscriptions
            .programNotifications as NotificationOpener<
            KitAddress,
            ProgramSubscriptionOptions,
            RpcWebSocketProgramNotification['result']
          >;
          const notificationStream = openProgramNotifications(
            typedAddress,
            subscription.spec.options,
          ).subscribe({abortSignal: abortController.signal});
          return startSubscription(
            notificationStream,
            (result, serverSubscription) => {
              this._publishNotification.program(result, serverSubscription);
            },
          );
        }

        case 'root': {
          return startSubscription(
            this._stableSubscriptions
              .rootNotifications()
              .subscribe({abortSignal: abortController.signal}),
            (result, serverSubscription) => {
              this._publishNotification.root(result, serverSubscription);
            },
          );
        }

        case 'signature': {
          const typedSignature = subscription.spec.signature;
          assertIsSignature(typedSignature);
          return startSubscription(
            this._stableSubscriptions
              .signatureNotifications(typedSignature, subscription.spec.options)
              .subscribe({abortSignal: abortController.signal}),
            (result, serverSubscription) => {
              this._publishNotification.signature(result, serverSubscription);
            },
          );
        }

        case 'slot': {
          return startSubscription(
            this._stableSubscriptions
              .slotNotifications()
              .subscribe({abortSignal: abortController.signal}),
            (result, serverSubscription) => {
              this._publishNotification.slot(result, serverSubscription);
            },
          );
        }

        case 'slotsUpdates': {
          return startSubscription(
            this._unstableSubscriptions
              .slotsUpdatesNotifications()
              .subscribe({abortSignal: abortController.signal}),
            (result, serverSubscription) => {
              this._publishNotification.slotsUpdates(result, serverSubscription);
            },
          );
        }

        case 'vote': {
          return startSubscription(
            this._unstableSubscriptions
              .voteNotifications()
              .subscribe({abortSignal: abortController.signal}),
            (result, serverSubscription) => {
              this._publishNotification.vote(result, serverSubscription);
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

  private _createSubscriptionHandle<TResult>(
    iterable: AsyncIterable<TResult>,
    serverSubscriptionId: ServerSubscriptionId,
    abortController: AbortController,
    onNotification: (result: TResult) => void,
  ): SubscriptionHandle {
    void (async () => {
      try {
        for await (const result of iterable) {
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
