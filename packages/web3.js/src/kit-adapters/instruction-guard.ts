import {
  AccountRole,
  isAddress,
  type Instruction as KitInstruction,
} from '@solana/kit';

/**
 * Determines whether a value has the shape of a Kit `Instruction`, so that
 * callers accepting either instruction format can route appropriately.
 *
 * @throws If the value carries both Kit (`programAddress`/`accounts`) and
 * legacy (`programId`/`keys`) fields.
 */
export function isKitInstruction(value: unknown): value is KitInstruction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const {accounts, data, keys, programAddress, programId} = value as Record<
    string,
    unknown
  >;

  if (
    (programAddress !== undefined || accounts !== undefined) &&
    (programId !== undefined || keys !== undefined)
  ) {
    throw new Error(
      'Ambiguous instruction: an object must not carry both Kit ' +
        '(`programAddress`/`accounts`) and legacy (`programId`/`keys`) fields.',
    );
  }

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
