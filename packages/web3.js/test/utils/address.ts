import { PublicKey } from '../../src/publickey';

let uniqueAddressCounter = 1;

export function getUniqueAddress(): PublicKey {
    const address = new PublicKey(uniqueAddressCounter);
    uniqueAddressCounter += 1;
    return address;
}
