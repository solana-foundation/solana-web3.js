import {useState} from 'react';
import {Button, type ButtonProps} from './Button.js';
import {
  useWalletConnectButton,
  useWalletDisconnectButton,
} from './useWalletButton.js';
import {useWalletModal} from './WalletModalProvider.js';

function ConnectionButton({
  children,
  label,
  action,
  walletIcon,
  walletName,
  onClick,
  startIcon,
  className = '',
  ...props
}: ButtonProps & {
  label: string;
  action?: () => Promise<void>;
  walletIcon?: string;
  walletName?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        {...props}
        className={`wallet-adapter-button-trigger ${className}`}
        startIcon={
          startIcon ??
          (walletIcon ? (
            <img src={walletIcon} alt={walletName ?? ''} />
          ) : undefined)
        }
        onClick={event => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          setError(null);
          void action?.().catch((error: Error) => {
            if (error.name !== 'AbortError') setError(error.message);
          });
        }}
      >
        {children ?? label}
      </Button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}

export function BaseWalletConnectButton({
  labels,
  disabled,
  ...props
}: ButtonProps & {
  labels: Record<
    ReturnType<typeof useWalletConnectButton>['buttonState'],
    string
  >;
}) {
  const {buttonState, buttonDisabled, onButtonClick, ...wallet} =
    useWalletConnectButton();
  return (
    <ConnectionButton
      {...props}
      {...wallet}
      disabled={disabled || buttonDisabled}
      label={labels[buttonState]}
      action={onButtonClick}
    />
  );
}

export function WalletConnectButton(props: ButtonProps) {
  return (
    <BaseWalletConnectButton
      {...props}
      labels={{
        connected: 'Connected',
        connecting: 'Connecting ...',
        'has-wallet': 'Connect',
        'no-wallet': 'Connect Wallet',
      }}
    />
  );
}

export function BaseWalletDisconnectButton({
  labels,
  disabled,
  ...props
}: ButtonProps & {
  labels: Record<
    ReturnType<typeof useWalletDisconnectButton>['buttonState'],
    string
  >;
}) {
  const {buttonState, buttonDisabled, onButtonClick, ...wallet} =
    useWalletDisconnectButton();
  return (
    <ConnectionButton
      {...props}
      {...wallet}
      disabled={disabled || buttonDisabled}
      label={labels[buttonState]}
      action={onButtonClick}
    />
  );
}

export function WalletDisconnectButton(props: ButtonProps) {
  return (
    <BaseWalletDisconnectButton
      {...props}
      labels={{
        disconnecting: 'Disconnecting ...',
        'has-wallet': 'Disconnect',
        'no-wallet': 'Not Connected',
      }}
    />
  );
}

export function WalletModalButton({
  children = 'Select Wallet',
  onClick,
  className = '',
  ...props
}: ButtonProps) {
  const {visible, setVisible} = useWalletModal();
  return (
    <Button
      {...props}
      className={`wallet-adapter-button-trigger ${className}`}
      onClick={event => {
        onClick?.(event);
        if (!event.defaultPrevented) setVisible(!visible);
      }}
    >
      {children}
    </Button>
  );
}
