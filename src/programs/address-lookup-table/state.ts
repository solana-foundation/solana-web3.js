import {unwrapOption} from '@solana/options';

import {getAddressLookupTableDecoder} from '../../__generated__/program-clients/address-lookup-table';
import {Address} from '../../address';

export type AddressLookupTableState = {
  deactivationSlot: bigint;
  lastExtendedSlot: bigint;
  lastExtendedSlotStartIndex: number;
  authority?: Address;
  addresses: Array<Address>;
};

export type AddressLookupTableAccountArgs = {
  key: Address;
  state: AddressLookupTableState;
};

export class AddressLookupTableAccount {
  key: Address;
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
      authority: authority == null ? undefined : new Address(authority),
      addresses: state.addresses.map(address => new Address(address)),
    };
  }
}
