import { getStructEncoder, getU16Encoder, getU8Encoder } from '@solana/kit';

import { Keypair } from '../keypair';
import { PublicKey } from '../publickey';
import { TransactionInstruction } from '../transaction';
import assert from '../utils/assert';
import { sign } from '../utils/ed25519';

const PRIVATE_KEY_BYTES = 64;
const PUBLIC_KEY_BYTES = 32;
const SIGNATURE_BYTES = 64;

/**
 * Params for creating an ed25519 instruction using a public key
 */
export type CreateEd25519InstructionWithPublicKeyParams = {
    publicKey: Uint8Array;
    message: Uint8Array;
    signature: Uint8Array;
    instructionIndex?: number;
};

/**
 * Params for creating an ed25519 instruction using a private key
 */
export type CreateEd25519InstructionWithPrivateKeyParams = {
    privateKey: Uint8Array;
    message: Uint8Array;
    instructionIndex?: number;
};

const ED25519_INSTRUCTION_HEADER_ENCODER = getStructEncoder([
    ['numSignatures', getU8Encoder()],
    ['padding', getU8Encoder()],
    ['signatureOffset', getU16Encoder()],
    ['signatureInstructionIndex', getU16Encoder()],
    ['publicKeyOffset', getU16Encoder()],
    ['publicKeyInstructionIndex', getU16Encoder()],
    ['messageDataOffset', getU16Encoder()],
    ['messageDataSize', getU16Encoder()],
    ['messageInstructionIndex', getU16Encoder()],
]);

export class Ed25519Program {
    /**
     * @internal
     */
    constructor() {}

    /**
     * Public key that identifies the ed25519 program
     */
    static programId: PublicKey = new PublicKey('Ed25519SigVerify111111111111111111111111111');

    /**
     * Create an ed25519 instruction with a public key and signature. The
     * public key must be 32 bytes long, and the signature must be 64 bytes
     * long.
     */
    static createInstructionWithPublicKey(params: CreateEd25519InstructionWithPublicKeyParams): TransactionInstruction {
        const { publicKey, message, signature, instructionIndex } = params;

        assert(
            publicKey.length === PUBLIC_KEY_BYTES,
            `Public Key must be ${PUBLIC_KEY_BYTES} bytes but received ${publicKey.length} bytes`,
        );

        assert(
            signature.length === SIGNATURE_BYTES,
            `Signature must be ${SIGNATURE_BYTES} bytes but received ${signature.length} bytes`,
        );

        const publicKeyOffset = ED25519_INSTRUCTION_HEADER_ENCODER.fixedSize;
        const signatureOffset = publicKeyOffset + publicKey.length;
        const messageDataOffset = signatureOffset + signature.length;
        const numSignatures = 1;

        const index =
            instructionIndex == null
                ? 0xffff // An index of `u16::MAX` makes it default to the current instruction.
                : instructionIndex;

        const instructionData = new Uint8Array(messageDataOffset + message.length);

        ED25519_INSTRUCTION_HEADER_ENCODER.write(
            {
                numSignatures,
                padding: 0,
                signatureOffset,
                signatureInstructionIndex: index,
                publicKeyOffset,
                publicKeyInstructionIndex: index,
                messageDataOffset,
                messageDataSize: message.length,
                messageInstructionIndex: index,
            },
            instructionData,
            0,
        );

        instructionData.set(publicKey, publicKeyOffset);
        instructionData.set(signature, signatureOffset);
        instructionData.set(message, messageDataOffset);

        return new TransactionInstruction({
            keys: [],
            programId: Ed25519Program.programId,
            data: instructionData,
        });
    }

    /**
     * Create an ed25519 instruction with a private key. The private key
     * must be 64 bytes long.
     */
    static async createInstructionWithPrivateKey(
        params: CreateEd25519InstructionWithPrivateKeyParams,
    ): Promise<TransactionInstruction> {
        const { privateKey, message, instructionIndex } = params;

        assert(
            privateKey.length === PRIVATE_KEY_BYTES,
            `Private key must be ${PRIVATE_KEY_BYTES} bytes but received ${privateKey.length} bytes`,
        );

        try {
            const keypair = await Keypair.fromSecretKey(privateKey);
            const publicKey = await keypair.publicKey.toBytes();
            const signature = await sign(message, privateKey);

            return this.createInstructionWithPublicKey({
                publicKey,
                message,
                signature,
                instructionIndex,
            });
        } catch (error) {
            throw new Error(`Error creating instruction; ${error}`);
        }
    }
}
