import {expect} from 'chai';
import {SinonStub, spy, stub} from 'sinon';

import {
  ConnectionSubscriptionRegistry,
  type PendingSubscription,
  type ServerSubscriptionId,
  type SubscriptionConfigHash,
  type SubscriptionHandle,
} from '../src/rpc-subscriptions/registry';

describe('ConnectionSubscriptionRegistry', () => {
  let consoleErrorStub: SinonStub | undefined;

  afterEach(() => {
    consoleErrorStub?.restore();
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

  it('logs observer replay failures with contextual diagnostics', () => {
    consoleErrorStub = stub(console, 'error');
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

    const replayError = new Error('observer replay failed');
    const observerCallback = stub().callsFake(() => {
      throw replayError;
    });

    registry.observeStateChanges(clientSubscriptionId, observerCallback);

    expect(observerCallback.calledOnce).to.equal(true);
    expect(observerCallback.firstCall.args[0]).to.equal('pending');
    expect(consoleErrorStub.callCount).to.equal(1);
    expect(consoleErrorStub.firstCall.args).to.deep.equal([
      'Subscription state observer replay callback failed',
      {
        hash,
        state: 'pending',
      },
      replayError,
    ]);
  });

  it('logs observer transition failures and continues notifying other observers', () => {
    consoleErrorStub = stub(console, 'error');
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
    const throwingObserver = stub().callsFake(nextState => {
      if (nextState === 'subscribed') {
        throw observerError;
      }
    });
    const otherObserver = spy();
    registry.observeStateChanges(clientSubscriptionId, throwingObserver);
    registry.observeStateChanges(clientSubscriptionId, otherObserver);

    const serverSubscriptionId = 1 as ServerSubscriptionId;
    registry.setSubscription(hash, {
      callbacks: new Set([subscriptionCallback]),
      serverSubscriptionId,
      spec: {} as never,
      state: 'subscribed',
      subscriptionHandle: createSubscriptionHandle(serverSubscriptionId),
    });

    expect(consoleErrorStub.callCount).to.equal(1);
    expect(consoleErrorStub.firstCall.args).to.deep.equal([
      'Subscription state observer transition callback failed',
      {
        hash,
        state: 'subscribed',
      },
      observerError,
    ]);
    expect(throwingObserver.callCount).to.equal(2);
    expect(throwingObserver.firstCall.args[0]).to.equal('pending');
    expect(throwingObserver.secondCall.args[0]).to.equal('subscribed');
    expect(otherObserver.lastCall.args[0]).to.equal('subscribed');
    expect(registry.getSubscription(hash)?.state).to.equal('subscribed');
  });

  it('logs notification callback failures and continues notifying other callbacks', () => {
    consoleErrorStub = stub(console, 'error');
    const registry = new ConnectionSubscriptionRegistry<undefined>();
    const hash = 'notification-dispatch' as SubscriptionConfigHash;
    const callbackError = new Error('notification callback failed');
    const notificationCallback = stub().callsFake(() => {
      throw callbackError;
    });
    const otherCallback = spy();
    const serverSubscriptionId = 2 as ServerSubscriptionId;

    registry.setSubscription(hash, {
      callbacks: new Set([notificationCallback, otherCallback]),
      serverSubscriptionId,
      spec: {} as never,
      state: 'subscribed',
      subscriptionHandle: createSubscriptionHandle(serverSubscriptionId),
    });

    registry.dispatchNotification(serverSubscriptionId, []);

    expect(consoleErrorStub.callCount).to.equal(1);
    expect(consoleErrorStub.firstCall.args).to.deep.equal([
      'Subscription notification callback failed',
      {
        serverSubscriptionId,
      },
      callbackError,
    ]);
    expect(notificationCallback.calledOnce).to.equal(true);
    expect(notificationCallback.calledBefore(otherCallback)).to.equal(true);
    expect(otherCallback.calledOnce).to.equal(true);
  });
});
