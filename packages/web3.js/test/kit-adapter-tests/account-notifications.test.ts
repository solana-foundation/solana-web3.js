import type { Base58EncodedBytes, Lamports } from '@solana/kit';
import { expect } from 'chai';

import { PublicKey } from '../../src';
import {
    BASE58_DATA_TOO_LARGE_SENTINEL,
    normalizeWebSocketAccountInfo,
} from '../../src/kit-adapters/account-notifications';

const SENTINEL = BASE58_DATA_TOO_LARGE_SENTINEL as Base58EncodedBytes;

const BASE_VALUE = {
    executable: false,
    lamports: 1n as Lamports,
    owner: PublicKey.default.toBase58(),
    rentEpoch: 0n,
    space: 200n,
} as const;

describe('normalizeWebSocketAccountInfo', () => {
    it('decodes tuple-form base58 account data', () => {
        const accountInfo = normalizeWebSocketAccountInfo({
            ...BASE_VALUE,
            data: ['3MN' as Base58EncodedBytes, 'base58'],
        });

        expect(accountInfo.data).to.eql(new Uint8Array([30, 229]));
    });

    it('throws a descriptive error for the base58 overflow sentinel in tuple form', () => {
        expect(() =>
            normalizeWebSocketAccountInfo({
                ...BASE_VALUE,
                data: [SENTINEL, 'base58'],
            }),
        ).to.throw(/too large for base58 encoding.*encoding: 'base64'/);
    });

    it('throws a descriptive error for the base58 overflow sentinel in string form', () => {
        expect(() =>
            normalizeWebSocketAccountInfo({
                ...BASE_VALUE,
                data: SENTINEL,
            }),
        ).to.throw(/too large for base58 encoding/);
    });
});
