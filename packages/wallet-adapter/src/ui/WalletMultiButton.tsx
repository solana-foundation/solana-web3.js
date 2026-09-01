import { useEffect, useMemo, useRef, useState } from 'react';

import { useKitWallet } from '../useKitWallet.js';
import type { ButtonProps } from './Button.js';
import { Button } from './Button.js';
import { useWalletModal } from './useWalletModal.js';
import { WalletIcon } from './WalletIcon.js';

/** A drop-in connect button: opens the wallet modal when disconnected, an account dropdown when connected. */
export function WalletMultiButton({ children, ...props }: ButtonProps) {
    const { setVisible: setModalVisible } = useWalletModal();
    const { address, connected, connecting, disconnect, wallet } = useKitWallet();
    const [copied, setCopied] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const ref = useRef<HTMLUListElement>(null);

    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const node = ref.current;
            if (!node || node.contains(event.target as Node)) return;
            setMenuOpen(false);
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, []);

    const content = useMemo(() => {
        if (children) return children;
        if (address) return address.slice(0, 4) + '..' + address.slice(-4);
        if (connecting) return 'Connecting …';
        return 'Select Wallet';
    }, [children, address, connecting]);

    return (
        <div className="wallet-adapter-dropdown">
            <Button
                {...props}
                aria-expanded={menuOpen}
                className={`wallet-adapter-button-trigger ${props.className || ''}`}
                startIcon={wallet ? <WalletIcon wallet={wallet} /> : undefined}
                style={{ pointerEvents: menuOpen ? 'none' : 'auto', ...props.style }}
                onClick={() => {
                    if (connected) {
                        setMenuOpen(true);
                    } else {
                        setModalVisible(true);
                    }
                }}
            >
                {content}
            </Button>
            <ul
                aria-label="dropdown-list"
                className={`wallet-adapter-dropdown-list ${menuOpen && 'wallet-adapter-dropdown-list-active'}`}
                ref={ref}
                role="menu"
            >
                {address ? (
                    <li
                        className="wallet-adapter-dropdown-list-item"
                        onClick={() => {
                            void navigator.clipboard.writeText(address).then(() => {
                                setCopied(true);
                                setTimeout(() => setCopied(false), 400);
                            });
                        }}
                        role="menuitem"
                    >
                        {copied ? 'Copied' : 'Copy address'}
                    </li>
                ) : null}
                <li
                    className="wallet-adapter-dropdown-list-item"
                    onClick={() => {
                        setModalVisible(true);
                        setMenuOpen(false);
                    }}
                    role="menuitem"
                >
                    Change wallet
                </li>
                <li
                    className="wallet-adapter-dropdown-list-item"
                    onClick={() => {
                        disconnect();
                        setMenuOpen(false);
                    }}
                    role="menuitem"
                >
                    Disconnect
                </li>
            </ul>
        </div>
    );
}
