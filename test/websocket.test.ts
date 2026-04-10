import {getBase58Decoder} from '@solana/codecs-strings';
import {expect} from 'chai';

import {Connection} from '../src';
import {url, wsUrl} from './url';
import {sleep} from '../src/utils/sleep';
import type {SubscriptionChannel} from '../src/rpc-subscriptions/runtime';

const BASE58_DECODER = getBase58Decoder();

type ConnectionWithSubscriptionChannelState = {
  _subscriptionChannel: SubscriptionChannel | null;
};

async function waitForSocketToOpen(
  connection: Connection,
): Promise<SubscriptionChannel> {
  while (true) {
    const socket = getConnectionSocket(connection);
    if (socket === null) {
      await sleep(25);
      continue;
    }
    try {
      await socket.send({jsonrpc: '2.0', method: 'ping'});
      return socket;
    } catch {
      await sleep(25);
    }
  }
}

async function waitForSocketClose(
  connection: Connection,
  socket: SubscriptionChannel,
): Promise<void> {
  while (getConnectionSocket(connection) === socket) {
    await sleep(25);
  }
}

function getConnectionSocket(
  connection: Connection,
): SubscriptionChannel | null {
  return (connection as unknown as ConnectionWithSubscriptionChannelState)
    ._subscriptionChannel;
}

if (process.env.TEST_LIVE) {
  describe('websocket', () => {
    const connection = new Connection(url);

    it('connect and disconnect', async () => {
      const testSignature = BASE58_DECODER.decode(new Uint8Array(64));
      const id = connection.onSignature(testSignature, () => {});
      const socket = await waitForSocketToOpen(connection);

      await connection.removeSignatureListener(id);
      await sleep(100);
      await socket.send({jsonrpc: '2.0', method: 'ping'});

      await waitForSocketClose(connection, socket);
      expect(getConnectionSocket(connection)).to.eq(null);
    });

    it('idle timeout', async () => {
      const testSignature = BASE58_DECODER.decode(new Uint8Array(64));
      const id = connection.onSignature(testSignature, () => {});
      const socket = await waitForSocketToOpen(connection);

      await connection.removeSignatureListener(id);

      const nextId = connection.onSignature(testSignature, () => {});

      await sleep(100);
      expect(getConnectionSocket(connection)).to.eq(socket);
      await socket.send({jsonrpc: '2.0', method: 'ping'});

      await connection.removeSignatureListener(nextId);

      await waitForSocketClose(connection, socket);
      expect(getConnectionSocket(connection)).to.eq(null);
    });

    it('connect by websocket endpoint from options', async () => {
      let connection = new Connection('http://127.0.0.1', {
        wsEndpoint: wsUrl,
      });

      const testSignature = BASE58_DECODER.decode(new Uint8Array(64));
      const id = connection.onSignature(testSignature, () => {});
      const socket = await waitForSocketToOpen(connection);

      await socket.send({jsonrpc: '2.0', method: 'ping'});

      await connection.removeSignatureListener(id);
    });
  });
}
