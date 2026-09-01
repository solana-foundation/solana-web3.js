import { getStructCodec, getU32Codec } from '@solana/kit';

import type { Connection } from './connection';
import type { Signer } from './keypair';
import { getSignerPublicKey } from './kit-adapters/signing';
import { SystemProgram } from './programs/system';
import { PublicKey } from './publickey';
import { SYSVAR_RENT_PUBKEY } from './sysvar';
import { MS_PER_SLOT } from './timing';
import { Transaction, PACKET_DATA_SIZE } from './transaction';
import { sendAndConfirmTransaction } from './utils/send-and-confirm-transaction';
import { sleep } from './utils/sleep';
import { toUint8ArrayView } from './utils/typed-array';

// Keep program chunks under PACKET_DATA_SIZE, leaving enough room for the
// rest of the Transaction fields
//
// TODO: replace 300 with a proper constant for the size of the other
// Transaction fields
const CHUNK_SIZE = PACKET_DATA_SIZE - 300;
const U32_CODEC = getU32Codec();
const LOAD_INSTRUCTION_HEADER_CODEC = getStructCodec([
    ['instruction', U32_CODEC],
    ['offset', U32_CODEC],
    ['bytesLength', U32_CODEC],
    ['bytesLengthPadding', U32_CODEC],
]);
const FINALIZE_INSTRUCTION_CODEC = getStructCodec([['instruction', U32_CODEC]]);

type LoadInstructionChunk = Readonly<{
    instruction: number;
    offset: number;
    bytes: Uint8Array;
    chunkSize: number;
    bytesLengthPadding?: number;
}>;

const encodeLoadInstructionChunk = ({
    instruction,
    offset,
    bytes,
    chunkSize,
    bytesLengthPadding = 0,
}: LoadInstructionChunk): Uint8Array => {
    if (bytes.length > chunkSize) {
        throw new Error('instruction data exceeds chunk size');
    }

    const header = LOAD_INSTRUCTION_HEADER_CODEC.encode({
        instruction,
        offset,
        bytesLength: bytes.length,
        bytesLengthPadding,
    });
    const data = new Uint8Array(header.length + chunkSize);
    data.set(header, 0);
    data.set(bytes, header.length);
    return data;
};

/**
 * Program loader interface
 */
export class Loader {
    /**
     * @internal
     */
    constructor() {}

    /**
     * Amount of program data placed in each load Transaction
     */
    static chunkSize: number = CHUNK_SIZE;

    /**
     * Minimum number of signatures required to load a program not including
     * retries
     *
     * Can be used to calculate transaction fees
     */
    static getMinNumSignatures(dataLength: number): number {
        return (
            2 * // Every transaction requires two signatures (payer + program)
            (Math.ceil(dataLength / Loader.chunkSize) +
                1 + // Add one for Create transaction
                1) // Add one for Finalize transaction
        );
    }

    /**
     * Loads a generic program
     *
     * @param connection The connection to use
     * @param payer System account that pays to load the program
     * @param program Account to load the program into
     * @param programId Public key that identifies the loader
     * @param data Program octets
     * @return true if program was loaded successfully, false if program was already loaded
     */
    static async load(
        connection: Connection,
        payer: Signer,
        program: Signer,
        programId: PublicKey,
        data: Uint8Array | Array<number>,
    ): Promise<boolean> {
        const payerPubkey = getSignerPublicKey(payer);
        const programPubkey = getSignerPublicKey(program);
        {
            const balanceNeeded = await connection.getMinimumBalanceForRentExemption(data.length);

            // Fetch program account info to check if it has already been created
            const programInfo = await connection.getAccountInfo(programPubkey, 'confirmed');

            let transaction: Transaction | null = null;
            if (programInfo !== null) {
                if (programInfo.executable) {
                    console.error('Program load failed, account is already executable');
                    return false;
                }

                if (programInfo.data.length !== data.length) {
                    transaction = transaction || new Transaction();
                    transaction.add(
                        SystemProgram.allocate({
                            accountPubkey: programPubkey,
                            space: data.length,
                        }),
                    );
                }

                if (!programInfo.owner.equals(programId)) {
                    transaction = transaction || new Transaction();
                    transaction.add(
                        SystemProgram.assign({
                            accountPubkey: programPubkey,
                            programId,
                        }),
                    );
                }

                if (programInfo.lamports < BigInt(balanceNeeded)) {
                    transaction = transaction || new Transaction();
                    transaction.add(
                        SystemProgram.transfer({
                            fromPubkey: payerPubkey,
                            toPubkey: programPubkey,
                            lamports: BigInt(balanceNeeded) - programInfo.lamports,
                        }),
                    );
                }
            } else {
                transaction = new Transaction().add(
                    SystemProgram.createAccount({
                        fromPubkey: payerPubkey,
                        newAccountPubkey: programPubkey,
                        lamports: Number(balanceNeeded > 0 ? balanceNeeded : 1),
                        space: data.length,
                        programId,
                    }),
                );
            }

            // If the account is already created correctly, skip this step
            // and proceed directly to loading instructions
            if (transaction !== null) {
                await sendAndConfirmTransaction(connection, transaction, [payer, program], {
                    commitment: 'confirmed',
                });
            }
        }

        const chunkSize = Loader.chunkSize;
        let offset = 0;
        let bytesRemaining = toUint8ArrayView(data);
        const transactions = [];
        while (bytesRemaining.length > 0) {
            const bytes = bytesRemaining.subarray(0, chunkSize);
            const data = encodeLoadInstructionChunk({
                instruction: 0, // Load instruction
                offset,
                bytes,
                chunkSize,
            });

            const transaction = new Transaction().add({
                keys: [
                    {
                        pubkey: programPubkey,
                        isSigner: true,
                        isWritable: true,
                    },
                ],
                programId,
                data,
            });
            transactions.push(
                sendAndConfirmTransaction(connection, transaction, [payer, program], {
                    commitment: 'confirmed',
                }),
            );

            // Delay between sends in an attempt to reduce rate limit errors
            if (connection._rpcEndpoint.includes('solana.com')) {
                const REQUESTS_PER_SECOND = 4;
                await sleep(1000 / REQUESTS_PER_SECOND);
            }

            offset += chunkSize;
            bytesRemaining = bytesRemaining.subarray(chunkSize);
        }
        await Promise.all(transactions);

        // Finalize the account loaded with program data for execution
        {
            const data = toUint8ArrayView(
                FINALIZE_INSTRUCTION_CODEC.encode({
                    instruction: 1, // Finalize instruction
                }),
            );

            const transaction = new Transaction().add({
                keys: [
                    { pubkey: programPubkey, isSigner: true, isWritable: true },
                    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
                ],
                programId,
                data,
            });
            const deployCommitment = 'processed';
            const finalizeSignature = await connection.sendTransaction(transaction, [payer, program], {
                preflightCommitment: deployCommitment,
            });
            const { context, value } = await connection.confirmTransaction(
                {
                    signature: finalizeSignature,
                    lastValidBlockHeight: transaction.lastValidBlockHeight!,
                    blockhash: transaction.recentBlockhash!,
                },
                deployCommitment,
            );
            if (value.err) {
                throw new Error(`Transaction ${finalizeSignature} failed (${JSON.stringify(value)})`);
            }
            // We prevent programs from being usable until the slot after their deployment.
            // See https://github.com/solana-labs/solana/pull/29654
            while (true) {
                try {
                    const currentSlot = await connection.getSlot({
                        commitment: deployCommitment,
                    });
                    if (currentSlot > context.slot) {
                        break;
                    }
                } catch {
                    /* empty */
                }
                await new Promise(resolve => setTimeout(resolve, Math.round(MS_PER_SLOT / 2)));
            }
        }

        // success
        return true;
    }
}
