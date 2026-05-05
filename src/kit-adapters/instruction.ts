import {isAddress} from '@solana/addresses';
import type {ReadonlyUint8Array} from '@solana/codecs-core';
import {
  AccountRole,
  type AccountMeta,
  type Instruction as KitInstruction,
  type InstructionWithAccounts,
  type InstructionWithData,
  isSignerRole,
  isWritableRole,
} from '@solana/instructions';

import {TransactionInstruction} from '../transaction';
import {fromKitAddress, toKitAddress} from './address';

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
  return new TransactionInstruction({
    keys: (instruction.accounts ?? []).map(accountMeta => ({
      pubkey: fromKitAddress(accountMeta.address),
      isSigner: isSignerRole(accountMeta.role),
      isWritable: isWritableRole(accountMeta.role),
    })),
    programId: fromKitAddress(instruction.programAddress),
    data: Uint8Array.from(instruction.data ?? []),
  });
}

export function isKitInstruction(value: unknown): value is KitInstruction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const {accounts, data, programAddress} = value as Record<string, unknown>;

  if (typeof programAddress !== 'string' || !isAddress(programAddress)) {
    return false;
  }

  if (accounts !== undefined) {
    if (!Array.isArray(accounts)) {
      return false;
    }

    for (const accountMeta of accounts) {
      if (typeof accountMeta !== 'object' || accountMeta === null) {
        return false;
      }
      const {address, role} = accountMeta as Record<string, unknown>;

      if (
        typeof address !== 'string' ||
        !isAddress(address) ||
        !isAccountRole(role)
      ) {
        return false;
      }
    }
  }

  if (data !== undefined && !(data instanceof Uint8Array)) {
    return false;
  }

  return true;
}

function toRole(isSigner: boolean, isWritable: boolean): AccountRole {
  if (isSigner && isWritable) return AccountRole.WRITABLE_SIGNER;
  if (isSigner) return AccountRole.READONLY_SIGNER;
  if (isWritable) return AccountRole.WRITABLE;
  return AccountRole.READONLY;
}

function isAccountRole(value: unknown): value is AccountRole {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return false;
  }

  switch (value) {
    case AccountRole.READONLY:
    case AccountRole.WRITABLE:
    case AccountRole.READONLY_SIGNER:
    case AccountRole.WRITABLE_SIGNER:
      return true;
    default:
      return false;
  }
}
