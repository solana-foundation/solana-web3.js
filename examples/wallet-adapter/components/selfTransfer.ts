import { PublicKey, SystemProgram } from '@solana/web3.js';

export function selfTransferInstruction(publicKey: PublicKey) {
    return SystemProgram.transfer({
        fromPubkey: publicKey,
        lamports: 0n,
        toPubkey: publicKey,
    });
}
