import { getBase58Encoder } from '@solana/kit';
import { expect } from 'chai';

import { Connection, SystemProgram, Transaction, PublicKey, Keypair, NonceAccount } from '../src';
import { NONCE_ACCOUNT_LENGTH } from '../src/nonce-account';
import { helpers, mockRpcResponse, mockServer } from './mocks/rpc-http';
import { stubSubscriptions, restoreSubscriptions } from './mocks/rpc-subscriptions';
import { MOCK_PORT, url } from './url';
import { getUniqueAddress } from './utils/address';

const BASE58_ENCODER = getBase58Encoder();

const expectedData = async (authorizedPubkey: PublicKey): Promise<[string, string]> => {
    const expectedData = new Uint8Array(NONCE_ACCOUNT_LENGTH);
    const view = new DataView(expectedData.buffer, expectedData.byteOffset, expectedData.byteLength);
    view.setInt32(0, 0, true); // Version, 4 bytes
    view.setInt32(4, 1, true); // State, 4 bytes
    expectedData.set(authorizedPubkey.toBytes(), 8); // authorizedPubkey, 32 bytes
    const mockNonce = await Keypair.generate();
    expectedData.set(mockNonce.publicKey.toBytes(), 40); // Hash, 32 bytes
    view.setUint16(72, 5000, true); // feeCalculator, 8 bytes
    return [Buffer.from(expectedData).toString('base64'), 'base64'];
};

describe('Nonce', function () {
    let connection: Connection;
    beforeEach(() => {
        if (!mockServer) {
            connection = new Connection(url);
        }
    });

    if (mockServer) {
        const server = mockServer;
        beforeEach(() => {
            server.start(MOCK_PORT);
            connection = stubSubscriptions(url);
        });

        afterEach(async () => {
            server.stop();
            await restoreSubscriptions(connection);
        });
    }

    it('fromAccountData accepts sliced Uint8Array input', async () => {
        const authority = getUniqueAddress();
        const [base64Data] = await expectedData(authority);
        const accountData = Buffer.from(base64Data, 'base64');
        const paddedAccountData = new Uint8Array(accountData.length + 7);
        paddedAccountData.set(accountData, 3);

        const parsed = NonceAccount.fromAccountData(paddedAccountData.subarray(3, 3 + accountData.length));

        expect(parsed.authorizedPubkey).to.eql(authority);
        expect(parsed.feeCalculator.lamportsPerSignature).to.eq(5000);
        expect(BASE58_ENCODER.encode(parsed.nonce).length).to.be.greaterThan(30);
    });

    it('fromAccountData accepts Array<number> input', async () => {
        const authority = getUniqueAddress();
        const [base64Data] = await expectedData(authority);
        const accountData = Buffer.from(base64Data, 'base64');

        const parsed = NonceAccount.fromAccountData(Array.from(accountData));

        expect(parsed.authorizedPubkey).to.eql(authority);
        expect(parsed.feeCalculator.lamportsPerSignature).to.eq(5000);
        expect(BASE58_ENCODER.encode(parsed.nonce).length).to.be.greaterThan(30);
    });

    it('create and query nonce account', async () => {
        const from = await Keypair.generate();
        const nonceAccount = await Keypair.generate();

        await mockRpcResponse({
            method: 'getMinimumBalanceForRentExemption',
            params: [NONCE_ACCOUNT_LENGTH],
            value: 50,
        });

        const minimumAmount = await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH);

        await helpers.airdrop({
            connection,
            address: from.publicKey,
            amount: minimumAmount * 2n,
        });

        const transaction = new Transaction().add(
            SystemProgram.createNonceAccount({
                fromPubkey: from.publicKey,
                noncePubkey: nonceAccount.publicKey,
                authorizedPubkey: from.publicKey,
                lamports: Number(minimumAmount),
            }),
        );

        await helpers.processTransaction({
            connection,
            transaction,
            signers: [from, nonceAccount],
            commitment: 'confirmed',
        });

        await mockRpcResponse({
            method: 'getAccountInfo',
            params: [nonceAccount.publicKey.toBase58(), { encoding: 'base64', commitment: 'confirmed' }],
            value: {
                owner: '11111111111111111111111111111111',
                lamports: Number(minimumAmount),
                data: await expectedData(from.publicKey),
                executable: false,
                rentEpoch: 20,
            },
            withContext: true,
        });

        const nonceAccountData = await connection.getNonce(nonceAccount.publicKey, 'confirmed');
        if (nonceAccountData === null) {
            expect(nonceAccountData).not.to.be.null;
            return;
        }
        expect(nonceAccountData.authorizedPubkey).to.eql(from.publicKey);
        expect(BASE58_ENCODER.encode(nonceAccountData.nonce).length).to.be.greaterThan(30);
    });

    it('create and query nonce account with seed', async () => {
        const from = await Keypair.generate();
        const seed = 'seed';
        const noncePubkey = await PublicKey.createWithSeed(from.publicKey, seed, SystemProgram.programId);

        await mockRpcResponse({
            method: 'getMinimumBalanceForRentExemption',
            params: [NONCE_ACCOUNT_LENGTH],
            value: 50,
        });

        const minimumAmount = await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH);

        await helpers.airdrop({
            connection,
            address: from.publicKey,
            amount: minimumAmount * 2n,
        });

        const transaction = new Transaction().add(
            SystemProgram.createNonceAccount({
                fromPubkey: from.publicKey,
                noncePubkey: noncePubkey,
                basePubkey: from.publicKey,
                seed,
                authorizedPubkey: from.publicKey,
                lamports: Number(minimumAmount),
            }),
        );

        await helpers.processTransaction({
            connection,
            transaction,
            signers: [from],
            commitment: 'confirmed',
        });

        await mockRpcResponse({
            method: 'getAccountInfo',
            params: [noncePubkey.toBase58(), { encoding: 'base64', commitment: 'confirmed' }],
            value: {
                owner: '11111111111111111111111111111111',
                lamports: Number(minimumAmount),
                data: await expectedData(from.publicKey),
                executable: false,
                rentEpoch: 20,
            },
            withContext: true,
        });

        const nonceAccountData = await connection.getNonce(noncePubkey, 'confirmed');
        if (nonceAccountData === null) {
            expect(nonceAccountData).not.to.be.null;
            return;
        }
        expect(nonceAccountData.authorizedPubkey).to.eql(from.publicKey);
        expect(BASE58_ENCODER.encode(nonceAccountData.nonce).length).to.be.greaterThan(30);
    });
});
