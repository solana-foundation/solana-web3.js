import {LoadedAddresses} from '../connection';
import {Address} from '../address';
import type {TransactionInstructionCtorFields} from '../transaction/legacy';
import {MessageCompiledInstruction} from './index';

export type AccountKeysFromLookups = LoadedAddresses;

export class MessageAccountKeys {
  staticAccountKeys: Array<Address>;
  accountKeysFromLookups?: AccountKeysFromLookups;

  constructor(
    staticAccountKeys: Array<Address>,
    accountKeysFromLookups?: AccountKeysFromLookups,
  ) {
    this.staticAccountKeys = staticAccountKeys;
    this.accountKeysFromLookups = accountKeysFromLookups;
  }

  keySegments(): Array<Array<Address>> {
    const keySegments = [this.staticAccountKeys];
    if (this.accountKeysFromLookups) {
      keySegments.push(this.accountKeysFromLookups.writable);
      keySegments.push(this.accountKeysFromLookups.readonly);
    }
    return keySegments;
  }

  get(index: number): Address | undefined {
    for (const keySegment of this.keySegments()) {
      if (index < keySegment.length) {
        return keySegment[index];
      } else {
        index -= keySegment.length;
      }
    }
    return;
  }

  get length(): number {
    return this.keySegments().flat().length;
  }

  compileInstructions(
    instructions: Array<Required<TransactionInstructionCtorFields>>,
  ): Array<MessageCompiledInstruction> {
    // Bail early if any account indexes would overflow a u8
    const U8_MAX = 255;
    if (this.length > U8_MAX + 1) {
      throw new Error('Account index overflow encountered during compilation');
    }

    const keyIndexMap = new Map();
    this.keySegments()
      .flat()
      .forEach((key, index) => {
        keyIndexMap.set(key.toBase58(), index);
      });

    const findKeyIndex = (key: Address) => {
      const keyIndex = keyIndexMap.get(key.toBase58());
      if (keyIndex === undefined)
        throw new Error(
          'Encountered an unknown instruction account key during compilation',
        );
      return keyIndex;
    };

    return instructions.map((instruction): MessageCompiledInstruction => {
      return {
        programIdIndex: findKeyIndex(instruction.programId),
        accountKeyIndexes: instruction.keys.map(meta =>
          findKeyIndex(meta.pubkey),
        ),
        data: instruction.data,
      };
    });
  }
}
