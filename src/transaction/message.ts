import type {Blockhash} from '@solana/kit';

import {fromKitInstruction} from '../kit-adapters/instruction';
import {isKitInstruction} from '../kit-adapters/instruction-guard';
import {
  expandInstructionPlans,
  type InstructionInput,
} from '../kit-adapters/instruction-plan';
import {AccountKeysFromLookups} from '../message/account-keys';
import assert from '../utils/assert';
import {
  Message,
  MessageV0,
  MessageV1,
  type V1TransactionConfig,
  VersionedMessage,
} from '../message';
import {Address} from '../address';
import {AddressLookupTableAccount} from '../programs';
import {type AccountMeta, TransactionInstruction} from './legacy';

export type TransactionMessageArgs = {
  payerKey: Address;
  instructions: Array<InstructionInput>;
  recentBlockhash: Blockhash;
  /**
   * Message-level resource limits and prioritization, used when compiling to
   * a v1 message. Ignored by legacy and v0 compilation.
   */
  transactionConfig?: V1TransactionConfig;
};

export type DecompileArgs =
  | {
      accountKeysFromLookups: AccountKeysFromLookups;
    }
  | {
      addressLookupTableAccounts: AddressLookupTableAccount[];
    };

export class TransactionMessage {
  payerKey: Address;
  instructions: Array<TransactionInstruction>;
  recentBlockhash: Blockhash;
  transactionConfig?: V1TransactionConfig;

  constructor(args: TransactionMessageArgs) {
    this.payerKey = args.payerKey;
    this.instructions = expandInstructionPlans(args.instructions).map(
      instruction =>
        isKitInstruction(instruction)
          ? fromKitInstruction(instruction)
          : instruction,
    );
    this.recentBlockhash = args.recentBlockhash;
    this.transactionConfig = args.transactionConfig;
  }

  static decompile(
    message: VersionedMessage,
    args?: DecompileArgs,
  ): TransactionMessage {
    const {header, compiledInstructions, recentBlockhash} = message;

    const {
      numRequiredSignatures,
      numReadonlySignedAccounts,
      numReadonlyUnsignedAccounts,
    } = header;

    const numWritableSignedAccounts =
      numRequiredSignatures - numReadonlySignedAccounts;
    assert(numWritableSignedAccounts > 0, 'Message header is invalid');

    const numWritableUnsignedAccounts =
      message.staticAccountKeys.length -
      numRequiredSignatures -
      numReadonlyUnsignedAccounts;
    assert(numWritableUnsignedAccounts >= 0, 'Message header is invalid');

    const accountKeys = message.getAccountKeys(args);
    const payerKey = accountKeys.get(0);
    if (payerKey === undefined) {
      throw new Error(
        'Failed to decompile message because no account keys were found',
      );
    }

    const instructions: TransactionInstruction[] = [];
    for (const compiledIx of compiledInstructions) {
      const keys: AccountMeta[] = [];

      for (const keyIndex of compiledIx.accountKeyIndexes) {
        const pubkey = accountKeys.get(keyIndex);
        if (pubkey === undefined) {
          throw new Error(
            `Failed to find key for account key index ${keyIndex}`,
          );
        }

        const isSigner = keyIndex < numRequiredSignatures;

        let isWritable;
        if (isSigner) {
          isWritable = keyIndex < numWritableSignedAccounts;
        } else if (keyIndex < accountKeys.staticAccountKeys.length) {
          isWritable =
            keyIndex - numRequiredSignatures < numWritableUnsignedAccounts;
        } else {
          isWritable =
            keyIndex - accountKeys.staticAccountKeys.length <
            // accountKeysFromLookups cannot be undefined because we already found a pubkey for this index above
            accountKeys.accountKeysFromLookups!.writable.length;
        }

        keys.push({
          pubkey,
          isSigner: keyIndex < header.numRequiredSignatures,
          isWritable,
        });
      }

      const programId = accountKeys.get(compiledIx.programIdIndex);
      if (programId === undefined) {
        throw new Error(
          `Failed to find program id for program id index ${compiledIx.programIdIndex}`,
        );
      }

      instructions.push(
        new TransactionInstruction({
          programId,
          data: compiledIx.data,
          keys,
        }),
      );
    }

    return new TransactionMessage({
      payerKey,
      instructions,
      recentBlockhash,
      transactionConfig:
        message.version === 1 ? message.transactionConfig : undefined,
    });
  }

  compileToLegacyMessage(): Message {
    return Message.compile({
      payerKey: this.payerKey,
      recentBlockhash: this.recentBlockhash,
      instructions: this.instructions,
    });
  }

  compileToV0Message(
    addressLookupTableAccounts?: AddressLookupTableAccount[],
  ): MessageV0 {
    return MessageV0.compile({
      payerKey: this.payerKey,
      recentBlockhash: this.recentBlockhash,
      instructions: this.instructions,
      addressLookupTableAccounts,
    });
  }

  /**
   * Compile to a v1 message (SIMD-0296).
   *
   * v1 messages do not support address lookup tables. Resource limits and
   * prioritization are set through `transactionConfig` rather than Compute
   * Budget program instructions, which are no-ops in v1 transactions.
   *
   * @param transactionConfig When provided, takes precedence over the
   * `transactionConfig` set on this `TransactionMessage`.
   */
  compileToV1Message(transactionConfig?: V1TransactionConfig): MessageV1 {
    return MessageV1.compile({
      payerKey: this.payerKey,
      recentBlockhash: this.recentBlockhash,
      instructions: this.instructions,
      transactionConfig: transactionConfig ?? this.transactionConfig,
    });
  }
}
