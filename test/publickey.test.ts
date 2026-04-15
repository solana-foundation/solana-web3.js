import {expect} from 'chai';

import {Address} from '../src/address';
import {MAX_SEED_LENGTH, PUBLIC_KEY_LENGTH, PublicKey} from '../src/publickey';

describe('PublicKey compatibility', () => {
  it('re-exports PublicKey as an alias of Address', () => {
    expect(PublicKey).to.equal(Address);
    expect(PublicKey.name).to.eq('Address');
  });

  it('preserves static members on the alias', () => {
    expect(PublicKey.default).to.equal(Address.default);
    expect(PUBLIC_KEY_LENGTH).to.eq(32);
    expect(MAX_SEED_LENGTH).to.eq(32);
  });

  it('constructs instances that are interchangeable with Address', () => {
    const publicKey = new PublicKey(1);

    expect(publicKey).to.be.instanceOf(Address);
    expect(publicKey.equals(new Address(1))).to.be.true;
  });
});
