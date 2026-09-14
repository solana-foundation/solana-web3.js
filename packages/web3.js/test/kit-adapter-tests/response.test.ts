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
