import {expect} from 'chai';

import {
  toPackedUint8Array,
  toUint8ArrayView,
} from '../src/utils/typed-array';

describe('toUint8ArrayView', () => {
  it('converts number arrays to Uint8Array', () => {
    const input = [1, 2, 3];
    const result = toUint8ArrayView(input);

    expect(result).to.be.instanceOf(Uint8Array);
    expect(Array.from(result)).to.eql([1, 2, 3]);
  });

  it('returns a view with the same buffer slice', () => {
    const base = new Uint8Array([10, 20, 30, 40]);
    const view = base.subarray(1, 3);
    const result = toUint8ArrayView(view);

    expect(Array.from(result)).to.eql([20, 30]);
    expect(result.buffer).to.eq(view.buffer);
    expect(result.byteOffset).to.eq(view.byteOffset);
    expect(result.byteLength).to.eq(view.byteLength);
  });
});

describe('toPackedUint8Array', () => {
  it('returns the same instance when already tightly packed', () => {
    const packed = new Uint8Array([1, 2, 3]);
    expect(toPackedUint8Array(packed)).to.eq(packed);
  });

  it('copies when given a sliced view', () => {
    const base = new Uint8Array([10, 20, 30, 40]);
    const view = base.subarray(1, 3);
    const packed = toPackedUint8Array(view);

    expect(Array.from(packed)).to.eql([20, 30]);
    expect(packed.buffer).to.not.eq(view.buffer);
    expect(packed.byteOffset).to.eq(0);
  });
});
