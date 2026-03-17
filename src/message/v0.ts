import {fixDecoderSize, fixEncoderSize} from '@solana/codecs-core';
import {
  getArrayDecoder,
  getArrayEncoder,
  getBytesDecoder,
  getBytesEncoder,
  getStructDecoder,
  getStructEncoder,
} from '@solana/codecs-data-structures';
import {
  getShortU16Decoder,
  getShortU16Encoder,
  getU8Decoder,
  getU8Encoder,
} from '@solana/codecs-numbers';
import {getBase58Decoder, getBase58Encoder} from '@solana/codecs-strings';
import {Blockhash} from '../blockhash';
import {
  MessageHeader,
  MessageAddressTableLookup,
  MessageCompiledInstruction,
} from './index';
import {PublicKey, PUBLIC_KEY_LENGTH} from '../publickey';
import assert from '../utils/assert';
import {toUint8ArrayView} from '../utils/typed-array';
import {PACKET_DATA_SIZE, VERSION_PREFIX_MASK} from '../transaction/constants';
import {TransactionInstruction} from '../transaction';
import {AddressLookupTableAccount} from '../programs';
import {CompiledKeys} from './compiled-keys';
import {AccountKeysFromLookups, MessageAccountKeys} from './account-keys';

const BYTES_ENCODER = getBytesEncoder();
const SHORT_U16_ENCODER = getShortU16Encoder();
const SHORT_U16_DECODER = getShortU16Decoder();
const U8_DECODER = getU8Decoder();
const U8_ENCODER = getU8Encoder();
const BASE58_ENCODER = getBase58Encoder();
const BASE58_DECODER = getBase58Decoder();
const PUBLIC_KEY_DECODER = fixDecoderSize(getBytesDecoder(), PUBLIC_KEY_LENGTH);
const COMPILED_INSTRUCTION_DECODER = getStructDecoder([
  ['programIdIndex', U8_DECODER],
  ['accountKeyIndexes', getArrayDecoder(U8_DECODER, {size: SHORT_U16_DECODER})],
  ['data', getArrayDecoder(U8_DECODER, {size: SHORT_U16_DECODER})],
]);
const ADDRESS_TABLE_LOOKUP_DECODER = getStructDecoder([
  ['accountKey', PUBLIC_KEY_DECODER],
  ['writableIndexes', getArrayDecoder(U8_DECODER, {size: SHORT_U16_DECODER})],
  ['readonlyIndexes', getArrayDecoder(U8_DECODER, {size: SHORT_U16_DECODER})],
]);
const MESSAGE_V0_DECODER = getStructDecoder([
  ['prefix', U8_DECODER],
  [
    'header',
    getStructDecoder([
      ['numRequiredSignatures', U8_DECODER],
      ['numReadonlySignedAccounts', U8_DECODER],
      ['numReadonlyUnsignedAccounts', U8_DECODER],
    ]),
  ],
  ['staticAccountKeys', getArrayDecoder(PUBLIC_KEY_DECODER, {size: SHORT_U16_DECODER})],
  ['recentBlockhash', PUBLIC_KEY_DECODER],
  [
    'compiledInstructions',
    getArrayDecoder(COMPILED_INSTRUCTION_DECODER, {size: SHORT_U16_DECODER}),
  ],
  [
    'addressTableLookups',
    getArrayDecoder(ADDRESS_TABLE_LOOKUP_DECODER, {size: SHORT_U16_DECODER}),
  ],
]);

/**
 * Message constructor arguments
 */
export type MessageV0Args = {
  /** The message header, identifying signed and read-only `accountKeys` */
  header: MessageHeader;
  /** The static account keys used by this transaction */
  staticAccountKeys: PublicKey[];
  /** The hash of a recent ledger block */
  recentBlockhash: Blockhash;
  /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
  compiledInstructions: MessageCompiledInstruction[];
  /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
  addressTableLookups: MessageAddressTableLookup[];
};

export type CompileV0Args = {
  payerKey: PublicKey;
  instructions: Array<TransactionInstruction>;
  recentBlockhash: Blockhash;
  addressLookupTableAccounts?: Array<AddressLookupTableAccount>;
};

export type GetAccountKeysArgs =
  | {
      accountKeysFromLookups?: AccountKeysFromLookups | null;
    }
  | {
      addressLookupTableAccounts?: AddressLookupTableAccount[] | null;
    };

export class MessageV0 {
  header: MessageHeader;
  staticAccountKeys: Array<PublicKey>;
  recentBlockhash: Blockhash;
  compiledInstructions: Array<MessageCompiledInstruction>;
  addressTableLookups: Array<MessageAddressTableLookup>;

  constructor(args: MessageV0Args) {
    this.header = args.header;
    this.staticAccountKeys = args.staticAccountKeys;
    this.recentBlockhash = args.recentBlockhash;
    this.compiledInstructions = args.compiledInstructions;
    this.addressTableLookups = args.addressTableLookups;
  }

  get version(): 0 {
    return 0;
  }

  get numAccountKeysFromLookups(): number {
    let count = 0;
    for (const lookup of this.addressTableLookups) {
      count += lookup.readonlyIndexes.length + lookup.writableIndexes.length;
    }
    return count;
  }

  getAccountKeys(args?: GetAccountKeysArgs): MessageAccountKeys {
    let accountKeysFromLookups: AccountKeysFromLookups | undefined;
    if (
      args &&
      'accountKeysFromLookups' in args &&
      args.accountKeysFromLookups
    ) {
      if (
        this.numAccountKeysFromLookups !=
        args.accountKeysFromLookups.writable.length +
          args.accountKeysFromLookups.readonly.length
      ) {
        throw new Error(
          'Failed to get account keys because of a mismatch in the number of account keys from lookups',
        );
      }
      accountKeysFromLookups = args.accountKeysFromLookups;
    } else if (
      args &&
      'addressLookupTableAccounts' in args &&
      args.addressLookupTableAccounts
    ) {
      accountKeysFromLookups = this.resolveAddressTableLookups(
        args.addressLookupTableAccounts,
      );
    } else if (this.addressTableLookups.length > 0) {
      throw new Error(
        'Failed to get account keys because address table lookups were not resolved',
      );
    }
    return new MessageAccountKeys(
      this.staticAccountKeys,
      accountKeysFromLookups,
    );
  }

  isAccountSigner(index: number): boolean {
    return index < this.header.numRequiredSignatures;
  }

  isAccountWritable(index: number): boolean {
    const numSignedAccounts = this.header.numRequiredSignatures;
    const numStaticAccountKeys = this.staticAccountKeys.length;
    if (index >= numStaticAccountKeys) {
      const lookupAccountKeysIndex = index - numStaticAccountKeys;
      const numWritableLookupAccountKeys = this.addressTableLookups.reduce(
        (count, lookup) => count + lookup.writableIndexes.length,
        0,
      );
      return lookupAccountKeysIndex < numWritableLookupAccountKeys;
    } else if (index >= this.header.numRequiredSignatures) {
      const unsignedAccountIndex = index - numSignedAccounts;
      const numUnsignedAccounts = numStaticAccountKeys - numSignedAccounts;
      const numWritableUnsignedAccounts =
        numUnsignedAccounts - this.header.numReadonlyUnsignedAccounts;
      return unsignedAccountIndex < numWritableUnsignedAccounts;
    } else {
      const numWritableSignedAccounts =
        numSignedAccounts - this.header.numReadonlySignedAccounts;
      return index < numWritableSignedAccounts;
    }
  }

  resolveAddressTableLookups(
    addressLookupTableAccounts: AddressLookupTableAccount[],
  ): AccountKeysFromLookups {
    const accountKeysFromLookups: AccountKeysFromLookups = {
      writable: [],
      readonly: [],
    };

    for (const tableLookup of this.addressTableLookups) {
      const tableAccount = addressLookupTableAccounts.find(account =>
        account.key.equals(tableLookup.accountKey),
      );
      if (!tableAccount) {
        throw new Error(
          `Failed to find address lookup table account for table key ${tableLookup.accountKey.toBase58()}`,
        );
      }

      for (const index of tableLookup.writableIndexes) {
        if (index < tableAccount.state.addresses.length) {
          accountKeysFromLookups.writable.push(
            tableAccount.state.addresses[index],
          );
        } else {
          throw new Error(
            `Failed to find address for index ${index} in address lookup table ${tableLookup.accountKey.toBase58()}`,
          );
        }
      }

      for (const index of tableLookup.readonlyIndexes) {
        if (index < tableAccount.state.addresses.length) {
          accountKeysFromLookups.readonly.push(
            tableAccount.state.addresses[index],
          );
        } else {
          throw new Error(
            `Failed to find address for index ${index} in address lookup table ${tableLookup.accountKey.toBase58()}`,
          );
        }
      }
    }

    return accountKeysFromLookups;
  }

  static compile(args: CompileV0Args): MessageV0 {
    const compiledKeys = CompiledKeys.compile(args.instructions, args.payerKey);

    const addressTableLookups = new Array<MessageAddressTableLookup>();
    const accountKeysFromLookups: AccountKeysFromLookups = {
      writable: new Array(),
      readonly: new Array(),
    };
    const lookupTableAccounts = args.addressLookupTableAccounts || [];
    for (const lookupTable of lookupTableAccounts) {
      const extractResult = compiledKeys.extractTableLookup(lookupTable);
      if (extractResult !== undefined) {
        const [addressTableLookup, {writable, readonly}] = extractResult;
        addressTableLookups.push(addressTableLookup);
        accountKeysFromLookups.writable.push(...writable);
        accountKeysFromLookups.readonly.push(...readonly);
      }
    }

    const [header, staticAccountKeys] = compiledKeys.getMessageComponents();
    const accountKeys = new MessageAccountKeys(
      staticAccountKeys,
      accountKeysFromLookups,
    );
    const compiledInstructions = accountKeys.compileInstructions(
      args.instructions,
    );
    return new MessageV0({
      header,
      staticAccountKeys,
      recentBlockhash: args.recentBlockhash,
      compiledInstructions,
      addressTableLookups,
    });
  }

  serialize(): Uint8Array {
    const encodedStaticAccountKeysLength = SHORT_U16_ENCODER.encode(
      this.staticAccountKeys.length,
    );

    const serializedInstructions = this.serializeInstructions();
    const encodedInstructionsLength = SHORT_U16_ENCODER.encode(
      this.compiledInstructions.length,
    );

    const serializedAddressTableLookups = this.serializeAddressTableLookups();
    const encodedAddressTableLookupsLength = SHORT_U16_ENCODER.encode(
      this.addressTableLookups.length,
    );

    const messageLayout = getStructEncoder([
      ['prefix', U8_ENCODER],
      [
        'header',
        getStructEncoder([
          ['numRequiredSignatures', U8_ENCODER],
          ['numReadonlySignedAccounts', U8_ENCODER],
          ['numReadonlyUnsignedAccounts', U8_ENCODER],
        ]),
      ],
      [
        'staticAccountKeysLength',
        fixEncoderSize(getBytesEncoder(), encodedStaticAccountKeysLength.length),
      ],
      [
        'staticAccountKeys',
        getArrayEncoder(fixEncoderSize(getBytesEncoder(), PUBLIC_KEY_LENGTH), {
          size: this.staticAccountKeys.length,
        }),
      ],
      ['recentBlockhash', fixEncoderSize(getBytesEncoder(), PUBLIC_KEY_LENGTH)],
      [
        'instructionsLength',
        fixEncoderSize(getBytesEncoder(), encodedInstructionsLength.length),
      ],
      [
        'serializedInstructions',
        fixEncoderSize(getBytesEncoder(), serializedInstructions.length),
      ],
      [
        'addressTableLookupsLength',
        fixEncoderSize(
          getBytesEncoder(),
          encodedAddressTableLookupsLength.length,
        ),
      ],
      [
        'serializedAddressTableLookups',
        fixEncoderSize(getBytesEncoder(), serializedAddressTableLookups.length),
      ],
    ]);

    const MESSAGE_VERSION_0_PREFIX = 1 << 7;
    const encodedMessage = messageLayout.encode({
      prefix: MESSAGE_VERSION_0_PREFIX,
      header: this.header,
      staticAccountKeysLength: encodedStaticAccountKeysLength,
      staticAccountKeys: this.staticAccountKeys.map(key => key.toBytes()),
      recentBlockhash: BASE58_ENCODER.encode(this.recentBlockhash),
      instructionsLength: encodedInstructionsLength,
      serializedInstructions,
      addressTableLookupsLength: encodedAddressTableLookupsLength,
      serializedAddressTableLookups,
    });
    return toUint8ArrayView(encodedMessage);
  }

  private serializeInstructions(): Uint8Array {
    let serializedLength = 0;
    const serializedInstructions = new Uint8Array(PACKET_DATA_SIZE);
    for (const instruction of this.compiledInstructions) {
      const encodedAccountKeyIndexesLength = SHORT_U16_ENCODER.encode(
        instruction.accountKeyIndexes.length,
      );

      const encodedDataLength = SHORT_U16_ENCODER.encode(
        instruction.data.length,
      );

      const instructionLayout = getStructEncoder([
        ['programIdIndex', U8_ENCODER],
        [
          'encodedAccountKeyIndexesLength',
          fixEncoderSize(
            getBytesEncoder(),
            encodedAccountKeyIndexesLength.length,
          ),
        ],
        [
          'accountKeyIndexes',
          getArrayEncoder(U8_ENCODER, {
            size: instruction.accountKeyIndexes.length,
          }),
        ],
        [
          'encodedDataLength',
          fixEncoderSize(getBytesEncoder(), encodedDataLength.length),
        ],
        ['data', fixEncoderSize(getBytesEncoder(), instruction.data.length)],
      ]);

      serializedLength = instructionLayout.write(
        {
          programIdIndex: instruction.programIdIndex,
          encodedAccountKeyIndexesLength,
          accountKeyIndexes: instruction.accountKeyIndexes,
          encodedDataLength,
          data: instruction.data,
        },
        serializedInstructions,
        serializedLength,
      );
    }

    return serializedInstructions.slice(0, serializedLength);
  }

  private serializeAddressTableLookups(): Uint8Array {
    const bytes = new Uint8Array(PACKET_DATA_SIZE);
    let offset = 0;
    for (const lookup of this.addressTableLookups) {
      offset = BYTES_ENCODER.write(lookup.accountKey.toBytes(), bytes, offset);
      offset = SHORT_U16_ENCODER.write(lookup.writableIndexes.length, bytes, offset);
      offset = BYTES_ENCODER.write(
        Uint8Array.from(lookup.writableIndexes),
        bytes,
        offset,
      );
      offset = SHORT_U16_ENCODER.write(lookup.readonlyIndexes.length, bytes, offset);
      offset = BYTES_ENCODER.write(
        Uint8Array.from(lookup.readonlyIndexes),
        bytes,
        offset,
      );
    }

    return bytes.slice(0, offset);
  }

  static deserialize(serializedMessage: Uint8Array): MessageV0 {
    const prefix = serializedMessage[0];
    const maskedPrefix = prefix & VERSION_PREFIX_MASK;
    assert(
      prefix !== maskedPrefix,
      `Expected versioned message but received legacy message`,
    );

    const version = maskedPrefix;
    assert(
      version === 0,
      `Expected versioned message with version 0 but found version ${version}`,
    );

    const decodedMessage = MESSAGE_V0_DECODER.decode(serializedMessage);

    const header: MessageHeader = decodedMessage.header;

    const staticAccountKeys = decodedMessage.staticAccountKeys.map(
      accountKey => new PublicKey(accountKey),
    );

    const recentBlockhash = BASE58_DECODER.decode(
      Uint8Array.from(decodedMessage.recentBlockhash),
    );

    const compiledInstructions: MessageCompiledInstruction[] =
      decodedMessage.compiledInstructions.map(instruction => ({
        programIdIndex: instruction.programIdIndex,
        accountKeyIndexes: [...instruction.accountKeyIndexes],
        data: Uint8Array.from(instruction.data),
      }));

    const addressTableLookups: MessageAddressTableLookup[] =
      decodedMessage.addressTableLookups.map(lookup => ({
        accountKey: new PublicKey(lookup.accountKey),
        writableIndexes: [...lookup.writableIndexes],
        readonlyIndexes: [...lookup.readonlyIndexes],
      }));

    return new MessageV0({
      header,
      staticAccountKeys,
      recentBlockhash,
      compiledInstructions,
      addressTableLookups,
    });
  }
}
