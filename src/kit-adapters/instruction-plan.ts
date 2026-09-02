import {
  flattenInstructionPlan,
  getSignersFromInstruction,
  type Instruction as KitInstruction,
  type InstructionPlan,
  type InstructionWithSigners,
  isInstructionPlan,
  isMessagePartialSigner,
  isSingleInstructionPlan,
  type MessagePartialSigner,
} from '@solana/kit';

import {isKitInstruction} from './instruction-guard';
import type {TransactionInstruction} from '../transaction/legacy';

/**
 * The canonical input shape accepted by message- and transaction-message-level
 * compilers.
 */
export type InstructionInput =
  | TransactionInstruction
  | KitInstruction
  | InstructionPlan;

/**
 * Flatten any `InstructionPlan` items in `items` into their underlying
 * `Instruction`s, leaving non-plan items untouched. `MessagePackerInstructionPlan`
 * leaves are rejected — they are designed to span multiple transactions and
 * cannot be honored inside a single transaction / message.
 */
export function expandInstructionPlans<T>(
  items: ReadonlyArray<T | InstructionPlan>,
): Array<T | KitInstruction> {
  const out: Array<T | KitInstruction> = [];
  for (const item of items) {
    if (isInstructionPlan(item)) {
      for (const leaf of flattenInstructionPlan(item)) {
        if (!isSingleInstructionPlan(leaf)) {
          throw new Error(
            `Unsupported InstructionPlan leaf kind "${leaf.kind}". ` +
              `This plan type cannot be honored inside a single transaction.`,
          );
        }
        out.push(leaf.instruction);
      }
    } else {
      out.push(item);
    }
  }
  return out;
}

/**
 * Collects the message-capable signers embedded in kit `Instruction`s and
 * `InstructionPlan`s, deduplicated by address. Legacy
 * `TransactionInstruction`s carry no signer objects and contribute nothing.
 */
export function getSignersFromInstructions(
  instructions: ReadonlyArray<InstructionInput>,
): Array<MessagePartialSigner> {
  const signers = new Map<string, MessagePartialSigner>();
  for (const instruction of expandInstructionPlans(instructions)) {
    if (!isKitInstruction(instruction)) {
      continue;
    }
    for (const signer of getSignersFromInstruction(
      instruction as InstructionWithSigners,
    )) {
      if (isMessagePartialSigner(signer) && !signers.has(signer.address)) {
        signers.set(signer.address, signer);
      }
    }
  }
  return [...signers.values()];
}
