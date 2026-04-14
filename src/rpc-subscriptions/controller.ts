/**
 * Boundary: subscription orchestration between Connection, runtime, and
 * registry.
 *
 * This module receives raw notification and lifecycle events from the runtime,
 * drives state transitions in the registry, and dispatches Connection-facing
 * callback arguments after adapter normalization. It is the coordination layer
 * of the subscription subsystem.
 */
import {Address} from '../address';
import {coerceNumericToBigInt} from '../kit-rpc-adapters/response';
import type {BlockSubscriptionConfig} from '../kit-rpc-adapters/subscription-types';
import {normalizeWebSocketAccountInfo} from '../kit-rpc-adapters/account-notifications';
import {mapBlockNotificationBlock} from '../kit-rpc-adapters/block-notifications';
import {
  type ConnectionSubscriptionsRuntime,
  type RpcWebSocketNotificationEvent,
  type SubscriptionSpec,
  type SubscriptionKind,
} from './runtime';
import {
  ConnectionSubscriptionRegistry,
  type ClientSubscriptionId,
  type PendingSubscription,
  type SubscriptionConfig,
  type SubscriptionConfigByKind,
} from './registry';

type StoredBlockSubscriptionDispatchConfig =
  | BlockSubscriptionConfig
  | 'default';

export type SubscriptionDispatchConfig<TBlockDispatchConfig> = Readonly<{
  defaultDispatchConfig?: TBlockDispatchConfig;
  dispatchConfig?: TBlockDispatchConfig;
}>;

export class ConnectionSubscriptionsController<
  TBlockDispatchConfig extends StoredBlockSubscriptionDispatchConfig,
> {
  constructor(
    private readonly _subscriptionRegistry: ConnectionSubscriptionRegistry<TBlockDispatchConfig>,
    private readonly _getSubscriptionsRuntime: () => ConnectionSubscriptionsRuntime,
    private readonly _getSubscriptionConfigHash: (
      spec: SubscriptionSpec,
    ) => string,
  ) {}

  handleNotification({
    kind,
    notification,
  }: RpcWebSocketNotificationEvent): void {
    switch (kind) {
      case 'account': {
        const {result, subscription} = notification;
        const accountInfo = normalizeWebSocketAccountInfo(result.value);
        this._subscriptionRegistry.dispatchNotification(subscription, [
          accountInfo,
          result.context,
        ]);
        return;
      }

      case 'block': {
        const {result, subscription} = notification;
        const dispatchConfig =
          this._subscriptionRegistry.getBlockDispatchConfigForServerId(
            subscription,
          );
        const block = mapBlockNotificationBlock(
          result.value.block,
          dispatchConfig,
        );
        this._subscriptionRegistry.dispatchNotification(subscription, [
          {
            block,
            err: result.value.err,
            slot: coerceNumericToBigInt(result.value.slot, 'slot'),
          },
          result.context,
        ]);
        return;
      }

      case 'logs': {
        const {result, subscription} = notification;
        this._subscriptionRegistry.dispatchNotification(subscription, [
          {
            err: result.value.err,
            logs: [...result.value.logs],
            signature: result.value.signature,
          },
          result.context,
        ]);
        return;
      }

      case 'program': {
        const {result, subscription} = notification;
        const accountId = new Address(result.value.pubkey);
        const accountInfo = normalizeWebSocketAccountInfo(result.value.account);
        this._subscriptionRegistry.dispatchNotification(subscription, [
          {accountId, accountInfo},
          result.context,
        ]);
        return;
      }

      case 'root': {
        const {result, subscription} = notification;
        this._subscriptionRegistry.dispatchNotification(subscription, [result]);
        return;
      }

      case 'signature': {
        const {result, subscription} = notification;
        const signatureNotification =
          result.value === 'receivedSignature'
            ? {type: 'received' as const}
            : {
                type: 'status' as const,
                result: {
                  err: result.value.err,
                },
              };
        if (signatureNotification.type === 'status') {
          this._subscriptionRegistry.markAutoDisposedSubscription(subscription);
        }
        this._subscriptionRegistry.dispatchNotification(subscription, [
          signatureNotification,
          result.context,
        ]);
        return;
      }

      case 'slot': {
        const {result, subscription} = notification;
        this._subscriptionRegistry.dispatchNotification(subscription, [result]);
        return;
      }

      case 'slotsUpdates': {
        const {result, subscription} = notification;
        this._subscriptionRegistry.dispatchNotification(subscription, [result]);
        return;
      }

      case 'vote': {
        const {result, subscription} = notification;
        this._subscriptionRegistry.dispatchNotification(subscription, [
          {
            hash: result.hash,
            signature: result.signature,
            slots: [...result.slots],
            timestamp: result.timestamp,
            votePubkey: new Address(result.votePubkey),
          },
        ]);
        return;
      }
    }
  }

  handleRuntimeDisconnected(code: number): void {
    if (code === 1000) {
      void this.updateSubscriptions();
      return;
    }
    for (const hash of this._subscriptionRegistry.getSubscriptionHashes()) {
      const subscription = this._subscriptionRegistry.getSubscription(hash);
      if (subscription == null) {
        continue;
      }
      this._subscriptionRegistry.setSubscription(hash, {
        ...subscription,
        state: 'pending',
      });
    }
    void this.updateSubscriptions();
  }

  registerSubscription<TKind extends SubscriptionKind>(
    subscriptionConfig: SubscriptionConfigByKind<TKind>,
    dispatchConfig?: SubscriptionDispatchConfig<TBlockDispatchConfig>,
  ): ClientSubscriptionId {
    const hash = this._getSubscriptionConfigHash(subscriptionConfig.spec);
    if (dispatchConfig?.defaultDispatchConfig !== undefined) {
      this._subscriptionRegistry.setDefaultBlockDispatchConfig(
        hash,
        dispatchConfig.defaultDispatchConfig,
      );
    }
    if (dispatchConfig?.dispatchConfig !== undefined) {
      this._subscriptionRegistry.setBlockDispatchConfig(
        hash,
        dispatchConfig.dispatchConfig,
      );
    }
    const pendingSubscription: PendingSubscription<TKind> = {
      callbacks: new Set<SubscriptionConfig['callback']>([
        subscriptionConfig.callback,
      ]),
      spec: subscriptionConfig.spec,
      state: 'pending',
    };
    this._subscriptionRegistry.addSubscriptionCallback(
      hash,
      subscriptionConfig.callback,
      pendingSubscription,
    );
    const clientSubscriptionId =
      this._subscriptionRegistry.createClientSubscription(
        hash,
        subscriptionConfig.callback,
      );
    void this.updateSubscriptions();
    return clientSubscriptionId;
  }

  async removeClientSubscription(
    clientSubscriptionId: ClientSubscriptionId,
    subscriptionName: string,
  ): Promise<void> {
    const clientSubscription =
      this._subscriptionRegistry.removeClientSubscription(clientSubscriptionId);
    if (
      clientSubscription != null &&
      this._subscriptionRegistry.removeSubscriptionCallback(
        clientSubscription.hash,
        clientSubscription.callback,
      )
    ) {
      await this.updateSubscriptions();
    } else {
      console.warn(
        'Ignored unsubscribe request because an active subscription with id ' +
          `\`${clientSubscriptionId}\` for '${subscriptionName}' events ` +
          'could not be found.',
      );
    }
  }

  async updateSubscriptions(): Promise<void> {
    const subscriptionsRuntime = this._getSubscriptionsRuntime();
    if (!this._subscriptionRegistry.hasSubscriptions()) {
      subscriptionsRuntime.scheduleIdleClose();
      return;
    }

    subscriptionsRuntime.cancelIdleClose();

    if (subscriptionsRuntime.channel === null) {
      subscriptionsRuntime.ensureConnected();
      return;
    }

    const activeSubscriptionChannelAbortController =
      subscriptionsRuntime.connectionGeneration;
    const isCurrentConnectionStillActive = () =>
      activeSubscriptionChannelAbortController !== null &&
      activeSubscriptionChannelAbortController ===
        this._getSubscriptionsRuntime().connectionGeneration;

    await Promise.all(
      this._subscriptionRegistry.getSubscriptionHashes().map(async hash => {
        const subscription = this._subscriptionRegistry.getSubscription(hash);
        if (subscription === undefined) {
          return;
        }
        const shouldAbortSubscriptionUpdate = () => {
          const currentSubscription =
            this._subscriptionRegistry.getSubscription(hash);
          return (
            !isCurrentConnectionStillActive() ||
            currentSubscription === undefined ||
            currentSubscription.callbacks !== subscription.callbacks
          );
        };

        switch (subscription.state) {
          case 'pending':
          case 'unsubscribed': {
            if (subscription.callbacks.size === 0) {
              this._subscriptionRegistry.pruneSubscription(hash);
              await this.updateSubscriptions();
              return;
            }

            this._subscriptionRegistry.setSubscription(hash, {
              ...subscription,
              state: 'subscribing',
            });

            try {
              const subscriptionHandle =
                await subscriptionsRuntime.openSubscription(subscription.spec);
              if (shouldAbortSubscriptionUpdate()) {
                void subscriptionHandle.unsubscribe();
                return;
              }
              this._subscriptionRegistry.setSubscription(hash, {
                ...subscription,
                serverSubscriptionId: subscriptionHandle.serverSubscriptionId,
                state: 'subscribed',
                subscriptionHandle,
              });
              this._subscriptionRegistry.attachBlockDispatchConfigToServerId(
                hash,
                subscriptionHandle.serverSubscriptionId,
              );
            } catch (error) {
              if (shouldAbortSubscriptionUpdate()) {
                return;
              }
              this._subscriptionRegistry.setSubscription(hash, {
                ...subscription,
                state: 'pending',
              });
              console.error(
                `Received ${error instanceof Error ? '' : 'JSON-RPC '}error opening \`${subscription.spec.kind}\` subscription`,
                {
                  spec: subscription.spec,
                  error,
                },
              );
            }
            if (shouldAbortSubscriptionUpdate()) {
              return;
            }
            await this.updateSubscriptions();
            return;
          }

          case 'subscribed':
            if (subscription.callbacks.size === 0) {
              if (
                !this._subscriptionRegistry.consumeAutoDisposedSubscription(
                  subscription.serverSubscriptionId,
                )
              ) {
                this._subscriptionRegistry.setSubscription(hash, {
                  ...subscription,
                  serverSubscriptionId: subscription.serverSubscriptionId,
                  state: 'unsubscribing',
                  subscriptionHandle: subscription.subscriptionHandle,
                });
                try {
                  await subscription.subscriptionHandle.unsubscribe();
                } catch (error) {
                  if (shouldAbortSubscriptionUpdate()) {
                    return;
                  }
                  this._subscriptionRegistry.setSubscription(hash, {
                    ...subscription,
                    serverSubscriptionId: subscription.serverSubscriptionId,
                    state: 'subscribed',
                    subscriptionHandle: subscription.subscriptionHandle,
                  });
                  if (error instanceof Error) {
                    console.error(
                      `${subscription.spec.kind} unsubscribe error:`,
                      error.message,
                    );
                  }
                  await this.updateSubscriptions();
                  return;
                }
              }
              if (shouldAbortSubscriptionUpdate()) {
                return;
              }
              this._subscriptionRegistry.setSubscription(hash, {
                ...subscription,
                serverSubscriptionId: subscription.serverSubscriptionId,
                state: 'unsubscribed',
              });
              await this.updateSubscriptions();
            }
            break;

          case 'subscribing':
          case 'unsubscribing':
            break;
        }
      }),
    );
  }
}
