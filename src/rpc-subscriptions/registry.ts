import type {
  AccountSubscriptionSpec,
  BlockSubscriptionSpec,
  LogsSubscriptionSpec,
  ProgramSubscriptionSpec,
  RootSubscriptionSpec,
  SignatureSubscriptionSpec,
  SlotSubscriptionSpec,
  SlotsUpdatesSubscriptionSpec,
  VoteSubscriptionSpec,
} from './runtime';

type SubscriptionCallback = (...args: any[]) => void;

export type ClientSubscriptionId = number;

type ClientSubscriptionRecord = Readonly<{
  callback: SubscriptionCallback;
  hash: SubscriptionConfigHash;
}>;

export type ServerSubscriptionId = number;
export type SubscriptionConfigHash = string;

export type SubscriptionHandle = Readonly<{
  serverSubscriptionId: ServerSubscriptionId;
  unsubscribe(): Promise<boolean>;
}>;

type BaseSubscription<TKind = SubscriptionConfig['kind']> = Readonly<{
  callbacks: Set<Extract<SubscriptionConfig, {kind: TKind}>['callback']>;
  kind: TKind;
  spec: Extract<SubscriptionConfig, {kind: TKind}>['spec'];
}>;

export type StatefulSubscription = Readonly<
  | {
      state: 'pending';
    }
  | {
      state: 'subscribing';
    }
  | {
      serverSubscriptionId: ServerSubscriptionId;
      state: 'subscribed';
      subscriptionHandle: SubscriptionHandle;
    }
  | {
      serverSubscriptionId: ServerSubscriptionId;
      state: 'unsubscribing';
      subscriptionHandle: SubscriptionHandle;
    }
  | {
      serverSubscriptionId: ServerSubscriptionId;
      state: 'unsubscribed';
    }
>;

export type SubscriptionStateChangeCallback = (
  nextState: StatefulSubscription['state'],
) => void;

export type SubscriptionConfig = Readonly<
  | {
      callback: SubscriptionCallback;
      kind: 'account';
      spec: AccountSubscriptionSpec;
    }
  | {
      callback: SubscriptionCallback;
      kind: 'block';
      spec: BlockSubscriptionSpec;
    }
  | {
      callback: SubscriptionCallback;
      kind: 'logs';
      spec: LogsSubscriptionSpec;
    }
  | {
      callback: SubscriptionCallback;
      kind: 'program';
      spec: ProgramSubscriptionSpec;
    }
  | {
      callback: SubscriptionCallback;
      kind: 'root';
      spec: RootSubscriptionSpec;
    }
  | {
      callback: SubscriptionCallback;
      kind: 'signature';
      spec: SignatureSubscriptionSpec;
    }
  | {
      callback: SubscriptionCallback;
      kind: 'slot';
      spec: SlotSubscriptionSpec;
    }
  | {
      callback: SubscriptionCallback;
      kind: 'slotsUpdates';
      spec: SlotsUpdatesSubscriptionSpec;
    }
  | {
      callback: SubscriptionCallback;
      kind: 'vote';
      spec: VoteSubscriptionSpec;
    }
>;

export type Subscription = {
  [TKind in SubscriptionConfig['kind']]: BaseSubscription<TKind> &
    StatefulSubscription;
}[SubscriptionConfig['kind']];

export class ConnectionSubscriptionRegistry<TBlockDispatchConfig> {
  private _blockDispatchConfigByHash: Partial<
    Record<SubscriptionConfigHash, TBlockDispatchConfig>
  > = {};
  private _blockDispatchConfigByServerId: Partial<
    Record<ServerSubscriptionId, TBlockDispatchConfig>
  > = {};
  private _clientSubscriptionsById: Partial<
    Record<ClientSubscriptionId, ClientSubscriptionRecord>
  > = {};
  private _nextClientSubscriptionId = 0;
  private _nextServerSubscriptionId = 0;
  private readonly _abortControllersByServerId =
    new Map<ServerSubscriptionId, AbortController>();
  private readonly _callbacksByServerId: Partial<
    Record<ServerSubscriptionId, Set<SubscriptionConfig['callback']>>
  > = {};
  private readonly _stateChangeCallbacksByHash: Partial<
    Record<SubscriptionConfigHash, Set<SubscriptionStateChangeCallback>>
  > = {};
  private readonly _autoDisposedServerSubscriptions =
    new Set<ServerSubscriptionId>();
  private readonly _subscriptionsByHash: Partial<
    Record<SubscriptionConfigHash, Subscription>
  > = {};

  addSubscriptionCallback(
    hash: SubscriptionConfigHash,
    callback: SubscriptionConfig['callback'],
    pendingSubscription: Subscription,
  ): void {
    const existingSubscription = this._subscriptionsByHash[hash];
    if (existingSubscription == null) {
      this.setSubscription(hash, pendingSubscription);
      return;
    }
    (
      existingSubscription.callbacks as Set<SubscriptionConfig['callback']>
    ).add(callback);
  }

  attachBlockDispatchConfigToServerId(
    hash: SubscriptionConfigHash,
    serverSubscriptionId: ServerSubscriptionId,
  ): void {
    const dispatchConfig = this._blockDispatchConfigByHash[hash];
    if (dispatchConfig !== undefined) {
      this._blockDispatchConfigByServerId[serverSubscriptionId] =
        dispatchConfig;
    }
  }

  consumeAutoDisposedSubscription(
    serverSubscriptionId: ServerSubscriptionId,
  ): boolean {
    if (!this._autoDisposedServerSubscriptions.has(serverSubscriptionId)) {
      return false;
    }
    this._autoDisposedServerSubscriptions.delete(serverSubscriptionId);
    return true;
  }

  createClientSubscription(
    hash: SubscriptionConfigHash,
    callback: SubscriptionConfig['callback'],
  ): ClientSubscriptionId {
    const clientSubscriptionId =
      this._nextClientSubscriptionId++ as ClientSubscriptionId;
    this._clientSubscriptionsById[clientSubscriptionId] = {callback, hash};
    return clientSubscriptionId;
  }

  createServerSubscription(): Readonly<{
    abortController: AbortController;
    serverSubscriptionId: ServerSubscriptionId;
  }> {
    const abortController = new AbortController();
    const serverSubscriptionId =
      (++this._nextServerSubscriptionId) as ServerSubscriptionId;
    this._abortControllersByServerId.set(
      serverSubscriptionId,
      abortController,
    );
    return {abortController, serverSubscriptionId};
  }

  deleteServerSubscription(serverSubscriptionId: ServerSubscriptionId): void {
    this._abortControllersByServerId.delete(
      serverSubscriptionId,
    );
  }

  dispatchNotification<TActualCallback extends (...args: any[]) => void>(
    serverSubscriptionId: ServerSubscriptionId,
    callbackArgs: Parameters<TActualCallback>,
  ): void {
    const callbacks = this._callbacksByServerId[
      serverSubscriptionId
    ] as Set<TActualCallback> | undefined;
    if (callbacks == null) {
      return;
    }
    callbacks.forEach(callback => {
      try {
        callback(...callbackArgs);
      } catch (error) {
        console.error(error);
      }
    });
  }

  getBlockDispatchConfig(
    hash: SubscriptionConfigHash,
  ): TBlockDispatchConfig | undefined {
    return this._blockDispatchConfigByHash[hash];
  }

  getBlockDispatchConfigForServerId(
    serverSubscriptionId: ServerSubscriptionId,
  ): TBlockDispatchConfig | undefined {
    return this._blockDispatchConfigByServerId[
      serverSubscriptionId
    ];
  }

  getSubscription(hash: SubscriptionConfigHash): Subscription | undefined {
    return this._subscriptionsByHash[hash];
  }

  getSubscriptionHashes(): SubscriptionConfigHash[] {
    return Object.keys(this._subscriptionsByHash) as SubscriptionConfigHash[];
  }

  hasSubscriptions(): boolean {
    return this.getSubscriptionHashes().length > 0;
  }

  hasServerSubscription(serverSubscriptionId: ServerSubscriptionId): boolean {
    return this._abortControllersByServerId.has(
      serverSubscriptionId,
    );
  }

  markAutoDisposedSubscription(
    serverSubscriptionId: ServerSubscriptionId,
  ): void {
    this._autoDisposedServerSubscriptions.add(serverSubscriptionId);
  }

  observeStateChanges(
    clientSubscriptionId: ClientSubscriptionId,
    callback: SubscriptionStateChangeCallback,
  ): () => void {
    const hash = this._clientSubscriptionsById[clientSubscriptionId]?.hash;
    if (hash == null) {
      return () => {};
    }
    const stateChangeCallbacks =
      (this._stateChangeCallbacksByHash[hash] ??= new Set());
    stateChangeCallbacks.add(callback);
    const currentState = this._subscriptionsByHash[hash]?.state;
    if (currentState !== undefined) {
      try {
        callback(currentState);
      } catch {
        // Ignore observer errors so registry updates continue.
      }
    }
    return () => {
      stateChangeCallbacks.delete(callback);
      if (stateChangeCallbacks.size === 0) {
        delete this._stateChangeCallbacksByHash[hash];
      }
    };
  }

  abortServerSubscription(serverSubscriptionId: ServerSubscriptionId): boolean {
    const abortController =
      this._abortControllersByServerId.get(
        serverSubscriptionId,
      );
    if (abortController == null) {
      return false;
    }
    this._abortControllersByServerId.delete(
      serverSubscriptionId,
    );
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
    return true;
  }

  abortAllServerSubscriptions(): void {
    for (const serverSubscriptionId of this
      ._abortControllersByServerId.keys()) {
      this.abortServerSubscription(serverSubscriptionId);
    }
  }

  pruneSubscription(hash: SubscriptionConfigHash): void {
    const subscription = this._subscriptionsByHash[hash];
    if (subscription == null) {
      return;
    }
    if ('serverSubscriptionId' in subscription) {
      delete this._callbacksByServerId[
        subscription.serverSubscriptionId
      ];
      delete this._blockDispatchConfigByServerId[
        subscription.serverSubscriptionId
      ];
      this._autoDisposedServerSubscriptions.delete(
        subscription.serverSubscriptionId,
      );
    }
    delete this._subscriptionsByHash[hash];
    delete this._blockDispatchConfigByHash[hash];
    delete this._stateChangeCallbacksByHash[hash];
  }

  removeClientSubscription(
    clientSubscriptionId: ClientSubscriptionId,
  ): ClientSubscriptionRecord | undefined {
    const clientSubscription = this._clientSubscriptionsById[clientSubscriptionId];
    if (clientSubscription != null) {
      delete this._clientSubscriptionsById[clientSubscriptionId];
    }
    return clientSubscription;
  }

  removeSubscriptionCallback(
    hash: SubscriptionConfigHash,
    callback: SubscriptionConfig['callback'],
  ): boolean {
    const subscription = this._subscriptionsByHash[hash];
    if (subscription == null) {
      return false;
    }
    (subscription.callbacks as Set<SubscriptionConfig['callback']>).delete(
      callback,
    );
    return true;
  }

  setDefaultBlockDispatchConfig(
    hash: SubscriptionConfigHash,
    dispatchConfig: TBlockDispatchConfig,
  ): void {
    this._blockDispatchConfigByHash[hash] ??= dispatchConfig;
  }

  setBlockDispatchConfig(
    hash: SubscriptionConfigHash,
    dispatchConfig: TBlockDispatchConfig,
  ): void {
    this._blockDispatchConfigByHash[hash] = dispatchConfig;
  }

  setSubscription(
    hash: SubscriptionConfigHash,
    nextSubscription: Subscription,
  ): void {
    const prevSubscription = this._subscriptionsByHash[hash];
    const prevState = prevSubscription?.state;
    if (
      prevSubscription != null &&
      'serverSubscriptionId' in prevSubscription &&
      (nextSubscription.state === 'unsubscribed' ||
        !('serverSubscriptionId' in nextSubscription) ||
        nextSubscription.serverSubscriptionId !==
          prevSubscription.serverSubscriptionId)
    ) {
      delete this._callbacksByServerId[
        prevSubscription.serverSubscriptionId
      ];
      delete this._blockDispatchConfigByServerId[
        prevSubscription.serverSubscriptionId
      ];
      this._autoDisposedServerSubscriptions.delete(
        prevSubscription.serverSubscriptionId,
      );
    }
    this._subscriptionsByHash[hash] = nextSubscription;
    if ('serverSubscriptionId' in nextSubscription) {
      this._callbacksByServerId[
        nextSubscription.serverSubscriptionId
      ] = nextSubscription.callbacks;
    }
    if (prevState !== nextSubscription.state) {
      this._stateChangeCallbacksByHash[hash]?.forEach(callback => {
        try {
          callback(nextSubscription.state);
        } catch {
          // Ignore observer errors so registry updates continue.
        }
      });
    }
  }
}