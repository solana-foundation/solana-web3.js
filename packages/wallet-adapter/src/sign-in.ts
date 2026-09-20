import {
  assertOffchainMessageV1Equal,
  getOffchainMessageV1Decoder,
  signatureBytes,
  verifyOffchainMessageEnvelope,
  type Address,
  type OffchainMessageBytes,
} from '@solana/kit';
import type {
  SolanaSignInInput,
  SolanaSignInOutput,
} from '@solana/wallet-standard-features';
import {
  deriveSignInMessageText,
  verifySignIn as verifyPlainSignIn,
} from '@solana/wallet-standard-util';

/**
 * Verifies a Sign In With Solana output against the input that produced it, whether the wallet
 * signed the plain message text or wrapped it in a version 1 off-chain message.
 *
 * The signed message must reproduce every field of the input, name the connected account, and
 * carry a valid signature from that account. When `input.address` is set, the wallet must have
 * signed in with that account.
 */
export async function verifySignIn(
  input: SolanaSignInInput,
  output: SolanaSignInOutput,
): Promise<boolean> {
  if (output.signedMessageFormat?.kind !== 'offchainMessage') {
    return verifyPlainSignIn(input, output);
  }
  const address = output.account.address as Address;
  if (input.address && input.address !== address) return false;
  try {
    const content = output.signedMessage as unknown as OffchainMessageBytes;
    const message = getOffchainMessageV1Decoder().decode(content);
    const text = deriveSignInMessageText(
      {...input, address},
      {...output, signedMessage: new TextEncoder().encode(message.content)},
    );
    if (!text) return false;
    assertOffchainMessageV1Equal(message, {
      ...message,
      content: text,
      requiredSignatories: [{address}],
    });
    await verifyOffchainMessageEnvelope({
      content,
      signatures: {[address]: signatureBytes(output.signature)},
    });
    return true;
  } catch {
    return false;
  }
}
