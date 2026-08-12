import {expect} from 'chai';

import {Keypair, MEMO_PROGRAM_ID, MemoProgram} from '../../src';

describe('MemoProgram', () => {
  it('creates a UTF-8 memo instruction with required signers', async () => {
    const signer = await Keypair.generate();
    const instruction = MemoProgram.addMemo({
      memo: 'Hello, Solana! 👋',
      signers: [signer],
    });

    expect(MEMO_PROGRAM_ID).to.eql(MemoProgram.programId);
    expect(instruction.programId).to.eql(MEMO_PROGRAM_ID);
    expect(new TextDecoder().decode(instruction.data)).to.eq(
      'Hello, Solana! 👋',
    );
    expect(instruction.keys).to.eql([
      {pubkey: signer.publicKey, isSigner: true, isWritable: false},
    ]);
  });
});
