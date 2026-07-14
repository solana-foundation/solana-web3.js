import {expect} from 'chai';

import {
  Keypair,
  TransactionInstruction,
  ZkElGamalProofInstruction,
  ZkElGamalProofProgram,
} from '../../src';

describe('ZkElGamalProofProgram', function () {
  it('verifyZeroCiphertext', () => {
    const params = {proofData: new Uint8Array([1, 2, 3, 4, 5])};

    const instruction = ZkElGamalProofProgram.verifyZeroCiphertext(params);
    const decoded =
      ZkElGamalProofInstruction.decodeVerifyZeroCiphertext(instruction);

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyZeroCiphertext',
    );
    expect(Array.from(decoded.proofData ?? [])).to.eql(
      Array.from(params.proofData),
    );
  });

  it('verifyCiphertextCiphertextEquality', () => {
    const params = {proofData: new Uint8Array([1, 2, 3, 4, 5])};

    const instruction =
      ZkElGamalProofProgram.verifyCiphertextCiphertextEquality(params);
    const decoded =
      ZkElGamalProofInstruction.decodeVerifyCiphertextCiphertextEquality(
        instruction,
      );

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyCiphertextCiphertextEquality',
    );
    expect(Array.from(decoded.proofData ?? [])).to.eql(
      Array.from(params.proofData),
    );
  });

  it('verifyCiphertextCommitmentEquality', () => {
    const params = {proofData: new Uint8Array([1, 2, 3, 4, 5])};

    const instruction =
      ZkElGamalProofProgram.verifyCiphertextCommitmentEquality(params);
    const decoded =
      ZkElGamalProofInstruction.decodeVerifyCiphertextCommitmentEquality(
        instruction,
      );

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyCiphertextCommitmentEquality',
    );
    expect(Array.from(decoded.proofData ?? [])).to.eql(
      Array.from(params.proofData),
    );
  });

  it('verifyPubkeyValidity', () => {
    const params = {proofData: new Uint8Array([1, 2, 3, 4, 5])};

    const instruction = ZkElGamalProofProgram.verifyPubkeyValidity(params);
    const decoded =
      ZkElGamalProofInstruction.decodeVerifyPubkeyValidity(instruction);

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyPubkeyValidity',
    );
    expect(Array.from(decoded.proofData ?? [])).to.eql(
      Array.from(params.proofData),
    );
  });

  it('verifyPercentageWithCap', () => {
    const params = {proofData: new Uint8Array([1, 2, 3, 4, 5])};

    const instruction = ZkElGamalProofProgram.verifyPercentageWithCap(params);
    const decoded =
      ZkElGamalProofInstruction.decodeVerifyPercentageWithCap(instruction);

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyPercentageWithCap',
    );
    expect(Array.from(decoded.proofData ?? [])).to.eql(
      Array.from(params.proofData),
    );
  });

  it('verifyBatchedRangeProofU64', () => {
    const params = {proofData: new Uint8Array([1, 2, 3, 4, 5])};

    const instruction =
      ZkElGamalProofProgram.verifyBatchedRangeProofU64(params);
    const decoded =
      ZkElGamalProofInstruction.decodeVerifyBatchedRangeProofU64(instruction);

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyBatchedRangeProofU64',
    );
    expect(Array.from(decoded.proofData ?? [])).to.eql(
      Array.from(params.proofData),
    );
  });

  it('verifyBatchedRangeProofU128', () => {
    const params = {proofData: new Uint8Array([1, 2, 3, 4, 5])};

    const instruction =
      ZkElGamalProofProgram.verifyBatchedRangeProofU128(params);
    const decoded =
      ZkElGamalProofInstruction.decodeVerifyBatchedRangeProofU128(instruction);

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyBatchedRangeProofU128',
    );
    expect(Array.from(decoded.proofData ?? [])).to.eql(
      Array.from(params.proofData),
    );
  });

  it('verifyBatchedRangeProofU256', () => {
    const params = {proofData: new Uint8Array([1, 2, 3, 4, 5])};

    const instruction =
      ZkElGamalProofProgram.verifyBatchedRangeProofU256(params);
    const decoded =
      ZkElGamalProofInstruction.decodeVerifyBatchedRangeProofU256(instruction);

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyBatchedRangeProofU256',
    );
    expect(Array.from(decoded.proofData ?? [])).to.eql(
      Array.from(params.proofData),
    );
  });

  it('verifyGroupedCiphertext2HandlesValidity', () => {
    const params = {proofData: new Uint8Array([1, 2, 3, 4, 5])};

    const instruction =
      ZkElGamalProofProgram.verifyGroupedCiphertext2HandlesValidity(params);
    const decoded =
      ZkElGamalProofInstruction.decodeVerifyGroupedCiphertext2HandlesValidity(
        instruction,
      );

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyGroupedCiphertext2HandlesValidity',
    );
    expect(Array.from(decoded.proofData ?? [])).to.eql(
      Array.from(params.proofData),
    );
  });

  it('verifyBatchedGroupedCiphertext2HandlesValidity', () => {
    const params = {proofData: new Uint8Array([1, 2, 3, 4, 5])};

    const instruction =
      ZkElGamalProofProgram.verifyBatchedGroupedCiphertext2HandlesValidity(
        params,
      );
    const decoded =
      ZkElGamalProofInstruction.decodeVerifyBatchedGroupedCiphertext2HandlesValidity(
        instruction,
      );

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyBatchedGroupedCiphertext2HandlesValidity',
    );
    expect(Array.from(decoded.proofData ?? [])).to.eql(
      Array.from(params.proofData),
    );
  });

  it('verifyGroupedCiphertext3HandlesValidity', () => {
    const params = {proofData: new Uint8Array([1, 2, 3, 4, 5])};

    const instruction =
      ZkElGamalProofProgram.verifyGroupedCiphertext3HandlesValidity(params);
    const decoded =
      ZkElGamalProofInstruction.decodeVerifyGroupedCiphertext3HandlesValidity(
        instruction,
      );

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyGroupedCiphertext3HandlesValidity',
    );
    expect(Array.from(decoded.proofData ?? [])).to.eql(
      Array.from(params.proofData),
    );
  });

  it('verifyBatchedGroupedCiphertext3HandlesValidity', () => {
    const params = {proofData: new Uint8Array([1, 2, 3, 4, 5])};

    const instruction =
      ZkElGamalProofProgram.verifyBatchedGroupedCiphertext3HandlesValidity(
        params,
      );
    const decoded =
      ZkElGamalProofInstruction.decodeVerifyBatchedGroupedCiphertext3HandlesValidity(
        instruction,
      );

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyBatchedGroupedCiphertext3HandlesValidity',
    );
    expect(Array.from(decoded.proofData ?? [])).to.eql(
      Array.from(params.proofData),
    );
  });

  it('verifyPubkeyValidity with proof account and context state', async () => {
    const proofAccount = (await Keypair.generate()).publicKey;
    const contextState = (await Keypair.generate()).publicKey;
    const contextStateAuthority = (await Keypair.generate()).publicKey;
    const params = {
      proofAccount,
      offset: 64,
      contextState,
      contextStateAuthority,
    };

    const instruction = ZkElGamalProofProgram.verifyPubkeyValidity(params);

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyPubkeyValidity',
    );
    expect(
      ZkElGamalProofInstruction.decodeVerifyPubkeyValidity(instruction),
    ).to.eql(params);
  });

  it('verifyPubkeyValidity with proof account and default offset', async () => {
    const proofAccount = (await Keypair.generate()).publicKey;
    const params = {proofAccount};

    const instruction = ZkElGamalProofProgram.verifyPubkeyValidity(params);

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'VerifyPubkeyValidity',
    );
    expect(
      ZkElGamalProofInstruction.decodeVerifyPubkeyValidity(instruction),
    ).to.eql({...params, offset: 0});
  });

  it('rejects verify proof decode for the wrong instruction type', () => {
    const instruction = ZkElGamalProofProgram.verifyZeroCiphertext({
      proofData: new Uint8Array([1, 2, 3, 4, 5]),
    });

    expect(() =>
      ZkElGamalProofInstruction.decodeVerifyPubkeyValidity(instruction),
    ).to.throw('invalid instruction; instruction type mismatch');
  });

  it('rejects verify proof decode for the wrong program id', async () => {
    const wrongProgramId = (await Keypair.generate()).publicKey;
    const instruction = ZkElGamalProofProgram.verifyZeroCiphertext({
      proofData: new Uint8Array([1, 2, 3, 4, 5]),
    });
    const wrongProgramInstruction = new TransactionInstruction({
      keys: instruction.keys,
      programId: wrongProgramId,
      data: instruction.data,
    });

    expect(() =>
      ZkElGamalProofInstruction.decodeVerifyZeroCiphertext(
        wrongProgramInstruction,
      ),
    ).to.throw('invalid instruction; programId is not ZkElGamalProofProgram');
  });

  it('closeContextState', async () => {
    const contextState = (await Keypair.generate()).publicKey;
    const destination = (await Keypair.generate()).publicKey;
    const authority = (await Keypair.generate()).publicKey;
    const params = {contextState, destination, authority};

    const instruction = ZkElGamalProofProgram.closeContextState(params);

    expect(ZkElGamalProofInstruction.decodeInstructionType(instruction)).to.eq(
      'CloseContextState',
    );
    expect(
      ZkElGamalProofInstruction.decodeCloseContextState(instruction),
    ).to.eql(params);
  });
});
