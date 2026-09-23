import {
    assertIsTransactionPartialSigner,
    assertIsTransactionWithinSizeLimit,
    getCompiledTransactionMessageDecoder,
    getTransactionLifetimeConstraintFromCompiledTransactionMessage,
    signatureBytes,
    type Transaction as KitTransaction,
    type TransactionPartialSigner,
    type TransactionWithLifetime,
} from '@solana/kit';

import { PublicKey } from '../publickey';
import { SIGNATURE_LENGTH_IN_BYTES } from '../transaction/constants';
import invariant from '../utils/assert';
import { toPackedUint8Array } from '../utils/typed-array';
import { asTransactionMessageBytes } from './brand';

const COMPILED_TRANSACTION_MESSAGE_DECODER = getCompiledTransactionMessageDecoder();

/** @internal */
export type RequiredSignature = Readonly<{
    publicKey: PublicKey;
    signature: Uint8Array | null;
}>;

/**
 * Sign the serialized bytes of a legacy or versioned transaction message by
 * calling `signTransactions` on each `TransactionPartialSigner` directly.
 *
 * Partial signers are used exclusively (rather than
 * `partiallySignTransactionWithSigners`) so that a signer which also
 * implements `TransactionModifyingSigner` can never alter the message and
 * produce signatures over bytes other than the ones supplied.
 *
 * The lifetime is derived from the compiled message itself (durable nonce or
 * blockhash). A blockhash lifetime's `lastValidBlockHeight` can be supplied by
 * the caller; otherwise Kit's maximum-height default applies.
 *
 * `requiredSignatures` seeds the signature dictionary with the
 * signatures the caller already holds, so signers can observe them.
 *
 * Returns the signatures present after signing, keyed by base58 signer
 * address. Addresses that remain unsigned are absent from the result.
 *
 * @internal
 */
export async function signTransactionBytesWithSigners(
    signers: ReadonlyArray<TransactionPartialSigner>,
    messageBytes: Uint8Array,
    requiredSignatures: ReadonlyArray<RequiredSignature>,
    lastValidBlockHeight?: bigint,
): Promise<Readonly<Record<string, Uint8Array>>> {
    signers.forEach(signer => assertIsTransactionPartialSigner(signer));
    const dedupedSigners = dedupeSignersByAddress(signers);

    const packedMessageBytes = toPackedUint8Array(messageBytes);
    const signatures: KitTransaction['signatures'] = {};
    for (const { publicKey, signature } of requiredSignatures) {
        signatures[publicKey.toBase58()] =
            signature != null && !isAllZeroSignature(signature) ? signatureBytes(signature) : null;
    }

    const transaction = {
        lifetimeConstraint: await getLifetimeConstraint(packedMessageBytes, lastValidBlockHeight),
        messageBytes: asTransactionMessageBytes(packedMessageBytes),
        signatures,
    } satisfies KitTransaction & TransactionWithLifetime;
    assertIsTransactionWithinSizeLimit(transaction);

    const signatureDictionaries = await Promise.all(
        dedupedSigners.map(async signer => {
            const [dictionary] = await signer.signTransactions([transaction]);
            return dictionary;
        }),
    );
    const signedSignatures = signatureDictionaries.reduce<KitTransaction['signatures']>(
        (merged, dictionary) => ({ ...merged, ...dictionary }),
        signatures,
    );

    const result: Record<string, Uint8Array> = {};
    for (const [address, signature] of Object.entries(signedSignatures)) {
        if (signature == null) {
            continue;
        }
        invariant(signature.byteLength === SIGNATURE_LENGTH_IN_BYTES, 'Signature must be 64 bytes long');
        result[address] = Uint8Array.from(signature);
    }
    return result;
}

/**
 * Keep the first signer supplied for each address so that callers may pass
 */
function dedupeSignersByAddress(
    signers: ReadonlyArray<TransactionPartialSigner>,
): ReadonlyArray<TransactionPartialSigner> {
    const seen = new Set<string>();
    return signers.filter(signer => {
        if (seen.has(signer.address)) {
            return false;
        }
        seen.add(signer.address);
        return true;
    });
}

async function getLifetimeConstraint(
    messageBytes: Uint8Array,
    lastValidBlockHeight?: bigint,
): Promise<TransactionWithLifetime['lifetimeConstraint']> {
    const lifetimeConstraint = await getTransactionLifetimeConstraintFromCompiledTransactionMessage(
        COMPILED_TRANSACTION_MESSAGE_DECODER.decode(messageBytes),
    );
    if ('blockhash' in lifetimeConstraint && lastValidBlockHeight != null) {
        return { ...lifetimeConstraint, lastValidBlockHeight };
    }
    return lifetimeConstraint;
}

function isAllZeroSignature(signature: Uint8Array): boolean {
    return signature.every(byte => byte === 0);
}
