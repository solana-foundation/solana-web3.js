import {Blockhash} from '../blockhash';
import {MessageHeader, MessageCompiledInstruction} from './index';
import {PublicKey} from '../publickey';
import {MessageAccountKeys} from './account-keys';

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
  /** The total priority fee in lamports */
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

  get addressTableLookups(): [] {
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
}
