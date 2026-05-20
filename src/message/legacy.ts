import {
  fixDecoderSize,
  fixEncoderSize,
  getBlockhashDecoder,
  getBlockhashEncoder,
  getArrayDecoder,
  getArrayEncoder,
  getBase58Decoder,
  getBase58Encoder,
  getBytesDecoder,
  getBytesEncoder,
  getShortU16Decoder,
  getShortU16Encoder,
  getStructDecoder,
  getStructEncoder,
  getU8Decoder,
  getU8Encoder,
  type Blockhash,
} from '@solana/kit';

import {Address, PUBLIC_KEY_LENGTH} from '../address';
import {PACKET_DATA_SIZE, VERSION_PREFIX_MASK} from '../transaction/constants';
import {
  MessageHeader,
  MessageAddressTableLookup,
  MessageCompiledInstruction,
} from './index';
import {TransactionInstruction} from '../transaction';
import {CompiledKeys} from './compiled-keys';
import {MessageAccountKeys} from './account-keys';
import {toPackedUint8Array, toUint8ArrayView} from '../utils/typed-array';

const SHORT_U16_ENCODER = getShortU16Encoder();
const SHORT_U16_DECODER = getShortU16Decoder();
const U8_DECODER = getU8Decoder();
const U8_ENCODER = getU8Encoder();
const BASE58_ENCODER = getBase58Encoder();
const BASE58_DECODER = getBase58Decoder();
const BLOCKHASH_ENCODER = getBlockhashEncoder();
const BLOCKHASH_DECODER = getBlockhashDecoder();
const PUBLIC_KEY_DECODER = fixDecoderSize(getBytesDecoder(), PUBLIC_KEY_LENGTH);
const COMPILED_INSTRUCTION_DECODER = getStructDecoder([
  ['programIdIndex', U8_DECODER],
  ['accounts', getArrayDecoder(U8_DECODER, {size: SHORT_U16_DECODER})],
  ['data', getArrayDecoder(U8_DECODER, {size: SHORT_U16_DECODER})],
]);
const MESSAGE_DECODER = getStructDecoder([
  ['numRequiredSignatures', U8_DECODER],
  ['numReadonlySignedAccounts', U8_DECODER],
  ['numReadonlyUnsignedAccounts', U8_DECODER],
  [
    'accountKeys',
    getArrayDecoder(PUBLIC_KEY_DECODER, {size: SHORT_U16_DECODER}),
  ],
  ['recentBlockhash', PUBLIC_KEY_DECODER],
  [
    'instructions',
    getArrayDecoder(COMPILED_INSTRUCTION_DECODER, {size: SHORT_U16_DECODER}),
  ],
]);

/**
 * An instruction to execute by a program
 *
 * @property {number} programIdIndex
 * @property {number[]} accounts
 * @property {string} data
 */
export type CompiledInstruction = {
  /** Index into the transaction keys array indicating the program account that executes this instruction */
  programIdIndex: number;
  /** Ordered indices into the transaction keys array indicating which accounts to pass to the program */
  accounts: number[];
  /** The program input data encoded as base 58 */
  data: string;
};

/**
 * Message constructor arguments
 */
export type MessageArgs = {
  /** The message header, identifying signed and read-only `accountKeys` */
  header: MessageHeader;
  /** All the account keys used by this transaction */
  accountKeys: string[] | Address[];
  /** The hash of a recent ledger block */
  recentBlockhash: Blockhash;
  /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
  instructions: CompiledInstruction[];
};

export type CompileLegacyArgs = {
  payerKey: Address;
  instructions: Array<TransactionInstruction>;
  recentBlockhash: Blockhash;
};

/**
 * List of instructions to be processed atomically
 */
export class Message {
  header: MessageHeader;
  accountKeys: Address[];
  recentBlockhash: Blockhash;
  instructions: CompiledInstruction[];

  private indexToProgramIds: Map<number, Address> = new Map<number, Address>();

  constructor(args: MessageArgs) {
    this.header = args.header;
    this.accountKeys = args.accountKeys.map(account => new Address(account));
    this.recentBlockhash = args.recentBlockhash;
    this.instructions = args.instructions;
    this.instructions.forEach(ix =>
      this.indexToProgramIds.set(
        ix.programIdIndex,
        this.accountKeys[ix.programIdIndex],
      ),
    );
  }

  get version(): 'legacy' {
    return 'legacy';
  }

  get staticAccountKeys(): Array<Address> {
    return this.accountKeys;
  }

  get compiledInstructions(): Array<MessageCompiledInstruction> {
    return this.instructions.map(
      (ix): MessageCompiledInstruction => ({
        programIdIndex: ix.programIdIndex,
        accountKeyIndexes: ix.accounts,
        data: Uint8Array.from(BASE58_ENCODER.encode(ix.data)),
      }),
    );
  }

  get addressTableLookups(): Array<MessageAddressTableLookup> {
    return [];
  }

  getAccountKeys(): MessageAccountKeys {
    return new MessageAccountKeys(this.staticAccountKeys);
  }

  static compile(args: CompileLegacyArgs): Message {
    const compiledKeys = CompiledKeys.compile(args.instructions, args.payerKey);
    const [header, staticAccountKeys] = compiledKeys.getMessageComponents();
    const accountKeys = new MessageAccountKeys(staticAccountKeys);
    const instructions = accountKeys.compileInstructions(args.instructions).map(
      (ix: MessageCompiledInstruction): CompiledInstruction => ({
        programIdIndex: ix.programIdIndex,
        accounts: ix.accountKeyIndexes,
        data: BASE58_DECODER.decode(ix.data),
      }),
    );
    return new Message({
      header,
      accountKeys: staticAccountKeys,
      recentBlockhash: args.recentBlockhash,
      instructions,
    });
  }

  isAccountSigner(index: number): boolean {
    return index < this.header.numRequiredSignatures;
  }

  isAccountWritable(index: number): boolean {
    const numSignedAccounts = this.header.numRequiredSignatures;
    if (index >= this.header.numRequiredSignatures) {
      const unsignedAccountIndex = index - numSignedAccounts;
      const numUnsignedAccounts = this.accountKeys.length - numSignedAccounts;
      const numWritableUnsignedAccounts =
        numUnsignedAccounts - this.header.numReadonlyUnsignedAccounts;
      return unsignedAccountIndex < numWritableUnsignedAccounts;
    } else {
      const numWritableSignedAccounts =
        numSignedAccounts - this.header.numReadonlySignedAccounts;
      return index < numWritableSignedAccounts;
    }
  }

  isProgramId(index: number): boolean {
    return this.indexToProgramIds.has(index);
  }

  programIds(): Address[] {
    return [...this.indexToProgramIds.values()];
  }

  nonProgramIds(): Address[] {
    return this.accountKeys.filter((_, index) => !this.isProgramId(index));
  }

  serialize(): Uint8Array {
    const numKeys = this.accountKeys.length;
    const keyCount = SHORT_U16_ENCODER.encode(numKeys);

    const instructions = this.instructions.map(instruction => {
      const {accounts, programIdIndex} = instruction;
      const data = Array.from(BASE58_ENCODER.encode(instruction.data));

      return {
        programIdIndex,
        keyIndicesCount: SHORT_U16_ENCODER.encode(accounts.length),
        keyIndices: accounts,
        dataLength: SHORT_U16_ENCODER.encode(data.length),
        data,
      };
    });

    const instructionBuffer = new Uint8Array(PACKET_DATA_SIZE);
    const instructionCount = SHORT_U16_ENCODER.encode(instructions.length);
    instructionBuffer.set(instructionCount, 0);
    let instructionBufferLength = instructionCount.length;

    instructions.forEach(instruction => {
      const instructionLayout = getStructEncoder([
        ['programIdIndex', U8_ENCODER],
        [
          'keyIndicesCount',
          fixEncoderSize(getBytesEncoder(), instruction.keyIndicesCount.length),
        ],
        [
          'keyIndices',
          getArrayEncoder(U8_ENCODER, {size: instruction.keyIndices.length}),
        ],
        [
          'dataLength',
          fixEncoderSize(getBytesEncoder(), instruction.dataLength.length),
        ],
        ['data', getArrayEncoder(U8_ENCODER, {size: instruction.data.length})],
      ]);
      const encodedInstruction = instructionLayout.encode(instruction);
      instructionBuffer.set(encodedInstruction, instructionBufferLength);
      instructionBufferLength += encodedInstruction.length;
    });

    const instructionData = instructionBuffer.subarray(
      0,
      instructionBufferLength,
    );

    const signDataLayout = getStructEncoder([
      ['numRequiredSignatures', fixEncoderSize(getBytesEncoder(), 1)],
      ['numReadonlySignedAccounts', fixEncoderSize(getBytesEncoder(), 1)],
      ['numReadonlyUnsignedAccounts', fixEncoderSize(getBytesEncoder(), 1)],
      ['keyCount', fixEncoderSize(getBytesEncoder(), keyCount.length)],
      [
        'keys',
        getArrayEncoder(fixEncoderSize(getBytesEncoder(), PUBLIC_KEY_LENGTH), {
          size: numKeys,
        }),
      ],
      ['recentBlockhash', fixEncoderSize(getBytesEncoder(), PUBLIC_KEY_LENGTH)],
    ]);

    const transaction = {
      numRequiredSignatures: Uint8Array.from([
        this.header.numRequiredSignatures,
      ]),
      numReadonlySignedAccounts: Uint8Array.from([
        this.header.numReadonlySignedAccounts,
      ]),
      numReadonlyUnsignedAccounts: Uint8Array.from([
        this.header.numReadonlyUnsignedAccounts,
      ]),
      keyCount,
      keys: this.accountKeys.map(key => key.toBytes()),
      recentBlockhash: BLOCKHASH_ENCODER.encode(this.recentBlockhash),
    };

    const signData = new Uint8Array(2048);
    const encodedSignData = signDataLayout.encode(transaction);
    signData.set(encodedSignData, 0);
    const length = encodedSignData.length;
    signData.set(instructionData, length);
    return toPackedUint8Array(
      signData.subarray(0, length + instructionData.length),
    );
  }

  /**
   * Decode a compiled message into a Message object.
   */
  static from(buffer: Uint8Array | Array<number>): Message {
    const decodedMessage = MESSAGE_DECODER.decode(toUint8ArrayView(buffer));

    const numRequiredSignatures = decodedMessage.numRequiredSignatures;
    if (
      numRequiredSignatures !==
      (numRequiredSignatures & VERSION_PREFIX_MASK)
    ) {
      throw new Error(
        'Versioned messages must be deserialized with VersionedMessage.deserialize()',
      );
    }

    const accountKeys = decodedMessage.accountKeys.map(
      account => new Address(account),
    );
    const instructions: CompiledInstruction[] = decodedMessage.instructions.map(
      instruction => ({
        programIdIndex: instruction.programIdIndex,
        accounts: [...instruction.accounts],
        data: BASE58_DECODER.decode(toUint8ArrayView(instruction.data)),
      }),
    );

    const messageArgs = {
      header: {
        numRequiredSignatures,
        numReadonlySignedAccounts: decodedMessage.numReadonlySignedAccounts,
        numReadonlyUnsignedAccounts: decodedMessage.numReadonlyUnsignedAccounts,
      },
      recentBlockhash: BLOCKHASH_DECODER.decode(decodedMessage.recentBlockhash),
      accountKeys,
      instructions,
    };

    return new Message(messageArgs);
  }
}
