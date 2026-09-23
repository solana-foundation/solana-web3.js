import type { FC, ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

import { WalletConfigError } from '../errors.js';
import { WalletModal, type WalletModalProps } from './WalletModal.js';

export interface WalletModalContextState {
    visible: boolean;
    setVisible: (open: boolean) => void;
}

export const WalletModalContext = createContext<WalletModalContextState | null>(null);

export function useWalletModal(): WalletModalContextState {
    const context = useContext(WalletModalContext);
    if (!context) throw new WalletConfigError('WalletModalProvider is missing.');
    return context;
}

export interface WalletModalProviderProps extends WalletModalProps {
    children: ReactNode;
}

export const WalletModalProvider: FC<WalletModalProviderProps> = ({ children, ...props }) => {
    const [visible, setVisible] = useState(false);
    return (
        <WalletModalContext.Provider value={{ setVisible, visible }}>
            {children}
            {visible && <WalletModal {...props} />}
        </WalletModalContext.Provider>
    );
};
