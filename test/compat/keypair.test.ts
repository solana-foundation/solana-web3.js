import {expect} from 'chai';

import {Keypair} from '../../src';

import {toKitKeypair} from '../../src/compat';

describe('toKitKeypair', function () {
  let legacyKeypair: Keypair;

  before(async () => {
    legacyKeypair = await Keypair.generate();
  });

  ['public', 'private'].forEach(type => {
    describe(`${type} key`, () => {
      let keyPair: CryptoKeyPair;
      beforeEach(async () => {
        keyPair = await toKitKeypair(legacyKeypair);
      });
      it('has the algorithm "Ed25519"', () => {
        const key = keyPair[`${type}Key` as 'publicKey' | 'privateKey'];
        expect(key.algorithm.name).to.equal('Ed25519');
      });
      it('has the string tag "CryptoKey"', () => {
        const key = keyPair[`${type}Key` as 'publicKey' | 'privateKey'];
        expect(Object.prototype.toString.call(key)).to.equal(
          '[object CryptoKey]',
        );
      });
      it(`has the type "${type}"`, () => {
        const key = keyPair[`${type}Key` as 'publicKey' | 'privateKey'];
        expect(key.type).to.equal(type);
      });
    });
  });
  [true, false].forEach(extractable => {
    it(`sets the private key's \`extractable\` accordingly when generating a key pair with the extractability \`${extractable}\``, async () => {
      const keyPair = await toKitKeypair(legacyKeypair, extractable);
      expect(keyPair.privateKey.extractable).to.equal(extractable);
    });
  });
});
