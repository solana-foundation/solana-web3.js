import {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useWallet} from '../WalletProvider.js';
import type {Wallet} from '../types.js';
import {Button} from './Button.js';
import {WalletIcon} from './WalletIcon.js';
import {WalletSVG} from './WalletSVG.js';
import {useWalletModal} from './WalletModalProvider.js';

const CLOSE_ICON_PATH =
  'M14 12.461 8.3 6.772l5.234-5.233L12.006 0 6.772 5.234 1.54 0 0 1.539l5.234 5.233L0 12.006l1.539 1.528L6.772 8.3l5.69 5.7L14 12.461z';

export interface WalletModalProps {
  className?: string;
  container?: string;
}

export function WalletModal({
  className = '',
  container = 'body',
}: WalletModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const connectionRequest = useRef<Promise<void> | null>(null);
  useEffect(
    () => () => {
      connectionRequest.current = null;
    },
    [],
  );
  const {wallets, connecting, selectedWallet, select, connect} = useWallet();
  // A selection made elsewhere while a connection is pending supersedes the request this modal made.
  const chosenName = useRef(selectedWallet?.adapter.name);
  useLayoutEffect(() => {
    chosenName.current = selectedWallet?.adapter.name;
  }, [selectedWallet]);
  const {setVisible} = useWalletModal();
  const [portal, setPortal] = useState<Element | null>(null);
  const [error, setError] = useState<string | null>(null);
  useLayoutEffect(
    () => setPortal(document.querySelector(container)),
    [container],
  );
  useLayoutEffect(() => {
    if (!portal) return;
    const node = ref.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node.showModal();
    return () => {
      node.close();
      document.body.style.overflow = overflow;
    };
  }, [portal]);
  function choose(wallet: Wallet) {
    setError(null);
    const name = wallet.adapter.name;
    select(name);
    chosenName.current = name;
    const request = connect();
    connectionRequest.current = request;
    const current = () =>
      connectionRequest.current === request && chosenName.current === name;
    void request.then(
      () => {
        if (current()) setVisible(false);
      },
      (error: Error) => {
        if (current() && error.name !== 'AbortError') setError(error.message);
      },
    );
  }

  return (
    portal &&
    createPortal(
      <dialog
        aria-labelledby={titleId}
        className={`wallet-adapter-modal ${className}`}
        onCancel={() => setVisible(false)}
        onClick={event => {
          // A click outside the panel is on the dialog's own backdrop area.
          if (
            !(event.target as Element).closest('.wallet-adapter-modal-wrapper')
          )
            setVisible(false);
        }}
        ref={ref}
      >
        <div className="wallet-adapter-modal-container">
          <div className="wallet-adapter-modal-wrapper">
            <button
              type="button"
              aria-label="Close wallet selection"
              onClick={() => setVisible(false)}
              className="wallet-adapter-modal-button-close"
            >
              <svg width="14" height="14" aria-hidden="true">
                <path d={CLOSE_ICON_PATH} />
              </svg>
            </button>
            <h1 id={titleId} className="wallet-adapter-modal-title">
              {wallets.length
                ? 'Connect a wallet on Solana to continue'
                : "You'll need a wallet on Solana to continue"}
            </h1>
            {connecting && (
              <p role="status">Connecting to {selectedWallet?.adapter.name}…</p>
            )}
            {error && <p role="alert">{error}</p>}
            {wallets.length ? (
              <ul className="wallet-adapter-modal-list">
                {wallets.map((wallet, index) => (
                  <li key={`${wallet.adapter.name}:${index}`}>
                    <Button
                      onClick={() => choose(wallet)}
                      startIcon={<WalletIcon wallet={wallet} />}
                    >
                      {wallet.adapter.name}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="wallet-adapter-modal-middle">
                <WalletSVG />
              </div>
            )}
          </div>
        </div>
      </dialog>,
      portal,
    )
  );
}
