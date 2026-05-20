import {
  isSignerRole,
  isWritableRole,
  type Instruction as KitInstruction,
} from '@solana/kit';

import type {TransactionInstructionCtorFields} from '../transaction/legacy';
import {fromKitAddress} from './address';

/** @internal */
export function toLegacyInstructionFields(
  instruction: KitInstruction,
): Required<TransactionInstructionCtorFields> {
  return {
    keys: (instruction.accounts ?? []).map(accountMeta => ({
      pubkey: fromKitAddress(accountMeta.address),
      isSigner: isSignerRole(accountMeta.role),
      isWritable: isWritableRole(accountMeta.role),
    })),
    programId: fromKitAddress(instruction.programAddress),
    data: Uint8Array.from(instruction.data ?? []),
  };
}
