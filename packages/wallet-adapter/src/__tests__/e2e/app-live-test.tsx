import {
  address,
  generateKeyPairSigner,
  getPublicKeyFromAddress,
  verifySignature,
  type KeyPairSigner,
} from '@solana/kit';
import {Surfnet} from '@solana/surfpool';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  act,
  fireEvent,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type {ReactNode} from 'react';
import {getWallets} from '@wallet-standard/app';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {
  WalletNotConnectedError,
  WalletSendTransactionError,
} from '../../errors.js';
import {useWallet} from '../../WalletProvider.js';
import {ExampleApp} from './example-app.js';
import {createTestWallet} from './test-wallet.js';

const FUNDING_LAMPORTS = 5_000_000_000;

// jsdom has no modal dialog implementation.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

describe.skipIf(!process.env.TEST_LIVE)('example app on a live surfnet', () => {
  let surfnet: Surfnet;
  let connection: Connection;
  let fullSigner: KeyPairSigner;
  let legacyOnlySigner: KeyPairSigner;
  const unregisters: (() => void)[] = [];

  beforeAll(async () => {
    surfnet = Surfnet.start();
    connection = new Connection(surfnet.rpcUrl, 'confirmed');
    const fullWallet = await createTestWallet({
      features: [
        'standard:connect',
        'standard:disconnect',
        'standard:events',
        'solana:signMessage',
        'solana:signTransaction',
        'solana:signAndSendTransaction',
      ],
      name: 'Full wallet',
      rpcUrl: surfnet.rpcUrl,
    });
    const legacyOnlyWallet = await createTestWallet({
      features: [
        'standard:connect',
        'standard:disconnect',
        'standard:events',
        'solana:signTransaction',
      ],
      name: 'Legacy-only wallet',
      supportedTransactionVersions: ['legacy'],
    });
    const messageOnlyWallet = await createTestWallet({
      features: [
        'standard:connect',
        'standard:disconnect',
        'standard:events',
        'solana:signMessage',
      ],
      name: 'Message-only wallet',
    });
    const mainnetWallet = await createTestWallet({
      chains: ['solana:mainnet'],
      name: 'Mainnet wallet',
    });
    fullSigner = fullWallet.signers[0]!;
    legacyOnlySigner = legacyOnlyWallet.signers[0]!;
    for (const signer of [fullSigner, legacyOnlySigner]) {
      surfnet.fundSol(signer.address, FUNDING_LAMPORTS);
    }
    for (const {wallet} of [
      fullWallet,
      legacyOnlyWallet,
      messageOnlyWallet,
      mainnetWallet,
    ]) {
      unregisters.push(getWallets().register(wallet));
    }
  }, 60_000);
  afterAll(() => {
    for (const unregister of unregisters) unregister();
    surfnet?.stop();
  });

  function renderApp() {
    return renderHook(useWallet, {
      wrapper: ({children}: {children: ReactNode}) => (
        <ExampleApp endpoint={surfnet.rpcUrl}>{children}</ExampleApp>
      ),
    });
  }
  type Hook = ReturnType<typeof renderApp>;
  async function connectTo(result: Hook['result'], name: string) {
    await act(async () => {
      result.current.select(name);
      await result.current.connect();
    });
  }
  async function waitForConfirmation(signature: string) {
    await waitFor(
      async () => {
        const status = await connection.getSignatureStatus(signature);
        expect(status.value?.confirmationStatus).toBeDefined();
      },
      {timeout: 15_000},
    );
  }
  async function feeOf(signature: string): Promise<number> {
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    return Number(transaction!.meta!.fee);
  }

  it('filters the wrong-chain wallet and lists the rest in the modal', () => {
    const {result} = renderApp();
    expect(
      result.current.wallets.map(({adapter}) => adapter.name).sort(),
    ).toEqual(['Full wallet', 'Legacy-only wallet', 'Message-only wallet']);
    expect(
      result.current.wallets.find(
        ({adapter}) => adapter.name === 'Mainnet wallet',
      ),
    ).toBeUndefined();
    for (const {adapter} of result.current.wallets) {
      expect(adapter.icon).toBe('data:image/png;base64,');
    }
    fireEvent.click(screen.getByRole('button', {name: /select wallet/i}));
    const dialog = within(screen.getByRole('dialog'));
    for (const name of [
      'Full wallet',
      'Legacy-only wallet',
      'Message-only wallet',
    ]) {
      expect(
        dialog.getByRole('button', {name: new RegExp(name, 'i')}),
      ).toBeDefined();
    }
    expect(dialog.queryByRole('button', {name: /mainnet wallet/i})).toBeNull();
  });

  it('exposes signing capabilities based on advertised features', async () => {
    const {result} = renderApp();
    await connectTo(result, 'Full wallet');
    expect(result.current.address).toBe(fullSigner.address);
    expect(result.current.signMessage).toBeTypeOf('function');
    expect(result.current.signTransaction).toBeTypeOf('function');
    expect(result.current.signAllTransactions).toBeTypeOf('function');
    await act(() => result.current.disconnect());

    await connectTo(result, 'Legacy-only wallet');
    expect(result.current.address).toBe(legacyOnlySigner.address);
    expect(result.current.signMessage).toBeUndefined();
    expect(result.current.signTransaction).toBeTypeOf('function');
    expect(result.current.signAllTransactions).toBeTypeOf('function');
    await act(() => result.current.disconnect());

    await connectTo(result, 'Message-only wallet');
    expect(result.current.signMessage).toBeTypeOf('function');
    expect(result.current.signTransaction).toBeFalsy();
    expect(result.current.signAllTransactions).toBeFalsy();
    await act(() => result.current.disconnect());
  });

  it("signs a message that verifies against the connected account's public key", async () => {
    const {result} = renderApp();
    await connectTo(result, 'Full wallet');
    const message = new TextEncoder().encode('hello from the surfnet');
    const signature = await result.current.signMessage!(message);
    const publicKey = await getPublicKeyFromAddress(
      address(fullSigner.address),
    );
    expect(await verifySignature(publicKey, signature, message)).toBe(true);
  });

  it('lands a transfer with exact lamport deltas on both accounts', async () => {
    const {result} = renderApp();
    await connectTo(result, 'Legacy-only wallet');
    const sender = new PublicKey(legacyOnlySigner.address);
    const recipient = new PublicKey((await generateKeyPairSigner()).address);
    const amount = 1_234_567;
    const senderBefore = Number(await connection.getBalance(sender));
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: recipient,
        lamports: BigInt(amount),
      }),
    );
    const signature = await result.current.sendTransaction(
      transaction,
      connection,
    );
    await waitForConfirmation(signature as string);
    expect(Number(await connection.getBalance(recipient))).toBe(amount);
    expect(Number(await connection.getBalance(sender))).toBe(
      senderBefore - amount - (await feeOf(signature as string)),
    );
  });

  it('lands a two-instruction transfer with exact lamport deltas on every account', async () => {
    const {result} = renderApp();
    await connectTo(result, 'Full wallet');
    const sender = new PublicKey(fullSigner.address);
    const recipientA = new PublicKey((await generateKeyPairSigner()).address);
    const recipientB = new PublicKey((await generateKeyPairSigner()).address);
    const amountToA = 1_000_000;
    const amountToB = 2_000_000;
    const senderBefore = Number(await connection.getBalance(sender));
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: recipientA,
        lamports: BigInt(amountToA),
      }),
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: recipientB,
        lamports: BigInt(amountToB),
      }),
    );
    const signature = await result.current.sendTransaction(
      transaction,
      connection,
    );
    await waitForConfirmation(signature as string);
    expect(Number(await connection.getBalance(recipientA))).toBe(amountToA);
    expect(Number(await connection.getBalance(recipientB))).toBe(amountToB);
    expect(Number(await connection.getBalance(sender))).toBe(
      senderBefore - amountToA - amountToB - (await feeOf(signature as string)),
    );
  });

  it('rejects an unsupported transaction version, then rejects sending while disconnected', async () => {
    const {result} = renderApp();
    await connectTo(result, 'Legacy-only wallet');
    const sender = new PublicKey(legacyOnlySigner.address);
    const versioned = new VersionedTransaction(
      new TransactionMessage({
        instructions: [
          SystemProgram.transfer({
            fromPubkey: sender,
            toPubkey: sender,
            lamports: 1n,
          }),
        ],
        payerKey: sender,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      }).compileToV0Message(),
    );
    await expect(
      result.current.sendTransaction(versioned, connection),
    ).rejects.toBeInstanceOf(WalletSendTransactionError);
    await act(() => result.current.disconnect());
    await expect(
      result.current.sendTransaction(new Transaction(), connection),
    ).rejects.toBeInstanceOf(WalletNotConnectedError);
  });

  it('connects, sends and switches wallets through the UI, then disconnects', async () => {
    const {result} = renderApp();
    const log = () => screen.getByTestId('log').textContent ?? '';
    fireEvent.click(screen.getByRole('button', {name: /select wallet/i}));
    await act(async () => {
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: /legacy-only wallet/i,
        }),
      );
    });
    const shownAddress = await screen.findByTestId('address');
    expect(shownAddress.textContent).toBe(legacyOnlySigner.address);

    fireEvent.click(screen.getByRole('button', {name: 'Send transaction'}));
    await waitFor(() => expect(log()).toContain('sent:'), {timeout: 15_000});
    await waitForConfirmation(log().match(/sent: (\S+)/)![1]!);

    fireEvent.click(screen.getByRole('button', {name: /\.\./}));
    fireEvent.click(screen.getByRole('button', {name: 'Change wallet'}));
    await act(async () => {
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: /full wallet/i,
        }),
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId('address').textContent).toBe(
        fullSigner.address,
      ),
    );

    fireEvent.click(screen.getByRole('button', {name: /\.\./}));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: /disconnect/i}));
    });
    expect(result.current.connected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(screen.getByRole('button', {name: /select wallet/i})).toBeDefined();
  });
});
