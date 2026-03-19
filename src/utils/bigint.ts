import {blob, Layout} from '@solana/buffer-layout';
import {getU64Codec} from '@solana/codecs-numbers';

export function u64(property?: string): Layout<bigint> {
  const layout = blob(8 /* bytes */, property);
  const decode = layout.decode.bind(layout);
  const encode = layout.encode.bind(layout);

  const bigIntLayout = layout as Layout<unknown> as Layout<bigint>;
  const codec = getU64Codec();

  bigIntLayout.decode = (buffer, offset = 0) => {
    const src = decode(buffer, offset);
    return codec.decode(src);
  };

  bigIntLayout.encode = (bigInt, buffer, offset = 0) => {
    const src = codec.encode(bigInt) as Uint8Array;
    return encode(src, buffer, offset);
  };

  return bigIntLayout;
}
