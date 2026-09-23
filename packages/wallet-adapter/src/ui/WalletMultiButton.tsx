import {useEffect, useRef, useState} from 'react';
import {Button, type ButtonProps} from './Button.js';
import {useWalletMultiButton} from './useWalletButton.js';
import {useWalletModal} from './WalletModalProvider.js';

type Labels = Record<
  | 'connecting'
  | 'has-wallet'
  | 'no-wallet'
  | 'copy-address'
  | 'copied'
  | 'change-wallet'
  | 'disconnect',
  string
>;

export function BaseWalletMultiButton({
  children,
  labels,
  onClick,
  className = '',
  startIcon,
  ...props
}: ButtonProps & {labels: Labels}) {
  const {setVisible} = useWalletModal();
  const {
    buttonState,
    onConnect,
    onDisconnect,
    onSelectWallet,
    publicKey,
    walletIcon,
    walletName,
  } = useWalletMultiButton({onSelectWallet: () => setVisible(true)});
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const address = publicKey?.toBase58();
  // A request superseded by a newer one rejects with AbortError; nothing failed.
  const showError = (error: Error) => {
    if (error.name !== 'AbortError') setError(error.message);
  };
  const closeMenu = () => {
    setMenuOpen(false);
    ref.current!.querySelector('button')!.focus();
  };
  useEffect(() => {
    if (!address) setMenuOpen(false);
  }, [address]);
  useEffect(() => {
    if (!menuOpen) return;
    ref.current!.querySelector<HTMLButtonElement>('ul button')!.focus();
    // Pointer clicks outside close the menu in browsers that do not focus clicked buttons; blur covers keyboard exit.
    const outside = (event: PointerEvent) => {
      if (!ref.current!.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menuOpen]);
  const content =
    children ??
    (buttonState === 'connecting'
      ? labels.connecting
      : address
        ? address.slice(0, 4) + '..' + address.slice(-4)
        : labels[buttonState === 'has-wallet' ? buttonState : 'no-wallet']);
  return (
    <div
      className="wallet-adapter-dropdown"
      ref={ref}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setMenuOpen(false);
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && menuOpen) {
          event.preventDefault();
          closeMenu();
        }
      }}
    >
      <Button
        {...props}
        className={`wallet-adapter-button-trigger ${className}`}
        aria-expanded={menuOpen}
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
          setCopied(false);
          if (buttonState === 'connecting' || buttonState === 'disconnecting')
            return;
          if (address) setMenuOpen(!menuOpen);
          else if (onConnect) void onConnect().catch(showError);
          else onSelectWallet();
        }}
      >
        {content}
      </Button>
      {menuOpen && address && (
        <ul
          // Keep focus inside the menu on mousedown so blur does not close it before the click lands.
          onMouseDown={event => event.preventDefault()}
          aria-label="Wallet account actions"
          className="wallet-adapter-dropdown-list"
        >
          <li>
            <button
              type="button"
              className="wallet-adapter-dropdown-list-item"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(address);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 400);
                } catch (error) {
                  setError(String(error));
                }
              }}
            >
              {copied ? labels.copied : labels['copy-address']}
            </button>
          </li>
          <li>
            <button
              type="button"
              className="wallet-adapter-dropdown-list-item"
              onClick={() => {
                closeMenu();
                onSelectWallet();
              }}
            >
              {labels['change-wallet']}
            </button>
          </li>
          <li>
            <button
              type="button"
              className="wallet-adapter-dropdown-list-item"
              onClick={() => {
                closeMenu();
                void onDisconnect!().catch(showError);
              }}
            >
              {labels.disconnect}
            </button>
          </li>
        </ul>
      )}
      {error && <span role="alert">{error}</span>}
    </div>
  );
}

/** Opens the wallet picker or displays the active account's native button actions. */
export function WalletMultiButton(props: ButtonProps) {
  return (
    <BaseWalletMultiButton
      {...props}
      labels={{
        'change-wallet': 'Change wallet',
        connecting: 'Connecting ...',
        copied: 'Copied',
        'copy-address': 'Copy address',
        disconnect: 'Disconnect',
        'has-wallet': 'Connect',
        'no-wallet': 'Select Wallet',
      }}
    />
  );
}
