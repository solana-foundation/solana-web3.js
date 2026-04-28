import type { Address } from '../../../kit-shims/index';

export const resolveExtendLookupTableBytes = (scope: { args: { addresses: Array<Address> } }): number =>
    32 * scope.args.addresses.length;
