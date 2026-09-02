import {
  AccountRole,
  generateKeyPairSigner,
  sequentialInstructionPlan,
  singleInstructionPlan,
  type AccountSignerMeta,
  type Instruction as KitInstruction,
  type KeyPairSigner,
} from '@solana/kit';
import {expect} from 'chai';

import {getSignersFromInstructions} from '../../src/kit-adapters/instruction-plan';
import {PublicKey} from '../../src/publickey';
import {TransactionInstruction} from '../../src/transaction';
import {getUniqueAddress} from '../utils/address';

function makeKitIx(signers: ReadonlyArray<KeyPairSigner> = []): KitInstruction {
  return {
    accounts: signers.map(
      (signer): AccountSignerMeta => ({
        address: signer.address,
        role: AccountRole.READONLY_SIGNER,
        signer,
      }),
    ),
    data: new Uint8Array([0]),
    programAddress: getUniqueAddress().toBase58(),
  };
}

describe('getSignersFromInstructions', () => {
  it('collects signers embedded in kit instructions', async () => {
    const signerA = await generateKeyPairSigner();
    const signerB = await generateKeyPairSigner();

    const signers = getSignersFromInstructions([
      makeKitIx([signerA]),
      makeKitIx([signerB]),
    ]);

    expect(signers.map(s => s.address)).to.have.members([
      signerA.address,
      signerB.address,
    ]);
  });

  it('collects signers from instruction plans', async () => {
    const signerA = await generateKeyPairSigner();
    const signerB = await generateKeyPairSigner();

    const signers = getSignersFromInstructions([
      sequentialInstructionPlan([
        makeKitIx([signerA]),
        singleInstructionPlan(makeKitIx([signerB])),
      ]),
    ]);

    expect(signers.map(s => s.address)).to.have.members([
      signerA.address,
      signerB.address,
    ]);
  });

  it('deduplicates signers by address', async () => {
    const signer = await generateKeyPairSigner();

    const signers = getSignersFromInstructions([
      makeKitIx([signer]),
      makeKitIx([signer]),
    ]);

    expect(signers).to.have.length(1);
    expect(signers[0].address).to.eq(signer.address);
  });

  it('ignores legacy instructions and kit instructions without signers', () => {
    const legacyIx = new TransactionInstruction({
      keys: [
        {
          isSigner: true,
          isWritable: false,
          pubkey: new PublicKey(getUniqueAddress().toBase58()),
        },
      ],
      programId: getUniqueAddress(),
      data: Buffer.from([1]),
    });

    expect(getSignersFromInstructions([legacyIx, makeKitIx()])).to.eql([]);
  });
});
