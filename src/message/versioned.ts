import {getCompiledTransactionMessageDecoder} from '@solana/kit';

import {VERSION_PREFIX_MASK} from '../transaction/constants';
import {toUint8ArrayView} from '../utils/typed-array';
import {Message} from './legacy';
import {MessageV0} from './v0';

const MESSAGE_DECODER = getCompiledTransactionMessageDecoder();

export type VersionedMessage = Message | MessageV0;

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
    if (version !== 'legacy' && version !== 0) {
      throw new Error(
        `Transaction message version ${version} deserialization is not supported`,
      );
    }
    const decoded = MESSAGE_DECODER.decode(toUint8ArrayView(serializedMessage));
    if (decoded.version === 'legacy') {
      return Message.fromCompiledMessage(decoded);
    }
    if (decoded.version === 0) {
      return MessageV0.fromCompiledMessage(decoded);
    }
    throw new Error(
      `Transaction message version ${decoded.version} deserialization is not supported`,
    );
  },
};
