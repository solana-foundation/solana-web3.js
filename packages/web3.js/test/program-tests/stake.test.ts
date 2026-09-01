import { blockhash, fixCodecSize, getBytesCodec, getStructCodec, getU32Codec, transformCodec } from '@solana/kit';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
    Keypair,
    Authorized,
    Connection,
    Lockup,
    PublicKey,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
    StakeAuthorizationLayout,
    StakeInstruction,
    StakeProgram,
    SystemInstruction,
    Transaction,
} from '../../src';
import { RUST_STRING_CODEC } from '../../src/codecs';
import { sleep } from '../../src/utils/sleep';
import { helpers } from '../mocks/rpc-http';
import { url } from '../url';

use(chaiAsPromised);

const U32_CODEC = getU32Codec();
const PUBLIC_KEY_BYTES_CODEC = transformCodec(
    fixCodecSize(getBytesCodec(), 32),
    (value: Uint8Array) => value,
    value => new Uint8Array(value),
);

const LEGACY_AUTHORIZE_CODEC = getStructCodec([
    ['instruction', U32_CODEC],
    ['newAuthorized', PUBLIC_KEY_BYTES_CODEC],
    ['stakeAuthorizationType', U32_CODEC],
]);

const LEGACY_AUTHORIZE_WITH_SEED_CODEC = getStructCodec([
    ['instruction', U32_CODEC],
    ['newAuthorized', PUBLIC_KEY_BYTES_CODEC],
    ['stakeAuthorizationType', U32_CODEC],
    ['authoritySeed', RUST_STRING_CODEC],
    ['authorityOwner', PUBLIC_KEY_BYTES_CODEC],
]);

describe('StakeProgram', function () {
    it('createAccountWithSeed', async () => {
        const fromPubkey = (await Keypair.generate()).publicKey;
        const seed = 'test string';
        const newAccountPubkey = await PublicKey.createWithSeed(fromPubkey, seed, StakeProgram.programId);
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const authorized = new Authorized(authorizedPubkey, authorizedPubkey);
        const lockup = new Lockup(0, 0, fromPubkey);
        const lamports = 123;
        const transaction = StakeProgram.createAccountWithSeed({
            fromPubkey,
            stakePubkey: newAccountPubkey,
            basePubkey: fromPubkey,
            seed,
            authorized,
            lockup,
            lamports,
        });
        expect(transaction.instructions).to.have.length(2);
        const [systemInstruction, stakeInstruction] = transaction.instructions;
        const systemParams = {
            fromPubkey,
            newAccountPubkey,
            basePubkey: fromPubkey,
            seed,
            lamports: BigInt(lamports),
            space: BigInt(StakeProgram.space),
            programId: StakeProgram.programId,
        };
        expect(systemParams).to.eql(SystemInstruction.decodeCreateWithSeed(systemInstruction));
        const initParams = { stakePubkey: newAccountPubkey, authorized, lockup };
        expect(initParams).to.eql(StakeInstruction.decodeInitialize(stakeInstruction));
    });

    it('createAccount', async () => {
        const fromPubkey = (await Keypair.generate()).publicKey;
        const newAccountPubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const authorized = new Authorized(authorizedPubkey, authorizedPubkey);
        const lockup = new Lockup(0, 0, fromPubkey);
        const lamports = 123;
        const transaction = StakeProgram.createAccount({
            fromPubkey,
            stakePubkey: newAccountPubkey,
            authorized,
            lockup,
            lamports,
        });
        expect(transaction.instructions).to.have.length(2);
        const [systemInstruction, stakeInstruction] = transaction.instructions;
        const systemParams = {
            fromPubkey,
            newAccountPubkey,
            lamports: BigInt(lamports),
            space: BigInt(StakeProgram.space),
            programId: StakeProgram.programId,
        };
        expect(systemParams).to.eql(SystemInstruction.decodeCreateAccount(systemInstruction));

        const initParams = { stakePubkey: newAccountPubkey, authorized, lockup };
        expect(initParams).to.eql(StakeInstruction.decodeInitialize(stakeInstruction));
    });

    it('initializeChecked', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const withdrawAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const params = {
            stakePubkey,
            authorized: new Authorized(authorizedPubkey, withdrawAuthorizedPubkey),
        };

        const stakeInstruction = StakeProgram.initializeChecked(params);

        expect(params).to.eql(StakeInstruction.decodeInitializeChecked(stakeInstruction));
    });

    it('delegate', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const votePubkey = (await Keypair.generate()).publicKey;
        const params = {
            stakePubkey,
            authorizedPubkey,
            votePubkey,
        };
        const transaction = StakeProgram.delegate(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeDelegate(stakeInstruction));
    });

    it('authorize', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const stakeAuthorizationType = StakeAuthorizationLayout.Staker;
        const params = {
            stakePubkey,
            authorizedPubkey,
            newAuthorizedPubkey,
            stakeAuthorizationType,
        };
        const transaction = StakeProgram.authorize(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeAuthorize(stakeInstruction));
    });

    it('authorize with custodian', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const stakeAuthorizationType = StakeAuthorizationLayout.Withdrawer;
        const custodianPubkey = (await Keypair.generate()).publicKey;
        const params = {
            stakePubkey,
            authorizedPubkey,
            newAuthorizedPubkey,
            stakeAuthorizationType,
            custodianPubkey,
        };
        const transaction = StakeProgram.authorize(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeAuthorize(stakeInstruction));
    });

    it('authorize preserves legacy instruction bytes', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const transaction = StakeProgram.authorize({
            stakePubkey,
            authorizedPubkey,
            newAuthorizedPubkey,
            stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
        });

        const [stakeInstruction] = transaction.instructions;
        const expectedData = LEGACY_AUTHORIZE_CODEC.encode({
            instruction: 1,
            newAuthorized: newAuthorizedPubkey.toBytes(),
            stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer.index,
        });

        expect(Uint8Array.from(stakeInstruction.data)).to.deep.eq(Uint8Array.from(expectedData));
    });

    it('authorizeChecked', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const stakeAuthorizationType = StakeAuthorizationLayout.Staker;
        const params = {
            stakePubkey,
            authorizedPubkey,
            newAuthorizedPubkey,
            stakeAuthorizationType,
        };
        const transaction = StakeProgram.authorizeChecked(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeAuthorizeChecked(stakeInstruction));
    });

    it('authorizeChecked with custodian', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const stakeAuthorizationType = StakeAuthorizationLayout.Withdrawer;
        const custodianPubkey = (await Keypair.generate()).publicKey;
        const params = {
            stakePubkey,
            authorizedPubkey,
            newAuthorizedPubkey,
            stakeAuthorizationType,
            custodianPubkey,
        };
        const transaction = StakeProgram.authorizeChecked(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeAuthorizeChecked(stakeInstruction));
    });

    it('authorizeWithSeed', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorityBase = (await Keypair.generate()).publicKey;
        const authoritySeed = 'test string';
        const authorityOwner = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const stakeAuthorizationType = StakeAuthorizationLayout.Staker;
        const params = {
            stakePubkey,
            authorityBase,
            authoritySeed,
            authorityOwner,
            newAuthorizedPubkey,
            stakeAuthorizationType,
        };
        const transaction = StakeProgram.authorizeWithSeed(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeAuthorizeWithSeed(stakeInstruction));
    });

    it('authorizeWithSeed with custodian', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorityBase = (await Keypair.generate()).publicKey;
        const authoritySeed = 'test string';
        const authorityOwner = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const stakeAuthorizationType = StakeAuthorizationLayout.Staker;
        const custodianPubkey = (await Keypair.generate()).publicKey;
        const params = {
            stakePubkey,
            authorityBase,
            authoritySeed,
            authorityOwner,
            newAuthorizedPubkey,
            stakeAuthorizationType,
            custodianPubkey,
        };
        const transaction = StakeProgram.authorizeWithSeed(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeAuthorizeWithSeed(stakeInstruction));
    });

    it('authorizeWithSeed preserves legacy instruction bytes', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorityBase = (await Keypair.generate()).publicKey;
        const authoritySeed = 'test string';
        const authorityOwner = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const transaction = StakeProgram.authorizeWithSeed({
            stakePubkey,
            authorityBase,
            authoritySeed,
            authorityOwner,
            newAuthorizedPubkey,
            stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
        });

        const [stakeInstruction] = transaction.instructions;
        const expectedData = LEGACY_AUTHORIZE_WITH_SEED_CODEC.encode({
            instruction: 8,
            newAuthorized: newAuthorizedPubkey.toBytes(),
            stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer.index,
            authoritySeed,
            authorityOwner: authorityOwner.toBytes(),
        });

        expect(Uint8Array.from(stakeInstruction.data)).to.deep.eq(Uint8Array.from(expectedData));
    });

    it('authorizeCheckedWithSeed', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorityBase = (await Keypair.generate()).publicKey;
        const authoritySeed = 'test string';
        const authorityOwner = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const stakeAuthorizationType = StakeAuthorizationLayout.Staker;
        const params = {
            stakePubkey,
            authorityBase,
            authoritySeed,
            authorityOwner,
            newAuthorizedPubkey,
            stakeAuthorizationType,
        };
        const transaction = StakeProgram.authorizeCheckedWithSeed(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeAuthorizeCheckedWithSeed(stakeInstruction));
    });

    it('authorizeCheckedWithSeed with custodian', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorityBase = (await Keypair.generate()).publicKey;
        const authoritySeed = 'test string';
        const authorityOwner = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const stakeAuthorizationType = StakeAuthorizationLayout.Staker;
        const custodianPubkey = (await Keypair.generate()).publicKey;
        const params = {
            stakePubkey,
            authorityBase,
            authoritySeed,
            authorityOwner,
            newAuthorizedPubkey,
            stakeAuthorizationType,
            custodianPubkey,
        };
        const transaction = StakeProgram.authorizeCheckedWithSeed(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeAuthorizeCheckedWithSeed(stakeInstruction));
    });

    it('setLockup', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const custodian = (await Keypair.generate()).publicKey;
        const params = {
            stakePubkey,
            authorizedPubkey,
            unixTimestamp: 123n,
            epoch: 456n,
            custodian,
        };
        const transaction = StakeProgram.setLockup(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeSetLockup(stakeInstruction));
    });

    it('setLockupChecked', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
        const params = {
            stakePubkey,
            authorizedPubkey,
            newAuthorizedPubkey,
            unixTimestamp: 123n,
            epoch: 456n,
        };
        const transaction = StakeProgram.setLockupChecked(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeSetLockupChecked(stakeInstruction));
    });

    it('split', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const splitStakePubkey = (await Keypair.generate()).publicKey;
        const params = {
            stakePubkey,
            authorizedPubkey,
            splitStakePubkey,
            lamports: 123,
        };
        const transaction = StakeProgram.split(params, 123 /* rentExemptReserve */);
        expect(transaction.instructions).to.have.length(2);
        const [systemInstruction, stakeInstruction] = transaction.instructions;
        const systemParams = {
            fromPubkey: authorizedPubkey,
            newAccountPubkey: splitStakePubkey,
            lamports: 123n,
            space: BigInt(StakeProgram.space),
            programId: StakeProgram.programId,
        };
        expect(systemParams).to.eql(SystemInstruction.decodeCreateAccount(systemInstruction));
        expect(params).to.eql(StakeInstruction.decodeSplit(stakeInstruction));
    });

    [0, undefined, 456].forEach(rentExemptReserve => {
        it(`splitWithSeed (rent reserve: ${rentExemptReserve})`, async () => {
            const stakePubkey = (await Keypair.generate()).publicKey;
            const authorizedPubkey = (await Keypair.generate()).publicKey;
            const lamports = 123;
            const seed = 'test string';
            const basePubkey = (await Keypair.generate()).publicKey;
            const splitStakePubkey = await PublicKey.createWithSeed(basePubkey, seed, StakeProgram.programId);
            const transaction = StakeProgram.splitWithSeed(
                {
                    stakePubkey,
                    authorizedPubkey,
                    lamports,
                    splitStakePubkey,
                    basePubkey,
                    seed,
                },
                rentExemptReserve,
            );
            const hasRentReserve = rentExemptReserve && rentExemptReserve > 0;
            expect(transaction.instructions).to.have.length(hasRentReserve ? 3 : 2);
            const allocateInstruction = transaction.instructions[0];
            const splitInstruction = transaction.instructions[hasRentReserve ? 2 : 1];
            const transferInstruction = hasRentReserve ? transaction.instructions[1] : undefined;
            const allocateParams = {
                accountPubkey: splitStakePubkey,
                basePubkey,
                seed,
                space: BigInt(StakeProgram.space),
                programId: StakeProgram.programId,
            };
            expect(allocateParams).to.eql(SystemInstruction.decodeAllocateWithSeed(allocateInstruction));
            if (hasRentReserve) {
                const transferParams = {
                    fromPubkey: authorizedPubkey,
                    toPubkey: splitStakePubkey,
                    lamports: 456n,
                };
                expect(transferParams).to.eql(SystemInstruction.decodeTransfer(transferInstruction!));
            }
            const splitParams = {
                stakePubkey,
                authorizedPubkey,
                splitStakePubkey,
                lamports,
            };
            expect(splitParams).to.eql(StakeInstruction.decodeSplit(splitInstruction));
        });
    });

    it('merge', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const sourceStakePubKey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const params = {
            stakePubkey,
            sourceStakePubKey,
            authorizedPubkey,
        };
        const transaction = StakeProgram.merge(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeMerge(stakeInstruction));
    });

    it('getMinimumDelegation', () => {
        const stakeInstruction = StakeProgram.getMinimumDelegation();

        expect({}).to.eql(StakeInstruction.decodeGetMinimumDelegation(stakeInstruction));
    });

    it('withdraw', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const toPubkey = (await Keypair.generate()).publicKey;
        const params = {
            stakePubkey,
            authorizedPubkey,
            toPubkey,
            lamports: 123,
        };
        const transaction = StakeProgram.withdraw(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeWithdraw(stakeInstruction));
    });

    it('withdraw with custodian', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const toPubkey = (await Keypair.generate()).publicKey;
        const custodianPubkey = (await Keypair.generate()).publicKey;
        const params = {
            stakePubkey,
            authorizedPubkey,
            toPubkey,
            lamports: 123,
            custodianPubkey,
        };
        const transaction = StakeProgram.withdraw(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeWithdraw(stakeInstruction));
    });

    it('deactivate', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const params = { stakePubkey, authorizedPubkey };
        const transaction = StakeProgram.deactivate(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeDeactivate(stakeInstruction));
    });

    it('deactivateDelinquent', async () => {
        const stakePubkey = (await Keypair.generate()).publicKey;
        const delinquentVotePubkey = (await Keypair.generate()).publicKey;
        const referenceVotePubkey = (await Keypair.generate()).publicKey;
        const params = {
            stakePubkey,
            delinquentVotePubkey,
            referenceVotePubkey,
        };
        const transaction = StakeProgram.deactivateDelinquent(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeDeactivateDelinquent(stakeInstruction));
    });

    it('moveStake', async () => {
        const sourceStakePubkey = (await Keypair.generate()).publicKey;
        const destinationStakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const params = {
            sourceStakePubkey,
            destinationStakePubkey,
            authorizedPubkey,
            lamports: 123n,
        };
        const transaction = StakeProgram.moveStake(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeMoveStake(stakeInstruction));
    });

    it('moveLamports', async () => {
        const sourceStakePubkey = (await Keypair.generate()).publicKey;
        const destinationStakePubkey = (await Keypair.generate()).publicKey;
        const authorizedPubkey = (await Keypair.generate()).publicKey;
        const params = {
            sourceStakePubkey,
            destinationStakePubkey,
            authorizedPubkey,
            lamports: 123n,
        };
        const transaction = StakeProgram.moveLamports(params);
        expect(transaction.instructions).to.have.length(1);
        const [stakeInstruction] = transaction.instructions;
        expect(params).to.eql(StakeInstruction.decodeMoveLamports(stakeInstruction));
    });

    it('StakeInstructions', async () => {
        const from = await Keypair.generate();
        const seed = 'test string';
        const newAccountPubkey = await PublicKey.createWithSeed(from.publicKey, seed, StakeProgram.programId);
        const authorized = await Keypair.generate();
        const amount = 123;
        const recentBlockhash = blockhash('EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k'); // Arbitrary known recentBlockhash
        const createWithSeed = StakeProgram.createAccountWithSeed({
            fromPubkey: from.publicKey,
            stakePubkey: newAccountPubkey,
            basePubkey: from.publicKey,
            seed,
            authorized: new Authorized(authorized.publicKey, authorized.publicKey),
            lockup: new Lockup(0, 0, from.publicKey),
            lamports: amount,
        });
        const createWithSeedTransaction = new Transaction({
            blockhash: recentBlockhash,
            lastValidBlockHeight: 9999,
        }).add(createWithSeed);

        expect(createWithSeedTransaction.instructions).to.have.length(2);
        const systemInstructionType = SystemInstruction.decodeInstructionType(
            createWithSeedTransaction.instructions[0],
        );
        expect(systemInstructionType).to.eq('CreateWithSeed');

        const stakeInstructionType = StakeInstruction.decodeInstructionType(createWithSeedTransaction.instructions[1]);
        expect(stakeInstructionType).to.eq('Initialize');

        expect(() => {
            StakeInstruction.decodeInstructionType(createWithSeedTransaction.instructions[0]);
        }).to.throw();

        const stake = await Keypair.generate();
        const vote = await Keypair.generate();
        const delegate = StakeProgram.delegate({
            stakePubkey: stake.publicKey,
            authorizedPubkey: authorized.publicKey,
            votePubkey: vote.publicKey,
        });

        const delegateTransaction = new Transaction({
            blockhash: recentBlockhash,
            lastValidBlockHeight: 9999,
        }).add(delegate);
        const anotherStakeInstructionType = StakeInstruction.decodeInstructionType(delegateTransaction.instructions[0]);
        expect(anotherStakeInstructionType).to.eq('Delegate');

        const getMinimumDelegationInstruction = StakeProgram.getMinimumDelegation();
        const getMinimumDelegationInstructionType = StakeInstruction.decodeInstructionType(
            getMinimumDelegationInstruction,
        );
        expect(getMinimumDelegationInstructionType).to.eq('GetMinimumDelegation');
    });

    if (process.env.TEST_LIVE) {
        it('live staking actions', async () => {
            const connection = new Connection(url, 'confirmed');
            const [SYSTEM_ACCOUNT_MIN_BALANCE, STAKE_ACCOUNT_MIN_BALANCE, { value: minimumStakeDelegation }] =
                await Promise.all([
                    connection.getMinimumBalanceForRentExemption(0),
                    connection.getMinimumBalanceForRentExemption(StakeProgram.space),
                    connection.getStakeMinimumDelegation(),
                ]);
            const MIN_STAKE_DELEGATION = Number(minimumStakeDelegation);
            const minimumStakeDelegationBigInt = BigInt(MIN_STAKE_DELEGATION);

            const voteAccounts = await connection.getVoteAccounts();
            const voteAccount = voteAccounts.current.concat(voteAccounts.delinquent)[0];
            const votePubkey = new PublicKey(voteAccount.votePubkey);

            const payer = await Keypair.generate();
            await helpers.airdrop({
                connection,
                address: payer.publicKey,
                amount: 10 * LAMPORTS_PER_SOL,
            });

            const authorized = await Keypair.generate();
            await helpers.airdrop({
                connection,
                address: authorized.publicKey,
                amount: 2 * LAMPORTS_PER_SOL,
            });

            const recipient = await Keypair.generate();
            await helpers.airdrop({
                connection,
                address: recipient.publicKey,
                amount: SYSTEM_ACCOUNT_MIN_BALANCE,
            });

            {
                // Create Stake account without seed
                const newStakeAccount = await Keypair.generate();
                const createAndInitialize = StakeProgram.createAccount({
                    fromPubkey: payer.publicKey,
                    stakePubkey: newStakeAccount.publicKey,
                    authorized: new Authorized(authorized.publicKey, authorized.publicKey),
                    lamports: Number(STAKE_ACCOUNT_MIN_BALANCE + minimumStakeDelegationBigInt),
                });

                await sendAndConfirmTransaction(connection, createAndInitialize, [payer, newStakeAccount], {
                    preflightCommitment: 'confirmed',
                });
                expect(await connection.getBalance(newStakeAccount.publicKey)).to.eq(
                    STAKE_ACCOUNT_MIN_BALANCE + minimumStakeDelegationBigInt,
                );

                const delegation = StakeProgram.delegate({
                    stakePubkey: newStakeAccount.publicKey,
                    authorizedPubkey: authorized.publicKey,
                    votePubkey,
                });
                await sendAndConfirmTransaction(connection, delegation, [authorized], {
                    commitment: 'confirmed',
                });
            }

            // Create Stake account with seed
            const seed = 'test string';
            const newAccountPubkey = await PublicKey.createWithSeed(payer.publicKey, seed, StakeProgram.programId);

            const WITHDRAW_AMOUNT = 1;
            const INITIAL_STAKE_DELEGATION = 5 * LAMPORTS_PER_SOL;
            const withdrawAmountBigInt = BigInt(WITHDRAW_AMOUNT);
            const createAndInitializeWithSeed = StakeProgram.createAccountWithSeed({
                fromPubkey: payer.publicKey,
                stakePubkey: newAccountPubkey,
                basePubkey: payer.publicKey,
                seed,
                authorized: new Authorized(authorized.publicKey, authorized.publicKey),
                lockup: new Lockup(0, 0, new PublicKey(0)),
                lamports: Number(STAKE_ACCOUNT_MIN_BALANCE + BigInt(INITIAL_STAKE_DELEGATION)),
            });

            await sendAndConfirmTransaction(connection, createAndInitializeWithSeed, [payer], {
                preflightCommitment: 'confirmed',
            });
            const originalStakeBalance = await connection.getBalance(newAccountPubkey);
            expect(originalStakeBalance).to.eq(STAKE_ACCOUNT_MIN_BALANCE + BigInt(INITIAL_STAKE_DELEGATION));

            const delegation = StakeProgram.delegate({
                stakePubkey: newAccountPubkey,
                authorizedPubkey: authorized.publicKey,
                votePubkey,
            });
            await sendAndConfirmTransaction(connection, delegation, [authorized], {
                preflightCommitment: 'confirmed',
            });

            // Test that withdraw fails before deactivation
            let withdraw = StakeProgram.withdraw({
                stakePubkey: newAccountPubkey,
                authorizedPubkey: authorized.publicKey,
                toPubkey: recipient.publicKey,
                lamports: WITHDRAW_AMOUNT,
            });
            await expect(
                sendAndConfirmTransaction(connection, withdraw, [authorized], {
                    preflightCommitment: 'confirmed',
                }),
            ).to.be.rejected;

            // Deactivate stake
            const deactivate = StakeProgram.deactivate({
                stakePubkey: newAccountPubkey,
                authorizedPubkey: authorized.publicKey,
            });
            await sendAndConfirmTransaction(connection, deactivate, [authorized], {
                preflightCommitment: 'confirmed',
            });

            // Test that withdraw succeeds after deactivation
            // Deactivation can take time, so retry withdrawal until it lands.

            while (true) {
                withdraw = StakeProgram.withdraw({
                    stakePubkey: newAccountPubkey,
                    authorizedPubkey: authorized.publicKey,
                    toPubkey: recipient.publicKey,
                    lamports: WITHDRAW_AMOUNT,
                });

                try {
                    await sendAndConfirmTransaction(connection, withdraw, [authorized], {
                        preflightCommitment: 'confirmed',
                    });
                    break;
                } catch (_error) {
                    await sleep(400);
                }
            }

            const recipientBalance = await connection.getBalance(recipient.publicKey);
            expect(recipientBalance).to.eq(SYSTEM_ACCOUNT_MIN_BALANCE + withdrawAmountBigInt);

            // Split stake
            const newStake = await Keypair.generate();
            let split = StakeProgram.split(
                {
                    stakePubkey: newAccountPubkey,
                    authorizedPubkey: authorized.publicKey,
                    splitStakePubkey: newStake.publicKey,
                    lamports: MIN_STAKE_DELEGATION,
                },
                Number(STAKE_ACCOUNT_MIN_BALANCE),
            );
            await sendAndConfirmTransaction(connection, split, [authorized, newStake], {
                preflightCommitment: 'confirmed',
            });
            const balance = await connection.getBalance(newStake.publicKey);
            expect(balance).to.eq(STAKE_ACCOUNT_MIN_BALANCE + minimumStakeDelegationBigInt);

            // Split stake with seed
            const seed2 = 'test string 2';
            const newStake2 = await PublicKey.createWithSeed(payer.publicKey, seed2, StakeProgram.programId);
            const splitWithSeed = StakeProgram.splitWithSeed(
                {
                    stakePubkey: newAccountPubkey,
                    authorizedPubkey: authorized.publicKey,
                    lamports: MIN_STAKE_DELEGATION,
                    splitStakePubkey: newStake2,
                    basePubkey: payer.publicKey,
                    seed: seed2,
                },
                Number(STAKE_ACCOUNT_MIN_BALANCE),
            );
            await sendAndConfirmTransaction(connection, splitWithSeed, [payer, authorized], {
                preflightCommitment: 'confirmed',
            });
            expect(await connection.getBalance(newStake2)).to.eq(
                STAKE_ACCOUNT_MIN_BALANCE + minimumStakeDelegationBigInt,
            );

            // Merge stake
            const preMergeBalance = await connection.getBalance(newAccountPubkey);
            const merge = StakeProgram.merge({
                stakePubkey: newAccountPubkey,
                sourceStakePubKey: newStake.publicKey,
                authorizedPubkey: authorized.publicKey,
            });
            await sendAndConfirmTransaction(connection, merge, [authorized], {
                preflightCommitment: 'confirmed',
            });
            const postMergeBalance = await connection.getBalance(newAccountPubkey);
            expect(postMergeBalance - preMergeBalance).to.eq(STAKE_ACCOUNT_MIN_BALANCE + minimumStakeDelegationBigInt);

            // Resplit
            split = StakeProgram.split(
                {
                    stakePubkey: newAccountPubkey,
                    authorizedPubkey: authorized.publicKey,
                    splitStakePubkey: newStake.publicKey,
                    // use a different amount than the first split so that this
                    // transaction is different and won't require a fresh blockhash
                    lamports: MIN_STAKE_DELEGATION,
                },
                Number(STAKE_ACCOUNT_MIN_BALANCE),
            );
            await sendAndConfirmTransaction(connection, split, [authorized, newStake], {
                preflightCommitment: 'confirmed',
            });

            // Authorize to new account
            const newAuthorized = await Keypair.generate();
            await connection.requestAirdrop(newAuthorized.publicKey, LAMPORTS_PER_SOL);

            let authorize = StakeProgram.authorize({
                stakePubkey: newAccountPubkey,
                authorizedPubkey: authorized.publicKey,
                newAuthorizedPubkey: newAuthorized.publicKey,
                stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
            });
            await sendAndConfirmTransaction(connection, authorize, [authorized], {
                preflightCommitment: 'confirmed',
            });
            authorize = StakeProgram.authorize({
                stakePubkey: newAccountPubkey,
                authorizedPubkey: authorized.publicKey,
                newAuthorizedPubkey: newAuthorized.publicKey,
                stakeAuthorizationType: StakeAuthorizationLayout.Staker,
            });
            await sendAndConfirmTransaction(connection, authorize, [authorized], {
                preflightCommitment: 'confirmed',
            });

            // Test old authorized can't delegate
            const delegateNotAuthorized = StakeProgram.delegate({
                stakePubkey: newAccountPubkey,
                authorizedPubkey: authorized.publicKey,
                votePubkey,
            });
            await expect(
                sendAndConfirmTransaction(connection, delegateNotAuthorized, [authorized], {
                    preflightCommitment: 'confirmed',
                }),
            ).to.be.rejected;

            // Test accounts with different authorities can't be merged
            const mergeNotAuthorized = StakeProgram.merge({
                stakePubkey: newStake.publicKey,
                sourceStakePubKey: newAccountPubkey,
                authorizedPubkey: authorized.publicKey,
            });
            await expect(
                sendAndConfirmTransaction(connection, mergeNotAuthorized, [authorized], {
                    preflightCommitment: 'confirmed',
                }),
            ).to.be.rejected;

            // Authorize a derived address
            authorize = StakeProgram.authorize({
                stakePubkey: newAccountPubkey,
                authorizedPubkey: newAuthorized.publicKey,
                newAuthorizedPubkey: newAccountPubkey,
                stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
            });
            await sendAndConfirmTransaction(connection, authorize, [newAuthorized], {
                preflightCommitment: 'confirmed',
            });

            // Restore the previous authority using a derived address
            authorize = StakeProgram.authorizeWithSeed({
                stakePubkey: newAccountPubkey,
                authorityBase: payer.publicKey,
                authoritySeed: seed,
                authorityOwner: StakeProgram.programId,
                newAuthorizedPubkey: newAuthorized.publicKey,
                stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
            });
            await sendAndConfirmTransaction(connection, authorize, [payer], {
                preflightCommitment: 'confirmed',
            });
        }).timeout(30 * 1000);
    }
});
