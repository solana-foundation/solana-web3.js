/**
 * Backwards-compatible exports for the renamed Address module.
 * @deprecated Use Address instead. Target for removal in v3.
 */
import {
	Address,
	MAX_SEED_LENGTH,
	PUBLIC_KEY_LENGTH,
} from './address';
import type {AddressInitData} from './address';

/**
 * Backwards-compatible alias for {@link Address}.
 * @deprecated Use {@link Address} instead. Target for removal in v3.
 */
export const PublicKey = Address;

export type PublicKey = Address;
export type PublicKeyInitData = AddressInitData;

export {MAX_SEED_LENGTH, PUBLIC_KEY_LENGTH};
