import {beforeEach, describe, expect, it, vi, type MockInstance} from 'vitest';

import {
  Connection,
  Transaction,
  sendAndConfirmRawTransaction,
  sendAndConfirmTransaction,
} from '../src';
import type {ConfirmOptions} from '../src';
import {url} from './url';

describe('send and confirm helpers', function () {
  let connection: Connection;
  let confirmTransactionStub: MockInstance<Connection['confirmTransaction']>;

  beforeEach(() => {
    connection = new Connection(url, 'confirmed');
    confirmTransactionStub = vi
      .spyOn(connection, 'confirmTransaction')
      .mockResolvedValue({
        context: {slot: 0n},
        value: {err: null},
      });
  });

  describe('sendAndConfirmTransaction', function () {
    let sendTransactionStub: MockInstance<Connection['sendTransaction']>;

    beforeEach(() => {
      sendTransactionStub = vi
        .spyOn(connection, 'sendTransaction')
        .mockResolvedValue('mock-signature');
    });

    it('confirms at the connection commitment when no commitment is supplied', async () => {
      await sendAndConfirmTransaction(connection, new Transaction(), []);

      expect(confirmTransactionStub).toHaveBeenCalledWith(
        'mock-signature',
        'confirmed',
      );
    });

    it('confirms at `finalized` when neither the options nor the connection specify a commitment', async () => {
      const bareConnection = new Connection(url);
      const bareConfirmStub = vi
        .spyOn(bareConnection, 'confirmTransaction')
        .mockResolvedValue({
          context: {slot: 0n},
          value: {err: null},
        });
      vi.spyOn(bareConnection, 'sendTransaction').mockResolvedValue(
        'mock-signature',
      );

      await sendAndConfirmTransaction(bareConnection, new Transaction(), []);

      expect(bareConfirmStub).toHaveBeenCalledWith(
        'mock-signature',
        'finalized',
      );
    });

    it('confirms at the commitment supplied at call time even when the options are mutated mid-flight', async () => {
      const options: ConfirmOptions = {commitment: 'finalized'};
      sendTransactionStub.mockImplementation(async () => {
        await Promise.resolve();
        options.commitment = 'processed';
        return 'mock-signature';
      });

      await sendAndConfirmTransaction(
        connection,
        new Transaction(),
        [],
        options,
      );

      expect(confirmTransactionStub).toHaveBeenCalledWith(
        'mock-signature',
        'finalized',
      );
    });
  });

  describe('sendAndConfirmRawTransaction', function () {
    let sendRawTransactionStub: MockInstance<Connection['sendRawTransaction']>;

    beforeEach(() => {
      sendRawTransactionStub = vi
        .spyOn(connection, 'sendRawTransaction')
        .mockResolvedValue('mock-signature');
    });

    it('confirms at the connection commitment when no commitment is supplied', async () => {
      await sendAndConfirmRawTransaction(connection, new Uint8Array([1, 2, 3]));

      expect(confirmTransactionStub).toHaveBeenCalledWith(
        'mock-signature',
        'confirmed',
      );
    });

    it('confirms at `finalized` when neither the options nor the connection specify a commitment', async () => {
      const bareConnection = new Connection(url);
      const bareConfirmStub = vi
        .spyOn(bareConnection, 'confirmTransaction')
        .mockResolvedValue({
          context: {slot: 0n},
          value: {err: null},
        });
      vi.spyOn(bareConnection, 'sendRawTransaction').mockResolvedValue(
        'mock-signature',
      );

      await sendAndConfirmRawTransaction(
        bareConnection,
        new Uint8Array([1, 2, 3]),
      );

      expect(bareConfirmStub).toHaveBeenCalledWith(
        'mock-signature',
        'finalized',
      );
    });

    it('confirms at the commitment supplied at call time even when the options are mutated mid-flight', async () => {
      const options: ConfirmOptions = {commitment: 'finalized'};
      sendRawTransactionStub.mockImplementation(async () => {
        await Promise.resolve();
        options.commitment = 'processed';
        return 'mock-signature';
      });

      await sendAndConfirmRawTransaction(
        connection,
        new Uint8Array([1, 2, 3]),
        options,
      );

      expect(confirmTransactionStub).toHaveBeenCalledWith(
        'mock-signature',
        'finalized',
      );
    });
  });
});
