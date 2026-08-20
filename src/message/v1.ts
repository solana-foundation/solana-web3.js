import bs58 from 'bs58';

import {Blockhash} from '../blockhash';
import {
  MessageHeader,
  MessageAddressTableLookup,
  MessageCompiledInstruction,
} from './index';
import {PublicKey, PUBLIC_KEY_LENGTH} from '../publickey';
import {MessageAccountKeys} from './account-keys';
import assert from '../utils/assert';
import {VERSION_PREFIX_MASK} from '../transaction/constants';
import {guardedShift, guardedSplice} from '../utils/guarded-array-utils';

const CONFIG_MASK_PRIORITY_FEE_BITS = 0b00011;
const CONFIG_MASK_COMPUTE_UNIT_LIMIT_BIT = 0b00100;
const CONFIG_MASK_LOADED_ACCOUNTS_DATA_SIZE_LIMIT_BIT = 0b01000;
const CONFIG_MASK_HEAP_SIZE_BIT = 0b10000;
const CONFIG_MASK_KNOWN_BITS =
  CONFIG_MASK_PRIORITY_FEE_BITS |
  CONFIG_MASK_COMPUTE_UNIT_LIMIT_BIT |
  CONFIG_MASK_LOADED_ACCOUNTS_DATA_SIZE_LIMIT_BIT |
  CONFIG_MASK_HEAP_SIZE_BIT;

function decodeU32(byteArray: Array<number>): number {
  const bytes = guardedSplice(byteArray, 0, 4);
  return bytes[0] + bytes[1] * 2 ** 8 + bytes[2] * 2 ** 16 + bytes[3] * 2 ** 24;
}

function decodeU64(byteArray: Array<number>): number {
  const bytes = guardedSplice(byteArray, 0, 8);
  let value = BigInt(0);
  for (let i = bytes.length - 1; i >= 0; i--) {
    value = (value << BigInt(8)) | BigInt(bytes[i]);
  }
  return Number(value);
}

/**
 * The transaction config of a v1 transaction message, which expresses the
 * compute budget directly in the message instead of through ComputeBudget
 * program instructions. Fields the transaction did not set are `null`.
 */
export type TransactionConfig = {
  /** The maximum number of compute units this transaction may consume */
  computeUnitLimit: number | null;
  /** The transaction-wide heap size in bytes */
  heapSize: number | null;
  /** The maximum number of account data bytes this transaction may load */
  loadedAccountsDataSizeLimit: number | null;
  /** The total priority fee in lamports. */
  priorityFee: number | null;
};

/**
 * Message constructor arguments
 */
export type MessageV1Args = {
  /** The message header, identifying signed and read-only `accountKeys` */
  header: MessageHeader;
  /** The static account keys used by this transaction */
  staticAccountKeys: PublicKey[];
  /** The hash of a recent ledger block */
  recentBlockhash: Blockhash;
  /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
  compiledInstructions: MessageCompiledInstruction[];
  /** The compute budget configuration of this transaction */
  transactionConfig?: TransactionConfig | null;
};

export class MessageV1 {
  header: MessageHeader;
  staticAccountKeys: Array<PublicKey>;
  recentBlockhash: Blockhash;
  compiledInstructions: Array<MessageCompiledInstruction>;
  transactionConfig: TransactionConfig | null;

  constructor(args: MessageV1Args) {
    this.header = args.header;
    this.staticAccountKeys = args.staticAccountKeys;
    this.recentBlockhash = args.recentBlockhash;
    this.compiledInstructions = args.compiledInstructions;
    this.transactionConfig = args.transactionConfig ?? null;
  }

  get version(): 1 {
    return 1;
  }

  get addressTableLookups(): Array<MessageAddressTableLookup> {
    return [];
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

  serialize(): Uint8Array {
    throw new Error(
      'Serialization of version 1 transaction messages is not supported',
    );
  }

  static deserialize(serializedMessage: Uint8Array): MessageV1 {
    let byteArray = [...serializedMessage];

    const prefix = guardedShift(byteArray);
    const maskedPrefix = prefix & VERSION_PREFIX_MASK;
    assert(
      prefix !== maskedPrefix,
      `Expected versioned message but received legacy message`,
    );

    const version = maskedPrefix;
    assert(
      version === 1,
      `Expected versioned message with version 1 but found version ${version}`,
    );

    const header: MessageHeader = {
      numRequiredSignatures: guardedShift(byteArray),
      numReadonlySignedAccounts: guardedShift(byteArray),
      numReadonlyUnsignedAccounts: guardedShift(byteArray),
    };

    const configMask = decodeU32(byteArray);
    assert(
      (configMask & ~CONFIG_MASK_KNOWN_BITS) === 0,
      'Unexpected bits set in the transaction config mask',
    );
    const priorityFeeBits = configMask & CONFIG_MASK_PRIORITY_FEE_BITS;
    assert(
      priorityFeeBits === 0 ||
        priorityFeeBits === CONFIG_MASK_PRIORITY_FEE_BITS,
      'Expected both or neither of the priority fee bits to be set in the transaction config mask',
    );

    const recentBlockhash = bs58.encode(
      guardedSplice(byteArray, 0, PUBLIC_KEY_LENGTH),
    );

    const instructionCount = guardedShift(byteArray);
    const staticAccountKeysLength = guardedShift(byteArray);
    const staticAccountKeys = [];
    for (let i = 0; i < staticAccountKeysLength; i++) {
      staticAccountKeys.push(
        new PublicKey(guardedSplice(byteArray, 0, PUBLIC_KEY_LENGTH)),
      );
    }

    const transactionConfig: TransactionConfig = {
      computeUnitLimit: null,
      heapSize: null,
      loadedAccountsDataSizeLimit: null,
      priorityFee: null,
    };
    if (priorityFeeBits !== 0) {
      transactionConfig.priorityFee = decodeU64(byteArray);
    }
    if (configMask & CONFIG_MASK_COMPUTE_UNIT_LIMIT_BIT) {
      transactionConfig.computeUnitLimit = decodeU32(byteArray);
    }
    if (configMask & CONFIG_MASK_LOADED_ACCOUNTS_DATA_SIZE_LIMIT_BIT) {
      transactionConfig.loadedAccountsDataSizeLimit = decodeU32(byteArray);
    }
    if (configMask & CONFIG_MASK_HEAP_SIZE_BIT) {
      transactionConfig.heapSize = decodeU32(byteArray);
    }

    const instructionHeaders = [];
    for (let i = 0; i < instructionCount; i++) {
      const programIdIndex = guardedShift(byteArray);
      const accountKeyIndexesLength = guardedShift(byteArray);
      const dataLength =
        guardedShift(byteArray) + guardedShift(byteArray) * 256;
      instructionHeaders.push({
        accountKeyIndexesLength,
        dataLength,
        programIdIndex,
      });
    }

    const compiledInstructions: MessageCompiledInstruction[] = [];
    for (const instructionHeader of instructionHeaders) {
      compiledInstructions.push({
        programIdIndex: instructionHeader.programIdIndex,
        accountKeyIndexes: guardedSplice(
          byteArray,
          0,
          instructionHeader.accountKeyIndexesLength,
        ),
        data: new Uint8Array(
          guardedSplice(byteArray, 0, instructionHeader.dataLength),
        ),
      });
    }

    assert(
      byteArray.length === 0,
      'Expected no bytes to remain after deserializing a version 1 message',
    );

    return new MessageV1({
      header,
      staticAccountKeys,
      recentBlockhash,
      compiledInstructions,
      transactionConfig,
    });
  }
}
