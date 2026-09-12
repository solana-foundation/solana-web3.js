import {useWallet} from '../WalletProvider.js';
import type {Wallet} from '../types.js';

/** Connection state and the original operation promise for a custom control. */
export function useWalletConnectButton() {
  const {connect, connected, connecting, selectedWallet, wallet} = useWallet();
  const target = selectedWallet ?? wallet;
  const buttonState = connecting
    ? 'connecting'
    : connected &&
        (!selectedWallet ||
          selectedWallet.adapter.name === wallet?.adapter.name)
      ? 'connected'
      : target
        ? 'has-wallet'
        : 'no-wallet';
  return {
    buttonState,
    buttonDisabled: buttonState !== 'has-wallet',
    onButtonClick: buttonState === 'has-wallet' ? connect : undefined,
    walletIcon: target?.adapter.icon,
    walletName: target?.adapter.name,
  } as const;
}

/** Disconnection state and the original operation promise for a custom control. */
export function useWalletDisconnectButton() {
  const {connected, disconnect, disconnecting, wallet} = useWallet();
  const buttonState = disconnecting
    ? 'disconnecting'
    : connected
      ? 'has-wallet'
      : 'no-wallet';
  return {
    buttonState,
    buttonDisabled: buttonState !== 'has-wallet',
    onButtonClick: buttonState === 'has-wallet' ? disconnect : undefined,
    walletIcon: wallet?.adapter.icon,
    walletName: wallet?.adapter.name,
  } as const;
}

/** Supplies shared wallet actions to an application-owned picker and account control. */
export function useWalletMultiButton({
  onSelectWallet,
}: {
  onSelectWallet: (config: {
    wallets: Wallet[];
    onSelectWallet: (name: string) => void;
  }) => void;
}) {
  const {
    connect,
    connected,
    connecting,
    disconnect,
    disconnecting,
    publicKey,
    select,
    wallet,
    wallets,
  } = useWallet();
  const buttonState = connecting
    ? 'connecting'
    : connected
      ? 'connected'
      : disconnecting
        ? 'disconnecting'
        : wallet
          ? 'has-wallet'
          : 'no-wallet';
  return {
    buttonState,
    onConnect: buttonState === 'has-wallet' ? connect : undefined,
    onDisconnect:
      buttonState !== 'disconnecting' && buttonState !== 'no-wallet'
        ? disconnect
        : undefined,
    onSelectWallet: () =>
      onSelectWallet({wallets: [...wallets], onSelectWallet: select}),
    publicKey: publicKey ?? undefined,
    walletIcon: wallet?.adapter.icon,
    walletName: wallet?.adapter.name,
  } as const;
}
