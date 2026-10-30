import {blockhash, lamports} from '@solana/kit';
import {stringifyJsonWithBigInts} from '@solana/rpc-spec-types';
import {expect} from 'chai';

import type {
  AccountsModeBlockResponse,
  BlockResponse,
  BlockSubscriptionAccountsModeBlockResponse,
  BlockSubscriptionBase58BlockResponse,
  BlockSubscriptionBase64BlockResponse,
  BlockSubscriptionJsonBlockResponse,
  BlockSubscriptionJsonParsedBlockResponse,
  ParsedAccountsModeBlockResponse,
  ParsedBlockResponse,
  VersionedAccountsModeBlockResponse,
  VersionedBlockResponse,
} from '../../src';

type BlockMeta<TBlock extends {transactions: ReadonlyArray<{meta: unknown}>}> =
  NonNullable<TBlock['transactions'][number]['meta']>;

type FullBlockMeta = BlockMeta<BlockResponse> &
  BlockMeta<VersionedBlockResponse> &
  BlockMeta<ParsedBlockResponse> &
  BlockMeta<BlockSubscriptionBase58BlockResponse> &
  BlockMeta<BlockSubscriptionBase64BlockResponse> &
  BlockMeta<BlockSubscriptionJsonBlockResponse> &
  BlockMeta<BlockSubscriptionJsonParsedBlockResponse>;

type AccountsBlockMeta = BlockMeta<AccountsModeBlockResponse> &
  BlockMeta<VersionedAccountsModeBlockResponse> &
  BlockMeta<ParsedAccountsModeBlockResponse> &
  BlockMeta<BlockSubscriptionAccountsModeBlockResponse>;

const ADDRESS = '11111111111111111111111111111111';
const requiredMeta = {
  err: null,
  fee: lamports(5000n),
  logMessages: null,
  postBalances: [lamports(5000n)],
  preBalances: [lamports(10000n)],
  rewards: null,
  status: {Ok: null},
};

export const blockMetadataCases = [
  {
    name: 'null',
    full: {
      ...requiredMeta,
      innerInstructions: null,
      postTokenBalances: null,
      preTokenBalances: null,
    } satisfies FullBlockMeta,
    accounts: {
      ...requiredMeta,
      postTokenBalances: null,
      preTokenBalances: null,
    } satisfies AccountsBlockMeta,
  },
  {
    name: 'omitted',
    full: {...requiredMeta} satisfies FullBlockMeta,
    accounts: {...requiredMeta} satisfies AccountsBlockMeta,
  },
  {
    name: 'empty',
    full: {
      ...requiredMeta,
      innerInstructions: [],
      postTokenBalances: [],
      preTokenBalances: [],
    } satisfies FullBlockMeta,
    accounts: {
      ...requiredMeta,
      postTokenBalances: [],
      preTokenBalances: [],
    } satisfies AccountsBlockMeta,
  },
];

export function createBlock(
  encoding: 'json' | 'jsonParsed' | 'base58' | 'base64',
  transactionDetails: 'full' | 'accounts',
  meta: FullBlockMeta | AccountsBlockMeta,
) {
  const account = {
    pubkey: ADDRESS,
    signer: true,
    source: 'transaction',
    writable: true,
  };
  return {
    blockHeight: null,
    blockTime: null,
    blockhash: blockhash(ADDRESS),
    parentSlot: 0n,
    previousBlockhash: blockhash(ADDRESS),
    rewards: [],
    transactions: [
      {
        meta,
        transaction:
          encoding === 'base58' || encoding === 'base64'
            ? [encoding === 'base58' ? 'Ldp' : 'AQID', encoding]
            : {
                signatures: ['1'.repeat(64)],
                ...(transactionDetails === 'accounts'
                  ? {accountKeys: [account]}
                  : {
                      message: {
                        accountKeys:
                          encoding === 'json' ? [ADDRESS] : [account],
                        ...(encoding === 'json'
                          ? {
                              header: {
                                numReadonlySignedAccounts: 0,
                                numReadonlyUnsignedAccounts: 0,
                                numRequiredSignatures: 1,
                              },
                            }
                          : {}),
                        instructions: [],
                        recentBlockhash: ADDRESS,
                      },
                    }),
              },
        version: 'legacy',
      },
    ],
  };
}

export function expectBlockMetadataFields(
  meta: object | null | undefined,
  source: FullBlockMeta | AccountsBlockMeta,
  includeInnerInstructions = true,
) {
  expect(meta).to.be.an('object');
  for (const key of [
    'innerInstructions',
    'postTokenBalances',
    'preTokenBalances',
  ] as const) {
    if (key === 'innerInstructions' && !includeInnerInstructions) continue;
    if (Object.hasOwn(source, key)) {
      expect(meta)
        .to.have.own.property(key)
        .that.deep.equals(Reflect.get(source, key));
    } else {
      expect(meta).not.to.have.property(key);
    }
  }
}

export function mockBlockFetch(block: unknown): typeof fetch {
  return (_url, init) => {
    const request = JSON.parse(String(init?.body));
    expect(request.method).to.equal('getBlock');
    return Promise.resolve(
      new Response(
        stringifyJsonWithBigInts({
          id: request.id,
          jsonrpc: '2.0',
          result: block,
        }),
      ),
    );
  };
}
