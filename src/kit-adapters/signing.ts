import {
  assertIsTransactionWithinSizeLimit,
  createSignableMessage,
  type Address as KitAddress,
  isMessagePartialSigner,
  isTransactionPartialSigner,
  type MessagePartialSigner,
  signatureBytes,
  type Transaction as KitTransaction,
  type TransactionPartialSigner,
  type TransactionWithLifetime,
} from '@solana/kit';

import {Address} from '../address';
import type {Signer} from '../keypair';
import {SIGNATURE_LENGTH_IN_BYTES} from '../transaction/constants';
import {toPackedUint8Array} from '../utils/typed-array';
import {asTransactionMessageBytes} from './brand';

type SignableTransaction = Parameters<
  TransactionPartialSigner['signTransactions']
>[0][number];

type SignaturePair = Readonly<{
  publicKey: Address;
  signature?: Uint8Array | null;
}>;

type SigningStrategy =
  | {
      kind: 'kit-tx';
      signer: TransactionPartialSigner;
      address: KitAddress;
      lifetime: TransactionWithLifetime['lifetimeConstraint'];
    }
  | {
      kind: 'kit-msg';
      signer: MessagePartialSigner;
      address: KitAddress;
    };

/** @internal */
export function getSignerPublicKey(signer: Signer): Address {
  return new Address(signer.address);
}

/**
 * Sign the serialized bytes of a legacy or versioned transaction message,
 * dispatching to whichever signing mechanism the input signer provides.
 *
 * Strategy precedence (see {@link pickSigningStrategy}):
 *   1. Kit `TransactionPartialSigner` + lifetime → `signTransactions`
 *   2. Kit `MessagePartialSigner`                → `signMessages`
 * A Kit signer with only `signTransactions` and no lifetime is rejected.
 *
 * @internal
 */
export async function signTransactionMessageBytes(
  signer: Signer,
  messageBytes: Uint8Array,
  requiredSignerPublicKeys: readonly Address[],
  signatures: readonly SignaturePair[] = [],
  lifetimeConstraint?: TransactionWithLifetime['lifetimeConstraint'],
): Promise<Uint8Array | undefined> {
  const strategy = pickSigningStrategy(signer, lifetimeConstraint);
  switch (strategy.kind) {
    case 'kit-tx': {
      const [dict] = await strategy.signer.signTransactions([
        buildSignableTransaction(
          messageBytes,
          requiredSignerPublicKeys,
          signatures,
          strategy.lifetime,
        ),
      ]);
      return dict[strategy.address];
    }
    case 'kit-msg': {
      const [dict] = await strategy.signer.signMessages([
        createSignableMessage(toPackedUint8Array(messageBytes)),
      ]);
      return dict[strategy.address];
    }
  }
}

function pickSigningStrategy(
  signer: Signer,
  lifetime: TransactionWithLifetime['lifetimeConstraint'] | undefined,
): SigningStrategy {
  // Kit's type guards require an index signature on their input. Signer
  // values are always Kit-shaped (have `address`), so widen for the guards.
  const candidate = signer as Signer & {readonly [key: string]: unknown};
  const hasTransactionPartial = isTransactionPartialSigner(candidate);
  const hasMessagePartial = isMessagePartialSigner(candidate);
  if (hasTransactionPartial && lifetime != null) {
    return {
      kind: 'kit-tx',
      signer: candidate,
      address: candidate.address,
      lifetime,
    };
  }
  if (hasMessagePartial) {
    return {
      kind: 'kit-msg',
      signer: candidate,
      address: candidate.address,
    };
  }
  throw new Error(
    'TransactionPartialSigner support requires transaction lifetime information. Use a MessagePartialSigner-compatible signer or provide a transaction with a blockhash lifetime or nonce lifetime.',
  );
}

function buildSignableTransaction(
  messageBytes: Uint8Array,
  requiredSignerPublicKeys: readonly Address[],
  signatures: readonly SignaturePair[],
  lifetimeConstraint: TransactionWithLifetime['lifetimeConstraint'],
): SignableTransaction {
  const transaction = {
    lifetimeConstraint,
    messageBytes: asTransactionMessageBytes(toPackedUint8Array(messageBytes)),
    signatures: buildSignatureMap(requiredSignerPublicKeys, signatures),
  } satisfies KitTransaction & TransactionWithLifetime;
  assertIsTransactionWithinSizeLimit(transaction);
  return transaction;
}

function buildSignatureMap(
  requiredSignerPublicKeys: readonly Address[],
  signatures: readonly SignaturePair[],
): KitTransaction['signatures'] {
  const signatureMap: KitTransaction['signatures'] = {};
  for (const publicKey of requiredSignerPublicKeys) {
    signatureMap[publicKey.toBase58()] = null;
  }
  for (const {publicKey, signature} of signatures) {
    if (signature != null && !isAllZeroSignature(signature)) {
      signatureMap[publicKey.toBase58()] = signatureBytes(signature);
    }
  }
  return signatureMap;
}

function isAllZeroSignature(signature: Uint8Array): boolean {
  if (signature.length !== SIGNATURE_LENGTH_IN_BYTES) return false;
  for (let i = 0; i < signature.length; i++) {
    if (signature[i] !== 0) return false;
  }
  return true;
}
