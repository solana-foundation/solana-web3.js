import { expect } from 'chai';

import { PublicKey } from '../../src';
import { buildBlockSubscriptionSpec } from '../../src/kit-adapters/subscription-specs';

describe('buildBlockSubscriptionSpec', () => {
    it('sends the rewards option as the `showRewards` wire field', () => {
        const config = { commitment: 'confirmed', rewards: false } as const;

        const spec = buildBlockSubscriptionSpec(PublicKey.default, config);

        expect(spec.options).to.eql({
            commitment: 'confirmed',
            showRewards: false,
        });
    });

    it('omits `showRewards` when no rewards option is supplied', () => {
        const config = { commitment: 'confirmed' } as const;

        const spec = buildBlockSubscriptionSpec(PublicKey.default, config);

        expect(spec.options).to.eql({ commitment: 'confirmed' });
    });
});
