import { getAddressLookupTableDecoder } from '@solana-program/address-lookup-table';
import { unwrapOption } from '@solana/kit';

import { PublicKey } from '../../publickey';

export type AddressLookupTableState = {
    deactivationSlot: bigint;
    lastExtendedSlot: bigint;
    lastExtendedSlotStartIndex: number;
    authority?: PublicKey;
    addresses: Array<PublicKey>;
};

export type AddressLookupTableAccountArgs = {
    key: PublicKey;
    state: AddressLookupTableState;
};

export class AddressLookupTableAccount {
    key: PublicKey;
    state: AddressLookupTableState;

    constructor(args: AddressLookupTableAccountArgs) {
        this.key = args.key;
        this.state = args.state;
    }

    isActive(): boolean {
        const U64_MAX = BigInt('0xffffffffffffffff');
        return this.state.deactivationSlot === U64_MAX;
    }

    static deserialize(accountData: Uint8Array): AddressLookupTableState {
        const state = getAddressLookupTableDecoder().decode(accountData);
        const authority = unwrapOption(state.authority);

        return {
            deactivationSlot: state.deactivationSlot,
            lastExtendedSlot: state.lastExtendedSlot,
            lastExtendedSlotStartIndex: state.lastExtendedSlotStartIndex,
            authority: authority == null ? undefined : new PublicKey(authority),
            addresses: state.addresses.map(address => new PublicKey(address)),
        };
    }
}
