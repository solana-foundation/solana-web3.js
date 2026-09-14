import {expect} from 'chai';
import {SinonStub, stub} from 'sinon';
import {WebSocketServer, type WebSocket} from 'ws';

import {Connection, PublicKey} from '../src';
import {sleep} from '../src/utils/sleep';

type SubscribeRequest = Readonly<{id: number; method: string}>;

type SubscriptionServer = Readonly<{
  close(): Promise<void>;
  sockets: WebSocket[];
  subscribeRequestsBySocket: Map<WebSocket, number>;
  url: string;
}>;

async function startSubscriptionServer(
  shouldRejectSubscribe: (request: SubscribeRequest) => boolean = () => false,
): Promise<SubscriptionServer> {
  const server = new WebSocketServer({host: '127.0.0.1', port: 0});
  const sockets: WebSocket[] = [];
  const subscribeRequestsBySocket = new Map<WebSocket, number>();
  let nextServerSubscriptionId = 1;

  server.on('connection', socket => {
    sockets.push(socket);
    subscribeRequestsBySocket.set(socket, 0);
    socket.on('message', rawMessage => {
      const message = JSON.parse(String(rawMessage)) as {
        id?: number;
        method?: string;
      };
      if (message.id === undefined || message.method === undefined) {
        return;
      }
      if (message.method.endsWith('Unsubscribe')) {
        socket.send(
          JSON.stringify({id: message.id, jsonrpc: '2.0', result: true}),
        );
        return;
      }
      if (!message.method.endsWith('Subscribe')) {
        return;
      }
      subscribeRequestsBySocket.set(
        socket,
        (subscribeRequestsBySocket.get(socket) ?? 0) + 1,
      );
      if (shouldRejectSubscribe({id: message.id, method: message.method})) {
        socket.send(
          JSON.stringify({
            error: {code: -32602, message: 'subscription rejected'},
            id: message.id,
            jsonrpc: '2.0',
          }),
        );
        return;
      }
      socket.send(
        JSON.stringify({
          id: message.id,
          jsonrpc: '2.0',
          result: nextServerSubscriptionId++,
        }),
      );
    });
  });

  await new Promise<void>(resolve => server.once('listening', resolve));
  const {port} = server.address() as {port: number};
  return {
    async close() {
      for (const socket of sockets) {
        socket.terminate();
      }
      await new Promise<void>(resolve => server.close(() => resolve()));
    },
    sockets,
    subscribeRequestsBySocket,
    url: `ws://127.0.0.1:${port}`,
  };
}

async function waitFor(
  predicate: () => boolean,
  description: string,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${description}`);
    }
    await sleep(10);
  }
}

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

function totalSubscribeRequests(server: SubscriptionServer): number {
  let total = 0;
  for (const count of server.subscribeRequestsBySocket.values()) {
    total += count;
  }
  return total;
}

describe('KitSubscriptionRuntime', () => {
  let consoleErrorStub: SinonStub;
  let server: SubscriptionServer | undefined;

  beforeEach(() => {
    consoleErrorStub = stub(console, 'error');
  });

  afterEach(async () => {
    await server?.close();
    server = undefined;
    await sleep(50);
    consoleErrorStub.restore();
  });

  function createConnection(
    channelConfig?: Readonly<{maxSubscriptionsPerChannel: number}>,
  ): Connection {
    return new Connection('http://127.0.0.1:1', {
      subscriptions: channelConfig ? {channelConfig} : undefined,
      wsEndpoint: server!.url,
    });
  }

  it('serves stable and unstable subscriptions over a single websocket', async () => {
    server = await startSubscriptionServer();
    const connection = createConnection();

    const slotListenerId = connection.onSlotChange(() => {});
    const slotUpdateListenerId = connection.onSlotUpdate(() => {});
    try {
      await Promise.all([
        connection.awaitSubscriptionReady(slotListenerId),
        connection.awaitSubscriptionReady(slotUpdateListenerId),
      ]);

      expect(server.sockets).to.have.lengthOf(1);
      expect(totalSubscribeRequests(server)).to.eq(2);
    } finally {
      await connection.removeSlotChangeListener(slotListenerId);
      await connection.removeSlotUpdateListener(slotUpdateListenerId);
    }
  });

  it('shards subscriptions across websockets at the Kit default per-channel limit', async () => {
    server = await startSubscriptionServer();
    const connection = createConnection();
    const subscriptionCount = 101;

    const listenerIds = Array.from({length: subscriptionCount}, (_, index) =>
      connection.onAccountChange(
        new PublicKey(new Uint8Array(32).fill(index + 1)),
        () => {},
      ),
    );
    try {
      await waitFor(
        () => totalSubscribeRequests(server!) === subscriptionCount,
        'every account subscription to be requested',
      );

      expect(server.sockets).to.have.lengthOf(2);
      for (const count of server.subscribeRequestsBySocket.values()) {
        expect(count).to.be.at.most(100);
      }
    } finally {
      await Promise.all(
        listenerIds.map(listenerId =>
          connection.removeAccountChangeListener(listenerId),
        ),
      );
    }
  });

  it('honors an explicit maxSubscriptionsPerChannel', async () => {
    server = await startSubscriptionServer();
    const connection = createConnection({maxSubscriptionsPerChannel: 2});

    const listenerIds = [1, 2, 3, 4].map(seed =>
      connection.onAccountChange(
        new PublicKey(new Uint8Array(32).fill(seed)),
        () => {},
      ),
    );
    try {
      await waitFor(
        () => totalSubscribeRequests(server!) === listenerIds.length,
        'every account subscription to be requested',
      );

      for (const count of server.subscribeRequestsBySocket.values()) {
        expect(count).to.be.at.most(2);
      }
    } finally {
      await Promise.all(
        listenerIds.map(listenerId =>
          connection.removeAccountChangeListener(listenerId),
        ),
      );
    }
  });

  it('retries the subscribe request after a rejected open once a listener is re-added', async () => {
    let subscribeAttempts = 0;
    server = await startSubscriptionServer(() => ++subscribeAttempts === 1);
    const connection = createConnection();

    const firstListenerId = connection.onAccountChange(
      PublicKey.default,
      () => {},
    );
    try {
      await connection.awaitSubscriptionReady(firstListenerId);
      expect.fail('Expected the first subscription to fail to establish.');
    } catch (error) {
      expect((error as Error).message).to.match(/failed to establish/);
    }
    await connection.removeAccountChangeListener(firstListenerId);

    const secondListenerId = connection.onAccountChange(
      PublicKey.default,
      () => {},
    );
    try {
      await connection.awaitSubscriptionReady(secondListenerId);
      expect(subscribeAttempts).to.eq(2);
    } finally {
      await connection.removeAccountChangeListener(secondListenerId);
    }
  });

  it('releases the local server subscription handle when the open is rejected', async () => {
    server = await startSubscriptionServer(() => true);
    const connection = createConnection();

    const listenerId = connection.onAccountChange(PublicKey.default, () => {});
    try {
      await connection.awaitSubscriptionReady(listenerId);
      expect.fail('Expected the subscription to fail to establish.');
    } catch (error) {
      expect((error as Error).message).to.match(/failed to establish/);
    }

    expect(
      getSubscriptionRegistry(connection).hasServerSubscription(
        FIRST_LOCAL_SERVER_SUBSCRIPTION_ID,
      ),
    ).to.be.false;
    await connection.removeAccountChangeListener(listenerId);
  });
});
