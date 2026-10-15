import {
  bytesEqual,
  getCompiledTransactionMessageDecoder,
  getTransactionCodec,
  getTransactionLifetimeConstraintFromCompiledTransactionMessage,
  type Transaction as KitTransaction,
  type TransactionModifyingSigner,
  type TransactionWithLifetime,
} from '@solana/kit';
import {
  type PublicKey,
  type Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import {useMemo} from 'react';

import {useWallet} from './WalletProvider.js';

const transactionCodec = getTransactionCodec();
const compiledMessageDecoder = getCompiledTransactionMessageDecoder();

/**
 * The lifetime of a transaction the wallet signed, by the rules Kit's wallet signer applies: the input's
 * lifetime while the wallet keeps its message or its lifetime token, otherwise the one the signed message
 * encodes.
 */
async function signedLifetime(
  input: KitTransaction,
  output: KitTransaction,
): Promise<TransactionWithLifetime['lifetimeConstraint']> {
  const existing =
    'lifetimeConstraint' in input
      ? (input as TransactionWithLifetime).lifetimeConstraint
      : undefined;
  if (existing && bytesEqual(output.messageBytes, input.messageBytes))
    return existing;
  const message = compiledMessageDecoder.decode(output.messageBytes);
  if (
    existing &&
    message.lifetimeToken ===
      ('blockhash' in existing ? existing.blockhash : existing.nonce)
  )
    return existing;
  return await getTransactionLifetimeConstraintFromCompiledTransactionMessage(
    message,
  );
}

/**
 * The connected wallet as Anchor's provider wallet. It is the Kit modifying signer `AnchorProvider` from
 * `@anchor-lang/core` 2 accepts, and it keeps the `publicKey`, `signTransaction` and `signAllTransactions`
 * of the wallet-adapter 0.x `AnchorWallet` so code reading those members keeps working.
 */
export interface AnchorWallet extends TransactionModifyingSigner {
  publicKey: PublicKey;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[],
  ): Promise<T[]>;
  signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
  ): Promise<T>;
}

/**
 * The connected wallet shaped for `new AnchorProvider(connection, wallet)` from `@anchor-lang/core` 2, or
 * `undefined` when it cannot sign transactions before sending them.
 *
 * Anchor signs through `modifyAndSignTransactions`, which goes through `signAllTransactions` so the
 * wallet's supported transaction versions are checked and failures surface as `WalletSignTransactionError`
 * and reach `onError`, as they do for the rest of the adapter. Signed transactions carry the lifetime
 * constraint Kit's own wallet signer would give them, which Anchor confirms against.
 */
export function useAnchorWallet(): AnchorWallet | undefined {
  const {publicKey, signer, signTransaction, signAllTransactions} = useWallet();
  return useMemo(() => {
    if (!publicKey || !signer || !signTransaction || !signAllTransactions)
      return undefined;
    const modifyAndSignTransactions: AnchorWallet['modifyAndSignTransactions'] =
      async transactions => {
        const signed = await signAllTransactions(
          transactions.map(transaction =>
            VersionedTransaction.deserialize(
              transactionCodec.encode(transaction) as Uint8Array,
            ),
          ),
        );
        return await Promise.all(
          signed.map(async (transaction, i) => {
            const output = transactionCodec.decode(transaction.serialize());
            return Object.freeze({
              ...output,
              lifetimeConstraint: await signedLifetime(
                transactions[i]!,
                output,
              ),
            }) as Awaited<
              ReturnType<AnchorWallet['modifyAndSignTransactions']>
            >[number];
          }),
        );
      };
    return {
      address: signer.address,
      modifyAndSignTransactions,
      publicKey,
      signAllTransactions,
      signTransaction,
    };
  }, [publicKey, signer, signTransaction, signAllTransactions]);
}
