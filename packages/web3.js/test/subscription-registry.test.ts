import { expect } from 'chai';
import { SinonStub, spy, stub } from 'sinon';

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

    function createPendingSubscription(callbacks: Set<(...args: any[]) => void>): PendingSubscription {
        return {
            callbacks,
            spec: {} as never,
            state: 'pending',
        };
    }

    function createSubscriptionHandle(serverSubscriptionId: ServerSubscriptionId): SubscriptionHandle {
        return {
            serverSubscriptionId,
            unsubscribe: () => Promise.resolve(true),
        };
    }

    it('returns the current state when observing state changes', () => {
        const registry = new ConnectionSubscriptionRegistry<undefined>();
        const hash = 'observer-replay' as SubscriptionConfigHash;
        const subscriptionCallback = () => {};
        const clientSubscriptionId = registry.createClientSubscription(hash, subscriptionCallback);

        registry.setSubscription(hash, createPendingSubscription(new Set([subscriptionCallback])));

        const observerCallback = stub();

        const observation = registry.observeStateChanges(clientSubscriptionId, observerCallback);

        expect(observation.currentState).to.equal('pending');
        expect(observerCallback.called).to.equal(false);
    });

    it('returns inactive when observing a client subscription without a stored subscription', () => {
        const registry = new ConnectionSubscriptionRegistry<undefined>();
        const hash = 'observer-inactive' as SubscriptionConfigHash;
        const subscriptionCallback = () => {};
        const clientSubscriptionId = registry.createClientSubscription(hash, subscriptionCallback);

        const observerCallback = stub();

        const observation = registry.observeStateChanges(clientSubscriptionId, observerCallback);

        expect(observation.currentState).to.equal('inactive');
        expect(observerCallback.called).to.equal(false);
    });

    it('creates a pending subscription when the first callback is added', () => {
        const registry = new ConnectionSubscriptionRegistry<undefined>();
        const hash = 'first-callback' as SubscriptionConfigHash;
        const callback = spy();
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
        const existingCallback = spy();
        const nextCallback = spy();

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
        const clientSubscriptionId = registry.createClientSubscription(hash, subscriptionCallback);

        registry.setSubscription(hash, createPendingSubscription(new Set([subscriptionCallback])));

        const observerCallback = stub();
        registry.observeStateChanges(clientSubscriptionId, observerCallback);

        registry.pruneSubscription(hash);

        expect(observerCallback.calledOnceWithExactly('inactive')).to.equal(true);
    });

    it('notifies only the removed client subscription observers when shared listeners use the same hash', () => {
        const registry = new ConnectionSubscriptionRegistry<undefined>();
        const hash = 'shared-listener-removal' as SubscriptionConfigHash;
        const firstSubscriptionCallback = () => {};
        const secondSubscriptionCallback = () => {};
        const firstClientSubscriptionId = registry.createClientSubscription(hash, firstSubscriptionCallback);
        const secondClientSubscriptionId = registry.createClientSubscription(hash, secondSubscriptionCallback);

        registry.setSubscription(
            hash,
            createPendingSubscription(new Set([firstSubscriptionCallback, secondSubscriptionCallback])),
        );

        const firstObserver = stub();
        const secondObserver = stub();
        registry.observeStateChanges(firstClientSubscriptionId, firstObserver);
        registry.observeStateChanges(secondClientSubscriptionId, secondObserver);

        registry.removeClientSubscription(firstClientSubscriptionId);

        expect(firstObserver.calledOnceWithExactly('inactive')).to.equal(true);
        expect(secondObserver.called).to.equal(false);
    });

    it('logs observer transition failures and continues notifying other observers', () => {
        consoleErrorStub = stub(console, 'error');
        const registry = new ConnectionSubscriptionRegistry<undefined>();
        const hash = 'observer-transition' as SubscriptionConfigHash;
        const subscriptionCallback = () => {};
        const clientSubscriptionId = registry.createClientSubscription(hash, subscriptionCallback);

        registry.setSubscription(hash, createPendingSubscription(new Set([subscriptionCallback])));

        const observerError = new Error('observer transition failed');
        const throwingObserver = stub().callsFake(nextState => {
            if (nextState === 'subscribed') {
                throw observerError;
            }
        });
        const otherObserver = spy();
        const firstObservation = registry.observeStateChanges(clientSubscriptionId, throwingObserver);
        const secondObservation = registry.observeStateChanges(clientSubscriptionId, otherObserver);

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

        expect(consoleErrorStub.callCount).to.equal(1);
        expect(consoleErrorStub.firstCall.args).to.deep.equal([
            'Subscription state observer transition callback failed',
            {
                hash,
                state: 'subscribed',
            },
            observerError,
        ]);
        expect(throwingObserver.callCount).to.equal(1);
        expect(throwingObserver.firstCall.args[0]).to.equal('subscribed');
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
