import {getBase58Decoder} from '@solana/codecs-strings';
import {expect} from 'chai';

import {
  Keypair,
  Connection,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '../src';
import invariant from '../src/utils/assert';
import {MOCK_PORT, url} from './url';
import {helpers, mockRpcResponse, mockServer} from './mocks/rpc-http';
import {
  stubSubscriptions,
  restoreSubscriptions,
} from './mocks/rpc-subscriptions';

const BASE58_DECODER = getBase58Decoder();

describe('Transaction Payer', function () {
  let connection: Connection;
  beforeEach(() => {
    if (!mockServer) {
      connection = new Connection(url);
    }
  });

  if (mockServer) {
    const server = mockServer;
    beforeEach(() => {
      server.start(MOCK_PORT);
      connection = stubSubscriptions(url);
    });

    afterEach(async () => {
      server.stop();
      await restoreSubscriptions(connection);
    });
  }

  it('transaction-payer', async () => {
    const accountPayer = await Keypair.generate();
    const accountFrom = await Keypair.generate();
    const accountTo = await Keypair.generate();

    await helpers.airdrop({
      connection,
      address: accountPayer.publicKey,
      amount: LAMPORTS_PER_SOL,
    });

    await mockRpcResponse({
      method: 'getMinimumBalanceForRentExemption',
      params: [0],
      value: 50,
    });

    const minimumAmount = await connection.getMinimumBalanceForRentExemption(0);

    await helpers.airdrop({
      connection,
      address: accountFrom.publicKey,
      amount: minimumAmount + 12n,
    });

    await helpers.airdrop({
      connection,
      address: accountTo.publicKey,
      amount: minimumAmount + 21n,
    });

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: accountFrom.publicKey,
        toPubkey: accountTo.publicKey,
        lamports: 10,
      }),
    );

    await helpers.processTransaction({
      connection,
      transaction,
      signers: [accountPayer, accountFrom],
      commitment: 'confirmed',
    });

    invariant(transaction.signature);
    const signature = BASE58_DECODER.decode(transaction.signature);

    await mockRpcResponse({
      method: 'getSignatureStatuses',
      params: [[signature]],
      value: [
        {
          slot: 0,
          confirmations: 11,
          status: {Ok: null},
          err: null,
        },
      ],
      withContext: true,
    });
    const {value} = await connection.getSignatureStatus(signature);
    if (value !== null) {
      expect(typeof value.slot).to.eq('bigint');
      expect(value.err).to.be.null;
    } else {
      expect(value).not.to.be.null;
    }

    await mockRpcResponse({
      method: 'getBalance',
      params: [accountPayer.publicKey.toBase58(), {commitment: 'confirmed'}],
      value: LAMPORTS_PER_SOL - 1,
      withContext: true,
    });

    // accountPayer should be less than LAMPORTS_PER_SOL as it paid for the transaction
    // (exact amount less depends on the current cluster fees)
    const balance = await connection.getBalance(
      accountPayer.publicKey,
      'confirmed',
    );
    expect(balance > 0n).to.eq(true);
    expect(balance <= BigInt(LAMPORTS_PER_SOL)).to.eq(true);

    // accountFrom should have exactly 2, since it didn't pay for the transaction
    await mockRpcResponse({
      method: 'getBalance',
      params: [accountFrom.publicKey.toBase58(), {commitment: 'confirmed'}],
      value: Number(minimumAmount + 2n),
      withContext: true,
    });
    expect(
      await connection.getBalance(accountFrom.publicKey, 'confirmed'),
    ).to.eq(minimumAmount + 2n);
  }).timeout(30 * 1000);
});
