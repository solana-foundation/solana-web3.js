import {AccountRole, Instruction} from '@solana/instructions';
import {TransactionInstruction} from '../transaction';

import {toKitAddress} from './address';

/**
 * This can be used to convert a Web3.js [`TransactionInstruction`](https://solana-foundation.github.io/solana-web3.js/classes/TransactionInstruction.html)
 * object to a Kit {@link Instruction}.
 *
 * @example
 * ```ts
 * import { toKitInstruction } from '@solana/web3.js/compat';
 *
 * // Imagine a function that returns a Web3.js `TransactionInstruction`
 * const web3jsInstruction = getWeb3jsInstruction();
 * const instruction = toKitInstruction(web3jsInstruction);
 * ```
 */
export function toKitInstruction(
  web3jsInstruction: TransactionInstruction,
): Instruction {
  const data =
    web3jsInstruction.data?.byteLength > 0
      ? Uint8Array.from(web3jsInstruction.data)
      : undefined;

  const accounts = web3jsInstruction.keys.map(accountMeta =>
    Object.freeze({
      address: toKitAddress(accountMeta.pubkey),
      role: determineRole(accountMeta.isSigner, accountMeta.isWritable),
    }),
  );

  const programAddress = toKitAddress(web3jsInstruction.programId);

  return Object.freeze({
    ...(accounts.length ? {accounts: Object.freeze(accounts)} : null),
    ...(data ? {data} : null),
    programAddress,
  });
}

function determineRole(isSigner: boolean, isWritable: boolean): AccountRole {
  if (isSigner && isWritable) return AccountRole.WRITABLE_SIGNER;
  if (isSigner) return AccountRole.READONLY_SIGNER;
  if (isWritable) return AccountRole.WRITABLE;
  return AccountRole.READONLY;
}
