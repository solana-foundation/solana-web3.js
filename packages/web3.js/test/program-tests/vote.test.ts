import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
    Keypair,
    LAMPORTS_PER_SOL,
    SYSVAR_CLOCK_PUBKEY,
    SYSVAR_RENT_PUBKEY,
    TransactionInstruction,
    VoteAuthorizationLayout,
    VoteInit,
    VoteInstruction,
    VoteProgram,
    sendAndConfirmTransaction,
    SystemInstruction,
    Connection,
    PublicKey,
} from '../../src';
import { helpers } from '../mocks/rpc-http';
import { url } from '../url';

use(chaiAsPromised);

function expectInstructionKeys(
    instruction: TransactionInstruction,
    expected: Array<{
        pubkey: PublicKey;
        isSigner: boolean;
        isWritable: boolean;
    }>,
) {
    expect(instruction.keys).to.have.length(expected.length);
    expect(
        instruction.keys.map(({ pubkey, isSigner, isWritable }) => ({
            pubkey,
            isSigner,
            isWritable,
        })),
    ).to.eql(expected);
}

describe('VoteProgram', () => {
    it('createAccount', async () => {
        const fromPubkey = (await Keypair.generate()).publicKey;
        const newAccountPubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const nodePubkey = (await Keypair.generate()).publicKey;
        const commission = 5;
        const voteInit = new VoteInit(nodePubkey, authorizedPubkey, authorizedPubkey, commission);
        const lamports = 123;
        const transaction = VoteProgram.createAccount({
            fromPubkey,
            votePubkey: newAccountPubkey,
            voteInit,
            lamports,
        });
        expect(transaction.instructions).to.have.length(2);
        const [systemInstruction, voteInstruction] = transaction.instructions;
        const systemParams = {
            fromPubkey,
            newAccountPubkey,
            lamports: BigInt(lamports),
            space: BigInt(VoteProgram.space),
            programId: VoteProgram.programId,
        };
        expect(systemParams).to.eql(SystemInstruction.decodeCreateAccount(systemInstruction));

        const initParams = { votePubkey: newAccountPubkey, nodePubkey, voteInit };
        expect(initParams).to.eql(VoteInstruction.decodeInitializeAccount(voteInstruction));
    });

    it('initialize', async () => {
        const newAccountPubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const nodePubkey = (await Keypair.generate()).publicKey;
        const voteInit = new VoteInit(nodePubkey, authorizedPubkey, authorizedPubkey, 5);
        const initParams = {
            votePubkey: newAccountPubkey,
            nodePubkey,
            voteInit,
        };
        const initInstruction = VoteProgram.initializeAccount(initParams);
        expectInstructionKeys(initInstruction, [
            { pubkey: newAccountPubkey, isSigner: false, isWritable: true },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: nodePubkey, isSigner: true, isWritable: false },
        ]);
        expect(initParams).to.eql(VoteInstruction.decodeInitializeAccount(initInstruction));
    });

    it('authorize', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const voteAuthorizationType = VoteAuthorizationLayout.Voter;
        const params = {
            votePubkey,
            authorizedPubkey,
            newAuthorizedPubkey,
            voteAuthorizationType,
        };
        const transaction = VoteProgram.authorize(params);
        expect(transaction.instructions).to.have.length(1);
        const [authorizeInstruction] = transaction.instructions;
        expectInstructionKeys(authorizeInstruction, [
            { pubkey: votePubkey, isSigner: false, isWritable: true },
            { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: authorizedPubkey, isSigner: true, isWritable: false },
        ]);
        expect(params).to.eql(VoteInstruction.decodeAuthorize(authorizeInstruction));
    });

    it('authorize with seed', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const currentAuthorityDerivedKeyBasePubkey = (await Keypair.generate()).publicKey;
        const currentAuthorityDerivedKeyOwnerPubkey = (await Keypair.generate()).publicKey;
        const currentAuthorityDerivedKeySeed = 'sunflower';
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const voteAuthorizationType = VoteAuthorizationLayout.Voter;
        const params = {
            currentAuthorityDerivedKeyBasePubkey,
            currentAuthorityDerivedKeyOwnerPubkey,
            currentAuthorityDerivedKeySeed,
            newAuthorizedPubkey,
            voteAuthorizationType,
            votePubkey,
        };
        const transaction = VoteProgram.authorizeWithSeed(params);
        expect(transaction.instructions).to.have.length(1);
        const [authorizeWithSeedInstruction] = transaction.instructions;
        expectInstructionKeys(authorizeWithSeedInstruction, [
            { pubkey: votePubkey, isSigner: false, isWritable: true },
            { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
            {
                pubkey: currentAuthorityDerivedKeyBasePubkey,
                isSigner: true,
                isWritable: false,
            },
        ]);
        expect(params).to.eql(VoteInstruction.decodeAuthorizeWithSeed(authorizeWithSeedInstruction));
    });

    it('withdraw', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const authorizedWithdrawerPubkey = (await Keypair.generate()).publicKey;
        const toPubkey = (await Keypair.generate()).publicKey;
        const params = {
            votePubkey,
            authorizedWithdrawerPubkey,
            lamports: 123,
            toPubkey,
        };
        const transaction = VoteProgram.withdraw(params);
        expect(transaction.instructions).to.have.length(1);
        const [withdrawInstruction] = transaction.instructions;
        expectInstructionKeys(withdrawInstruction, [
            { pubkey: votePubkey, isSigner: false, isWritable: true },
            { pubkey: toPubkey, isSigner: false, isWritable: true },
            {
                pubkey: authorizedWithdrawerPubkey,
                isSigner: true,
                isWritable: false,
            },
        ]);
        expect(VoteInstruction.decodeWithdraw(withdrawInstruction)).to.eql({
            ...params,
            lamports: 123n,
        });
    });

    it('rejects unsafe numeric u64 inputs', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const authorizedWithdrawerPubkey = (await Keypair.generate()).publicKey;
        const toPubkey = (await Keypair.generate()).publicKey;
        const unsafeLamports = Number.MAX_SAFE_INTEGER + 1;

        expect(() =>
            VoteProgram.withdraw({
                votePubkey,
                authorizedWithdrawerPubkey,
                lamports: unsafeLamports,
                toPubkey,
            }),
        ).to.throw('u64 must be a safe integer or bigint');
    });

    it('rejects negative withdraw lamports', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const authorizedWithdrawerPubkey = (await Keypair.generate()).publicKey;
        const toPubkey = (await Keypair.generate()).publicKey;

        expect(() =>
            VoteProgram.withdraw({
                votePubkey,
                authorizedWithdrawerPubkey,
                lamports: -1,
                toPubkey,
            }),
        ).to.throw('u64 must be greater than or equal to 0');
    });

    it('safeWithdraw accepts bigint thresholds', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const authorizedWithdrawerPubkey = (await Keypair.generate()).publicKey;
        const toPubkey = (await Keypair.generate()).publicKey;

        const transaction = VoteProgram.safeWithdraw(
            {
                votePubkey,
                authorizedWithdrawerPubkey,
                lamports: 25n,
                toPubkey,
            },
            100n,
            50n,
        );

        expect(transaction.instructions).to.have.length(1);
        expect(VoteInstruction.decodeWithdraw(transaction.instructions[0])).to.eql({
            votePubkey,
            authorizedWithdrawerPubkey,
            lamports: 25n,
            toPubkey,
        });
    });

    it('update validator identity', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const authorizedWithdrawerPubkey = (await Keypair.generate()).publicKey;
        const nodePubkey = (await Keypair.generate()).publicKey;
        const params = {
            votePubkey,
            authorizedWithdrawerPubkey,
            nodePubkey,
        };

        const transaction = VoteProgram.updateValidatorIdentity(params);
        expect(transaction.instructions).to.have.length(1);
        const [instruction] = transaction.instructions;
        expect(VoteInstruction.decodeInstructionType(instruction)).to.eq('UpdateValidatorIdentity');
        expectInstructionKeys(instruction, [
            { pubkey: votePubkey, isSigner: false, isWritable: true },
            { pubkey: nodePubkey, isSigner: true, isWritable: false },
            {
                pubkey: authorizedWithdrawerPubkey,
                isSigner: true,
                isWritable: false,
            },
        ]);
        expect(VoteInstruction.decodeUpdateValidatorIdentity(instruction)).to.eql(params);
    });

    it('authorize checked', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const params = {
            votePubkey,
            authorizedPubkey,
            newAuthorizedPubkey,
            voteAuthorizationType: VoteAuthorizationLayout.Withdrawer,
        };

        const transaction = VoteProgram.authorizeChecked(params);
        expect(transaction.instructions).to.have.length(1);
        const [instruction] = transaction.instructions;
        expect(VoteInstruction.decodeInstructionType(instruction)).to.eq('AuthorizeChecked');
        expectInstructionKeys(instruction, [
            { pubkey: votePubkey, isSigner: false, isWritable: true },
            { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: authorizedPubkey, isSigner: true, isWritable: false },
            { pubkey: newAuthorizedPubkey, isSigner: true, isWritable: false },
        ]);
        expect(VoteInstruction.decodeAuthorizeChecked(instruction)).to.eql(params);
    });

    it('rejects authorize-checked decode for the wrong program id', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const wrongProgramId = (await Keypair.generate()).publicKey;
        const wrongProgramInstruction = new TransactionInstruction({
            keys: [
                { pubkey: votePubkey, isSigner: false, isWritable: true },
                { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
                { pubkey: authorizedPubkey, isSigner: true, isWritable: false },
                { pubkey: newAuthorizedPubkey, isSigner: true, isWritable: false },
            ],
            programId: wrongProgramId,
            data: Uint8Array.of(7, 0, 0, 0, 1, 0, 0, 0),
        });

        expect(() => VoteInstruction.decodeAuthorizeChecked(wrongProgramInstruction)).to.throw(
            'invalid instruction; programId is not VoteProgram',
        );
    });

    it('rejects authorize-checked decode for the wrong instruction index', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;

        const wrongInstruction = new TransactionInstruction({
            keys: [
                { pubkey: votePubkey, isSigner: false, isWritable: true },
                { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
                { pubkey: authorizedPubkey, isSigner: true, isWritable: false },
                { pubkey: newAuthorizedPubkey, isSigner: true, isWritable: false },
            ],
            programId: VoteProgram.programId,
            data: Uint8Array.of(1, 0, 0, 0, 1, 0, 0, 0),
        });

        expect(() => VoteInstruction.decodeAuthorizeChecked(wrongInstruction)).to.throw(
            'invalid instruction; instruction index mismatch',
        );
    });

    it('authorize checked with seed', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const currentAuthorityDerivedKeyBasePubkey = (await Keypair.generate()).publicKey;
        const currentAuthorityDerivedKeyOwnerPubkey = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const params = {
            currentAuthorityDerivedKeyBasePubkey,
            currentAuthorityDerivedKeyOwnerPubkey,
            currentAuthorityDerivedKeySeed: 'orchid',
            newAuthorizedPubkey,
            voteAuthorizationType: VoteAuthorizationLayout.Voter,
            votePubkey,
        };

        const transaction = VoteProgram.authorizeCheckedWithSeed(params);
        expect(transaction.instructions).to.have.length(1);
        const [instruction] = transaction.instructions;
        expect(VoteInstruction.decodeInstructionType(instruction)).to.eq('AuthorizeCheckedWithSeed');
        expectInstructionKeys(instruction, [
            { pubkey: votePubkey, isSigner: false, isWritable: true },
            { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
            {
                pubkey: currentAuthorityDerivedKeyBasePubkey,
                isSigner: true,
                isWritable: false,
            },
            { pubkey: newAuthorizedPubkey, isSigner: true, isWritable: false },
        ]);
        expect(VoteInstruction.decodeAuthorizeCheckedWithSeed(instruction)).to.eql(params);
    });

    it('rejects authorize-checked-with-seed decode when too few keys are present', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const currentAuthorityDerivedKeyBasePubkey = (await Keypair.generate()).publicKey;
        const currentAuthorityDerivedKeyOwnerPubkey = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;

        const authorizeWithSeedInstruction = VoteProgram.authorizeWithSeed({
            currentAuthorityDerivedKeyBasePubkey,
            currentAuthorityDerivedKeyOwnerPubkey,
            currentAuthorityDerivedKeySeed: 'orchid',
            newAuthorizedPubkey,
            voteAuthorizationType: VoteAuthorizationLayout.Voter,
            votePubkey,
        }).instructions[0];

        expect(() => VoteInstruction.decodeAuthorizeCheckedWithSeed(authorizeWithSeedInstruction)).to.throw(
            'invalid instruction; found 3 keys, expected at least 4',
        );
    });

    it('update commission', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const authorizedWithdrawerPubkey = (await Keypair.generate()).publicKey;
        const params = {
            votePubkey,
            authorizedWithdrawerPubkey,
            commission: 42,
        };

        const transaction = VoteProgram.updateCommission(params);
        expect(transaction.instructions).to.have.length(1);
        const [instruction] = transaction.instructions;
        expect(VoteInstruction.decodeInstructionType(instruction)).to.eq('UpdateCommission');
        expectInstructionKeys(instruction, [
            { pubkey: votePubkey, isSigner: false, isWritable: true },
            {
                pubkey: authorizedWithdrawerPubkey,
                isSigner: true,
                isWritable: false,
            },
        ]);
        expect(VoteInstruction.decodeUpdateCommission(instruction)).to.eql(params);
    });

    it('rejects update-commission decode for malformed data', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const authorizedWithdrawerPubkey = (await Keypair.generate()).publicKey;
        const malformedInstruction = new TransactionInstruction({
            keys: [
                { pubkey: votePubkey, isSigner: false, isWritable: true },
                {
                    pubkey: authorizedWithdrawerPubkey,
                    isSigner: true,
                    isWritable: false,
                },
            ],
            programId: VoteProgram.programId,
            data: Uint8Array.of(5, 0, 0),
        });

        expect(() => VoteInstruction.decodeUpdateCommission(malformedInstruction)).to.throw('invalid instruction;');
    });

    it('rejects unsupported direct vote-casting instructions', async () => {
        const votePubkey = (await Keypair.generate()).publicKey;
        const unsupportedVoteInstruction = new TransactionInstruction({
            keys: [{ pubkey: votePubkey, isSigner: false, isWritable: true }],
            programId: VoteProgram.programId,
            data: Uint8Array.of(2, 0, 0, 0),
        });

        expect(() => VoteInstruction.decodeInstructionType(unsupportedVoteInstruction)).to.throw(
            'invalid instruction; unsupported vote-program instruction index 2',
        );
    });

    if (process.env.TEST_LIVE) {
        it('change authority from derived key', async () => {
            const connection = new Connection(url, 'confirmed');

            const newVoteAccount = await Keypair.generate();
            const nodeAccount = await Keypair.generate();
            const derivedKeyOwnerProgram = await Keypair.generate();
            const derivedKeySeed = 'sunflower';
            const newAuthorizedWithdrawer = await Keypair.generate();

            const derivedKeyBaseKeypair = await Keypair.generate();
            const [_1, _2, minimumAmount, derivedKey] = await Promise.all([
                (async () => {
                    await helpers.airdrop({
                        connection,
                        address: derivedKeyBaseKeypair.publicKey,
                        amount: 12 * LAMPORTS_PER_SOL,
                    });
                    expect(await connection.getBalance(derivedKeyBaseKeypair.publicKey)).to.eq(
                        12n * BigInt(LAMPORTS_PER_SOL),
                    );
                })(),
                (async () => {
                    await helpers.airdrop({
                        connection,
                        address: newAuthorizedWithdrawer.publicKey,
                        amount: 0.1 * LAMPORTS_PER_SOL,
                    });
                    expect(await connection.getBalance(newAuthorizedWithdrawer.publicKey)).to.eq(
                        BigInt(LAMPORTS_PER_SOL) / 10n,
                    );
                })(),
                connection.getMinimumBalanceForRentExemption(VoteProgram.space),
                PublicKey.createWithSeed(
                    derivedKeyBaseKeypair.publicKey,
                    derivedKeySeed,
                    derivedKeyOwnerProgram.publicKey,
                ),
            ]);

            // Create initialized Vote account
            const createAndInitialize = VoteProgram.createAccount({
                fromPubkey: derivedKeyBaseKeypair.publicKey,
                votePubkey: newVoteAccount.publicKey,
                voteInit: new VoteInit(nodeAccount.publicKey, derivedKey, derivedKey, 5),
                lamports: Number(minimumAmount + 10n * BigInt(LAMPORTS_PER_SOL)),
            });
            await sendAndConfirmTransaction(
                connection,
                createAndInitialize,
                [derivedKeyBaseKeypair, newVoteAccount, nodeAccount],
                { preflightCommitment: 'confirmed' },
            );
            expect(await connection.getBalance(newVoteAccount.publicKey)).to.eq(
                minimumAmount + 10n * BigInt(LAMPORTS_PER_SOL),
            );

            // Authorize a new Withdrawer.
            const authorize = VoteProgram.authorizeWithSeed({
                currentAuthorityDerivedKeyBasePubkey: derivedKeyBaseKeypair.publicKey,
                currentAuthorityDerivedKeyOwnerPubkey: derivedKeyOwnerProgram.publicKey,
                currentAuthorityDerivedKeySeed: derivedKeySeed,
                newAuthorizedPubkey: newAuthorizedWithdrawer.publicKey,
                voteAuthorizationType: VoteAuthorizationLayout.Withdrawer,
                votePubkey: newVoteAccount.publicKey,
            });
            await sendAndConfirmTransaction(connection, authorize, [derivedKeyBaseKeypair], {
                preflightCommitment: 'confirmed',
            });

            // Test newAuthorizedWithdrawer may withdraw.
            const recipient = await Keypair.generate();
            const withdraw = VoteProgram.withdraw({
                votePubkey: newVoteAccount.publicKey,
                authorizedWithdrawerPubkey: newAuthorizedWithdrawer.publicKey,
                lamports: LAMPORTS_PER_SOL,
                toPubkey: recipient.publicKey,
            });
            await sendAndConfirmTransaction(connection, withdraw, [newAuthorizedWithdrawer], {
                preflightCommitment: 'confirmed',
            });
            expect(await connection.getBalance(recipient.publicKey)).to.eq(BigInt(LAMPORTS_PER_SOL));
        });

        it('live vote actions', async () => {
            const connection = new Connection(url, 'confirmed');

            const newVoteAccount = await Keypair.generate();
            const nodeAccount = await Keypair.generate();

            const payer = await Keypair.generate();
            await helpers.airdrop({
                connection,
                address: payer.publicKey,
                amount: 12 * LAMPORTS_PER_SOL,
            });
            expect(await connection.getBalance(payer.publicKey)).to.eq(12n * BigInt(LAMPORTS_PER_SOL));

            const authorized = await Keypair.generate();
            await helpers.airdrop({
                connection,
                address: authorized.publicKey,
                amount: 12 * LAMPORTS_PER_SOL,
            });
            expect(await connection.getBalance(authorized.publicKey)).to.eq(12n * BigInt(LAMPORTS_PER_SOL));

            const minimumAmount = await connection.getMinimumBalanceForRentExemption(VoteProgram.space);

            // Create initialized Vote account
            const createAndInitialize = VoteProgram.createAccount({
                fromPubkey: payer.publicKey,
                votePubkey: newVoteAccount.publicKey,
                voteInit: new VoteInit(nodeAccount.publicKey, authorized.publicKey, authorized.publicKey, 5),
                lamports: Number(minimumAmount + 10n * BigInt(LAMPORTS_PER_SOL)),
            });
            await sendAndConfirmTransaction(connection, createAndInitialize, [payer, newVoteAccount, nodeAccount], {
                preflightCommitment: 'confirmed',
            });
            expect(await connection.getBalance(newVoteAccount.publicKey)).to.eq(
                minimumAmount + 10n * BigInt(LAMPORTS_PER_SOL),
            );

            // Withdraw from Vote account
            let recipient = await Keypair.generate();
            const voteBalance = await connection.getBalance(newVoteAccount.publicKey);

            expect(() =>
                VoteProgram.safeWithdraw(
                    {
                        votePubkey: newVoteAccount.publicKey,
                        authorizedWithdrawerPubkey: authorized.publicKey,
                        lamports: Number(voteBalance - minimumAmount + 1n),
                        toPubkey: recipient.publicKey,
                    },
                    Number(voteBalance),
                    Number(minimumAmount),
                ),
            ).to.throw('Withdraw will leave vote account with insufficient funds.');

            let withdraw = VoteProgram.withdraw({
                votePubkey: newVoteAccount.publicKey,
                authorizedWithdrawerPubkey: authorized.publicKey,
                lamports: LAMPORTS_PER_SOL,
                toPubkey: recipient.publicKey,
            });
            await sendAndConfirmTransaction(connection, withdraw, [authorized], {
                preflightCommitment: 'confirmed',
            });
            expect(await connection.getBalance(recipient.publicKey)).to.eq(BigInt(LAMPORTS_PER_SOL));

            const newAuthorizedWithdrawer = await Keypair.generate();
            await helpers.airdrop({
                connection,
                address: newAuthorizedWithdrawer.publicKey,
                amount: LAMPORTS_PER_SOL,
            });
            expect(await connection.getBalance(newAuthorizedWithdrawer.publicKey)).to.eq(BigInt(LAMPORTS_PER_SOL));

            // Authorize a new Withdrawer.
            let authorize = VoteProgram.authorize({
                votePubkey: newVoteAccount.publicKey,
                authorizedPubkey: authorized.publicKey,
                newAuthorizedPubkey: newAuthorizedWithdrawer.publicKey,
                voteAuthorizationType: VoteAuthorizationLayout.Withdrawer,
            });
            await sendAndConfirmTransaction(connection, authorize, [authorized], {
                preflightCommitment: 'confirmed',
            });

            // Test old authorized cannot withdraw anymore.
            withdraw = VoteProgram.withdraw({
                votePubkey: newVoteAccount.publicKey,
                authorizedWithdrawerPubkey: authorized.publicKey,
                lamports: Number(minimumAmount),
                toPubkey: recipient.publicKey,
            });
            await expect(
                sendAndConfirmTransaction(connection, withdraw, [authorized], {
                    preflightCommitment: 'confirmed',
                }),
            ).to.be.rejected;

            // Test newAuthorizedWithdrawer may withdraw.
            recipient = await Keypair.generate();
            withdraw = VoteProgram.withdraw({
                votePubkey: newVoteAccount.publicKey,
                authorizedWithdrawerPubkey: newAuthorizedWithdrawer.publicKey,
                lamports: LAMPORTS_PER_SOL,
                toPubkey: recipient.publicKey,
            });
            await sendAndConfirmTransaction(connection, withdraw, [newAuthorizedWithdrawer], {
                preflightCommitment: 'confirmed',
            });
            expect(await connection.getBalance(recipient.publicKey)).to.eq(BigInt(LAMPORTS_PER_SOL));

            const newAuthorizedVoter = await Keypair.generate();
            await helpers.airdrop({
                connection,
                address: newAuthorizedVoter.publicKey,
                amount: LAMPORTS_PER_SOL,
            });
            expect(await connection.getBalance(newAuthorizedVoter.publicKey)).to.eq(BigInt(LAMPORTS_PER_SOL));

            // The authorized Withdrawer may sign to authorize a new Voter, see
            // https://github.com/solana-labs/solana/issues/22521
            authorize = VoteProgram.authorize({
                votePubkey: newVoteAccount.publicKey,
                authorizedPubkey: newAuthorizedWithdrawer.publicKey,
                newAuthorizedPubkey: newAuthorizedVoter.publicKey,
                voteAuthorizationType: VoteAuthorizationLayout.Voter,
            });
            await sendAndConfirmTransaction(connection, authorize, [newAuthorizedWithdrawer], {
                preflightCommitment: 'confirmed',
            });
        }).timeout(10 * 1000);
    }
});
