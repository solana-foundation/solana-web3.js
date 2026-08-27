/**
 * Boundary: internal subscription state store.
 *
 * This module stores the durable bookkeeping shared across the subscription
 * subsystem: client registrations, server subscription handles, callback
 * sets, dispatch config, and state observers. The controller drives
 * transitions against it, while the runtime uses it only for server-side
 * subscription bookkeeping.
 */
import type {SubscriptionKind, SubscriptionSpecByKind} from './runtime';

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

type BaseSubscription<TKind extends SubscriptionKind = SubscriptionKind> =
  Readonly<{
    callbacks: Set<SubscriptionCallback>;
    spec: SubscriptionSpecByKind[TKind];
  }>;

export type StatefulSubscription = Readonly<
  | {
      state: 'pending';
    }
  | {
      state: 'failed';
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

export type ObservedSubscriptionState =
  | StatefulSubscription['state']
  | 'inactive';

export type SubscriptionStateChangeCallback = (
  nextState: ObservedSubscriptionState,
) => void;

type SubscriptionStateObservation = Readonly<{
  currentState: ObservedSubscriptionState;
  dispose(): void;
}>;

export type SubscriptionConfigByKind<
  TKind extends SubscriptionKind = SubscriptionKind,
> = Readonly<{
  callback: SubscriptionCallback;
  spec: SubscriptionSpecByKind[TKind];
}>;

export type SubscriptionConfig = {
  [TKind in SubscriptionKind]: SubscriptionConfigByKind<TKind>;
}[SubscriptionKind];

export type Subscription = {
  [TKind in SubscriptionKind]: BaseSubscription<TKind> & StatefulSubscription;
}[SubscriptionKind];

export type PendingSubscription<
  TKind extends SubscriptionKind = SubscriptionKind,
> = BaseSubscription<TKind> & Readonly<{state: 'pending'}>;


type StoredSubscription<
  TKind extends SubscriptionKind = SubscriptionKind,
  TState extends StatefulSubscription = StatefulSubscription,
> = BaseSubscription<TKind> & TState;

export class ConnectionSubscriptionRegistry<TBlockDispatchConfig> {
  private readonly _blockDispatchConfigByHash = new Map<
    SubscriptionConfigHash,
    TBlockDispatchConfig
  >();
  private readonly _blockDispatchConfigByServerId = new Map<
    ServerSubscriptionId,
    TBlockDispatchConfig
  >();
  private readonly _clientSubscriptionsById = new Map<
    ClientSubscriptionId,
    ClientSubscriptionRecord
  >();
  private _nextClientSubscriptionId = 0;
  private _nextServerSubscriptionId = 0;
  private readonly _abortControllersByServerId = new Map<
    ServerSubscriptionId,
    AbortController
  >();
  private readonly _callbacksByServerId = new Map<
    ServerSubscriptionId,
    Set<SubscriptionConfig['callback']>
  >();
  private readonly _stateChangeCallbacksByHash = new Map<
    SubscriptionConfigHash,
    Set<SubscriptionStateChangeCallback>
  >();
  private readonly _stateChangeCallbacksByClientSubscriptionId = new Map<
    ClientSubscriptionId,
    Set<SubscriptionStateChangeCallback>
  >();
  private readonly _autoDisposedServerSubscriptions =
    new Set<ServerSubscriptionId>();
  private readonly _subscriptionsByHash = new Map<
    SubscriptionConfigHash,
    Subscription
  >();

  addSubscriptionCallback<TKind extends SubscriptionKind>(
    hash: SubscriptionConfigHash,
    callback: SubscriptionConfig['callback'],
    spec: SubscriptionSpecByKind[TKind],
  ): void {
    const existingSubscription = this._subscriptionsByHash.get(hash);
    if (existingSubscription == null) {
      this.setSubscription(hash, {
        callbacks: new Set([callback]),
        spec,
        state: 'pending',
      });
      return;
    }
    (existingSubscription.callbacks as Set<SubscriptionConfig['callback']>).add(
      callback,
    );
    if (existingSubscription.state === 'failed') {
      this.setSubscription(hash, {
        callbacks: existingSubscription.callbacks,
        spec: existingSubscription.spec,
        state: 'pending',
      });
    }
  }

  attachBlockDispatchConfigToServerId(
    hash: SubscriptionConfigHash,
    serverSubscriptionId: ServerSubscriptionId,
  ): void {
    const dispatchConfig = this._blockDispatchConfigByHash.get(hash);
    if (dispatchConfig !== undefined) {
      this._blockDispatchConfigByServerId.set(
        serverSubscriptionId,
        dispatchConfig,
      );
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
    const clientSubscriptionId = this
      ._nextClientSubscriptionId++ as ClientSubscriptionId;
    this._clientSubscriptionsById.set(clientSubscriptionId, {callback, hash});
    return clientSubscriptionId;
  }

  createServerSubscription(): Readonly<{
    abortController: AbortController;
    serverSubscriptionId: ServerSubscriptionId;
  }> {
    const abortController = new AbortController();
    const serverSubscriptionId = ++this
      ._nextServerSubscriptionId as ServerSubscriptionId;
    this._abortControllersByServerId.set(serverSubscriptionId, abortController);
    return {abortController, serverSubscriptionId};
  }

  deleteServerSubscription(serverSubscriptionId: ServerSubscriptionId): void {
    this._abortControllersByServerId.delete(serverSubscriptionId);
  }

  dispatchNotification<TActualCallback extends (...args: any[]) => void>(
    serverSubscriptionId: ServerSubscriptionId,
    callbackArgs: Parameters<TActualCallback>,
  ): void {
    const callbacks = this._callbacksByServerId.get(serverSubscriptionId) as
      | Set<TActualCallback>
      | undefined;
    if (callbacks == null) {
      return;
    }
    callbacks.forEach(callback => {
      try {
        callback(...callbackArgs);
      } catch (error) {
        console.error(
          'Subscription notification callback failed',
          {
            serverSubscriptionId,
          },
          error,
        );
      }
    });
  }

  getBlockDispatchConfig(
    hash: SubscriptionConfigHash,
  ): TBlockDispatchConfig | undefined {
    return this._blockDispatchConfigByHash.get(hash);
  }

  getBlockDispatchConfigForServerId(
    serverSubscriptionId: ServerSubscriptionId,
  ): TBlockDispatchConfig | undefined {
    return this._blockDispatchConfigByServerId.get(serverSubscriptionId);
  }

  getSubscription(hash: SubscriptionConfigHash): Subscription | undefined {
    return this._subscriptionsByHash.get(hash);
  }

  getSubscriptionHashes(): SubscriptionConfigHash[] {
    return [...this._subscriptionsByHash.keys()];
  }

  hasSubscriptions(): boolean {
    return this.getSubscriptionHashes().length > 0;
  }

  hasServerSubscription(serverSubscriptionId: ServerSubscriptionId): boolean {
    return this._abortControllersByServerId.has(serverSubscriptionId);
  }

  markAutoDisposedSubscription(
    serverSubscriptionId: ServerSubscriptionId,
  ): void {
    this._autoDisposedServerSubscriptions.add(serverSubscriptionId);
  }

  /** @internal */
  observeStateChanges(
    clientSubscriptionId: ClientSubscriptionId,
    callback: SubscriptionStateChangeCallback,
  ): SubscriptionStateObservation {
    const hash = this._clientSubscriptionsById.get(clientSubscriptionId)?.hash;
    if (hash == null) {
      return {
        currentState: 'inactive',
        dispose: () => {},
      };
    }
    const stateChangeCallbacks =
      this._stateChangeCallbacksByHash.get(hash) ?? new Set();
    this._stateChangeCallbacksByHash.set(hash, stateChangeCallbacks);
    stateChangeCallbacks.add(callback);

    const clientStateChangeCallbacks =
      this._stateChangeCallbacksByClientSubscriptionId.get(
        clientSubscriptionId,
      ) ?? new Set();
    this._stateChangeCallbacksByClientSubscriptionId.set(
      clientSubscriptionId,
      clientStateChangeCallbacks,
    );
    clientStateChangeCallbacks.add(callback);

    const currentState =
      this._subscriptionsByHash.get(hash)?.state ?? 'inactive';

    return {
      currentState,
      dispose: () => {
        stateChangeCallbacks.delete(callback);
        if (stateChangeCallbacks.size === 0) {
          this._stateChangeCallbacksByHash.delete(hash);
        }
        clientStateChangeCallbacks.delete(callback);
        if (clientStateChangeCallbacks.size === 0) {
          this._stateChangeCallbacksByClientSubscriptionId.delete(
            clientSubscriptionId,
          );
        }
      },
    };
  }

  abortServerSubscription(serverSubscriptionId: ServerSubscriptionId): boolean {
    const abortController =
      this._abortControllersByServerId.get(serverSubscriptionId);
    if (abortController == null) {
      return false;
    }
    this._abortControllersByServerId.delete(serverSubscriptionId);
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
    return true;
  }

  abortAllServerSubscriptions(): void {
    for (const serverSubscriptionId of this._abortControllersByServerId.keys()) {
      this.abortServerSubscription(serverSubscriptionId);
    }
  }

  pruneSubscription(hash: SubscriptionConfigHash): void {
    const subscription = this._subscriptionsByHash.get(hash);
    if (subscription == null) {
      return;
    }
    if ('serverSubscriptionId' in subscription) {
      this._callbacksByServerId.delete(subscription.serverSubscriptionId);
      this._blockDispatchConfigByServerId.delete(
        subscription.serverSubscriptionId,
      );
      this._autoDisposedServerSubscriptions.delete(
        subscription.serverSubscriptionId,
      );
    }
    this._stateChangeCallbacksByHash.get(hash)?.forEach(callback => {
      try {
        callback('inactive');
      } catch (error) {
        console.error(
          'Subscription state observer transition callback failed',
          {
            hash,
            state: 'inactive',
          },
          error,
        );
      }
    });
    this._subscriptionsByHash.delete(hash);
    this._blockDispatchConfigByHash.delete(hash);
    this._stateChangeCallbacksByHash.delete(hash);
  }

  removeClientSubscription(
    clientSubscriptionId: ClientSubscriptionId,
  ): ClientSubscriptionRecord | undefined {
    const clientSubscription =
      this._clientSubscriptionsById.get(clientSubscriptionId);
    if (clientSubscription != null) {
      this._clientSubscriptionsById.delete(clientSubscriptionId);
      const clientStateChangeCallbacks =
        this._stateChangeCallbacksByClientSubscriptionId.get(
          clientSubscriptionId,
        );
      if (clientStateChangeCallbacks != null) {
        this._stateChangeCallbacksByClientSubscriptionId.delete(
          clientSubscriptionId,
        );
        const stateChangeCallbacks = this._stateChangeCallbacksByHash.get(
          clientSubscription.hash,
        );
        clientStateChangeCallbacks.forEach(callback => {
          stateChangeCallbacks?.delete(callback);
          try {
            callback('inactive');
          } catch (error) {
            console.error(
              'Subscription state observer transition callback failed',
              {
                hash: clientSubscription.hash,
                state: 'inactive',
              },
              error,
            );
          }
        });
        if (stateChangeCallbacks?.size === 0) {
          this._stateChangeCallbacksByHash.delete(clientSubscription.hash);
        }
      }
    }
    return clientSubscription;
  }

  removeSubscriptionCallback(
    hash: SubscriptionConfigHash,
    callback: SubscriptionConfig['callback'],
  ): boolean {
    const subscription = this._subscriptionsByHash.get(hash);
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
    if (!this._blockDispatchConfigByHash.has(hash)) {
      this._blockDispatchConfigByHash.set(hash, dispatchConfig);
    }
  }

  setBlockDispatchConfig(
    hash: SubscriptionConfigHash,
    dispatchConfig: TBlockDispatchConfig,
  ): void {
    this._blockDispatchConfigByHash.set(hash, dispatchConfig);
  }

  setSubscription<
    TKind extends SubscriptionKind,
    TState extends StatefulSubscription,
  >(
    hash: SubscriptionConfigHash,
    nextSubscription: StoredSubscription<TKind, TState>,
  ): void {
    const prevSubscription = this._subscriptionsByHash.get(hash);
    const prevState = prevSubscription?.state;
    if (
      prevSubscription != null &&
      'serverSubscriptionId' in prevSubscription &&
      (nextSubscription.state === 'unsubscribed' ||
        !('serverSubscriptionId' in nextSubscription) ||
        nextSubscription.serverSubscriptionId !==
          prevSubscription.serverSubscriptionId)
    ) {
      this._callbacksByServerId.delete(prevSubscription.serverSubscriptionId);
      this._blockDispatchConfigByServerId.delete(
        prevSubscription.serverSubscriptionId,
      );
      this._autoDisposedServerSubscriptions.delete(
        prevSubscription.serverSubscriptionId,
      );
    }
    this._subscriptionsByHash.set(hash, nextSubscription as Subscription);
    if ('serverSubscriptionId' in nextSubscription) {
      this._callbacksByServerId.set(
        nextSubscription.serverSubscriptionId,
        nextSubscription.callbacks,
      );
    }
    if (prevState !== nextSubscription.state) {
      this._stateChangeCallbacksByHash.get(hash)?.forEach(callback => {
        try {
          callback(nextSubscription.state);
        } catch (error) {
          console.error(
            'Subscription state observer transition callback failed',
            {
              hash,
              state: nextSubscription.state,
            },
            error,
          );
        }
      });
    }
  }
}
