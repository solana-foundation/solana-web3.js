import {
    TransactionMessage,
    getU32Decoder,
    getU64Decoder,
    Instruction,
    MicroLamports,
    ReadonlyUint8Array,
} from '../../kit-shims/index';
import {
    COMPUTE_BUDGET_PROGRAM_ADDRESS,
    ComputeBudgetInstruction,
    identifyComputeBudgetInstruction,
    SetComputeUnitLimitInstruction,
    SetComputeUnitPriceInstruction,
} from './generated';

/**
 * Finds the index of the first `SetComputeUnitLimit` instruction in a transaction message
 * and its set limit, if any.
 */
export function findSetComputeUnitLimitInstructionIndexAndUnits(
    transactionMessage: TransactionMessage,
): { index: number; units: number } | null {
    const index = transactionMessage.instructions.findIndex(isSetComputeUnitLimitInstruction);
    if (index < 0) {
        return null;
    }

    const units = getU32Decoder().decode(transactionMessage.instructions[index].data as ReadonlyUint8Array, 1);

    return { index, units };
}

/**
 * Checks if the given instruction is a `SetComputeUnitLimit` instruction.
 */
function isSetComputeUnitLimitInstruction(instruction: Instruction): instruction is SetComputeUnitLimitInstruction {
    return (
        instruction.programAddress === COMPUTE_BUDGET_PROGRAM_ADDRESS &&
        identifyComputeBudgetInstruction(instruction.data as Uint8Array) ===
            ComputeBudgetInstruction.SetComputeUnitLimit
    );
}

/**
 * Finds the index of the first `SetComputeUnitPrice` instruction in a transaction message
 * and its set micro-lamports, if any.
 */
export function findSetComputeUnitPriceInstructionIndexAndMicroLamports(
    transactionMessage: TransactionMessage,
): { index: number; microLamports: MicroLamports } | null {
    const index = transactionMessage.instructions.findIndex(isSetComputeUnitPriceInstruction);
    if (index < 0) {
        return null;
    }

    const microLamports = getU64Decoder().decode(
        transactionMessage.instructions[index].data as ReadonlyUint8Array,
        1,
    ) as MicroLamports;

    return { index, microLamports };
}

/**
 * Checks if the given instruction is a `SetComputeUnitPrice` instruction.
 */
function isSetComputeUnitPriceInstruction(instruction: Instruction): instruction is SetComputeUnitPriceInstruction {
    return (
        instruction.programAddress === COMPUTE_BUDGET_PROGRAM_ADDRESS &&
        identifyComputeBudgetInstruction(instruction.data as Uint8Array) ===
            ComputeBudgetInstruction.SetComputeUnitPrice
    );
}
