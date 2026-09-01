import { expect } from 'chai';
import { createSandbox, SinonStub, stub } from 'sinon';

import { Connection } from '../../src';
import type { Commitment, ConnectionConfig, SignatureResult } from '../../src/connection';
import {
    buildAccountSubscriptionSpec,
    buildBlockSubscriptionSpec,
    buildLogsSubscriptionSpec,
    buildProgramSubscriptionSpec,
    buildSignatureSubscriptionSpec,
} from '../../src/kit-adapters/subscription-specs';
import { PublicKey } from '../../src/publickey';
import type {
    AnyRpcWebSocketNotification,
    ConnectionSubscriptionsNotificationDispatcher,
    ConnectionSubscriptionsRuntime,
    SubscriptionChannel,
    RpcWebSocketAccountNotification,
    RpcWebSocketBlockNotification,
    RpcWebSocketLogsNotification,
    RpcWebSocketNotificationByKind,
    RpcWebSocketProgramNotification,
    RpcWebSocketRootNotification,
    RpcWebSocketSignatureNotification,
    RpcWebSocketSignatureNotificationResult,
    RpcWebSocketSlotNotification,
    RpcWebSocketSlotsUpdatesNotification,
    RpcWebSocketVoteNotification,
    SubscriptionKind,
    SubscriptionSpec,
    SubscriptionSpecByKind,
} from '../../src/rpc-subscriptions/runtime';

type ConnectionCommitmentOrConfig = Commitment | ConnectionConfig | undefined;

type MockSubscriptionHandle = Readonly<{
    serverSubscriptionId: number;
    unsubscribe(): Promise<boolean>;
}>;

type MockSubscriptionOpenRequest<TNotification> = Readonly<{
    abortSignal: AbortSignal;
    onError(error: Error): void;
    onNotification(notification: TNotification): void;
    onStop(serverSubscriptionId: number): void;
    serverSubscriptionId: number;
    subscriptionIsActive(serverSubscriptionId: number): boolean;
    unsubscribe(): Promise<boolean>;
}>;

interface MockSubscriptionAdapter {
    open<TKind extends keyof RpcWebSocketNotificationByKind>(
        spec: SubscriptionSpecByKind[TKind],
        request: MockSubscriptionOpenRequest<RpcWebSocketNotificationByKind[TKind]>,
    ): Promise<MockSubscriptionHandle>;
}

type ConnectionWithMockSubscriptionInternals = {
    _subscriptionChannel: SubscriptionChannel | null;
    _subscriptionController: {
        handleNotification: ConnectionSubscriptionsNotificationDispatcher;
        handleRuntimeDisconnected(code: number): void;
        updateSubscriptions(): Promise<void>;
    };
    _subscriptionsRuntime: ConnectionSubscriptionsRuntime;
    _subscriptionRegistry: {
        abortAllServerSubscriptions(): void;
        abortServerSubscription(serverSubscriptionId: number): boolean;
        createServerSubscription(): Readonly<{
            abortController: AbortController;
            serverSubscriptionId: number;
        }>;
        deleteServerSubscription(serverSubscriptionId: number): void;
        hasServerSubscription(serverSubscriptionId: number): boolean;
    };
};

type StubbedSubscriptionHarness = SubscriptionHarness & {
    close: SinonStub<[], void>;
    connect: SinonStub<[], void>;
    requestSubscription: SinonStub<[SubscriptionSpec], Promise<number>>;
    unsubscribe: SinonStub<[number], Promise<boolean>>;
};

type RpcResponse = {
    context: {
        slot: bigint;
    };
    value: unknown | Promise<unknown>;
};

type RpcRequest = {
    method: string;
    params?: Array<any>;
    subscriptionEstablishmentPromise?: Promise<void>;
};

type ActiveSubscriptionRequest = MockSubscriptionOpenRequest<AnyRpcWebSocketNotification>;

type SubscriptionHarnessEventMap = {
    accountNotification: (notification: RpcWebSocketAccountNotification) => void;
    blockNotification: (notification: RpcWebSocketBlockNotification) => void;
    close: (code: number) => void;
    error: (error: Error) => void;
    logsNotification: (notification: RpcWebSocketLogsNotification) => void;
    open: () => void;
    programNotification: (notification: RpcWebSocketProgramNotification) => void;
    rootNotification: (notification: RpcWebSocketRootNotification) => void;
    signatureNotification: (notification: RpcWebSocketSignatureNotification) => void;
    slotNotification: (notification: RpcWebSocketSlotNotification) => void;
    slotsUpdatesNotification: (notification: RpcWebSocketSlotsUpdatesNotification) => void;
    voteNotification: (notification: RpcWebSocketVoteNotification) => void;
};

export interface SubscriptionHarness {
    close(): void;
    connect(): void;
    emit<TEventName extends keyof SubscriptionHarnessEventMap>(
        event: TEventName,
        ...args: Parameters<SubscriptionHarnessEventMap[TEventName]>
    ): void;
    notify(method: string): Promise<void>;
    on<TEventName extends keyof SubscriptionHarnessEventMap>(
        event: TEventName,
        listener: SubscriptionHarnessEventMap[TEventName],
    ): void;
}

type MockSubscriptionHarnessListenerMap = {
    [TEventName in keyof SubscriptionHarnessEventMap]: Set<SubscriptionHarnessEventMap[TEventName]>;
};

type MockSubscriptionFixture = Readonly<{
    activeSubscriptionRequestsByServerSubscriptionId: Map<number, ActiveSubscriptionRequest>;
    harness: MockSubscriptionHarness;
}>;

class DeferredChannelPromise<T> implements PromiseLike<T> {
    constructor(readonly abortSignal: AbortSignal) {}

    private handlers: Array<{
        onRejected?: (reason: Error) => unknown;
        onResolved?: (value: T) => unknown;
        reject(reason: unknown): void;
        resolve(value: unknown): void;
    }> = [];
    private state: { status: 'pending' } | { reason: Error; status: 'rejected' } | { status: 'resolved'; value: T } = {
        status: 'pending',
    };

    then<TResult1 = T, TResult2 = never>(
        onResolved?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
        onRejected?: ((reason: Error) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
        return new Promise((resolve, reject) => {
            const handler = {
                onRejected: onRejected ?? undefined,
                onResolved: onResolved ?? undefined,
                reject,
                resolve,
            };
            if (this.state.status === 'resolved') {
                this.runResolvedHandler(handler, this.state.value);
                return;
            }
            if (this.state.status === 'rejected') {
                this.runRejectedHandler(handler, this.state.reason);
                return;
            }
            this.handlers.push(handler);
        });
    }

    reject(reason: Error): void {
        if (this.state.status !== 'pending') {
            return;
        }
        this.state = { reason, status: 'rejected' };
        for (const handler of this.handlers) {
            this.runRejectedHandler(handler, reason);
        }
        this.handlers = [];
    }

    resolve(value: T): void {
        if (this.state.status !== 'pending') {
            return;
        }
        this.state = { status: 'resolved', value };
        for (const handler of this.handlers) {
            this.runResolvedHandler(handler, value);
        }
        this.handlers = [];
    }

    private runRejectedHandler(
        handler: {
            onRejected?: (reason: Error) => unknown;
            reject(reason: unknown): void;
            resolve(value: unknown): void;
        },
        reason: Error,
    ): void {
        if (handler.onRejected == null) {
            handler.reject(reason);
            return;
        }
        try {
            handler.resolve(handler.onRejected(reason));
        } catch (error) {
            handler.reject(error);
        }
    }

    private runResolvedHandler(
        handler: {
            onResolved?: (value: T) => unknown;
            reject(reason: unknown): void;
            resolve(value: unknown): void;
        },
        value: T,
    ): void {
        if (handler.onResolved == null) {
            handler.resolve(value);
            return;
        }
        try {
            handler.resolve(handler.onResolved(value));
        } catch (error) {
            handler.reject(error);
        }
    }
}

const mockRpcSocket: Array<[RpcRequest, RpcResponse | Promise<RpcResponse>]> = [];
const mockHarnessesByConnection = new WeakMap<Connection, MockSubscriptionFixture>();
const sandbox = createSandbox();

export function createSignatureStatusRpcResult(err: SignatureResult['err']): RpcWebSocketSignatureNotificationResult {
    return { err };
}

export function createSignatureReceivedRpcResult(): RpcWebSocketSignatureNotificationResult {
    return 'receivedSignature';
}

export const mockRpcMessage = ({
    method,
    params,
    result,
    subscriptionEstablishmentPromise,
}: {
    method: string;
    params: Array<any>;
    result: unknown | Promise<unknown>;
    subscriptionEstablishmentPromise?: Promise<void>;
}) => {
    mockRpcSocket.push([
        { method, params, subscriptionEstablishmentPromise },
        {
            context: { slot: 11n },
            value: result,
        },
    ]);
};

export const stubSubscriptions = (endpoint: string, commitmentOrConfig?: ConnectionCommitmentOrConfig): Connection => {
    const { connection } = createConnectionWithMockSubscriptions(
        endpoint,
        commitmentOrConfig,
        () => new MockSubscriptionAdapterImpl(),
    );
    return connection;
};

export function stubSubscriptionHarness(
    endpoint: string,
    commitmentOrConfig?: ConnectionCommitmentOrConfig,
): { connection: Connection; harness: StubbedSubscriptionHarness } {
    const requestSubscription = stub<[SubscriptionSpec], Promise<number>>();
    const unsubscribe = stub<[number], Promise<boolean>>();
    const { connection, harness } = createConnectionWithMockSubscriptions(
        endpoint,
        commitmentOrConfig,
        (activeSubscriptionRequestsByServerSubscriptionId, mockHarness) => {
            installNotificationRelays(mockHarness, activeSubscriptionRequestsByServerSubscriptionId);
            return new StubSubscriptionAdapter(
                activeSubscriptionRequestsByServerSubscriptionId,
                requestSubscription,
                unsubscribe,
            );
        },
    );
    const stubbedHarness = harness as unknown as StubbedSubscriptionHarness;
    stubbedHarness.connect = sandbox.stub(harness, 'connect').callThrough();
    stubbedHarness.close = sandbox.stub(harness, 'close').callThrough();
    stubbedHarness.requestSubscription = requestSubscription;
    stubbedHarness.unsubscribe = unsubscribe;
    return { connection, harness: stubbedHarness };
}

export async function teardownSubscriptions(connection: Connection) {
    const fixture = mockHarnessesByConnection.get(connection);
    if (fixture != null) {
        fixture.activeSubscriptionRequestsByServerSubscriptionId.clear();
        fixture.harness.destroy();
        mockHarnessesByConnection.delete(connection);
    }
    mockRpcSocket.length = 0;

    await new Promise<void>(resolve => setImmediate(resolve));
}

export const restoreSubscriptions = async (connection: Connection) => {
    await teardownSubscriptions(connection);
    sandbox.restore();
};

function createConnectionWithMockSubscriptions(
    endpoint: string,
    commitmentOrConfig: ConnectionCommitmentOrConfig,
    createSubscriptionAdapter: (
        activeSubscriptionRequestsByServerSubscriptionId: Map<number, ActiveSubscriptionRequest>,
        harness: MockSubscriptionHarness,
    ) => MockSubscriptionAdapter,
): { connection: Connection; harness: MockSubscriptionHarness } {
    const activeSubscriptionRequestsByServerSubscriptionId = new Map<number, ActiveSubscriptionRequest>();
    const harness = new MockSubscriptionHarness();
    const connection = new Connection(endpoint, commitmentOrConfig);
    const connectionInternals = connection as unknown as ConnectionWithMockSubscriptionInternals;
    const subscriptionAdapter = createSubscriptionAdapter(activeSubscriptionRequestsByServerSubscriptionId, harness);
    connectionInternals._subscriptionsRuntime = new MockConnectionSubscriptionsRuntime(
        connectionInternals,
        harness,
        subscriptionAdapter,
    );
    mockHarnessesByConnection.set(connection, {
        activeSubscriptionRequestsByServerSubscriptionId,
        harness,
    });
    return { connection, harness };
}

class MockConnectionSubscriptionsRuntime implements ConnectionSubscriptionsRuntime {
    channel: SubscriptionChannel | null = null;
    connectionGeneration: AbortController | null = null;
    private idleCloseTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(
        private readonly connectionInternals: ConnectionWithMockSubscriptionInternals,
        private readonly harness: MockSubscriptionHarness,
        private readonly subscriptionAdapter: MockSubscriptionAdapter,
    ) {}

    cancelIdleClose(): void {
        if (this.idleCloseTimeout !== null) {
            clearTimeout(this.idleCloseTimeout);
            this.idleCloseTimeout = null;
        }
    }

    ensureConnected(): void {
        if (this.connectionGeneration !== null) {
            return;
        }

        const abortController = new AbortController();
        this.connectionGeneration = abortController;
        void this.harness
            .createChannel(abortController.signal)
            .then(channel => {
                if (this.connectionGeneration !== abortController || abortController.signal.aborted) {
                    return;
                }
                this.channel = channel;
                channel.on(
                    'error',
                    error => {
                        if (this.connectionGeneration !== abortController) {
                            return;
                        }
                        this.disconnect(1006, error instanceof Error ? error : new Error(String(error)));
                    },
                    { signal: abortController.signal },
                );
                void this.connectionInternals._subscriptionController.updateSubscriptions();
            })
            .catch(error => {
                if (this.connectionGeneration !== abortController || abortController.signal.aborted) {
                    return;
                }
                this.disconnect(1006, error instanceof Error ? error : new Error(String(error)));
            });
    }

    openSubscription(spec: SubscriptionSpec): Promise<MockSubscriptionHandle> {
        const { abortController, serverSubscriptionId } =
            this.connectionInternals._subscriptionRegistry.createServerSubscription();
        switch (spec.kind) {
            case 'account':
                return this._openSubscription<'account'>(spec, serverSubscriptionId, abortController, notification => {
                    this.connectionInternals._subscriptionController.handleNotification({
                        kind: 'account',
                        notification,
                    });
                });
            case 'block':
                return this._openSubscription<'block'>(spec, serverSubscriptionId, abortController, notification => {
                    this.connectionInternals._subscriptionController.handleNotification({
                        kind: 'block',
                        notification,
                    });
                });
            case 'logs':
                return this._openSubscription<'logs'>(spec, serverSubscriptionId, abortController, notification => {
                    this.connectionInternals._subscriptionController.handleNotification({
                        kind: 'logs',
                        notification,
                    });
                });
            case 'program':
                return this._openSubscription<'program'>(spec, serverSubscriptionId, abortController, notification => {
                    this.connectionInternals._subscriptionController.handleNotification({
                        kind: 'program',
                        notification,
                    });
                });
            case 'root':
                return this._openSubscription<'root'>(spec, serverSubscriptionId, abortController, notification => {
                    this.connectionInternals._subscriptionController.handleNotification({
                        kind: 'root',
                        notification,
                    });
                });
            case 'signature':
                return this._openSubscription<'signature'>(
                    spec,
                    serverSubscriptionId,
                    abortController,
                    notification => {
                        this.connectionInternals._subscriptionController.handleNotification({
                            kind: 'signature',
                            notification,
                        });
                    },
                );
            case 'slot':
                return this._openSubscription<'slot'>(spec, serverSubscriptionId, abortController, notification => {
                    this.connectionInternals._subscriptionController.handleNotification({
                        kind: 'slot',
                        notification,
                    });
                });
            case 'slotsUpdates':
                return this._openSubscription<'slotsUpdates'>(
                    spec,
                    serverSubscriptionId,
                    abortController,
                    notification => {
                        this.connectionInternals._subscriptionController.handleNotification({
                            kind: 'slotsUpdates',
                            notification,
                        });
                    },
                );
            case 'vote':
                return this._openSubscription<'vote'>(spec, serverSubscriptionId, abortController, notification => {
                    this.connectionInternals._subscriptionController.handleNotification({
                        kind: 'vote',
                        notification,
                    });
                });
        }
    }

    scheduleIdleClose(): void {
        if (this.channel === null || this.idleCloseTimeout !== null) {
            return;
        }

        this.idleCloseTimeout = setTimeout(() => {
            this.idleCloseTimeout = null;
            this.disconnect(1000);
        }, 500);
    }

    private disconnect(code: number, error?: Error): void {
        const abortController = this.connectionGeneration;
        this.channel = null;
        this.connectionGeneration = null;
        this.cancelIdleClose();
        if (abortController != null && !abortController.signal.aborted) {
            abortController.abort();
        }
        if (error != null) {
            console.error('ws error:', error.message);
        }
        this.connectionInternals._subscriptionRegistry.abortAllServerSubscriptions();
        this.connectionInternals._subscriptionController.handleRuntimeDisconnected(code);
    }

    private _openSubscription<TKind extends SubscriptionKind>(
        spec: SubscriptionSpecByKind[TKind],
        serverSubscriptionId: number,
        abortController: AbortController,
        onNotification: (notification: RpcWebSocketNotificationByKind[TKind]) => void,
    ): Promise<MockSubscriptionHandle> {
        const request: MockSubscriptionOpenRequest<RpcWebSocketNotificationByKind[TKind]> = {
            abortSignal: abortController.signal,
            onError: normalizedError => {
                if (this.channel !== null) {
                    this.disconnect(1006, normalizedError);
                } else {
                    console.error('ws error:', normalizedError.message);
                }
            },
            onNotification,
            onStop: id => {
                this.connectionInternals._subscriptionRegistry.abortServerSubscription(id);
            },
            serverSubscriptionId,
            subscriptionIsActive: id => this.connectionInternals._subscriptionRegistry.hasServerSubscription(id),
            unsubscribe: () =>
                Promise.resolve(
                    this.connectionInternals._subscriptionRegistry.abortServerSubscription(serverSubscriptionId),
                ),
        };
        return this.subscriptionAdapter.open(spec, request).catch(error => {
            this.connectionInternals._subscriptionRegistry.deleteServerSubscription(serverSubscriptionId);
            if (!abortController.signal.aborted) {
                abortController.abort();
            }
            throw error;
        });
    }
}

function isPromise<T>(value: PromiseLike<T> | T): value is PromiseLike<T> {
    return (
        !!value &&
        (typeof value === 'object' || typeof value === 'function') &&
        typeof (value as { then?: unknown }).then === 'function'
    );
}

export function emitHarnessEvent(
    harness: SubscriptionHarness,
    event: keyof SubscriptionHarnessEventMap,
    ...args: unknown[]
) {
    (harness.emit as (...rawArgs: unknown[]) => void)(event, ...args);
}

function installNotificationRelays(
    harness: MockSubscriptionHarness,
    activeSubscriptionRequestsByServerSubscriptionId: Map<number, ActiveSubscriptionRequest>,
): void {
    const routeNotification = (notification: AnyRpcWebSocketNotification) => {
        const request = activeSubscriptionRequestsByServerSubscriptionId.get(notification.subscription);
        request?.onNotification({
            ...notification,
            subscription: request.serverSubscriptionId,
        });
    };

    harness.on('accountNotification', routeNotification);
    harness.on('blockNotification', routeNotification);
    harness.on('logsNotification', routeNotification);
    harness.on('programNotification', routeNotification);
    harness.on('rootNotification', routeNotification);
    harness.on('signatureNotification', routeNotification);
    harness.on('slotNotification', routeNotification);
    harness.on('slotsUpdatesNotification', routeNotification);
    harness.on('voteNotification', routeNotification);
}

class MockSubscriptionAdapterImpl implements MockSubscriptionAdapter {
    private subscriptionCounter = 0;

    async open(spec: SubscriptionSpec, request: ActiveSubscriptionRequest): Promise<MockSubscriptionHandle> {
        expect(mockRpcSocket.length).to.be.at.least(1);
        const [mockRequest, mockResponse] = mockRpcSocket.shift() as [RpcRequest, RpcResponse];

        expect(spec).to.eql(createSubscriptionSpec(mockRequest.method, mockRequest.params ?? []));

        const abortPromise = new Promise<'aborted'>(resolve => {
            request.abortSignal.addEventListener('abort', () => resolve('aborted'), {
                once: true,
            });
        });

        if (mockRequest.subscriptionEstablishmentPromise) {
            const establishmentResult = await Promise.race<'aborted' | 'established'>([
                mockRequest.subscriptionEstablishmentPromise.then(() => 'established' as const),
                abortPromise,
            ]);
            if (establishmentResult === 'aborted') {
                throw new Error('Subscription aborted before it was established');
            }
        }

        if (request.abortSignal.aborted) {
            throw new Error('Subscription aborted before it was established');
        }

        const serverSubscriptionId = ++this.subscriptionCounter;
        const queueNotification = (value: unknown) => {
            if (request.abortSignal.aborted) {
                return;
            }
            const notification = {
                subscription: serverSubscriptionId,
                result: {
                    ...mockResponse,
                    value,
                },
            } as AnyRpcWebSocketNotification;

            setImmediate(() => {
                request.onNotification(notification);
            });
        };

        if (isPromise(mockResponse.value)) {
            void mockResponse.value.then(queueNotification);
        } else {
            queueNotification(mockResponse.value);
        }

        return {
            serverSubscriptionId,
            unsubscribe: () => Promise.resolve(true),
        };
    }
}

class StubSubscriptionAdapter implements MockSubscriptionAdapter {
    constructor(
        private readonly activeSubscriptionRequestsByServerSubscriptionId: Map<number, ActiveSubscriptionRequest>,
        private readonly requestSubscription: SinonStub<[SubscriptionSpec], Promise<number>>,
        private readonly unsubscribe: SinonStub<[number], Promise<boolean>>,
    ) {}

    async open(spec: SubscriptionSpec, request: ActiveSubscriptionRequest): Promise<MockSubscriptionHandle> {
        const subscriptionId = await this.requestSubscription(spec);
        this.activeSubscriptionRequestsByServerSubscriptionId.set(subscriptionId, request);
        return {
            serverSubscriptionId: request.serverSubscriptionId,
            unsubscribe: async () => {
                const abortPromise = request.unsubscribe();
                this.activeSubscriptionRequestsByServerSubscriptionId.delete(subscriptionId);
                const didUnsubscribe = await this.unsubscribe(subscriptionId);
                await abortPromise;
                return didUnsubscribe;
            },
        };
    }
}

function createMockSubscriptionHarnessListenerMap(): MockSubscriptionHarnessListenerMap {
    return {
        accountNotification: new Set(),
        blockNotification: new Set(),
        close: new Set(),
        error: new Set(),
        logsNotification: new Set(),
        open: new Set(),
        programNotification: new Set(),
        rootNotification: new Set(),
        signatureNotification: new Set(),
        slotNotification: new Set(),
        slotsUpdatesNotification: new Set(),
        voteNotification: new Set(),
    };
}

class MockSubscriptionHarness implements SubscriptionHarness {
    private channelOpen = false;
    private connectable = true;
    private readonly channelErrorListeners = new Set<(error: Error) => void>();
    private readonly listeners = createMockSubscriptionHarnessListenerMap();

    private readonly pendingChannelRequests = new Set<DeferredChannelPromise<SubscriptionChannel>>();

    createChannel(abortSignal: AbortSignal): Promise<SubscriptionChannel> {
        const deferredChannel = new DeferredChannelPromise<SubscriptionChannel>(abortSignal);
        if (abortSignal.aborted) {
            deferredChannel.reject(new Error('Subscriptions channel aborted before it was opened'));
            return deferredChannel as unknown as Promise<SubscriptionChannel>;
        }
        if (this.channelOpen) {
            deferredChannel.resolve(this.createResolvedChannel(abortSignal));
            return deferredChannel as unknown as Promise<SubscriptionChannel>;
        }
        this.pendingChannelRequests.add(deferredChannel);
        abortSignal.addEventListener(
            'abort',
            () => {
                if (!this.pendingChannelRequests.delete(deferredChannel)) {
                    return;
                }
                deferredChannel.reject(new Error('Subscriptions channel aborted before it was opened'));
            },
            { once: true },
        );
        if (this.connectable) {
            this.connect();
        }
        return deferredChannel as unknown as Promise<SubscriptionChannel>;
    }

    close(): void {
        if (this.channelOpen) {
            this.emit('close', 1000);
        }
    }

    connect(): void {
        this.emit('open');
    }

    destroy(): void {
        this.channelOpen = false;
        this.connectable = false;
        for (const pendingChannelRequest of this.pendingChannelRequests) {
            pendingChannelRequest.reject(new Error('Subscriptions channel was destroyed before it was opened'));
        }
        this.pendingChannelRequests.clear();
        this.channelErrorListeners.clear();
    }

    emit<TEventName extends keyof SubscriptionHarnessEventMap>(
        event: TEventName,
        ...args: Parameters<SubscriptionHarnessEventMap[TEventName]>
    ): void {
        if (event === 'open') {
            this.connectable = true;
            this.channelOpen = true;
            this.resolvePendingChannels();
        } else if (event === 'close') {
            const [code] = args as [number];
            this.channelOpen = false;
            this.connectable = code === 1000;
            if (code !== 1000) {
                const error = new Error('Subscriptions channel closed unexpectedly');
                for (const listener of this.channelErrorListeners) {
                    listener(error);
                }
            }
        }
        for (const listener of this.listeners[event]) {
            (listener as (...listenerArgs: typeof args) => void)(...args);
        }
    }

    notify(method: string): Promise<void> {
        if (!this.channelOpen) {
            return Promise.reject(
                new Error(
                    `Tried to send a JSON-RPC notification \`${method}\` but the subscriptions channel was not open`,
                ),
            );
        }
        return Promise.resolve();
    }

    on<TEventName extends keyof SubscriptionHarnessEventMap>(
        event: TEventName,
        listener: SubscriptionHarnessEventMap[TEventName],
    ): void {
        this.listeners[event].add(listener);
    }

    private createResolvedChannel(abortSignal: AbortSignal): SubscriptionChannel {
        if (!this.channelOpen) {
            this.channelOpen = true;
            this.emit('open');
        }
        abortSignal.addEventListener(
            'abort',
            () => {
                if (this.channelOpen) {
                    this.emit('close', 1000);
                }
            },
            { once: true },
        );
        return {
            on: (event: 'error', listener: (error: Error) => void, options?: { signal?: AbortSignal }) => {
                if (event !== 'error') {
                    return;
                }
                this.channelErrorListeners.add(listener);
                options?.signal?.addEventListener(
                    'abort',
                    () => {
                        this.channelErrorListeners.delete(listener);
                    },
                    { once: true },
                );
            },
            send: (message: { method: string }) => this.notify(message.method),
        } as SubscriptionChannel;
    }

    private resolvePendingChannels(): void {
        for (const pendingChannelRequest of this.pendingChannelRequests) {
            pendingChannelRequest.resolve(this.createResolvedChannel(pendingChannelRequest.abortSignal));
        }
        this.pendingChannelRequests.clear();
    }
}

export function createSubscriptionSpec(method: string, params: Array<any>): SubscriptionSpec {
    switch (method) {
        case 'accountSubscribe': {
            const [address, options] = params;
            return options == null
                ? { address, kind: 'account' }
                : buildAccountSubscriptionSpec(new PublicKey(address), options);
        }
        case 'blockSubscribe': {
            const [filter, options] = params;
            return options == null
                ? { filter, kind: 'block' }
                : buildBlockSubscriptionSpec(
                      filter === 'all' ? 'all' : new PublicKey(filter.mentionsAccountOrProgram),
                      options,
                  );
        }
        case 'logsSubscribe': {
            const [filter, options] = params;
            return options == null
                ? { filter, kind: 'logs' }
                : buildLogsSubscriptionSpec(
                      filter === 'all' || filter === 'allWithVotes' ? filter : new PublicKey(filter.mentions[0]),
                      options.commitment,
                  );
        }
        case 'programSubscribe': {
            const [address, options] = params;
            return options == null
                ? { address, kind: 'program' }
                : buildProgramSubscriptionSpec(new PublicKey(address), options);
        }
        case 'rootSubscribe':
            return { kind: 'root' };
        case 'signatureSubscribe': {
            const [signature, options] = params;
            return options == null
                ? { kind: 'signature', signature }
                : buildSignatureSubscriptionSpec(signature, options);
        }
        case 'slotSubscribe':
            return { kind: 'slot' };
        case 'slotsUpdatesSubscribe':
            return { kind: 'slotsUpdates' };
        case 'voteSubscribe':
            return { kind: 'vote' };
        default:
            throw new Error(`Unsupported mock subscription method \`${method}\``);
    }
}
