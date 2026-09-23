import { expect } from 'chai';

import { PublicKey } from '../../src';
import type { GetProgramAccountsFilter, TokenAccountsFilter } from '../../src/connection';
import { getProgramAccountsRpcFilters, getTokenAccountsRpcFilter } from '../../src/kit-adapters/request';

const MINT = new PublicKey('7MbpdfJa5xqwexkp6WUvkYHTPo4VgxYACDBNFWYLwCdo');
const PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

describe('getTokenAccountsRpcFilter', () => {
    it('maps a mint filter', () => {
        const filter: TokenAccountsFilter = { mint: MINT };

        const typedFilter = getTokenAccountsRpcFilter(filter);

        expect(typedFilter).to.eql({ mint: MINT.toBase58() });
    });

    it('maps a programId filter', () => {
        const filter: TokenAccountsFilter = { programId: PROGRAM_ID };

        const typedFilter = getTokenAccountsRpcFilter(filter);

        expect(typedFilter).to.eql({ programId: PROGRAM_ID.toBase58() });
    });

    it('rejects a filter carrying both `mint` and `programId`', () => {
        const filter = {
            mint: MINT,
            programId: PROGRAM_ID,
        } as unknown as TokenAccountsFilter;

        expect(() => getTokenAccountsRpcFilter(filter)).to.throw(/Ambiguous token accounts filter/);
    });

    it('rejects a filter carrying neither `mint` nor `programId`', () => {
        const filter = {} as unknown as TokenAccountsFilter;

        expect(() => getTokenAccountsRpcFilter(filter)).to.throw(/Ambiguous token accounts filter/);
    });
});

describe('getProgramAccountsRpcFilters', () => {
    it('maps memcmp and dataSize filters', () => {
        const filters: GetProgramAccountsFilter[] = [
            { memcmp: { bytes: MINT.toBase58(), offset: 0 } },
            { dataSize: 165 },
        ];

        const typedFilters = getProgramAccountsRpcFilters(filters);

        expect(typedFilters).to.eql([
            { memcmp: { bytes: MINT.toBase58(), encoding: 'base58', offset: 0n } },
            { dataSize: 165n },
        ]);
    });

    it('rejects a filter carrying both `memcmp` and `dataSize`', () => {
        const filters = [
            {
                dataSize: 82,
                memcmp: { bytes: MINT.toBase58(), offset: 0 },
            },
        ] as unknown as GetProgramAccountsFilter[];

        expect(() => getProgramAccountsRpcFilters(filters)).to.throw(/Ambiguous program accounts filter/);
    });

    it('rejects a filter carrying neither `memcmp` nor `dataSize`', () => {
        const filters = [{}] as unknown as GetProgramAccountsFilter[];

        expect(() => getProgramAccountsRpcFilters(filters)).to.throw(/Ambiguous program accounts filter/);
    });
});
