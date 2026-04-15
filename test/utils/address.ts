import {Address} from '../../src/address';

let uniqueAddressCounter = 1;

export function getUniqueAddress(): Address {
  const address = new Address(uniqueAddressCounter);
  uniqueAddressCounter += 1;
  return address;
}
