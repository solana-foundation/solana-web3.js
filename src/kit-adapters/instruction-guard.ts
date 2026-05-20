import {
  AccountRole,
  isAddress,
  isSignerRole,
  isWritableRole,
  type Instruction as KitInstruction,
} from '@solana/kit';

import type {TransactionInstructionCtorFields} from '../transaction/legacy';
import {fromKitAddress} from './address';

export function toLegacyInstructionFields(
  instruction: KitInstruction,
): TransactionInstructionCtorFields {
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
