import type { DetailedHTMLProps, FC, ImgHTMLAttributes } from 'react';

export interface WalletIconProps extends DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> {
    wallet: { icon: string; name: string } | null;
}

export const WalletIcon: FC<WalletIconProps> = ({ wallet, ...props }) => {
    return wallet ? <img src={wallet.icon} alt={`${wallet.name} icon`} {...props} /> : null;
};
