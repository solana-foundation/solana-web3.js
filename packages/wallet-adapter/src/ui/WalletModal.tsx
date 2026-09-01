import type { FC, MouseEvent } from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { UiWallet } from '../types.js';
import { useKitWallet } from '../useKitWallet.js';
import { useWalletModal } from './useWalletModal.js';
import { WalletListItem } from './WalletListItem.js';
import { WalletSVG } from './WalletSVG.js';

export interface WalletModalProps {
    className?: string;
    container?: string;
}

export const WalletModal: FC<WalletModalProps> = ({ className = '', container = 'body' }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { connect, wallets } = useKitWallet();
    const { setVisible } = useWalletModal();
    const [fadeIn, setFadeIn] = useState(false);
    const [portal, setPortal] = useState<Element | null>(null);

    const hideModal = useCallback(() => {
        setFadeIn(false);
        setTimeout(() => setVisible(false), 150);
    }, [setVisible]);

    const handleClose = useCallback(
        (event: MouseEvent) => {
            event.preventDefault();
            hideModal();
        },
        [hideModal],
    );

    const handleWalletClick = useCallback(
        (event: MouseEvent, wallet: UiWallet) => {
            connect(wallet);
            handleClose(event);
        },
        [connect, handleClose],
    );

    const handleTabKey = useCallback((event: KeyboardEvent) => {
        const node = ref.current;
        if (!node) return;

        const focusableElements = node.querySelectorAll('button');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (!firstElement || !lastElement) return;

        if (event.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                event.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                event.preventDefault();
            }
        }
    }, []);

    useLayoutEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                hideModal();
            } else if (event.key === 'Tab') {
                handleTabKey(event);
            }
        };

        const { overflow } = window.getComputedStyle(document.body);
        setTimeout(() => setFadeIn(true), 0);
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown, false);

        return () => {
            document.body.style.overflow = overflow;
            window.removeEventListener('keydown', handleKeyDown, false);
        };
    }, [hideModal, handleTabKey]);

    useLayoutEffect(() => setPortal(document.querySelector(container)), [container]);

    return (
        portal &&
        createPortal(
            <div
                aria-labelledby="wallet-adapter-modal-title"
                aria-modal="true"
                className={`wallet-adapter-modal ${fadeIn && 'wallet-adapter-modal-fade-in'} ${className}`}
                ref={ref}
                role="dialog"
            >
                <div className="wallet-adapter-modal-container">
                    <div className="wallet-adapter-modal-wrapper">
                        <button onClick={handleClose} className="wallet-adapter-modal-button-close">
                            <svg width="14" height="14">
                                <path d="M14 12.461 8.3 6.772l5.234-5.233L12.006 0 6.772 5.234 1.54 0 0 1.539l5.234 5.233L0 12.006l1.539 1.528L6.772 8.3l5.69 5.7L14 12.461z" />
                            </svg>
                        </button>
                        {wallets.length ? (
                            <>
                                <h1 className="wallet-adapter-modal-title">Connect a wallet on Solana to continue</h1>
                                <ul className="wallet-adapter-modal-list">
                                    {wallets.map(wallet => (
                                        <WalletListItem
                                            key={`${wallet.name}:${wallet.accounts[0]?.address ?? ''}`}
                                            handleClick={event => handleWalletClick(event, wallet)}
                                            wallet={wallet}
                                        />
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <>
                                <h1 className="wallet-adapter-modal-title">
                                    You&apos;ll need a wallet on Solana to continue
                                </h1>
                                <div className="wallet-adapter-modal-middle">
                                    <WalletSVG />
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="wallet-adapter-modal-overlay" onMouseDown={handleClose} />
            </div>,
            portal,
        )
    );
};
