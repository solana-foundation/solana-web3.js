import { expect } from 'chai';
import { getU32Codec, getStructCodec } from '../src';

describe('web3.js exports', () => {
  it('should re-export codec utilities from @solana/codecs', () => {
    expect(getU32Codec).to.be.a('function');
    expect(getStructCodec).to.be.a('function');
  });
});
