import {address} from '@solana/kit';
import {expect} from 'chai';

import {Keypair, PublicKey} from '../../src';
import {fromKitAddress, toKitAddress} from '../../src/kit-adapters/address';

describe('toKitAddress', () => {
  it('converts a Web3.js PublicKey to a Kit address string', async () => {
    const publicKey = (await Keypair.generate()).publicKey;

    expect(publicKey.toBase58()).to.equal(toKitAddress(publicKey));
  });

  it('accepts the PublicKey alias directly', () => {
    const publicKey = new PublicKey('11111111111111111111111111111111');

    expect(toKitAddress(publicKey)).to.equal(
      '11111111111111111111111111111111',
    );
  });
});

describe('fromKitAddress', () => {
  it('converts a Kit address string to an PublicKey instance', () => {
    const converted = fromKitAddress(
      address('11111111111111111111111111111111'),
    );

    expect(converted).to.be.instanceOf(PublicKey);
    expect(converted.toBase58()).to.equal('11111111111111111111111111111111');
  });

  it('roundtrips with toKitAddress', async () => {
    const original = (await Keypair.generate()).publicKey;

    expect(fromKitAddress(toKitAddress(original)).equals(original)).to.be.true;
  });
});
