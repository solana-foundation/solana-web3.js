import {SystemProgram, Transaction} from '@solana/web3.js';
import {useState, type ReactNode} from 'react';
import {ConnectionProvider, useConnection} from '../../ConnectionProvider.js';
import {WalletProvider, useWallet} from '../../WalletProvider.js';
import {WalletModalProvider} from '../../ui/WalletModalProvider.js';
import {WalletMultiButton} from '../../ui/WalletMultiButton.js';

function Demo() {
  const {publicKey, signMessage, sendTransaction} = useWallet();
  const {connection} = useConnection();
  const [log, setLog] = useState<string[]>([]);
  const append = (line: string) => setLog(previous => [...previous, line]);
  const onSignMessage = async () => {
    if (!signMessage) return;
    try {
      const signature = await signMessage(
        new TextEncoder().encode('hello from @solana/wallet-adapter'),
      );
      append(`signed message: ${signature.join(',')}`);
    } catch (error) {
      append(`sign message failed: ${String(error)}`);
    }
  };
  const onSendTransaction = async () => {
    if (!publicKey) return;
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          lamports: 1_000_000n,
          toPubkey: publicKey,
        }),
      );
      const signature = await sendTransaction(transaction, connection);
      append(`sent: ${signature}`);
    } catch (error) {
      append(`send transaction failed: ${String(error)}`);
    }
  };
  return (
    <main>
      {publicKey ? (
        <section>
          <code data-testid="address">{publicKey.toBase58()}</code>
          <button onClick={onSignMessage}>Sign message</button>
          <button onClick={onSendTransaction}>Send transaction</button>
        </section>
      ) : null}
      <pre data-testid="log">{log.join('\n')}</pre>
    </main>
  );
}

export function ExampleApp({
  endpoint,
  children,
}: {
  endpoint: string;
  children?: ReactNode;
}) {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider chain="solana:devnet" storage={null}>
        <WalletModalProvider>
          <WalletMultiButton />
          <Demo />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
