import type {Address as KitAddress} from '@solana/addresses';

import {Address} from '../address';

export function toKitAddress<TAddress extends string>(
  address: Address,
): KitAddress<TAddress> {
  return address.toBase58() as KitAddress<TAddress>;
}

export function fromKitAddress(address: KitAddress): Address {
  return new Address(address);
}
