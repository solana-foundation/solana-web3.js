import {getBase58Decoder} from '@solana/kit';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
  type MockInstance,
} from 'vitest';
import {WebSocketServer} from 'ws';

import {
  AccountChangeCallback,
  BlockSubscriptionCallback,
  Commitment,
  Connection,
  LogsCallback,
  ProgramAccountChangeCallback,
  PublicKey,
  RootChangeCallback,
  SignatureResultCallback,
  SlotChangeCallback,
  SlotUpdateCallback,
  VoteCallback,
} from '../src';
import {
  blockMetadataCases,
  createBlock,
  expectBlockMetadataFields,
} from './mocks/block-metadata';
import {
  createSubscriptionSpec,
  createSignatureReceivedRpcResult,
  createSignatureStatusRpcResult,
  emitHarnessEvent,
  mockImplementationForArgs,
  type SubscriptionHarness,
  stubSubscriptionHarness,
  teardownSubscriptions,
} from './mocks/rpc-subscriptions';
import {isLive, url} from './url';

const BASE58_DECODER = getBase58Decoder();
const TEST_TRANSACTION_SIGNATURE = BASE58_DECODER.decode(new Uint8Array(64));
const ALTERNATE_TRANSACTION_SIGNATURE = BASE58_DECODER.decode(
  new Uint8Array(64).fill(1),
);

const FIRST_LOCAL_SERVER_SUBSCRIPTION_ID = 1;

function getSubscriptionRegistry(connection: Connection): {
  hasServerSubscription(serverSubscriptionId: number): boolean;
} {
  return (
    connection as unknown as {
      _subscriptionRegistry: {
        hasServerSubscription(serverSubscriptionId: number): boolean;
      };
    }
  )._subscriptionRegistry;
}

describe('Subscriptions', () => {
  let connection: Connection;
  let consoleErrorStub: MockInstance<typeof console.error>;
  let consoleWarnStub: MockInstance<typeof console.warn>;
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
        PublicKey.default.toBase58(),
        {
          commitment: connection.commitment || 'confirmed',
          encoding: 'base64',
        },
      ],
      setupAlternateListener(callback: AccountChangeCallback): number {
        return connection.onAccountChange(
          new PublicKey('C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK'),
          callback,
        );
      },
      setupListener(callback: AccountChangeCallback): number {
        return connection.onAccountChange(PublicKey.default, callback);
      },
      setupListenerWithDefaultsOmitted(
        callback: AccountChangeCallback,
      ): number {
        return connection.onAccountChange(PublicKey.default, callback);
      },
      setupListenerWithDefaultableParamsSetToTheirDefaults(
        callback: AccountChangeCallback,
      ): number {
        return connection.onAccountChange(
          PublicKey.default,
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
              owner: PublicKey.default.toBase58(),
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
        {mentionsAccountOrProgram: PublicKey.default.toBase58()},
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
          new PublicKey('C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK'),
          callback,
        );
      },
      setupListener(callback: BlockSubscriptionCallback): number {
        return connection.onBlock(PublicKey.default, callback);
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
        {mentions: [PublicKey.default.toBase58()]},
        {commitment: connection.commitment || 'confirmed'},
      ],
      setupAlternateListener(callback: LogsCallback): number {
        return connection.onLogs(
          new PublicKey('C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK'),
          callback,
        );
      },
      setupListener(callback: LogsCallback): number {
        return connection.onLogs(PublicKey.default, callback);
      },
      setupListenerWithDefaultsOmitted(callback: LogsCallback): number {
        return connection.onLogs(PublicKey.default, callback);
      },
      setupListenerWithDefaultableParamsSetToTheirDefaults(
        callback: LogsCallback,
      ): number {
        return connection.onLogs(
          PublicKey.default,
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
        PublicKey.default.toBase58(),
        {
          commitment: connection.commitment || 'confirmed',
          encoding: 'base64',
        },
      ],
      setupAlternateListener(callback: ProgramAccountChangeCallback): number {
        return connection.onProgramAccountChange(
          new PublicKey('C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK'),
          callback,
        );
      },
      setupListener(callback: ProgramAccountChangeCallback): number {
        return connection.onProgramAccountChange(PublicKey.default, callback);
      },
      setupListenerWithDefaultsOmitted(
        callback: ProgramAccountChangeCallback,
      ): number {
        return connection.onProgramAccountChange(PublicKey.default, callback);
      },
      setupListenerWithDefaultableParamsSetToTheirDefaults(
        callback: ProgramAccountChangeCallback,
      ): number {
        return connection.onProgramAccountChange(
          PublicKey.default,
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
              pubkey: PublicKey.default.toBase58(),
              account: {
                data: ['', 'base64'],
                executable: false,
                lamports: 0n,
                owner: PublicKey.default.toBase58(),
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
            hash: PublicKey.default.toBase58(),
            signature: TEST_TRANSACTION_SIGNATURE,
            slots: [1n, 2n],
            timestamp: 322992000000n,
            votePubkey: PublicKey.default.toBase58(),
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
    consoleErrorStub = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnStub = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stubbedConnection = stubSubscriptionHarness(url);
    connection = stubbedConnection.connection;
    stubbedHarness = stubbedConnection.harness;
  });
  afterEach(async () => {
    await teardownSubscriptions(connection);
    consoleErrorStub.mockRestore();
    consoleWarnStub.mockRestore();
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
          let listenerCallback: Mock;
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
            mockImplementationForArgs(
              stubbedHarness.requestSubscription,
              [getExpectedSpec()],
              () =>
                // Defer the acknowledgement.
                new Promise<number>((resolve, reject) => {
                  acknowledgeSubscription = resolve;
                  fatalSubscription = reject;
                }),
            );
            listenerCallback = vi.fn();
            clientSubscriptionId = setupListener(listenerCallback);
          });
          it('results in a subscription request being made to the RPC', () => {
            expect(
              stubbedHarness.requestSubscription,
            ).toHaveBeenCalledExactlyOnceWith(getExpectedSpec());
          });
          describe('when awaiting subscription readiness', () => {
            it('resolves once the subscription is acknowledged by the server', async () => {
              const readinessPromise =
                connection.awaitSubscriptionReady(clientSubscriptionId);

              acknowledgeSubscription(serverSubscriptionId);

              await readinessPromise;
            });

            it('rejects if the subscription fails to establish', async () => {
              const readinessRejection = expect(
                connection.awaitSubscriptionReady(clientSubscriptionId),
              ).rejects.toHaveProperty(
                'message',
                `Subscription with id \`${clientSubscriptionId}\` failed to establish.`,
              );

              fatalSubscription();
              await flushSubscriptionUpdates();

              await readinessRejection;
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
              const readinessRejection = expect(
                connection.awaitSubscriptionReady(clientSubscriptionId),
              ).rejects.toHaveProperty(
                'message',
                `Subscription with id \`${clientSubscriptionId}\` is no longer active.`,
              );

              await teardownListener(clientSubscriptionId);
              acknowledgeSubscription(serverSubscriptionId);
              await flushSubscriptionUpdates();

              await readinessRejection;
            });

            it('rejects if that listener is removed before acknowledgement even when another listener keeps the shared subscription active', async () => {
              const secondClientSubscriptionId = setupListener(vi.fn());
              const firstReadinessRejection = expect(
                connection.awaitSubscriptionReady(clientSubscriptionId),
              ).rejects.toHaveProperty(
                'message',
                `Subscription with id \`${clientSubscriptionId}\` is no longer active.`,
              );
              const secondReadinessPromise = connection.awaitSubscriptionReady(
                secondClientSubscriptionId,
              );

              await teardownListener(clientSubscriptionId);
              acknowledgeSubscription(serverSubscriptionId);
              await flushSubscriptionUpdates();

              await firstReadinessRejection;
              await secondReadinessPromise;
            });
          });
          describe('then unsubscribing that listener before the subscription has been acknowledged by the server', () => {
            beforeEach(async () => {
              stubbedHarness.unsubscribe.mockClear();
              await teardownListener(clientSubscriptionId);
            });
            describe('once the subscription has been acknowledged by the server', () => {
              beforeEach(async () => {
                acknowledgeSubscription(serverSubscriptionId);
                await flushSubscriptionUpdates();
              });
              it('results in the subscription being torn down immediately', () => {
                expect(
                  stubbedHarness.unsubscribe,
                ).toHaveBeenCalledExactlyOnceWith(serverSubscriptionId);
              });
            });
          });
          describe('once the subscription has been acknowledged by the server', () => {
            beforeEach(async () => {
              acknowledgeSubscription(serverSubscriptionId);
              await flushSubscriptionUpdates();
            });
            describe('when a notification is published', () => {
              beforeEach(() => {
                publishNotificationForServerSubscriptionId(
                  stubbedHarness as unknown as SubscriptionHarness,
                  serverSubscriptionId,
                );
              });
              it('fires the listener callback', () => {
                expect(listenerCallback).toHaveBeenCalledOnce();
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
                stubbedHarness.unsubscribe.mockClear();
                mockImplementationForArgs(
                  stubbedHarness.unsubscribe,
                  [serverSubscriptionId],
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
                ).toHaveBeenCalledExactlyOnceWith(serverSubscriptionId);
              });
              describe('if a new listener is added before the unsubscribe is acknowledged by the server', () => {
                beforeEach(() => {
                  stubbedHarness.requestSubscription.mockClear();
                  setupListener(vi.fn());
                });
                describe('once that unsubscribe is acknowledged by the server', () => {
                  beforeEach(async () => {
                    acknowledgeUnsubscribe(true);
                    await flushSubscriptionUpdates();
                  });
                  it('results in a new subscription request being made to the RPC', () => {
                    expect(
                      stubbedHarness.requestSubscription,
                    ).toHaveBeenCalledExactlyOnceWith(getExpectedSpec());
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
                  expect(listenerCallback).not.toHaveBeenCalled();
                });
              });
              describe('if that unsubscribe throws an exception', () => {
                beforeEach(async () => {
                  stubbedHarness.unsubscribe.mockClear();
                  fatalUnsubscribe();
                  await flushSubscriptionUpdates();
                });
                it('results in a retry unsubscribe request being made to the RPC', () => {
                  expect(
                    stubbedHarness.unsubscribe,
                  ).toHaveBeenCalledExactlyOnceWith(serverSubscriptionId);
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
                  beforeEach(async () => {
                    stubbedHarness.requestSubscription.mockClear();
                    setupListener(vi.fn());
                    await flushSubscriptionUpdates();
                  });
                  it('does not issue an RPC call', () => {
                    expect(
                      stubbedHarness.requestSubscription,
                    ).not.toHaveBeenCalled();
                  });
                  describe('upon the socket connection reopening', () => {
                    beforeEach(async () => {
                      emitHarnessEvent(stubbedHarness, 'open');
                      await flushSubscriptionUpdates();
                    });
                    it('results in a subscription request being made to the RPC', () => {
                      expect(
                        stubbedHarness.requestSubscription,
                      ).toHaveBeenCalledExactlyOnceWith(getExpectedSpec());
                    });
                  });
                });
              });
              describe('then having the socket connection drop unexpectedly', () => {
                beforeEach(() => {
                  emitHarnessEvent(stubbedHarness, 'close', 1006);
                });
                describe('making another subscription while disconnected', () => {
                  beforeEach(() => {
                    stubbedHarness.requestSubscription.mockClear();
                    setupListener(vi.fn());
                  });
                  it('does not issue an RPC call', () => {
                    expect(
                      stubbedHarness.requestSubscription,
                    ).not.toHaveBeenCalled();
                  });
                });
                describe('upon the socket connection reopening', () => {
                  let fatalPriorUnubscribe: () => void;
                  beforeEach(() => {
                    fatalPriorUnubscribe = fatalUnsubscribe;
                    stubbedHarness.requestSubscription.mockClear();
                    stubbedHarness.unsubscribe.mockClear();
                    emitHarnessEvent(stubbedHarness, 'open');
                  });
                  it('does not result in a new unsubscription request being made to the RPC', () => {
                    expect(stubbedHarness.unsubscribe).not.toHaveBeenCalled();
                  });
                  describe('then upon the prior unsubscribe fataling (eg. because its timeout triggers)', () => {
                    beforeEach(async () => {
                      stubbedHarness.unsubscribe.mockClear();
                      fatalPriorUnubscribe();
                      await flushSubscriptionUpdates();
                    });
                    it('does not result in a new unsubscription request being made to the RPC', () => {
                      expect(stubbedHarness.unsubscribe).not.toHaveBeenCalled();
                    });
                  });
                });
              });
            });
            describe('attaching a second notification listener with the same params', () => {
              let secondListenerCallback: Mock;
              beforeEach(() => {
                stubbedHarness.requestSubscription.mockClear();
                secondListenerCallback = vi.fn();
                setupListener(secondListenerCallback);
              });
              it('does not result in a second subscription request to the RPC', () => {
                expect(
                  stubbedHarness.requestSubscription,
                ).not.toHaveBeenCalled();
              });
              describe('when a notification is published', () => {
                beforeEach(() => {
                  publishNotificationForServerSubscriptionId(
                    stubbedHarness as unknown as SubscriptionHarness,
                    serverSubscriptionId,
                  );
                });
                it("fires the first listener's callback", () => {
                  expect(listenerCallback).toHaveBeenCalledOnce();
                });
                it("fires the second listener's callback", () => {
                  expect(secondListenerCallback).toHaveBeenCalledOnce();
                });
              });
              describe('then unsubscribing the first listener', () => {
                beforeEach(async () => {
                  stubbedHarness.unsubscribe.mockClear();
                  await teardownListener(clientSubscriptionId);
                });
                it('does not result in an unsubscribe request being made to the RPC', () => {
                  expect(stubbedHarness.unsubscribe).not.toHaveBeenCalled();
                });
                describe('when a notification is published', () => {
                  beforeEach(() => {
                    publishNotificationForServerSubscriptionId(
                      stubbedHarness as unknown as SubscriptionHarness,
                      serverSubscriptionId,
                    );
                  });
                  it("does not fire the first listener's callback", () => {
                    expect(listenerCallback).not.toHaveBeenCalled();
                  });
                  it("fires the second listener's callback", () => {
                    expect(secondListenerCallback).toHaveBeenCalledOnce();
                  });
                });
              });
            });
            if (setupAlternateListener) {
              describe('attaching a second notification listener with different params', () => {
                let alternateListenerCallback: Mock;
                const secondServerSubscriptionId = 1;
                beforeEach(() => {
                  mockImplementationForArgs(
                    stubbedHarness.requestSubscription,
                    [getExpectedAlternateSpec()],
                    () => Promise.resolve(secondServerSubscriptionId),
                  );
                  alternateListenerCallback = vi.fn();
                  setupAlternateListener(alternateListenerCallback);
                });
                it('results in a second subscription request being made to the RPC', () => {
                  expect(
                    stubbedHarness.requestSubscription,
                  ).toHaveBeenCalledWith(getExpectedAlternateSpec());
                });
                describe('when a notification for the first subscription is published', () => {
                  beforeEach(() => {
                    publishNotificationForServerSubscriptionId(
                      stubbedHarness as unknown as SubscriptionHarness,
                      serverSubscriptionId,
                    );
                  });
                  it("fires the first listener's callback", () => {
                    expect(listenerCallback).toHaveBeenCalled();
                  });
                  it("does not fire the second listener's callback", () => {
                    expect(alternateListenerCallback).not.toHaveBeenCalled();
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
                    expect(listenerCallback).not.toHaveBeenCalled();
                  });
                  it("fires the second listener's callback", () => {
                    expect(alternateListenerCallback).toHaveBeenCalled();
                  });
                });
              });
            }
          });
          describe('if that subscription throws an exception', () => {
            beforeEach(async () => {
              stubbedHarness.requestSubscription.mockClear();
              fatalSubscription();
              await flushSubscriptionUpdates();
            });
            it('does not immediately retry that subscription request', () => {
              expect(stubbedHarness.requestSubscription).not.toHaveBeenCalled();
            });
            describe('then attaching another listener for that subscription', () => {
              beforeEach(() => {
                stubbedHarness.requestSubscription.mockClear();
                setupListener(vi.fn());
              });
              it('results in a new subscription request being made to the RPC', () => {
                expect(
                  stubbedHarness.requestSubscription,
                ).toHaveBeenCalledExactlyOnceWith(getExpectedSpec());
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
                  stubbedHarness.requestSubscription.mockClear();
                  emitHarnessEvent(stubbedHarness, 'open');
                });
                it('does not result in a new subscription request being made to the RPC', () => {
                  expect(
                    stubbedHarness.requestSubscription,
                  ).not.toHaveBeenCalled();
                });
              });
            });
            describe('upon the socket connection reopening', () => {
              let fatalPriorSubscription: () => void;
              beforeEach(() => {
                fatalPriorSubscription = fatalSubscription;
                stubbedHarness.requestSubscription.mockClear();
                emitHarnessEvent(stubbedHarness, 'open');
              });
              it('results in a new subscription request being made to the RPC', () => {
                expect(
                  stubbedHarness.requestSubscription,
                ).toHaveBeenCalledExactlyOnceWith(getExpectedSpec());
              });
              describe('then upon the prior subscription fataling (eg. because its timeout triggers)', () => {
                beforeEach(async () => {
                  stubbedHarness.requestSubscription.mockClear();
                  fatalPriorSubscription();
                  await flushSubscriptionUpdates();
                });
                it('does not result in a new subscription request being made to the RPC', () => {
                  expect(
                    stubbedHarness.requestSubscription,
                  ).not.toHaveBeenCalled();
                });
                describe('once the new subscription has been acknowledged by the server', () => {
                  beforeEach(async () => {
                    stubbedHarness.requestSubscription.mockClear();
                    acknowledgeSubscription(serverSubscriptionId);
                    await flushSubscriptionUpdates();
                  });
                  describe('when a notification is published', () => {
                    beforeEach(() => {
                      publishNotificationForServerSubscriptionId(
                        stubbedHarness as unknown as SubscriptionHarness,
                        serverSubscriptionId,
                      );
                    });
                    it('fires the listener callback', () => {
                      expect(listenerCallback).toHaveBeenCalledOnce();
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
      const callback = vi.fn();
      const expectedParams = [
        {mentionsAccountOrProgram: PublicKey.default.toBase58()},
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

      mockImplementationForArgs(
        stubbedHarness.requestSubscription,
        [expectedSpec],
        () =>
          new Promise<number>(resolve => {
            acknowledgeSubscription = resolve;
          }),
      );

      connection.onBlock(PublicKey.default, callback, {
        encoding: 'jsonParsed',
        transactionDetails: 'full',
      });
      acknowledgeSubscription(serverSubscriptionId);
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

      expect(callback).toHaveBeenCalledOnce();
      const [result, context] = callback.mock.calls[0] as [
        {
          block: {
            transactions: Array<{
              meta: {
                fee: bigint;
                loadedAddresses?: {readonly: string[]; writable: string[]};
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
      expect(result.block.transactions[0].meta).to.not.have.property(
        'loadedAddresses',
      );
    });

    it('maps base64 full block notifications into wire transaction payloads', async () => {
      let acknowledgeSubscription = (_serverSubscriptionId: number): void => {
        expect.fail(
          'Expected a function to have been assigned to `acknowledgeSubscription` in the test.',
        );
      };
      const callback = vi.fn();
      const expectedParams = [
        {mentionsAccountOrProgram: PublicKey.default.toBase58()},
        {commitment: 'confirmed', encoding: 'base64'},
      ];
      const expectedSpec = createSubscriptionSpec(
        'blockSubscribe',
        expectedParams,
      );

      mockImplementationForArgs(
        stubbedHarness.requestSubscription,
        [expectedSpec],
        () =>
          new Promise<number>(resolve => {
            acknowledgeSubscription = resolve;
          }),
      );

      connection.onBlock(PublicKey.default, callback, {
        encoding: 'base64',
      });
      acknowledgeSubscription(serverSubscriptionId);
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
                    loadedAddresses: {
                      readonly: ['SysvarC1ock11111111111111111111111111111111'],
                      writable: [
                        'AhcvnNdppGEcgdpK5gfcaZnAWz4ct8V4n7De5QiLiuzG',
                      ],
                    },
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

      expect(callback).toHaveBeenCalledOnce();
      const [result, context] = callback.mock.calls[0] as [
        {
          block: {
            blockHeight: bigint | null;
            blockTime: bigint | null;
            parentSlot: bigint;
            rewards?: Array<{lamports: bigint; postBalance: bigint | null}>;
            transactions: Array<{
              meta: {
                fee: bigint;
                loadedAddresses?: {readonly: string[]; writable: string[]};
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
      expect(result.block.transactions[0].meta?.loadedAddresses).to.eql({
        readonly: ['SysvarC1ock11111111111111111111111111111111'],
        writable: ['AhcvnNdppGEcgdpK5gfcaZnAWz4ct8V4n7De5QiLiuzG'],
      });
    });

    for (const {name, full, accounts} of blockMetadataCases) {
      for (const mode of [
        'json',
        'jsonParsed',
        'base58',
        'base64',
        'accounts',
      ] as const) {
        it(`preserves ${name} array metadata for ${mode} block notifications`, async () => {
          const callback = vi.fn();
          const source = mode === 'accounts' ? accounts : full;
          const subscribe = {
            accounts: () =>
              connection.onBlock('all', callback, {
                transactionDetails: 'accounts',
              }),
            base58: () =>
              connection.onBlock('all', callback, {encoding: 'base58'}),
            base64: () =>
              connection.onBlock('all', callback, {encoding: 'base64'}),
            json: () => connection.onBlock('all', callback, {encoding: 'json'}),
            jsonParsed: () =>
              connection.onBlock('all', callback, {encoding: 'jsonParsed'}),
          };
          stubbedHarness.requestSubscription.mockResolvedValue(
            serverSubscriptionId,
          );
          subscribe[mode]();
          await new Promise<void>(resolve => setImmediate(resolve));

          emitHarnessEvent(stubbedHarness, 'blockNotification', {
            subscription: serverSubscriptionId,
            result: {
              context: {slot: 1n},
              value: {
                block: createBlock(
                  mode === 'accounts' ? 'json' : mode,
                  mode === 'accounts' ? 'accounts' : 'full',
                  source,
                ),
                err: null,
                slot: 1n,
              },
            },
          });

          expect(callback).toHaveBeenCalledOnce();
          expectBlockMetadataFields(
            callback.mock.calls[0][0].block?.transactions[0].meta,
            source,
          );
        });
      }
    }
  });
  describe('account notification payload mapping', () => {
    const serverSubscriptionId = 0;

    it('maps jsonParsed account notifications into parsed account data payloads', async () => {
      let acknowledgeSubscription = (_serverSubscriptionId: number): void => {
        expect.fail(
          'Expected a function to have been assigned to `acknowledgeSubscription` in the test.',
        );
      };
      const callback = vi.fn();
      const expectedParams = [
        PublicKey.default.toBase58(),
        {
          commitment: 'confirmed',
          encoding: 'jsonParsed',
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'accountSubscribe',
        expectedParams,
      );

      mockImplementationForArgs(
        stubbedHarness.requestSubscription,
        [expectedSpec],
        () =>
          new Promise<number>(resolve => {
            acknowledgeSubscription = resolve;
          }),
      );

      connection.onAccountChange(PublicKey.default, callback, {
        encoding: 'jsonParsed',
      });
      acknowledgeSubscription(serverSubscriptionId);
      await flushSubscriptionUpdates();

      emitHarnessEvent(stubbedHarness, 'accountNotification', {
        subscription: serverSubscriptionId,
        result: {
          context: {slot: 11n},
          value: {
            data: {
              parsed: {
                info: {authority: PublicKey.default.toBase58()},
                type: 'account',
              },
              program: 'spl-token',
              space: 165n,
            },
            executable: false,
            lamports: 1n,
            owner: PublicKey.default.toBase58(),
            rentEpoch: 2n,
            space: 165n,
          },
        },
      });

      expect(callback).toHaveBeenCalledOnce();
      const [accountInfo, context] = callback.mock.calls[0];
      expect(context.slot).to.eq(11n);
      expect(accountInfo.data).to.eql({
        parsed: {
          info: {authority: PublicKey.default.toBase58()},
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
      const callback = vi.fn();
      const expectedParams = [
        PublicKey.default.toBase58(),
        {
          commitment: 'confirmed',
          encoding: 'jsonParsed',
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'programSubscribe',
        expectedParams,
      );

      mockImplementationForArgs(
        stubbedHarness.requestSubscription,
        [expectedSpec],
        () =>
          new Promise<number>(resolve => {
            acknowledgeSubscription = resolve;
          }),
      );

      connection.onProgramAccountChange(PublicKey.default, callback, {
        encoding: 'jsonParsed',
      });
      acknowledgeSubscription(serverSubscriptionId);
      await flushSubscriptionUpdates();

      emitHarnessEvent(stubbedHarness, 'programNotification', {
        subscription: serverSubscriptionId,
        result: {
          context: {slot: 11n},
          value: {
            pubkey: PublicKey.default.toBase58(),
            account: {
              data: {
                parsed: {
                  info: {authority: PublicKey.default.toBase58()},
                  type: 'account',
                },
                program: 'spl-token',
                space: 165n,
              },
              executable: false,
              lamports: 1n,
              owner: PublicKey.default.toBase58(),
              rentEpoch: 2n,
              space: 165n,
            },
          },
        },
      });

      expect(callback).toHaveBeenCalledOnce();
      const [keyedAccountInfo, context] = callback.mock.calls[0];
      expect(context.slot).to.eq(11n);
      expect(keyedAccountInfo.accountId).to.eql(PublicKey.default);
      expect(keyedAccountInfo.accountInfo.data).to.eql({
        parsed: {
          info: {authority: PublicKey.default.toBase58()},
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
      const callback = vi.fn();
      const expectedParams = [
        PublicKey.default.toBase58(),
        {
          commitment: 'confirmed',
          encoding: 'base64+zstd',
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'accountSubscribe',
        expectedParams,
      );

      mockImplementationForArgs(
        stubbedHarness.requestSubscription,
        [expectedSpec],
        () =>
          new Promise<number>(resolve => {
            acknowledgeSubscription = resolve;
          }),
      );

      connection.onAccountChange(PublicKey.default, callback, {
        encoding: 'base64+zstd',
      });
      acknowledgeSubscription(serverSubscriptionId);
      await flushSubscriptionUpdates();

      emitHarnessEvent(stubbedHarness, 'accountNotification', {
        subscription: serverSubscriptionId,
        result: {
          context: {slot: 11n},
          value: {
            data: ['AQID', 'base64+zstd'],
            executable: false,
            lamports: 1n,
            owner: PublicKey.default.toBase58(),
            rentEpoch: 2n,
            space: 3n,
          },
        },
      });

      expect(callback).toHaveBeenCalledOnce();
      const [accountInfo, context] = callback.mock.calls[0];
      expect(context.slot).to.eq(11n);
      expect(accountInfo.data).to.eql(['AQID', 'base64+zstd']);
    });

    it('passes base64+zstd program notifications through as compressed tuples', async () => {
      let acknowledgeSubscription = (_serverSubscriptionId: number): void => {
        expect.fail(
          'Expected a function to have been assigned to `acknowledgeSubscription` in the test.',
        );
      };
      const callback = vi.fn();
      const expectedParams = [
        PublicKey.default.toBase58(),
        {
          commitment: 'confirmed',
          encoding: 'base64+zstd',
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'programSubscribe',
        expectedParams,
      );

      mockImplementationForArgs(
        stubbedHarness.requestSubscription,
        [expectedSpec],
        () =>
          new Promise<number>(resolve => {
            acknowledgeSubscription = resolve;
          }),
      );

      connection.onProgramAccountChange(PublicKey.default, callback, {
        encoding: 'base64+zstd',
      });
      acknowledgeSubscription(serverSubscriptionId);
      await flushSubscriptionUpdates();

      emitHarnessEvent(stubbedHarness, 'programNotification', {
        subscription: serverSubscriptionId,
        result: {
          context: {slot: 11n},
          value: {
            pubkey: PublicKey.default.toBase58(),
            account: {
              data: ['AQID', 'base64+zstd'],
              executable: false,
              lamports: 1n,
              owner: PublicKey.default.toBase58(),
              rentEpoch: 2n,
              space: 3n,
            },
          },
        },
      });

      expect(callback).toHaveBeenCalledOnce();
      const [keyedAccountInfo, context] = callback.mock.calls[0];
      expect(context.slot).to.eq(11n);
      expect(keyedAccountInfo.accountId).to.eql(PublicKey.default);
      expect(keyedAccountInfo.accountInfo.data).to.eql(['AQID', 'base64+zstd']);
    });
  });
  describe('subscription request shaping', () => {
    it('passes base64+zstd account subscription config through the websocket RPC', () => {
      const callback = vi.fn();
      const expectedParams = [
        PublicKey.default.toBase58(),
        {
          commitment: 'processed',
          encoding: 'base64+zstd',
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'accountSubscribe',
        expectedParams,
      );

      mockImplementationForArgs(
        stubbedHarness.requestSubscription,
        [expectedSpec],
        () => Promise.resolve(0),
      );

      connection.onAccountChange(PublicKey.default, callback, {
        commitment: 'processed',
        encoding: 'base64+zstd',
      });

      expect(stubbedHarness.requestSubscription.mock.calls).toStrictEqual([
        [expectedSpec],
      ]);
    });

    it('passes non-default block subscription config through the websocket RPC', () => {
      const callback = vi.fn();
      const expectedParams = [
        {mentionsAccountOrProgram: PublicKey.default.toBase58()},
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

      mockImplementationForArgs(
        stubbedHarness.requestSubscription,
        [expectedSpec],
        () => Promise.resolve(0),
      );

      connection.onBlock(PublicKey.default, callback, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
        rewards: false,
        transactionDetails: 'accounts',
      });

      expect(stubbedHarness.requestSubscription.mock.calls).toStrictEqual([
        [expectedSpec],
      ]);
    });

    it('passes maxSupportedTransactionVersion 1 through the block subscription config', () => {
      const callback = vi.fn();
      const expectedParams = [
        {mentionsAccountOrProgram: PublicKey.default.toBase58()},
        {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 1,
        },
      ];
      const expectedSpec = createSubscriptionSpec(
        'blockSubscribe',
        expectedParams,
      );

      mockImplementationForArgs(
        stubbedHarness.requestSubscription,
        [expectedSpec],
        () => Promise.resolve(0),
      );

      connection.onBlock(PublicKey.default, callback, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 1,
      });

      expect(stubbedHarness.requestSubscription.mock.calls).toStrictEqual([
        [expectedSpec],
      ]);
    });

    it('passes deprecated program subscription filters through the websocket RPC', () => {
      const callback = vi.fn();
      const expectedParams = [
        PublicKey.default.toBase58(),
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

      mockImplementationForArgs(
        stubbedHarness.requestSubscription,
        [expectedSpec],
        () => Promise.resolve(0),
      );

      connection.onProgramAccountChange(
        PublicKey.default,
        callback,
        undefined,
        [{dataSize: 123}, {memcmp: {bytes: 'AAA', offset: 1}}],
      );

      expect(stubbedHarness.requestSubscription.mock.calls).toStrictEqual([
        [expectedSpec],
      ]);
    });

    for (const memcmp of [undefined, null]) {
      it(`drops \`memcmp: ${memcmp}\` from dataSize program subscription filters`, () => {
        const callback = vi.fn();
        const expectedParams = [
          PublicKey.default.toBase58(),
          {
            commitment: 'confirmed',
            encoding: 'base64',
            filters: [{dataSize: 123}],
          },
        ];
        const expectedSpec = createSubscriptionSpec(
          'programSubscribe',
          expectedParams,
        );
        const filters = [{dataSize: 123, memcmp}];

        mockImplementationForArgs(
          stubbedHarness.requestSubscription,
          [expectedSpec],
          () => Promise.resolve(0),
        );

        connection.onProgramAccountChange(PublicKey.default, callback, {
          filters,
        });

        expect(stubbedHarness.requestSubscription.mock.calls).toStrictEqual([
          [expectedSpec],
        ]);
      });
    }

    it('passes base64+zstd program subscription config through the websocket RPC', () => {
      const callback = vi.fn();
      const expectedParams = [
        PublicKey.default.toBase58(),
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

      mockImplementationForArgs(
        stubbedHarness.requestSubscription,
        [expectedSpec],
        () => Promise.resolve(0),
      );

      connection.onProgramAccountChange(PublicKey.default, callback, {
        commitment: 'processed',
        encoding: 'base64+zstd',
        filters: [{dataSize: 123}],
      });

      expect(stubbedHarness.requestSubscription.mock.calls).toStrictEqual([
        [expectedSpec],
      ]);
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
      mockImplementationForArgs(
        stubbedHarness.requestSubscription,
        [expectedSpec()],
        () => Promise.resolve(serverSubscriptionId),
      );
      clientSubscriptionId = connection.onSignature(testSignature, vi.fn());
    });
    describe('before an auto-disposing subscription has published any notification', () => {
      describe('then unsubscribing the listener', () => {
        beforeEach(async () => {
          stubbedHarness.unsubscribe.mockClear();
          await connection.removeSignatureListener(clientSubscriptionId);
        });
        it('results in an unsubscribe request being made to the RPC', () => {
          expect(stubbedHarness.unsubscribe).toHaveBeenCalledWith(
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
        expect(stubbedHarness.unsubscribe).not.toHaveBeenCalledWith(
          serverSubscriptionId,
        );
      });
      describe('then unsubscribing the listener', () => {
        beforeEach(async () => {
          stubbedHarness.unsubscribe.mockClear();
          await connection.removeSignatureListener(clientSubscriptionId);
        });
        it('results in an unsubscribe request being made to the RPC', () => {
          expect(stubbedHarness.unsubscribe).toHaveBeenCalledWith(
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
        expect(stubbedHarness.unsubscribe).not.toHaveBeenCalledWith(
          serverSubscriptionId,
        );
      });
      describe('then unsubscribing the listener', () => {
        beforeEach(async () => {
          stubbedHarness.unsubscribe.mockClear();
          await connection.removeSignatureListener(clientSubscriptionId);
        });
        it('should not result in an unsubscribe request being made to the RPC', () => {
          expect(stubbedHarness.unsubscribe).not.toHaveBeenCalled();
        });
        it('releases the local server subscription handle', () => {
          expect(
            getSubscriptionRegistry(connection).hasServerSubscription(
              FIRST_LOCAL_SERVER_SUBSCRIPTION_ID,
            ),
          ).to.be.false;
        });
      });
    });
  });

  describe('signature subscriptions whose terminal callback throws', () => {
    const serverSubscriptionId = 0;
    const testSignature = TEST_TRANSACTION_SIGNATURE;
    const FINAL_NOTIFICATION_RESULT = {
      context: {slot: 11n},
      value: createSignatureStatusRpcResult(null),
    };
    [
      {
        name: 'onSignature',
        register: (callback: () => void) =>
          connection.onSignature(testSignature, callback),
        expectedParams: () => [
          testSignature,
          {commitment: connection.commitment || 'confirmed'},
        ],
      },
      {
        name: 'onSignatureWithOptions',
        register: (callback: () => void) =>
          connection.onSignatureWithOptions(testSignature, callback, {
            commitment: 'processed',
          }),
        expectedParams: () => [testSignature, {commitment: 'processed'}],
      },
    ].forEach(({name, register, expectedParams}) => {
      describe(`registered via \`${name}\``, () => {
        let throwingCallback: Mock;
        beforeEach(async () => {
          mockImplementationForArgs(
            stubbedHarness.requestSubscription,
            [createSubscriptionSpec('signatureSubscribe', expectedParams())],
            () => Promise.resolve(serverSubscriptionId),
          );
          throwingCallback = vi.fn(() => {
            throw new Error('intentional application callback failure');
          });
          register(throwingCallback);
          await flushSubscriptionUpdates();
          emitHarnessEvent(stubbedHarness, 'signatureNotification', {
            subscription: serverSubscriptionId,
            result: FINAL_NOTIFICATION_RESULT,
          });
          await flushSubscriptionUpdates();
        });
        it('still fires the callback', () => {
          expect(throwingCallback).toHaveBeenCalledOnce();
        });
        it('releases the local server subscription handle', () => {
          expect(
            getSubscriptionRegistry(connection).hasServerSubscription(
              FIRST_LOCAL_SERVER_SUBSCRIPTION_ID,
            ),
          ).to.be.false;
        });
        it('does not send an unsubscribe request to the RPC', () => {
          expect(stubbedHarness.unsubscribe).not.toHaveBeenCalled();
        });
        describe('then registering an identical listener', () => {
          let secondCallback: Mock;
          beforeEach(async () => {
            stubbedHarness.requestSubscription.mockClear();
            secondCallback = vi.fn();
            register(secondCallback);
            await flushSubscriptionUpdates();
          });
          it('opens a new server subscription instead of reusing the disposed one', () => {
            expect(stubbedHarness.requestSubscription).toHaveBeenCalledOnce();
          });
          it('delivers the terminal status to the new listener', async () => {
            emitHarnessEvent(stubbedHarness, 'signatureNotification', {
              subscription: serverSubscriptionId,
              result: FINAL_NOTIFICATION_RESULT,
            });
            await flushSubscriptionUpdates();
            expect(secondCallback).toHaveBeenCalledOnce();
          });
        });
      });
    });
  });

  describe('signature subscriptions with received notifications enabled', () => {
    const serverSubscriptionId = 0;
    const testSignature = TEST_TRANSACTION_SIGNATURE;
    const getExpectedParams = () => [
      testSignature,
      {
        commitment: connection.commitment || 'confirmed',
        enableReceivedNotification: true,
      },
    ];
    const expectedSpec = () =>
      createSubscriptionSpec('signatureSubscribe', getExpectedParams());
    let listenerCallback: Mock;
    beforeEach(() => {
      mockImplementationForArgs(
        stubbedHarness.requestSubscription,
        [expectedSpec()],
        () => Promise.resolve(serverSubscriptionId),
      );
      listenerCallback = vi.fn();
      connection.onSignatureWithOptions(testSignature, listenerCallback, {
        enableReceivedNotification: true,
      });
    });
    describe('when a received notification is published', () => {
      beforeEach(async () => {
        emitHarnessEvent(stubbedHarness, 'signatureNotification', {
          subscription: serverSubscriptionId,
          result: {
            context: {slot: 11n},
            value: createSignatureReceivedRpcResult(),
          },
        });
        await flushSubscriptionUpdates();
      });
      it('fires the listener callback with the received notification', () => {
        expect(listenerCallback).toHaveBeenCalledExactlyOnceWith(
          {type: 'received'},
          {slot: 11n},
        );
      });
      describe('then a status notification is published', () => {
        beforeEach(async () => {
          emitHarnessEvent(stubbedHarness, 'signatureNotification', {
            subscription: serverSubscriptionId,
            result: {
              context: {slot: 12n},
              value: createSignatureStatusRpcResult(null),
            },
          });
          await flushSubscriptionUpdates();
        });
        it('fires the listener callback with the status notification', () => {
          expect(listenerCallback).toHaveBeenCalledWith(
            {type: 'status', result: {err: null}},
            {slot: 12n},
          );
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
                setupListenerWithDefaultsOmitted(vi.fn());
              });
              it('results in a subscription request being made to the RPC', () => {
                expect(
                  stubbedHarness.requestSubscription.mock.calls,
                ).toStrictEqual([
                  [
                    createSubscriptionSpec(
                      subscriptionMethod,
                      getExpectedParams(),
                    ),
                  ],
                ]);
              });
              describe('then making the same subscription with the defaultable params set to their defaults', () => {
                beforeEach(() => {
                  stubbedHarness.requestSubscription.mockClear();
                  setupListenerWithDefaultableParamsSetToTheirDefaults(vi.fn());
                });
                it('does not result in a subscription request being made to the RPC', () => {
                  expect(
                    stubbedHarness.requestSubscription,
                  ).not.toHaveBeenCalled();
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
      stubbedHarness.connect.mockImplementation(() => {});
      stubbedHarness.close.mockImplementation(() => {});
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
        new PublicKey('C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK'),
        () => {},
      );
      connection.onAccountChange(
        new PublicKey('27Y78XJXG9A13pnPajrB1VYU6EF8uNSoojPZBmhKsi8C'),
        () => {},
      );
      // Then remove the first one before the connection opens.
      connection.removeAccountChangeListener(clientSubscriptionIdA);
      // Then open the connection.
      emitHarnessEvent(stubbedHarness, 'open');
      // Despite recursion inside the state machine, ensure that the second
      // subscription only makes *one* connection attempt.
      expect(stubbedHarness.requestSubscription.mock.calls).toStrictEqual([
        [
          {
            address: '27Y78XJXG9A13pnPajrB1VYU6EF8uNSoojPZBmhKsi8C',
            kind: 'account',
            options: {commitment: 'confirmed', encoding: 'base64'},
          },
        ],
      ]);
    });
  });
});

if (!isLive) {
  describe('Subscription default commitment', () => {
    const ADDRESS = new PublicKey(
      '7A6PCsp5EQFHsUpnvLmLvNjWvYSNJGCLYtpvzL1shV4o',
    );

    type SubscribeMessage = {method: string; params: unknown[]};

    let connection: Connection;
    let consoleErrorStub: MockInstance<typeof console.error>;
    let server: WebSocketServer;
    let httpUrl: string;
    let wsUrl: string;
    let subscriptionId: number;
    beforeEach(async () => {
      consoleErrorStub = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      server = new WebSocketServer({host: '127.0.0.1', port: 0});
      await new Promise(resolve => server.once('listening', resolve));
      const {port} = server.address() as {port: number};
      httpUrl = `http://127.0.0.1:${port}/`;
      wsUrl = `ws://127.0.0.1:${port}/`;
    });
    afterEach(async () => {
      await connection
        .removeAccountChangeListener(subscriptionId)
        .catch(() => {});
      for (const client of server.clients) client.terminate();
      await new Promise(resolve => server.close(resolve));
      await new Promise<void>(resolve => setImmediate(resolve));
      consoleErrorStub.mockRestore();
    });

    function watchForFirstWebSocketMessage(): Promise<SubscribeMessage> {
      return new Promise<SubscribeMessage>(resolve => {
        server.once('connection', socket => {
          socket.once('message', data => {
            resolve(JSON.parse(data.toString()) as SubscribeMessage);
          });
        });
      });
    }

    it('uses the commitment the Connection was constructed with', async () => {
      const firstMessageReceived = watchForFirstWebSocketMessage();
      connection = new Connection(httpUrl, {
        commitment: 'processed',
        wsEndpoint: wsUrl,
      });

      subscriptionId = connection.onAccountChange(ADDRESS, () => {});

      const message = await firstMessageReceived;
      expect(message.method).to.eq('accountSubscribe');
      expect(message.params[1]).to.include({commitment: 'processed'});
    });

    it('falls back to `confirmed` when the Connection has no commitment', async () => {
      const firstMessageReceived = watchForFirstWebSocketMessage();
      connection = new Connection(httpUrl, {wsEndpoint: wsUrl});

      subscriptionId = connection.onAccountChange(ADDRESS, () => {});

      const message = await firstMessageReceived;
      expect(message.method).to.eq('accountSubscribe');
      expect(message.params[1]).to.include({commitment: 'confirmed'});
    });
  });
}
