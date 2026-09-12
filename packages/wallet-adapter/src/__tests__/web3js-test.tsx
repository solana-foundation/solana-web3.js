import {expect, it, vi} from 'vitest';
import {getBase58Decoder} from '@solana/kit';
import type {Blockhash, Connection} from '@solana/web3.js';
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  signingWallet,
  standardWallet,
  testController,
  SIGNATURE,
} from './helpers.js';

it('signs a legacy transaction and reports wallet rejection with its cause', async () => {
  const {owner, wallet, transaction, signTransaction, onError} =
    await signingWallet();
  transaction.lastValidBlockHeight = 42;
  const signed = await owner.getSnapshot().signTransaction!(transaction);
  expect(signed).toBeInstanceOf(Transaction);
  expect(signed.signature).toEqual(SIGNATURE);
  expect(signed.lastValidBlockHeight).toBe(42);
  expect(signTransaction).toHaveBeenCalledTimes(1);
  const rejection = new Error('Wallet rejected signing');
  // The failure is attributed to the wallet that was signing, even if the connection changed meanwhile.
  signTransaction.mockImplementationOnce(async () => {
    await owner.disconnect();
    throw rejection;
  });
  await expect(
    owner.getSnapshot().signTransaction!(transaction),
  ).rejects.toMatchObject({
    cause: rejection,
  });
  expect(onError).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({cause: rejection}),
    expect.objectContaining({name: wallet.name}),
  );
});

it('signs a mixed legacy and versioned batch, keeping order and class', async () => {
  const {owner, wallet, transaction, signTransaction} = await signingWallet();
  const versioned = new VersionedTransaction(
    new TransactionMessage({
      instructions: transaction.instructions,
      payerKey: transaction.feePayer!,
      recentBlockhash: transaction.recentBlockhash as Blockhash,
    }).compileToV0Message(),
  );
  wallet.features['solana:signTransaction'].supportedTransactionVersions = [
    'legacy',
  ];
  await expect(
    owner.getSnapshot().signAllTransactions!([transaction, versioned]),
  ).rejects.toMatchObject({
    name: 'WalletSignTransactionError',
  });
  expect(signTransaction).not.toHaveBeenCalled();
  wallet.features['solana:signTransaction'].supportedTransactionVersions = [
    'legacy',
    0,
  ];
  const [legacy, signed] = await owner.getSnapshot().signAllTransactions!([
    transaction,
    versioned,
  ]);
  expect(legacy).toBeInstanceOf(Transaction);
  expect(legacy).toMatchObject({signature: SIGNATURE});
  expect(signed).toBeInstanceOf(VersionedTransaction);
  expect(signed!.signatures[0]).toEqual(SIGNATURE);
  const sign = signTransaction.getMockImplementation()!;
  signTransaction.mockImplementationOnce(async (...inputs) =>
    (await sign(...inputs)).reverse(),
  );
  await expect(
    owner.getSnapshot().signAllTransactions!([transaction, versioned]),
  ).rejects.toMatchObject({
    name: 'WalletSignTransactionError',
  });
});

it('prefers wallet submission over signing even when the wallet can do both', async () => {
  const base = standardWallet();
  const signAndSendTransaction = vi.fn(
    async (_input: {account: unknown}): Promise<{signature: Uint8Array}[]> => [
      {signature: SIGNATURE},
    ],
  );
  const wallet = {
    ...base.wallet,
    accounts: base.wallet.accounts.map(account => ({
      ...account,
      features: [
        'solana:signAndSendTransaction',
        'solana:signTransaction',
      ] as const,
    })),
    features: {
      ...base.wallet.features,
      'solana:signTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy'],
        signTransaction: vi.fn(async () => {
          throw new Error('Wallet broadcast should take precedence');
        }),
      },
      'solana:signAndSendTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy'],
        signAndSendTransaction,
      },
    },
  };
  const onError = vi.fn();
  const owner = testController(wallet, {onError});
  owner.select(wallet.name);
  await owner.connect();
  expect(owner.getSnapshot().signTransaction).toBeTypeOf('function');
  const transaction = new Transaction({
    feePayer: owner.getSnapshot().publicKey!,
    recentBlockhash: getBase58Decoder().decode(
      new Uint8Array(32).fill(1),
    ) as Blockhash,
  });
  const sendRawTransaction = vi.fn();
  expect(
    await owner.sendTransaction(
      transaction,
      {sendRawTransaction} as unknown as Connection,
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 2n,
        minContextSlot: 123n,
      },
    ),
  ).toBe(getBase58Decoder().decode(SIGNATURE));
  expect(signAndSendTransaction).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      chain: 'solana:devnet',
      options: {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 2,
        minContextSlot: 123,
      },
    }),
  );
  // Wallets compare the account by identity; the Kit UI handle is not the wallet's account object.
  expect(signAndSendTransaction.mock.calls[0]![0]!.account).toBe(
    wallet.accounts[0],
  );
  expect(sendRawTransaction).not.toHaveBeenCalled();
  // Wallet Standard options are numbers; values that would round are refused, not sent.
  await expect(
    owner.sendTransaction(
      transaction,
      {sendRawTransaction} as unknown as Connection,
      {maxRetries: 2n ** 60n},
    ),
  ).rejects.toMatchObject({
    name: 'WalletSendTransactionError',
    cause: {name: 'RangeError'},
  });
  signAndSendTransaction.mockResolvedValueOnce([]);
  await expect(
    owner.sendTransaction(transaction, {
      sendRawTransaction,
    } as unknown as Connection),
  ).rejects.toMatchObject({name: 'WalletSendTransactionError'});
  const rejection = new Error('Wallet declined submission');
  onError.mockClear();
  signAndSendTransaction.mockImplementationOnce(async () => {
    await owner.disconnect();
    throw rejection;
  });
  await expect(
    owner.sendTransaction(transaction, {
      sendRawTransaction,
    } as unknown as Connection),
  ).rejects.toMatchObject({
    name: 'WalletSendTransactionError',
    cause: rejection,
  });
  expect(owner.getSnapshot().wallet).toBeNull();
  expect(onError).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({cause: rejection}),
    expect.objectContaining({
      name: wallet.name,
    }),
  );
  expect(
    wallet.features['solana:signTransaction'].signTransaction,
  ).not.toHaveBeenCalled();
  expect(sendRawTransaction).not.toHaveBeenCalled();
});

it('submits wallet-signed bytes through the supplied connection otherwise', async () => {
  const {owner, transaction, signTransaction, onError} = await signingWallet();
  transaction.addSignature(transaction.feePayer!, SIGNATURE);
  const originalMessage = transaction.serializeMessage();
  transaction.feePayer = undefined;
  const expectedSignature = getBase58Decoder().decode(SIGNATURE);
  const sendRawTransaction = vi.fn(
    async (_bytes: Uint8Array, _options: unknown) => expectedSignature,
  );
  expect(
    await owner.sendTransaction(
      transaction,
      {sendRawTransaction} as unknown as Connection,
      {
        skipPreflight: true,
      },
    ),
  ).toBe(expectedSignature);
  expect(sendRawTransaction).toHaveBeenCalledTimes(1);
  const [bytes, options] = sendRawTransaction.mock.calls[0]!;
  expect(Transaction.from(bytes).signature).toEqual(SIGNATURE);
  expect(Transaction.from(bytes).serializeMessage()).toEqual(originalMessage);
  expect(options).toEqual({skipPreflight: true});
  const declined = new Error('Wallet declined signing');
  signTransaction.mockRejectedValueOnce(declined);
  onError.mockClear();
  await expect(
    owner.sendTransaction(transaction, {
      sendRawTransaction,
    } as unknown as Connection),
  ).rejects.toMatchObject({
    name: 'WalletSendTransactionError',
    cause: declined,
  });
  expect(onError).toHaveBeenCalledTimes(1);
});

it('rejects two outputs for one signing request', async () => {
  const count = 2;
  const {owner, transaction, signTransaction} = await signingWallet();
  const sign = signTransaction.getMockImplementation()!;
  signTransaction.mockImplementationOnce(async input => {
    const [output] = await sign(input);
    return Array.from({length: count}, () => output!);
  });
  await expect(
    owner.getSnapshot().signTransaction!(transaction),
  ).rejects.toMatchObject({
    name: 'WalletSignTransactionError',
  });
});

it.each([
  ['blockheight', 'instructions'],
  ['blockheight', 'blockhash'],
  ['nonce', 'instructions'],
  ['nonce', 'blockhash'],
  ['nonce', 'prepended instruction'],
  ['blockheight', 'nonce switch'],
])(
  'keeps %s metadata only while the wallet leaves the lifetime token unchanged (%s changed)',
  async (lifetime, change) => {
    const {owner, transaction, signTransaction} = await signingWallet();
    if (lifetime === 'blockheight') transaction.lastValidBlockHeight = 42;
    else {
      transaction.nonceInfo = {
        nonce: transaction.recentBlockhash!,
        nonceInstruction: SystemProgram.nonceAdvance({
          noncePubkey: new PublicKey(new Uint8Array(32).fill(2)),
          authorizedPubkey: transaction.feePayer!,
        }),
      };
      transaction.minNonceContextSlot = 17n;
    }
    signTransaction.mockImplementationOnce(async input => {
      const modified = Transaction.from(input.transaction);
      if (change === 'blockhash')
        modified.recentBlockhash = getBase58Decoder().decode(
          new Uint8Array(32).fill(2),
        ) as Blockhash;
      else if (change === 'nonce switch') {
        modified.instructions.unshift(
          SystemProgram.nonceAdvance({
            noncePubkey: new PublicKey(new Uint8Array(32).fill(4)),
            authorizedPubkey: modified.feePayer!,
          }),
        );
      } else if (change === 'prepended instruction') {
        modified.nonceInfo = undefined;
        modified.instructions.unshift(
          SystemProgram.transfer({
            fromPubkey: modified.feePayer!,
            toPubkey: modified.feePayer!,
            lamports: 3n,
          }),
        );
      } else
        modified.add(
          SystemProgram.transfer({
            fromPubkey: modified.feePayer!,
            toPubkey: modified.feePayer!,
            lamports: 2n,
          }),
        );
      modified.addSignature(modified.feePayer!, SIGNATURE);
      const bytes = await modified.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      return [{signedTransaction: new Uint8Array(bytes)}];
    });
    const signed = await owner.getSnapshot().signTransaction!(transaction);
    expect(signed.serializeMessage()).not.toEqual(
      transaction.serializeMessage(),
    );
    expect(signed.signature).toEqual(SIGNATURE);
    if (
      change === 'blockhash' ||
      change === 'prepended instruction' ||
      change === 'nonce switch'
    ) {
      expect(signed.lastValidBlockHeight).toBeUndefined();
      expect(signed.nonceInfo).toBeUndefined();
      expect(signed.minNonceContextSlot).toBeUndefined();
    } else if (lifetime === 'blockheight')
      expect(signed.lastValidBlockHeight).toBe(42);
    else {
      expect(signed.nonceInfo?.nonce).toBe(transaction.nonceInfo!.nonce);
      expect(signed.nonceInfo?.nonceInstruction).toBe(signed.instructions[0]);
      expect(signed.minNonceContextSlot).toBe(17n);
      expect(signed.compileMessage().instructions).toHaveLength(3);
    }
  },
);

it.each(['draft', 'nonce'] as const)(
  'prepares an unsigned legacy %s without replacing supplied lifetimes',
  async lifetime => {
    const {owner, transaction, signTransaction} = await signingWallet();
    const blockhash = transaction.recentBlockhash!;
    const payer = transaction.feePayer!;
    if (lifetime === 'nonce')
      transaction.nonceInfo = {
        nonce: blockhash,
        nonceInstruction: SystemProgram.nonceAdvance({
          noncePubkey: payer,
          authorizedPubkey: payer,
        }),
      };
    transaction.feePayer = undefined;
    transaction.recentBlockhash = undefined;
    const getLatestBlockhash = vi.fn(async () => ({
      blockhash,
      lastValidBlockHeight: 42n,
    }));
    const sendRawTransaction = vi.fn(async () =>
      getBase58Decoder().decode(SIGNATURE),
    );
    await owner.sendTransaction(
      transaction,
      {getLatestBlockhash, sendRawTransaction} as unknown as Connection,
      {
        preflightCommitment: 'confirmed',
        minContextSlot: 123n,
      },
    );
    if (lifetime === 'draft') {
      expect(getLatestBlockhash).toHaveBeenCalledExactlyOnceWith({
        commitment: 'confirmed',
        minContextSlot: 123n,
      });
      expect(transaction.lastValidBlockHeight).toBe(42n);
    } else expect(getLatestBlockhash).not.toHaveBeenCalled();
    const sent = Transaction.from(
      signTransaction.mock.calls[0]![0]!.transaction,
    );
    expect(sent.feePayer).toEqual(payer);
    expect(sent.recentBlockhash).toBe(blockhash);
    expect(sent.instructions).toHaveLength(lifetime === 'nonce' ? 2 : 1);
  },
);

it.each([
  ['disconnected', 'WalletNotConnectedError'],
  ['read-only', 'WalletNotReadyError'],
] as const)(
  'rejects submission with a %s wallet using the v1 error class',
  async (state, causeName) => {
    const {wallet} = standardWallet();
    const owner = testController(wallet);
    if (state === 'read-only') {
      owner.select(wallet.name);
      await owner.connect();
    }
    await expect(
      owner.sendTransaction(new Transaction(), {} as Connection),
    ).rejects.toMatchObject({name: causeName});
  },
);

it.each([
  ['https://api.mainnet-beta.solana.com', true],
  ['https://mainnet.helius-rpc.com/?api-key=x', true],
  ['http://127.0.0.1:8899', true],
  ['https://api.devnet.solana.com', false],
  ['https://rpc.my-devnet-proxy.example', false],
  ['https://rpc.example.com', false],
] as const)(
  'refuses to submit through %s when the endpoint names a different cluster (%s)',
  async (rpcEndpoint, rejects) => {
    const {owner, transaction} = await signingWallet();
    const sendRawTransaction = vi.fn(async () => 'sig');
    const connection = {
      rpcEndpoint,
      sendRawTransaction,
    } as unknown as Connection;
    const promise = owner.sendTransaction(transaction, connection);
    if (rejects) {
      await expect(promise).rejects.toMatchObject({name: 'WalletConfigError'});
      expect(sendRawTransaction).not.toHaveBeenCalled();
    } else {
      await promise;
      expect(sendRawTransaction).toHaveBeenCalledOnce();
    }
  },
);
