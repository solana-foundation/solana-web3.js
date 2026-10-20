import {expect} from 'chai';

import {clusterApiUrl} from '../src/utils/cluster';

describe('Cluster Util', () => {
  it('invalid', () => {
    expect(() => {
      clusterApiUrl('abc123' as any);
    }).to.throw();
  });

  it('devnet', () => {
    expect(clusterApiUrl()).to.eq('https://api.devnet.solana.com');
    expect(clusterApiUrl('devnet')).to.eq('https://api.devnet.solana.com');
    expect(clusterApiUrl('devnet', true)).to.eq(
      'https://api.devnet.solana.com',
    );
    expect(clusterApiUrl('devnet', false)).to.eq(
      'http://api.devnet.solana.com',
    );
  });

  it('mainnet', () => {
    expect(clusterApiUrl('mainnet')).to.eq('https://api.mainnet.solana.com/');
    expect(clusterApiUrl('mainnet', false)).to.eq(
      'http://api.mainnet.solana.com/',
    );
  });

  it('mainnet-beta', () => {
    expect(clusterApiUrl('mainnet-beta')).to.eq(
      'https://api.mainnet-beta.solana.com/',
    );
    expect(clusterApiUrl('mainnet-beta', false)).to.eq(
      'http://api.mainnet-beta.solana.com/',
    );
  });
});
