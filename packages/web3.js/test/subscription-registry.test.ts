import {afterEach, describe, expect, it, vi, type MockInstance} from 'vitest';

import {
  ConnectionSubscriptionRegistry,
  type PendingSubscription,
  type ServerSubscriptionId,
  type SubscriptionConfigHash,
  type SubscriptionHandle,
} from '../src/rpc-subscriptions/registry';

describe('ConnectionSubscriptionRegistry', () => {
  let consoleErrorStub: MockInstance<typeof console.error> | undefined;

  afterEach(() => {
    consoleErrorStub?.mockRestore();
    consoleErrorStub = undefined;
  });

  function createPendingSubscription(
    callbacks: Set<(...args: any[]) => void>,
  ): PendingSubscription {
    return {
      callbacks,
      spec: {} as never,
      state: 'pending',
    };
  }

  function createSubscriptionHandle(
    serverSubscriptionId: ServerSubscriptionId,
  ): SubscriptionHandle {
    return {
      serverSubscriptionId,
      unsubscribe: () => Promise.resolve(true),
    };
  }

  it('returns the current state when observing state changes', () => {
    const registry = new ConnectionSubscriptionRegistry<undefined>();
    const hash = 'observer-replay' as SubscriptionConfigHash;
    const subscriptionCallback = () => {};
    const clientSubscriptionId = registry.createClientSubscription(
      hash,
      subscriptionCallback,
    );

    registry.setSubscription(
      hash,
      createPendingSubscription(new Set([subscriptionCallback])),
    );

    const observerCallback = vi.fn();

    const observation = registry.observeStateChanges(
      clientSubscriptionId,
      observerCallback,
    );

    expect(observation.currentState).to.equal('pending');
    expect(observerCallback).not.toHaveBeenCalled();
  });

  it('returns inactive when observing a client subscription without a stored subscription', () => {
    const registry = new ConnectionSubscriptionRegistry<undefined>();
    const hash = 'observer-inactive' as SubscriptionConfigHash;
    const subscriptionCallback = () => {};
    const clientSubscriptionId = registry.createClientSubscription(
      hash,
      subscriptionCallback,
    );

    const observerCallback = vi.fn();

    const observation = registry.observeStateChanges(
      clientSubscriptionId,
      observerCallback,
    );

    expect(observation.currentState).to.equal('inactive');
    expect(observerCallback).not.toHaveBeenCalled();
  });

  it('creates a pending subscription when the first callback is added', () => {
    const registry = new ConnectionSubscriptionRegistry<undefined>();
    const hash = 'first-callback' as SubscriptionConfigHash;
    const callback = vi.fn();
    const spec = {} as never;

    registry.addSubscriptionCallback(hash, callback, spec);

    expect(registry.getSubscription(hash)).to.deep.equal({
      callbacks: new Set([callback]),
      spec,
      state: 'pending',
    });
  });

  it('revives a failed subscription when another callback is added', () => {
    const registry = new ConnectionSubscriptionRegistry<undefined>();
    const hash = 'failed-revival' as SubscriptionConfigHash;
    const existingCallback = vi.fn();
    const nextCallback = vi.fn();

    registry.setSubscription(hash, {
      callbacks: new Set([existingCallback]),
      spec: {} as never,
      state: 'failed',
    });

    registry.addSubscriptionCallback(hash, nextCallback, {} as never);

    const revivedSubscription = registry.getSubscription(hash);
    expect(revivedSubscription?.state).to.equal('pending');
    expect(revivedSubscription?.callbacks.has(existingCallback)).to.equal(true);
    expect(revivedSubscription?.callbacks.has(nextCallback)).to.equal(true);
  });

  it('notifies observers when a subscription is pruned', () => {
    const registry = new ConnectionSubscriptionRegistry<undefined>();
    const hash = 'observer-prune' as SubscriptionConfigHash;
    const subscriptionCallback = () => {};
    const clientSubscriptionId = registry.createClientSubscription(
      hash,
      subscriptionCallback,
    );

    registry.setSubscription(
      hash,
      createPendingSubscription(new Set([subscriptionCallback])),
    );

    const observerCallback = vi.fn();
    registry.observeStateChanges(clientSubscriptionId, observerCallback);

    registry.pruneSubscription(hash);

    expect(observerCallback).toHaveBeenCalledExactlyOnceWith('inactive');
  });

  it('notifies only the removed client subscription observers when shared listeners use the same hash', () => {
    const registry = new ConnectionSubscriptionRegistry<undefined>();
    const hash = 'shared-listener-removal' as SubscriptionConfigHash;
    const firstSubscriptionCallback = () => {};
    const secondSubscriptionCallback = () => {};
    const firstClientSubscriptionId = registry.createClientSubscription(
      hash,
      firstSubscriptionCallback,
    );
    const secondClientSubscriptionId = registry.createClientSubscription(
      hash,
      secondSubscriptionCallback,
    );

    registry.setSubscription(
      hash,
      createPendingSubscription(
        new Set([firstSubscriptionCallback, secondSubscriptionCallback]),
      ),
    );

    const firstObserver = vi.fn();
    const secondObserver = vi.fn();
    registry.observeStateChanges(firstClientSubscriptionId, firstObserver);
    registry.observeStateChanges(secondClientSubscriptionId, secondObserver);

    registry.removeClientSubscription(firstClientSubscriptionId);

    expect(firstObserver).toHaveBeenCalledExactlyOnceWith('inactive');
    expect(secondObserver).not.toHaveBeenCalled();
  });

  it('logs observer transition failures and continues notifying other observers', () => {
    consoleErrorStub = vi.spyOn(console, 'error').mockImplementation(() => {});
    const registry = new ConnectionSubscriptionRegistry<undefined>();
    const hash = 'observer-transition' as SubscriptionConfigHash;
    const subscriptionCallback = () => {};
    const clientSubscriptionId = registry.createClientSubscription(
      hash,
      subscriptionCallback,
    );

    registry.setSubscription(
      hash,
      createPendingSubscription(new Set([subscriptionCallback])),
    );

    const observerError = new Error('observer transition failed');
    const throwingObserver = vi.fn().mockImplementation(nextState => {
      if (nextState === 'subscribed') {
        throw observerError;
      }
    });
    const otherObserver = vi.fn();
    const firstObservation = registry.observeStateChanges(
      clientSubscriptionId,
      throwingObserver,
    );
    const secondObservation = registry.observeStateChanges(
      clientSubscriptionId,
      otherObserver,
    );

    expect(firstObservation.currentState).to.equal('pending');
    expect(secondObservation.currentState).to.equal('pending');

    const serverSubscriptionId = 1 as ServerSubscriptionId;
    registry.setSubscription(hash, {
      callbacks: new Set([subscriptionCallback]),
      serverSubscriptionId,
      spec: {} as never,
      state: 'subscribed',
      subscriptionHandle: createSubscriptionHandle(serverSubscriptionId),
    });

    expect(consoleErrorStub).toHaveBeenCalledTimes(1);
    expect(consoleErrorStub.mock.calls[0]).to.deep.equal([
      'Subscription state observer transition callback failed',
      {
        hash,
        state: 'subscribed',
      },
      observerError,
    ]);
    expect(throwingObserver).toHaveBeenCalledTimes(1);
    expect(throwingObserver.mock.calls[0][0]).to.equal('subscribed');
    expect(otherObserver.mock.lastCall?.[0]).to.equal('subscribed');
    expect(registry.getSubscription(hash)?.state).to.equal('subscribed');
  });

  it('logs notification callback failures and continues notifying other callbacks', () => {
    consoleErrorStub = vi.spyOn(console, 'error').mockImplementation(() => {});
    const registry = new ConnectionSubscriptionRegistry<undefined>();
    const hash = 'notification-dispatch' as SubscriptionConfigHash;
    const callbackError = new Error('notification callback failed');
    const notificationCallback = vi.fn().mockImplementation(() => {
      throw callbackError;
    });
    const otherCallback = vi.fn();
    const serverSubscriptionId = 2 as ServerSubscriptionId;

    registry.setSubscription(hash, {
      callbacks: new Set([notificationCallback, otherCallback]),
      serverSubscriptionId,
      spec: {} as never,
      state: 'subscribed',
      subscriptionHandle: createSubscriptionHandle(serverSubscriptionId),
    });

    registry.dispatchNotification(serverSubscriptionId, []);

    expect(consoleErrorStub).toHaveBeenCalledTimes(1);
    expect(consoleErrorStub.mock.calls[0]).to.deep.equal([
      'Subscription notification callback failed',
      {
        serverSubscriptionId,
      },
      callbackError,
    ]);
    expect(notificationCallback).toHaveBeenCalledOnce();
    expect(notificationCallback).toHaveBeenCalledBefore(otherCallback);
    expect(otherCallback).toHaveBeenCalledOnce();
  });
});
