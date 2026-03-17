import {expect} from 'chai';

import {Keypair} from '../../src';

import {toKitAddress} from '../../src/compat';

describe('toKitAddress', function () {
  it('should convert from a Legacy Web3 JS PublicKey to an `Address`', async () => {
    const publicKey = (await Keypair.generate()).publicKey;
    expect(publicKey.toBase58()).to.equal(toKitAddress(publicKey));
  });
});
