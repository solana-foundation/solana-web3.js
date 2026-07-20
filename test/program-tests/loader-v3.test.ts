import {expect} from 'chai';

import {
  Keypair,
  LoaderV3Instruction,
  LoaderV3Program,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '../../src';

describe('LoaderV3Program', function () {
  it('initializeBuffer', async () => {
    const sourceAccount = (await Keypair.generate()).publicKey;
    const bufferAuthority = (await Keypair.generate()).publicKey;
    const params = {sourceAccount, bufferAuthority};

    const instruction = LoaderV3Program.initializeBuffer(params);

    expect(LoaderV3Instruction.decodeInstructionType(instruction)).to.eq(
      'InitializeBuffer',
    );
    expect(LoaderV3Instruction.decodeInitializeBuffer(instruction)).to.eql(
      params,
    );
  });

  it('write', async () => {
    const bufferAccount = (await Keypair.generate()).publicKey;
    const bufferAuthority = (await Keypair.generate()).publicKey;
    const params = {
      bufferAccount,
      bufferAuthority,
      offset: 128,
      bytes: new Uint8Array([1, 2, 3, 4, 5]),
    };

    const instruction = LoaderV3Program.write(params);
    const decoded = LoaderV3Instruction.decodeWrite(instruction);

    expect(LoaderV3Instruction.decodeInstructionType(instruction)).to.eq(
      'Write',
    );
    expect(decoded.bufferAccount).to.eql(params.bufferAccount);
    expect(decoded.bufferAuthority).to.eql(params.bufferAuthority);
    expect(decoded.offset).to.eq(params.offset);
    expect(Array.from(decoded.bytes)).to.eql(Array.from(params.bytes));
  });

  it('rejects write decode for the wrong program id', async () => {
    const bufferAccount = (await Keypair.generate()).publicKey;
    const bufferAuthority = (await Keypair.generate()).publicKey;
    const wrongProgramId = (await Keypair.generate()).publicKey;
    const instruction = LoaderV3Program.write({
      bufferAccount,
      bufferAuthority,
      offset: 128,
      bytes: new Uint8Array([1, 2, 3, 4, 5]),
    });
    const wrongProgramInstruction = new TransactionInstruction({
      keys: instruction.keys,
      programId: wrongProgramId,
      data: instruction.data,
    });

    expect(() =>
      LoaderV3Instruction.decodeWrite(wrongProgramInstruction),
    ).to.throw('invalid instruction; programId is not LoaderV3Program');
  });

  it('deployWithMaxDataLen', async () => {
    const payerAccount = (await Keypair.generate()).publicKey;
    const programDataAccount = (await Keypair.generate()).publicKey;
    const programAccount = (await Keypair.generate()).publicKey;
    const bufferAccount = (await Keypair.generate()).publicKey;
    const authority = (await Keypair.generate()).publicKey;
    const params = {
      payerAccount,
      programDataAccount,
      programAccount,
      bufferAccount,
      authority,
      maxDataLen: 64_000n,
    };

    const instruction = LoaderV3Program.deployWithMaxDataLen(params);
    const decoded = LoaderV3Instruction.decodeDeployWithMaxDataLen(instruction);

    expect(LoaderV3Instruction.decodeInstructionType(instruction)).to.eq(
      'DeployWithMaxDataLen',
    );
    expect(decoded).to.eql({
      ...params,
      maxDataLen: BigInt(params.maxDataLen),
      rentSysvar: SYSVAR_RENT_PUBKEY,
      clockSysvar: SYSVAR_CLOCK_PUBKEY,
      systemProgram: SystemProgram.programId,
    });
  });

  it('upgrade', async () => {
    const programDataAccount = (await Keypair.generate()).publicKey;
    const programAccount = (await Keypair.generate()).publicKey;
    const bufferAccount = (await Keypair.generate()).publicKey;
    const spillAccount = (await Keypair.generate()).publicKey;
    const authority = (await Keypair.generate()).publicKey;
    const params = {
      programDataAccount,
      programAccount,
      bufferAccount,
      spillAccount,
      authority,
    };

    const instruction = LoaderV3Program.upgrade(params);
    const decoded = LoaderV3Instruction.decodeUpgrade(instruction);

    expect(LoaderV3Instruction.decodeInstructionType(instruction)).to.eq(
      'Upgrade',
    );
    expect(decoded).to.eql({
      ...params,
      rentSysvar: SYSVAR_RENT_PUBKEY,
      clockSysvar: SYSVAR_CLOCK_PUBKEY,
    });
  });

  it('setAuthority', async () => {
    const bufferOrProgramDataAccount = (await Keypair.generate()).publicKey;
    const currentAuthority = (await Keypair.generate()).publicKey;
    const newAuthority = (await Keypair.generate()).publicKey;
    const params = {
      bufferOrProgramDataAccount,
      currentAuthority,
      newAuthority,
    };

    const instruction = LoaderV3Program.setAuthority(params);

    expect(LoaderV3Instruction.decodeInstructionType(instruction)).to.eq(
      'SetAuthority',
    );
    expect(LoaderV3Instruction.decodeSetAuthority(instruction)).to.eql(params);
  });

  it('setAuthority without newAuthority', async () => {
    const bufferOrProgramDataAccount = (await Keypair.generate()).publicKey;
    const currentAuthority = (await Keypair.generate()).publicKey;
    const params = {
      bufferOrProgramDataAccount,
      currentAuthority,
    };

    const instruction = LoaderV3Program.setAuthority(params);

    expect(LoaderV3Instruction.decodeInstructionType(instruction)).to.eq(
      'SetAuthority',
    );
    expect(LoaderV3Instruction.decodeSetAuthority(instruction)).to.eql(params);
  });

  it('setAuthorityChecked', async () => {
    const bufferOrProgramDataAccount = (await Keypair.generate()).publicKey;
    const currentAuthority = (await Keypair.generate()).publicKey;
    const newAuthority = (await Keypair.generate()).publicKey;
    const params = {
      bufferOrProgramDataAccount,
      currentAuthority,
      newAuthority,
    };

    const instruction = LoaderV3Program.setAuthorityChecked(params);

    expect(LoaderV3Instruction.decodeInstructionType(instruction)).to.eq(
      'SetAuthorityChecked',
    );
    expect(LoaderV3Instruction.decodeSetAuthorityChecked(instruction)).to.eql(
      params,
    );
  });

  it('close', async () => {
    const bufferOrProgramDataAccount = (await Keypair.generate()).publicKey;
    const destinationAccount = (await Keypair.generate()).publicKey;
    const authority = (await Keypair.generate()).publicKey;
    const programAccount = (await Keypair.generate()).publicKey;
    const params = {
      bufferOrProgramDataAccount,
      destinationAccount,
      authority,
      programAccount,
    };

    const instruction = LoaderV3Program.close(params);

    expect(LoaderV3Instruction.decodeInstructionType(instruction)).to.eq(
      'Close',
    );
    expect(LoaderV3Instruction.decodeClose(instruction)).to.eql(params);
  });

  it('close without optional accounts', async () => {
    const bufferOrProgramDataAccount = (await Keypair.generate()).publicKey;
    const destinationAccount = (await Keypair.generate()).publicKey;
    const params = {
      bufferOrProgramDataAccount,
      destinationAccount,
    };

    const instruction = LoaderV3Program.close(params);

    expect(LoaderV3Instruction.decodeInstructionType(instruction)).to.eq(
      'Close',
    );
    expect(LoaderV3Instruction.decodeClose(instruction)).to.eql(params);
  });

  it('extendProgram', async () => {
    const programDataAccount = (await Keypair.generate()).publicKey;
    const programAccount = (await Keypair.generate()).publicKey;
    const payer = (await Keypair.generate()).publicKey;
    const params = {
      programDataAccount,
      programAccount,
      additionalBytes: 1024,
      payer,
    };

    const instruction = LoaderV3Program.extendProgram(params);

    expect(LoaderV3Instruction.decodeInstructionType(instruction)).to.eq(
      'ExtendProgram',
    );
    expect(LoaderV3Instruction.decodeExtendProgram(instruction)).to.eql(params);
  });

  it('extendProgram without payer', async () => {
    const programDataAccount = (await Keypair.generate()).publicKey;
    const programAccount = (await Keypair.generate()).publicKey;
    const params = {
      programDataAccount,
      programAccount,
      additionalBytes: 2048,
    };

    const instruction = LoaderV3Program.extendProgram(params);

    expect(LoaderV3Instruction.decodeInstructionType(instruction)).to.eq(
      'ExtendProgram',
    );
    expect(LoaderV3Instruction.decodeExtendProgram(instruction)).to.eql(params);
  });
});
