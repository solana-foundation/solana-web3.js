import {
  getAddMemoInstruction,
  MEMO_PROGRAM_ADDRESS,
  type AddMemoInput,
} from '@solana-program/memo';

import {Address} from '../address';
import {fromKitInstruction} from '../kit-adapters/instruction';
import {TransactionInstruction} from '../transaction';

/** Public key that identifies the Memo program. */
export const MEMO_PROGRAM_ID = new Address(MEMO_PROGRAM_ADDRESS);

/** Parameters for creating a Memo instruction. */
export type AddMemoParams = AddMemoInput;

/**
 * Factory class for transaction instructions to interact with the Memo program.
 */
export class MemoProgram {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the Memo program.
   */
  static programId: Address = MEMO_PROGRAM_ID;

  /**
   * Creates an instruction that adds a UTF-8 memo to a transaction.
   */
  static addMemo(params: AddMemoParams): TransactionInstruction {
    return fromKitInstruction(getAddMemoInstruction(params));
  }
}
