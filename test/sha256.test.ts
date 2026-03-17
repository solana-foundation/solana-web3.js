import {expect} from 'chai';

import {sha256, sha256Sync} from '../src/utils/sha256';

const TEST_INPUT = new Uint8Array([1, 2, 3, 4, 5]);
const TEST_HASH_HEX =
  '74f81fe167d99b4cb41d6d0ccda82278caee9f3e2f25d5e5a3936ff3dcec60d0';

describe('sha256', () => {
  it('hashes ArrayBuffer-backed input', async () => {
    const actual = await sha256(TEST_INPUT);

    expect(Buffer.from(actual).toString('hex')).to.eq(TEST_HASH_HEX);
  });

  it('accepts SharedArrayBuffer-backed input by normalizing first', async function () {
    const shared = new SharedArrayBuffer(TEST_INPUT.length);
    const input = new Uint8Array(shared);
    input.set(TEST_INPUT);

    const actual = await sha256(input);

    expect(Buffer.from(actual).toString('hex')).to.eq(TEST_HASH_HEX);
  });

});

describe('sha256Sync', () => {
  it('hashes input synchronously', () => {
    const actual = sha256Sync(TEST_INPUT);

    expect(Buffer.from(actual).toString('hex')).to.eq(TEST_HASH_HEX);
  });
});
