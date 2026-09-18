import {expect} from 'chai';

import {
  mapRpcParsedInnerInstructions,
  mapSimulatedTransactionResponseValue,
  mapTypedParsedTransactionResponse,
  mapTypedTransactionResponse,
} from '../../src/kit-adapters/response';

const ADDRESS = '11111111111111111111111111111111';

function createMeta() {
  return {
    err: null,
    fee: 1n,
    innerInstructions: null,
    logMessages: null,
    postBalances: [2n],
    postTokenBalances: null,
    preBalances: [3n],
    preTokenBalances: null,
    returnData: {data: ['AQID', 'base64'], programId: ADDRESS},
    rewards: [
      {
        commission: null,
        lamports: 4n,
        postBalance: 5n,
        pubkey: ADDRESS,
        rewardType: null,
      },
    ],
  };
}

describe('Kit response adapters', () => {
  it('should preserve nullable token balances, return data, and rewards', () => {
    // Arrange
    const response = {
      blockTime: null,
      meta: createMeta(),
      slot: 1n,
      transaction: {
        message: {
          accountKeys: [ADDRESS],
          header: {
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0,
            numRequiredSignatures: 1,
          },
          instructions: [],
          recentBlockhash: ADDRESS,
        },
        signatures: [ADDRESS],
      },
    } as unknown as Parameters<typeof mapTypedTransactionResponse>[0];

    // Act
    const result = mapTypedTransactionResponse(response);

    // Assert
    expect(result.meta).to.include({
      postTokenBalances: null,
      preTokenBalances: null,
    });
    expect(result.meta?.returnData).to.deep.equal({
      data: ['AQID', 'base64'],
      programId: ADDRESS,
    });
    expect(result.meta?.rewards).to.deep.equal(createMeta().rewards);
  });

  it('should reject unsupported transaction versions instead of mapping them to legacy messages', () => {
    // Arrange
    const response = {
      blockTime: null,
      meta: createMeta(),
      slot: 1n,
      transaction: {
        message: {
          accountKeys: [ADDRESS],
          header: {
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0,
            numRequiredSignatures: 1,
          },
          instructions: [],
          recentBlockhash: ADDRESS,
          transactionConfig: {priorityFee: 9000000n},
        },
        signatures: [ADDRESS],
      },
      version: 2n,
    } as unknown as Parameters<typeof mapTypedTransactionResponse>[0];

    // Act & Assert
    expect(() => mapTypedTransactionResponse(response)).to.throw(
      'Unsupported transaction version: 2',
    );
    expect(() =>
      mapTypedParsedTransactionResponse(
        response as unknown as Parameters<
          typeof mapTypedParsedTransactionResponse
        >[0],
      ),
    ).to.throw('Unsupported transaction version: 2');
  });

  it('should preserve stack heights in parsed transaction paths', () => {
    // Arrange
    const parsedInstruction = {
      parsed: {info: {}, type: 'test'},
      program: 'system',
      programId: ADDRESS,
      stackHeight: 2,
    };
    const partiallyDecodedInstruction = {
      accounts: [ADDRESS],
      data: '',
      programId: ADDRESS,
      stackHeight: 3,
    };
    const innerInstructions = [
      {
        index: 0,
        instructions: [parsedInstruction, partiallyDecodedInstruction],
      },
    ] as unknown as Parameters<typeof mapRpcParsedInnerInstructions>[0];
    const response = {
      blockTime: null,
      meta: {...createMeta(), innerInstructions},
      slot: 1n,
      transaction: {
        message: {
          accountKeys: [
            {
              pubkey: ADDRESS,
              signer: true,
              source: 'transaction',
              writable: true,
            },
          ],
          instructions: [parsedInstruction, partiallyDecodedInstruction],
          recentBlockhash: ADDRESS,
        },
        signatures: [ADDRESS],
      },
    } as unknown as Parameters<typeof mapTypedParsedTransactionResponse>[0];

    // Act
    const transaction = mapTypedParsedTransactionResponse(response);
    const simulation = mapSimulatedTransactionResponseValue({
      err: null,
      innerInstructions,
      logs: null,
    });

    // Assert
    expect(
      transaction.transaction.message.instructions.map(ix => ix.stackHeight),
    ).to.deep.equal([2, 3]);
    expect(
      transaction.meta?.innerInstructions?.[0].instructions.map(
        ix => ix.stackHeight,
      ),
    ).to.deep.equal([2, 3]);
    expect(
      simulation.innerInstructions?.[0].instructions.map(ix => ix.stackHeight),
    ).to.deep.equal([2, 3]);
  });
  it('should map simulation fee, balances, token balances, and loaded addresses', () => {
    const tokenBalance = {
      accountIndex: 1,
      mint: ADDRESS,
      uiTokenAmount: {
        amount: '1',
        decimals: 0,
        uiAmount: 1,
        uiAmountString: '1',
      },
    };
    const simulation = mapSimulatedTransactionResponseValue({
      err: null,
      fee: 5000,
      loadedAddresses: {readonly: [], writable: [ADDRESS]},
      logs: null,
      postBalances: [1n, 2],
      postTokenBalances: [tokenBalance],
      preBalances: [3, 4n],
      preTokenBalances: null,
    } as unknown as Parameters<typeof mapSimulatedTransactionResponseValue>[0]);
    expect(simulation.fee).to.equal(5000n);
    expect(simulation.preBalances).to.deep.equal([3n, 4n]);
    expect(simulation.postBalances).to.deep.equal([1n, 2n]);
    expect(simulation.preTokenBalances).to.equal(null);
    expect(simulation.postTokenBalances).to.deep.equal([tokenBalance]);
    expect(simulation.postTokenBalances).to.not.equal([tokenBalance]);
    expect(simulation.loadedAddresses?.readonly).to.deep.equal([]);
    expect(
      simulation.loadedAddresses?.writable.map(address => address.toBase58()),
    ).to.deep.equal([ADDRESS]);
  });
  it('should omit simulation ledger fields that the RPC response omits', () => {
    const simulation = mapSimulatedTransactionResponseValue({
      err: null,
      logs: null,
    });
    expect(simulation).to.not.have.property('fee');
    expect(simulation).to.not.have.property('preBalances');
    expect(simulation).to.not.have.property('postBalances');
    expect(simulation).to.not.have.property('preTokenBalances');
    expect(simulation).to.not.have.property('postTokenBalances');
    expect(simulation).to.not.have.property('loadedAddresses');
  });
  it('should omit metadata fields that the RPC response omits', () => {
    // Arrange
    const {returnData: _returnData, rewards: _rewards, ...meta} = createMeta();
    const {
      postTokenBalances: _post,
      preTokenBalances: _pre,
      ...sparseMeta
    } = meta;
    const instruction = {
      accounts: [ADDRESS],
      data: '',
      programId: ADDRESS,
    };
    const response = {
      blockTime: null,
      meta: sparseMeta,
      slot: 1n,
      transaction: {
        message: {
          accountKeys: [
            {
              pubkey: ADDRESS,
              signer: true,
              source: 'transaction',
              writable: true,
            },
          ],
          instructions: [instruction],
          recentBlockhash: ADDRESS,
        },
        signatures: [ADDRESS],
      },
    } as unknown as Parameters<typeof mapTypedParsedTransactionResponse>[0];

    // Act
    const result = mapTypedParsedTransactionResponse(response);

    // Assert
    expect(result.meta).to.not.have.any.keys(
      'postTokenBalances',
      'preTokenBalances',
      'returnData',
      'rewards',
    );
    expect(result.transaction.message.instructions[0]).to.not.have.property(
      'stackHeight',
    );
  });
});
