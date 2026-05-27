import {
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  type Address as KitAddress,
  type Blockhash,
  type CompiledTransactionMessage,
  type CompiledTransactionMessageWithLifetime,
  type Instruction as KitInstruction,
  type InstructionPlan,
} from '@solana/kit';

import {
  MessageHeader,
  MessageAddressTableLookup,
  MessageCompiledInstruction,
} from './index';
import {Address} from '../address';
import {toLegacyInstructionFields} from '../kit-adapters/instruction-fields';
import {isKitInstruction} from '../kit-adapters/instruction-guard';
import {expandInstructionPlans} from '../kit-adapters/instruction-plan';
import {toPackedUint8Array, toUint8ArrayView} from '../utils/typed-array';
import {VERSION_PREFIX_MASK} from '../transaction/constants';
import type {TransactionInstruction} from '../transaction/legacy';
import {AddressLookupTableAccount} from '../programs';
import {CompiledKeys} from './compiled-keys';
import {AccountKeysFromLookups, MessageAccountKeys} from './account-keys';

const MESSAGE_ENCODER = getCompiledTransactionMessageEncoder();
const MESSAGE_DECODER = getCompiledTransactionMessageDecoder();

type V0Compiled = Extract<CompiledTransactionMessage, {version: 0}> &
  CompiledTransactionMessageWithLifetime;

/**
 * Message constructor arguments
 */
export type MessageV0Args = {
  /** The message header, identifying signed and read-only `accountKeys` */
  header: MessageHeader;
  /** The static account keys used by this transaction */
  staticAccountKeys: Address[];
  /** The hash of a recent ledger block */
  recentBlockhash: Blockhash;
  /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
  compiledInstructions: MessageCompiledInstruction[];
  /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
  addressTableLookups: MessageAddressTableLookup[];
};

export type CompileV0Args = {
  payerKey: Address;
  instructions: Array<
    TransactionInstruction | KitInstruction | InstructionPlan
  >;
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
  staticAccountKeys: Array<Address>;
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
    const instructions = expandInstructionPlans(args.instructions).map(
      instruction =>
        isKitInstruction(instruction)
          ? toLegacyInstructionFields(instruction)
          : instruction,
    );
    const compiledKeys = CompiledKeys.compile(instructions, args.payerKey);

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
    const compiledInstructions = accountKeys.compileInstructions(instructions);
    return new MessageV0({
      header,
      staticAccountKeys,
      recentBlockhash: args.recentBlockhash,
      compiledInstructions,
      addressTableLookups,
    });
  }

  serialize(): Uint8Array {
    const encoded = MESSAGE_ENCODER.encode({
      version: 0,
      header: {
        numSignerAccounts: this.header.numRequiredSignatures,
        numReadonlySignerAccounts: this.header.numReadonlySignedAccounts,
        numReadonlyNonSignerAccounts: this.header.numReadonlyUnsignedAccounts,
      },
      staticAccounts: this.staticAccountKeys.map(
        key => key.toBase58() as KitAddress,
      ),
      lifetimeToken: this.recentBlockhash,
      instructions: this.compiledInstructions.map(ix => ({
        programAddressIndex: ix.programIdIndex,
        accountIndices: ix.accountKeyIndexes,
        data: ix.data,
      })),
      addressTableLookups: this.addressTableLookups.map(lookup => ({
        lookupTableAddress: lookup.accountKey.toBase58() as KitAddress,
        writableIndexes: lookup.writableIndexes,
        readonlyIndexes: lookup.readonlyIndexes,
      })),
    });
    return toPackedUint8Array(encoded);
  }

  /** @internal Construct a {@link MessageV0} from a kit-decoded compiled message. */
  static fromCompiledMessage(decoded: V0Compiled): MessageV0 {
    return new MessageV0({
      header: {
        numRequiredSignatures: decoded.header.numSignerAccounts,
        numReadonlySignedAccounts: decoded.header.numReadonlySignerAccounts,
        numReadonlyUnsignedAccounts:
          decoded.header.numReadonlyNonSignerAccounts,
      },
      staticAccountKeys: decoded.staticAccounts.map(addr => new Address(addr)),
      recentBlockhash: decoded.lifetimeToken as Blockhash,
      compiledInstructions: decoded.instructions.map(ix => ({
        programIdIndex: ix.programAddressIndex,
        accountKeyIndexes: [...(ix.accountIndices ?? [])],
        data: ix.data ? Uint8Array.from(ix.data) : new Uint8Array(0),
      })),
      addressTableLookups: (decoded.addressTableLookups ?? []).map(lookup => ({
        accountKey: new Address(lookup.lookupTableAddress),
        writableIndexes: [...lookup.writableIndexes],
        readonlyIndexes: [...lookup.readonlyIndexes],
      })),
    });
  }

  static deserialize(serializedMessage: Uint8Array): MessageV0 {
    const prefix = serializedMessage[0];
    const maskedPrefix = prefix & VERSION_PREFIX_MASK;
    if (prefix === maskedPrefix) {
      throw new Error('Expected versioned message but received legacy message');
    }
    if (maskedPrefix !== 0) {
      throw new Error(
        `Expected versioned message with version 0 but found version ${maskedPrefix}`,
      );
    }
    const decoded = MESSAGE_DECODER.decode(toUint8ArrayView(serializedMessage));
    if (decoded.version !== 0) {
      throw new Error(
        `Expected versioned message with version 0 but found version ${decoded.version}`,
      );
    }
    return MessageV0.fromCompiledMessage(decoded);
  }
}
