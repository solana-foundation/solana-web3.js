import { isSignerRole, isWritableRole, type Instruction as KitInstruction } from '@solana/kit';

import { PublicKey } from '../publickey';
import type { TransactionInstructionCtorFields } from '../transaction/legacy';

/** @internal */
export function toLegacyInstructionFields(instruction: KitInstruction): Required<TransactionInstructionCtorFields> {
    return {
        keys: (instruction.accounts ?? []).map(accountMeta => ({
            pubkey: new PublicKey(accountMeta.address),
            isSigner: isSignerRole(accountMeta.role),
            isWritable: isWritableRole(accountMeta.role),
        })),
        programId: new PublicKey(instruction.programAddress),
        data: Uint8Array.from(instruction.data ?? []),
    };
}
