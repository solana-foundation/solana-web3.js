import {
  getBase58Decoder,
  getBase58Encoder,
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  type CompiledTransactionMessage,
  type CompiledTransactionMessageWithLifetime,
} from '@solana/kit';

import type {Blockhash} from '../blockhash';
import {asKitBlockhash} from '../kit-adapters/brand';
import {PublicKey} from '../publickey';
import {
  MessageHeader,
  MessageAddressTableLookup,
  MessageCompiledInstruction,
} from './index';
import {toLegacyInstructionFields} from '../kit-adapters/instruction-fields';
import {isKitInstruction} from '../kit-adapters/instruction-guard';
import {
  expandInstructionPlans,
  type InstructionInput,
} from '../kit-adapters/instruction-plan';
import {CompiledKeys} from './compiled-keys';
import {MessageAccountKeys} from './account-keys';
import {toPackedUint8Array, toUint8ArrayView} from '../utils/typed-array';

const BASE58_ENCODER = getBase58Encoder();
const BASE58_DECODER = getBase58Decoder();
const MESSAGE_ENCODER = getCompiledTransactionMessageEncoder();
const MESSAGE_DECODER = getCompiledTransactionMessageDecoder();

type LegacyCompiled = Extract<CompiledTransactionMessage, {version: 'legacy'}> &
  CompiledTransactionMessageWithLifetime;

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
  accountKeys: string[] | PublicKey[];
  /** The hash of a recent ledger block */
  recentBlockhash: Blockhash;
  /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
  instructions: CompiledInstruction[];
};

export type CompileLegacyArgs = {
  payerKey: PublicKey;
  instructions: Array<InstructionInput>;
  recentBlockhash: Blockhash;
};

/**
 * List of instructions to be processed atomically
 */
export class Message {
  header: MessageHeader;
  accountKeys: PublicKey[];
  recentBlockhash: Blockhash;
  instructions: CompiledInstruction[];

  private indexToProgramIds: Map<number, PublicKey> = new Map<
    number,
    PublicKey
  >();

  constructor(args: MessageArgs) {
    this.header = args.header;
    this.accountKeys = args.accountKeys.map(account => new PublicKey(account));
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

  get staticAccountKeys(): Array<PublicKey> {
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
    const instructions = expandInstructionPlans(args.instructions).map(
      instruction =>
        isKitInstruction(instruction)
          ? toLegacyInstructionFields(instruction)
          : instruction,
    );
    const compiledKeys = CompiledKeys.compile(instructions, args.payerKey);
    const [header, staticAccountKeys] = compiledKeys.getMessageComponents();
    const accountKeys = new MessageAccountKeys(staticAccountKeys);
    const compiledInstructions = accountKeys
      .compileInstructions(instructions)
      .map(
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
      instructions: compiledInstructions,
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

  programIds(): PublicKey[] {
    return [...this.indexToProgramIds.values()];
  }

  nonProgramIds(): PublicKey[] {
    return this.accountKeys.filter((_, index) => !this.isProgramId(index));
  }

  serialize(): Uint8Array {
    const encoded = MESSAGE_ENCODER.encode({
      version: 'legacy',
      header: {
        numSignerAccounts: this.header.numRequiredSignatures,
        numReadonlySignerAccounts: this.header.numReadonlySignedAccounts,
        numReadonlyNonSignerAccounts: this.header.numReadonlyUnsignedAccounts,
      },
      staticAccounts: this.accountKeys.map(key => key.toBase58()),
      lifetimeToken: asKitBlockhash(this.recentBlockhash),
      instructions: this.instructions.map(ix => ({
        programAddressIndex: ix.programIdIndex,
        accountIndices: ix.accounts,
        data: Uint8Array.from(BASE58_ENCODER.encode(ix.data)),
      })),
    });
    return toPackedUint8Array(encoded);
  }

  /** @internal Construct a {@link Message} from a kit-decoded compiled message. */
  static fromCompiledMessage(decoded: LegacyCompiled): Message {
    return new Message({
      header: {
        numRequiredSignatures: decoded.header.numSignerAccounts,
        numReadonlySignedAccounts: decoded.header.numReadonlySignerAccounts,
        numReadonlyUnsignedAccounts:
          decoded.header.numReadonlyNonSignerAccounts,
      },
      accountKeys: decoded.staticAccounts.map(addr => new PublicKey(addr)),
      recentBlockhash: decoded.lifetimeToken,
      instructions: decoded.instructions.map(ix => ({
        programIdIndex: ix.programAddressIndex,
        accounts: [...(ix.accountIndices ?? [])],
        data: BASE58_DECODER.decode(ix.data ?? new Uint8Array(0)),
      })),
    });
  }

  /**
   * Decode a compiled message into a Message object.
   */
  static from(buffer: Uint8Array | Array<number>): Message {
    const decoded = MESSAGE_DECODER.decode(toUint8ArrayView(buffer));
    if (decoded.version !== 'legacy') {
      throw new Error(
        'Versioned messages must be deserialized with VersionedMessage.deserialize()',
      );
    }
    return Message.fromCompiledMessage(decoded);
  }
}
