import {expect} from 'chai';

import {Connection, PublicKey} from '../../src';
import type {
  GetProgramAccountsFilter,
  TokenAccountsFilter,
} from '../../src/connection';
import {
  getProgramAccountsRpcFilters,
  getTokenAccountsRpcFilter,
} from '../../src/kit-adapters/request';
import {
  stubSubscriptionHarness,
  teardownSubscriptions,
} from '../mocks/rpc-subscriptions';

const MINT = new PublicKey('7MbpdfJa5xqwexkp6WUvkYHTPo4VgxYACDBNFWYLwCdo');
const PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

describe('getTokenAccountsRpcFilter', () => {
  it('maps a mint filter', () => {
    const filter: TokenAccountsFilter = {mint: MINT};

    const typedFilter = getTokenAccountsRpcFilter(filter);

    expect(typedFilter).to.eql({mint: MINT.toBase58()});
  });

  it('maps a programId filter', () => {
    const filter: TokenAccountsFilter = {programId: PROGRAM_ID};

    const typedFilter = getTokenAccountsRpcFilter(filter);

    expect(typedFilter).to.eql({programId: PROGRAM_ID.toBase58()});
  });

  it('rejects a filter carrying both `mint` and `programId`', () => {
    const filter = {
      mint: MINT,
      programId: PROGRAM_ID,
    } as unknown as TokenAccountsFilter;

    expect(() => getTokenAccountsRpcFilter(filter)).to.throw(
      /Ambiguous token accounts filter/,
    );
  });

  it('rejects a filter carrying neither `mint` nor `programId`', () => {
    const filter = {} as unknown as TokenAccountsFilter;

    expect(() => getTokenAccountsRpcFilter(filter)).to.throw(
      /Ambiguous token accounts filter/,
    );
  });
});

describe('getProgramAccountsRpcFilters', () => {
  it('maps memcmp and dataSize filters', () => {
    const filters: GetProgramAccountsFilter[] = [
      {memcmp: {bytes: MINT.toBase58(), offset: 0}},
      {dataSize: 165},
    ];

    const typedFilters = getProgramAccountsRpcFilters(filters);

    expect(typedFilters).to.eql([
      {memcmp: {bytes: MINT.toBase58(), encoding: 'base58', offset: 0n}},
      {dataSize: 165n},
    ]);
  });

  for (const memcmp of [undefined, null]) {
    it(`maps a dataSize filter carrying memcmp: ${memcmp}`, () => {
      const filter = {dataSize: 0, memcmp};

      expect(getProgramAccountsRpcFilters([filter])).to.eql([{dataSize: 0n}]);
      expect(filter).to.eql({dataSize: 0, memcmp});
    });
  }

  for (const dataSize of [undefined, null]) {
    it(`maps a memcmp filter carrying dataSize: ${dataSize}`, () => {
      const filter = {dataSize, memcmp: {bytes: MINT.toBase58(), offset: 0}};

      expect(getProgramAccountsRpcFilters([filter])).to.eql([
        {memcmp: {bytes: MINT.toBase58(), encoding: 'base58', offset: 0n}},
      ]);
    });
  }

  it('rejects a filter carrying both `memcmp` and `dataSize`', () => {
    const filters = [
      {
        dataSize: 82,
        memcmp: {bytes: MINT.toBase58(), offset: 0},
      },
    ] as unknown as GetProgramAccountsFilter[];

    expect(() => getProgramAccountsRpcFilters(filters)).to.throw(
      /Ambiguous program accounts filter/,
    );
  });

  it('rejects a filter carrying neither `memcmp` nor `dataSize`', () => {
    const filters = [{}] as unknown as GetProgramAccountsFilter[];

    expect(() => getProgramAccountsRpcFilters(filters)).to.throw(
      /Ambiguous program accounts filter/,
    );
  });
});

describe('program account filter requests', () => {
  for (const memcmp of [undefined, null]) {
    for (const method of [
      'getProgramAccounts',
      'getParsedProgramAccounts',
    ] as const) {
      it(`${method} sends dataSize when memcmp is ${memcmp}`, async () => {
        let requestCount = 0;
        const connection = new Connection('http://mock.invalid', {
          commitment: 'confirmed',
          fetch: (_url, init) => {
            const request = JSON.parse(String(init?.body));
            expect(request.method).to.equal('getProgramAccounts');
            expect(request.params[1].filters).to.eql([{dataSize: 0}]);
            requestCount++;
            return Promise.resolve(
              new Response(
                JSON.stringify({id: request.id, jsonrpc: '2.0', result: []}),
              ),
            );
          },
        });
        const filter = {dataSize: 0, memcmp};

        expect(
          await connection[method](PROGRAM_ID, {filters: [filter]}),
        ).to.eql([]);
        expect(requestCount).to.equal(1);
      });
    }

    it(`onProgramAccountChange sends dataSize when memcmp is ${memcmp}`, async () => {
      const {connection, harness} = stubSubscriptionHarness(
        'http://mock.invalid',
        'confirmed',
      );
      harness.requestSubscription.resolves(1);
      harness.unsubscribe.resolves(true);
      const filter = {dataSize: 0, memcmp};

      try {
        const clientId = connection.onProgramAccountChange(
          PROGRAM_ID,
          () => {},
          {
            filters: [filter],
          },
        );
        await new Promise<void>(resolve => setImmediate(resolve));

        expect(harness.requestSubscription).to.have.property('callCount', 1);
        expect(harness.requestSubscription.firstCall.args[0]).to.eql({
          address: PROGRAM_ID.toBase58(),
          kind: 'program',
          options: {
            commitment: 'confirmed',
            encoding: 'base64',
            filters: [{dataSize: 0n}],
          },
        });
        await connection.removeProgramAccountChangeListener(clientId);
      } finally {
        await teardownSubscriptions(connection);
      }
    });
  }
});
