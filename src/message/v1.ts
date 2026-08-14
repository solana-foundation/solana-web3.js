import {
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  type Address as KitAddress,
  type Blockhash,
  type CompiledTransactionMessageWithLifetime,
  type V1CompiledTransactionMessage,
} from '@solana/kit';

import {
  MessageHeader,
  MessageAddressTableLookup,
  MessageCompiledInstruction,
} from './index';
import {Address} from '../address';
import {toLegacyInstructionFields} from '../kit-adapters/instruction-fields';
import {isKitInstruction} from '../kit-adapters/instruction-guard';
import {
  expandInstructionPlans,
  type InstructionInput,
} from '../kit-adapters/instruction-plan';
import {toPackedUint8Array, toUint8ArrayView} from '../utils/typed-array';
import {VERSION_PREFIX_MASK} from '../transaction/constants';
import {CompiledKeys} from './compiled-keys';
import {MessageAccountKeys} from './account-keys';
import {
  decompileTransactionConfig,
  getTransactionConfigMask,
  getTransactionConfigValues,
  type TransactionConfig,
} from './transaction-config';

const MESSAGE_ENCODER = getCompiledTransactionMessageEncoder();
const MESSAGE_DECODER = getCompiledTransactionMessageDecoder();

type V1Compiled = V1CompiledTransactionMessage &
  CompiledTransactionMessageWithLifetime;

/**
 * Message constructor arguments
 */
export type MessageV1Args = {
  /** The message header, identifying signed and read-only `accountKeys` */
  header: MessageHeader;
  /** The static account keys used by this transaction */
  staticAccountKeys: Address[];
  /** The hash of a recent ledger block */
  recentBlockhash: Blockhash;
  /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
  compiledInstructions: MessageCompiledInstruction[];
  /** Message-level resource limits and prioritization for this transaction */
  transactionConfig?: TransactionConfig;
};

export type CompileV1Args = {
  payerKey: Address;
  instructions: Array<InstructionInput>;
  recentBlockhash: Blockhash;
  transactionConfig?: TransactionConfig;
};

/**
 * A v1 transaction message (SIMD-0296).
 *
 * Compared to v0, a v1 message:
 * - carries resource limits and prioritization in a message-level
 *   {@link TransactionConfig} instead of Compute Budget program instructions
 *   (which are no-ops inside a v1 transaction),
 * - does not support address lookup tables,
 * - may be up to 4096 bytes when serialized as a transaction (vs. 1232), and
 * - uses a message-first wire envelope when framed as a transaction.
 *
 * Fetching v1 transactions over RPC requires passing
 * `maxSupportedTransactionVersion: 1` to `getTransaction`/`getBlock`.
 */
export class MessageV1 {
  header: MessageHeader;
  staticAccountKeys: Array<Address>;
  recentBlockhash: Blockhash;
  compiledInstructions: Array<MessageCompiledInstruction>;
  /** Message-level resource limits and prioritization; `undefined` when no config values are set */
  transactionConfig?: TransactionConfig;

  constructor(args: MessageV1Args) {
    this.header = args.header;
    this.staticAccountKeys = args.staticAccountKeys;
    this.recentBlockhash = args.recentBlockhash;
    this.compiledInstructions = args.compiledInstructions;
    this.transactionConfig = args.transactionConfig;
  }

  get version(): 1 {
    return 1;
  }

  /** v1 messages do not support address lookup tables */
  get addressTableLookups(): Array<MessageAddressTableLookup> {
    return [];
  }

  get numAccountKeysFromLookups(): number {
    return 0;
  }

  getAccountKeys(): MessageAccountKeys {
    return new MessageAccountKeys(this.staticAccountKeys);
  }

  isAccountSigner(index: number): boolean {
    return index < this.header.numRequiredSignatures;
  }

  isAccountWritable(index: number): boolean {
    const numSignedAccounts = this.header.numRequiredSignatures;
    const numStaticAccountKeys = this.staticAccountKeys.length;
    if (index >= numStaticAccountKeys) {
      return false;
    } else if (index >= numSignedAccounts) {
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

  static compile(args: CompileV1Args): MessageV1 {
    const instructions = expandInstructionPlans(args.instructions).map(
      instruction =>
        isKitInstruction(instruction)
          ? toLegacyInstructionFields(instruction)
          : instruction,
    );
    const compiledKeys = CompiledKeys.compile(instructions, args.payerKey);
    const [header, staticAccountKeys] = compiledKeys.getMessageComponents();
    const accountKeys = new MessageAccountKeys(staticAccountKeys);
    const compiledInstructions = accountKeys.compileInstructions(instructions);
    return new MessageV1({
      header,
      staticAccountKeys,
      recentBlockhash: args.recentBlockhash,
      compiledInstructions,
      transactionConfig: args.transactionConfig,
    });
  }

  serialize(): Uint8Array {
    const transactionConfig = this.transactionConfig ?? {};
    const encoded = MESSAGE_ENCODER.encode({
      version: 1,
      configMask: getTransactionConfigMask(transactionConfig),
      configValues: getTransactionConfigValues(transactionConfig),
      header: {
        numSignerAccounts: this.header.numRequiredSignatures,
        numReadonlySignerAccounts: this.header.numReadonlySignedAccounts,
        numReadonlyNonSignerAccounts: this.header.numReadonlyUnsignedAccounts,
      },
      numStaticAccounts: this.staticAccountKeys.length,
      staticAccounts: this.staticAccountKeys.map(
        key => key.toBase58() as KitAddress,
      ),
      lifetimeToken: this.recentBlockhash,
      numInstructions: this.compiledInstructions.length,
      instructionHeaders: this.compiledInstructions.map(ix => ({
        programAccountIndex: ix.programIdIndex,
        numInstructionAccounts: ix.accountKeyIndexes.length,
        numInstructionDataBytes: ix.data.byteLength,
      })),
      instructionPayloads: this.compiledInstructions.map(ix => ({
        instructionAccountIndices: ix.accountKeyIndexes,
        instructionData: ix.data,
      })),
    });
    return toPackedUint8Array(encoded);
  }

  /** @internal Construct a {@link MessageV1} from a kit-decoded compiled message. */
  static fromCompiledMessage(decoded: V1Compiled): MessageV1 {
    const compiledInstructions = decoded.instructionHeaders.map(
      (instructionHeader, i) => {
        const payload = decoded.instructionPayloads[i];
        return {
          programIdIndex: instructionHeader.programAccountIndex,
          accountKeyIndexes: [...(payload.instructionAccountIndices ?? [])],
          data: payload.instructionData
            ? Uint8Array.from(payload.instructionData)
            : new Uint8Array(0),
        };
      },
    );
    const transactionConfig =
      decoded.configMask === 0
        ? undefined
        : decompileTransactionConfig(decoded.configMask, decoded.configValues);
    return new MessageV1({
      header: {
        numRequiredSignatures: decoded.header.numSignerAccounts,
        numReadonlySignedAccounts: decoded.header.numReadonlySignerAccounts,
        numReadonlyUnsignedAccounts:
          decoded.header.numReadonlyNonSignerAccounts,
      },
      staticAccountKeys: decoded.staticAccounts.map(addr => new Address(addr)),
      recentBlockhash: decoded.lifetimeToken as Blockhash,
      compiledInstructions,
      transactionConfig,
    });
  }

  static deserialize(serializedMessage: Uint8Array): MessageV1 {
    const prefix = serializedMessage[0];
    const maskedPrefix = prefix & VERSION_PREFIX_MASK;
    if (prefix === maskedPrefix) {
      throw new Error('Expected versioned message but received legacy message');
    }
    if (maskedPrefix !== 1) {
      throw new Error(
        `Expected versioned message with version 1 but found version ${maskedPrefix}`,
      );
    }
    const decoded = MESSAGE_DECODER.decode(toUint8ArrayView(serializedMessage));
    if (decoded.version !== 1) {
      throw new Error(
        `Expected versioned message with version 1 but found version ${decoded.version}`,
      );
    }
    return MessageV1.fromCompiledMessage(decoded);
  }
}
