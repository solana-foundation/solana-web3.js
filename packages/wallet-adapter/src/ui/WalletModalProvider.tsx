import type { FC, ReactNode } from 'react';
import { useState } from 'react';

import { WalletModalContext } from './useWalletModal.js';
import type { WalletModalProps } from './WalletModal.js';
import { WalletModal } from './WalletModal.js';

export interface WalletModalProviderProps extends WalletModalProps {
    children: ReactNode;
}

export const WalletModalProvider: FC<WalletModalProviderProps> = ({ children, ...props }) => {
    const [visible, setVisible] = useState(false);

    return (
        <WalletModalContext.Provider
            value={{
                setVisible,
                visible,
            }}
        >
            {children}
            {visible && <WalletModal {...props} />}
        </WalletModalContext.Provider>
    );
};
