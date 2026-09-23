import {
    flattenInstructionPlan,
    type Instruction as KitInstruction,
    type InstructionPlan,
    isInstructionPlan,
    isSingleInstructionPlan,
} from '@solana/kit';

import type { TransactionInstruction } from '../transaction/legacy';

/**
 * The canonical input shape accepted by message- and transaction-message-level
 * compilers.
 */
export type InstructionInput = TransactionInstruction | KitInstruction | InstructionPlan;

/**
 * Flatten any `InstructionPlan` items in `items` into their underlying
 * `Instruction`s, leaving non-plan items untouched. `MessagePackerInstructionPlan`
 * leaves are rejected — they are designed to span multiple transactions and
 * cannot be honored inside a single transaction / message.
 */
export function expandInstructionPlans<T>(items: ReadonlyArray<T | InstructionPlan>): Array<T | KitInstruction> {
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
