import type {ReadonlyUint8Array} from '@solana/codecs-core';
import {
  AccountRole,
  type AccountMeta,
  type Instruction as KitInstruction,
  type InstructionWithAccounts,
  type InstructionWithData,
} from '@solana/instructions';

import {TransactionInstruction} from '../transaction/legacy';
import {toKitAddress} from './address';
import {toLegacyInstructionFields} from './instruction-guard';

export function toKitInstruction(
  instruction: TransactionInstruction,
): KitInstruction &
  InstructionWithAccounts<readonly AccountMeta[]> &
  InstructionWithData<ReadonlyUint8Array> {
  const accounts = instruction.keys.map(accountMeta =>
    Object.freeze({
      address: toKitAddress(accountMeta.pubkey),
      role: toRole(accountMeta.isSigner, accountMeta.isWritable),
    }),
  );

  return Object.freeze({
    accounts: Object.freeze(accounts),
    data: Uint8Array.from(instruction.data),
    programAddress: toKitAddress(instruction.programId),
  });
}

export function fromKitInstruction(
  instruction: KitInstruction,
): TransactionInstruction {
  return new TransactionInstruction(toLegacyInstructionFields(instruction));
}

function toRole(isSigner: boolean, isWritable: boolean): AccountRole {
  if (isSigner && isWritable) return AccountRole.WRITABLE_SIGNER;
  if (isSigner) return AccountRole.READONLY_SIGNER;
  if (isWritable) return AccountRole.WRITABLE;
  return AccountRole.READONLY;
}
