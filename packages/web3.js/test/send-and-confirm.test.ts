import { expect, use } from 'chai';
import { SinonStub, stub } from 'sinon';
import sinonChai from 'sinon-chai';

import { Connection, Transaction, sendAndConfirmRawTransaction, sendAndConfirmTransaction } from '../src';
import type { ConfirmOptions } from '../src';
import { url } from './url';

use(sinonChai);

describe('send and confirm helpers', function () {
    let connection: Connection;
    let confirmTransactionStub: SinonStub;

    beforeEach(() => {
        connection = new Connection(url, 'confirmed');
        confirmTransactionStub = stub(connection, 'confirmTransaction').resolves({
            context: { slot: 0n },
            value: { err: null },
        });
    });

    describe('sendAndConfirmTransaction', function () {
        let sendTransactionStub: SinonStub;

        beforeEach(() => {
            sendTransactionStub = stub(connection, 'sendTransaction').resolves('mock-signature');
        });

        it('confirms at the connection commitment when no commitment is supplied', async () => {
            await sendAndConfirmTransaction(connection, new Transaction(), []);

            expect(confirmTransactionStub).to.have.been.calledWithExactly('mock-signature', 'confirmed');
        });

        it('confirms at `finalized` when neither the options nor the connection specify a commitment', async () => {
            const bareConnection = new Connection(url);
            const bareConfirmStub = stub(bareConnection, 'confirmTransaction').resolves({
                context: { slot: 0n },
                value: { err: null },
            });
            stub(bareConnection, 'sendTransaction').resolves('mock-signature');

            await sendAndConfirmTransaction(bareConnection, new Transaction(), []);

            expect(bareConfirmStub).to.have.been.calledWithExactly('mock-signature', 'finalized');
        });

        it('confirms at the commitment supplied at call time even when the options are mutated mid-flight', async () => {
            const options: ConfirmOptions = { commitment: 'finalized' };
            sendTransactionStub.callsFake(async () => {
                await Promise.resolve();
                options.commitment = 'processed';
                return 'mock-signature';
            });

            await sendAndConfirmTransaction(connection, new Transaction(), [], options);

            expect(confirmTransactionStub).to.have.been.calledWithExactly('mock-signature', 'finalized');
        });
    });

    describe('sendAndConfirmRawTransaction', function () {
        let sendRawTransactionStub: SinonStub;

        beforeEach(() => {
            sendRawTransactionStub = stub(connection, 'sendRawTransaction').resolves('mock-signature');
        });

        it('confirms at the connection commitment when no commitment is supplied', async () => {
            await sendAndConfirmRawTransaction(connection, new Uint8Array([1, 2, 3]));

            expect(confirmTransactionStub).to.have.been.calledWithExactly('mock-signature', 'confirmed');
        });

        it('confirms at `finalized` when neither the options nor the connection specify a commitment', async () => {
            const bareConnection = new Connection(url);
            const bareConfirmStub = stub(bareConnection, 'confirmTransaction').resolves({
                context: { slot: 0n },
                value: { err: null },
            });
            stub(bareConnection, 'sendRawTransaction').resolves('mock-signature');

            await sendAndConfirmRawTransaction(bareConnection, new Uint8Array([1, 2, 3]));

            expect(bareConfirmStub).to.have.been.calledWithExactly('mock-signature', 'finalized');
        });

        it('confirms at the commitment supplied at call time even when the options are mutated mid-flight', async () => {
            const options: ConfirmOptions = { commitment: 'finalized' };
            sendRawTransactionStub.callsFake(async () => {
                await Promise.resolve();
                options.commitment = 'processed';
                return 'mock-signature';
            });

            await sendAndConfirmRawTransaction(connection, new Uint8Array([1, 2, 3]), options);

            expect(confirmTransactionStub).to.have.been.calledWithExactly('mock-signature', 'finalized');
        });
    });
});
