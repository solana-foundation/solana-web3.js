import {expect} from 'chai';

import {
  concatUint8Arrays,
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

  it('returns the same Buffer instance when already tightly packed', () => {
    const backingBytes = Uint8Array.from([1, 2, 3]);
    const packed = Buffer.from(backingBytes.buffer);

    expect(toPackedUint8Array(packed)).to.eq(packed);
  });

  it('normalizes number arrays into tightly packed Uint8Arrays', () => {
    const packed = toPackedUint8Array([1, 2, 3]);

    expect(packed).to.be.instanceOf(Uint8Array);
    expect(Array.from(packed)).to.eql([1, 2, 3]);
    expect(packed.byteOffset).to.eq(0);
    expect(packed.byteLength).to.eq(3);
  });

  it('copies when given a sliced view', () => {
    const base = new Uint8Array([10, 20, 30, 40]);
    const view = base.subarray(1, 3);
    const packed = toPackedUint8Array(view);

    expect(Array.from(packed)).to.eql([20, 30]);
    expect(packed.buffer).to.not.eq(view.buffer);
    expect(packed.byteOffset).to.eq(0);
  });

  it('copies only the intended bytes from a sliced Buffer view', () => {
    const base = Buffer.from(Uint8Array.from([10, 20, 30, 40]).buffer);
    const view = base.subarray(1, 3);
    const packed = toPackedUint8Array(view);

    view[0] = 99;

    expect(Array.from(packed)).to.eql([20, 30]);
    expect(packed.buffer).to.not.eq(view.buffer);
    expect(packed.byteOffset).to.eq(0);
  });
});

describe('concatUint8Arrays', () => {
  it('concatenates byte arrays in order', () => {
    const result = concatUint8Arrays([
      Uint8Array.from([1, 2]),
      Uint8Array.from([]),
      Uint8Array.from([3, 4]),
    ]);

    expect(Array.from(result)).to.eql([1, 2, 3, 4]);
  });

  it('copies sliced views into a tightly packed result', () => {
    const base = Uint8Array.from([9, 10, 11, 12, 13]);
    const result = concatUint8Arrays([base.subarray(1, 3), base.subarray(3)]);

    expect(Array.from(result)).to.eql([10, 11, 12, 13]);
    expect(result.byteOffset).to.eq(0);
    expect(result.byteLength).to.eq(4);
  });

  it('returns an empty Uint8Array when given no inputs', () => {
    const result = concatUint8Arrays([]);

    expect(result).to.be.instanceOf(Uint8Array);
    expect(result.byteLength).to.eq(0);
  });
});
