import {addCodecSizePrefix, getU64Codec, getUtf8Codec} from '@solana/kit';

export const RUST_STRING_CODEC = addCodecSizePrefix(
  getUtf8Codec(),
  getU64Codec(),
);
