import {addCodecSizePrefix} from '@solana/codecs-core';
import {getU64Codec} from '@solana/codecs-numbers';
import {getUtf8Codec} from '@solana/codecs-strings';

export const RUST_STRING_CODEC = addCodecSizePrefix(
  getUtf8Codec(),
  getU64Codec(),
);