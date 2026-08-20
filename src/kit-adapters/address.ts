import type {Address as KitAddress} from '@solana/kit';

import {PublicKey} from '../publickey';

export function toKitAddress<TAddress extends string>(
  address: PublicKey,
): KitAddress<TAddress> {
  return address.toAddress() as KitAddress<TAddress>;
}

export function fromKitAddress(address: KitAddress): PublicKey {
  return new PublicKey(address);
}
