import {beforeAll, describe, expect, it, vi} from 'vitest';
import {
  act,
  fireEvent,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import {WalletModalProvider} from '../ui/WalletModalProvider.js';
import {
  BaseWalletConnectButton,
  WalletDisconnectButton,
} from '../ui/WalletConnectionButton.js';
import {
  useWalletConnectButton,
  useWalletDisconnectButton,
  useWalletMultiButton,
} from '../ui/useWalletButton.js';
import type {ReactNode} from 'react';
import {WalletMultiButton} from '../ui/WalletMultiButton.js';
import {standardWallet, registerWallets} from './helpers.js';
import {WalletProvider, useWallet} from '../index.js';

// jsdom has no modal dialog implementation; focus and keyboard behavior are checked in a browser.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

function renderButton(...wallets: Parameters<typeof registerWallets>) {
  registerWallets(...wallets);
  const {result} = renderHook(useWallet, {
    wrapper: ({children}: {children: ReactNode}) => (
      <WalletProvider chain="solana:devnet" storage={null}>
        {children}
        <WalletModalProvider>
          <WalletMultiButton />
        </WalletModalProvider>
      </WalletProvider>
    ),
  });
  return result;
}

describe('WalletMultiButton', () => {
  it('prompts to select a wallet and opens the modal listing discovered wallets', async () => {
    const {wallet} = standardWallet('Mock');
    renderButton(wallet);

    const trigger = screen.getByRole('button', {name: /select wallet/i});
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', {
      name: 'Connect a wallet on Solana to continue',
    });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', {name: /mock/i}));
    });
    expect(wallet.features['standard:connect'].connect).toHaveBeenCalledTimes(
      1,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the truncated address and disconnects from the dropdown when connected', async () => {
    const {wallet} = standardWallet('Mock');
    const result = renderButton(wallet);
    await act(async () => {
      result.current.select(wallet.name);
      await result.current.connect();
    });

    const trigger = screen.getByRole('button', {name: /1111\.\.1111/});
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(
      screen.getByRole('button', {name: 'Copy address'}),
    );
    fireEvent.keyDown(document.activeElement!, {key: 'Escape'});
    expect(screen.queryByRole('button', {name: 'Copy address'})).toBeNull();
    expect(document.activeElement).toBe(trigger);
    // A menu open while another control disconnects closes with the account.
    fireEvent.click(trigger);
    await act(async () => {
      await result.current.disconnect();
    });
    expect(screen.queryByRole('button', {name: 'Copy address'})).toBeNull();
    await act(async () => {
      result.current.select(wallet.name);
      await result.current.connect();
    });
    fireEvent.click(screen.getByRole('button', {name: /1111\.\.1111/}));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: /disconnect/i}));
    });
    expect(
      wallet.features['standard:disconnect'].disconnect,
    ).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', {name: /select wallet/i})).toBeDefined();
  });
});

it('keeps custom labels, cancellable clicks and headless operation failures', async () => {
  const {wallet} = standardWallet('Custom');
  const onError = vi.fn();
  registerWallets(wallet);
  const onClick = vi.fn((event: React.MouseEvent<HTMLButtonElement>) =>
    event.preventDefault(),
  );
  const wrapper = ({children}: {children: ReactNode}) => (
    <WalletProvider chain="solana:devnet" storage={null} onError={onError}>
      {children}
      <BaseWalletConnectButton
        labels={{
          'no-wallet': 'Choose',
          'has-wallet': 'Authorize',
          connecting: 'Authorizing',
          connected: 'Authorized',
        }}
        onClick={onClick}
        aria-label="Custom authorization"
      />
      <WalletDisconnectButton />
    </WalletProvider>
  );
  const selectWallet = vi.fn();
  const {result} = renderHook(
    () => ({
      wallet: useWallet(),
      connect: useWalletConnectButton(),
      disconnect: useWalletDisconnectButton(),
      multi: useWalletMultiButton({onSelectWallet: selectWallet}),
    }),
    {wrapper},
  );
  expect(result.current.connect.buttonDisabled).toBe(true);
  result.current.multi.onSelectWallet();
  expect(selectWallet).toHaveBeenCalledWith({
    wallets: [...result.current.wallet.wallets],
    onSelectWallet: result.current.wallet.select,
  });
  act(() => result.current.wallet.select(wallet.name));
  expect(result.current.disconnect.buttonState).toBe('no-wallet');
  fireEvent.click(screen.getByRole('button', {name: 'Custom authorization'}));
  expect(screen.getByText('Authorize')).toBeDefined();
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(wallet.features['standard:connect'].connect).not.toHaveBeenCalled();
  const rejection = new Error('Declined');
  wallet.features['standard:connect'].connect.mockRejectedValueOnce(rejection);
  await act(async () => {
    await expect(result.current.connect.onButtonClick!()).rejects.toMatchObject(
      {cause: rejection},
    );
  });
  expect(onError).toHaveBeenCalledTimes(1);
  await act(async () => {
    await result.current.multi.onConnect!();
  });
  expect(result.current.connect.buttonState).toBe('connected');
  expect(result.current.disconnect.buttonState).toBe('has-wallet');
  expect(result.current.multi.publicKey).toEqual(
    result.current.wallet.publicKey,
  );
  await act(async () => {
    fireEvent.click(screen.getByRole('button', {name: /Disconnect$/}));
  });
  expect(result.current.disconnect.buttonState).toBe('no-wallet');
});

it('shows the pending wallet separately and preserves the active account after rejection', async () => {
  const a = standardWallet('Active');
  const b = standardWallet('Pending', 1);
  const result = renderButton(a.wallet, b.wallet);
  await act(async () => {
    result.current.select(a.wallet.name);
    await result.current.connect();
  });
  const activeAddress = result.current.address;
  let reject!: (error: Error) => void;
  b.wallet.features['standard:connect'].connect.mockImplementationOnce(
    () =>
      new Promise((_, decline) => {
        reject = decline;
      }),
  );
  fireEvent.click(screen.getByRole('button', {name: /1111\.\.1111/}));
  fireEvent.click(screen.getByRole('button', {name: 'Change wallet'}));
  await act(async () => {
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {name: /Pending/}),
    );
  });
  expect(screen.getByRole('status').textContent).toBe('Connecting to Pending…');
  expect(result.current.address).toBe(activeAddress);
  expect(screen.getByRole('button', {name: /Connecting/})).toBeDefined();
  await act(async () => {
    reject(new Error('Declined'));
  });
  expect(screen.getByRole('alert')).toBeDefined();
  expect(result.current.wallet?.adapter.name).toBe('Active');
  expect(result.current.selectedWallet?.adapter.name).toBe('Pending');
  await act(async () => {
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {name: /Pending/}),
    );
  });
  expect(result.current.wallet?.adapter.name).toBe('Pending');
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('ignores a late rejection from a superseded picker request', async () => {
  const a = standardWallet('First');
  const b = standardWallet('Second', 1);
  let finishSecond!: () => void;
  let rejectFirst!: (error: Error) => void;
  a.wallet.features['standard:connect'].connect.mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectFirst = reject;
      }),
  );
  b.wallet.features['standard:connect'].connect.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finishSecond = () => resolve({accounts: b.wallet.accounts});
      }),
  );
  const result = renderButton(a.wallet, b.wallet);
  fireEvent.click(screen.getByRole('button', {name: /select wallet/i}));
  const dialog = screen.getByRole('dialog');
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', {name: /First/}));
  });
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', {name: /Second/}));
  });
  await act(async () => {
    rejectFirst(new Error('First declined'));
  });
  expect(screen.getByRole('status').textContent).toBe('Connecting to Second…');
  expect(within(dialog).queryByRole('alert')).toBeNull();
  fireEvent.click(
    within(dialog).getByRole('button', {name: 'Close wallet selection'}),
  );
  // The trigger is inert while connecting, as in v1.
  fireEvent.click(screen.getByRole('button', {name: /Connecting/}));
  expect(screen.queryByRole('dialog')).toBeNull();
  await act(async () => {
    finishSecond();
  });
  expect(result.current.wallet?.adapter.name).toBe('Second');
});
