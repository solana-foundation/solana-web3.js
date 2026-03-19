import {expect} from 'chai';

import * as Layout from '../src/layout';

describe('Layout', () => {
  it('rustString encodes and decodes multibyte utf-8 strings', () => {
    const value = 'Solana ☉ validator';
    const layout = Layout.rustString();
    const buffer = new Uint8Array(256);

    const written = layout.encode(value, buffer, 0);

    expect(written).to.be.greaterThan(0);
    expect(layout.decode(buffer, 0)).to.eq(value);
  });
});