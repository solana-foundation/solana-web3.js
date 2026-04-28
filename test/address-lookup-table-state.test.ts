import {expect} from 'chai';
import {readFileSync} from 'fs';

import {Address} from '../src/address';
import {AddressLookupTableAccount} from '../src/programs/address-lookup-table/state';

type LookupTableFixture = {
  description: string;
  encoding: 'base64';
  length: number;
  data: string[];
  annotations: Array<{
    label: string;
    offset: number;
    length: number;
    hex: string;
  }>;
};

const loadLookupTableFixture = (
  fileName: string,
): {
  fixture: LookupTableFixture;
  bytes: Buffer;
} => {
  const fixtureUrl = new URL(`./fixtures/${fileName}`, import.meta.url);
  const fixture = JSON.parse(
    readFileSync(fixtureUrl, 'utf8'),
  ) as LookupTableFixture;
  const bytes = Buffer.from(fixture.data.join(''), 'base64');

  return {fixture, bytes};
};

const toHex = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex');

const expectFixtureBytes = (
  fixture: LookupTableFixture,
  bytes: Buffer,
): void => {
  expect(fixture.encoding).to.eq('base64');
  expect(bytes.length).to.eq(fixture.length);
  for (const annotation of fixture.annotations) {
    const slice = bytes.subarray(
      annotation.offset,
      annotation.offset + annotation.length,
    );
    expect(toHex(slice)).to.eq(annotation.hex);
  }
};

const getAnnotation = (
  fixture: LookupTableFixture,
  label: string,
): LookupTableFixture['annotations'][number] => {
  const annotation = fixture.annotations.find(entry => entry.label === label);
  expect(annotation, `Missing fixture annotation: ${label}`).to.not.eq(
    undefined,
  );
  return annotation as LookupTableFixture['annotations'][number];
};

const readU64LE = (
  bytes: Buffer,
  fixture: LookupTableFixture,
  label: string,
): bigint => bytes.readBigUInt64LE(getAnnotation(fixture, label).offset);

const readU8 = (
  bytes: Buffer,
  fixture: LookupTableFixture,
  label: string,
): number => bytes.readUInt8(getAnnotation(fixture, label).offset);

const readBytes = (
  bytes: Buffer,
  fixture: LookupTableFixture,
  label: string,
): Uint8Array => {
  const annotation = getAnnotation(fixture, label);
  return bytes.subarray(
    annotation.offset,
    annotation.offset + annotation.length,
  );
};

const getAddressAnnotations = (
  fixture: LookupTableFixture,
): LookupTableFixture['annotations'] =>
  fixture.annotations.filter(annotation =>
    annotation.label.startsWith('addresses['),
  );

describe('AddressLookupTableAccount', () => {
  it('deserializes lookup table state with authority and addresses', () => {
    const {fixture, bytes} = loadLookupTableFixture(
      'address-lookup-table-state-with-authority.json',
    );
    expectFixtureBytes(fixture, bytes);
    const state = AddressLookupTableAccount.deserialize(bytes);

    const deactivationSlot = readU64LE(bytes, fixture, 'deactivationSlot');
    const lastExtendedSlot = readU64LE(bytes, fixture, 'lastExtendedSlot');
    const lastExtendedStartIndex = readU8(
      bytes,
      fixture,
      'lastExtendedStartIndex',
    );
    const authorityOption = readU8(bytes, fixture, 'authorityOption');
    const authorityBytes = readBytes(bytes, fixture, 'authority');
    const addressAnnotations = getAddressAnnotations(fixture);

    expect(state.deactivationSlot).to.eq(deactivationSlot);
    expect(state.lastExtendedSlot).to.eq(lastExtendedSlot);
    expect(state.lastExtendedSlotStartIndex).to.eq(lastExtendedStartIndex);
    if (authorityOption === 0) {
      expect(state.authority).to.eq(undefined);
    } else {
      expect(state.authority?.equals(new Address(authorityBytes))).to.eq(true);
    }
    expect(state.addresses).to.have.length(addressAnnotations.length);
    addressAnnotations.forEach((annotation, index) => {
      const addressBytes = bytes.subarray(
        annotation.offset,
        annotation.offset + annotation.length,
      );
      expect(state.addresses[index].equals(new Address(addressBytes))).to.eq(
        true,
      );
    });
  });

  it('deserializes lookup table state without authority', () => {
    const {fixture, bytes} = loadLookupTableFixture(
      'address-lookup-table-state-without-authority.json',
    );
    expectFixtureBytes(fixture, bytes);

    const state = AddressLookupTableAccount.deserialize(bytes);

    const deactivationSlot = readU64LE(bytes, fixture, 'deactivationSlot');
    const lastExtendedSlot = readU64LE(bytes, fixture, 'lastExtendedSlot');
    const lastExtendedStartIndex = readU8(
      bytes,
      fixture,
      'lastExtendedStartIndex',
    );
    const authorityOption = readU8(bytes, fixture, 'authorityOption');
    const addressAnnotations = getAddressAnnotations(fixture);

    expect(state.deactivationSlot).to.eq(deactivationSlot);
    expect(state.lastExtendedSlot).to.eq(lastExtendedSlot);
    expect(state.lastExtendedSlotStartIndex).to.eq(lastExtendedStartIndex);
    if (authorityOption === 0) {
      expect(state.authority).to.eq(undefined);
    } else {
      expect(state.authority).to.not.eq(undefined);
    }
    expect(state.addresses).to.have.length(addressAnnotations.length);
  });
});
