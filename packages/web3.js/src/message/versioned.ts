import {
  createDecoderThatConsumesEntireByteArray,
  getCompiledTransactionMessageDecoder,
} from '@solana/kit';

import {VERSION_PREFIX_MASK} from '../transaction/constants';
import {toUint8ArrayView} from '../utils/typed-array';
import {Message} from './legacy';
import {MessageV0} from './v0';
import {MessageV1} from './v1';

const MESSAGE_DECODER = getCompiledTransactionMessageDecoder();
const V1_MESSAGE_DECODER = createDecoderThatConsumesEntireByteArray(
  getCompiledTransactionMessageDecoder(),
);

export type VersionedMessage = Message | MessageV0 | MessageV1;

export const VersionedMessage = {
  deserializeMessageVersion(serializedMessage: Uint8Array): 'legacy' | number {
    const prefix = serializedMessage[0];
    const maskedPrefix = prefix & VERSION_PREFIX_MASK;

    // if the highest bit of the prefix is not set, the message is not versioned
    if (maskedPrefix === prefix) {
      return 'legacy';
    }

    // the lower 7 bits of the prefix indicate the message version
    return maskedPrefix;
  },

  deserialize: (serializedMessage: Uint8Array): VersionedMessage => {
    const version =
      VersionedMessage.deserializeMessageVersion(serializedMessage);
    if (version !== 'legacy' && version !== 0 && version !== 1) {
      throw new Error(
        `Transaction message version ${version} deserialization is not supported`,
      );
    }
    // A v1 message must consume the entire byte array: trailing bytes after
    // the message would otherwise be silently dropped, and a
    // `VersionedTransaction` built from it would serialize to different bytes
    // than the ones received (see SIMD-0385).
    const decoded =
      version === 1
        ? V1_MESSAGE_DECODER.decode(toUint8ArrayView(serializedMessage))
        : MESSAGE_DECODER.decode(toUint8ArrayView(serializedMessage));
    if (decoded.version === 'legacy') {
      return Message.fromCompiledMessage(decoded);
    }
    if (decoded.version === 0) {
      return MessageV0.fromCompiledMessage(decoded);
    }
    return MessageV1.fromCompiledMessage(decoded);
  },
};
