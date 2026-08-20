import type {Address} from '@solana/kit';

import {PublicKey} from '../publickey';

export function toKitAddress<TAddress extends string>(
  address: PublicKey,
): Address<TAddress> {
  return address.toAddress() as Address<TAddress>;
}

export function fromKitAddress(address: Address): PublicKey {
  return new PublicKey(address);
}
