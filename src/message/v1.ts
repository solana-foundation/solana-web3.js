import {
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  isV1ConfigEmpty,
  TRANSACTION_CONFIG_COMPUTE_UNIT_LIMIT_BIT_MASK,
  TRANSACTION_CONFIG_HEAP_SIZE_BIT_MASK,
  TRANSACTION_CONFIG_LOADED_ACCOUNTS_DATA_SIZE_LIMIT_BIT_MASK,
  TRANSACTION_CONFIG_PRIORITY_FEE_LAMPORTS_BIT_MASK,
  transactionConfigMaskHasComputeUnitLimit,
  transactionConfigMaskHasHeapSize,
  transactionConfigMaskHasLoadedAccountsDataSizeLimit,
  transactionConfigMaskHasPriorityFee,
  type Address as KitAddress,
  type Blockhash,
  type CompiledTransactionMessageWithLifetime,
  type V1CompiledTransactionMessage,
  type V1TransactionConfig,
} from '@solana/kit';

import {MessageHeader, MessageCompiledInstruction} from './index';
import {Address} from '../address';
import {toLegacyInstructionFields} from '../kit-adapters/instruction-fields';
import {isKitInstruction} from '../kit-adapters/instruction-guard';
import {
  expandInstructionPlans,
  type InstructionInput,
} from '../kit-adapters/instruction-plan';
import {toPackedUint8Array, toUint8ArrayView} from '../utils/typed-array';
import {CompiledKeys} from './compiled-keys';
import {MessageAccountKeys} from './account-keys';

const MESSAGE_ENCODER = getCompiledTransactionMessageEncoder();
const MESSAGE_DECODER = getCompiledTransactionMessageDecoder();

type V1Compiled = V1CompiledTransactionMessage &
  CompiledTransactionMessageWithLifetime;

/** A single config value as encoded in a compiled v1 message. */
type CompiledTransactionConfigValue =
  V1CompiledTransactionMessage['configValues'][number];

export type {V1TransactionConfig};

function getTransactionConfigMask(config: V1TransactionConfig): number {
  let mask = 0;
  if (config.priorityFeeLamports !== undefined) {
    mask |= TRANSACTION_CONFIG_PRIORITY_FEE_LAMPORTS_BIT_MASK;
  }
  if (config.computeUnitLimit !== undefined) {
    mask |= TRANSACTION_CONFIG_COMPUTE_UNIT_LIMIT_BIT_MASK;
  }
  if (config.loadedAccountsDataSizeLimit !== undefined) {
    mask |= TRANSACTION_CONFIG_LOADED_ACCOUNTS_DATA_SIZE_LIMIT_BIT_MASK;
  }
  if (config.heapSize !== undefined) {
    mask |= TRANSACTION_CONFIG_HEAP_SIZE_BIT_MASK;
  }
  return mask;
}

/**
 * Returns the config values in canonical encoding order: priority fee,
 * compute unit limit, loaded accounts data size limit, heap size.
 */
function getTransactionConfigValues(
  config: V1TransactionConfig,
): CompiledTransactionConfigValue[] {
  const values: CompiledTransactionConfigValue[] = [];
  if (config.priorityFeeLamports !== undefined) {
    values.push({kind: 'u64', value: BigInt(config.priorityFeeLamports)});
  }
  if (config.computeUnitLimit !== undefined) {
    values.push({kind: 'u32', value: config.computeUnitLimit});
  }
  if (config.loadedAccountsDataSizeLimit !== undefined) {
    values.push({kind: 'u32', value: config.loadedAccountsDataSizeLimit});
  }
  if (config.heapSize !== undefined) {
    values.push({kind: 'u32', value: config.heapSize});
  }
  return values;
}

function decompileTransactionConfig(
  configMask: number,
  configValues: readonly CompiledTransactionConfigValue[],
): V1TransactionConfig {
  const supportedConfigs: Array<
    [keyof V1TransactionConfig, 'u32' | 'u64', (mask: number) => boolean]
  > = [
    ['priorityFeeLamports', 'u64', transactionConfigMaskHasPriorityFee],
    ['computeUnitLimit', 'u32', transactionConfigMaskHasComputeUnitLimit],
    [
      'loadedAccountsDataSizeLimit',
      'u32',
      transactionConfigMaskHasLoadedAccountsDataSizeLimit,
    ],
    ['heapSize', 'u32', transactionConfigMaskHasHeapSize],
  ];

  const config: V1TransactionConfig = {};
  let index = 0;
  for (const [name, kind, predicate] of supportedConfigs) {
    if (!predicate(configMask)) {
      continue;
    }
    const configValue = configValues[index++];
    if (configValue.kind !== kind) {
      throw new Error(
        `Invalid transaction config value kind for ${name}: expected ${kind} but found ${configValue.kind}`,
      );
    }
    (config[name] as CompiledTransactionConfigValue['value']) =
      configValue.value;
  }
  return config;
}

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
  transactionConfig?: V1TransactionConfig;
};

export type CompileV1Args = {
  payerKey: Address;
  instructions: Array<InstructionInput>;
  recentBlockhash: Blockhash;
  transactionConfig?: V1TransactionConfig;
};

/**
 * A v1 transaction message (SIMD-0385).
 *
 * Compared to v0, a v1 message:
 * - carries resource limits and prioritization in a message-level
 *   {@link V1TransactionConfig} instead of Compute Budget program instructions
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
  transactionConfig?: V1TransactionConfig;

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

  getAccountKeys(): MessageAccountKeys {
    return new MessageAccountKeys(this.staticAccountKeys);
  }

  isAccountSigner(index: number): boolean {
    return index < this.header.numRequiredSignatures;
  }

  isAccountWritable(index: number): boolean {
    const numSigners = this.header.numRequiredSignatures;
    const numWritableSignedAccounts =
      numSigners - this.header.numReadonlySignedAccounts;
    const numWritableUnsignedAccounts =
      this.staticAccountKeys.length -
      numSigners -
      this.header.numReadonlyUnsignedAccounts;
    return (
      index < numWritableSignedAccounts ||
      (index >= numSigners && index < numSigners + numWritableUnsignedAccounts)
    );
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
    const decompiledConfig = decompileTransactionConfig(
      decoded.configMask,
      decoded.configValues,
    );
    const transactionConfig = isV1ConfigEmpty(decompiledConfig)
      ? undefined
      : decompiledConfig;
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
    const decoded = MESSAGE_DECODER.decode(toUint8ArrayView(serializedMessage));
    if (decoded.version !== 1) {
      throw new Error(
        decoded.version === 'legacy'
          ? 'Expected versioned message but received legacy message'
          : `Expected versioned message with version 1 but found version ${decoded.version}`,
      );
    }
    return MessageV1.fromCompiledMessage(decoded);
  }
}
