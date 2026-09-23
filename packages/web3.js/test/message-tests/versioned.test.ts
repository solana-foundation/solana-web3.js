import { expect } from 'chai';

import { VersionedMessage } from '../../src/message';

describe('VersionedMessage', () => {
    it('deserializeMessageVersion', () => {
        const bufferWithLegacyPrefix = new Uint8Array([1]);
        expect(VersionedMessage.deserializeMessageVersion(bufferWithLegacyPrefix)).to.eq('legacy');

        for (const version of [0, 1, 127]) {
            const bufferWithVersionPrefix = new Uint8Array([(1 << 7) + version]);
            expect(VersionedMessage.deserializeMessageVersion(bufferWithVersionPrefix)).to.eq(version);
        }
    });

    it('deserialize failure', () => {
        const bufferWithV2Prefix = new Uint8Array([(1 << 7) + 2]);
        expect(() => {
            VersionedMessage.deserialize(bufferWithV2Prefix);
        }).to.throw('Transaction message version 2 deserialization is not supported');
    });
});
