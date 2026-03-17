import {fixCodecSize, transformCodec} from '@solana/codecs-core';
import {getBytesCodec} from '@solana/codecs-data-structures';
import {
  getU32Decoder,
  getU64Decoder,
  getU8Decoder,
} from '@solana/codecs-numbers';

import assert from '../../utils/assert';
import {Address} from '../../address';

export type AddressLookupTableState = {
  deactivationSlot: bigint;
  lastExtendedSlot: number;
  lastExtendedSlotStartIndex: number;
  authority?: Address;
  addresses: Array<Address>;
};

export type AddressLookupTableAccountArgs = {
  key: Address;
  state: AddressLookupTableState;
};

/// The serialized size of lookup table metadata
const LOOKUP_TABLE_META_SIZE = 56;

const U32_DECODER = getU32Decoder();
const U64_DECODER = getU64Decoder();
const U8_DECODER = getU8Decoder();
const PUBLIC_KEY_CODEC = transformCodec(
  fixCodecSize(getBytesCodec(), 32),
  (value: Uint8Array) => value,
  value => new Uint8Array(value),
);

type LookupTableMeta = {
  typeIndex: number;
  deactivationSlot: bigint;
  lastExtendedSlot: number;
  lastExtendedStartIndex: number;
  authority: Array<Uint8Array>;
};

const decodeLookupTableMeta = (bytes: Uint8Array): LookupTableMeta => {
  let offset = 0;
  const [typeIndex, typeOffset] = U32_DECODER.read(bytes, offset);
  offset = typeOffset;
  const [deactivationSlot, deactivationOffset] = U64_DECODER.read(
    bytes,
    offset,
  );
  offset = deactivationOffset;
  const [lastExtendedSlotRaw, lastExtendedOffset] = U64_DECODER.read(
    bytes,
    offset,
  );
  offset = lastExtendedOffset;
  const [lastExtendedStartIndex, startOffset] = U8_DECODER.read(bytes, offset);
  offset = startOffset;
  const [authorityOption, optionOffset] = U8_DECODER.read(bytes, offset);
  offset = optionOffset;

  const authority: Array<Uint8Array> = [];
  if (authorityOption !== 0) {
    const [authorityBytes] = PUBLIC_KEY_CODEC.read(bytes, offset);
    authority.push(authorityBytes);
  }

  return {
    typeIndex,
    deactivationSlot,
    lastExtendedSlot: Number(lastExtendedSlotRaw),
    lastExtendedStartIndex,
    authority,
  };
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
    const meta = decodeLookupTableMeta(accountData);

    const serializedAddressesLen = accountData.length - LOOKUP_TABLE_META_SIZE;
    assert(serializedAddressesLen >= 0, 'lookup table is invalid');
    assert(serializedAddressesLen % 32 === 0, 'lookup table is invalid');

    const numSerializedAddresses = serializedAddressesLen / 32;
    const addressesBytes = accountData.slice(LOOKUP_TABLE_META_SIZE);
    const addresses: Array<Uint8Array> = [];
    for (let index = 0; index < numSerializedAddresses; index += 1) {
      const offset = index * 32;
      const [addressBytes] = PUBLIC_KEY_CODEC.read(addressesBytes, offset);
      addresses.push(addressBytes);
    }

    return {
      deactivationSlot: meta.deactivationSlot,
      lastExtendedSlot: meta.lastExtendedSlot,
      lastExtendedSlotStartIndex: meta.lastExtendedStartIndex,
      authority:
        meta.authority.length !== 0
          ? new Address(meta.authority[0])
          : undefined,
      addresses: addresses.map(address => new Address(address)),
    };
  }
}
