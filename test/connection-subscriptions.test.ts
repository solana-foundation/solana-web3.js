import {getBase58Decoder} from '@solana/kit';
import {expect, use} from 'chai';
import {SinonSpy, SinonStub, spy, stub} from 'sinon';
import sinonChai from 'sinon-chai';

import {
  AccountChangeCallback,
  BlockSubscriptionCallback,
  Commitment,
  Connection,
  LogsCallback,
  ProgramAccountChangeCallback,
  Address,
  RootChangeCallback,
  SignatureResultCallback,
  SlotChangeCallback,
  SlotUpdateCallback,
  VoteCallback,
} from '../src';
import {
  createSubscriptionSpec,
  createSignatureReceivedRpcResult,
  createSignatureStatusRpcResult,
  emitHarnessEvent,
  type SubscriptionHarness,
  stubSubscriptionHarness,
  teardownSubscriptions,
} from './mocks/rpc-subscriptions';
import {url} from './url';

const BASE58_DECODER = getBase58Decoder();
const TEST_TRANSACTION_SIGNATURE = BASE58_DECODER.decode(new Uint8Array(64));
const ALTERNATE_TRANSACTION_SIGNATURE = BASE58_DECODER.decode(
  new Uint8Array(64).fill(1),
);

use(sinonChai);

describe('Subscriptions', () => {
  let connection: Connection;
  let consoleErrorStub: SinonStub;
  let consoleWarnStub: SinonStub;
  let stubbedHarness: ReturnType<typeof stubSubscriptionHarness>['harness'];
  const flushSubscriptionUpdates = async () => {
    await new Promise<void>(resolve => setImmediate(resolve));
  };
  const subscriptionMethodsConfig = {
    accountSubscribe: {
      getExpectedAlternateParams: () => [
        'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        {
          commitment: connection.commitment || 'confirmed',
          encoding: 'base64',
        },
      ],
      getExpectedParams: () => [
        Address.default.toBase58(),
        {
          commitment: connection.commitment || 'confirmed',
          encoding: 'base64',
        },
      ],
      setupAlternateListener(callback: AccountChangeCallback): number {
        return connection.onAccountChange(
          new Address('C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK'),
          callback,
        );
      },
      setupListener(callback: AccountChangeCallback): number {
        return connection.onAccountChange(Address.default, callback);
      },
      setupListenerWithDefaultsOmitted(
        callback: AccountChangeCallback,
      ): number {
        return connection.onAccountChange(Address.default, callback);
      },
      setupListenerWithDefaultableParamsSetToTheirDefaults(
        callback: AccountChangeCallback,
      ): number {
        return connection.onAccountChange(
          Address.default,
          callback,
          connection.commitment || 'confirmed',
        );
      },
      publishNotificationForServerSubscriptionId(
        harness: SubscriptionHarness,
        serverSubscriptionId: number,
      ) {
        emitHarnessEvent(harness, 'accountNotification', {
          subscription: serverSubscriptionId,
          result: {
            context: {slot: 11n},
            value: {
              data: ['', 'base64'],
              executable: false,
              lamports: 0n,
              owner: Address.default.toBase58(),
              rentEpoch: 0n,
              space: 0n,
            },
          },
        });
      },
      teardownListener(
        ...args: Parameters<typeof connection.removeAccountChangeListener>
      ) {
        return connection.removeAccountChangeListener(...args);
      },
    },
    blockSubscribe: {
      getExpectedCommitment: () =>
        connection.commitment === 'confirmed' ||
        connection.commitment === 'finalized'
          ? connection.commitment
          : 'confirmed',
      getExpectedAlternateParams: () => [
        {
          mentionsAccountOrProgram:
            'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        },
        {
          commitment:
            connection.commitment === 'confirmed' ||
            connection.commitment === 'finalized'
              ? connection.commitment
              : 'confirmed',
        },
      ],
      getExpectedParams: () => [
        {mentionsAccountOrProgram: Address.default.toBase58()},
        {
          commitment:
            connection.commitment === 'confirmed' ||
            connection.commitment === 'finalized'
              ? connection.commitment
              : 'confirmed',
        },
      ],
      setupAlternateListener(callback: BlockSubscriptionCallback): number {
        return connection.onBlock(
          new Address('C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK'),
          callback,
        );
      },
      setupListener(callback: BlockSubscriptionCallback): number {
        return connection.onBlock(Address.default, callback);
      },
      setupListenerWithDefaultsOmitted: undefined,
      setupListenerWithDefaultableParamsSetToTheirDefaults: undefined,
      publishNotificationForServerSubscriptionId(
        harness: SubscriptionHarness,
        serverSubscriptionId: number,
      ) {
        emitHarnessEvent(harness, 'blockNotification', {
          subscription: serverSubscriptionId,
          result: {
            context: {slot: 11n},
            value: {
              block: {
                blockHeight: 1n,
                blockTime: 2n,
                blockhash: '11111111111111111111111111111111',
                parentSlot: 0n,
                previousBlockhash: '11111111111111111111111111111111',
              },
              err: null,
              slot: 1n,
            },
          },
        });
      },
      teardownListener(
        ...args: Parameters<typeof connection.removeBlockListener>
      ) {
        return connection.removeBlockListener(...args);
      },
    },
    logsSubscribe: {
      getExpectedAlternateParams: () => [
        {mentions: ['C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK']},
        {commitment: connection.commitment || 'confirmed'},
      ],
      getExpectedParams: () => [
        {mentions: [Address.default.toBase58()]},
        {commitment: connection.commitment || 'confirmed'},
      ],
      setupAlternateListener(callback: LogsCallback): number {
        return connection.onLogs(
          new Address('C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK'),
          callback,
        );
      },
      setupListener(callback: LogsCallback): number {
        return connection.onLogs(Address.default, callback);
      },
      setupListenerWithDefaultsOmitted(callback: LogsCallback): number {
        return connection.onLogs(Address.default, callback);
      },
      setupListenerWithDefaultableParamsSetToTheirDefaults(
        callback: LogsCallback,
      ): number {
        return connection.onLogs(
          Address.default,
          callback,
          connection.commitment || 'confirmed',
        );
      },
      publishNotificationForServerSubscriptionId(
        harness: SubscriptionHarness,
        serverSubscriptionId: number,
      ) {
        emitHarnessEvent(harness, 'logsNotification', {
          subscription: serverSubscriptionId,
          result: {
            context: {slot: 11n},
            value: {
              err: null,
              logs: [
                'SBF program 83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri success',
              ],
              signature:
                '5h6xBEauJ3PK6SWCZ1PGjBvj8vDdWG3KpwATGy1ARAXFSDwt8GFXM7W5Ncn16wmqokgpiKRLuS83KUxyZyv2sUYv',
            },
          },
        });
      },
      teardownListener(
        ...args: Parameters<typeof connection.removeOnLogsListener>
      ) {
        return connection.removeOnLogsListener(...args);
      },
    },
    programSubscribe: {
      getExpectedAlternateParams: () => [
        'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        {
          commitment: connection.commitment || 'confirmed',
          encoding: 'base64',
        },
      ],
      getExpectedParams: () => [
        Address.default.toBase58(),
        {
          commitment: connection.commitment || 'confirmed',
          encoding: 'base64',
        },
      ],
      setupAlternateListener(callback: ProgramAccountChangeCallback): number {
        return connection.onProgramAccountChange(
          new Address('C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK'),
          callback,
        );
      },
      setupListener(callback: ProgramAccountChangeCallback): number {
        return connection.onProgramAccountChange(Address.default, callback);
      },
      setupListenerWithDefaultsOmitted(
        callback: ProgramAccountChangeCallback,
      ): number {
        return connection.onProgramAccountChange(Address.default, callback);
      },
      setupListenerWithDefaultableParamsSetToTheirDefaults(
        callback: ProgramAccountChangeCallback,
      ): number {
        return connection.onProgramAccountChange(
          Address.default,
          callback,
          connection.commitment || 'confirmed',
        );
      },
      publishNotificationForServerSubscriptionId(
        harness: SubscriptionHarness,
        serverSubscriptionId: number,
      ) {
        emitHarnessEvent(harness, 'programNotification', {
          subscription: serverSubscriptionId,
          result: {
            context: {slot: 11n},
            value: {
              pubkey: Address.default.toBase58(),
              account: {
                data: ['', 'base64'],
                executable: false,
                lamports: 0n,
                owner: Address.default.toBase58(),
                rentEpoch: 0n,
                space: 0n,
              },
            },
          },
        });
      },
      teardownListener(
        ...args: Parameters<
          typeof connection.removeProgramAccountChangeListener
        >
      ) {
        return connection.removeProgramAccountChangeListener(...args);
      },
    },
    rootSubscribe: {
      getExpectedAlternateParams: () => [],
      getExpectedParams: () => [],
      setupAlternateListener: undefined,
      setupListener(callback: RootChangeCallback): number {
        return connection.onRootChange(callback);
      },
      setupListenerWithDefaultsOmitted: undefined,
      setupListenerWithDefaultableParamsSetToTheirDefaults: undefined,
      publishNotificationForServerSubscriptionId(
        harness: SubscriptionHarness,
        serverSubscriptionId: number,
      ) {
        emitHarnessEvent(harness, 'rootNotification', {
          subscription: serverSubscriptionId,
          result: 101n,
        });
      },
      teardownListener(
        ...args: Parameters<typeof connection.removeRootChangeListener>
      ) {
        return connection.removeRootChangeListener(...args);
      },
    },

    signatureSubscribe: {
      getExpectedAlternateParams: () => [
        ALTERNATE_TRANSACTION_SIGNATURE,
        {commitment: connection.commitment || 'confirmed'},
      ],
      getExpectedParams: () => [
        TEST_TRANSACTION_SIGNATURE,
        {commitment: connection.commitment || 'confirmed'},
      ],
      setupAlternateListener(callback: SignatureResultCallback): number {
        return connection.onSignature(
          ALTERNATE_TRANSACTION_SIGNATURE,
          callback,
        );
      },
      setupListener(callback: SignatureResultCallback): number {
        return connection.onSignature(TEST_TRANSACTION_SIGNATURE, callback);
      },
      setupListenerWithDefaultsOmitted(
        callback: SignatureResultCallback,
      ): number {
        return connection.onSignature(TEST_TRANSACTION_SIGNATURE, callback);
      },
      setupListenerWithDefaultableParamsSetToTheirDefaults(
        callback: SignatureResultCallback,
      ): number {
        return connection.onSignature(
          TEST_TRANSACTION_SIGNATURE,
          callback,
          connection.commitment || 'confirmed',
        );
      },
      publishNotificationForServerSubscriptionId(
        harness: SubscriptionHarness,
        serverSubscriptionId: number,
      ) {
        emitHarnessEvent(harness, 'signatureNotification', {
          subscription: serverSubscriptionId,
          result: {
            context: {slot: 11n},
            value: createSignatureStatusRpcResult(null),
          },
        });
      },
      teardownListener(
        ...args: Parameters<typeof connection.removeSignatureListener>
      ) {
        return connection.removeSignatureListener(...args);
      },
    },
    slotSubscribe: {
      getExpectedAlternateParams: () => [],
      getExpectedParams: () => [],
      setupAlternateListener: undefined,
      setupListener(callback: SlotChangeCallback): number {
        return connection.onSlotChange(callback);
      },
      setupListenerWithDefaultsOmitted: undefined,
      setupListenerWithDefaultableParamsSetToTheirDefaults: undefined,
      publishNotificationForServerSubscriptionId(
        harness: SubscriptionHarness,
        serverSubscriptionId: number,
      ) {
        emitHarnessEvent(harness, 'slotNotification', {
          subscription: serverSubscriptionId,
          result: {parent: 1n, slot: 2n, root: 0n},
        });
      },
      teardownListener(
        ...args: Parameters<typeof connection.removeSlotChangeListener>
      ) {
        return connection.removeSlotChangeListener(...args);
      },
    },
    slotsUpdatesSubscribe: {
      getExpectedAlternateParams: () => [],
      getExpectedParams: () => [],
      setupAlternateListener: undefined,
      setupListener(callback: SlotUpdateCallback): number {
        return connection.onSlotUpdate(callback);
      },
      setupListenerWithDefaultsOmitted: undefined,
      setupListenerWithDefaultableParamsSetToTheirDefaults: undefined,
      publishNotificationForServerSubscriptionId(
        harness: SubscriptionHarness,
        serverSubscriptionId: number,
      ) {
        emitHarnessEvent(harness, 'slotsUpdatesNotification', {
          subscription: serverSubscriptionId,
          result: {
            type: 'root',
            slot: 0n,
            timestamp: 322992000000n,
          },
        });
      },
      teardownListener(
        ...args: Parameters<typeof connection.removeSlotUpdateListener>
      ) {
        return connection.removeSlotUpdateListener(...args);
      },
    },
    voteSubscribe: {
      getExpectedAlternateParams: () => [],
      getExpectedParams: () => [],
      setupAlternateListener: undefined,
      setupListener(callback: VoteCallback): number {
        return connection.onVote(callback);
      },
      setupListenerWithDefaultsOmitted: undefined,
      setupListenerWithDefaultableParamsSetToTheirDefaults: undefined,
      publishNotificationForServerSubscriptionId(
        harness: SubscriptionHarness,
        serverSubscriptionId: number,
      ) {
        emitHarnessEvent(harness, 'voteNotification', {
          subscription: serverSubscriptionId,
          result: {
            hash: Address.default.toBase58(),
            signature: TEST_TRANSACTION_SIGNATURE,
            slots: [1n, 2n],
            timestamp: 322992000000n,
            votePubkey: Address.default.toBase58(),
          },
        });
      },
      teardownListener(
        ...args: Parameters<typeof connection.removeVoteListener>
      ) {
        return connection.removeVoteListener(...args);
      },
    },
  };
  beforeEach(() => {
    consoleErrorStub = stub(console, 'error');
    consoleWarnStub = stub(console, 'warn');
    const stubbedConnection = stubSubscriptionHarness(url);
    connection = stubbedConnection.connection;
    stubbedHarness = stubbedConnection.harness;
  });
  afterEach(async () => {
    await teardownSubscriptions(connection);
    consoleErrorStub.restore();
    consoleWarnStub.restore();
  });

  it('rejects if asked to await an inactive subscription', async () => {
    try {
      await connection.awaitSubscriptionReady(123_456);
      expect.fail('Expected subscription readiness to reject.');
    } catch (error) {
      expect((error as Error).message).to.equal(
        'Subscription with id `123456` is no longer active.',
      );
    }
  });

  Object.entries(subscriptionMethodsConfig).forEach(
    ([
      subscriptionMethod,
      {
        getExpectedAlternateParams,
        getExpectedParams,
        publishNotificationForServerSubscriptionId,
        setupAlternateListener,
        setupListener,
        teardownListener,
      },
    ]) => {
      const getExpectedSpec = () =>
        createSubscriptionSpec(subscriptionMethod, getExpectedParams());
      const getExpectedAlternateSpec = () =>
        createSubscriptionSpec(
          subscriptionMethod,
          getExpectedAlternateParams(),
        );

      describe(`The \`${subscriptionMethod}\` RPC method`, () => {
        describe('attaching the first notification listener', () => {
          let clientSubscriptionId: number;
          let listenerCallback: SinonSpy;
          let acknowledgeSubscription = (
            _serverSubscriptionId: number,
          ): void => {
            expect.fail(
              'Expected a function to have been assigned to `acknowledgeSubscription` in the test.',
            );
          };
          let fatalSubscription = (): void => {
            expect.fail(
              'Expected a function to have been assigned to `fatalSubscription` in the test.',
            );
          };
          const serverSubscriptionId = 0;
          beforeEach(() => {
            stubbedHarness.requestSubscription
              .withArgs(getExpectedSpec())
              .callsFake(
                () =>
                  // Defer the acknowledgement.
                  new Promise<number>((resolve, reject) => {
                    acknowledgeSubscription = resolve;
                    fatalSubscription = reject;
                  }),
              );
            listenerCallback = spy();
            clientSubscriptionId = setupListener(listenerCallback);
          });
          it('results in a subscription request being made to the RPC', () => {
            expect(
              stubbedHarness.requestSubscription,
            ).to.have.been.calledOnceWithExactly(getExpectedSpec());
          });
          describe('when awaiting subscription readiness', () => {
            it('resolves once the subscription is acknowledged by the server', async () => {
              const readinessPromise =
                connection.awaitSubscriptionReady(clientSubscriptionId);

              await acknowledgeSubscription(serverSubscriptionId);

              await readinessPromise;
            });

            it('rejects if the subscription fails to establish', async () => {
              const readinessPromise =
                connection.awaitSubscriptionReady(clientSubscriptionId);

              await fatalSubscription();
              await flushSubscriptionUpdates();

              try {
                await readinessPromise;
                expect.fail('Expected subscription readiness to reject.');
              } catch (error) {
                expect((error as Error).message).to.equal(
                  `Subscription with id \`${clientSubscriptionId}\` failed to establish.`,
                );
              }
            });

            it('rejects if the wait is aborted', async () => {
              const abortController = new AbortController();
              const readinessPromise = connection.awaitSubscriptionReady(
                clientSubscriptionId,
                {abortSignal: abortController.signal},
              );

              abortController.abort(new Error('subscription wait aborted'));

              try {
                await readinessPromise;
                expect.fail('Expected subscription readiness to reject.');
              } catch (error) {
                expect((error as Error).message).to.equal(
                  'subscription wait aborted',
                );
              }
            });

            it('does not resolve if the listener is removed before the subscription is acknowledged', async () => {
              const readinessPromise =
                connection.awaitSubscriptionReady(clientSubscriptionId);

              await teardownListener(clientSubscriptionId);
              await acknowledgeSubscription(serverSubscriptionId);
              await flushSubscriptionUpdates();

              try {
                await readinessPromise;
                expect.fail('Expected subscription readiness to reject.');
              } catch (error) {
                expect((error as Error).message).to.equal(
                  `Subscription with id \`${clientSubscriptionId}\` is no longer active.`,
                );
              }
            });

            it('rejects if that listener is removed before acknowledgement even when another listener keeps the shared subscription active', async () => {
              const secondClientSubscriptionId = setupListener(spy());
              const firstReadinessPromise =
                connection.awaitSubscriptionReady(clientSubscriptionId);
              const secondReadinessPromise = connection.awaitSubscriptionReady(
                secondClientSubscriptionId,
              );

              await teardownListener(clientSubscriptionId);
              await acknowledgeSubscription(serverSubscriptionId);
              await flushSubscriptionUpdates();

              try {
                await firstReadinessPromise;
                expect.fail(
                  'Expected the first subscription readiness to reject.',
                );
              } catch (error) {
                expect((error as Error).message).to.equal(
                  `Subscription with id \`${clientSubscriptionId}\` is no longer active.`,
                );
              }

              await secondReadinessPromise;
            });
          });
          describe('then unsubscribing that listener before the subscription has been acknowledged by the server', () => {
            beforeEach(async () => {
              stubbedHarness.unsubscribe.resetHistory();
              await teardownListener(clientSubscriptionId);
            });
            describe('once the subscription has been acknowledged by the server', () => {
              beforeEach(async () => {
                await acknowledgeSubscription(serverSubscriptionId);
                await flushSubscriptionUpdates();
              });
              it('results in the subscription being torn down immediately', () => {
                expect(
                  stubbedHarness.unsubscribe,
                ).to.have.been.calledOnceWithExactly(serverSubscriptionId);
              });
            });
          });
          describe('once the subscription has been acknowledged by the server', () => {
            beforeEach(async () => {
              await acknowledgeSubscription(serverSubscriptionId);
            });
            describe('when a notification is published', () => {
              beforeEach(() => {
                publishNotificationForServerSubscriptionId(
                  stubbedHarness as unknown as SubscriptionHarness,
                  serverSubscriptionId,
                );
              });
              it('fires the listener callback', () => {
                expect(listenerCallback).to.have.been.calledOnce;
              });
            });
            describe('then unsubscribing that listener', () => {
              let acknowledgeUnsubscribe = (_didUnsubscribe: boolean): void => {
                expect.fail(
                  'Expected a function to have been assigned to `acknowledgeUnsubscribe` in the test',
                );
              };
              let fatalUnsubscribe = (): void => {
                expect.fail(
                  'Expected a function to have been assigned to `fatalUnsubscribe` in the test',
                );
              };
              beforeEach(() => {
                stubbedHarness.unsubscribe.resetHistory();
                stubbedHarness.unsubscribe
                  .withArgs(serverSubscriptionId)
                  .callsFake(
                    () =>
                      // Defer the acknowledgement.
                      new Promise<boolean>((resolve, reject) => {
                        acknowledgeUnsubscribe = resolve;
                        fatalUnsubscribe = reject;
                      }),
                  );
                teardownListener(clientSubscriptionId);
              });
              it('results in an unsubscribe request being made to the RPC', () => {
                expect(
                  stubbedHarness.unsubscribe,
                ).to.have.been.calledOnceWithExactly(serverSubscriptionId);
              });
              describe('if a new listener is added before the unsubscribe is acknowledged by the server', () => {
                beforeEach(() => {
                  stubbedHarness.requestSubscription.resetHistory();
                  setupListener(spy());
                });
                describe('once that unsubscribe is acknowledged by the server', () => {
                  beforeEach(async () => {
                    await acknowledgeUnsubscribe(true);
                    await flushSubscriptionUpdates();
                  });
                  it('results in a new subscription request being made to the RPC', () => {
                    expect(
                      stubbedHarness.requestSubscription,
                    ).to.have.been.calledOnceWithExactly(getExpectedSpec());
                  });
                });
              });
              describe('when a notification is published before the unsubscribe is acknowledged by the server', () => {
                beforeEach(() => {
                  publishNotificationForServerSubscriptionId(
                    stubbedHarness as unknown as SubscriptionHarness,
                    serverSubscriptionId,
                  );
                });
                it('does not fire the listener callback', () => {
                  expect(listenerCallback).not.to.have.been.called;
                });
              });
              describe('if that unsubscribe throws an exception', () => {
                beforeEach(async () => {
                  stubbedHarness.unsubscribe.resetHistory();
                  await fatalUnsubscribe();
                });
                it('results in a retry unsubscribe request being made to the RPC', () => {
                  expect(
                    stubbedHarness.unsubscribe,
                  ).to.have.been.calledOnceWithExactly(serverSubscriptionId);
                });
              });
              describe('then having the socket connection error', () => {
                beforeEach(() => {
                  stubbedHarness.emit(
                    'error',
                    new Error('A bad thing happened to the socket'),
                  );
                });
                describe('making another subscription while disconnected', () => {
                  beforeEach(() => {
                    stubbedHarness.requestSubscription.resetHistory();
                    setupListener(spy());
                  });
                  it('does not issue an RPC call', () => {
                    expect(stubbedHarness.requestSubscription).not.to.have.been
                      .called;
                  });
                });
              });
              describe('then having the socket connection drop unexpectedly', () => {
                beforeEach(() => {
                  emitHarnessEvent(stubbedHarness, 'close', 1006);
                });
                describe('making another subscription while disconnected', () => {
                  beforeEach(() => {
                    stubbedHarness.requestSubscription.resetHistory();
                    setupListener(spy());
                  });
                  it('does not issue an RPC call', () => {
                    expect(stubbedHarness.requestSubscription).not.to.have.been
                      .called;
                  });
                });
                describe('upon the socket connection reopening', () => {
                  let fatalPriorUnubscribe: () => void;
                  beforeEach(() => {
                    fatalPriorUnubscribe = fatalUnsubscribe;
                    stubbedHarness.requestSubscription.resetHistory();
                    stubbedHarness.unsubscribe.resetHistory();
                    emitHarnessEvent(stubbedHarness, 'open');
                  });
                  it('does not result in a new unsubscription request being made to the RPC', () => {
                    expect(stubbedHarness.unsubscribe).not.to.have.been.called;
                  });
                  describe('then upon the prior unsubscribe fataling (eg. because its timeout triggers)', () => {
                    beforeEach(async () => {
                      stubbedHarness.unsubscribe.resetHistory();
                      await fatalPriorUnubscribe();
                    });
                    it('does not result in a new unsubscription request being made to the RPC', () => {
                      expect(stubbedHarness.unsubscribe).not.to.have.been
                        .called;
                    });
                  });
                });
              });
            });
            describe('attaching a second notification listener with the same params', () => {
              let secondListenerCallback: SinonSpy;
              beforeEach(() => {
                stubbedHarness.requestSubscription.resetHistory();
                secondListenerCallback = spy();
                setupListener(secondListenerCallback);
              });
              it('does not result in a second subscription request to the RPC', () => {
                expect(stubbedHarness.requestSubscription).not.to.have.been
                  .called;
              });
              describe('when a notification is published', () => {
                beforeEach(() => {
                  publishNotificationForServerSubscriptionId(
                    stubbedHarness as unknown as SubscriptionHarness,
                    serverSubscriptionId,
                  );
                });
                it("fires the first listener's callback", () => {
                  expect(listenerCallback).to.have.been.calledOnce;
                });
                it("fires the second listener's callback", () => {
                  expect(secondListenerCallback).to.have.been.calledOnce;
                });
              });
              describe('then unsubscribing the first listener', () => {
                beforeEach(async () => {
                  stubbedHarness.unsubscribe.resetHistory();
                  await teardownListener(clientSubscriptionId);
                });
                it('does not result in an unsubscribe request being made to the RPC', () => {
                  expect(stubbedHarness.unsubscribe).not.to.have.been.called;
                });
                describe('when a notification is published', () => {
                  beforeEach(() => {
                    publishNotificationForServerSubscriptionId(
                      stubbedHarness as unknown as SubscriptionHarness,
                      serverSubscriptionId,
                    );
                  });
                  it("does not fire the first listener's callback", () => {
                    expect(listenerCallback).not.to.have.been.called;
                  });
                  it("fires the second listener's callback", () => {
                    expect(secondListenerCallback).to.have.been.calledOnce;
                  });
                });
              });
            });
            if (setupAlternateListener) {
              describe('attaching a second notification listener with different params', () => {
                let alternateListenerCallback: SinonSpy;
                const secondServerSubscriptionId = 1;
                beforeEach(() => {
                  stubbedHarness.requestSubscription
                    .withArgs(getExpectedAlternateSpec())
                    .resolves(secondServerSubscriptionId);
                  alternateListenerCallback = spy();
                  setupAlternateListener(alternateListenerCallback);
                });
                it('results in a second subscription request being made to the RPC', () => {
                  expect(
                    stubbedHarness.requestSubscription,
                  ).to.have.been.calledWithExactly(getExpectedAlternateSpec());
                });
                describe('when a notification for the first subscription is published', () => {
                  beforeEach(() => {
                    publishNotificationForServerSubscriptionId(
                      stubbedHarness as unknown as SubscriptionHarness,
                      serverSubscriptionId,
                    );
                  });
                  it("fires the first listener's callback", () => {
                    expect(listenerCallback).to.have.been.called;
                  });
                  it("does not fire the second listener's callback", () => {
                    expect(alternateListenerCallback).not.to.have.been.called;
                  });
                });
                describe('when a notification for the second subscription is published', () => {
                  beforeEach(() => {
                    publishNotificationForServerSubscriptionId(
                      stubbedHarness as unknown as SubscriptionHarness,
                      secondServerSubscriptionId,
                    );
                  });
                  it("does not fire the first listener's callback", () => {
                    expect(listenerCallback).not.to.have.been.called;
                  });
                  it("fires the second listener's callback", () => {
                    expect(alternateListenerCallback).to.have.been.called;
                  });
                });
              });
            }
          });
          describe('if that subscription throws an exception', () => {
            beforeEach(async () => {
              stubbedHarness.requestSubscription.resetHistory();
              await fatalSubscription();
              await flushSubscriptionUpdates();
            });
            it('does not immediately retry that subscription request', () => {
              expect(stubbedHarness.requestSubscription).not.to.have.been
                .called;
            });
            describe('then attaching another listener for that subscription', () => {
              beforeEach(() => {
                stubbedHarness.requestSubscription.resetHistory();
                setupListener(spy());
              });
              it('results in a new subscription request being made to the RPC', () => {
                expect(
                  stubbedHarness.requestSubscription,
                ).to.have.been.calledOnceWithExactly(getExpectedSpec());
              });
            });
          });
          describe('then having the socket connection drop unexpectedly', () => {
            beforeEach(() => {
              emitHarnessEvent(stubbedHarness, 'close', 1006);
            });
            describe('then unsubscribing that listener', () => {
              beforeEach(async () => {
                await teardownListener(clientSubscriptionId);
              });
              describe('upon the socket connection reopening', () => {
                beforeEach(() => {
                  stubbedHarness.requestSubscription.resetHistory();
                  emitHarnessEvent(stubbedHarness, 'open');
                });
                it('does not result in a new subscription request being made to the RPC', () => {
                  expect(stubbedHarness.requestSubscription).not.to.have.been
                    .called;
                });
              });
            });
            describe('upon the socket connection reopening', () => {
              let fatalPriorSubscription: () => void;
              beforeEach(() => {
                fatalPriorSubscription = fatalSubscription;
                stubbedHarness.requestSubscription.resetHistory();
                emitHarnessEvent(stubbedHarness, 'open');
              });
              it('results in a new subscription request being made to the RPC', () => {
                expect(
                  stubbedHarness.requestSubscription,
                ).to.have.been.calledOnceWithExactly(getExpectedSpec());
              });
              describe('then upon the prior subscription fataling (eg. because its timeout triggers)', () => {
                beforeEach(async () => {
                  stubbedHarness.requestSubscription.resetHistory();
                  await fatalPriorSubscription();
                });
                it('does not result in a new subscription request being made to the RPC', () => {
                  expect(stubbedHarness.requestSubscription).not.to.have.been
                    .called;
                });
                describe('once the new subscription has been acknowledged by the server', () => {
                  beforeEach(async () => {
                    stubbedHarness.requestSubscription.resetHistory();
                    await acknowledgeSubscription(serverSubscriptionId);
                  });
                  describe('when a notification is published', () => {
                    beforeEach(() => {
                      publishNotificationForServerSubscriptionId(
                        stubbedHarness as unknown as SubscriptionHarness,
                        serverSubscriptionId,
                      );
                    });
                    it('fires the listener callback', () => {
                      expect(listenerCallback).to.have.been.calledOnce;
                    });
                  });
                });
              });
            });
          });
        });
      });
    },
  );
  describe('block notification payload mapping', () => {
    const serverSubscriptionId = 0;

    it('maps jsonParsed full block notifications into parsed transaction payloads', async () => {
      let acknowledgeSubscription = (_serverSubscriptionId: number): void => {
        expect.fail(
          'Expected a function to have been assigned to `acknowledgeSubscription` in the test.',
        );
      };
      const callback = spy();
      const expectedParams = [
        {mentionsAccountOrProgram: Address.default.toBase58()},
        {
          commitment: 'confirmed',
          encoding: 'jsonParsed',
          transactionDetails: 'full',
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'blockSubscribe',
        expectedParams,
      );

      stubbedHarness.requestSubscription.withArgs(expectedSpec).callsFake(
        () =>
          new Promise<number>(resolve => {
            acknowledgeSubscription = resolve;
          }),
      );

      connection.onBlock(Address.default, callback, {
        encoding: 'jsonParsed',
        transactionDetails: 'full',
      });
      await acknowledgeSubscription(serverSubscriptionId);
      await new Promise<void>(resolve => setImmediate(resolve));

      emitHarnessEvent(stubbedHarness, 'blockNotification', {
        subscription: serverSubscriptionId,
        result: {
          context: {slot: 11n},
          value: {
            block: {
              blockHeight: 0,
              blockTime: 1614281964,
              blockhash: '49d2UbduiZWjtR3Wvfv2t2QxmXvtZNWSPFRZxEDYAvQN',
              parentSlot: 0,
              previousBlockhash: 'mDd5yMLfuroS1JVZMHo2VZLTgKXXNBXrzPR5UkzFD4X',
              transactions: [
                {
                  meta: {
                    err: null,
                    fee: 5000,
                    innerInstructions: [],
                    logMessages: [
                      'Program Vote111111111111111111111111111111111111111 invoke [1]',
                      'Program Vote111111111111111111111111111111111111111 success',
                    ],
                    postBalances: [
                      3712706991, 5765419239, 1169280, 143487360, 1,
                    ],
                    postTokenBalances: [],
                    preBalances: [
                      3712711991, 5765419239, 1169280, 143487360, 1,
                    ],
                    preTokenBalances: [],
                    rewards: null,
                    status: {Ok: null},
                  },
                  transaction: {
                    message: {
                      accountKeys: [
                        {
                          pubkey:
                            '7v5fMKBqC9PuwjSdS9k9JU7efEXmq3bHTMF5fuSHnqrm',
                          signer: true,
                          source: 'transaction',
                          writable: true,
                        },
                        {
                          pubkey:
                            'AhcvnNdppGEcgdpK5gfcaZnAWz4ct8V4n7De5QiLiuzG',
                          signer: false,
                          source: 'transaction',
                          writable: true,
                        },
                        {
                          pubkey: 'SysvarC1ock11111111111111111111111111111111',
                          signer: false,
                          source: 'transaction',
                          writable: false,
                        },
                        {
                          pubkey: 'SysvarS1otHashes111111111111111111111111111',
                          signer: false,
                          source: 'transaction',
                          writable: false,
                        },
                        {
                          pubkey: 'Vote111111111111111111111111111111111111111',
                          signer: false,
                          source: 'transaction',
                          writable: false,
                        },
                      ],
                      addressTableLookups: null,
                      instructions: [
                        {
                          parsed: {
                            info: {
                              clockSysvar:
                                'SysvarC1ock11111111111111111111111111111111',
                              slotHashesSysvar:
                                'SysvarS1otHashes111111111111111111111111111',
                              vote: {
                                hash: '2gmQ8xMjZaXn63kr8qzPAUjQAHi7xCDjSibPdJxhVYMm',
                                slots: [164153060, 164153061],
                                timestamp: 1669845645,
                              },
                              voteAccount:
                                'AhcvnNdppGEcgdpK5gfcaZnAWz4ct8V4n7De5QiLiuzG',
                              voteAuthority:
                                '7v5fMKBqC9PuwjSdS9k9JU7efEXmq3bHTMF5fuSHnqrm',
                            },
                            type: 'vote',
                          },
                          program: 'vote',
                          programId:
                            'Vote111111111111111111111111111111111111111',
                        },
                      ],
                      recentBlockhash:
                        'GLqYrN6AQxCGtFTQywkPj2WN5tafC3KerBhW4QkmAyD4',
                    },
                    signatures: [
                      '5qDZ3nUUwp8VHFfAE5ydTQRULCoVLMGs16EprwdXsvyNCLe1NfckCkRE4BPi6wyEW9hXvG9iWU2prXfbM8SNPVEC',
                    ],
                  },
                  version: 'legacy',
                },
              ],
            },
            err: null,
            slot: 1n,
          },
        },
      });

      expect(callback).to.have.been.calledOnce;
      const [result, context] = callback.firstCall.args as [
        {
          block: {
            transactions: Array<{
              meta: {
                fee: bigint;
                postBalances: bigint[];
                preBalances: bigint[];
              } | null;
              transaction: {
                message: {
                  accountKeys: Array<{pubkey: string}>;
                  instructions: Array<{programId: string}>;
                };
              };
            }>;
          } | null;
          err: string | null;
          slot: bigint;
        },
        {slot: bigint},
      ];

      expect(context).to.eql({slot: 11n});
      expect(result).to.have.property('slot', 1n);
      expect(result).to.have.property('err', null);
      expect(result).to.have.property('block');
      expect(result.block).to.not.be.null;
      if (result.block == null) {
        throw new Error('Expected parsed block notification payload');
      }

      expect(result.block.transactions[0].meta).to.not.be.null;
      expect(result.block.transactions[0].meta?.fee).to.eq(5000n);
      expect(result.block.transactions[0].meta?.preBalances).to.eql([
        3712711991n,
        5765419239n,
        1169280n,
        143487360n,
        1n,
      ]);
      expect(result.block.transactions[0].meta?.postBalances).to.eql([
        3712706991n,
        5765419239n,
        1169280n,
        143487360n,
        1n,
      ]);
      expect(
        result.block.transactions[0].transaction.message.accountKeys[0].pubkey,
      ).to.eql('7v5fMKBqC9PuwjSdS9k9JU7efEXmq3bHTMF5fuSHnqrm');
      expect(
        result.block.transactions[0].transaction.message.instructions[0]
          .programId,
      ).to.eql('Vote111111111111111111111111111111111111111');
    });

    it('maps base64 full block notifications into wire transaction payloads', async () => {
      let acknowledgeSubscription = (_serverSubscriptionId: number): void => {
        expect.fail(
          'Expected a function to have been assigned to `acknowledgeSubscription` in the test.',
        );
      };
      const callback = spy();
      const expectedParams = [
        {mentionsAccountOrProgram: Address.default.toBase58()},
        {commitment: 'confirmed', encoding: 'base64'},
      ];
      const expectedSpec = createSubscriptionSpec(
        'blockSubscribe',
        expectedParams,
      );

      stubbedHarness.requestSubscription.withArgs(expectedSpec).callsFake(
        () =>
          new Promise<number>(resolve => {
            acknowledgeSubscription = resolve;
          }),
      );

      connection.onBlock(Address.default, callback, {
        encoding: 'base64',
      });
      await acknowledgeSubscription(serverSubscriptionId);
      await new Promise<void>(resolve => setImmediate(resolve));

      emitHarnessEvent(stubbedHarness, 'blockNotification', {
        subscription: serverSubscriptionId,
        result: {
          context: {slot: 9n},
          value: {
            block: {
              blockHeight: 7,
              blockTime: 1614281964,
              blockhash: '49d2UbduiZWjtR3Wvfv2t2QxmXvtZNWSPFRZxEDYAvQN',
              parentSlot: 6,
              previousBlockhash: 'mDd5yMLfuroS1JVZMHo2VZLTgKXXNBXrzPR5UkzFD4X',
              rewards: [
                {
                  commission: null,
                  lamports: 10,
                  postBalance: 11,
                  pubkey: 'Vote111111111111111111111111111111111111111',
                  rewardType: 'fee',
                },
              ],
              transactions: [
                {
                  meta: {
                    err: null,
                    fee: 5000,
                    innerInstructions: [],
                    logMessages: ['ok'],
                    postBalances: [1, 2],
                    postTokenBalances: [],
                    preBalances: [3, 4],
                    preTokenBalances: [],
                    rewards: null,
                    status: {Ok: null},
                  },
                  transaction: ['AQID', 'base64'],
                  version: 0,
                },
              ],
            },
            err: null,
            slot: 7n,
          },
        },
      });

      expect(callback).to.have.been.calledOnce;
      const [result, context] = callback.firstCall.args as [
        {
          block: {
            blockHeight: bigint | null;
            blockTime: bigint | null;
            parentSlot: bigint;
            rewards?: Array<{lamports: bigint; postBalance: bigint | null}>;
            transactions: Array<{
              meta: {
                fee: bigint;
                postBalances: bigint[];
                preBalances: bigint[];
              } | null;
              transaction: [string, 'base64'];
              version?: number | 'legacy';
            }>;
          } | null;
          err: string | null;
          slot: bigint;
        },
        {slot: bigint},
      ];

      expect(context).to.eql({slot: 9n});
      expect(result.slot).to.eq(7n);
      expect(result.err).to.eq(null);
      expect(result.block).to.not.be.null;
      if (result.block == null) {
        throw new Error('Expected base64 block notification payload');
      }

      expect(result.block.parentSlot).to.eq(6n);
      expect(result.block.blockHeight).to.eq(7n);
      expect(result.block.blockTime).to.eq(1614281964n);
      expect(result.block.rewards).to.eql([
        {
          commission: null,
          lamports: 10n,
          postBalance: 11n,
          pubkey: 'Vote111111111111111111111111111111111111111',
          rewardType: 'fee',
        },
      ]);
      expect(result.block.transactions[0].transaction).to.eql([
        'AQID',
        'base64',
      ]);
      expect(result.block.transactions[0].version).to.eq(0);
      expect(result.block.transactions[0].meta?.fee).to.eq(5000n);
      expect(result.block.transactions[0].meta?.preBalances).to.eql([3n, 4n]);
      expect(result.block.transactions[0].meta?.postBalances).to.eql([1n, 2n]);
    });
  });
  describe('account notification payload mapping', () => {
    const serverSubscriptionId = 0;

    it('maps jsonParsed account notifications into parsed account data payloads', async () => {
      let acknowledgeSubscription = (_serverSubscriptionId: number): void => {
        expect.fail(
          'Expected a function to have been assigned to `acknowledgeSubscription` in the test.',
        );
      };
      const callback = spy();
      const expectedParams = [
        Address.default.toBase58(),
        {
          commitment: 'confirmed',
          encoding: 'jsonParsed',
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'accountSubscribe',
        expectedParams,
      );

      stubbedHarness.requestSubscription.withArgs(expectedSpec).callsFake(
        () =>
          new Promise<number>(resolve => {
            acknowledgeSubscription = resolve;
          }),
      );

      connection.onAccountChange(Address.default, callback, {
        encoding: 'jsonParsed',
      });
      await acknowledgeSubscription(serverSubscriptionId);
      await flushSubscriptionUpdates();

      emitHarnessEvent(stubbedHarness, 'accountNotification', {
        subscription: serverSubscriptionId,
        result: {
          context: {slot: 11n},
          value: {
            data: {
              parsed: {
                info: {authority: Address.default.toBase58()},
                type: 'account',
              },
              program: 'spl-token',
              space: 165n,
            },
            executable: false,
            lamports: 1n,
            owner: Address.default.toBase58(),
            rentEpoch: 2n,
            space: 165n,
          },
        },
      });

      expect(callback).to.have.been.calledOnce;
      const [accountInfo, context] = callback.firstCall.args;
      expect(context.slot).to.eq(11n);
      expect(accountInfo.data).to.eql({
        parsed: {
          info: {authority: Address.default.toBase58()},
          type: 'account',
        },
        program: 'spl-token',
        space: 165n,
      });
    });

    it('maps jsonParsed program notifications into parsed account data payloads', async () => {
      let acknowledgeSubscription = (_serverSubscriptionId: number): void => {
        expect.fail(
          'Expected a function to have been assigned to `acknowledgeSubscription` in the test.',
        );
      };
      const callback = spy();
      const expectedParams = [
        Address.default.toBase58(),
        {
          commitment: 'confirmed',
          encoding: 'jsonParsed',
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'programSubscribe',
        expectedParams,
      );

      stubbedHarness.requestSubscription.withArgs(expectedSpec).callsFake(
        () =>
          new Promise<number>(resolve => {
            acknowledgeSubscription = resolve;
          }),
      );

      connection.onProgramAccountChange(Address.default, callback, {
        encoding: 'jsonParsed',
      });
      await acknowledgeSubscription(serverSubscriptionId);
      await flushSubscriptionUpdates();

      emitHarnessEvent(stubbedHarness, 'programNotification', {
        subscription: serverSubscriptionId,
        result: {
          context: {slot: 11n},
          value: {
            pubkey: Address.default.toBase58(),
            account: {
              data: {
                parsed: {
                  info: {authority: Address.default.toBase58()},
                  type: 'account',
                },
                program: 'spl-token',
                space: 165n,
              },
              executable: false,
              lamports: 1n,
              owner: Address.default.toBase58(),
              rentEpoch: 2n,
              space: 165n,
            },
          },
        },
      });

      expect(callback).to.have.been.calledOnce;
      const [keyedAccountInfo, context] = callback.firstCall.args;
      expect(context.slot).to.eq(11n);
      expect(keyedAccountInfo.accountId).to.eql(Address.default);
      expect(keyedAccountInfo.accountInfo.data).to.eql({
        parsed: {
          info: {authority: Address.default.toBase58()},
          type: 'account',
        },
        program: 'spl-token',
        space: 165n,
      });
    });

    it('passes base64+zstd account notifications through as compressed tuples', async () => {
      let acknowledgeSubscription = (_serverSubscriptionId: number): void => {
        expect.fail(
          'Expected a function to have been assigned to `acknowledgeSubscription` in the test.',
        );
      };
      const callback = spy();
      const expectedParams = [
        Address.default.toBase58(),
        {
          commitment: 'confirmed',
          encoding: 'base64+zstd',
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'accountSubscribe',
        expectedParams,
      );

      stubbedHarness.requestSubscription.withArgs(expectedSpec).callsFake(
        () =>
          new Promise<number>(resolve => {
            acknowledgeSubscription = resolve;
          }),
      );

      connection.onAccountChange(Address.default, callback, {
        encoding: 'base64+zstd',
      });
      await acknowledgeSubscription(serverSubscriptionId);
      await flushSubscriptionUpdates();

      emitHarnessEvent(stubbedHarness, 'accountNotification', {
        subscription: serverSubscriptionId,
        result: {
          context: {slot: 11n},
          value: {
            data: ['AQID', 'base64+zstd'],
            executable: false,
            lamports: 1n,
            owner: Address.default.toBase58(),
            rentEpoch: 2n,
            space: 3n,
          },
        },
      });

      expect(callback).to.have.been.calledOnce;
      const [accountInfo, context] = callback.firstCall.args;
      expect(context.slot).to.eq(11n);
      expect(accountInfo.data).to.eql(['AQID', 'base64+zstd']);
    });

    it('passes base64+zstd program notifications through as compressed tuples', async () => {
      let acknowledgeSubscription = (_serverSubscriptionId: number): void => {
        expect.fail(
          'Expected a function to have been assigned to `acknowledgeSubscription` in the test.',
        );
      };
      const callback = spy();
      const expectedParams = [
        Address.default.toBase58(),
        {
          commitment: 'confirmed',
          encoding: 'base64+zstd',
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'programSubscribe',
        expectedParams,
      );

      stubbedHarness.requestSubscription.withArgs(expectedSpec).callsFake(
        () =>
          new Promise<number>(resolve => {
            acknowledgeSubscription = resolve;
          }),
      );

      connection.onProgramAccountChange(Address.default, callback, {
        encoding: 'base64+zstd',
      });
      await acknowledgeSubscription(serverSubscriptionId);
      await flushSubscriptionUpdates();

      emitHarnessEvent(stubbedHarness, 'programNotification', {
        subscription: serverSubscriptionId,
        result: {
          context: {slot: 11n},
          value: {
            pubkey: Address.default.toBase58(),
            account: {
              data: ['AQID', 'base64+zstd'],
              executable: false,
              lamports: 1n,
              owner: Address.default.toBase58(),
              rentEpoch: 2n,
              space: 3n,
            },
          },
        },
      });

      expect(callback).to.have.been.calledOnce;
      const [keyedAccountInfo, context] = callback.firstCall.args;
      expect(context.slot).to.eq(11n);
      expect(keyedAccountInfo.accountId).to.eql(Address.default);
      expect(keyedAccountInfo.accountInfo.data).to.eql(['AQID', 'base64+zstd']);
    });
  });
  describe('subscription request shaping', () => {
    it('passes base64+zstd account subscription config through the websocket RPC', () => {
      const callback = spy();
      const expectedParams = [
        Address.default.toBase58(),
        {
          commitment: 'processed',
          encoding: 'base64+zstd',
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'accountSubscribe',
        expectedParams,
      );

      stubbedHarness.requestSubscription.withArgs(expectedSpec).resolves(0);

      connection.onAccountChange(Address.default, callback, {
        commitment: 'processed',
        encoding: 'base64+zstd',
      });

      expect(
        stubbedHarness.requestSubscription,
      ).to.have.been.calledOnceWithExactly(expectedSpec);
    });

    it('passes non-default block subscription config through the websocket RPC', () => {
      const callback = spy();
      const expectedParams = [
        {mentionsAccountOrProgram: Address.default.toBase58()},
        {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
          rewards: false,
          transactionDetails: 'accounts',
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'blockSubscribe',
        expectedParams,
      );

      stubbedHarness.requestSubscription.withArgs(expectedSpec).resolves(0);

      connection.onBlock(Address.default, callback, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
        rewards: false,
        transactionDetails: 'accounts',
      });

      expect(
        stubbedHarness.requestSubscription,
      ).to.have.been.calledOnceWithExactly(expectedSpec);
    });

    it('passes maxSupportedTransactionVersion 1 through the block subscription config', () => {
      const callback = spy();
      const expectedParams = [
        {mentionsAccountOrProgram: Address.default.toBase58()},
        {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 1,
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'blockSubscribe',
        expectedParams,
      );

      stubbedHarness.requestSubscription.withArgs(expectedSpec).resolves(0);

      connection.onBlock(Address.default, callback, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 1,
      });

      expect(
        stubbedHarness.requestSubscription,
      ).to.have.been.calledOnceWithExactly(expectedSpec);
    });

    it('passes deprecated program subscription filters through the websocket RPC', () => {
      const callback = spy();
      const expectedParams = [
        Address.default.toBase58(),
        {
          commitment: 'confirmed',
          encoding: 'base64',
          filters: [
            {dataSize: 123},
            {memcmp: {bytes: 'AAA', encoding: 'base58', offset: 1}},
          ],
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'programSubscribe',
        expectedParams,
      );

      stubbedHarness.requestSubscription.withArgs(expectedSpec).resolves(0);

      connection.onProgramAccountChange(Address.default, callback, undefined, [
        {dataSize: 123},
        {memcmp: {bytes: 'AAA', offset: 1}},
      ]);

      expect(
        stubbedHarness.requestSubscription,
      ).to.have.been.calledOnceWithExactly(expectedSpec);
    });

    it('passes base64+zstd program subscription config through the websocket RPC', () => {
      const callback = spy();
      const expectedParams = [
        Address.default.toBase58(),
        {
          commitment: 'processed',
          encoding: 'base64+zstd',
          filters: [{dataSize: 123}],
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'programSubscribe',
        expectedParams,
      );

      stubbedHarness.requestSubscription.withArgs(expectedSpec).resolves(0);

      connection.onProgramAccountChange(Address.default, callback, {
        commitment: 'processed',
        encoding: 'base64+zstd',
        filters: [{dataSize: 123}],
      });

      expect(
        stubbedHarness.requestSubscription,
      ).to.have.been.calledOnceWithExactly(expectedSpec);
    });
  });
  /**
   * Special case.
   * After a signature is processed, RPCs automatically dispose of the
   * subscription on the server side. This test asserts that RPC
   * unsubscribe request are only made before such a subscription has
   * received a notification which it knows to be final and indicative
   * that the RPC has auto-disposed the subscription.
   *
   * NOTE: There is a proposal to eliminate this special case, here:
   * https://github.com/solana-labs/solana/issues/18892
   */
  describe('auto-disposing subscriptions', () => {
    let clientSubscriptionId: number;
    const serverSubscriptionId = 0;
    const testSignature = TEST_TRANSACTION_SIGNATURE;
    const getExpectedParams = () => [
      testSignature,
      {commitment: connection.commitment || 'confirmed'},
    ];
    // This type of notification *is* indicative of auto-disposal.
    const FINAL_NOTIFICATION_RESULT = {
      context: {slot: 11n},
      value: createSignatureStatusRpcResult(null),
    };
    // This type of notification is *not* indicative of auto-disposal.
    const NON_FINAL_NOTIFICATION_RESULT = {
      context: {slot: 11n},
      value: createSignatureReceivedRpcResult(),
    };
    const expectedSpec = () =>
      createSubscriptionSpec('signatureSubscribe', getExpectedParams());
    beforeEach(() => {
      stubbedHarness.requestSubscription
        .withArgs(expectedSpec())
        .resolves(serverSubscriptionId);
      clientSubscriptionId = connection.onSignature(testSignature, spy());
    });
    describe('before an auto-disposing subscription has published any notification', () => {
      describe('then unsubscribing the listener', () => {
        beforeEach(async () => {
          stubbedHarness.unsubscribe.resetHistory();
          await connection.removeSignatureListener(clientSubscriptionId);
        });
        it('results in an unsubscribe request being made to the RPC', () => {
          expect(stubbedHarness.unsubscribe).to.have.been.calledWith(
            serverSubscriptionId,
          );
        });
      });
    });
    describe('after an auto-disposing subscription has published a non-final notification', () => {
      beforeEach(() => {
        emitHarnessEvent(stubbedHarness, 'signatureNotification', {
          subscription: serverSubscriptionId,
          result: NON_FINAL_NOTIFICATION_RESULT,
        });
      });
      it('should not result in an unsubscribe request being made to the RPC', () => {
        expect(stubbedHarness.unsubscribe).not.to.have.been.calledWith(
          serverSubscriptionId,
        );
      });
      describe('then unsubscribing the listener', () => {
        beforeEach(async () => {
          stubbedHarness.unsubscribe.resetHistory();
          await connection.removeSignatureListener(clientSubscriptionId);
        });
        it('results in an unsubscribe request being made to the RPC', () => {
          expect(stubbedHarness.unsubscribe).to.have.been.calledWith(
            serverSubscriptionId,
          );
        });
      });
    });
    describe('after an auto-disposing subscription has published its final notification', () => {
      beforeEach(() => {
        emitHarnessEvent(stubbedHarness, 'signatureNotification', {
          subscription: serverSubscriptionId,
          result: FINAL_NOTIFICATION_RESULT,
        });
      });
      it('should not result in an unsubscribe request being made to the RPC', () => {
        expect(stubbedHarness.unsubscribe).not.to.have.been.calledWith(
          serverSubscriptionId,
        );
      });
      describe('then unsubscribing the listener', () => {
        beforeEach(async () => {
          stubbedHarness.unsubscribe.resetHistory();
          await connection.removeSignatureListener(clientSubscriptionId);
        });
        it('should not result in an unsubscribe request being made to the RPC', () => {
          expect(stubbedHarness.unsubscribe).not.to.have.been.called;
        });
      });
    });
  });
  [
    undefined, // Let `Connection` use the default commitment
    'processed' as Commitment, // Override `Connection's` commitment
  ].forEach((maybeOverrideCommitment: Commitment | undefined) => {
    describe(`given a Connection with ${
      maybeOverrideCommitment
        ? `its commitment overridden to \`${maybeOverrideCommitment}\``
        : 'an unspecified commitment override'
    }`, () => {
      Object.entries(subscriptionMethodsConfig).forEach(
        ([
          subscriptionMethod,
          {
            getExpectedParams,
            setupListenerWithDefaultableParamsSetToTheirDefaults,
            setupListenerWithDefaultsOmitted,
          },
        ]) => {
          beforeEach(() => {
            const stubbedConnection = stubSubscriptionHarness(
              url,
              maybeOverrideCommitment,
            );
            connection = stubbedConnection.connection;
            stubbedHarness = stubbedConnection.harness;
          });
          afterEach(async () => {
            await teardownSubscriptions(connection);
          });
          if (
            setupListenerWithDefaultsOmitted &&
            setupListenerWithDefaultableParamsSetToTheirDefaults
          ) {
            describe('making a subscription with defaulted params omitted', () => {
              beforeEach(() => {
                setupListenerWithDefaultsOmitted(spy());
              });
              it('results in a subscription request being made to the RPC', () => {
                expect(
                  stubbedHarness.requestSubscription,
                ).to.have.been.calledWithExactly(
                  createSubscriptionSpec(
                    subscriptionMethod,
                    getExpectedParams(),
                  ),
                );
              });
              describe('then making the same subscription with the defaultable params set to their defaults', () => {
                beforeEach(() => {
                  stubbedHarness.requestSubscription.resetHistory();
                  setupListenerWithDefaultableParamsSetToTheirDefaults(spy());
                });
                it('does not result in a subscription request being made to the RPC', () => {
                  expect(stubbedHarness.requestSubscription).not.to.have.been
                    .called;
                });
              });
            });
          }
        },
      );
    });
  });
  describe('during state machine updates', () => {
    beforeEach(() => {
      stubbedHarness.connect.callsFake(() => {});
      stubbedHarness.close.callsFake(() => {});
    });
    afterEach(async () => {
      await teardownSubscriptions(connection);
    });
    /**
     * This is a regression test for the case described here:
     * https://github.com/solana-labs/solana/pull/24473#discussion_r858437090
     *
     * Essentially, you want to make sure that the state processor, as it recurses
     * always processes the latest version of every subscription. Depending on how
     * you craft the loop inside the processor, you can end up in this situation.
     *
     * 1A (pending subscription with zero callbacks; gets deleted then recurses)
     *  L 2B (pending subscription; transitions to subscribing and makes network call)
     * 2A (old version of subscription 2; transitions again and makes 2nd network call)
     *
     * The fact that subscription 2 made two network calls is the bug there.
     * What you want is this:
     *
     * 1A (pending subscription with zero callbacks; gets deleted then recurses)
     *  L 2B (pending subscription; transitions to subscribing and makes network call)
     * 2A (now in the subscribing state; skipped by the processor)
     *
     * Below is a test that tries to replicate this exact scenario.
     */
    it('the processor always operates over the most up-to-date state of a given subscription', () => {
      // Add two subscriptions.
      const clientSubscriptionIdA = connection.onAccountChange(
        new Address('C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK'),
        () => {},
      );
      connection.onAccountChange(
        new Address('27Y78XJXG9A13pnPajrB1VYU6EF8uNSoojPZBmhKsi8C'),
        () => {},
      );
      // Then remove the first one before the connection opens.
      connection.removeAccountChangeListener(clientSubscriptionIdA);
      // Then open the connection.
      emitHarnessEvent(stubbedHarness, 'open');
      // Despite recursion inside the state machine, ensure that the second
      // subscription only makes *one* connection attempt.
      expect(
        stubbedHarness.requestSubscription,
      ).to.have.been.calledOnceWithExactly({
        address: '27Y78XJXG9A13pnPajrB1VYU6EF8uNSoojPZBmhKsi8C',
        kind: 'account',
        options: {commitment: 'confirmed', encoding: 'base64'},
      });
    });
  });
});
