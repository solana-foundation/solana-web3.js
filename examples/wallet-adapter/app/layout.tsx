import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import '@solana/wallet-adapter/styles.css';
import './globals.css';
import {Providers} from './providers';

export const metadata: Metadata = {
  title: 'Wallet Adapter Example',
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
