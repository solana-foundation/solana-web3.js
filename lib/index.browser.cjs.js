'use strict';

var buffer = require('buffer');
var sha256$1 = require('@noble/hashes/sha256');
var ed25519 = require('@noble/curves/ed25519');
var codecsNumbers = require('@solana/codecs-numbers');
var BufferLayout = require('@solana/buffer-layout');
var superstruct = require('superstruct');
var rpcWebsockets = require('rpc-websockets');
var _classPrivateFieldLooseBase = require('@babel/runtime/helpers/classPrivateFieldLooseBase');
var _classPrivateFieldLooseKey = require('@babel/runtime/helpers/classPrivateFieldLooseKey');
var sha3 = require('@noble/hashes/sha3');
var secp256k1 = require('@noble/curves/secp256k1');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e : { default: e }; }

function _interopNamespaceCompat(e) {
  if (e && typeof e === 'object' && 'default' in e) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var BufferLayout__namespace = /*#__PURE__*/_interopNamespaceCompat(BufferLayout);
var _classPrivateFieldLooseBase__default = /*#__PURE__*/_interopDefaultCompat(_classPrivateFieldLooseBase);
var _classPrivateFieldLooseKey__default = /*#__PURE__*/_interopDefaultCompat(_classPrivateFieldLooseKey);

// src/codes.ts
var SOLANA_ERROR__ADDRESSES__INVALID_BYTE_LENGTH = 28e5;
var SOLANA_ERROR__ADDRESSES__STRING_LENGTH_OUT_OF_RANGE = 2800001;
var SOLANA_ERROR__ADDRESSES__MAX_PDA_SEED_LENGTH_EXCEEDED = 2800007;
var SOLANA_ERROR__ADDRESSES__PDA_ENDS_WITH_PDA_MARKER = 2800010;
var SOLANA_ERROR__SUBTLE_CRYPTO__DISALLOWED_IN_INSECURE_CONTEXT = 361e4;
var SOLANA_ERROR__SUBTLE_CRYPTO__DIGEST_UNIMPLEMENTED = 3610001;
var SOLANA_ERROR__SUBTLE_CRYPTO__EXPORT_FUNCTION_UNIMPLEMENTED = 3610003;
var SOLANA_ERROR__SUBTLE_CRYPTO__SIGN_FUNCTION_UNIMPLEMENTED = 3610005;
var SOLANA_ERROR__SUBTLE_CRYPTO__VERIFY_FUNCTION_UNIMPLEMENTED = 3610006;
var SOLANA_ERROR__SUBTLE_CRYPTO__CANNOT_EXPORT_NON_EXTRACTABLE_KEY = 3610007;
var SOLANA_ERROR__CRYPTO__RANDOM_VALUES_FUNCTION_UNIMPLEMENTED = 3611e3;
var SOLANA_ERROR__KEYS__INVALID_KEY_PAIR_BYTE_LENGTH = 3704e3;
var SOLANA_ERROR__KEYS__INVALID_PRIVATE_KEY_BYTE_LENGTH = 3704001;
var SOLANA_ERROR__KEYS__INVALID_SIGNATURE_BYTE_LENGTH = 3704002;
var SOLANA_ERROR__KEYS__PUBLIC_KEY_MUST_MATCH_PRIVATE_KEY = 3704004;
var SOLANA_ERROR__CODECS__INVALID_BYTE_LENGTH = 8078001;
var SOLANA_ERROR__CODECS__ENCODER_DECODER_SIZE_COMPATIBILITY_MISMATCH = 8078004;
var SOLANA_ERROR__CODECS__ENCODER_DECODER_FIXED_SIZE_MISMATCH = 8078005;
var SOLANA_ERROR__CODECS__ENCODER_DECODER_MAX_SIZE_MISMATCH = 8078006;
var SOLANA_ERROR__CODECS__INVALID_NUMBER_OF_ITEMS = 8078007;
var SOLANA_ERROR__CODECS__ENUM_DISCRIMINATOR_OUT_OF_RANGE = 8078008;
var SOLANA_ERROR__CODECS__INVALID_ENUM_VARIANT = 8078010;
var SOLANA_ERROR__CODECS__INVALID_STRING_FOR_BASE = 8078012;
var SOLANA_ERROR__CODECS__CANNOT_USE_LEXICAL_VALUES_AS_ENUM_DISCRIMINATORS = 8078022;

// src/context.ts
function encodeValue$1(value) {
  if (Array.isArray(value)) {
    const commaSeparatedValues = value.map(encodeValue$1).join(
      "%2C%20"
      /* ", " */
    );
    return "%5B" + commaSeparatedValues + /* "]" */
    "%5D";
  } else if (typeof value === "bigint") {
    return `${value}n`;
  } else {
    return encodeURIComponent(
      String(
        value != null && Object.getPrototypeOf(value) === null ? (
          // Plain objects with no prototype don't have a `toString` method.
          // Convert them before stringifying them.
          { ...value }
        ) : value
      )
    );
  }
}
function encodeObjectContextEntry$1([key, value]) {
  return `${key}=${encodeValue$1(value)}`;
}
function encodeContextObject$1(context) {
  const searchParamsString = Object.entries(context).map(encodeObjectContextEntry$1).join("&");
  return btoa(searchParamsString);
}
function getErrorMessage$1(code, context = {}) {
  {
    let decodingAdviceMessage = `Solana error #${code}; Decode this error by running \`npx @solana/errors decode -- ${code}`;
    if (Object.keys(context).length) {
      decodingAdviceMessage += ` '${encodeContextObject$1(context)}'`;
    }
    return `${decodingAdviceMessage}\``;
  }
}
var SolanaError$1 = class SolanaError extends Error {
  /**
   * Indicates the root cause of this {@link SolanaError}, if any.
   *
   * For example, a transaction error might have an instruction error as its root cause. In this
   * case, you will be able to access the instruction error on the transaction error as `cause`.
   */
  cause = this.cause;
  /**
   * Contains context that can assist in understanding or recovering from a {@link SolanaError}.
   */
  context;
  constructor(...[code, contextAndErrorOptions]) {
    let context;
    let errorOptions;
    if (contextAndErrorOptions) {
      Object.entries(Object.getOwnPropertyDescriptors(contextAndErrorOptions)).forEach(([name, descriptor]) => {
        if (name === "cause") {
          errorOptions = { cause: descriptor.value };
        } else {
          if (context === void 0) {
            context = {
              __code: code
            };
          }
          Object.defineProperty(context, name, descriptor);
        }
      });
    }
    const message = getErrorMessage$1(code, context);
    super(message, errorOptions);
    this.context = Object.freeze(
      context === void 0 ? {
        __code: code
      } : context
    );
    this.name = "SolanaError";
  }
};

function padBytes(bytes, length) {
  if (bytes.length >= length) return bytes;
  const paddedBytes = new Uint8Array(length).fill(0);
  paddedBytes.set(bytes);
  return paddedBytes;
}
var fixBytes = (bytes, length) => padBytes(bytes.length <= length ? bytes : bytes.slice(0, length), length);
function bytesEqual(bytes1, bytes2) {
  return bytes1.length === bytes2.length && bytes1.every((value, index) => value === bytes2[index]);
}
function getEncodedSize(value, encoder) {
  return "fixedSize" in encoder ? encoder.fixedSize : encoder.getSizeFromValue(value);
}
function createEncoder(encoder) {
  return Object.freeze({
    ...encoder,
    encode: (value) => {
      const bytes = new Uint8Array(getEncodedSize(value, encoder));
      encoder.write(value, bytes, 0);
      return bytes;
    }
  });
}
function createDecoder(decoder) {
  return Object.freeze({
    ...decoder,
    decode: (bytes, offset = 0) => decoder.read(bytes, offset)[0]
  });
}
function createCodec(codec) {
  return Object.freeze({
    ...codec,
    decode: (bytes, offset = 0) => codec.read(bytes, offset)[0],
    encode: (value) => {
      const bytes = new Uint8Array(getEncodedSize(value, codec));
      codec.write(value, bytes, 0);
      return bytes;
    }
  });
}
function isFixedSize(codec) {
  return "fixedSize" in codec && typeof codec.fixedSize === "number";
}
function isVariableSize(codec) {
  return !isFixedSize(codec);
}
function combineCodec(encoder, decoder) {
  if (isFixedSize(encoder) !== isFixedSize(decoder)) {
    throw new SolanaError$1(SOLANA_ERROR__CODECS__ENCODER_DECODER_SIZE_COMPATIBILITY_MISMATCH);
  }
  if (isFixedSize(encoder) && isFixedSize(decoder) && encoder.fixedSize !== decoder.fixedSize) {
    throw new SolanaError$1(SOLANA_ERROR__CODECS__ENCODER_DECODER_FIXED_SIZE_MISMATCH, {
      decoderFixedSize: decoder.fixedSize,
      encoderFixedSize: encoder.fixedSize
    });
  }
  if (!isFixedSize(encoder) && !isFixedSize(decoder) && encoder.maxSize !== decoder.maxSize) {
    throw new SolanaError$1(SOLANA_ERROR__CODECS__ENCODER_DECODER_MAX_SIZE_MISMATCH, {
      decoderMaxSize: decoder.maxSize,
      encoderMaxSize: encoder.maxSize
    });
  }
  return {
    ...decoder,
    ...encoder,
    decode: decoder.decode,
    encode: encoder.encode,
    read: decoder.read,
    write: encoder.write
  };
}
function assertByteArrayHasEnoughBytesForCodec(codecDescription, expected, bytes, offset = 0) {
  const bytesLength = bytes.length - offset;
  if (bytesLength < expected) {
    throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_BYTE_LENGTH, {
      bytesLength,
      codecDescription,
      expected
    });
  }
}

// src/add-codec-size-prefix.ts
function addEncoderSizePrefix(encoder, prefix) {
  const write = ((value, bytes, offset) => {
    const encoderBytes = encoder.encode(value);
    offset = prefix.write(encoderBytes.length, bytes, offset);
    bytes.set(encoderBytes, offset);
    return offset + encoderBytes.length;
  });
  if (isFixedSize(prefix) && isFixedSize(encoder)) {
    return createEncoder({ ...encoder, fixedSize: prefix.fixedSize + encoder.fixedSize, write });
  }
  const prefixMaxSize = isFixedSize(prefix) ? prefix.fixedSize : prefix.maxSize ?? null;
  const encoderMaxSize = isFixedSize(encoder) ? encoder.fixedSize : encoder.maxSize ?? null;
  const maxSize = prefixMaxSize !== null && encoderMaxSize !== null ? prefixMaxSize + encoderMaxSize : null;
  return createEncoder({
    ...encoder,
    ...maxSize !== null ? { maxSize } : {},
    getSizeFromValue: (value) => {
      const encoderSize = getEncodedSize(value, encoder);
      return getEncodedSize(encoderSize, prefix) + encoderSize;
    },
    write
  });
}
function addDecoderSizePrefix(decoder, prefix) {
  const read = ((bytes, offset) => {
    const [bigintSize, decoderOffset] = prefix.read(bytes, offset);
    const size = Number(bigintSize);
    offset = decoderOffset;
    if (offset > 0 || bytes.length > size) {
      bytes = bytes.slice(offset, offset + size);
    }
    assertByteArrayHasEnoughBytesForCodec("addDecoderSizePrefix", size, bytes);
    return [decoder.decode(bytes), offset + size];
  });
  if (isFixedSize(prefix) && isFixedSize(decoder)) {
    return createDecoder({ ...decoder, fixedSize: prefix.fixedSize + decoder.fixedSize, read });
  }
  const prefixMaxSize = isFixedSize(prefix) ? prefix.fixedSize : prefix.maxSize ?? null;
  const decoderMaxSize = isFixedSize(decoder) ? decoder.fixedSize : decoder.maxSize ?? null;
  const maxSize = prefixMaxSize !== null && decoderMaxSize !== null ? prefixMaxSize + decoderMaxSize : null;
  return createDecoder({ ...decoder, ...maxSize !== null ? { maxSize } : {}, read });
}
function addCodecSizePrefix(codec, prefix) {
  return combineCodec(addEncoderSizePrefix(codec, prefix), addDecoderSizePrefix(codec, prefix));
}

// src/array-buffers.ts
function toArrayBuffer(bytes, offset, length) {
  const bytesOffset = bytes.byteOffset + (0);
  const bytesLength = bytes.byteLength;
  let buffer;
  if (typeof SharedArrayBuffer === "undefined") {
    buffer = bytes.buffer;
  } else if (bytes.buffer instanceof SharedArrayBuffer) {
    buffer = new ArrayBuffer(bytes.length);
    new Uint8Array(buffer).set(new Uint8Array(bytes));
  } else {
    buffer = bytes.buffer;
  }
  return (bytesOffset === 0 || bytesOffset === -bytes.byteLength) && bytesLength === bytes.byteLength ? buffer : buffer.slice(bytesOffset, bytesOffset + bytesLength);
}

// src/fix-codec-size.ts
function fixEncoderSize(encoder, fixedBytes) {
  return createEncoder({
    fixedSize: fixedBytes,
    write: (value, bytes, offset) => {
      const variableByteArray = encoder.encode(value);
      const fixedByteArray = variableByteArray.length > fixedBytes ? variableByteArray.slice(0, fixedBytes) : variableByteArray;
      bytes.set(fixedByteArray, offset);
      return offset + fixedBytes;
    }
  });
}
function fixDecoderSize(decoder, fixedBytes) {
  return createDecoder({
    fixedSize: fixedBytes,
    read: (bytes, offset) => {
      assertByteArrayHasEnoughBytesForCodec("fixCodecSize", fixedBytes, bytes, offset);
      if (offset > 0 || bytes.length > fixedBytes) {
        bytes = bytes.slice(offset, offset + fixedBytes);
      }
      if (isFixedSize(decoder)) {
        bytes = fixBytes(bytes, decoder.fixedSize);
      }
      const [value] = decoder.read(bytes, 0);
      return [value, offset + fixedBytes];
    }
  });
}
function fixCodecSize(codec, fixedBytes) {
  return combineCodec(fixEncoderSize(codec, fixedBytes), fixDecoderSize(codec, fixedBytes));
}

// src/transform-codec.ts
function transformEncoder(encoder, unmap) {
  return createEncoder({
    ...isVariableSize(encoder) ? { ...encoder, getSizeFromValue: (value) => encoder.getSizeFromValue(unmap(value)) } : encoder,
    write: (value, bytes, offset) => encoder.write(unmap(value), bytes, offset)
  });
}
function transformDecoder(decoder, map) {
  return createDecoder({
    ...decoder,
    read: (bytes, offset) => {
      const [value, newOffset] = decoder.read(bytes, offset);
      return [map(value, bytes, offset), newOffset];
    }
  });
}
function transformCodec(codec, unmap, map) {
  return createCodec({
    ...transformEncoder(codec, unmap),
    read: map ? transformDecoder(codec, map).read : codec.read
  });
}

// src/assertions.ts
function assertValidBaseString(alphabet4, testValue, givenValue = testValue) {
  if (!testValue.match(new RegExp(`^[${alphabet4}]*$`))) {
    throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_STRING_FOR_BASE, {
      alphabet: alphabet4,
      base: alphabet4.length,
      value: givenValue
    });
  }
}
var getBaseXEncoder = (alphabet4) => {
  return createEncoder({
    getSizeFromValue: (value) => {
      const [leadingZeroes, tailChars] = partitionLeadingZeroes(value, alphabet4[0]);
      if (!tailChars) return value.length;
      const base10Number = getBigIntFromBaseX(tailChars, alphabet4);
      return leadingZeroes.length + Math.ceil(base10Number.toString(16).length / 2);
    },
    write(value, bytes, offset) {
      assertValidBaseString(alphabet4, value);
      if (value === "") return offset;
      const [leadingZeroes, tailChars] = partitionLeadingZeroes(value, alphabet4[0]);
      if (!tailChars) {
        bytes.set(new Uint8Array(leadingZeroes.length).fill(0), offset);
        return offset + leadingZeroes.length;
      }
      let base10Number = getBigIntFromBaseX(tailChars, alphabet4);
      const tailBytes = [];
      while (base10Number > 0n) {
        tailBytes.unshift(Number(base10Number % 256n));
        base10Number /= 256n;
      }
      const bytesToAdd = [...Array(leadingZeroes.length).fill(0), ...tailBytes];
      bytes.set(bytesToAdd, offset);
      return offset + bytesToAdd.length;
    }
  });
};
var getBaseXDecoder = (alphabet4) => {
  return createDecoder({
    read(rawBytes, offset) {
      const bytes = offset === 0 ? rawBytes : rawBytes.slice(offset);
      if (bytes.length === 0) return ["", 0];
      let trailIndex = bytes.findIndex((n) => n !== 0);
      trailIndex = trailIndex === -1 ? bytes.length : trailIndex;
      const leadingZeroes = alphabet4[0].repeat(trailIndex);
      if (trailIndex === bytes.length) return [leadingZeroes, rawBytes.length];
      const base10Number = bytes.slice(trailIndex).reduce((sum, byte) => sum * 256n + BigInt(byte), 0n);
      const tailChars = getBaseXFromBigInt(base10Number, alphabet4);
      return [leadingZeroes + tailChars, rawBytes.length];
    }
  });
};
var getBaseXCodec = (alphabet4) => combineCodec(getBaseXEncoder(alphabet4), getBaseXDecoder(alphabet4));
function partitionLeadingZeroes(value, zeroCharacter) {
  const [leadingZeros, tailChars] = value.split(new RegExp(`((?!${zeroCharacter}).*)`));
  return [leadingZeros, tailChars];
}
function getBigIntFromBaseX(value, alphabet4) {
  const base = BigInt(alphabet4.length);
  let sum = 0n;
  for (const char of value) {
    sum *= base;
    sum += BigInt(alphabet4.indexOf(char));
  }
  return sum;
}
function getBaseXFromBigInt(value, alphabet4) {
  const base = BigInt(alphabet4.length);
  const tailChars = [];
  while (value > 0n) {
    tailChars.unshift(alphabet4[Number(value % base)]);
    value /= base;
  }
  return tailChars.join("");
}
var INVALID_STRING_ERROR_BASE_CONFIG = {
  alphabet: "0123456789abcdef",
  base: 16
};
function charCodeToBase16(char) {
  if (char >= 48 /* ZERO */ && char <= 57 /* NINE */) return char - 48 /* ZERO */;
  if (char >= 65 /* A_UP */ && char <= 70 /* F_UP */) return char - (65 /* A_UP */ - 10);
  if (char >= 97 /* A_LO */ && char <= 102 /* F_LO */) return char - (97 /* A_LO */ - 10);
}
var getBase16Encoder = () => createEncoder({
  getSizeFromValue: (value) => Math.ceil(value.length / 2),
  write(value, bytes, offset) {
    const len = value.length;
    const al = len / 2;
    if (len === 1) {
      const c = value.charCodeAt(0);
      const n = charCodeToBase16(c);
      if (n === void 0) {
        throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_STRING_FOR_BASE, {
          ...INVALID_STRING_ERROR_BASE_CONFIG,
          value
        });
      }
      bytes.set([n], offset);
      return 1 + offset;
    }
    const hexBytes = new Uint8Array(al);
    for (let i = 0, j = 0; i < al; i++) {
      const c1 = value.charCodeAt(j++);
      const c2 = value.charCodeAt(j++);
      const n1 = charCodeToBase16(c1);
      const n2 = charCodeToBase16(c2);
      if (n1 === void 0 || n2 === void 0 && !Number.isNaN(c2)) {
        throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_STRING_FOR_BASE, {
          ...INVALID_STRING_ERROR_BASE_CONFIG,
          value
        });
      }
      hexBytes[i] = !Number.isNaN(c2) ? n1 << 4 | (n2 ?? 0) : n1;
    }
    bytes.set(hexBytes, offset);
    return hexBytes.length + offset;
  }
});

// src/base58.ts
var alphabet2 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
var getBase58Encoder = () => getBaseXEncoder(alphabet2);
var getBase58Decoder = () => getBaseXDecoder(alphabet2);
var getBase58Codec = () => getBaseXCodec(alphabet2);

// src/base64.ts
var alphabet3 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var getBase64Encoder = () => {
  {
    return createEncoder({
      getSizeFromValue: (value) => {
        try {
          return atob(value).length;
        } catch {
          throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_STRING_FOR_BASE, {
            alphabet: alphabet3,
            base: 64,
            value
          });
        }
      },
      write(value, bytes, offset) {
        try {
          const bytesToAdd = atob(value).split("").map((c) => c.charCodeAt(0));
          bytes.set(bytesToAdd, offset);
          return bytesToAdd.length + offset;
        } catch {
          throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_STRING_FOR_BASE, {
            alphabet: alphabet3,
            base: 64,
            value
          });
        }
      }
    });
  }
};
var getBase64Decoder = () => {
  {
    return createDecoder({
      read(bytes, offset = 0) {
        const slice = bytes.slice(offset);
        const value = btoa(String.fromCharCode(...slice));
        return [value, bytes.length];
      }
    });
  }
};
var getBase64Codec = () => combineCodec(getBase64Encoder(), getBase64Decoder());

// src/null-characters.ts
var removeNullCharacters = (value) => (
  // eslint-disable-next-line no-control-regex
  value.replace(/\u0000/g, "")
);

// ../text-encoding-impl/dist/index.browser.mjs
var e = globalThis.TextDecoder;
var o = globalThis.TextEncoder;

// src/utf8.ts
var getUtf8Encoder = () => {
  let textEncoder;
  return createEncoder({
    getSizeFromValue: (value) => (textEncoder ||= new o()).encode(value).length,
    write: (value, bytes, offset) => {
      const bytesToAdd = (textEncoder ||= new o()).encode(value);
      bytes.set(bytesToAdd, offset);
      return offset + bytesToAdd.length;
    }
  });
};
var getUtf8Decoder = () => {
  let textDecoder;
  return createDecoder({
    read(bytes, offset) {
      const value = (textDecoder ||= new e()).decode(bytes.slice(offset));
      return [removeNullCharacters(value), bytes.length];
    }
  });
};
var getUtf8Codec = () => combineCodec(getUtf8Encoder(), getUtf8Decoder());

// src/crypto.ts
function assertPRNGIsAvailable() {
  if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.getRandomValues !== "function") {
    throw new SolanaError$1(SOLANA_ERROR__CRYPTO__RANDOM_VALUES_FUNCTION_UNIMPLEMENTED);
  }
}
function assertIsSecureContext() {
  if (!globalThis.isSecureContext) {
    throw new SolanaError$1(SOLANA_ERROR__SUBTLE_CRYPTO__DISALLOWED_IN_INSECURE_CONTEXT);
  }
}
function assertDigestCapabilityIsAvailable() {
  assertIsSecureContext();
  if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.subtle?.digest !== "function") {
    throw new SolanaError$1(SOLANA_ERROR__SUBTLE_CRYPTO__DIGEST_UNIMPLEMENTED);
  }
}
function assertKeyExporterIsAvailable() {
  assertIsSecureContext();
  if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.subtle?.exportKey !== "function") {
    throw new SolanaError$1(SOLANA_ERROR__SUBTLE_CRYPTO__EXPORT_FUNCTION_UNIMPLEMENTED);
  }
}
function assertSigningCapabilityIsAvailable() {
  assertIsSecureContext();
  if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.subtle?.sign !== "function") {
    throw new SolanaError$1(SOLANA_ERROR__SUBTLE_CRYPTO__SIGN_FUNCTION_UNIMPLEMENTED);
  }
}
function assertVerificationCapabilityIsAvailable() {
  assertIsSecureContext();
  if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.subtle?.verify !== "function") {
    throw new SolanaError$1(SOLANA_ERROR__SUBTLE_CRYPTO__VERIFY_FUNCTION_UNIMPLEMENTED);
  }
}

// src/address.ts
var memoizedBase58Encoder;
var memoizedBase58Decoder;
function getMemoizedBase58Encoder() {
  if (!memoizedBase58Encoder) memoizedBase58Encoder = getBase58Encoder();
  return memoizedBase58Encoder;
}
function getMemoizedBase58Decoder() {
  if (!memoizedBase58Decoder) memoizedBase58Decoder = getBase58Decoder();
  return memoizedBase58Decoder;
}
function assertIsAddress(putativeAddress) {
  if (
    // Lowest address (32 bytes of zeroes)
    putativeAddress.length < 32 || // Highest address (32 bytes of 255)
    putativeAddress.length > 44
  ) {
    throw new SolanaError$1(SOLANA_ERROR__ADDRESSES__STRING_LENGTH_OUT_OF_RANGE, {
      actualLength: putativeAddress.length
    });
  }
  const base58Encoder = getMemoizedBase58Encoder();
  const bytes = base58Encoder.encode(putativeAddress);
  const numBytes = bytes.byteLength;
  if (numBytes !== 32) {
    throw new SolanaError$1(SOLANA_ERROR__ADDRESSES__INVALID_BYTE_LENGTH, {
      actualLength: numBytes
    });
  }
}
function address(putativeAddress) {
  assertIsAddress(putativeAddress);
  return putativeAddress;
}
function getAddressEncoder() {
  return transformEncoder(
    fixEncoderSize(getMemoizedBase58Encoder(), 32),
    (putativeAddress) => address(putativeAddress)
  );
}
function getAddressDecoder() {
  return fixDecoderSize(getMemoizedBase58Decoder(), 32);
}
function getAddressCodec() {
  return combineCodec(getAddressEncoder(), getAddressDecoder());
}
var MAX_SEED_LENGTH$1 = 32;
var PDA_MARKER_BYTES$1 = [
  // The string 'ProgramDerivedAddress'
  80,
  114,
  111,
  103,
  114,
  97,
  109,
  68,
  101,
  114,
  105,
  118,
  101,
  100,
  65,
  100,
  100,
  114,
  101,
  115,
  115
];
async function createAddressWithSeed({ baseAddress, programAddress, seed }) {
  const { encode, decode } = getAddressCodec();
  const seedBytes = typeof seed === "string" ? new TextEncoder().encode(seed) : seed;
  if (seedBytes.byteLength > MAX_SEED_LENGTH$1) {
    throw new SolanaError$1(SOLANA_ERROR__ADDRESSES__MAX_PDA_SEED_LENGTH_EXCEEDED, {
      actual: seedBytes.byteLength,
      index: 0,
      maxSeedLength: MAX_SEED_LENGTH$1
    });
  }
  const programAddressBytes = encode(programAddress);
  if (programAddressBytes.length >= PDA_MARKER_BYTES$1.length && bytesEqual(programAddressBytes.slice(-PDA_MARKER_BYTES$1.length), new Uint8Array(PDA_MARKER_BYTES$1))) {
    throw new SolanaError$1(SOLANA_ERROR__ADDRESSES__PDA_ENDS_WITH_PDA_MARKER);
  }
  const addressBytesBuffer = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array([...encode(baseAddress), ...seedBytes, ...programAddressBytes])
  );
  const addressBytes = new Uint8Array(addressBytesBuffer);
  return decode(addressBytes);
}

// src/key-pair.ts

// src/algorithm.ts
var ED25519_ALGORITHM_IDENTIFIER = (
  // Resist the temptation to convert this to a simple string; As of version 133.0.3, Firefox
  // requires the object form of `AlgorithmIdentifier` and will throw a `DOMException` otherwise.
  Object.freeze({ name: "Ed25519" })
);
function addPkcs8Header(bytes) {
  return new Uint8Array([
    /**
     * PKCS#8 header
     */
    48,
    // ASN.1 sequence tag
    46,
    // Length of sequence (46 more bytes)
    2,
    // ASN.1 integer tag
    1,
    // Length of integer
    0,
    // Version number
    48,
    // ASN.1 sequence tag
    5,
    // Length of sequence
    6,
    // ASN.1 object identifier tag
    3,
    // Length of object identifier
    // Edwards curve algorithms identifier https://oid-rep.orange-labs.fr/get/1.3.101.112
    43,
    // iso(1) / identified-organization(3) (The first node is multiplied by the decimal 40 and the result is added to the value of the second node)
    101,
    // thawte(101)
    // Ed25519 identifier
    112,
    // id-Ed25519(112)
    /**
     * Private key payload
     */
    4,
    // ASN.1 octet string tag
    34,
    // String length (34 more bytes)
    // Private key bytes as octet string
    4,
    // ASN.1 octet string tag
    32,
    // String length (32 bytes)
    ...bytes
  ]);
}
async function createPrivateKeyFromBytes(bytes, extractable = false) {
  const actualLength = bytes.byteLength;
  if (actualLength !== 32) {
    throw new SolanaError$1(SOLANA_ERROR__KEYS__INVALID_PRIVATE_KEY_BYTE_LENGTH, {
      actualLength
    });
  }
  const privateKeyBytesPkcs8 = addPkcs8Header(bytes);
  return await crypto.subtle.importKey("pkcs8", privateKeyBytesPkcs8, ED25519_ALGORITHM_IDENTIFIER, extractable, [
    "sign"
  ]);
}
async function getPublicKeyFromPrivateKey(privateKey, extractable = false) {
  assertKeyExporterIsAvailable();
  if (privateKey.extractable === false) {
    throw new SolanaError$1(SOLANA_ERROR__SUBTLE_CRYPTO__CANNOT_EXPORT_NON_EXTRACTABLE_KEY, { key: privateKey });
  }
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  return await crypto.subtle.importKey(
    "jwk",
    {
      crv: "Ed25519",
      ext: extractable,
      key_ops: ["verify"],
      kty: "OKP",
      x: jwk.x
    },
    "Ed25519",
    extractable,
    ["verify"]
  );
}
function assertIsSignatureBytes(putativeSignatureBytes) {
  const numBytes = putativeSignatureBytes.byteLength;
  if (numBytes !== 64) {
    throw new SolanaError$1(SOLANA_ERROR__KEYS__INVALID_SIGNATURE_BYTE_LENGTH, {
      actualLength: numBytes
    });
  }
}
async function signBytes(key, data) {
  assertSigningCapabilityIsAvailable();
  const signedData = await crypto.subtle.sign(ED25519_ALGORITHM_IDENTIFIER, key, toArrayBuffer(data));
  return new Uint8Array(signedData);
}
function signatureBytes(putativeSignatureBytes) {
  assertIsSignatureBytes(putativeSignatureBytes);
  return putativeSignatureBytes;
}
async function verifySignature(key, signature2, data) {
  assertVerificationCapabilityIsAvailable();
  return await crypto.subtle.verify(ED25519_ALGORITHM_IDENTIFIER, key, toArrayBuffer(signature2), toArrayBuffer(data));
}
async function createKeyPairFromBytes(bytes, extractable = false) {
  assertPRNGIsAvailable();
  if (bytes.byteLength !== 64) {
    throw new SolanaError$1(SOLANA_ERROR__KEYS__INVALID_KEY_PAIR_BYTE_LENGTH, { byteLength: bytes.byteLength });
  }
  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.importKey(
      "raw",
      bytes.slice(32),
      ED25519_ALGORITHM_IDENTIFIER,
      /* extractable */
      true,
      [
        "verify"
      ]
    ),
    createPrivateKeyFromBytes(bytes.slice(0, 32), extractable)
  ]);
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const signedData = await signBytes(privateKey, randomBytes);
  const isValid = await verifySignature(publicKey, signedData, randomBytes);
  if (!isValid) {
    throw new SolanaError$1(SOLANA_ERROR__KEYS__PUBLIC_KEY_MUST_MATCH_PRIVATE_KEY);
  }
  return { privateKey, publicKey };
}
async function createKeyPairFromPrivateKeyBytes(bytes, extractable = false) {
  const privateKeyPromise = createPrivateKeyFromBytes(bytes, extractable);
  const [publicKey, privateKey] = await Promise.all([
    // This nested promise makes things efficient by
    // creating the public key in parallel with the
    // second private key creation, if it is needed.
    (extractable ? privateKeyPromise : createPrivateKeyFromBytes(
      bytes,
      true
      /* extractable */
    )).then(
      async (privateKey2) => await getPublicKeyFromPrivateKey(
        privateKey2,
        true
        /* extractable */
      )
    ),
    privateKeyPromise
  ]);
  return { privateKey, publicKey };
}

/**
 * Convert common byte containers into a Uint8Array view when possible.
 *
 * Note: For sliced views, this preserves the original backing buffer and
 * byte offsets. For `Array<number>`, this creates a copy because arrays do
 * not have an `ArrayBuffer` backing store.
 *
 * Use `toPackedUint8Array` when a tightly packed buffer is required.
 */
const toUint8ArrayView = arr => {
  return Array.isArray(arr) ? new Uint8Array(arr) : new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
};

/**
 * Ensure byte-like input is tightly packed and only includes the intended bytes.
 *
 * This copies when the input is a view into a larger backing store so callers
 * like signing/verifying cannot observe unrelated bytes.
 */
const toPackedUint8Array = arr => {
  if (Array.isArray(arr)) {
    return new Uint8Array(arr);
  }
  if (arr.byteOffset === 0 && arr.byteLength === arr.buffer.byteLength) {
    return arr instanceof Uint8Array ? arr : new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  return Uint8Array.from(arr);
};

/**
 * Concatenate byte sequences into a newly allocated Uint8Array.
 */
const concatUint8Arrays = arrays => {
  const totalLength = arrays.reduce((sum, array) => sum + array.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
};

/**
 * Calculate the SHA-256 hash of the input data using the Web Crypto API.
 *
 * @param data The input data to hash.
 * @returns A promise that resolves to the SHA-256 hash of the input data.
 */
async function sha256(data) {
  assertDigestCapabilityIsAvailable();
  const normalizedData = toPackedUint8Array(data);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', toArrayBuffer(normalizedData));
  return new Uint8Array(digest);
}

/**
 * Calculate the SHA-256 hash of the input data.
 *
 * @param data The input data to hash.
 * @returns The SHA-256 hash of the input data.
 * @deprecated Use `sha256` instead, which uses the Web Crypto API and reduces attack surface in modern environments.
 */
const sha256Sync = data => sha256$1.sha256(data);

/**
 * A 64 byte secret key, the first 32 bytes of which is the
 * private scalar and the last 32 bytes is the public key.
 * Read more: https://blog.mozilla.org/warner/2011/11/29/ed25519-keys/
 */

/**
 * Ed25519 Keypair
 */

ed25519.ed25519.utils.randomPrivateKey;
ed25519.ed25519.getPublicKey;
function isOnCurve(publicKey) {
  try {
    ed25519.ed25519.ExtendedPoint.fromHex(publicKey);
    return true;
  } catch {
    return false;
  }
}
const sign = (message, secretKey) => ed25519.ed25519.sign(message, secretKey.slice(0, 32));
const verify = ed25519.ed25519.verify;

function assert (condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

var _Address;

/**
 * Maximum length of derived pubkey seed
 */
const MAX_SEED_LENGTH = 32;

/**
 * Maximum number of seeds used to derive a program address.
 */
const MAX_SEEDS = 16;

/**
 * Size of public key in bytes
 */
const PUBLIC_KEY_LENGTH = 32;

/**
 * Value to be converted into public key
 */

const ERROR__INVALID_PUBLIC_KEY_INPUT = 'Invalid public key input';
const ERROR__INVALID_SEEDS_POINT_ON_CURVE = 'Invalid seeds, address must fall off the curve';
const ERROR__FAILED_TO_FIND_VIABLE_PROGRAM_ADDRESS_NONCE = 'Unable to find a viable program address nonce';
const ADDRESS_CODEC = getAddressCodec();
const PDA_MARKER_BYTES = new TextEncoder().encode('ProgramDerivedAddress');

// local counter used by Address.unique()
let uniquePublicKeyCounter = 1;

/**
 * A Solana address
 */
class Address {
  /**
   * Create a new Address object
   * @param value ed25519 public key as bytes or base-58 encoded string
   */
  constructor(value) {
    this._publicKeyBytes = void 0;
    if (typeof value === 'string') {
      this._publicKeyBytes = bytesFromAddressString(value);
    } else if (isUint8ArrayLike(value)) {
      this._publicKeyBytes = bytesFromUint8Array(new Uint8Array(value));
    } else if (Array.isArray(value)) {
      this._publicKeyBytes = bytesFromNumberArray(value);
    } else if (value instanceof Address) {
      this._publicKeyBytes = value.toBytes();
    } else if (typeof value === 'number') {
      this._publicKeyBytes = bytesFromNumber(value);
    } else if (typeof value === 'bigint') {
      this._publicKeyBytes = bytesFromBigInt(value);
    } else {
      assertUnreachablePublicKeyInput();
    }
  }

  /**
   * Returns a unique PublicKey for tests and benchmarks using a counter
   * @deprecated To be removed in v3, and replaced with test-specific utilities for generating unique public keys.
   */
  static unique() {
    const key = new Address(uniquePublicKeyCounter);
    uniquePublicKeyCounter += 1;
    return new Address(key.toBytes());
  }

  /**
   * Default public key value. The base58-encoded string representation is all ones (as seen below)
   * The underlying number is 32 bytes that are all zeros
   */

  /**
   * Checks if two publicKeys are equal
   */
  equals(address) {
    if (this === address) {
      return true;
    }
    const left = this._publicKeyBytes;
    const right = address._publicKeyBytes;
    for (let index = 0; index < PUBLIC_KEY_LENGTH; index += 1) {
      if (left[index] !== right[index]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Return the base-58 representation of the public key
   */
  toBase58() {
    return ADDRESS_CODEC.decode(this._publicKeyBytes);
  }
  toJSON() {
    return this.toBase58();
  }

  /**
   * Return the byte array representation of the public key in big endian
   */
  toBytes() {
    return new Uint8Array(this._publicKeyBytes);
  }

  /**
   * Verify a signature for the provided message with this public key.
   * @since 2.0.0
   */
  async verifySignature(signature, message) {
    assertVerificationCapabilityIsAvailable();
    const publicKeyBytes = Uint8Array.from(this._publicKeyBytes);
    const publicKeyCryptoKey = await globalThis.crypto.subtle.importKey('raw', publicKeyBytes, {
      name: 'Ed25519'
    }, false, ['verify']);
    return verifySignature(publicKeyCryptoKey, signatureBytes(signature), message);
  }

  /**
   * Verify a signature for the provided message with this public key.
   * @deprecated Deprecated: scheduled for removal in v3. Use {@link verifySignature} instead.
   */
  verifySignatureSync(signature, message) {
    return verify(signature, message, this.toBytes());
  }

  /**
   * Return the Buffer representation of the public key in big endian
   * @deprecated Deprecated: scheduled for removal in v3. Use {@link toBytes} instead.
   */
  toBuffer() {
    return buffer.Buffer.from(this._publicKeyBytes);
  }

  /**
   * Borsh-compatible encoding (little-endian)
   */
  encode() {
    return Uint8Array.from(this._publicKeyBytes).reverse();
  }

  /**
   * Borsh-compatible decoding (little-endian)
   */
  static decode(data) {
    const encoded = toUint8ArrayView(data);
    assert(encoded.length === PUBLIC_KEY_LENGTH, ERROR__INVALID_PUBLIC_KEY_INPUT);
    return new Address(reverseCopyLittleEndianPublicKeyBytes(encoded));
  }

  /**
   * Borsh-compatible unchecked decoding (little-endian)
   */
  static decodeUnchecked(data) {
    const encoded = toUint8ArrayView(data);
    assert(encoded.length >= PUBLIC_KEY_LENGTH, ERROR__INVALID_PUBLIC_KEY_INPUT);
    const firstField = encoded.subarray(0, PUBLIC_KEY_LENGTH);
    return new Address(reverseCopyLittleEndianPublicKeyBytes(firstField));
  }
  get [Symbol.toStringTag]() {
    return `Address(${this.toString()})`;
  }

  /**
   * Return the base-58 representation of the public key
   */
  toString() {
    return this.toBase58();
  }

  /**
   * Derive a public key from another key, a seed, and a program ID.
   * The program ID will also serve as the owner of the public key, giving
   * it permission to write data to the account.
   */
  static async createWithSeed(fromAddress, seed, programId) {
    const baseAddress = fromAddress.toBase58();
    assertIsAddress(baseAddress);
    const programAddress = programId.toBase58();
    assertIsAddress(programAddress);
    const derivedAddress = await createAddressWithSeed({
      baseAddress,
      programAddress,
      seed
    });
    return new Address(derivedAddress);
  }

  /**
   * Sync version of createProgramAddress
   * For backwards compatibility
   *
   * @deprecated Use {@link createProgramAddress} instead
   */
  static createProgramAddressSync(seeds, programId) {
    const bytes = buildProgramDerivedAddressInputBytes(seeds, programId);
    const publicKeyBytes = sha256Sync(bytes);
    if (isOnCurve(publicKeyBytes)) {
      throw new Error(ERROR__INVALID_SEEDS_POINT_ON_CURVE);
    }
    return new Address(publicKeyBytes);
  }

  /**
   * Derive a program address from seeds and a program ID.
   */
  static async createProgramAddress(seeds, programId) {
    const bytes = buildProgramDerivedAddressInputBytes(seeds, programId);
    const publicKeyBytes = await sha256(bytes);
    if (isOnCurve(publicKeyBytes)) {
      throw new Error(ERROR__INVALID_SEEDS_POINT_ON_CURVE);
    }
    return new Address(publicKeyBytes);
  }

  /**
   * Find a valid program address
   *
   * Valid program addresses must fall off the ed25519 curve.  This function
   * iterates a nonce until it finds one that when combined with the seeds
   * results in a valid program address.
   */
  static findProgramAddressSync(seeds, programId) {
    for (const [nonce, seedsWithNonce] of programAddressNonceCandidates(seeds)) {
      try {
        const derivedAddress = this.createProgramAddressSync(seedsWithNonce, programId);
        return [derivedAddress, nonce];
      } catch (err) {
        if (isInvalidSeedsPointOnCurveError(err)) {
          continue;
        }
        throw err;
      }
    }
    throw new Error(ERROR__FAILED_TO_FIND_VIABLE_PROGRAM_ADDRESS_NONCE);
  }

  /**
   * Async version of findProgramAddressSync
   * For backwards compatibility
   *
   * @deprecated Use {@link findProgramAddressSync} instead
   */
  static async findProgramAddress(seeds, programId) {
    for (const [nonce, seedsWithNonce] of programAddressNonceCandidates(seeds)) {
      try {
        const derivedAddress = await this.createProgramAddress(seedsWithNonce, programId);
        return [derivedAddress, nonce];
      } catch (err) {
        if (isInvalidSeedsPointOnCurveError(err)) {
          continue;
        }
        throw err;
      }
    }
    throw new Error(ERROR__FAILED_TO_FIND_VIABLE_PROGRAM_ADDRESS_NONCE);
  }

  /**
   * Check that a pubkey is on the ed25519 curve.
   */
  static isOnCurve(addressData) {
    const address = new Address(addressData);
    return isOnCurve(address.toBytes());
  }
}
_Address = Address;
Address.default = new _Address('11111111111111111111111111111111');
function isUint8ArrayLike(value) {
  return value instanceof Uint8Array;
}
function assertUnreachablePublicKeyInput(value) {
  throw new Error(ERROR__INVALID_PUBLIC_KEY_INPUT);
}
function isInvalidSeedsPointOnCurveError(error) {
  return error instanceof Error && error.message === ERROR__INVALID_SEEDS_POINT_ON_CURVE;
}
function* programAddressNonceCandidates(seeds) {
  let nonce = 255;
  while (nonce != 0) {
    yield [nonce, seeds.concat(Uint8Array.of(nonce))];
    nonce--;
  }
}
function buildProgramDerivedAddressInputBytes(seeds, programId) {
  if (seeds.length > MAX_SEEDS) {
    throw new TypeError(`Max seed count exceeded`);
  }
  for (const seed of seeds) {
    if (seed.length > MAX_SEED_LENGTH) {
      throw new TypeError(`Max seed length exceeded`);
    }
  }
  return concatUint8Arrays([...seeds, programId.toBytes(), PDA_MARKER_BYTES]);
}
function reverseCopyLittleEndianPublicKeyBytes(bytes) {
  const reversedBytes = new Uint8Array(PUBLIC_KEY_LENGTH);
  for (let index = 0; index < PUBLIC_KEY_LENGTH; index++) {
    reversedBytes[index] = bytes[PUBLIC_KEY_LENGTH - 1 - index];
  }
  return reversedBytes;
}

/**
 * Normalize constructor Uint8Array input into a canonical 32-byte public key byte array.
 * @internal
 */
function bytesFromUint8Array(bytes) {
  assert(bytes.length <= PUBLIC_KEY_LENGTH, ERROR__INVALID_PUBLIC_KEY_INPUT);
  if (bytes.length === PUBLIC_KEY_LENGTH) {
    return new Uint8Array(bytes);
  }
  const padded = new Uint8Array(PUBLIC_KEY_LENGTH);
  padded.set(bytes, PUBLIC_KEY_LENGTH - bytes.length);
  return padded;
}

/**
 * Convert constructor number input into a canonical 32-byte public key byte array.
 * @internal
 */
function bytesFromNumber(value) {
  const isValidNumber = Number.isSafeInteger(value) && value >= 0;
  assert(isValidNumber, ERROR__INVALID_PUBLIC_KEY_INPUT);
  return bytesFromBigInt(BigInt(value));
}

/**
 * Convert constructor bigint input into a canonical 32-byte public key byte array.
 * @internal
 */
function bytesFromBigInt(value) {
  assert(value >= 0n && value <= 0xffffffffffffffff_ffffffffffffffff_ffffffffffffffff_ffffffffffffffffn, ERROR__INVALID_PUBLIC_KEY_INPUT);
  const out = new Uint8Array(PUBLIC_KEY_LENGTH);
  let remainder = value;
  for (let index = PUBLIC_KEY_LENGTH - 1; index >= 0 && remainder > 0n; index -= 1) {
    out[index] = Number(remainder & 0xffn);
    remainder >>= 8n;
  }
  return out;
}

/**
 * Convert constructor address-string input into a public key byte array.
 * @internal
 */
function bytesFromAddressString(value) {
  assertIsAddress(value);
  const encoded = ADDRESS_CODEC.encode(value);
  return new Uint8Array(encoded);
}

/**
 * Convert constructor number-array input into a canonical 32-byte public key byte array.
 * @internal
 */
function bytesFromNumberArray(value) {
  const parsed = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    const byteValue = value[index];
    const isValidByte = Number.isInteger(byteValue) && byteValue >= 0 && byteValue <= 0xff;
    assert(isValidByte, ERROR__INVALID_PUBLIC_KEY_INPUT);
    parsed[index] = byteValue;
  }
  return bytesFromUint8Array(parsed);
}

const BPF_LOADER_DEPRECATED_PROGRAM_ID = new Address('BPFLoader1111111111111111111111111111111111');

// src/array.ts
function assertValidNumberOfItemsForCodec(codecDescription, expected, actual) {
  if (expected !== actual) {
    throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_NUMBER_OF_ITEMS, {
      actual,
      codecDescription,
      expected
    });
  }
}
function sumCodecSizes(sizes) {
  return sizes.reduce((all, size) => all === null || size === null ? null : all + size, 0);
}
function getFixedSize(codec) {
  return isFixedSize(codec) ? codec.fixedSize : null;
}
function getMaxSize(codec) {
  return isFixedSize(codec) ? codec.fixedSize : codec.maxSize ?? null;
}

// src/array.ts
function getArrayEncoder(item, config = {}) {
  const size = config.size ?? codecsNumbers.getU32Encoder();
  const fixedSize = computeArrayLikeCodecSize(size, getFixedSize(item));
  const maxSize = computeArrayLikeCodecSize(size, getMaxSize(item)) ?? void 0;
  return createEncoder({
    ...fixedSize !== null ? { fixedSize } : {
      getSizeFromValue: (array) => {
        const prefixSize = typeof size === "object" ? getEncodedSize(array.length, size) : 0;
        return prefixSize + [...array].reduce((all, value) => all + getEncodedSize(value, item), 0);
      },
      maxSize
    },
    write: (array, bytes, offset) => {
      if (typeof size === "number") {
        assertValidNumberOfItemsForCodec("array", size, array.length);
      }
      if (typeof size === "object") {
        offset = size.write(array.length, bytes, offset);
      }
      array.forEach((value) => {
        offset = item.write(value, bytes, offset);
      });
      return offset;
    }
  });
}
function getArrayDecoder(item, config = {}) {
  const size = config.size ?? codecsNumbers.getU32Decoder();
  const itemSize = getFixedSize(item);
  const fixedSize = computeArrayLikeCodecSize(size, itemSize);
  const maxSize = computeArrayLikeCodecSize(size, getMaxSize(item)) ?? void 0;
  return createDecoder({
    ...fixedSize !== null ? { fixedSize } : { maxSize },
    read: (bytes, offset) => {
      const array = [];
      if (typeof size === "object" && bytes.slice(offset).length === 0) {
        return [array, offset];
      }
      if (size === "remainder") {
        while (offset < bytes.length) {
          const [value, newOffset2] = item.read(bytes, offset);
          offset = newOffset2;
          array.push(value);
        }
        return [array, offset];
      }
      const [resolvedSize, newOffset] = typeof size === "number" ? [size, offset] : size.read(bytes, offset);
      offset = newOffset;
      for (let i = 0; i < resolvedSize; i += 1) {
        const [value, newOffset2] = item.read(bytes, offset);
        offset = newOffset2;
        array.push(value);
      }
      return [array, offset];
    }
  });
}
function getArrayCodec(item, config = {}) {
  return combineCodec(getArrayEncoder(item, config), getArrayDecoder(item, config));
}
function computeArrayLikeCodecSize(size, itemSize) {
  if (typeof size !== "number") return null;
  if (size === 0) return 0;
  return itemSize === null ? null : itemSize * size;
}
function getBytesEncoder() {
  return createEncoder({
    getSizeFromValue: (value) => value.length,
    write: (value, bytes, offset) => {
      bytes.set(value, offset);
      return offset + value.length;
    }
  });
}
function getBytesDecoder() {
  return createDecoder({
    read: (bytes, offset) => {
      const slice = bytes.slice(offset);
      return [slice, offset + slice.length];
    }
  });
}
function getBytesCodec() {
  return combineCodec(getBytesEncoder(), getBytesDecoder());
}

// src/enum-helpers.ts
function getEnumStats(constructor) {
  const numericalValues = [...new Set(Object.values(constructor).filter((v) => typeof v === "number"))].sort();
  const enumRecord = Object.fromEntries(Object.entries(constructor).slice(numericalValues.length));
  const enumKeys = Object.keys(enumRecord);
  const enumValues = Object.values(enumRecord);
  const stringValues = [
    .../* @__PURE__ */ new Set([...enumKeys, ...enumValues.filter((v) => typeof v === "string")])
  ];
  return { enumKeys, enumRecord, enumValues, numericalValues, stringValues };
}
function getEnumIndexFromVariant({
  enumKeys,
  enumValues,
  variant
}) {
  const valueIndex = findLastIndex(enumValues, (value) => value === variant);
  if (valueIndex >= 0) return valueIndex;
  return enumKeys.findIndex((key) => key === variant);
}
function getEnumIndexFromDiscriminator({
  discriminator,
  enumKeys,
  enumValues,
  useValuesAsDiscriminators
}) {
  if (!useValuesAsDiscriminators) {
    return discriminator >= 0 && discriminator < enumKeys.length ? discriminator : -1;
  }
  return findLastIndex(enumValues, (value) => value === discriminator);
}
function findLastIndex(array, predicate) {
  let l = array.length;
  while (l--) {
    if (predicate(array[l], l, array)) return l;
  }
  return -1;
}
function formatNumericalValues(values) {
  if (values.length === 0) return "";
  let range = [values[0], values[0]];
  const ranges = [];
  for (let index = 1; index < values.length; index++) {
    const value = values[index];
    if (range[1] + 1 === value) {
      range[1] = value;
    } else {
      ranges.push(range[0] === range[1] ? `${range[0]}` : `${range[0]}-${range[1]}`);
      range = [value, value];
    }
  }
  ranges.push(range[0] === range[1] ? `${range[0]}` : `${range[0]}-${range[1]}`);
  return ranges.join(", ");
}

// src/enum.ts
function getEnumEncoder(constructor, config = {}) {
  const prefix = config.size ?? codecsNumbers.getU8Encoder();
  const useValuesAsDiscriminators = config.useValuesAsDiscriminators ?? false;
  const { enumKeys, enumValues, numericalValues, stringValues } = getEnumStats(constructor);
  if (useValuesAsDiscriminators && enumValues.some((value) => typeof value === "string")) {
    throw new SolanaError$1(SOLANA_ERROR__CODECS__CANNOT_USE_LEXICAL_VALUES_AS_ENUM_DISCRIMINATORS, {
      stringValues: enumValues.filter((v) => typeof v === "string")
    });
  }
  return transformEncoder(prefix, (variant) => {
    const index = getEnumIndexFromVariant({ enumKeys, enumValues, variant });
    if (index < 0) {
      throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_ENUM_VARIANT, {
        formattedNumericalValues: formatNumericalValues(numericalValues),
        numericalValues,
        stringValues,
        variant
      });
    }
    return useValuesAsDiscriminators ? enumValues[index] : index;
  });
}
function getEnumDecoder(constructor, config = {}) {
  const prefix = config.size ?? codecsNumbers.getU8Decoder();
  const useValuesAsDiscriminators = config.useValuesAsDiscriminators ?? false;
  const { enumKeys, enumValues, numericalValues } = getEnumStats(constructor);
  if (useValuesAsDiscriminators && enumValues.some((value) => typeof value === "string")) {
    throw new SolanaError$1(SOLANA_ERROR__CODECS__CANNOT_USE_LEXICAL_VALUES_AS_ENUM_DISCRIMINATORS, {
      stringValues: enumValues.filter((v) => typeof v === "string")
    });
  }
  return transformDecoder(prefix, (value) => {
    const discriminator = Number(value);
    const index = getEnumIndexFromDiscriminator({
      discriminator,
      enumKeys,
      enumValues,
      useValuesAsDiscriminators
    });
    if (index < 0) {
      const validDiscriminators = useValuesAsDiscriminators ? numericalValues : [...Array(enumKeys.length).keys()];
      throw new SolanaError$1(SOLANA_ERROR__CODECS__ENUM_DISCRIMINATOR_OUT_OF_RANGE, {
        discriminator,
        formattedValidDiscriminators: formatNumericalValues(validDiscriminators),
        validDiscriminators
      });
    }
    return enumValues[index];
  });
}
function getEnumCodec(constructor, config = {}) {
  return combineCodec(getEnumEncoder(constructor, config), getEnumDecoder(constructor, config));
}
function getStructEncoder(fields) {
  const fieldCodecs = fields.map(([, codec]) => codec);
  const fixedSize = sumCodecSizes(fieldCodecs.map(getFixedSize));
  const maxSize = sumCodecSizes(fieldCodecs.map(getMaxSize)) ?? void 0;
  return createEncoder({
    ...fixedSize === null ? {
      getSizeFromValue: (value) => fields.map(([key, codec]) => getEncodedSize(value[key], codec)).reduce((all, one) => all + one, 0),
      maxSize
    } : { fixedSize },
    write: (struct, bytes, offset) => {
      fields.forEach(([key, codec]) => {
        offset = codec.write(struct[key], bytes, offset);
      });
      return offset;
    }
  });
}
function getStructDecoder(fields) {
  const fieldCodecs = fields.map(([, codec]) => codec);
  const fixedSize = sumCodecSizes(fieldCodecs.map(getFixedSize));
  const maxSize = sumCodecSizes(fieldCodecs.map(getMaxSize)) ?? void 0;
  return createDecoder({
    ...fixedSize === null ? { maxSize } : { fixedSize },
    read: (bytes, offset) => {
      const struct = {};
      fields.forEach(([key, codec]) => {
        const [value, newOffset] = codec.read(bytes, offset);
        offset = newOffset;
        struct[key] = value;
      });
      return [struct, offset];
    }
  });
}
function getStructCodec(fields) {
  return combineCodec(
    getStructEncoder(fields),
    getStructDecoder(fields)
  );
}

/**
 * Maximum over-the-wire size of a Transaction
 *
 * 1280 is IPv6 minimum MTU
 * 40 bytes is the size of the IPv6 header
 * 8 bytes is the size of the fragment header
 */
const PACKET_DATA_SIZE = 1280 - 40 - 8;
const VERSION_PREFIX_MASK = 0x7f;
const SIGNATURE_LENGTH_IN_BYTES = 64;

class TransactionExpiredBlockheightExceededError extends Error {
  constructor(signature) {
    super(`Signature ${signature} has expired: block height exceeded.`);
    this.signature = void 0;
    this.signature = signature;
  }
}
Object.defineProperty(TransactionExpiredBlockheightExceededError.prototype, 'name', {
  value: 'TransactionExpiredBlockheightExceededError'
});
class TransactionExpiredTimeoutError extends Error {
  constructor(signature, timeoutSeconds) {
    super(`Transaction was not confirmed in ${timeoutSeconds.toFixed(2)} seconds. It is ` + 'unknown if it succeeded or failed. Check signature ' + `${signature} using the Solana Explorer or CLI tools.`);
    this.signature = void 0;
    this.signature = signature;
  }
}
Object.defineProperty(TransactionExpiredTimeoutError.prototype, 'name', {
  value: 'TransactionExpiredTimeoutError'
});
class TransactionExpiredNonceInvalidError extends Error {
  constructor(signature) {
    super(`Signature ${signature} has expired: the nonce is no longer valid.`);
    this.signature = void 0;
    this.signature = signature;
  }
}
Object.defineProperty(TransactionExpiredNonceInvalidError.prototype, 'name', {
  value: 'TransactionExpiredNonceInvalidError'
});

class MessageAccountKeys {
  constructor(staticAccountKeys, accountKeysFromLookups) {
    this.staticAccountKeys = void 0;
    this.accountKeysFromLookups = void 0;
    this.staticAccountKeys = staticAccountKeys;
    this.accountKeysFromLookups = accountKeysFromLookups;
  }
  keySegments() {
    const keySegments = [this.staticAccountKeys];
    if (this.accountKeysFromLookups) {
      keySegments.push(this.accountKeysFromLookups.writable);
      keySegments.push(this.accountKeysFromLookups.readonly);
    }
    return keySegments;
  }
  get(index) {
    for (const keySegment of this.keySegments()) {
      if (index < keySegment.length) {
        return keySegment[index];
      } else {
        index -= keySegment.length;
      }
    }
    return;
  }
  get length() {
    return this.keySegments().flat().length;
  }
  compileInstructions(instructions) {
    // Bail early if any account indexes would overflow a u8
    const U8_MAX = 255;
    if (this.length > U8_MAX + 1) {
      throw new Error('Account index overflow encountered during compilation');
    }
    const keyIndexMap = new Map();
    this.keySegments().flat().forEach((key, index) => {
      keyIndexMap.set(key.toBase58(), index);
    });
    const findKeyIndex = key => {
      const keyIndex = keyIndexMap.get(key.toBase58());
      if (keyIndex === undefined) throw new Error('Encountered an unknown instruction account key during compilation');
      return keyIndex;
    };
    return instructions.map(instruction => {
      return {
        programIdIndex: findKeyIndex(instruction.programId),
        accountKeyIndexes: instruction.keys.map(meta => findKeyIndex(meta.pubkey)),
        data: instruction.data
      };
    });
  }
}

class CompiledKeys {
  constructor(payer, keyMetaMap) {
    this.payer = void 0;
    this.keyMetaMap = void 0;
    this.payer = payer;
    this.keyMetaMap = keyMetaMap;
  }
  static compile(instructions, payer) {
    const keyMetaMap = new Map();
    const getOrInsertDefault = pubkey => {
      const address = pubkey.toBase58();
      let keyMeta = keyMetaMap.get(address);
      if (keyMeta === undefined) {
        keyMeta = {
          isSigner: false,
          isWritable: false,
          isInvoked: false
        };
        keyMetaMap.set(address, keyMeta);
      }
      return keyMeta;
    };
    const payerKeyMeta = getOrInsertDefault(payer);
    payerKeyMeta.isSigner = true;
    payerKeyMeta.isWritable = true;
    for (const ix of instructions) {
      getOrInsertDefault(ix.programId).isInvoked = true;
      for (const accountMeta of ix.keys) {
        const keyMeta = getOrInsertDefault(accountMeta.pubkey);
        keyMeta.isSigner ||= accountMeta.isSigner;
        keyMeta.isWritable ||= accountMeta.isWritable;
      }
    }
    return new CompiledKeys(payer, keyMetaMap);
  }
  getMessageComponents() {
    const mapEntries = [...this.keyMetaMap.entries()];
    assert(mapEntries.length <= 256, 'Max static account keys length exceeded');
    const writableSigners = mapEntries.filter(([, meta]) => meta.isSigner && meta.isWritable);
    const readonlySigners = mapEntries.filter(([, meta]) => meta.isSigner && !meta.isWritable);
    const writableNonSigners = mapEntries.filter(([, meta]) => !meta.isSigner && meta.isWritable);
    const readonlyNonSigners = mapEntries.filter(([, meta]) => !meta.isSigner && !meta.isWritable);
    const header = {
      numRequiredSignatures: writableSigners.length + readonlySigners.length,
      numReadonlySignedAccounts: readonlySigners.length,
      numReadonlyUnsignedAccounts: readonlyNonSigners.length
    };

    // sanity checks
    {
      assert(writableSigners.length > 0, 'Expected at least one writable signer key');
      const [payerAddress] = writableSigners[0];
      assert(payerAddress === this.payer.toBase58(), 'Expected first writable signer key to be the fee payer');
    }
    const staticAccountKeys = [...writableSigners.map(([address]) => new Address(address)), ...readonlySigners.map(([address]) => new Address(address)), ...writableNonSigners.map(([address]) => new Address(address)), ...readonlyNonSigners.map(([address]) => new Address(address))];
    return [header, staticAccountKeys];
  }
  extractTableLookup(lookupTable) {
    const [writableIndexes, drainedWritableKeys] = this.drainKeysFoundInLookupTable(lookupTable.state.addresses, keyMeta => !keyMeta.isSigner && !keyMeta.isInvoked && keyMeta.isWritable);
    const [readonlyIndexes, drainedReadonlyKeys] = this.drainKeysFoundInLookupTable(lookupTable.state.addresses, keyMeta => !keyMeta.isSigner && !keyMeta.isInvoked && !keyMeta.isWritable);

    // Don't extract lookup if no keys were found
    if (writableIndexes.length === 0 && readonlyIndexes.length === 0) {
      return;
    }
    return [{
      accountKey: lookupTable.key,
      writableIndexes,
      readonlyIndexes
    }, {
      writable: drainedWritableKeys,
      readonly: drainedReadonlyKeys
    }];
  }

  /** @internal */
  drainKeysFoundInLookupTable(lookupTableEntries, keyMetaFilter) {
    const lookupTableIndexes = new Array();
    const drainedKeys = new Array();
    for (const [address, keyMeta] of this.keyMetaMap.entries()) {
      if (keyMetaFilter(keyMeta)) {
        const key = new Address(address);
        const lookupTableIndex = lookupTableEntries.findIndex(entry => entry.equals(key));
        if (lookupTableIndex >= 0) {
          assert(lookupTableIndex < 256, 'Max lookup table index exceeded');
          lookupTableIndexes.push(lookupTableIndex);
          drainedKeys.push(key);
          this.keyMetaMap.delete(address);
        }
      }
    }
    return [lookupTableIndexes, drainedKeys];
  }
}

const SHORT_U16_ENCODER$2 = codecsNumbers.getShortU16Encoder();
const SHORT_U16_DECODER$3 = codecsNumbers.getShortU16Decoder();
const U8_DECODER$3 = codecsNumbers.getU8Decoder();
const U8_ENCODER$1 = codecsNumbers.getU8Encoder();
const BASE58_ENCODER$2 = getBase58Encoder();
const BASE58_DECODER$1 = getBase58Decoder();
const PUBLIC_KEY_DECODER$1 = fixDecoderSize(getBytesDecoder(), PUBLIC_KEY_LENGTH);
const COMPILED_INSTRUCTION_DECODER$1 = getStructDecoder([['programIdIndex', U8_DECODER$3], ['accounts', getArrayDecoder(U8_DECODER$3, {
  size: SHORT_U16_DECODER$3
})], ['data', getArrayDecoder(U8_DECODER$3, {
  size: SHORT_U16_DECODER$3
})]]);
const MESSAGE_DECODER = getStructDecoder([['numRequiredSignatures', U8_DECODER$3], ['numReadonlySignedAccounts', U8_DECODER$3], ['numReadonlyUnsignedAccounts', U8_DECODER$3], ['accountKeys', getArrayDecoder(PUBLIC_KEY_DECODER$1, {
  size: SHORT_U16_DECODER$3
})], ['recentBlockhash', PUBLIC_KEY_DECODER$1], ['instructions', getArrayDecoder(COMPILED_INSTRUCTION_DECODER$1, {
  size: SHORT_U16_DECODER$3
})]]);

/**
 * An instruction to execute by a program
 *
 * @property {number} programIdIndex
 * @property {number[]} accounts
 * @property {string} data
 */

/**
 * Message constructor arguments
 */

/**
 * List of instructions to be processed atomically
 */
class Message {
  constructor(args) {
    this.header = void 0;
    this.accountKeys = void 0;
    this.recentBlockhash = void 0;
    this.instructions = void 0;
    this.indexToProgramIds = new Map();
    this.header = args.header;
    this.accountKeys = args.accountKeys.map(account => new Address(account));
    this.recentBlockhash = args.recentBlockhash;
    this.instructions = args.instructions;
    this.instructions.forEach(ix => this.indexToProgramIds.set(ix.programIdIndex, this.accountKeys[ix.programIdIndex]));
  }
  get version() {
    return 'legacy';
  }
  get staticAccountKeys() {
    return this.accountKeys;
  }
  get compiledInstructions() {
    return this.instructions.map(ix => ({
      programIdIndex: ix.programIdIndex,
      accountKeyIndexes: ix.accounts,
      data: Uint8Array.from(BASE58_ENCODER$2.encode(ix.data))
    }));
  }
  get addressTableLookups() {
    return [];
  }
  getAccountKeys() {
    return new MessageAccountKeys(this.staticAccountKeys);
  }
  static compile(args) {
    const compiledKeys = CompiledKeys.compile(args.instructions, args.payerKey);
    const [header, staticAccountKeys] = compiledKeys.getMessageComponents();
    const accountKeys = new MessageAccountKeys(staticAccountKeys);
    const instructions = accountKeys.compileInstructions(args.instructions).map(ix => ({
      programIdIndex: ix.programIdIndex,
      accounts: ix.accountKeyIndexes,
      data: BASE58_DECODER$1.decode(ix.data)
    }));
    return new Message({
      header,
      accountKeys: staticAccountKeys,
      recentBlockhash: args.recentBlockhash,
      instructions
    });
  }
  isAccountSigner(index) {
    return index < this.header.numRequiredSignatures;
  }
  isAccountWritable(index) {
    const numSignedAccounts = this.header.numRequiredSignatures;
    if (index >= this.header.numRequiredSignatures) {
      const unsignedAccountIndex = index - numSignedAccounts;
      const numUnsignedAccounts = this.accountKeys.length - numSignedAccounts;
      const numWritableUnsignedAccounts = numUnsignedAccounts - this.header.numReadonlyUnsignedAccounts;
      return unsignedAccountIndex < numWritableUnsignedAccounts;
    } else {
      const numWritableSignedAccounts = numSignedAccounts - this.header.numReadonlySignedAccounts;
      return index < numWritableSignedAccounts;
    }
  }
  isProgramId(index) {
    return this.indexToProgramIds.has(index);
  }
  programIds() {
    return [...this.indexToProgramIds.values()];
  }
  nonProgramIds() {
    return this.accountKeys.filter((_, index) => !this.isProgramId(index));
  }
  serialize() {
    const numKeys = this.accountKeys.length;
    const keyCount = SHORT_U16_ENCODER$2.encode(numKeys);
    const instructions = this.instructions.map(instruction => {
      const {
        accounts,
        programIdIndex
      } = instruction;
      const data = Array.from(BASE58_ENCODER$2.encode(instruction.data));
      return {
        programIdIndex,
        keyIndicesCount: SHORT_U16_ENCODER$2.encode(accounts.length),
        keyIndices: accounts,
        dataLength: SHORT_U16_ENCODER$2.encode(data.length),
        data
      };
    });
    const instructionBuffer = new Uint8Array(PACKET_DATA_SIZE);
    const instructionCount = SHORT_U16_ENCODER$2.encode(instructions.length);
    instructionBuffer.set(instructionCount, 0);
    let instructionBufferLength = instructionCount.length;
    instructions.forEach(instruction => {
      const instructionLayout = getStructEncoder([['programIdIndex', U8_ENCODER$1], ['keyIndicesCount', fixEncoderSize(getBytesEncoder(), instruction.keyIndicesCount.length)], ['keyIndices', getArrayEncoder(U8_ENCODER$1, {
        size: instruction.keyIndices.length
      })], ['dataLength', fixEncoderSize(getBytesEncoder(), instruction.dataLength.length)], ['data', getArrayEncoder(U8_ENCODER$1, {
        size: instruction.data.length
      })]]);
      const encodedInstruction = instructionLayout.encode(instruction);
      instructionBuffer.set(encodedInstruction, instructionBufferLength);
      instructionBufferLength += encodedInstruction.length;
    });
    const instructionData = instructionBuffer.subarray(0, instructionBufferLength);
    const signDataLayout = getStructEncoder([['numRequiredSignatures', fixEncoderSize(getBytesEncoder(), 1)], ['numReadonlySignedAccounts', fixEncoderSize(getBytesEncoder(), 1)], ['numReadonlyUnsignedAccounts', fixEncoderSize(getBytesEncoder(), 1)], ['keyCount', fixEncoderSize(getBytesEncoder(), keyCount.length)], ['keys', getArrayEncoder(fixEncoderSize(getBytesEncoder(), PUBLIC_KEY_LENGTH), {
      size: numKeys
    })], ['recentBlockhash', fixEncoderSize(getBytesEncoder(), PUBLIC_KEY_LENGTH)]]);
    const transaction = {
      numRequiredSignatures: Uint8Array.from([this.header.numRequiredSignatures]),
      numReadonlySignedAccounts: Uint8Array.from([this.header.numReadonlySignedAccounts]),
      numReadonlyUnsignedAccounts: Uint8Array.from([this.header.numReadonlyUnsignedAccounts]),
      keyCount,
      keys: this.accountKeys.map(key => key.toBytes()),
      recentBlockhash: BASE58_ENCODER$2.encode(this.recentBlockhash)
    };
    const signData = new Uint8Array(2048);
    const encodedSignData = signDataLayout.encode(transaction);
    signData.set(encodedSignData, 0);
    const length = encodedSignData.length;
    signData.set(instructionData, length);
    return toPackedUint8Array(signData.subarray(0, length + instructionData.length));
  }

  /**
   * Decode a compiled message into a Message object.
   */
  static from(buffer) {
    const decodedMessage = MESSAGE_DECODER.decode(toUint8ArrayView(buffer));
    const numRequiredSignatures = decodedMessage.numRequiredSignatures;
    if (numRequiredSignatures !== (numRequiredSignatures & VERSION_PREFIX_MASK)) {
      throw new Error('Versioned messages must be deserialized with VersionedMessage.deserialize()');
    }
    const accountKeys = decodedMessage.accountKeys.map(account => new Address(account));
    const instructions = decodedMessage.instructions.map(instruction => ({
      programIdIndex: instruction.programIdIndex,
      accounts: [...instruction.accounts],
      data: BASE58_DECODER$1.decode(toUint8ArrayView(instruction.data))
    }));
    const messageArgs = {
      header: {
        numRequiredSignatures,
        numReadonlySignedAccounts: decodedMessage.numReadonlySignedAccounts,
        numReadonlyUnsignedAccounts: decodedMessage.numReadonlyUnsignedAccounts
      },
      recentBlockhash: BASE58_DECODER$1.decode(decodedMessage.recentBlockhash),
      accountKeys,
      instructions
    };
    return new Message(messageArgs);
  }
}

const BYTES_ENCODER = getBytesEncoder();
const SHORT_U16_ENCODER$1 = codecsNumbers.getShortU16Encoder();
const SHORT_U16_DECODER$2 = codecsNumbers.getShortU16Decoder();
const U8_DECODER$2 = codecsNumbers.getU8Decoder();
const U8_ENCODER = codecsNumbers.getU8Encoder();
const BASE58_ENCODER$1 = getBase58Encoder();
const BASE58_DECODER = getBase58Decoder();
const PUBLIC_KEY_DECODER = fixDecoderSize(getBytesDecoder(), PUBLIC_KEY_LENGTH);
const COMPILED_INSTRUCTION_DECODER = getStructDecoder([['programIdIndex', U8_DECODER$2], ['accountKeyIndexes', getArrayDecoder(U8_DECODER$2, {
  size: SHORT_U16_DECODER$2
})], ['data', getArrayDecoder(U8_DECODER$2, {
  size: SHORT_U16_DECODER$2
})]]);
const ADDRESS_TABLE_LOOKUP_DECODER = getStructDecoder([['accountKey', PUBLIC_KEY_DECODER], ['writableIndexes', getArrayDecoder(U8_DECODER$2, {
  size: SHORT_U16_DECODER$2
})], ['readonlyIndexes', getArrayDecoder(U8_DECODER$2, {
  size: SHORT_U16_DECODER$2
})]]);
const MESSAGE_V0_DECODER = getStructDecoder([['prefix', U8_DECODER$2], ['header', getStructDecoder([['numRequiredSignatures', U8_DECODER$2], ['numReadonlySignedAccounts', U8_DECODER$2], ['numReadonlyUnsignedAccounts', U8_DECODER$2]])], ['staticAccountKeys', getArrayDecoder(PUBLIC_KEY_DECODER, {
  size: SHORT_U16_DECODER$2
})], ['recentBlockhash', PUBLIC_KEY_DECODER], ['compiledInstructions', getArrayDecoder(COMPILED_INSTRUCTION_DECODER, {
  size: SHORT_U16_DECODER$2
})], ['addressTableLookups', getArrayDecoder(ADDRESS_TABLE_LOOKUP_DECODER, {
  size: SHORT_U16_DECODER$2
})]]);

/**
 * Message constructor arguments
 */

class MessageV0 {
  constructor(args) {
    this.header = void 0;
    this.staticAccountKeys = void 0;
    this.recentBlockhash = void 0;
    this.compiledInstructions = void 0;
    this.addressTableLookups = void 0;
    this.header = args.header;
    this.staticAccountKeys = args.staticAccountKeys;
    this.recentBlockhash = args.recentBlockhash;
    this.compiledInstructions = args.compiledInstructions;
    this.addressTableLookups = args.addressTableLookups;
  }
  get version() {
    return 0;
  }
  get numAccountKeysFromLookups() {
    let count = 0;
    for (const lookup of this.addressTableLookups) {
      count += lookup.readonlyIndexes.length + lookup.writableIndexes.length;
    }
    return count;
  }
  getAccountKeys(args) {
    let accountKeysFromLookups;
    if (args && 'accountKeysFromLookups' in args && args.accountKeysFromLookups) {
      if (this.numAccountKeysFromLookups != args.accountKeysFromLookups.writable.length + args.accountKeysFromLookups.readonly.length) {
        throw new Error('Failed to get account keys because of a mismatch in the number of account keys from lookups');
      }
      accountKeysFromLookups = args.accountKeysFromLookups;
    } else if (args && 'addressLookupTableAccounts' in args && args.addressLookupTableAccounts) {
      accountKeysFromLookups = this.resolveAddressTableLookups(args.addressLookupTableAccounts);
    } else if (this.addressTableLookups.length > 0) {
      throw new Error('Failed to get account keys because address table lookups were not resolved');
    }
    return new MessageAccountKeys(this.staticAccountKeys, accountKeysFromLookups);
  }
  isAccountSigner(index) {
    return index < this.header.numRequiredSignatures;
  }
  isAccountWritable(index) {
    const numSignedAccounts = this.header.numRequiredSignatures;
    const numStaticAccountKeys = this.staticAccountKeys.length;
    if (index >= numStaticAccountKeys) {
      const lookupAccountKeysIndex = index - numStaticAccountKeys;
      const numWritableLookupAccountKeys = this.addressTableLookups.reduce((count, lookup) => count + lookup.writableIndexes.length, 0);
      return lookupAccountKeysIndex < numWritableLookupAccountKeys;
    } else if (index >= this.header.numRequiredSignatures) {
      const unsignedAccountIndex = index - numSignedAccounts;
      const numUnsignedAccounts = numStaticAccountKeys - numSignedAccounts;
      const numWritableUnsignedAccounts = numUnsignedAccounts - this.header.numReadonlyUnsignedAccounts;
      return unsignedAccountIndex < numWritableUnsignedAccounts;
    } else {
      const numWritableSignedAccounts = numSignedAccounts - this.header.numReadonlySignedAccounts;
      return index < numWritableSignedAccounts;
    }
  }
  resolveAddressTableLookups(addressLookupTableAccounts) {
    const accountKeysFromLookups = {
      writable: [],
      readonly: []
    };
    for (const tableLookup of this.addressTableLookups) {
      const tableAccount = addressLookupTableAccounts.find(account => account.key.equals(tableLookup.accountKey));
      if (!tableAccount) {
        throw new Error(`Failed to find address lookup table account for table key ${tableLookup.accountKey.toBase58()}`);
      }
      for (const index of tableLookup.writableIndexes) {
        if (index < tableAccount.state.addresses.length) {
          accountKeysFromLookups.writable.push(tableAccount.state.addresses[index]);
        } else {
          throw new Error(`Failed to find address for index ${index} in address lookup table ${tableLookup.accountKey.toBase58()}`);
        }
      }
      for (const index of tableLookup.readonlyIndexes) {
        if (index < tableAccount.state.addresses.length) {
          accountKeysFromLookups.readonly.push(tableAccount.state.addresses[index]);
        } else {
          throw new Error(`Failed to find address for index ${index} in address lookup table ${tableLookup.accountKey.toBase58()}`);
        }
      }
    }
    return accountKeysFromLookups;
  }
  static compile(args) {
    const compiledKeys = CompiledKeys.compile(args.instructions, args.payerKey);
    const addressTableLookups = new Array();
    const accountKeysFromLookups = {
      writable: new Array(),
      readonly: new Array()
    };
    const lookupTableAccounts = args.addressLookupTableAccounts || [];
    for (const lookupTable of lookupTableAccounts) {
      const extractResult = compiledKeys.extractTableLookup(lookupTable);
      if (extractResult !== undefined) {
        const [addressTableLookup, {
          writable,
          readonly
        }] = extractResult;
        addressTableLookups.push(addressTableLookup);
        accountKeysFromLookups.writable.push(...writable);
        accountKeysFromLookups.readonly.push(...readonly);
      }
    }
    const [header, staticAccountKeys] = compiledKeys.getMessageComponents();
    const accountKeys = new MessageAccountKeys(staticAccountKeys, accountKeysFromLookups);
    const compiledInstructions = accountKeys.compileInstructions(args.instructions);
    return new MessageV0({
      header,
      staticAccountKeys,
      recentBlockhash: args.recentBlockhash,
      compiledInstructions,
      addressTableLookups
    });
  }
  serialize() {
    const encodedStaticAccountKeysLength = SHORT_U16_ENCODER$1.encode(this.staticAccountKeys.length);
    const serializedInstructions = this.serializeInstructions();
    const encodedInstructionsLength = SHORT_U16_ENCODER$1.encode(this.compiledInstructions.length);
    const serializedAddressTableLookups = this.serializeAddressTableLookups();
    const encodedAddressTableLookupsLength = SHORT_U16_ENCODER$1.encode(this.addressTableLookups.length);
    const messageLayout = getStructEncoder([['prefix', U8_ENCODER], ['header', getStructEncoder([['numRequiredSignatures', U8_ENCODER], ['numReadonlySignedAccounts', U8_ENCODER], ['numReadonlyUnsignedAccounts', U8_ENCODER]])], ['staticAccountKeysLength', fixEncoderSize(getBytesEncoder(), encodedStaticAccountKeysLength.length)], ['staticAccountKeys', getArrayEncoder(fixEncoderSize(getBytesEncoder(), PUBLIC_KEY_LENGTH), {
      size: this.staticAccountKeys.length
    })], ['recentBlockhash', fixEncoderSize(getBytesEncoder(), PUBLIC_KEY_LENGTH)], ['instructionsLength', fixEncoderSize(getBytesEncoder(), encodedInstructionsLength.length)], ['serializedInstructions', fixEncoderSize(getBytesEncoder(), serializedInstructions.length)], ['addressTableLookupsLength', fixEncoderSize(getBytesEncoder(), encodedAddressTableLookupsLength.length)], ['serializedAddressTableLookups', fixEncoderSize(getBytesEncoder(), serializedAddressTableLookups.length)]]);
    const MESSAGE_VERSION_0_PREFIX = 1 << 7;
    const encodedMessage = messageLayout.encode({
      prefix: MESSAGE_VERSION_0_PREFIX,
      header: this.header,
      staticAccountKeysLength: encodedStaticAccountKeysLength,
      staticAccountKeys: this.staticAccountKeys.map(key => key.toBytes()),
      recentBlockhash: BASE58_ENCODER$1.encode(this.recentBlockhash),
      instructionsLength: encodedInstructionsLength,
      serializedInstructions,
      addressTableLookupsLength: encodedAddressTableLookupsLength,
      serializedAddressTableLookups
    });
    return toUint8ArrayView(encodedMessage);
  }
  serializeInstructions() {
    let serializedLength = 0;
    const serializedInstructions = new Uint8Array(PACKET_DATA_SIZE);
    for (const instruction of this.compiledInstructions) {
      const encodedAccountKeyIndexesLength = SHORT_U16_ENCODER$1.encode(instruction.accountKeyIndexes.length);
      const encodedDataLength = SHORT_U16_ENCODER$1.encode(instruction.data.length);
      const instructionLayout = getStructEncoder([['programIdIndex', U8_ENCODER], ['encodedAccountKeyIndexesLength', fixEncoderSize(getBytesEncoder(), encodedAccountKeyIndexesLength.length)], ['accountKeyIndexes', getArrayEncoder(U8_ENCODER, {
        size: instruction.accountKeyIndexes.length
      })], ['encodedDataLength', fixEncoderSize(getBytesEncoder(), encodedDataLength.length)], ['data', fixEncoderSize(getBytesEncoder(), instruction.data.length)]]);
      serializedLength = instructionLayout.write({
        programIdIndex: instruction.programIdIndex,
        encodedAccountKeyIndexesLength,
        accountKeyIndexes: instruction.accountKeyIndexes,
        encodedDataLength,
        data: instruction.data
      }, serializedInstructions, serializedLength);
    }
    return serializedInstructions.slice(0, serializedLength);
  }
  serializeAddressTableLookups() {
    const bytes = new Uint8Array(PACKET_DATA_SIZE);
    let offset = 0;
    for (const lookup of this.addressTableLookups) {
      offset = BYTES_ENCODER.write(lookup.accountKey.toBytes(), bytes, offset);
      offset = SHORT_U16_ENCODER$1.write(lookup.writableIndexes.length, bytes, offset);
      offset = BYTES_ENCODER.write(Uint8Array.from(lookup.writableIndexes), bytes, offset);
      offset = SHORT_U16_ENCODER$1.write(lookup.readonlyIndexes.length, bytes, offset);
      offset = BYTES_ENCODER.write(Uint8Array.from(lookup.readonlyIndexes), bytes, offset);
    }
    return bytes.slice(0, offset);
  }
  static deserialize(serializedMessage) {
    const prefix = serializedMessage[0];
    const maskedPrefix = prefix & VERSION_PREFIX_MASK;
    assert(prefix !== maskedPrefix, `Expected versioned message but received legacy message`);
    const version = maskedPrefix;
    assert(version === 0, `Expected versioned message with version 0 but found version ${version}`);
    const decodedMessage = MESSAGE_V0_DECODER.decode(serializedMessage);
    const header = decodedMessage.header;
    const staticAccountKeys = decodedMessage.staticAccountKeys.map(accountKey => new Address(accountKey));
    const recentBlockhash = BASE58_DECODER.decode(Uint8Array.from(decodedMessage.recentBlockhash));
    const compiledInstructions = decodedMessage.compiledInstructions.map(instruction => ({
      programIdIndex: instruction.programIdIndex,
      accountKeyIndexes: [...instruction.accountKeyIndexes],
      data: Uint8Array.from(instruction.data)
    }));
    const addressTableLookups = decodedMessage.addressTableLookups.map(lookup => ({
      accountKey: new Address(lookup.accountKey),
      writableIndexes: [...lookup.writableIndexes],
      readonlyIndexes: [...lookup.readonlyIndexes]
    }));
    return new MessageV0({
      header,
      staticAccountKeys,
      recentBlockhash,
      compiledInstructions,
      addressTableLookups
    });
  }
}

// eslint-disable-next-line no-redeclare
const VersionedMessage = {
  deserializeMessageVersion(serializedMessage) {
    const prefix = serializedMessage[0];
    const maskedPrefix = prefix & VERSION_PREFIX_MASK;

    // if the highest bit of the prefix is not set, the message is not versioned
    if (maskedPrefix === prefix) {
      return 'legacy';
    }

    // the lower 7 bits of the prefix indicate the message version
    return maskedPrefix;
  },
  deserialize: serializedMessage => {
    const version = VersionedMessage.deserializeMessageVersion(serializedMessage);
    if (version === 'legacy') {
      return Message.from(serializedMessage);
    }
    if (version === 0) {
      return MessageV0.deserialize(serializedMessage);
    } else {
      throw new Error(`Transaction message version ${version} deserialization is not supported`);
    }
  }
};

/** @internal */

/**
 * Transaction signature as base-58 encoded string
 */

let TransactionStatus = /*#__PURE__*/function (TransactionStatus) {
  TransactionStatus[TransactionStatus["BLOCKHEIGHT_EXCEEDED"] = 0] = "BLOCKHEIGHT_EXCEEDED";
  TransactionStatus[TransactionStatus["PROCESSED"] = 1] = "PROCESSED";
  TransactionStatus[TransactionStatus["TIMED_OUT"] = 2] = "TIMED_OUT";
  TransactionStatus[TransactionStatus["NONCE_INVALID"] = 3] = "NONCE_INVALID";
  return TransactionStatus;
}({});

/**
 * Default (empty) signature
 */
const DEFAULT_SIGNATURE = new Uint8Array(SIGNATURE_LENGTH_IN_BYTES);
const BASE58_CODEC = getBase58Codec();
const SHORT_U16_ENCODER = codecsNumbers.getShortU16Encoder();
const SHORT_U16_DECODER$1 = codecsNumbers.getShortU16Decoder();
const SIGNATURE_DECODER$1 = fixDecoderSize(getBytesDecoder(), SIGNATURE_LENGTH_IN_BYTES);
const TRANSACTION_WIRE_DECODER = getStructDecoder([['signatures', getArrayDecoder(SIGNATURE_DECODER$1, {
  size: SHORT_U16_DECODER$1
})], ['messageBytes', getBytesDecoder()]]);

/**
 * Account metadata used to define instructions
 */

/**
 * List of TransactionInstruction object fields that may be initialized at construction
 */

/**
 * Configuration object for Transaction.serialize()
 */

/**
 * @internal
 */

/**
 * Transaction Instruction class
 */
class TransactionInstruction {
  get data() {
    return this._data;
  }
  set data(data) {
    this._data = Object.getPrototypeOf(data) === Uint8Array.prototype ? data : Uint8Array.from(data);
  }
  constructor(opts) {
    /**
     * Public keys to include in this transaction
     * Boolean represents whether this pubkey needs to sign the transaction
     */
    this.keys = void 0;
    /**
     * Program Id to execute
     */
    this.programId = void 0;
    /**
     * Program input
     */
    this._data = new Uint8Array(0);
    this.programId = opts.programId;
    this.keys = opts.keys;
    if (opts.data) {
      this.data = opts.data;
    }
  }

  /**
   * @internal
   */
  toJSON() {
    return {
      keys: this.keys.map(({
        pubkey,
        isSigner,
        isWritable
      }) => ({
        pubkey: pubkey.toJSON(),
        isSigner,
        isWritable
      })),
      programId: this.programId.toJSON(),
      data: [...this.data]
    };
  }
}

/**
 * Pair of signature and corresponding public key
 */

/**
 * List of Transaction object fields that may be initialized at construction
 */

// For backward compatibility; an unfortunate consequence of being
// forced to over-export types by the documentation generator.
// See https://github.com/solana-labs/solana/pull/25820

/**
 * Blockhash-based transactions have a lifetime that are defined by
 * the blockhash they include. Any transaction whose blockhash is
 * too old will be rejected.
 */

/**
 * Use these options to construct a durable nonce transaction.
 */

/**
 * Nonce information to be used to build an offline Transaction.
 */

/**
 * @internal
 */

/**
 * Transaction class
 */
class Transaction {
  /**
   * The first (payer) Transaction signature
   *
   * @returns {Uint8Array | null} The payer's signature bytes
   */
  get signature() {
    if (this.signatures.length > 0) {
      return this.signatures[0].signature;
    }
    return null;
  }

  /**
   * The transaction fee payer
   */

  // Construct a transaction with a blockhash and lastValidBlockHeight

  // Construct a transaction using a durable nonce

  /**
   * @deprecated `TransactionCtorFields` has been deprecated and will be removed in a future version.
   * Please supply a `TransactionBlockhashCtor` instead.
   */

  /**
   * Construct an empty Transaction
   */
  constructor(opts) {
    /**
     * Signatures for the transaction.  Typically created by invoking the
     * `sign()` method
     */
    this.signatures = [];
    this.feePayer = void 0;
    /**
     * The instructions to atomically execute
     */
    this.instructions = [];
    /**
     * A recent transaction id. Must be populated by the caller
     */
    this.recentBlockhash = void 0;
    /**
     * the last block chain can advance to before tx is declared expired
     * */
    this.lastValidBlockHeight = void 0;
    /**
     * Optional Nonce information. If populated, transaction will use a durable
     * Nonce hash instead of a recentBlockhash. Must be populated by the caller
     */
    this.nonceInfo = void 0;
    /**
     * If this is a nonce transaction this represents the minimum slot from which
     * to evaluate if the nonce has advanced when attempting to confirm the
     * transaction. This protects against a case where the transaction confirmation
     * logic loads the nonce account from an old slot and assumes the mismatch in
     * nonce value implies that the nonce has been advanced.
     */
    this.minNonceContextSlot = void 0;
    /**
     * @internal
     */
    this._message = void 0;
    /**
     * @internal
     */
    this._json = void 0;
    if (!opts) {
      return;
    }
    if (opts.feePayer) {
      this.feePayer = opts.feePayer;
    }
    if (opts.signatures) {
      this.signatures = opts.signatures.map(({
        publicKey,
        signature
      }) => ({
        publicKey,
        signature: signature == null ? null : Uint8Array.from(signature)
      }));
    }
    if (Object.prototype.hasOwnProperty.call(opts, 'nonceInfo')) {
      const {
        minContextSlot,
        nonceInfo
      } = opts;
      this.minNonceContextSlot = minContextSlot;
      this.nonceInfo = nonceInfo;
    } else if (Object.prototype.hasOwnProperty.call(opts, 'lastValidBlockHeight')) {
      const {
        blockhash,
        lastValidBlockHeight
      } = opts;
      this.recentBlockhash = blockhash;
      this.lastValidBlockHeight = lastValidBlockHeight;
    } else {
      const {
        recentBlockhash,
        nonceInfo
      } = opts;
      if (nonceInfo) {
        this.nonceInfo = nonceInfo;
      }
      this.recentBlockhash = recentBlockhash;
    }
  }

  /**
   * @internal
   */
  toJSON() {
    return {
      recentBlockhash: this.recentBlockhash || null,
      feePayer: this.feePayer ? this.feePayer.toJSON() : null,
      nonceInfo: this.nonceInfo ? {
        nonce: this.nonceInfo.nonce,
        nonceInstruction: this.nonceInfo.nonceInstruction.toJSON()
      } : null,
      instructions: this.instructions.map(instruction => instruction.toJSON()),
      signers: this.signatures.map(({
        publicKey
      }) => {
        return publicKey.toJSON();
      })
    };
  }

  /**
   * Add one or more instructions to this Transaction
   *
   * @param {Array< Transaction | TransactionInstruction | TransactionInstructionCtorFields >} items - Instructions to add to the Transaction
   */
  add(...items) {
    if (items.length === 0) {
      throw new Error('No instructions');
    }
    items.forEach(item => {
      if ('instructions' in item) {
        this.instructions = this.instructions.concat(item.instructions);
      } else if ('data' in item && 'programId' in item && 'keys' in item) {
        this.instructions.push(item);
      } else {
        this.instructions.push(new TransactionInstruction(item));
      }
    });
    return this;
  }

  /**
   * Compile transaction data
   */
  compileMessage() {
    if (this._message && JSON.stringify(this.toJSON()) === JSON.stringify(this._json)) {
      return this._message;
    }
    let recentBlockhash;
    let instructions;
    if (this.nonceInfo) {
      recentBlockhash = this.nonceInfo.nonce;
      if (this.instructions[0] != this.nonceInfo.nonceInstruction) {
        instructions = [this.nonceInfo.nonceInstruction, ...this.instructions];
      } else {
        instructions = this.instructions;
      }
    } else {
      recentBlockhash = this.recentBlockhash;
      instructions = this.instructions;
    }
    if (!recentBlockhash) {
      throw new Error('Transaction recentBlockhash required');
    }
    if (instructions.length < 1) {
      console.warn('No instructions provided');
    }
    let feePayer;
    if (this.feePayer) {
      feePayer = this.feePayer;
    } else if (this.signatures.length > 0 && this.signatures[0].publicKey) {
      // Use implicit fee payer
      feePayer = this.signatures[0].publicKey;
    } else {
      throw new Error('Transaction fee payer required');
    }
    for (let i = 0; i < instructions.length; i++) {
      if (instructions[i].programId === undefined) {
        throw new Error(`Transaction instruction index ${i} has undefined program id`);
      }
    }
    const programIds = [];
    const accountMetas = [];
    instructions.forEach(instruction => {
      instruction.keys.forEach(accountMeta => {
        accountMetas.push({
          ...accountMeta
        });
      });
      const programId = instruction.programId.toString();
      if (!programIds.includes(programId)) {
        programIds.push(programId);
      }
    });

    // Append programID account metas
    programIds.forEach(programId => {
      accountMetas.push({
        pubkey: new Address(programId),
        isSigner: false,
        isWritable: false
      });
    });

    // Cull duplicate account metas
    const uniqueMetas = [];
    accountMetas.forEach(accountMeta => {
      const pubkeyString = accountMeta.pubkey.toString();
      const uniqueIndex = uniqueMetas.findIndex(x => {
        return x.pubkey.toString() === pubkeyString;
      });
      if (uniqueIndex > -1) {
        uniqueMetas[uniqueIndex].isWritable = uniqueMetas[uniqueIndex].isWritable || accountMeta.isWritable;
        uniqueMetas[uniqueIndex].isSigner = uniqueMetas[uniqueIndex].isSigner || accountMeta.isSigner;
      } else {
        uniqueMetas.push(accountMeta);
      }
    });

    // Sort. Prioritizing first by signer, then by writable
    uniqueMetas.sort(function (x, y) {
      if (x.isSigner !== y.isSigner) {
        // Signers always come before non-signers
        return x.isSigner ? -1 : 1;
      }
      if (x.isWritable !== y.isWritable) {
        // Writable accounts always come before read-only accounts
        return x.isWritable ? -1 : 1;
      }
      // Otherwise, sort by pubkey, stringwise.
      const options = {
        localeMatcher: 'best fit',
        usage: 'sort',
        sensitivity: 'variant',
        ignorePunctuation: false,
        numeric: false,
        caseFirst: 'lower'
      };
      return x.pubkey.toBase58().localeCompare(y.pubkey.toBase58(), 'en', options);
    });

    // Move fee payer to the front
    const feePayerIndex = uniqueMetas.findIndex(x => {
      return x.pubkey.equals(feePayer);
    });
    if (feePayerIndex > -1) {
      const [payerMeta] = uniqueMetas.splice(feePayerIndex, 1);
      payerMeta.isSigner = true;
      payerMeta.isWritable = true;
      uniqueMetas.unshift(payerMeta);
    } else {
      uniqueMetas.unshift({
        pubkey: feePayer,
        isSigner: true,
        isWritable: true
      });
    }

    // Disallow unknown signers
    for (const signature of this.signatures) {
      const uniqueIndex = uniqueMetas.findIndex(x => {
        return x.pubkey.equals(signature.publicKey);
      });
      if (uniqueIndex > -1) {
        if (!uniqueMetas[uniqueIndex].isSigner) {
          uniqueMetas[uniqueIndex].isSigner = true;
          console.warn('Transaction references a signature that is unnecessary, ' + 'only the fee payer and instruction signer accounts should sign a transaction. ' + 'This behavior is deprecated and will throw an error in the next major version release.');
        }
      } else {
        throw new Error(`unknown signer: ${signature.publicKey.toString()}`);
      }
    }
    let numRequiredSignatures = 0;
    let numReadonlySignedAccounts = 0;
    let numReadonlyUnsignedAccounts = 0;

    // Split out signing from non-signing keys and count header values
    const signedKeys = [];
    const unsignedKeys = [];
    uniqueMetas.forEach(({
      pubkey,
      isSigner,
      isWritable
    }) => {
      if (isSigner) {
        signedKeys.push(pubkey.toString());
        numRequiredSignatures += 1;
        if (!isWritable) {
          numReadonlySignedAccounts += 1;
        }
      } else {
        unsignedKeys.push(pubkey.toString());
        if (!isWritable) {
          numReadonlyUnsignedAccounts += 1;
        }
      }
    });
    const accountKeys = signedKeys.concat(unsignedKeys);
    const compiledInstructions = instructions.map(instruction => {
      const {
        data,
        programId
      } = instruction;
      return {
        programIdIndex: accountKeys.indexOf(programId.toString()),
        accounts: instruction.keys.map(meta => accountKeys.indexOf(meta.pubkey.toString())),
        data: BASE58_CODEC.decode(data)
      };
    });
    compiledInstructions.forEach(instruction => {
      assert(instruction.programIdIndex >= 0);
      instruction.accounts.forEach(keyIndex => assert(keyIndex >= 0));
    });
    return new Message({
      header: {
        numRequiredSignatures,
        numReadonlySignedAccounts,
        numReadonlyUnsignedAccounts
      },
      accountKeys,
      recentBlockhash,
      instructions: compiledInstructions
    });
  }

  /**
   * @internal
   */
  _compile() {
    const message = this.compileMessage();
    const signedKeys = message.accountKeys.slice(0, message.header.numRequiredSignatures);
    if (this.signatures.length === signedKeys.length) {
      const valid = this.signatures.every((pair, index) => {
        return signedKeys[index].equals(pair.publicKey);
      });
      if (valid) return message;
    }
    this.signatures = signedKeys.map(publicKey => ({
      signature: null,
      publicKey
    }));
    return message;
  }

  /**
   * Get the Transaction data that need to be covered by signatures
   */
  serializeMessage() {
    return this._compile().serialize();
  }

  /**
   * Get the estimated fee associated with a transaction
   *
   * @param {Connection} connection Connection to RPC Endpoint.
   *
   * @returns {Promise<bigint | null>} The estimated fee for the transaction
   */
  async getEstimatedFee(connection) {
    return (await connection.getFeeForMessage(this.compileMessage())).value;
  }

  /**
   * Specify the public keys which will be used to sign the Transaction.
   * The first signer will be used as the transaction fee payer account.
   *
   * Signatures can be added with either `partialSign` or `addSignature`
   *
   * @deprecated Deprecated since v0.84.0. Only the fee payer needs to be
   * specified and it can be set in the Transaction constructor or with the
   * `feePayer` property.
   */
  setSigners(...signers) {
    if (signers.length === 0) {
      throw new Error('No signers');
    }
    const seen = new Set();
    this.signatures = signers.filter(publicKey => {
      const key = publicKey.toString();
      if (seen.has(key)) {
        return false;
      } else {
        seen.add(key);
        return true;
      }
    }).map(publicKey => ({
      signature: null,
      publicKey
    }));
  }

  /**
   * Sign the Transaction with the specified signers. Multiple signatures may
   * be applied to a Transaction. The first signature is considered "primary"
   * and is used identify and confirm transactions.
   *
   * If the Transaction `feePayer` is not set, the first signer will be used
   * as the transaction fee payer account.
   *
   * Transaction fields should not be modified after the first call to `sign`,
   * as doing so may invalidate the signature and cause the Transaction to be
   * rejected.
   *
   * The Transaction must be assigned a valid `recentBlockhash` before invoking this method
   *
  * @param {Array<Signer>} signers Array of signers that will sign the transaction
   */
  async sign(...signers) {
    if (signers.length === 0) {
      throw new Error('No signers');
    }
    const uniqueSigners = this._dedupeSigners(signers);
    this.signatures = uniqueSigners.map(signer => ({
      signature: null,
      publicKey: signer.publicKey
    }));
    const message = this._compile();
    await this._partialSign(message, ...uniqueSigners);
  }

  /**
   * Partially sign a transaction with the specified accounts. All accounts must
   * correspond to either the fee payer or a signer account in the transaction
   * instructions.
   *
   * All the caveats from the `sign` method apply to `partialSign`
   *
   * @param {Array<Signer>} signers Array of signers that will sign the transaction
   */
  async partialSign(...signers) {
    if (signers.length === 0) {
      throw new Error('No signers');
    }
    const uniqueSigners = this._dedupeSigners(signers);
    const message = this._compile();
    await this._partialSign(message, ...uniqueSigners);
  }

  /**
   * @internal
   */
  async _partialSign(message, ...signers) {
    const signData = message.serialize();
    for (const signer of signers) {
      const signature = await signer.signBytes(signData);
      this._addSignature(signer.publicKey, signature);
    }
  }
  _dedupeSigners(signers) {
    const seen = new Set();
    const uniqueSigners = [];
    for (const signer of signers) {
      const key = signer.publicKey.toString();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      uniqueSigners.push(signer);
    }
    return uniqueSigners;
  }

  /**
   * Add an externally created signature to a transaction. The public key
   * must correspond to either the fee payer or a signer account in the transaction
   * instructions.
   *
   * @param {Address} pubkey Public key that will be added to the transaction.
   * @param {Uint8Array} signature An externally created signature to add to the transaction.
   */
  addSignature(pubkey, signature) {
    this._compile(); // Ensure signatures array is populated
    this._addSignature(pubkey, signature);
  }

  /**
   * @internal
   */
  _addSignature(pubkey, signature) {
    assert(signature.length === 64);
    const index = this.signatures.findIndex(sigpair => pubkey.equals(sigpair.publicKey));
    if (index < 0) {
      throw new Error(`unknown signer: ${pubkey.toString()}`);
    }
    this.signatures[index].signature = Uint8Array.from(signature);
  }

  /**
   * Verify signatures of a Transaction
   * Optional parameter specifies if we're expecting a fully signed Transaction or a partially signed one.
   * If no boolean is provided, we expect a fully signed Transaction by default.
   *
   * @param {boolean} [requireAllSignatures=true] Require a fully signed Transaction
   */
  verifySignatures(requireAllSignatures = true) {
    const signatureErrors = this._getMessageSignednessErrors(this.serializeMessage(), requireAllSignatures);
    return !signatureErrors;
  }

  /**
   * @internal
   */
  _getMessageSignednessErrors(message, requireAllSignatures) {
    const errors = {};
    for (const {
      signature,
      publicKey
    } of this.signatures) {
      if (signature === null) {
        if (requireAllSignatures) {
          (errors.missing ||= []).push(publicKey);
        }
      } else {
        if (!verify(signature, message, publicKey.toBytes())) {
          (errors.invalid ||= []).push(publicKey);
        }
      }
    }
    return errors.invalid || errors.missing ? errors : undefined;
  }

  /**
   * Serialize the Transaction in the wire format.
   *
  * @param {SerializeConfig} [config] Config of transaction.
   *
  * @returns {Uint8Array} Signature of transaction in wire format.
   */
  serialize(config) {
    const {
      requireAllSignatures,
      verifySignatures
    } = Object.assign({
      requireAllSignatures: true,
      verifySignatures: true
    }, config);
    const signData = this.serializeMessage();
    if (verifySignatures) {
      const sigErrors = this._getMessageSignednessErrors(signData, requireAllSignatures);
      if (sigErrors) {
        let errorMessage = 'Signature verification failed.';
        if (sigErrors.invalid) {
          errorMessage += `\nInvalid signature for public key${sigErrors.invalid.length === 1 ? '' : '(s)'} [\`${sigErrors.invalid.map(p => p.toBase58()).join('`, `')}\`].`;
        }
        if (sigErrors.missing) {
          errorMessage += `\nMissing signature for public key${sigErrors.missing.length === 1 ? '' : '(s)'} [\`${sigErrors.missing.map(p => p.toBase58()).join('`, `')}\`].`;
        }
        throw new Error(errorMessage);
      }
    }
    return this._serialize(signData);
  }

  /**
   * @internal
   */
  _serialize(signData) {
    const {
      signatures
    } = this;
    const signatureCount = SHORT_U16_ENCODER.encode(signatures.length);
    const transactionLength = signatureCount.length + signatures.length * 64 + signData.length;
    const wireTransaction = new Uint8Array(transactionLength);
    assert(signatures.length < 256);
    wireTransaction.set(signatureCount, 0);
    signatures.forEach(({
      signature
    }, index) => {
      if (signature !== null) {
        assert(signature.length === 64, `signature has invalid length`);
        wireTransaction.set(signature, signatureCount.length + index * 64);
      }
    });
    wireTransaction.set(signData, signatureCount.length + signatures.length * 64);
    assert(wireTransaction.length <= PACKET_DATA_SIZE, `Transaction too large: ${wireTransaction.length} > ${PACKET_DATA_SIZE}`);
    return wireTransaction;
  }

  /**
   * Deprecated method
   * @internal
   */
  get keys() {
    assert(this.instructions.length === 1);
    return this.instructions[0].keys.map(keyObj => keyObj.pubkey);
  }

  /**
   * Deprecated method
   * @internal
   */
  get programId() {
    assert(this.instructions.length === 1);
    return this.instructions[0].programId;
  }

  /**
   * Deprecated method
   * @internal
   */
  get data() {
    assert(this.instructions.length === 1);
    return this.instructions[0].data;
  }

  /**
   * Parse a wire transaction into a Transaction object.
   *
   * @param {Uint8Array | Array<number>} buffer Signature of wire Transaction
   *
   * @returns {Transaction} Transaction associated with the signature
   */
  static from(buffer) {
    const {
      signatures: decodedSignatures,
      messageBytes
    } = TRANSACTION_WIRE_DECODER.decode(toUint8ArrayView(buffer));
    const signatures = decodedSignatures.map(signature => BASE58_CODEC.decode(signature));
    return Transaction.populate(Message.from(toUint8ArrayView(messageBytes)), signatures);
  }

  /**
   * Populate Transaction object from message and signatures
   *
   * @param {Message} message Message of transaction
   * @param {Array<string>} signatures List of signatures to assign to the transaction
   *
   * @returns {Transaction} The populated Transaction
   */
  static populate(message, signatures = []) {
    const transaction = new Transaction();
    transaction.recentBlockhash = message.recentBlockhash;
    if (message.header.numRequiredSignatures > 0) {
      transaction.feePayer = message.accountKeys[0];
    }
    signatures.forEach((signature, index) => {
      const sigPubkeyPair = {
        signature: signature == BASE58_CODEC.decode(DEFAULT_SIGNATURE) ? null : Uint8Array.from(BASE58_CODEC.encode(signature)),
        publicKey: message.accountKeys[index]
      };
      transaction.signatures.push(sigPubkeyPair);
    });
    message.instructions.forEach(instruction => {
      const keys = instruction.accounts.map(account => {
        const pubkey = message.accountKeys[account];
        return {
          pubkey,
          isSigner: transaction.signatures.some(keyObj => keyObj.publicKey.toString() === pubkey.toString()) || message.isAccountSigner(account),
          isWritable: message.isAccountWritable(account)
        };
      });
      transaction.instructions.push(new TransactionInstruction({
        keys,
        programId: message.accountKeys[instruction.programIdIndex],
        data: Uint8Array.from(BASE58_CODEC.encode(instruction.data))
      }));
    });
    transaction._message = message;
    transaction._json = transaction.toJSON();
    return transaction;
  }
}

class TransactionMessage {
  constructor(args) {
    this.payerKey = void 0;
    this.instructions = void 0;
    this.recentBlockhash = void 0;
    this.payerKey = args.payerKey;
    this.instructions = args.instructions;
    this.recentBlockhash = args.recentBlockhash;
  }
  static decompile(message, args) {
    const {
      header,
      compiledInstructions,
      recentBlockhash
    } = message;
    const {
      numRequiredSignatures,
      numReadonlySignedAccounts,
      numReadonlyUnsignedAccounts
    } = header;
    const numWritableSignedAccounts = numRequiredSignatures - numReadonlySignedAccounts;
    assert(numWritableSignedAccounts > 0, 'Message header is invalid');
    const numWritableUnsignedAccounts = message.staticAccountKeys.length - numRequiredSignatures - numReadonlyUnsignedAccounts;
    assert(numWritableUnsignedAccounts >= 0, 'Message header is invalid');
    const accountKeys = message.getAccountKeys(args);
    const payerKey = accountKeys.get(0);
    if (payerKey === undefined) {
      throw new Error('Failed to decompile message because no account keys were found');
    }
    const instructions = [];
    for (const compiledIx of compiledInstructions) {
      const keys = [];
      for (const keyIndex of compiledIx.accountKeyIndexes) {
        const pubkey = accountKeys.get(keyIndex);
        if (pubkey === undefined) {
          throw new Error(`Failed to find key for account key index ${keyIndex}`);
        }
        const isSigner = keyIndex < numRequiredSignatures;
        let isWritable;
        if (isSigner) {
          isWritable = keyIndex < numWritableSignedAccounts;
        } else if (keyIndex < accountKeys.staticAccountKeys.length) {
          isWritable = keyIndex - numRequiredSignatures < numWritableUnsignedAccounts;
        } else {
          isWritable = keyIndex - accountKeys.staticAccountKeys.length <
          // accountKeysFromLookups cannot be undefined because we already found a pubkey for this index above
          accountKeys.accountKeysFromLookups.writable.length;
        }
        keys.push({
          pubkey,
          isSigner: keyIndex < header.numRequiredSignatures,
          isWritable
        });
      }
      const programId = accountKeys.get(compiledIx.programIdIndex);
      if (programId === undefined) {
        throw new Error(`Failed to find program id for program id index ${compiledIx.programIdIndex}`);
      }
      instructions.push(new TransactionInstruction({
        programId,
        data: compiledIx.data,
        keys
      }));
    }
    return new TransactionMessage({
      payerKey,
      instructions,
      recentBlockhash
    });
  }
  compileToLegacyMessage() {
    return Message.compile({
      payerKey: this.payerKey,
      recentBlockhash: this.recentBlockhash,
      instructions: this.instructions
    });
  }
  compileToV0Message(addressLookupTableAccounts) {
    return MessageV0.compile({
      payerKey: this.payerKey,
      recentBlockhash: this.recentBlockhash,
      instructions: this.instructions,
      addressLookupTableAccounts
    });
  }
}

const SIGNATURE_ENCODER = fixEncoderSize(getBytesEncoder(), SIGNATURE_LENGTH_IN_BYTES);
const SIGNATURE_DECODER = fixDecoderSize(getBytesDecoder(), SIGNATURE_LENGTH_IN_BYTES);
const VERSIONED_TRANSACTION_ENCODER = getStructEncoder([['signatures', getArrayEncoder(SIGNATURE_ENCODER, {
  size: codecsNumbers.getShortU16Encoder()
})], ['serializedMessage', getBytesEncoder()]]);
const VERSIONED_TRANSACTION_DECODER = getStructDecoder([['signatures', getArrayDecoder(SIGNATURE_DECODER, {
  size: codecsNumbers.getShortU16Decoder()
})], ['serializedMessage', getBytesDecoder()]]);
/**
 * Versioned transaction class
 */
class VersionedTransaction {
  get version() {
    return this.message.version;
  }
  constructor(message, signatures) {
    this.signatures = void 0;
    this.message = void 0;
    if (signatures !== undefined) {
      assert(signatures.length === message.header.numRequiredSignatures, 'Expected signatures length to be equal to the number of required signatures');
      this.signatures = signatures;
    } else {
      const defaultSignatures = [];
      for (let i = 0; i < message.header.numRequiredSignatures; i++) {
        defaultSignatures.push(new Uint8Array(SIGNATURE_LENGTH_IN_BYTES));
      }
      this.signatures = defaultSignatures;
    }
    this.message = message;
  }
  serialize() {
    const serializedMessage = this.message.serialize();
    for (const signature of this.signatures) {
      assert(signature.byteLength === SIGNATURE_LENGTH_IN_BYTES, 'Signature must be 64 bytes long');
    }
    return Uint8Array.from(VERSIONED_TRANSACTION_ENCODER.encode({
      signatures: this.signatures,
      serializedMessage
    }));
  }
  static deserialize(serializedTransaction) {
    const {
      serializedMessage,
      signatures
    } = VERSIONED_TRANSACTION_DECODER.decode(serializedTransaction);
    const message = VersionedMessage.deserialize(Uint8Array.from(serializedMessage));
    return new VersionedTransaction(message, signatures.map(signature => Uint8Array.from(signature)));
  }
  async sign(signers) {
    const messageData = this.message.serialize();
    const signerPubkeys = this.message.staticAccountKeys.slice(0, this.message.header.numRequiredSignatures);
    for (const signer of signers) {
      const signerIndex = signerPubkeys.findIndex(pubkey => pubkey.equals(signer.publicKey));
      assert(signerIndex >= 0, `Cannot sign with non signer key ${signer.publicKey.toBase58()}`);
      const signature = await signer.signBytes(messageData);
      assert(signature.byteLength === SIGNATURE_LENGTH_IN_BYTES, 'Signature must be 64 bytes long');
      this.signatures[signerIndex] = signature;
    }
  }
  addSignature(publicKey, signature) {
    assert(signature.byteLength === 64, 'Signature must be 64 bytes long');
    const signerPubkeys = this.message.staticAccountKeys.slice(0, this.message.header.numRequiredSignatures);
    const signerIndex = signerPubkeys.findIndex(pubkey => pubkey.equals(publicKey));
    assert(signerIndex >= 0, `Can not add signature; \`${publicKey.toBase58()}\` is not required to sign this transaction`);
    this.signatures[signerIndex] = signature;
  }
}

// TODO: These constants should be removed in favor of reading them out of a
// Syscall account

/**
 * @internal
 */
const NUM_TICKS_PER_SECOND = 160;

/**
 * @internal
 */
const DEFAULT_TICKS_PER_SLOT = 64;

/**
 * @internal
 */
const NUM_SLOTS_PER_SECOND = NUM_TICKS_PER_SECOND / DEFAULT_TICKS_PER_SLOT;

/**
 * @internal
 */
const MS_PER_SLOT = 1000 / NUM_SLOTS_PER_SECOND;

const SYSVAR_CLOCK_PUBKEY = new Address('SysvarC1ock11111111111111111111111111111111');
const SYSVAR_EPOCH_SCHEDULE_PUBKEY = new Address('SysvarEpochSchedu1e111111111111111111111111');
const SYSVAR_INSTRUCTIONS_PUBKEY = new Address('Sysvar1nstructions1111111111111111111111111');
const SYSVAR_RECENT_BLOCKHASHES_PUBKEY = new Address('SysvarRecentB1ockHashes11111111111111111111');
const SYSVAR_RENT_PUBKEY = new Address('SysvarRent111111111111111111111111111111111');
const SYSVAR_REWARDS_PUBKEY = new Address('SysvarRewards111111111111111111111111111111');
const SYSVAR_SLOT_HASHES_PUBKEY = new Address('SysvarS1otHashes111111111111111111111111111');
const SYSVAR_SLOT_HISTORY_PUBKEY = new Address('SysvarS1otHistory11111111111111111111111111');
const SYSVAR_STAKE_HISTORY_PUBKEY = new Address('SysvarStakeHistory1111111111111111111111111');

class SendTransactionError extends Error {
  constructor({
    action,
    signature,
    transactionMessage,
    logs
  }) {
    const maybeLogsOutput = logs ? `Logs: \n${JSON.stringify(logs.slice(-10), null, 2)}. ` : '';
    const guideText = '\nCatch the `SendTransactionError` and call `getLogs()` on it for full details.';
    let message;
    switch (action) {
      case 'send':
        message = `Transaction ${signature} resulted in an error. \n` + `${transactionMessage}. ` + maybeLogsOutput + guideText;
        break;
      case 'simulate':
        message = `Simulation failed. \nMessage: ${transactionMessage}. \n` + maybeLogsOutput + guideText;
        break;
      default:
        {
          message = `Unknown action '${(a => a)(action)}'`;
        }
    }
    super(message);
    this.signature = void 0;
    this.transactionMessage = void 0;
    this.transactionLogs = void 0;
    this.signature = signature;
    this.transactionMessage = transactionMessage;
    this.transactionLogs = logs ? logs : undefined;
  }
  get transactionError() {
    return {
      message: this.transactionMessage,
      logs: Array.isArray(this.transactionLogs) ? this.transactionLogs : undefined
    };
  }

  /* @deprecated Use `await getLogs()` instead */
  get logs() {
    const cachedLogs = this.transactionLogs;
    if (cachedLogs != null && typeof cachedLogs === 'object' && 'then' in cachedLogs) {
      return undefined;
    }
    return cachedLogs;
  }
  async getLogs(connection) {
    if (!Array.isArray(this.transactionLogs)) {
      this.transactionLogs = new Promise((resolve, reject) => {
        connection.getTransaction(this.signature).then(tx => {
          if (tx && tx.meta && tx.meta.logMessages) {
            const logs = tx.meta.logMessages;
            this.transactionLogs = logs;
            resolve(logs);
          } else {
            reject(new Error('Log messages not found'));
          }
        }).catch(reject);
      });
    }
    return await this.transactionLogs;
  }
}

// Keep in sync with client/src/rpc_custom_errors.rs
// Typescript `enums` thwart tree-shaking. See https://bargsten.org/jsts/enums/
const SolanaJSONRPCErrorCode = {
  JSON_RPC_SERVER_ERROR_BLOCK_CLEANED_UP: -32001,
  JSON_RPC_SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE: -32002,
  JSON_RPC_SERVER_ERROR_TRANSACTION_SIGNATURE_VERIFICATION_FAILURE: -32003,
  JSON_RPC_SERVER_ERROR_BLOCK_NOT_AVAILABLE: -32004,
  JSON_RPC_SERVER_ERROR_NODE_UNHEALTHY: -32005,
  JSON_RPC_SERVER_ERROR_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE: -32006,
  JSON_RPC_SERVER_ERROR_SLOT_SKIPPED: -32007,
  JSON_RPC_SERVER_ERROR_NO_SNAPSHOT: -32008,
  JSON_RPC_SERVER_ERROR_LONG_TERM_STORAGE_SLOT_SKIPPED: -32009,
  JSON_RPC_SERVER_ERROR_KEY_EXCLUDED_FROM_SECONDARY_INDEX: -32010,
  JSON_RPC_SERVER_ERROR_TRANSACTION_HISTORY_NOT_AVAILABLE: -32011,
  JSON_RPC_SCAN_ERROR: -32012,
  JSON_RPC_SERVER_ERROR_TRANSACTION_SIGNATURE_LEN_MISMATCH: -32013,
  JSON_RPC_SERVER_ERROR_BLOCK_STATUS_NOT_AVAILABLE_YET: -32014,
  JSON_RPC_SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION: -32015,
  JSON_RPC_SERVER_ERROR_MIN_CONTEXT_SLOT_NOT_REACHED: -32016
};
class SolanaJSONRPCError extends Error {
  constructor({
    code,
    message,
    data
  }, customMessage) {
    super(customMessage != null ? `${customMessage}: ${message}` : message);
    this.code = void 0;
    this.data = void 0;
    this.code = code;
    this.data = data;
    this.name = 'SolanaJSONRPCError';
  }
}

/**
 * Sign, send and confirm a transaction.
 *
 * If `commitment` option is not specified, defaults to 'finalized' commitment.
 *
 * @param {Connection} connection
 * @param {Transaction} transaction
 * @param {Array<Signer>} signers
 * @param {ConfirmOptions} [options]
 * @returns {Promise<TransactionSignature>}
 */
async function sendAndConfirmTransaction(connection, transaction, signers, options) {
  const sendOptions = options && {
    skipPreflight: options.skipPreflight,
    preflightCommitment: options.preflightCommitment || options.commitment,
    maxRetries: options.maxRetries,
    minContextSlot: options.minContextSlot
  };
  const signature = await connection.sendTransaction(transaction, signers, sendOptions);
  let status;
  if (transaction.recentBlockhash != null && transaction.lastValidBlockHeight != null) {
    status = (await connection.confirmTransaction({
      abortSignal: options?.abortSignal,
      signature: signature,
      blockhash: transaction.recentBlockhash,
      lastValidBlockHeight: transaction.lastValidBlockHeight
    }, options && options.commitment)).value;
  } else if (transaction.minNonceContextSlot != null && transaction.nonceInfo != null) {
    const {
      nonceInstruction
    } = transaction.nonceInfo;
    const nonceAccountPubkey = nonceInstruction.keys[0].pubkey;
    status = (await connection.confirmTransaction({
      abortSignal: options?.abortSignal,
      minContextSlot: transaction.minNonceContextSlot,
      nonceAccountPubkey,
      nonceValue: transaction.nonceInfo.nonce,
      signature
    }, options && options.commitment)).value;
  } else {
    if (options?.abortSignal != null) {
      console.warn('sendAndConfirmTransaction(): A transaction with a deprecated confirmation strategy was ' + 'supplied along with an `abortSignal`. Only transactions having `lastValidBlockHeight` ' + 'or a combination of `nonceInfo` and `minNonceContextSlot` are abortable.');
    }
    status = (await connection.confirmTransaction(signature, options && options.commitment)).value;
  }
  if (status.err) {
    if (signature != null) {
      throw new SendTransactionError({
        action: 'send',
        signature: signature,
        transactionMessage: `Status: (${JSON.stringify(status)})`
      });
    }
    throw new Error(`Transaction ${signature} failed (${JSON.stringify(status)})`);
  }
  return signature;
}

// zzz
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const UTF8_ENCODER = new TextEncoder();
const UTF8_DECODER = new TextDecoder('utf-8');

/**
 * Layout for a public key
 * @deprecated To be removed in v3. Use codecs-based layout helpers instead.
 */
const publicKey = (property = 'publicKey') => {
  return BufferLayout__namespace.blob(32, property);
};
/**
 * Layout for a Rust String type
 * @deprecated To be removed in v3. Use codecs-based layout helpers instead.
 */
const rustString = (property = 'string') => {
  const rsl = BufferLayout__namespace.struct([BufferLayout__namespace.u32('length'), BufferLayout__namespace.u32('lengthPadding'), BufferLayout__namespace.blob(BufferLayout__namespace.offset(BufferLayout__namespace.u32(), -8), 'chars')], property);
  const _decode = rsl.decode.bind(rsl);
  const _encode = rsl.encode.bind(rsl);
  const rslShim = rsl;
  rslShim.decode = (b, offset) => {
    const data = _decode(b, offset);
    return UTF8_DECODER.decode(data['chars']);
  };
  rslShim.encode = (str, b, offset) => {
    const data = {
      chars: UTF8_ENCODER.encode(str)
    };
    return _encode(data, b, offset);
  };
  rslShim.alloc = str => {
    return BufferLayout__namespace.u32().span + BufferLayout__namespace.u32().span + UTF8_ENCODER.encode(str).length;
  };
  return rslShim;
};

/**
 * Layout for an Authorized object
 * @deprecated To be removed in v3. Use codecs-based layout helpers instead.
 */
const authorized = (property = 'authorized') => {
  return BufferLayout__namespace.struct([publicKey('staker'), publicKey('withdrawer')], property);
};

/**
 * Layout for a Lockup object
 * @deprecated To be removed in v3. Use codecs-based layout helpers instead.
 */
const lockup = (property = 'lockup') => {
  return BufferLayout__namespace.struct([BufferLayout__namespace.ns64('unixTimestamp'), BufferLayout__namespace.ns64('epoch'), publicKey('custodian')], property);
};

/**
 *  Layout for a VoteInit object
 * @deprecated To be removed in v3. Use codecs-based layout helpers instead.
 */
const voteInit = (property = 'voteInit') => {
  return BufferLayout__namespace.struct([publicKey('nodePubkey'), publicKey('authorizedVoter'), publicKey('authorizedWithdrawer'), BufferLayout__namespace.u8('commission')], property);
};

/**
 *  Layout for a VoteAuthorizeWithSeedArgs object
 * @deprecated To be removed in v3. Use codecs-based layout helpers instead.
 */
const voteAuthorizeWithSeedArgs = (property = 'voteAuthorizeWithSeedArgs') => {
  return BufferLayout__namespace.struct([BufferLayout__namespace.u32('voteAuthorizationType'), publicKey('currentAuthorityDerivedKeyOwnerPubkey'), rustString('currentAuthorityDerivedKeySeed'), publicKey('newAuthorized')], property);
};

/**
 * Program instruction definition.
 * @internal
 */

const assertInstructionIndex = (data, index) => {
  const instructionIndex = data.instruction;
  if (instructionIndex !== index) {
    throw new Error(`invalid instruction; instruction index mismatch ${instructionIndex} != ${index}`);
  }
};

/**
 * Factory class for building program instruction data codec and transaction builder
 * @experimental target for stabilization in v3
 */
class ProgramInstructions {
  static create(config) {
    return new ProgramInstructions(config);
  }
  constructor(config) {
    this.programId = void 0;
    this.instructions = void 0;
    this.instructionIndexCodec = void 0;
    this.byIndex = void 0;
    this.programId = config.programId;
    this.instructionIndexCodec = config.instructionIndexCodec;
    const {
      entries,
      byIndex
    } = buildProgramInstructionEntries({
      programId: config.programId,
      instructions: config.instructions
    });
    this.byIndex = byIndex;

    // Make instructions available as both a property and under `instructions`
    this.instructions = entries;
    Object.assign(this, entries);
    Object.freeze(this);
  }
  getInstructionType(data) {
    const bytes = data instanceof TransactionInstruction ? data.data : data;
    const index = this.instructionIndexCodec.decode(bytes);
    const type = this.byIndex.get(index);
    if (!type) {
      throw new Error(`invalid instruction; unknown instruction index ${index}`);
    }
    return type;
  }
}
function encodeProgramInstructionData(definition, params) {
  const data = {
    instruction: definition.index,
    ...(params ?? {})
  };
  return toUint8ArrayView(definition.codec.encode(data));
}
function buildProgramInstructionEntries(config) {
  const byIndex = new Map();
  const entries = {};
  for (const [instructionName, definition] of Object.entries(config.instructions)) {
    if (byIndex.has(definition.index)) {
      throw new Error(`Duplicate instruction index ${definition.index}`);
    }
    byIndex.set(definition.index, instructionName);
    const encode = params => {
      return encodeProgramInstructionData(definition, params);
    };
    const decode = data => {
      const bytes = data instanceof TransactionInstruction ? data.data : data;
      let decoded;
      try {
        decoded = definition.codec.decode(bytes);
      } catch (err) {
        throw new Error('invalid instruction; ' + err);
      }
      assertInstructionIndex(decoded, definition.index);
      const {
        instruction: _instruction,
        ...rest
      } = decoded;
      return rest;
    };
    const build = (params, options = {}) => {
      const data = options.data ?? encodeProgramInstructionData(definition, params);
      return new TransactionInstruction({
        programId: options.programId ?? config.programId,
        keys: options.keys ?? (definition.accounts ? definition.accounts(params ?? {}) : []),
        data
      });
    };
    entries[instructionName] = Object.freeze({
      encode,
      decode,
      build
    });
  }
  return {
    entries: Object.freeze(entries),
    byIndex
  };
}

const U32_DECODER$1 = codecsNumbers.getU32Decoder();
const U64_DECODER$1 = codecsNumbers.getU64Decoder();
const BYTES_DECODER = getBytesDecoder();

/**
 * See https://github.com/anza-xyz/solana-sdk/blob/e7db3b9d9f61efcb8fa2547f7371a4be2b6942d7/nonce/src/state.rs
 *
 * @internal
 */
const NONCE_ACCOUNT_DECODER = getStructDecoder([['version', U32_DECODER$1], ['state', U32_DECODER$1], ['authorizedPubkey', fixDecoderSize(BYTES_DECODER, 32)], ['nonce', fixDecoderSize(BYTES_DECODER, 32)], ['lamportsPerSignature', U64_DECODER$1]]);
const NONCE_ACCOUNT_LENGTH = 80;

/**
 * A durable nonce is a 32 byte value encoded as a base58 string.
 */

/**
 * NonceAccount class
 */
class NonceAccount {
  /**
   * @internal
   */
  constructor(args) {
    this.authorizedPubkey = void 0;
    this.nonce = void 0;
    this.feeCalculator = void 0;
    this.authorizedPubkey = args.authorizedPubkey;
    this.nonce = args.nonce;
    this.feeCalculator = args.feeCalculator;
  }

  /**
   * Deserialize NonceAccount from the account data.
   *
   * @param buffer account data
   * @return NonceAccount
   */
  static fromAccountData(buffer) {
    const nonceAccount = NONCE_ACCOUNT_DECODER.decode(toUint8ArrayView(buffer));
    assert(nonceAccount.lamportsPerSignature <= BigInt(Number.MAX_SAFE_INTEGER), 'lamportsPerSignature exceeds safe integer range');
    return new NonceAccount({
      authorizedPubkey: new Address(nonceAccount.authorizedPubkey),
      nonce: new Address(toUint8ArrayView(nonceAccount.nonce)).toString(),
      feeCalculator: {
        lamportsPerSignature: Number(nonceAccount.lamportsPerSignature)
      }
    });
  }
}

function u64(property) {
  const layout = BufferLayout.blob(8 /* bytes */, property);
  const decode = layout.decode.bind(layout);
  const encode = layout.encode.bind(layout);
  const bigIntLayout = layout;
  const codec = codecsNumbers.getU64Codec();
  bigIntLayout.decode = (buffer, offset = 0) => {
    const src = decode(buffer, offset);
    return codec.decode(src);
  };
  bigIntLayout.encode = (bigInt, buffer, offset = 0) => {
    const src = codec.encode(bigInt);
    return encode(src, buffer, offset);
  };
  return bigIntLayout;
}

const SYSTEM_PROGRAM_ID = new Address('11111111111111111111111111111111');
const U32_CODEC$6 = codecsNumbers.getU32Codec();
const U64_CODEC$5 = codecsNumbers.getU64Codec();
const I64_NUMBER_CODEC$2 = transformCodec(codecsNumbers.getI64Codec(), value => BigInt(value), value => Number(value));
const PUBLIC_KEY_BYTES_CODEC$3 = fixCodecSize(getBytesCodec(), 32);
const getRustStringCodec$2 = () => addCodecSizePrefix(getUtf8Codec(), U64_CODEC$5);
const RUST_STRING_CODEC$2 = getRustStringCodec$2();

/**
 * Create account system transaction params
 */

/**
 * Transfer system transaction params
 */

/**
 * Assign system transaction params
 */

/**
 * Create account with seed system transaction params
 */

/**
 * Create nonce account system transaction params
 */

/**
 * Create nonce account with seed system transaction params
 */

/**
 * Initialize nonce account system instruction params
 */

/**
 * Advance nonce account system instruction params
 */

/**
 * Withdraw nonce account system transaction params
 */

/**
 * Authorize nonce account system transaction params
 */

/**
 * Allocate account system transaction params
 */

/**
 * Allocate account with seed system transaction params
 */

/**
 * Assign account with seed system transaction params
 */

/**
 * Transfer with seed system transaction params
 */

/** Decoded transfer system transaction instruction */

/** Decoded transferWithSeed system transaction instruction */

/**
 * System Instruction class
 */
class SystemInstruction {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Decode a system instruction and retrieve the instruction type.
   */
  static decodeInstructionType(instruction) {
    this.checkProgramId(instruction.programId);
    return INSTRUCTIONS$4.getInstructionType(instruction);
  }

  /**
   * Decode a create account system instruction and retrieve the instruction params.
   */
  static decodeCreateAccount(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);
    const {
      lamports,
      space,
      programId
    } = INSTRUCTIONS$4.Create.decode(instruction);
    return {
      fromPubkey: instruction.keys[0].pubkey,
      newAccountPubkey: instruction.keys[1].pubkey,
      lamports,
      space,
      programId: new Address(programId)
    };
  }

  /**
   * Decode a transfer system instruction and retrieve the instruction params.
   */
  static decodeTransfer(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);
    const {
      lamports
    } = INSTRUCTIONS$4.Transfer.decode(instruction);
    return {
      fromPubkey: instruction.keys[0].pubkey,
      toPubkey: instruction.keys[1].pubkey,
      lamports
    };
  }

  /**
   * Decode a transfer with seed system instruction and retrieve the instruction params.
   */
  static decodeTransferWithSeed(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    const {
      lamports,
      seed,
      programId
    } = INSTRUCTIONS$4.TransferWithSeed.decode(instruction);
    return {
      fromPubkey: instruction.keys[0].pubkey,
      basePubkey: instruction.keys[1].pubkey,
      toPubkey: instruction.keys[2].pubkey,
      lamports,
      seed,
      programId: new Address(programId)
    };
  }

  /**
   * Decode an allocate system instruction and retrieve the instruction params.
   */
  static decodeAllocate(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 1);
    const {
      space
    } = INSTRUCTIONS$4.Allocate.decode(instruction);
    return {
      accountPubkey: instruction.keys[0].pubkey,
      space
    };
  }

  /**
   * Decode an allocate with seed system instruction and retrieve the instruction params.
   */
  static decodeAllocateWithSeed(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 1);
    const {
      base,
      seed,
      space,
      programId
    } = INSTRUCTIONS$4.AllocateWithSeed.decode(instruction);
    return {
      accountPubkey: instruction.keys[0].pubkey,
      basePubkey: new Address(base),
      seed,
      space,
      programId: new Address(programId)
    };
  }

  /**
   * Decode an assign system instruction and retrieve the instruction params.
   */
  static decodeAssign(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 1);
    const {
      programId
    } = INSTRUCTIONS$4.Assign.decode(instruction);
    return {
      accountPubkey: instruction.keys[0].pubkey,
      programId: new Address(programId)
    };
  }

  /**
   * Decode an assign with seed system instruction and retrieve the instruction params.
   */
  static decodeAssignWithSeed(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 1);
    const {
      base,
      seed,
      programId
    } = INSTRUCTIONS$4.AssignWithSeed.decode(instruction);
    return {
      accountPubkey: instruction.keys[0].pubkey,
      basePubkey: new Address(base),
      seed,
      programId: new Address(programId)
    };
  }

  /**
   * Decode a create account with seed system instruction and retrieve the instruction params.
   */
  static decodeCreateWithSeed(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);
    const {
      base,
      seed,
      lamports,
      space,
      programId
    } = INSTRUCTIONS$4.CreateWithSeed.decode(instruction);
    return {
      fromPubkey: instruction.keys[0].pubkey,
      newAccountPubkey: instruction.keys[1].pubkey,
      basePubkey: new Address(base),
      seed,
      lamports,
      space,
      programId: new Address(programId)
    };
  }

  /**
   * Decode a nonce initialize system instruction and retrieve the instruction params.
   */
  static decodeNonceInitialize(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    const {
      authorized
    } = INSTRUCTIONS$4.InitializeNonceAccount.decode(instruction);
    return {
      noncePubkey: instruction.keys[0].pubkey,
      authorizedPubkey: new Address(authorized)
    };
  }

  /**
   * Decode a nonce advance system instruction and retrieve the instruction params.
   */
  static decodeNonceAdvance(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    INSTRUCTIONS$4.AdvanceNonceAccount.decode(instruction);
    return {
      noncePubkey: instruction.keys[0].pubkey,
      authorizedPubkey: instruction.keys[2].pubkey
    };
  }

  /**
   * Decode a nonce withdraw system instruction and retrieve the instruction params.
   */
  static decodeNonceWithdraw(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 5);
    const {
      lamports
    } = INSTRUCTIONS$4.WithdrawNonceAccount.decode(instruction);
    return {
      noncePubkey: instruction.keys[0].pubkey,
      toPubkey: instruction.keys[1].pubkey,
      authorizedPubkey: instruction.keys[4].pubkey,
      lamports
    };
  }

  /**
   * Decode a nonce authorize system instruction and retrieve the instruction params.
   */
  static decodeNonceAuthorize(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);
    const {
      authorized
    } = INSTRUCTIONS$4.AuthorizeNonceAccount.decode(instruction);
    return {
      noncePubkey: instruction.keys[0].pubkey,
      authorizedPubkey: instruction.keys[1].pubkey,
      newAuthorizedPubkey: new Address(authorized)
    };
  }

  /**
   * @internal
   */
  static checkProgramId(programId) {
    if (!programId.equals(SystemProgram.programId)) {
      throw new Error('invalid instruction; programId is not SystemProgram');
    }
  }

  /**
   * @internal
   */
  static checkKeyLength(keys, expectedLength) {
    if (keys.length < expectedLength) {
      throw new Error(`invalid instruction; found ${keys.length} keys, expected at least ${expectedLength}`);
    }
  }
}

/**
 * An enumeration of valid SystemInstructionType's
 */

const INSTRUCTION_DEFS$3 = {
  Create: {
    index: 0,
    codec: getStructCodec([['instruction', U32_CODEC$6], ['lamports', I64_NUMBER_CODEC$2], ['space', I64_NUMBER_CODEC$2], ['programId', PUBLIC_KEY_BYTES_CODEC$3]])
  },
  Assign: {
    index: 1,
    codec: getStructCodec([['instruction', U32_CODEC$6], ['programId', PUBLIC_KEY_BYTES_CODEC$3]])
  },
  Transfer: {
    index: 2,
    codec: getStructCodec([['instruction', U32_CODEC$6], ['lamports', U64_CODEC$5]])
  },
  CreateWithSeed: {
    index: 3,
    codec: getStructCodec([['instruction', U32_CODEC$6], ['base', PUBLIC_KEY_BYTES_CODEC$3], ['seed', RUST_STRING_CODEC$2], ['lamports', I64_NUMBER_CODEC$2], ['space', I64_NUMBER_CODEC$2], ['programId', PUBLIC_KEY_BYTES_CODEC$3]])
  },
  AdvanceNonceAccount: {
    index: 4,
    codec: getStructCodec([['instruction', U32_CODEC$6]])
  },
  WithdrawNonceAccount: {
    index: 5,
    codec: getStructCodec([['instruction', U32_CODEC$6], ['lamports', I64_NUMBER_CODEC$2]])
  },
  InitializeNonceAccount: {
    index: 6,
    codec: getStructCodec([['instruction', U32_CODEC$6], ['authorized', PUBLIC_KEY_BYTES_CODEC$3]])
  },
  AuthorizeNonceAccount: {
    index: 7,
    codec: getStructCodec([['instruction', U32_CODEC$6], ['authorized', PUBLIC_KEY_BYTES_CODEC$3]])
  },
  Allocate: {
    index: 8,
    codec: getStructCodec([['instruction', U32_CODEC$6], ['space', I64_NUMBER_CODEC$2]])
  },
  AllocateWithSeed: {
    index: 9,
    codec: getStructCodec([['instruction', U32_CODEC$6], ['base', PUBLIC_KEY_BYTES_CODEC$3], ['seed', RUST_STRING_CODEC$2], ['space', I64_NUMBER_CODEC$2], ['programId', PUBLIC_KEY_BYTES_CODEC$3]])
  },
  AssignWithSeed: {
    index: 10,
    codec: getStructCodec([['instruction', U32_CODEC$6], ['base', PUBLIC_KEY_BYTES_CODEC$3], ['seed', RUST_STRING_CODEC$2], ['programId', PUBLIC_KEY_BYTES_CODEC$3]])
  },
  TransferWithSeed: {
    index: 11,
    codec: getStructCodec([['instruction', U32_CODEC$6], ['lamports', U64_CODEC$5], ['seed', RUST_STRING_CODEC$2], ['programId', PUBLIC_KEY_BYTES_CODEC$3]])
  },
  UpgradeNonceAccount: {
    index: 12,
    codec: getStructCodec([['instruction', U32_CODEC$6]])
  }
};

/**
 * @internal
 */
const SYSTEM_INSTRUCTIONS = ProgramInstructions.create({
  programId: SYSTEM_PROGRAM_ID,
  instructionIndexCodec: U32_CODEC$6,
  instructions: INSTRUCTION_DEFS$3
});
const INSTRUCTIONS$4 = SYSTEM_INSTRUCTIONS;

/**
 * An enumeration of valid system InstructionType's
 * @internal
 * @deprecated To be removed in v3. Use SystemProgram helpers or ProgramInstructions instead.
 */
const SYSTEM_INSTRUCTION_LAYOUTS = Object.freeze({
  Create: {
    index: 0,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), BufferLayout__namespace.ns64('lamports'), BufferLayout__namespace.ns64('space'), publicKey('programId')])
  },
  Assign: {
    index: 1,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), publicKey('programId')])
  },
  Transfer: {
    index: 2,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), u64('lamports')])
  },
  CreateWithSeed: {
    index: 3,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), publicKey('base'), rustString('seed'), BufferLayout__namespace.ns64('lamports'), BufferLayout__namespace.ns64('space'), publicKey('programId')])
  },
  AdvanceNonceAccount: {
    index: 4,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])
  },
  WithdrawNonceAccount: {
    index: 5,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), BufferLayout__namespace.ns64('lamports')])
  },
  InitializeNonceAccount: {
    index: 6,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), publicKey('authorized')])
  },
  AuthorizeNonceAccount: {
    index: 7,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), publicKey('authorized')])
  },
  Allocate: {
    index: 8,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), BufferLayout__namespace.ns64('space')])
  },
  AllocateWithSeed: {
    index: 9,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), publicKey('base'), rustString('seed'), BufferLayout__namespace.ns64('space'), publicKey('programId')])
  },
  AssignWithSeed: {
    index: 10,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), publicKey('base'), rustString('seed'), publicKey('programId')])
  },
  TransferWithSeed: {
    index: 11,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), u64('lamports'), rustString('seed'), publicKey('programId')])
  },
  UpgradeNonceAccount: {
    index: 12,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])
  }
});

/**
 * Factory class for transactions to interact with the System program
 */
class SystemProgram {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the System program
   */

  /**
   * Generate a transaction instruction that creates a new account
   */
  static createAccount(params) {
    return INSTRUCTIONS$4.Create.build({
      lamports: params.lamports,
      space: params.space,
      programId: params.programId.toBytes()
    }, {
      keys: [{
        pubkey: params.fromPubkey,
        isSigner: true,
        isWritable: true
      }, {
        pubkey: params.newAccountPubkey,
        isSigner: true,
        isWritable: true
      }],
      programId: this.programId
    });
  }

  /**
   * Generate a transaction instruction that transfers lamports from one account to another
   */
  static transfer(params) {
    let keys;
    if ('basePubkey' in params) {
      keys = [{
        pubkey: params.fromPubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: params.basePubkey,
        isSigner: true,
        isWritable: false
      }, {
        pubkey: params.toPubkey,
        isSigner: false,
        isWritable: true
      }];
      return INSTRUCTIONS$4.TransferWithSeed.build({
        lamports: BigInt(params.lamports),
        seed: params.seed,
        programId: params.programId.toBytes()
      }, {
        keys,
        programId: this.programId
      });
    } else {
      keys = [{
        pubkey: params.fromPubkey,
        isSigner: true,
        isWritable: true
      }, {
        pubkey: params.toPubkey,
        isSigner: false,
        isWritable: true
      }];
      return INSTRUCTIONS$4.Transfer.build({
        lamports: BigInt(params.lamports)
      }, {
        keys,
        programId: this.programId
      });
    }
  }

  /**
   * Generate a transaction instruction that assigns an account to a program
   */
  static assign(params) {
    let keys;
    if ('basePubkey' in params) {
      keys = [{
        pubkey: params.accountPubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: params.basePubkey,
        isSigner: true,
        isWritable: false
      }];
      return INSTRUCTIONS$4.AssignWithSeed.build({
        base: params.basePubkey.toBytes(),
        seed: params.seed,
        programId: params.programId.toBytes()
      }, {
        keys,
        programId: this.programId
      });
    } else {
      keys = [{
        pubkey: params.accountPubkey,
        isSigner: true,
        isWritable: true
      }];
      return INSTRUCTIONS$4.Assign.build({
        programId: params.programId.toBytes()
      }, {
        keys,
        programId: this.programId
      });
    }
  }

  /**
   * Generate a transaction instruction that creates a new account at
   *   an address generated with `from`, a seed, and programId
   */
  static createAccountWithSeed(params) {
    let keys = [{
      pubkey: params.fromPubkey,
      isSigner: true,
      isWritable: true
    }, {
      pubkey: params.newAccountPubkey,
      isSigner: false,
      isWritable: true
    }];
    if (!params.basePubkey.equals(params.fromPubkey)) {
      keys.push({
        pubkey: params.basePubkey,
        isSigner: true,
        isWritable: false
      });
    }
    return INSTRUCTIONS$4.CreateWithSeed.build({
      base: params.basePubkey.toBytes(),
      seed: params.seed,
      lamports: params.lamports,
      space: params.space,
      programId: params.programId.toBytes()
    }, {
      keys,
      programId: this.programId
    });
  }

  /**
   * Generate a transaction that creates a new Nonce account
   */
  static createNonceAccount(params) {
    const transaction = new Transaction();
    if ('basePubkey' in params && 'seed' in params) {
      transaction.add(SystemProgram.createAccountWithSeed({
        fromPubkey: params.fromPubkey,
        newAccountPubkey: params.noncePubkey,
        basePubkey: params.basePubkey,
        seed: params.seed,
        lamports: params.lamports,
        space: NONCE_ACCOUNT_LENGTH,
        programId: this.programId
      }));
    } else {
      transaction.add(SystemProgram.createAccount({
        fromPubkey: params.fromPubkey,
        newAccountPubkey: params.noncePubkey,
        lamports: params.lamports,
        space: NONCE_ACCOUNT_LENGTH,
        programId: this.programId
      }));
    }
    const initParams = {
      noncePubkey: params.noncePubkey,
      authorizedPubkey: params.authorizedPubkey
    };
    transaction.add(this.nonceInitialize(initParams));
    return transaction;
  }

  /**
   * Generate an instruction to initialize a Nonce account
   */
  static nonceInitialize(params) {
    return INSTRUCTIONS$4.InitializeNonceAccount.build({
      authorized: params.authorizedPubkey.toBytes()
    }, {
      keys: [{
        pubkey: params.noncePubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false
      }],
      programId: this.programId
    });
  }

  /**
   * Generate an instruction to advance the nonce in a Nonce account
   */
  static nonceAdvance(params) {
    return INSTRUCTIONS$4.AdvanceNonceAccount.build(undefined, {
      keys: [{
        pubkey: params.noncePubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: params.authorizedPubkey,
        isSigner: true,
        isWritable: false
      }],
      programId: this.programId
    });
  }

  /**
   * Generate a transaction instruction that withdraws lamports from a Nonce account
   */
  static nonceWithdraw(params) {
    return INSTRUCTIONS$4.WithdrawNonceAccount.build({
      lamports: params.lamports
    }, {
      keys: [{
        pubkey: params.noncePubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: params.toPubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: params.authorizedPubkey,
        isSigner: true,
        isWritable: false
      }],
      programId: this.programId
    });
  }

  /**
   * Generate a transaction instruction that authorizes a new Address as the authority
   * on a Nonce account.
   */
  static nonceAuthorize(params) {
    return INSTRUCTIONS$4.AuthorizeNonceAccount.build({
      authorized: params.newAuthorizedPubkey.toBytes()
    }, {
      keys: [{
        pubkey: params.noncePubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: params.authorizedPubkey,
        isSigner: true,
        isWritable: false
      }],
      programId: this.programId
    });
  }

  /**
   * Generate a transaction instruction that allocates space in an account without funding
   */
  static allocate(params) {
    let keys;
    if ('basePubkey' in params) {
      keys = [{
        pubkey: params.accountPubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: params.basePubkey,
        isSigner: true,
        isWritable: false
      }];
      return INSTRUCTIONS$4.AllocateWithSeed.build({
        base: params.basePubkey.toBytes(),
        seed: params.seed,
        space: params.space,
        programId: params.programId.toBytes()
      }, {
        keys,
        programId: this.programId
      });
    } else {
      keys = [{
        pubkey: params.accountPubkey,
        isSigner: true,
        isWritable: true
      }];
      return INSTRUCTIONS$4.Allocate.build({
        space: params.space
      }, {
        keys,
        programId: this.programId
      });
    }
  }
}
SystemProgram.programId = SYSTEM_PROGRAM_ID;

// Keep program chunks under PACKET_DATA_SIZE, leaving enough room for the
// rest of the Transaction fields
//
// TODO: replace 300 with a proper constant for the size of the other
// Transaction fields
const CHUNK_SIZE = PACKET_DATA_SIZE - 300;
const U32_CODEC$5 = codecsNumbers.getU32Codec();
const LOAD_INSTRUCTION_HEADER_CODEC = getStructCodec([['instruction', U32_CODEC$5], ['offset', U32_CODEC$5], ['bytesLength', U32_CODEC$5], ['bytesLengthPadding', U32_CODEC$5]]);
const FINALIZE_INSTRUCTION_CODEC = getStructCodec([['instruction', U32_CODEC$5]]);
const encodeLoadInstructionChunk = ({
  instruction,
  offset,
  bytes,
  chunkSize,
  bytesLengthPadding = 0
}) => {
  if (bytes.length > chunkSize) {
    throw new Error('instruction data exceeds chunk size');
  }
  const header = LOAD_INSTRUCTION_HEADER_CODEC.encode({
    instruction,
    offset,
    bytesLength: bytes.length,
    bytesLengthPadding
  });
  const data = new Uint8Array(header.length + chunkSize);
  data.set(header, 0);
  data.set(bytes, header.length);
  return data;
};

/**
 * Program loader interface
 */
class Loader {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Amount of program data placed in each load Transaction
   */

  /**
   * Minimum number of signatures required to load a program not including
   * retries
   *
   * Can be used to calculate transaction fees
   */
  static getMinNumSignatures(dataLength) {
    return 2 * (
    // Every transaction requires two signatures (payer + program)
    Math.ceil(dataLength / Loader.chunkSize) + 1 +
    // Add one for Create transaction
    1) // Add one for Finalize transaction
    ;
  }

  /**
   * Loads a generic program
   *
   * @param connection The connection to use
   * @param payer System account that pays to load the program
   * @param program Account to load the program into
   * @param programId Public key that identifies the loader
   * @param data Program octets
   * @return true if program was loaded successfully, false if program was already loaded
   */
  static async load(connection, payer, program, programId, data) {
    {
      const balanceNeeded = await connection.getMinimumBalanceForRentExemption(data.length);

      // Fetch program account info to check if it has already been created
      const programInfo = await connection.getAccountInfo(program.publicKey, 'confirmed');
      let transaction = null;
      if (programInfo !== null) {
        if (programInfo.executable) {
          console.error('Program load failed, account is already executable');
          return false;
        }
        if (programInfo.data.length !== data.length) {
          transaction = transaction || new Transaction();
          transaction.add(SystemProgram.allocate({
            accountPubkey: program.publicKey,
            space: data.length
          }));
        }
        if (!programInfo.owner.equals(programId)) {
          transaction = transaction || new Transaction();
          transaction.add(SystemProgram.assign({
            accountPubkey: program.publicKey,
            programId
          }));
        }
        if (programInfo.lamports < BigInt(balanceNeeded)) {
          transaction = transaction || new Transaction();
          transaction.add(SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: program.publicKey,
            lamports: BigInt(balanceNeeded) - programInfo.lamports
          }));
        }
      } else {
        transaction = new Transaction().add(SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: program.publicKey,
          lamports: balanceNeeded > 0 ? balanceNeeded : 1,
          space: data.length,
          programId
        }));
      }

      // If the account is already created correctly, skip this step
      // and proceed directly to loading instructions
      if (transaction !== null) {
        await sendAndConfirmTransaction(connection, transaction, [payer, program], {
          commitment: 'confirmed'
        });
      }
    }
    const chunkSize = Loader.chunkSize;
    let offset = 0;
    let bytesRemaining = toUint8ArrayView(data);
    let transactions = [];
    while (bytesRemaining.length > 0) {
      const bytes = bytesRemaining.subarray(0, chunkSize);
      const data = encodeLoadInstructionChunk({
        instruction: 0,
        // Load instruction
        offset,
        bytes,
        chunkSize
      });
      const transaction = new Transaction().add({
        keys: [{
          pubkey: program.publicKey,
          isSigner: true,
          isWritable: true
        }],
        programId,
        data
      });
      transactions.push(sendAndConfirmTransaction(connection, transaction, [payer, program], {
        commitment: 'confirmed'
      }));

      // Delay between sends in an attempt to reduce rate limit errors
      if (connection._rpcEndpoint.includes('solana.com')) {
        const REQUESTS_PER_SECOND = 4;
        await sleep(1000 / REQUESTS_PER_SECOND);
      }
      offset += chunkSize;
      bytesRemaining = bytesRemaining.subarray(chunkSize);
    }
    await Promise.all(transactions);

    // Finalize the account loaded with program data for execution
    {
      const data = toUint8ArrayView(FINALIZE_INSTRUCTION_CODEC.encode({
        instruction: 1 // Finalize instruction
      }));
      const transaction = new Transaction().add({
        keys: [{
          pubkey: program.publicKey,
          isSigner: true,
          isWritable: true
        }, {
          pubkey: SYSVAR_RENT_PUBKEY,
          isSigner: false,
          isWritable: false
        }],
        programId,
        data
      });
      const deployCommitment = 'processed';
      const finalizeSignature = await connection.sendTransaction(transaction, [payer, program], {
        preflightCommitment: deployCommitment
      });
      const {
        context,
        value
      } = await connection.confirmTransaction({
        signature: finalizeSignature,
        lastValidBlockHeight: transaction.lastValidBlockHeight,
        blockhash: transaction.recentBlockhash
      }, deployCommitment);
      if (value.err) {
        throw new Error(`Transaction ${finalizeSignature} failed (${JSON.stringify(value)})`);
      }
      // We prevent programs from being usable until the slot after their deployment.
      // See https://github.com/solana-labs/solana/pull/29654
      while (true // eslint-disable-line no-constant-condition
      ) {
        try {
          const currentSlot = await connection.getSlot({
            commitment: deployCommitment
          });
          if (currentSlot > context.slot) {
            break;
          }
        } catch {
          /* empty */
        }
        await new Promise(resolve => setTimeout(resolve, Math.round(MS_PER_SLOT / 2)));
      }
    }

    // success
    return true;
  }
}
Loader.chunkSize = CHUNK_SIZE;

/**
 * @deprecated Deprecated since Solana v1.17.20.
 */
const BPF_LOADER_PROGRAM_ID = new Address('BPFLoader2111111111111111111111111111111111');

/**
 * Factory class for transactions to interact with a program loader
 *
 * @deprecated Deprecated since Solana v1.17.20.
 */
class BpfLoader {
  /**
   * Minimum number of signatures required to load a program not including
   * retries
   *
   * Can be used to calculate transaction fees
   */
  static getMinNumSignatures(dataLength) {
    return Loader.getMinNumSignatures(dataLength);
  }

  /**
   * Load a SBF program
   *
   * @param connection The connection to use
   * @param payer Account that will pay program loading fees
   * @param program Account to load the program into
   * @param elf The entire ELF containing the SBF program
   * @param loaderProgramId The program id of the BPF loader to use
   * @return true if program was loaded successfully, false if program was already loaded
   */
  static load(connection, payer, program, elf, loaderProgramId) {
    return Loader.load(connection, payer, program, loaderProgramId, elf);
  }
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

// src/codes.ts
var SOLANA_ERROR__LAMPORTS_OUT_OF_RANGE = 6;
var SOLANA_ERROR__MALFORMED_JSON_RPC_ERROR = 10;
var SOLANA_ERROR__JSON_RPC__PARSE_ERROR = -32700;
var SOLANA_ERROR__JSON_RPC__INTERNAL_ERROR = -32603;
var SOLANA_ERROR__JSON_RPC__INVALID_PARAMS = -32602;
var SOLANA_ERROR__JSON_RPC__METHOD_NOT_FOUND = -32601;
var SOLANA_ERROR__JSON_RPC__INVALID_REQUEST = -32600;
var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION = -32015;
var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_BLOCK_STATUS_NOT_AVAILABLE_YET = -32014;
var SOLANA_ERROR__JSON_RPC__SCAN_ERROR = -32012;
var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_KEY_EXCLUDED_FROM_SECONDARY_INDEX = -32010;
var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_LONG_TERM_STORAGE_SLOT_SKIPPED = -32009;
var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SLOT_SKIPPED = -32007;
var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE = -32006;
var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_BLOCK_NOT_AVAILABLE = -32004;
var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE = -32002;
var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_BLOCK_CLEANED_UP = -32001;
var SOLANA_ERROR__INSTRUCTION_ERROR__UNKNOWN = 4615e3;
var SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM = 4615026;
var SOLANA_ERROR__TRANSACTION_ERROR__UNKNOWN = 705e4;
var SOLANA_ERROR__TRANSACTION_ERROR__DUPLICATE_INSTRUCTION = 7050030;
var SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT = 7050031;
var SOLANA_ERROR__TRANSACTION_ERROR__PROGRAM_EXECUTION_TEMPORARILY_RESTRICTED = 7050035;
var SOLANA_ERROR__RPC__INTEGER_OVERFLOW = 81e5;
var SOLANA_ERROR__RPC__API_PLAN_MISSING_FOR_RPC_METHOD = 8100003;

// src/context.ts
function encodeValue(value) {
  if (Array.isArray(value)) {
    const commaSeparatedValues = value.map(encodeValue).join(
      "%2C%20"
      /* ", " */
    );
    return "%5B" + commaSeparatedValues + /* "]" */
    "%5D";
  } else if (typeof value === "bigint") {
    return `${value}n`;
  } else {
    return encodeURIComponent(
      String(
        value != null && Object.getPrototypeOf(value) === null ? (
          // Plain objects with no prototype don't have a `toString` method.
          // Convert them before stringifying them.
          { ...value }
        ) : value
      )
    );
  }
}
function encodeObjectContextEntry([key, value]) {
  return `${key}=${encodeValue(value)}`;
}
function encodeContextObject(context) {
  const searchParamsString = Object.entries(context).map(encodeObjectContextEntry).join("&");
  return btoa(searchParamsString);
}
function getErrorMessage(code, context = {}) {
  {
    let decodingAdviceMessage = `Solana error #${code}; Decode this error by running \`npx @solana/errors decode -- ${code}`;
    if (Object.keys(context).length) {
      decodingAdviceMessage += ` '${encodeContextObject(context)}'`;
    }
    return `${decodingAdviceMessage}\``;
  }
}
var SolanaError = class extends Error {
  /**
   * Indicates the root cause of this {@link SolanaError}, if any.
   *
   * For example, a transaction error might have an instruction error as its root cause. In this
   * case, you will be able to access the instruction error on the transaction error as `cause`.
   */
  cause = this.cause;
  /**
   * Contains context that can assist in understanding or recovering from a {@link SolanaError}.
   */
  context;
  constructor(...[code, contextAndErrorOptions]) {
    let context;
    let errorOptions;
    if (contextAndErrorOptions) {
      Object.entries(Object.getOwnPropertyDescriptors(contextAndErrorOptions)).forEach(([name, descriptor]) => {
        if (name === "cause") {
          errorOptions = { cause: descriptor.value };
        } else {
          if (context === void 0) {
            context = {
              __code: code
            };
          }
          Object.defineProperty(context, name, descriptor);
        }
      });
    }
    const message = getErrorMessage(code, context);
    super(message, errorOptions);
    this.context = Object.freeze(
      context === void 0 ? {
        __code: code
      } : context
    );
    this.name = "SolanaError";
  }
};

// src/stack-trace.ts
function safeCaptureStackTrace(...args) {
  if ("captureStackTrace" in Error && typeof Error.captureStackTrace === "function") {
    Error.captureStackTrace(...args);
  }
}

// src/rpc-enum-errors.ts
function getSolanaErrorFromRpcError({ errorCodeBaseOffset, getErrorContext, orderedErrorNames, rpcEnumError }, constructorOpt) {
  let rpcErrorName;
  let rpcErrorContext;
  if (typeof rpcEnumError === "string") {
    rpcErrorName = rpcEnumError;
  } else {
    rpcErrorName = Object.keys(rpcEnumError)[0];
    rpcErrorContext = rpcEnumError[rpcErrorName];
  }
  const codeOffset = orderedErrorNames.indexOf(rpcErrorName);
  const errorCode = errorCodeBaseOffset + codeOffset;
  const errorContext = getErrorContext(errorCode, rpcErrorName, rpcErrorContext);
  const err = new SolanaError(errorCode, errorContext);
  safeCaptureStackTrace(err, constructorOpt);
  return err;
}

// src/instruction-error.ts
var ORDERED_ERROR_NAMES = [
  // Keep synced with RPC source: https://github.com/anza-xyz/solana-sdk/blob/master/instruction-error/src/lib.rs
  // If this list ever gets too large, consider implementing a compression strategy like this:
  // https://gist.github.com/steveluscher/aaa7cbbb5433b1197983908a40860c47
  "GenericError",
  "InvalidArgument",
  "InvalidInstructionData",
  "InvalidAccountData",
  "AccountDataTooSmall",
  "InsufficientFunds",
  "IncorrectProgramId",
  "MissingRequiredSignature",
  "AccountAlreadyInitialized",
  "UninitializedAccount",
  "UnbalancedInstruction",
  "ModifiedProgramId",
  "ExternalAccountLamportSpend",
  "ExternalAccountDataModified",
  "ReadonlyLamportChange",
  "ReadonlyDataModified",
  "DuplicateAccountIndex",
  "ExecutableModified",
  "RentEpochModified",
  "NotEnoughAccountKeys",
  "AccountDataSizeChanged",
  "AccountNotExecutable",
  "AccountBorrowFailed",
  "AccountBorrowOutstanding",
  "DuplicateAccountOutOfSync",
  "Custom",
  "InvalidError",
  "ExecutableDataModified",
  "ExecutableLamportChange",
  "ExecutableAccountNotRentExempt",
  "UnsupportedProgramId",
  "CallDepth",
  "MissingAccount",
  "ReentrancyNotAllowed",
  "MaxSeedLengthExceeded",
  "InvalidSeeds",
  "InvalidRealloc",
  "ComputationalBudgetExceeded",
  "PrivilegeEscalation",
  "ProgramEnvironmentSetupFailure",
  "ProgramFailedToComplete",
  "ProgramFailedToCompile",
  "Immutable",
  "IncorrectAuthority",
  "BorshIoError",
  "AccountNotRentExempt",
  "InvalidAccountOwner",
  "ArithmeticOverflow",
  "UnsupportedSysvar",
  "IllegalOwner",
  "MaxAccountsDataAllocationsExceeded",
  "MaxAccountsExceeded",
  "MaxInstructionTraceLengthExceeded",
  "BuiltinProgramsMustConsumeComputeUnits"
];
function getSolanaErrorFromInstructionError(index, instructionError) {
  const numberIndex = Number(index);
  return getSolanaErrorFromRpcError(
    {
      errorCodeBaseOffset: 4615001,
      getErrorContext(errorCode, rpcErrorName, rpcErrorContext) {
        if (errorCode === SOLANA_ERROR__INSTRUCTION_ERROR__UNKNOWN) {
          return {
            errorName: rpcErrorName,
            index: numberIndex,
            ...rpcErrorContext !== void 0 ? { instructionErrorContext: rpcErrorContext } : null
          };
        } else if (errorCode === SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM) {
          return {
            code: Number(rpcErrorContext),
            index: numberIndex
          };
        }
        return { index: numberIndex };
      },
      orderedErrorNames: ORDERED_ERROR_NAMES,
      rpcEnumError: instructionError
    },
    getSolanaErrorFromInstructionError
  );
}

// src/transaction-error.ts
var ORDERED_ERROR_NAMES2 = [
  // Keep synced with RPC source: https://github.com/anza-xyz/agave/blob/master/sdk/src/transaction/error.rs
  // If this list ever gets too large, consider implementing a compression strategy like this:
  // https://gist.github.com/steveluscher/aaa7cbbb5433b1197983908a40860c47
  "AccountInUse",
  "AccountLoadedTwice",
  "AccountNotFound",
  "ProgramAccountNotFound",
  "InsufficientFundsForFee",
  "InvalidAccountForFee",
  "AlreadyProcessed",
  "BlockhashNotFound",
  // `InstructionError` intentionally omitted; delegated to `getSolanaErrorFromInstructionError`
  "CallChainTooDeep",
  "MissingSignatureForFee",
  "InvalidAccountIndex",
  "SignatureFailure",
  "InvalidProgramForExecution",
  "SanitizeFailure",
  "ClusterMaintenance",
  "AccountBorrowOutstanding",
  "WouldExceedMaxBlockCostLimit",
  "UnsupportedVersion",
  "InvalidWritableAccount",
  "WouldExceedMaxAccountCostLimit",
  "WouldExceedAccountDataBlockLimit",
  "TooManyAccountLocks",
  "AddressLookupTableNotFound",
  "InvalidAddressLookupTableOwner",
  "InvalidAddressLookupTableData",
  "InvalidAddressLookupTableIndex",
  "InvalidRentPayingAccount",
  "WouldExceedMaxVoteCostLimit",
  "WouldExceedAccountDataTotalLimit",
  "DuplicateInstruction",
  "InsufficientFundsForRent",
  "MaxLoadedAccountsDataSizeExceeded",
  "InvalidLoadedAccountsDataSizeLimit",
  "ResanitizationNeeded",
  "ProgramExecutionTemporarilyRestricted",
  "UnbalancedTransaction"
];
function getSolanaErrorFromTransactionError(transactionError) {
  if (typeof transactionError === "object" && "InstructionError" in transactionError) {
    return getSolanaErrorFromInstructionError(
      ...transactionError.InstructionError
    );
  }
  return getSolanaErrorFromRpcError(
    {
      errorCodeBaseOffset: 7050001,
      getErrorContext(errorCode, rpcErrorName, rpcErrorContext) {
        if (errorCode === SOLANA_ERROR__TRANSACTION_ERROR__UNKNOWN) {
          return {
            errorName: rpcErrorName,
            ...rpcErrorContext !== void 0 ? { transactionErrorContext: rpcErrorContext } : null
          };
        } else if (errorCode === SOLANA_ERROR__TRANSACTION_ERROR__DUPLICATE_INSTRUCTION) {
          return {
            index: Number(rpcErrorContext)
          };
        } else if (errorCode === SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT || errorCode === SOLANA_ERROR__TRANSACTION_ERROR__PROGRAM_EXECUTION_TEMPORARILY_RESTRICTED) {
          return {
            accountIndex: Number(rpcErrorContext.account_index)
          };
        }
      },
      orderedErrorNames: ORDERED_ERROR_NAMES2,
      rpcEnumError: transactionError
    },
    getSolanaErrorFromTransactionError
  );
}

// src/json-rpc-error.ts
function getSolanaErrorFromJsonRpcError(putativeErrorResponse) {
  let out;
  if (isRpcErrorResponse(putativeErrorResponse)) {
    const { code: rawCode, data, message } = putativeErrorResponse;
    const code = Number(rawCode);
    if (code === SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE) {
      const { err, ...preflightErrorContext } = data;
      const causeObject = err ? { cause: getSolanaErrorFromTransactionError(err) } : null;
      out = new SolanaError(SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE, {
        ...preflightErrorContext,
        ...causeObject
      });
    } else {
      let errorContext;
      switch (code) {
        case SOLANA_ERROR__JSON_RPC__INTERNAL_ERROR:
        case SOLANA_ERROR__JSON_RPC__INVALID_PARAMS:
        case SOLANA_ERROR__JSON_RPC__INVALID_REQUEST:
        case SOLANA_ERROR__JSON_RPC__METHOD_NOT_FOUND:
        case SOLANA_ERROR__JSON_RPC__PARSE_ERROR:
        case SOLANA_ERROR__JSON_RPC__SCAN_ERROR:
        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_BLOCK_CLEANED_UP:
        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_BLOCK_NOT_AVAILABLE:
        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_BLOCK_STATUS_NOT_AVAILABLE_YET:
        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_KEY_EXCLUDED_FROM_SECONDARY_INDEX:
        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_LONG_TERM_STORAGE_SLOT_SKIPPED:
        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SLOT_SKIPPED:
        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE:
        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION:
          errorContext = { __serverMessage: message };
          break;
        default:
          if (typeof data === "object" && !Array.isArray(data)) {
            errorContext = data;
          }
      }
      out = new SolanaError(code, errorContext);
    }
  } else {
    const message = typeof putativeErrorResponse === "object" && putativeErrorResponse !== null && "message" in putativeErrorResponse && typeof putativeErrorResponse.message === "string" ? putativeErrorResponse.message : "Malformed JSON-RPC error with no message attribute";
    out = new SolanaError(SOLANA_ERROR__MALFORMED_JSON_RPC_ERROR, { error: putativeErrorResponse, message });
  }
  safeCaptureStackTrace(out, getSolanaErrorFromJsonRpcError);
  return out;
}
function isRpcErrorResponse(value) {
  return typeof value === "object" && value !== null && "code" in value && "message" in value && (typeof value.code === "number" || typeof value.code === "bigint") && typeof value.message === "string";
}

// src/parse-json-with-bigints.ts

// src/rpc-message.ts
var _nextMessageId = 0n;
function getNextMessageId() {
  const id = _nextMessageId;
  _nextMessageId++;
  return id.toString();
}
function createRpcMessage(request) {
  return {
    id: getNextMessageId(),
    jsonrpc: "2.0",
    method: request.methodName,
    params: request.params
  };
}

// src/rpc.ts
function createRpc(rpcConfig) {
  return makeProxy(rpcConfig);
}
function makeProxy(rpcConfig) {
  return new Proxy(rpcConfig.api, {
    defineProperty() {
      return false;
    },
    deleteProperty() {
      return false;
    },
    get(target, p, receiver) {
      if (p === "then") {
        return void 0;
      }
      return function(...rawParams) {
        const methodName = p.toString();
        const getApiPlan = Reflect.get(target, methodName, receiver);
        if (!getApiPlan) {
          throw new SolanaError(SOLANA_ERROR__RPC__API_PLAN_MISSING_FOR_RPC_METHOD, {
            method: methodName,
            params: rawParams
          });
        }
        const apiPlan = getApiPlan(...rawParams);
        return createPendingRpcRequest(rpcConfig, apiPlan);
      };
    }
  });
}
function createPendingRpcRequest({ transport }, plan) {
  return {
    async send(options) {
      return await plan.execute({ signal: options?.abortSignal, transport });
    }
  };
}
function createJsonRpcApi(config) {
  return new Proxy({}, {
    defineProperty() {
      return false;
    },
    deleteProperty() {
      return false;
    },
    get(...args) {
      const [_, p] = args;
      const methodName = p.toString();
      return function(...rawParams) {
        const rawRequest = Object.freeze({ methodName, params: rawParams });
        const request = config?.requestTransformer ? config?.requestTransformer(rawRequest) : rawRequest;
        return Object.freeze({
          execute: async ({ signal, transport }) => {
            const payload = createRpcMessage(request);
            const response = await transport({ payload, signal });
            if (!config?.responseTransformer) {
              return response;
            }
            return config.responseTransformer(response, request);
          }
        });
      };
    }
  });
}

// src/pipe.ts
function pipe(init, ...fns) {
  return fns.reduce((acc, fn) => fn(acc), init);
}

// src/request-transformer.ts

// src/request-transformer-bigint-downcast-internal.ts
function downcastNodeToNumberIfBigint(value) {
  return typeof value === "bigint" ? (
    // FIXME(solana-labs/solana/issues/30341) Create a data type to represent u64 in the Solana
    // JSON RPC implementation so that we can throw away this entire patcher instead of unsafely
    // downcasting `bigints` to `numbers`.
    Number(value)
  ) : value;
}

// src/tree-traversal.ts
var KEYPATH_WILDCARD = {};
function getTreeWalker(visitors) {
  return function traverse(node, state) {
    if (Array.isArray(node)) {
      return node.map((element, ii) => {
        const nextState = {
          ...state,
          keyPath: [...state.keyPath, ii]
        };
        return traverse(element, nextState);
      });
    } else if (typeof node === "object" && node !== null) {
      const out = {};
      for (const propName in node) {
        if (!Object.prototype.hasOwnProperty.call(node, propName)) {
          continue;
        }
        const nextState = {
          ...state,
          keyPath: [...state.keyPath, propName]
        };
        out[propName] = traverse(node[propName], nextState);
      }
      return out;
    } else {
      return visitors.reduce((acc, visitNode) => visitNode(acc, state), node);
    }
  };
}
function getTreeWalkerRequestTransformer(visitors, initialState) {
  return (request) => {
    const traverse = getTreeWalker(visitors);
    return Object.freeze({
      ...request,
      params: traverse(request.params, initialState)
    });
  };
}
function getTreeWalkerResponseTransformer(visitors, initialState) {
  return (json) => getTreeWalker(visitors)(json, initialState);
}

// src/request-transformer-bigint-downcast.ts
function getBigIntDowncastRequestTransformer() {
  return getTreeWalkerRequestTransformer([downcastNodeToNumberIfBigint], { keyPath: [] });
}

// src/request-transformer-default-commitment-internal.ts
function applyDefaultCommitment({
  commitmentPropertyName,
  params,
  optionsObjectPositionInParams,
  overrideCommitment
}) {
  const paramInTargetPosition = params[optionsObjectPositionInParams];
  if (
    // There's no config.
    paramInTargetPosition === void 0 || // There is a config object.
    paramInTargetPosition && typeof paramInTargetPosition === "object" && !Array.isArray(paramInTargetPosition)
  ) {
    if (
      // The config object already has a commitment set.
      paramInTargetPosition && commitmentPropertyName in paramInTargetPosition
    ) {
      if (!paramInTargetPosition[commitmentPropertyName] || paramInTargetPosition[commitmentPropertyName] === "finalized") {
        const nextParams = [...params];
        const {
          [commitmentPropertyName]: _,
          // eslint-disable-line @typescript-eslint/no-unused-vars
          ...rest
        } = paramInTargetPosition;
        if (Object.keys(rest).length > 0) {
          nextParams[optionsObjectPositionInParams] = rest;
        } else {
          if (optionsObjectPositionInParams === nextParams.length - 1) {
            nextParams.length--;
          } else {
            nextParams[optionsObjectPositionInParams] = void 0;
          }
        }
        return nextParams;
      }
    } else if (overrideCommitment !== "finalized") {
      const nextParams = [...params];
      nextParams[optionsObjectPositionInParams] = {
        ...paramInTargetPosition,
        [commitmentPropertyName]: overrideCommitment
      };
      return nextParams;
    }
  }
  return params;
}

// src/request-transformer-default-commitment.ts
function getDefaultCommitmentRequestTransformer({
  defaultCommitment,
  optionsObjectPositionByMethod
}) {
  return (request) => {
    const { params, methodName } = request;
    if (!Array.isArray(params)) {
      return request;
    }
    const optionsObjectPositionInParams = optionsObjectPositionByMethod[methodName];
    if (optionsObjectPositionInParams == null) {
      return request;
    }
    return Object.freeze({
      methodName,
      params: applyDefaultCommitment({
        commitmentPropertyName: methodName === "sendTransaction" ? "preflightCommitment" : "commitment",
        optionsObjectPositionInParams,
        overrideCommitment: defaultCommitment,
        params
      })
    });
  };
}

// src/request-transformer-integer-overflow-internal.ts
function getIntegerOverflowNodeVisitor(onIntegerOverflow) {
  return (value, { keyPath }) => {
    if (typeof value === "bigint") {
      if (onIntegerOverflow && (value > Number.MAX_SAFE_INTEGER || value < -Number.MAX_SAFE_INTEGER)) {
        onIntegerOverflow(keyPath, value);
      }
    }
    return value;
  };
}

// src/request-transformer-integer-overflow.ts
function getIntegerOverflowRequestTransformer(onIntegerOverflow) {
  return (request) => {
    const transformer = getTreeWalkerRequestTransformer(
      [getIntegerOverflowNodeVisitor((...args) => onIntegerOverflow(request, ...args))],
      { keyPath: [] }
    );
    return transformer(request);
  };
}

// src/request-transformer-options-object-position-config.ts
var OPTIONS_OBJECT_POSITION_BY_METHOD = {
  accountNotifications: 1,
  blockNotifications: 1,
  getAccountInfo: 1,
  getBalance: 1,
  getBlock: 1,
  getBlockHeight: 0,
  getBlockProduction: 0,
  getBlocks: 2,
  getBlocksWithLimit: 2,
  getEpochInfo: 0,
  getFeeForMessage: 1,
  getInflationGovernor: 0,
  getInflationReward: 1,
  getLargestAccounts: 0,
  getLatestBlockhash: 0,
  getLeaderSchedule: 1,
  getMinimumBalanceForRentExemption: 1,
  getMultipleAccounts: 1,
  getProgramAccounts: 1,
  getSignaturesForAddress: 1,
  getSlot: 0,
  getSlotLeader: 0,
  getStakeMinimumDelegation: 0,
  getSupply: 0,
  getTokenAccountBalance: 1,
  getTokenAccountsByDelegate: 2,
  getTokenAccountsByOwner: 2,
  getTokenLargestAccounts: 1,
  getTokenSupply: 1,
  getTransaction: 1,
  getTransactionCount: 0,
  getVoteAccounts: 0,
  isBlockhashValid: 1,
  logsNotifications: 1,
  programNotifications: 1,
  requestAirdrop: 2,
  sendTransaction: 1,
  signatureNotifications: 1,
  simulateTransaction: 1
};

// src/request-transformer.ts
function getDefaultRequestTransformerForSolanaRpc(config) {
  const handleIntegerOverflow = config?.onIntegerOverflow;
  return (request) => {
    return pipe(
      request,
      handleIntegerOverflow ? getIntegerOverflowRequestTransformer(handleIntegerOverflow) : (r) => r,
      getBigIntDowncastRequestTransformer(),
      getDefaultCommitmentRequestTransformer({
        defaultCommitment: config?.defaultCommitment,
        optionsObjectPositionByMethod: OPTIONS_OBJECT_POSITION_BY_METHOD
      })
    );
  };
}

// src/response-transformer-bigint-upcast-internal.ts
function getBigIntUpcastVisitor(allowedNumericKeyPaths) {
  return function upcastNodeToBigIntIfNumber(value, { keyPath }) {
    const isInteger = typeof value === "number" && Number.isInteger(value) || typeof value === "bigint";
    if (!isInteger) return value;
    if (keyPathIsAllowedToBeNumeric(keyPath, allowedNumericKeyPaths)) {
      return Number(value);
    } else {
      return BigInt(value);
    }
  };
}
function keyPathIsAllowedToBeNumeric(keyPath, allowedNumericKeyPaths) {
  return allowedNumericKeyPaths.some((prohibitedKeyPath) => {
    if (prohibitedKeyPath.length !== keyPath.length) {
      return false;
    }
    for (let ii = keyPath.length - 1; ii >= 0; ii--) {
      const keyPathPart = keyPath[ii];
      const prohibitedKeyPathPart = prohibitedKeyPath[ii];
      if (prohibitedKeyPathPart !== keyPathPart && (prohibitedKeyPathPart !== KEYPATH_WILDCARD || typeof keyPathPart !== "number")) {
        return false;
      }
    }
    return true;
  });
}

// src/response-transformer-bigint-upcast.ts
function getBigIntUpcastResponseTransformer(allowedNumericKeyPaths) {
  return getTreeWalkerResponseTransformer([getBigIntUpcastVisitor(allowedNumericKeyPaths)], { keyPath: [] });
}

// src/response-transformer-result.ts
function getResultResponseTransformer() {
  return (json) => json.result;
}

// src/response-transformer-allowed-numeric-values.ts
var jsonParsedTokenAccountsConfigs = [
  // parsed Token/Token22 token account
  ["data", "parsed", "info", "tokenAmount", "decimals"],
  ["data", "parsed", "info", "tokenAmount", "uiAmount"],
  ["data", "parsed", "info", "rentExemptReserve", "decimals"],
  ["data", "parsed", "info", "rentExemptReserve", "uiAmount"],
  ["data", "parsed", "info", "delegatedAmount", "decimals"],
  ["data", "parsed", "info", "delegatedAmount", "uiAmount"],
  ["data", "parsed", "info", "extensions", KEYPATH_WILDCARD, "state", "olderTransferFee", "transferFeeBasisPoints"],
  ["data", "parsed", "info", "extensions", KEYPATH_WILDCARD, "state", "newerTransferFee", "transferFeeBasisPoints"],
  ["data", "parsed", "info", "extensions", KEYPATH_WILDCARD, "state", "preUpdateAverageRate"],
  ["data", "parsed", "info", "extensions", KEYPATH_WILDCARD, "state", "currentRate"]
];
var jsonParsedAccountsConfigs = [
  ...jsonParsedTokenAccountsConfigs,
  // parsed AddressTableLookup account
  ["data", "parsed", "info", "lastExtendedSlotStartIndex"],
  // parsed Config account
  ["data", "parsed", "info", "slashPenalty"],
  ["data", "parsed", "info", "warmupCooldownRate"],
  // parsed Token/Token22 mint account
  ["data", "parsed", "info", "decimals"],
  // parsed Token/Token22 multisig account
  ["data", "parsed", "info", "numRequiredSigners"],
  ["data", "parsed", "info", "numValidSigners"],
  // parsed Stake account
  ["data", "parsed", "info", "stake", "delegation", "warmupCooldownRate"],
  // parsed Sysvar rent account
  ["data", "parsed", "info", "exemptionThreshold"],
  ["data", "parsed", "info", "burnPercent"],
  // parsed Vote account
  ["data", "parsed", "info", "commission"],
  ["data", "parsed", "info", "votes", KEYPATH_WILDCARD, "confirmationCount"]
];
var innerInstructionsConfigs = [
  ["index"],
  ["instructions", KEYPATH_WILDCARD, "accounts", KEYPATH_WILDCARD],
  ["instructions", KEYPATH_WILDCARD, "programIdIndex"],
  ["instructions", KEYPATH_WILDCARD, "stackHeight"]
];
var messageConfig = [
  ["addressTableLookups", KEYPATH_WILDCARD, "writableIndexes", KEYPATH_WILDCARD],
  ["addressTableLookups", KEYPATH_WILDCARD, "readonlyIndexes", KEYPATH_WILDCARD],
  ["header", "numReadonlySignedAccounts"],
  ["header", "numReadonlyUnsignedAccounts"],
  ["header", "numRequiredSignatures"],
  ["instructions", KEYPATH_WILDCARD, "accounts", KEYPATH_WILDCARD],
  ["instructions", KEYPATH_WILDCARD, "programIdIndex"],
  ["instructions", KEYPATH_WILDCARD, "stackHeight"]
];

// src/response-transformer-throw-solana-error.ts
function getSimulateTransactionAllowedNumericKeypaths() {
  return [
    ["loadedAccountsDataSize"],
    ...jsonParsedAccountsConfigs.map((c) => ["accounts", KEYPATH_WILDCARD, ...c]),
    ...innerInstructionsConfigs.map((c) => ["innerInstructions", KEYPATH_WILDCARD, ...c])
  ];
}
function getThrowSolanaErrorResponseTransformer() {
  return (json, request) => {
    const jsonRpcResponse = json;
    if ("error" in jsonRpcResponse) {
      const { error } = jsonRpcResponse;
      const isSendTransactionPreflightFailure = error && typeof error === "object" && "code" in error && (error.code === -32002 || error.code === -32002n);
      if (isSendTransactionPreflightFailure && "data" in error && error.data) {
        const treeWalker = getTreeWalkerResponseTransformer(
          [getBigIntUpcastVisitor(getSimulateTransactionAllowedNumericKeypaths())],
          { keyPath: [] }
        );
        const transformedData = treeWalker(error.data, request);
        const transformedError = { ...error, data: transformedData };
        throw getSolanaErrorFromJsonRpcError(transformedError);
      }
      throw getSolanaErrorFromJsonRpcError(jsonRpcResponse.error);
    }
    return jsonRpcResponse;
  };
}

// src/response-transformer.ts
function getDefaultResponseTransformerForSolanaRpc(config) {
  return (response, request) => {
    const methodName = request.methodName;
    const keyPaths = config?.allowedNumericKeyPaths && methodName ? config.allowedNumericKeyPaths[methodName] : void 0;
    return pipe(
      response,
      (r) => getThrowSolanaErrorResponseTransformer()(r, request),
      (r) => getResultResponseTransformer()(r, request),
      (r) => getBigIntUpcastResponseTransformer(keyPaths ?? [])(r, request)
    );
  };
}

// src/index.ts
function createSolanaRpcApi(config) {
  return createJsonRpcApi({
    requestTransformer: getDefaultRequestTransformerForSolanaRpc(config),
    responseTransformer: getDefaultResponseTransformerForSolanaRpc({
      allowedNumericKeyPaths: getAllowedNumericKeypaths()
    })
  });
}
var memoizedKeypaths;
function getAllowedNumericKeypaths() {
  if (!memoizedKeypaths) {
    memoizedKeypaths = {
      getAccountInfo: jsonParsedAccountsConfigs.map((c) => ["value", ...c]),
      getBlock: [
        ["transactions", KEYPATH_WILDCARD, "meta", "preTokenBalances", KEYPATH_WILDCARD, "accountIndex"],
        [
          "transactions",
          KEYPATH_WILDCARD,
          "meta",
          "preTokenBalances",
          KEYPATH_WILDCARD,
          "uiTokenAmount",
          "decimals"
        ],
        ["transactions", KEYPATH_WILDCARD, "meta", "postTokenBalances", KEYPATH_WILDCARD, "accountIndex"],
        [
          "transactions",
          KEYPATH_WILDCARD,
          "meta",
          "postTokenBalances",
          KEYPATH_WILDCARD,
          "uiTokenAmount",
          "decimals"
        ],
        ["transactions", KEYPATH_WILDCARD, "meta", "rewards", KEYPATH_WILDCARD, "commission"],
        ...innerInstructionsConfigs.map((c) => [
          "transactions",
          KEYPATH_WILDCARD,
          "meta",
          "innerInstructions",
          KEYPATH_WILDCARD,
          ...c
        ]),
        ...messageConfig.map((c) => ["transactions", KEYPATH_WILDCARD, "transaction", "message", ...c]),
        ["rewards", KEYPATH_WILDCARD, "commission"]
      ],
      getClusterNodes: [
        [KEYPATH_WILDCARD, "featureSet"],
        [KEYPATH_WILDCARD, "shredVersion"]
      ],
      getInflationGovernor: [["initial"], ["foundation"], ["foundationTerm"], ["taper"], ["terminal"]],
      getInflationRate: [["foundation"], ["total"], ["validator"]],
      getInflationReward: [[KEYPATH_WILDCARD, "commission"]],
      getMultipleAccounts: jsonParsedAccountsConfigs.map((c) => ["value", KEYPATH_WILDCARD, ...c]),
      getProgramAccounts: jsonParsedAccountsConfigs.flatMap((c) => [
        ["value", KEYPATH_WILDCARD, "account", ...c],
        [KEYPATH_WILDCARD, "account", ...c]
      ]),
      getRecentPerformanceSamples: [[KEYPATH_WILDCARD, "samplePeriodSecs"]],
      getTokenAccountBalance: [
        ["value", "decimals"],
        ["value", "uiAmount"]
      ],
      getTokenAccountsByDelegate: jsonParsedTokenAccountsConfigs.map((c) => [
        "value",
        KEYPATH_WILDCARD,
        "account",
        ...c
      ]),
      getTokenAccountsByOwner: jsonParsedTokenAccountsConfigs.map((c) => [
        "value",
        KEYPATH_WILDCARD,
        "account",
        ...c
      ]),
      getTokenLargestAccounts: [
        ["value", KEYPATH_WILDCARD, "decimals"],
        ["value", KEYPATH_WILDCARD, "uiAmount"]
      ],
      getTokenSupply: [
        ["value", "decimals"],
        ["value", "uiAmount"]
      ],
      getTransaction: [
        ["meta", "preTokenBalances", KEYPATH_WILDCARD, "accountIndex"],
        ["meta", "preTokenBalances", KEYPATH_WILDCARD, "uiTokenAmount", "decimals"],
        ["meta", "postTokenBalances", KEYPATH_WILDCARD, "accountIndex"],
        ["meta", "postTokenBalances", KEYPATH_WILDCARD, "uiTokenAmount", "decimals"],
        ["meta", "rewards", KEYPATH_WILDCARD, "commission"],
        ...innerInstructionsConfigs.map((c) => ["meta", "innerInstructions", KEYPATH_WILDCARD, ...c]),
        ...messageConfig.map((c) => ["transaction", "message", ...c])
      ],
      getVersion: [["feature-set"]],
      getVoteAccounts: [
        ["current", KEYPATH_WILDCARD, "commission"],
        ["delinquent", KEYPATH_WILDCARD, "commission"]
      ],
      simulateTransaction: [
        ["value", "loadedAccountsDataSize"],
        ...jsonParsedAccountsConfigs.map((c) => ["value", "accounts", KEYPATH_WILDCARD, ...c]),
        ...innerInstructionsConfigs.map((c) => ["value", "innerInstructions", KEYPATH_WILDCARD, ...c])
      ]
    };
  }
  return memoizedKeypaths;
}

var maxU64Value = 18446744073709551615n;
function assertIsLamports(putativeLamports) {
  if (putativeLamports < 0 || putativeLamports > maxU64Value) {
    throw new SolanaError(SOLANA_ERROR__LAMPORTS_OUT_OF_RANGE);
  }
}
function lamports(putativeLamports) {
  assertIsLamports(putativeLamports);
  return putativeLamports;
}

var fastStableStringify$1;
var hasRequiredFastStableStringify;

function requireFastStableStringify () {
	if (hasRequiredFastStableStringify) return fastStableStringify$1;
	hasRequiredFastStableStringify = 1;
	var objToString = Object.prototype.toString;
	var objKeys = Object.keys || function(obj) {
			var keys = [];
			for (var name in obj) {
				keys.push(name);
			}
			return keys;
		};

	function stringify(val, isArrayProp) {
		var i, max, str, keys, key, propVal, toStr;
		if (val === true) {
			return "true";
		}
		if (val === false) {
			return "false";
		}
		switch (typeof val) {
			case "object":
				if (val === null) {
					return null;
				} else if (val.toJSON && typeof val.toJSON === "function") {
					return stringify(val.toJSON(), isArrayProp);
				} else {
					toStr = objToString.call(val);
					if (toStr === "[object Array]") {
						str = '[';
						max = val.length - 1;
						for(i = 0; i < max; i++) {
							str += stringify(val[i], true) + ',';
						}
						if (max > -1) {
							str += stringify(val[i], true);
						}
						return str + ']';
					} else if (toStr === "[object Object]") {
						// only object is left
						keys = objKeys(val).sort();
						max = keys.length;
						str = "";
						i = 0;
						while (i < max) {
							key = keys[i];
							propVal = stringify(val[key], false);
							if (propVal !== undefined) {
								if (str) {
									str += ',';
								}
								str += JSON.stringify(key) + ':' + propVal;
							}
							i++;
						}
						return '{' + str + '}';
					} else {
						return JSON.stringify(val);
					}
				}
			case "function":
			case "undefined":
				return isArrayProp ? null : undefined;
			case "string":
				return JSON.stringify(val);
			default:
				return isFinite(val) ? val : null;
		}
	}

	fastStableStringify$1 = function(val) {
		var returnVal = stringify(val, false);
		if (returnVal !== undefined) {
			return ''+ returnVal;
		}
	};
	return fastStableStringify$1;
}

var fastStableStringifyExports = /*@__PURE__*/ requireFastStableStringify();
var fastStableStringify = /*@__PURE__*/getDefaultExportFromCjs(fastStableStringifyExports);

// src/index.ts
function createSolanaJsonRpcIntegerOverflowError(methodName, keyPath, value) {
  let argumentLabel = "";
  if (typeof keyPath[0] === "number") {
    const argPosition = keyPath[0] + 1;
    const lastDigit = argPosition % 10;
    const lastTwoDigits = argPosition % 100;
    if (lastDigit == 1 && lastTwoDigits != 11) {
      argumentLabel = argPosition + "st";
    } else if (lastDigit == 2 && lastTwoDigits != 12) {
      argumentLabel = argPosition + "nd";
    } else if (lastDigit == 3 && lastTwoDigits != 13) {
      argumentLabel = argPosition + "rd";
    } else {
      argumentLabel = argPosition + "th";
    }
  } else {
    argumentLabel = `\`${keyPath[0].toString()}\``;
  }
  const path = keyPath.length > 1 ? keyPath.slice(1).map((pathPart) => typeof pathPart === "number" ? `[${pathPart}]` : pathPart).join(".") : void 0;
  const error = new SolanaError(SOLANA_ERROR__RPC__INTEGER_OVERFLOW, {
    argumentLabel,
    keyPath,
    methodName,
    optionalPathLabel: path ? ` at path \`${path}\`` : "",
    value,
    ...path !== void 0 ? { path } : void 0
  });
  safeCaptureStackTrace(error, createSolanaJsonRpcIntegerOverflowError);
  return error;
}

// src/rpc-default-config.ts
var DEFAULT_RPC_CONFIG = {
  defaultCommitment: "confirmed",
  onIntegerOverflow(request, keyPath, value) {
    throw createSolanaJsonRpcIntegerOverflowError(request.methodName, keyPath, value);
  }
};

const MINIMUM_SLOT_PER_EPOCH = 32n;

// Returns the number of trailing zeros in the binary representation of self.
function trailingZeros(n) {
  let trailingZeros = 0n;
  while (n > 1n) {
    n /= 2n;
    trailingZeros++;
  }
  return trailingZeros;
}

// Returns the smallest power of two greater than or equal to n.
function nextPowerOfTwo(n) {
  if (n === 0n) return 1n;
  n--;
  n |= n >> 1n;
  n |= n >> 2n;
  n |= n >> 4n;
  n |= n >> 8n;
  n |= n >> 16n;
  n |= n >> 32n;
  return n + 1n;
}

/**
 * Epoch schedule
 * (see https://docs.solana.com/terminology#epoch)
 * Can be retrieved with the {@link Connection.getEpochSchedule} method
 */
class EpochSchedule {
  constructor(slotsPerEpoch, leaderScheduleSlotOffset, warmup, firstNormalEpoch, firstNormalSlot) {
    /** The maximum number of slots in each epoch */
    this.slotsPerEpoch = void 0;
    /** The number of slots before beginning of an epoch to calculate a leader schedule for that epoch */
    this.leaderScheduleSlotOffset = void 0;
    /** Indicates whether epochs start short and grow */
    this.warmup = void 0;
    /** The first epoch with `slotsPerEpoch` slots */
    this.firstNormalEpoch = void 0;
    /** The first slot of `firstNormalEpoch` */
    this.firstNormalSlot = void 0;
    this.slotsPerEpoch = slotsPerEpoch;
    this.leaderScheduleSlotOffset = leaderScheduleSlotOffset;
    this.warmup = warmup;
    this.firstNormalEpoch = firstNormalEpoch;
    this.firstNormalSlot = firstNormalSlot;
  }
  getEpoch(slot) {
    return this.getEpochAndSlotIndex(slot)[0];
  }
  getEpochAndSlotIndex(slot) {
    if (slot < this.firstNormalSlot) {
      const epoch = trailingZeros(nextPowerOfTwo(slot + MINIMUM_SLOT_PER_EPOCH + 1n)) - trailingZeros(MINIMUM_SLOT_PER_EPOCH) - 1n;
      const epochLen = this.getSlotsInEpoch(epoch);
      const slotIndex = slot - (epochLen - MINIMUM_SLOT_PER_EPOCH);
      return [epoch, slotIndex];
    } else {
      const normalSlotIndex = slot - this.firstNormalSlot;
      const normalEpochIndex = normalSlotIndex / this.slotsPerEpoch;
      const epoch = this.firstNormalEpoch + normalEpochIndex;
      const slotIndex = normalSlotIndex % this.slotsPerEpoch;
      return [epoch, slotIndex];
    }
  }
  getFirstSlotInEpoch(epoch) {
    if (epoch <= this.firstNormalEpoch) {
      return (2n ** epoch - 1n) * MINIMUM_SLOT_PER_EPOCH;
    } else {
      return (epoch - this.firstNormalEpoch) * this.slotsPerEpoch + this.firstNormalSlot;
    }
  }
  getLastSlotInEpoch(epoch) {
    return this.getFirstSlotInEpoch(epoch) + this.getSlotsInEpoch(epoch) - 1n;
  }
  getSlotsInEpoch(epoch) {
    if (epoch < this.firstNormalEpoch) {
      return 2n ** (epoch + trailingZeros(MINIMUM_SLOT_PER_EPOCH));
    } else {
      return this.slotsPerEpoch;
    }
  }
}

class RpcWebSocketClient extends rpcWebsockets.CommonClient {
  constructor(address, options, generate_request_id) {
    const webSocketFactory = url => {
      const rpc = rpcWebsockets.WebSocket(url, {
        autoconnect: true,
        max_reconnects: 5,
        reconnect: true,
        reconnect_interval: 1000,
        ...options
      });
      if ('socket' in rpc) {
        this.underlyingSocket = rpc.socket;
      } else {
        this.underlyingSocket = rpc;
      }
      return rpc;
    };
    super(webSocketFactory, address, options, generate_request_id);
    this.underlyingSocket = void 0;
  }
  call(...args) {
    const readyState = this.underlyingSocket?.readyState;
    if (readyState === 1 /* WebSocket.OPEN */) {
      return super.call(...args);
    }
    return Promise.reject(new Error('Tried to call a JSON-RPC method `' + args[0] + '` but the socket was not `CONNECTING` or `OPEN` (`readyState` was ' + readyState + ')'));
  }
  notify(...args) {
    const readyState = this.underlyingSocket?.readyState;
    if (readyState === 1 /* WebSocket.OPEN */) {
      return super.notify(...args);
    }
    return Promise.reject(new Error('Tried to send a JSON-RPC notification `' + args[0] + '` but the socket was not `CONNECTING` or `OPEN` (`readyState` was ' + readyState + ')'));
  }
}

/// The serialized size of lookup table metadata
const LOOKUP_TABLE_META_SIZE = 56;
const U32_DECODER = codecsNumbers.getU32Decoder();
const U64_DECODER = codecsNumbers.getU64Decoder();
const U8_DECODER$1 = codecsNumbers.getU8Decoder();
const PUBLIC_KEY_CODEC$2 = transformCodec(fixCodecSize(getBytesCodec(), 32), value => value, value => new Uint8Array(value));
const decodeLookupTableMeta = bytes => {
  let offset = 0;
  const [typeIndex, typeOffset] = U32_DECODER.read(bytes, offset);
  offset = typeOffset;
  const [deactivationSlot, deactivationOffset] = U64_DECODER.read(bytes, offset);
  offset = deactivationOffset;
  const [lastExtendedSlotRaw, lastExtendedOffset] = U64_DECODER.read(bytes, offset);
  offset = lastExtendedOffset;
  const [lastExtendedStartIndex, startOffset] = U8_DECODER$1.read(bytes, offset);
  offset = startOffset;
  const [authorityOption, optionOffset] = U8_DECODER$1.read(bytes, offset);
  offset = optionOffset;
  const authority = [];
  if (authorityOption !== 0) {
    const [authorityBytes] = PUBLIC_KEY_CODEC$2.read(bytes, offset);
    authority.push(authorityBytes);
  }
  return {
    typeIndex,
    deactivationSlot,
    lastExtendedSlot: Number(lastExtendedSlotRaw),
    lastExtendedStartIndex,
    authority
  };
};
class AddressLookupTableAccount {
  constructor(args) {
    this.key = void 0;
    this.state = void 0;
    this.key = args.key;
    this.state = args.state;
  }
  isActive() {
    const U64_MAX = BigInt('0xffffffffffffffff');
    return this.state.deactivationSlot === U64_MAX;
  }
  static deserialize(accountData) {
    const meta = decodeLookupTableMeta(accountData);
    const serializedAddressesLen = accountData.length - LOOKUP_TABLE_META_SIZE;
    assert(serializedAddressesLen >= 0, 'lookup table is invalid');
    assert(serializedAddressesLen % 32 === 0, 'lookup table is invalid');
    const numSerializedAddresses = serializedAddressesLen / 32;
    const addressesBytes = accountData.slice(LOOKUP_TABLE_META_SIZE);
    const addresses = [];
    for (let index = 0; index < numSerializedAddresses; index += 1) {
      const offset = index * 32;
      const [addressBytes] = PUBLIC_KEY_CODEC$2.read(addressesBytes, offset);
      addresses.push(addressBytes);
    }
    return {
      deactivationSlot: meta.deactivationSlot,
      lastExtendedSlot: meta.lastExtendedSlot,
      lastExtendedSlotStartIndex: meta.lastExtendedStartIndex,
      authority: meta.authority.length !== 0 ? new Address(meta.authority[0]) : undefined,
      addresses: addresses.map(address => new Address(address))
    };
  }
}

const URL_RE = /^[^:]+:\/\/([^:[]+|\[[^\]]+\])(:\d+)?(.*)/i;
function makeWebsocketUrl(endpoint) {
  const matches = endpoint.match(URL_RE);
  if (matches == null) {
    throw TypeError(`Failed to validate endpoint URL \`${endpoint}\``);
  }
  const [_,
  // eslint-disable-line @typescript-eslint/no-unused-vars
  hostish, portWithColon, rest] = matches;
  const protocol = endpoint.startsWith('https:') ? 'wss:' : 'ws:';
  const startPort = portWithColon == null ? null : parseInt(portWithColon.slice(1), 10);
  const websocketPort =
  // Only shift the port by +1 as a convention for ws(s) only if given endpoint
  // is explicitly specifying the endpoint port (HTTP-based RPC), assuming
  // we're directly trying to connect to agave-validator's ws listening port.
  // When the endpoint omits the port, we're connecting to the protocol
  // default ports: http(80) or https(443) and it's assumed we're behind a reverse
  // proxy which manages WebSocket upgrade and backend port redirection.
  startPort == null ? '' : `:${startPort + 1}`;
  return `${protocol}//${hostish}${websocketPort}${rest}`;
}

const PublicKeyFromString = superstruct.coerce(superstruct.instance(Address), superstruct.string(), value => new Address(value));
function toKitAddress(address) {
  return address.toBase58();
}
const BigIntFromNumber = superstruct.coerce(superstruct.define('bigint', value => typeof value === 'bigint'), superstruct.union([superstruct.number(), superstruct.string()]), value => {
  if (typeof value === 'number') {
    assert(Number.isInteger(value), 'Expected bigint-compatible integer number');
    // Preserve compatibility with nodes that emit JSON numbers for u64 fields.
    value = `${value}`;
  }
  assert(/^\d+$/.test(value), 'Expected bigint-compatible unsigned integer string');
  return BigInt(value);
});
const RawAccountDataResult = superstruct.tuple([superstruct.string(), superstruct.literal('base64')]);
function decodeBase64WireData(value) {
  return toUint8ArrayView(BASE64_CODEC.encode(value));
}
function encodeBase64WireData(value) {
  return BASE64_CODEC.decode(value);
}
const Uint8ArrayFromRawAccountData = superstruct.coerce(superstruct.instance(Uint8Array), RawAccountDataResult, value => decodeBase64WireData(value[0]));
const BASE58_ENCODER = getBase58Encoder();
const BASE64_CODEC = getBase64Codec();

/**
 * Attempt to use a recent blockhash for up to 30 seconds
 * @internal
 */
const BLOCKHASH_CACHE_TIMEOUT_MS = 30 * 1000;

/**
 * HACK.
 * Copied from rpc-websockets/dist/lib/client.
 * Otherwise, `yarn build` fails with:
 * https://gist.github.com/steveluscher/c057eca81d479ef705cdb53162f9971d
 */

/** @internal */
/** @internal */
/** @internal */
/** @internal */

/** @internal */
/**
 * @internal
 * Every subscription contains the args used to open the subscription with
 * the server, and a list of callers interested in notifications.
 */

/**
 * @internal
 * A subscription may be in various states of connectedness. Only when it is
 * fully connected will it have a server subscription id associated with it.
 * This id can be returned to the server to unsubscribe the client entirely.
 */

/**
 * A type that encapsulates a subscription's RPC method
 * names and notification (callback) signature.
 */

/**
 * @internal
 * Utility type that keeps tagged unions intact while omitting properties.
 */

/**
 * @internal
 * This type represents a single subscribable 'topic.' It's made up of:
 *
 * - The args used to open the subscription with the server,
 * - The state of the subscription, in terms of its connectedness, and
 * - The set of callbacks to call when the server publishes notifications
 *
 * This record gets indexed by `SubscriptionConfigHash` and is used to
 * set up subscriptions, fan out notifications, and track subscription state.
 */

/**
 * @internal
 */

/**
 * Extra contextual information for RPC responses
 */

/**
 * Options for sending transactions
 */

/**
 * Options for confirming transactions
 */

/**
 * Options for getSignaturesForAddress
 */

/**
 * RPC Response with extra contextual information
 */

/**
 * A strategy for confirming transactions that uses the last valid
 * block height for a given blockhash to check for transaction expiration.
 */

/**
 * A strategy for confirming durable nonce transactions.
 */

/**
 * Properties shared by all transaction confirmation strategies
 */

/**
 * This type represents all transaction confirmation strategies
 */

/* @internal */
function assertEndpointUrl(putativeUrl) {
  if (/^https?:/.test(putativeUrl) === false) {
    throw new TypeError('Endpoint URL must start with `http:` or `https:`.');
  }
  return putativeUrl;
}

/** @internal */
function extractCommitmentFromConfig(commitmentOrConfig) {
  let commitment;
  let config;
  if (typeof commitmentOrConfig === 'string') {
    commitment = commitmentOrConfig;
  } else if (commitmentOrConfig) {
    const {
      commitment: specifiedCommitment,
      ...specifiedConfig
    } = commitmentOrConfig;
    commitment = specifiedCommitment;
    config = specifiedConfig;
  }
  return {
    commitment,
    config
  };
}

/** @internal */
function coerceNumericToBigInt(value, valueName) {
  if (typeof value === 'bigint') {
    return value;
  }
  assert(Number.isSafeInteger(value), `${valueName ?? 'Value'} must be a safe integer or bigint`);
  return BigInt(value);
}

/**
 * @internal
 */
function applyDefaultMemcmpEncodingToFilters(filters) {
  return filters.map(filter => 'memcmp' in filter ? {
    ...filter,
    memcmp: {
      ...filter.memcmp,
      encoding: filter.memcmp.encoding ?? 'base58'
    }
  } : filter);
}

/**
 * @internal
 */
function createRpcResult(result) {
  return superstruct.union([superstruct.type({
    jsonrpc: superstruct.literal('2.0'),
    id: superstruct.string(),
    result
  }), superstruct.type({
    jsonrpc: superstruct.literal('2.0'),
    id: superstruct.string(),
    error: superstruct.type({
      code: superstruct.unknown(),
      message: superstruct.string(),
      data: superstruct.optional(superstruct.any())
    })
  })]);
}
const UnknownRpcResult = createRpcResult(superstruct.unknown());

/**
 * @internal
 */
function jsonRpcResult(schema) {
  return superstruct.coerce(createRpcResult(schema), UnknownRpcResult, value => {
    if ('error' in value) {
      return value;
    } else {
      return {
        ...value,
        result: superstruct.create(value.result, schema)
      };
    }
  });
}

/**
 * @internal
 */
function jsonRpcResultAndContext(value) {
  return jsonRpcResult(superstruct.type({
    context: superstruct.type({
      slot: superstruct.number()
    }),
    value
  }));
}

/**
 * @internal
 */
function notificationResultAndContext(value) {
  return superstruct.type({
    context: superstruct.type({
      slot: superstruct.number()
    }),
    value
  });
}

/**
 * @internal
 */
function versionedMessageFromResponse(version, response) {
  if (version === 0) {
    return new MessageV0({
      header: response.header,
      staticAccountKeys: response.accountKeys.map(accountKey => new Address(accountKey)),
      recentBlockhash: response.recentBlockhash,
      compiledInstructions: response.instructions.map(ix => ({
        programIdIndex: ix.programIdIndex,
        accountKeyIndexes: ix.accounts,
        data: toUint8ArrayView(BASE58_ENCODER.encode(ix.data))
      })),
      addressTableLookups: response.addressTableLookups
    });
  } else {
    return new Message(response);
  }
}

/**
 * The level of commitment desired when querying state
 * <pre>
 *   'processed': Query the most recent block which has reached 1 confirmation by the connected node
 *   'confirmed': Query the most recent block which has reached 1 confirmation by the cluster
 *   'finalized': Query the most recent block which has been finalized by the cluster
 * </pre>
 */

/**
 * A subset of Commitment levels, which are at least optimistically confirmed
 * <pre>
 *   'confirmed': Query the most recent block which has reached 1 confirmation by the cluster
 *   'finalized': Query the most recent block which has been finalized by the cluster
 * </pre>
 */

/**
 * Filter for largest accounts query
 * <pre>
 *   'circulating':    Return the largest accounts that are part of the circulating supply
 *   'nonCirculating': Return the largest accounts that are not part of the circulating supply
 * </pre>
 */

/**
 * Configuration object for changing `getAccountInfo` query behavior
 */

/**
 * Configuration object for changing `getBalance` query behavior
 */

/**
 * Configuration object for changing `getBlock` query behavior
 */

/**
 * Configuration object for changing `getBlock` query behavior
 */

/**
 * Configuration object for changing `getStakeMinimumDelegation` query behavior
 */

/**
 * Configuration object for changing `getBlockHeight` query behavior
 */

/**
 * Configuration object for changing `getEpochInfo` query behavior
 */

/**
 * Configuration object for changing `getLeaderSchedule` query behavior
 */

/**
 * Configuration object for changing `getInflationReward` query behavior
 */

/**
 * Configuration object for changing `getLatestBlockhash` query behavior
 */

/**
 * Configuration object for changing `getFeeForMessage` query behavior
 */

/**
 * Configuration object for changing `requestAirdrop` query behavior
 */

/**
 * Configuration object for changing `isBlockhashValid` query behavior
 */

/**
 * Configuration object for changing `getSlot` query behavior
 */

/**
 * Configuration object for changing `getSlotLeader` query behavior
 */

/**
 * Configuration object for changing `getTransaction` query behavior
 */

/**
 * Configuration object for changing `getTransaction` query behavior
 */

/**
 * Configuration object for changing `getLargestAccounts` query behavior
 */

/**
 * Configuration object for changing `getSupply` request behavior
 */

/**
 * Configuration object for changing query behavior
 */

/**
 * Information describing a cluster node
 */

/**
 * Information describing a vote account
 */

/**
 * A collection of cluster vote accounts
 */

/**
 * Network Inflation
 * (see https://docs.solana.com/implemented-proposals/ed_overview)
 */

/**
 * The inflation reward for an epoch
 */

/**
 * Expected JSON RPC response for the "getInflationReward" message
 */
const GetInflationRewardResult = jsonRpcResult(superstruct.array(superstruct.nullable(superstruct.type({
  epoch: superstruct.number(),
  effectiveSlot: superstruct.number(),
  amount: superstruct.number(),
  postBalance: superstruct.number(),
  commission: superstruct.optional(superstruct.nullable(superstruct.number()))
}))));

/**
 * Configuration object for changing `getRecentPrioritizationFees` query behavior
 */

/**
 * Information about the current epoch
 */

/**
 * Leader schedule
 * (see https://docs.solana.com/terminology#leader-schedule)
 */

/**
 * Transaction error or null
 */
const TransactionErrorResult = superstruct.nullable(superstruct.union([superstruct.type({}), superstruct.string()]));

/**
 * Signature status for a transaction
 */
const SignatureStatusResult = superstruct.type({
  err: TransactionErrorResult
});

/**
 * Transaction signature received notification
 */
const SignatureReceivedResult = superstruct.literal('receivedSignature');

/**
 * Identity for an RPC node.
 */

const ParsedInstructionStruct = superstruct.type({
  program: superstruct.string(),
  programId: PublicKeyFromString,
  parsed: superstruct.unknown()
});
const PartiallyDecodedInstructionStruct = superstruct.type({
  programId: PublicKeyFromString,
  accounts: superstruct.array(PublicKeyFromString),
  data: superstruct.string()
});
const SimulatedTransactionResponseStruct = jsonRpcResultAndContext(superstruct.type({
  err: superstruct.nullable(superstruct.union([superstruct.type({}), superstruct.string()])),
  logs: superstruct.nullable(superstruct.array(superstruct.string())),
  accounts: superstruct.optional(superstruct.nullable(superstruct.array(superstruct.nullable(superstruct.type({
    executable: superstruct.boolean(),
    owner: superstruct.string(),
    lamports: BigIntFromNumber,
    data: superstruct.array(superstruct.string()),
    rentEpoch: superstruct.optional(BigIntFromNumber)
  }))))),
  unitsConsumed: superstruct.optional(superstruct.number()),
  returnData: superstruct.optional(superstruct.nullable(superstruct.type({
    programId: superstruct.string(),
    data: superstruct.tuple([superstruct.string(), superstruct.literal('base64')])
  }))),
  innerInstructions: superstruct.optional(superstruct.nullable(superstruct.array(superstruct.type({
    index: superstruct.number(),
    instructions: superstruct.array(superstruct.union([ParsedInstructionStruct, PartiallyDecodedInstructionStruct]))
  }))))
}));

/**
 * Metadata for a parsed confirmed transaction on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0. Please use {@link ParsedTransactionMeta} instead.
 */

/**
 * Collection of addresses loaded by a transaction using address table lookups
 */

/**
 * Metadata for a parsed transaction on the ledger
 */

/**
 * Metadata for a confirmed transaction on the ledger
 */

/**
 * A processed transaction from the RPC API
 */

/**
 * A processed transaction from the RPC API
 */

/**
 * A processed transaction message from the RPC API
 */

/**
 * A confirmed transaction on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0.
 */

/**
 * A partially decoded transaction instruction
 */

/**
 * A parsed transaction message account
 */

/**
 * A parsed transaction instruction
 */

/**
 * A parsed address table lookup
 */

/**
 * A parsed transaction message
 */

/**
 * A parsed transaction
 */

/**
 * A parsed and confirmed transaction on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0. Please use {@link ParsedTransactionWithMeta} instead.
 */

/**
 * A parsed transaction on the ledger with meta
 */

/**
 * A processed block fetched from the RPC API
 */

/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `accounts`
 */

/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `none`
 */

/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `signatures`
 */

/**
 * A block with parsed transactions
 */

/**
 * A block with parsed transactions where the `transactionDetails` mode is `accounts`
 */

/**
 * A block with parsed transactions where the `transactionDetails` mode is `none`
 */

/**
 * A block with parsed transactions where the `transactionDetails` mode is `signatures`
 */

/**
 * A processed block fetched from the RPC API
 */

/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `accounts`
 */

/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `none`
 */

/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `signatures`
 */

/**
 * A confirmed block on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0.
 */

/**
 * A Block on the ledger with signatures only
 */

/**
 * Amount of stake committed to a block at each depth.
 */

/**
 * recent block production information
 */

/**
 * A performance sample
 */

const defaultFetch = (input, init) => {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('globalThis.fetch is not available in this environment');
  }
  const processedInput = typeof input === 'string' && input.slice(0, 2) === '//' ? 'https:' + input : input;
  return globalThis.fetch(processedInput, init);
};
function createRpcTransport(url, config = {}) {
  const {
    disableRetryOnRateLimit,
    httpHeaders
  } = config;
  const fetch = defaultFetch;
  let agent;
  return async ({
    payload,
    signal
  }) => {
    const options = {
      method: 'POST',
      body: JSON.stringify(payload),
      agent,
      signal,
      headers: Object.assign({
        'Content-Type': 'application/json'
      }, httpHeaders || {}, COMMON_HTTP_HEADERS)
    };
    let too_many_requests_retries = 5;
    let res;
    let waitTime = 500;
    for (;;) {
      res = await fetch(url, options);
      if (res.status !== 429 /* Too many requests */) {
        break;
      }
      if (disableRetryOnRateLimit === true) {
        break;
      }
      too_many_requests_retries -= 1;
      if (too_many_requests_retries === 0) {
        break;
      }
      console.error(`Server responded with ${res.status} ${res.statusText}.  Retrying after ${waitTime}ms delay...`);
      await sleep(waitTime);
      waitTime *= 2;
    }
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }
    return text ? JSON.parse(text) : null;
  };
}
function createKitRpcClient(url, config) {
  const transport = createRpcTransport(url, config);
  return {
    rpc: createRpc({
      api: createJsonRpcApi(),
      transport
    }),
    typedRpc: createRpc({
      api: createSolanaRpcApi({
        ...DEFAULT_RPC_CONFIG,
        // Legacy Connection omitted commitment when unspecified, which leaves
        // commitment selection to the server-side default (`finalized`).
        defaultCommitment: 'finalized'
      }),
      transport
    }),
    transport
  };
}
function isJsonRpcErrorLike(value) {
  return !!value && typeof value === 'object' && 'code' in value && typeof value.message === 'string';
}
function throwSolanaRpcErrorIfNeeded(error, context) {
  if (isJsonRpcErrorLike(error)) {
    throw new SolanaJSONRPCError(error, context);
  }
  throw error;
}
function createKitRpcRequest(client) {
  return async (methodName, args) => {
    const method = client[methodName];
    assert(typeof method === 'function', `Kit RPC method not found: ${methodName}`);
    const pendingRequest = method(...args);
    assert(!!pendingRequest && typeof pendingRequest.send === 'function', `Kit RPC method did not return a sendable request: ${methodName}`);
    const response = await pendingRequest.send();
    const id = response.id;
    return {
      ...response,
      id: id ?? '1'
    };
  };
}
function createKitRpcBatchRequest(transport) {
  return async requests => {
    if (requests.length === 0) {
      return [];
    }
    const payload = requests.map((request, index) => ({
      id: String(index + 1),
      jsonrpc: '2.0',
      method: request.methodName,
      params: request.args
    }));
    const response = await transport({
      payload
    });
    assert(Array.isArray(response), 'Kit RPC batch transport did not return an array');
    return response;
  };
}

/**
 * Expected JSON RPC response for the "getEpochInfo" message
 */
jsonRpcResult(superstruct.number());

/**
 * Expected JSON RPC response for the "getBlockCommitment" message
 */
jsonRpcResult(superstruct.type({
  commitment: superstruct.nullable(superstruct.array(superstruct.number())),
  totalStake: superstruct.number()
}));

/**
 * Supply
 */

/**
 * Expected JSON RPC response for the "getSupply" message
 */
const GetSupplyRpcResult = jsonRpcResultAndContext(superstruct.type({
  total: superstruct.number(),
  circulating: superstruct.number(),
  nonCirculating: superstruct.number(),
  nonCirculatingAccounts: superstruct.array(PublicKeyFromString)
}));

/**
 * Token amount object which returns a token amount in different formats
 * for various client use cases.
 */

/**
 * Expected JSON RPC structure for token amounts
 */
const TokenAmountResult = superstruct.type({
  amount: superstruct.string(),
  uiAmount: superstruct.nullable(superstruct.number()),
  decimals: superstruct.number(),
  uiAmountString: superstruct.optional(superstruct.string())
});

/**
 * Token address and balance.
 */

/**
 * Expected JSON RPC response for the "getTokenAccountsByOwner" message
 */
const GetTokenAccountsByOwnerBytes = jsonRpcResultAndContext(superstruct.array(superstruct.type({
  pubkey: PublicKeyFromString,
  account: superstruct.type({
    executable: superstruct.boolean(),
    owner: PublicKeyFromString,
    lamports: BigIntFromNumber,
    data: Uint8ArrayFromRawAccountData,
    rentEpoch: BigIntFromNumber
  })
})));
const ParsedAccountDataResult = superstruct.type({
  program: superstruct.string(),
  parsed: superstruct.unknown(),
  space: superstruct.number()
});

/**
 * Expected JSON RPC response for the "getTokenAccountsByOwner" message with parsed data
 */
const GetParsedTokenAccountsByOwner = jsonRpcResultAndContext(superstruct.array(superstruct.type({
  pubkey: PublicKeyFromString,
  account: superstruct.type({
    executable: superstruct.boolean(),
    owner: PublicKeyFromString,
    lamports: BigIntFromNumber,
    data: ParsedAccountDataResult,
    rentEpoch: BigIntFromNumber
  })
})));

/**
 * Pair of an account address and its balance
 */

/**
 * @internal
 */
const AccountInfoBytesResult = superstruct.type({
  executable: superstruct.boolean(),
  owner: PublicKeyFromString,
  lamports: BigIntFromNumber,
  data: Uint8ArrayFromRawAccountData,
  rentEpoch: BigIntFromNumber
});

/**
 * @internal
 */
const KeyedAccountInfoBytesResult = superstruct.type({
  pubkey: PublicKeyFromString,
  account: AccountInfoBytesResult
});
const ParsedOrRawAccountDataBytes = superstruct.coerce(superstruct.union([superstruct.instance(Uint8Array), ParsedAccountDataResult]), superstruct.union([RawAccountDataResult, ParsedAccountDataResult]), value => {
  if (Array.isArray(value)) {
    return superstruct.create(value, Uint8ArrayFromRawAccountData);
  } else {
    return value;
  }
});

/**
 * @internal
 */
const ParsedAccountInfoBytesResult = superstruct.type({
  executable: superstruct.boolean(),
  owner: PublicKeyFromString,
  lamports: BigIntFromNumber,
  data: ParsedOrRawAccountDataBytes,
  rentEpoch: BigIntFromNumber
});
const KeyedParsedAccountInfoBytesResult = superstruct.type({
  pubkey: PublicKeyFromString,
  account: ParsedAccountInfoBytesResult
});

/**
 * Expected JSON RPC response for the "getSignaturesForAddress" message
 */
const GetSignaturesForAddressRpcResult = jsonRpcResult(superstruct.array(superstruct.type({
  signature: superstruct.string(),
  slot: superstruct.number(),
  err: TransactionErrorResult,
  memo: superstruct.nullable(superstruct.string()),
  blockTime: superstruct.optional(superstruct.nullable(superstruct.number()))
})));

/***
 * Expected JSON RPC response for the "accountNotification" message
 */
const AccountNotificationResult = superstruct.type({
  subscription: superstruct.number(),
  result: notificationResultAndContext(AccountInfoBytesResult)
});

/**
 * @internal
 */
const ProgramAccountInfoResult = superstruct.type({
  pubkey: PublicKeyFromString,
  account: AccountInfoBytesResult
});

/***
 * Expected JSON RPC response for the "programNotification" message
 */
const ProgramAccountNotificationResult = superstruct.type({
  subscription: superstruct.number(),
  result: notificationResultAndContext(ProgramAccountInfoResult)
});

/**
 * @internal
 */
const SlotInfoResult = superstruct.type({
  parent: superstruct.number(),
  slot: superstruct.number(),
  root: superstruct.number()
});

/**
 * Expected JSON RPC response for the "slotNotification" message
 */
const SlotNotificationResult = superstruct.type({
  subscription: superstruct.number(),
  result: SlotInfoResult
});

/**
 * Slot updates which can be used for tracking the live progress of a cluster.
 * - `"firstShredReceived"`: connected node received the first shred of a block.
 * Indicates that a new block that is being produced.
 * - `"completed"`: connected node has received all shreds of a block. Indicates
 * a block was recently produced.
 * - `"optimisticConfirmation"`: block was optimistically confirmed by the
 * cluster. It is not guaranteed that an optimistic confirmation notification
 * will be sent for every finalized blocks.
 * - `"root"`: the connected node rooted this block.
 * - `"createdBank"`: the connected node has started validating this block.
 * - `"frozen"`: the connected node has validated this block.
 * - `"dead"`: the connected node failed to validate this block.
 */

/**
 * @internal
 */
const SlotUpdateResult = superstruct.union([superstruct.type({
  type: superstruct.union([superstruct.literal('firstShredReceived'), superstruct.literal('completed'), superstruct.literal('optimisticConfirmation'), superstruct.literal('root')]),
  slot: superstruct.number(),
  timestamp: superstruct.number()
}), superstruct.type({
  type: superstruct.literal('createdBank'),
  parent: superstruct.number(),
  slot: superstruct.number(),
  timestamp: superstruct.number()
}), superstruct.type({
  type: superstruct.literal('frozen'),
  slot: superstruct.number(),
  timestamp: superstruct.number(),
  stats: superstruct.type({
    numTransactionEntries: superstruct.number(),
    numSuccessfulTransactions: superstruct.number(),
    numFailedTransactions: superstruct.number(),
    maxTransactionsPerEntry: superstruct.number()
  })
}), superstruct.type({
  type: superstruct.literal('dead'),
  slot: superstruct.number(),
  timestamp: superstruct.number(),
  err: superstruct.string()
})]);

/**
 * Expected JSON RPC response for the "slotsUpdatesNotification" message
 */
const SlotUpdateNotificationResult = superstruct.type({
  subscription: superstruct.number(),
  result: SlotUpdateResult
});

/**
 * Expected JSON RPC response for the "signatureNotification" message
 */
const SignatureNotificationResult = superstruct.type({
  subscription: superstruct.number(),
  result: notificationResultAndContext(superstruct.union([SignatureStatusResult, SignatureReceivedResult]))
});

/**
 * Expected JSON RPC response for the "rootNotification" message
 */
const RootNotificationResult = superstruct.type({
  subscription: superstruct.number(),
  result: superstruct.number()
});
superstruct.type({
  pubkey: superstruct.string(),
  gossip: superstruct.nullable(superstruct.string()),
  tpu: superstruct.nullable(superstruct.string()),
  rpc: superstruct.nullable(superstruct.string()),
  version: superstruct.nullable(superstruct.string())
});
const VoteAccountInfoResult = superstruct.type({
  votePubkey: superstruct.string(),
  nodePubkey: superstruct.string(),
  activatedStake: superstruct.number(),
  epochVoteAccount: superstruct.boolean(),
  epochCredits: superstruct.array(superstruct.tuple([superstruct.number(), superstruct.number(), superstruct.number()])),
  commission: superstruct.number(),
  lastVote: superstruct.number(),
  rootSlot: superstruct.nullable(superstruct.number())
});

/**
 * Expected JSON RPC response for the "getVoteAccounts" message
 */
const GetVoteAccounts = jsonRpcResult(superstruct.type({
  current: superstruct.array(VoteAccountInfoResult),
  delinquent: superstruct.array(VoteAccountInfoResult)
}));
const ConfirmationStatus = superstruct.union([superstruct.literal('processed'), superstruct.literal('confirmed'), superstruct.literal('finalized')]);
const SignatureStatusResponse = superstruct.type({
  slot: superstruct.number(),
  confirmations: superstruct.nullable(superstruct.number()),
  err: TransactionErrorResult,
  confirmationStatus: superstruct.optional(ConfirmationStatus)
});

/**
 * Expected JSON RPC response for the "getSignatureStatuses" message
 */
const GetSignatureStatusesRpcResult = jsonRpcResultAndContext(superstruct.array(superstruct.nullable(SignatureStatusResponse)));

/**
 * Expected JSON RPC response for the "getMinimumBalanceForRentExemption" message
 */
const GetMinimumBalanceForRentExemptionRpcResult = jsonRpcResult(superstruct.number());
const AddressTableLookupStruct = superstruct.type({
  accountKey: PublicKeyFromString,
  writableIndexes: superstruct.array(superstruct.number()),
  readonlyIndexes: superstruct.array(superstruct.number())
});
const ConfirmedTransactionResult = superstruct.type({
  signatures: superstruct.array(superstruct.string()),
  message: superstruct.type({
    accountKeys: superstruct.array(superstruct.string()),
    header: superstruct.type({
      numRequiredSignatures: superstruct.number(),
      numReadonlySignedAccounts: superstruct.number(),
      numReadonlyUnsignedAccounts: superstruct.number()
    }),
    instructions: superstruct.array(superstruct.type({
      accounts: superstruct.array(superstruct.number()),
      data: superstruct.string(),
      programIdIndex: superstruct.number()
    })),
    recentBlockhash: superstruct.string(),
    addressTableLookups: superstruct.optional(superstruct.array(AddressTableLookupStruct))
  })
});
const AnnotatedAccountKey = superstruct.type({
  pubkey: PublicKeyFromString,
  signer: superstruct.boolean(),
  writable: superstruct.boolean(),
  source: superstruct.optional(superstruct.union([superstruct.literal('transaction'), superstruct.literal('lookupTable')]))
});
const ConfirmedTransactionAccountsModeResult = superstruct.type({
  accountKeys: superstruct.array(AnnotatedAccountKey),
  signatures: superstruct.array(superstruct.string())
});
const ParsedInstructionResult = superstruct.type({
  parsed: superstruct.unknown(),
  program: superstruct.string(),
  programId: PublicKeyFromString
});
const RawInstructionResult = superstruct.type({
  accounts: superstruct.array(PublicKeyFromString),
  data: superstruct.string(),
  programId: PublicKeyFromString
});
const InstructionResult = superstruct.union([RawInstructionResult, ParsedInstructionResult]);
const UnknownInstructionResult = superstruct.union([superstruct.type({
  parsed: superstruct.unknown(),
  program: superstruct.string(),
  programId: superstruct.string()
}), superstruct.type({
  accounts: superstruct.array(superstruct.string()),
  data: superstruct.string(),
  programId: superstruct.string()
})]);
const ParsedOrRawInstruction = superstruct.coerce(InstructionResult, UnknownInstructionResult, value => {
  if ('accounts' in value) {
    return superstruct.create(value, RawInstructionResult);
  } else {
    return superstruct.create(value, ParsedInstructionResult);
  }
});

/**
 * @internal
 */
const ParsedConfirmedTransactionResult = superstruct.type({
  signatures: superstruct.array(superstruct.string()),
  message: superstruct.type({
    accountKeys: superstruct.array(AnnotatedAccountKey),
    instructions: superstruct.array(ParsedOrRawInstruction),
    recentBlockhash: superstruct.string(),
    addressTableLookups: superstruct.optional(superstruct.nullable(superstruct.array(AddressTableLookupStruct)))
  })
});
const TokenBalanceResult = superstruct.type({
  accountIndex: superstruct.number(),
  mint: superstruct.string(),
  owner: superstruct.optional(superstruct.string()),
  programId: superstruct.optional(superstruct.string()),
  uiTokenAmount: TokenAmountResult
});
const LoadedAddressesResult = superstruct.type({
  writable: superstruct.array(PublicKeyFromString),
  readonly: superstruct.array(PublicKeyFromString)
});

/**
 * @internal
 */
const ConfirmedTransactionMetaResult = superstruct.type({
  err: TransactionErrorResult,
  fee: superstruct.number(),
  innerInstructions: superstruct.optional(superstruct.nullable(superstruct.array(superstruct.type({
    index: superstruct.number(),
    instructions: superstruct.array(superstruct.type({
      accounts: superstruct.array(superstruct.number()),
      data: superstruct.string(),
      programIdIndex: superstruct.number()
    }))
  })))),
  preBalances: superstruct.array(superstruct.number()),
  postBalances: superstruct.array(superstruct.number()),
  logMessages: superstruct.optional(superstruct.nullable(superstruct.array(superstruct.string()))),
  preTokenBalances: superstruct.optional(superstruct.nullable(superstruct.array(TokenBalanceResult))),
  postTokenBalances: superstruct.optional(superstruct.nullable(superstruct.array(TokenBalanceResult))),
  loadedAddresses: superstruct.optional(LoadedAddressesResult),
  computeUnitsConsumed: superstruct.optional(superstruct.number()),
  costUnits: superstruct.optional(superstruct.number())
});

/**
 * @internal
 */
const ParsedConfirmedTransactionMetaResult = superstruct.type({
  err: TransactionErrorResult,
  fee: superstruct.number(),
  innerInstructions: superstruct.optional(superstruct.nullable(superstruct.array(superstruct.type({
    index: superstruct.number(),
    instructions: superstruct.array(ParsedOrRawInstruction)
  })))),
  preBalances: superstruct.array(superstruct.number()),
  postBalances: superstruct.array(superstruct.number()),
  logMessages: superstruct.optional(superstruct.nullable(superstruct.array(superstruct.string()))),
  preTokenBalances: superstruct.optional(superstruct.nullable(superstruct.array(TokenBalanceResult))),
  postTokenBalances: superstruct.optional(superstruct.nullable(superstruct.array(TokenBalanceResult))),
  loadedAddresses: superstruct.optional(LoadedAddressesResult),
  computeUnitsConsumed: superstruct.optional(superstruct.number()),
  costUnits: superstruct.optional(superstruct.number())
});
const TransactionVersionStruct = superstruct.union([superstruct.literal(0), superstruct.literal('legacy')]);

/** @internal */
const RewardsResult = superstruct.type({
  pubkey: superstruct.string(),
  lamports: superstruct.number(),
  postBalance: superstruct.nullable(superstruct.number()),
  rewardType: superstruct.nullable(superstruct.string()),
  commission: superstruct.optional(superstruct.nullable(superstruct.number()))
});

/**
 * Expected JSON RPC response for the "getBlock" message
 */
const GetBlockRpcResult = jsonRpcResult(superstruct.nullable(superstruct.type({
  blockhash: superstruct.string(),
  previousBlockhash: superstruct.string(),
  parentSlot: superstruct.number(),
  transactions: superstruct.array(superstruct.type({
    transaction: ConfirmedTransactionResult,
    meta: superstruct.nullable(ConfirmedTransactionMetaResult),
    version: superstruct.optional(TransactionVersionStruct)
  })),
  rewards: superstruct.optional(superstruct.array(RewardsResult)),
  blockTime: superstruct.nullable(superstruct.number()),
  blockHeight: superstruct.nullable(superstruct.number())
})));

/**
 * Expected JSON RPC response for the "getBlock" message when `transactionDetails` is `none`
 */
const GetNoneModeBlockRpcResult = jsonRpcResult(superstruct.nullable(superstruct.type({
  blockhash: superstruct.string(),
  previousBlockhash: superstruct.string(),
  parentSlot: superstruct.number(),
  rewards: superstruct.optional(superstruct.array(RewardsResult)),
  blockTime: superstruct.nullable(superstruct.number()),
  blockHeight: superstruct.nullable(superstruct.number())
})));

/**
 * Expected JSON RPC response for the "getBlock" message when `transactionDetails` is `accounts`
 */
const GetAccountsModeBlockRpcResult = jsonRpcResult(superstruct.nullable(superstruct.type({
  blockhash: superstruct.string(),
  previousBlockhash: superstruct.string(),
  parentSlot: superstruct.number(),
  transactions: superstruct.array(superstruct.type({
    transaction: ConfirmedTransactionAccountsModeResult,
    meta: superstruct.nullable(ConfirmedTransactionMetaResult),
    version: superstruct.optional(TransactionVersionStruct)
  })),
  rewards: superstruct.optional(superstruct.array(RewardsResult)),
  blockTime: superstruct.nullable(superstruct.number()),
  blockHeight: superstruct.nullable(superstruct.number())
})));

/**
 * Expected JSON RPC response for the "getBlock" message when `transactionDetails` is `signatures`
 */
const GetSignaturesModeBlockRpcResult = jsonRpcResult(superstruct.nullable(superstruct.type({
  blockhash: superstruct.string(),
  previousBlockhash: superstruct.string(),
  parentSlot: superstruct.number(),
  signatures: superstruct.array(superstruct.string()),
  rewards: superstruct.optional(superstruct.array(RewardsResult)),
  blockTime: superstruct.nullable(superstruct.number()),
  blockHeight: superstruct.nullable(superstruct.number())
})));

/**
 * Expected parsed JSON RPC response for the "getBlock" message
 */
const GetParsedBlockRpcResult = jsonRpcResult(superstruct.nullable(superstruct.type({
  blockhash: superstruct.string(),
  previousBlockhash: superstruct.string(),
  parentSlot: superstruct.number(),
  transactions: superstruct.array(superstruct.type({
    transaction: ParsedConfirmedTransactionResult,
    meta: superstruct.nullable(ParsedConfirmedTransactionMetaResult),
    version: superstruct.optional(TransactionVersionStruct)
  })),
  rewards: superstruct.optional(superstruct.array(RewardsResult)),
  blockTime: superstruct.nullable(superstruct.number()),
  blockHeight: superstruct.nullable(superstruct.number())
})));

/**
 * Expected parsed JSON RPC response for the "getBlock" message  when `transactionDetails` is `accounts`
 */
const GetParsedAccountsModeBlockRpcResult = jsonRpcResult(superstruct.nullable(superstruct.type({
  blockhash: superstruct.string(),
  previousBlockhash: superstruct.string(),
  parentSlot: superstruct.number(),
  transactions: superstruct.array(superstruct.type({
    transaction: ConfirmedTransactionAccountsModeResult,
    meta: superstruct.nullable(ParsedConfirmedTransactionMetaResult),
    version: superstruct.optional(TransactionVersionStruct)
  })),
  rewards: superstruct.optional(superstruct.array(RewardsResult)),
  blockTime: superstruct.nullable(superstruct.number()),
  blockHeight: superstruct.nullable(superstruct.number())
})));

/**
 * Expected parsed JSON RPC response for the "getBlock" message  when `transactionDetails` is `none`
 */
const GetParsedNoneModeBlockRpcResult = jsonRpcResult(superstruct.nullable(superstruct.type({
  blockhash: superstruct.string(),
  previousBlockhash: superstruct.string(),
  parentSlot: superstruct.number(),
  rewards: superstruct.optional(superstruct.array(RewardsResult)),
  blockTime: superstruct.nullable(superstruct.number()),
  blockHeight: superstruct.nullable(superstruct.number())
})));

/**
 * Expected parsed JSON RPC response for the "getBlock" message when `transactionDetails` is `signatures`
 */
const GetParsedSignaturesModeBlockRpcResult = jsonRpcResult(superstruct.nullable(superstruct.type({
  blockhash: superstruct.string(),
  previousBlockhash: superstruct.string(),
  parentSlot: superstruct.number(),
  signatures: superstruct.array(superstruct.string()),
  rewards: superstruct.optional(superstruct.array(RewardsResult)),
  blockTime: superstruct.nullable(superstruct.number()),
  blockHeight: superstruct.nullable(superstruct.number())
})));

/**
 * Expected JSON RPC response for the "getConfirmedBlock" message
 *
 * @deprecated Deprecated since RPC v1.8.0. Please use {@link GetBlockRpcResult} instead.
 */
const GetConfirmedBlockRpcResult = jsonRpcResult(superstruct.nullable(superstruct.type({
  blockhash: superstruct.string(),
  previousBlockhash: superstruct.string(),
  parentSlot: superstruct.number(),
  transactions: superstruct.array(superstruct.type({
    transaction: ConfirmedTransactionResult,
    meta: superstruct.nullable(ConfirmedTransactionMetaResult)
  })),
  rewards: superstruct.optional(superstruct.array(RewardsResult)),
  blockTime: superstruct.nullable(superstruct.number())
})));

/**
 * Expected JSON RPC response for the "getBlock" message
 */
const GetBlockSignaturesRpcResult = jsonRpcResult(superstruct.nullable(superstruct.type({
  blockhash: superstruct.string(),
  previousBlockhash: superstruct.string(),
  parentSlot: superstruct.number(),
  signatures: superstruct.array(superstruct.string()),
  blockTime: superstruct.nullable(superstruct.number()),
  blockHeight: superstruct.nullable(superstruct.number())
})));

/**
 * Expected JSON RPC response for the "getTransaction" message
 */
const GetTransactionRpcResult = jsonRpcResult(superstruct.nullable(superstruct.type({
  slot: superstruct.number(),
  meta: superstruct.nullable(ConfirmedTransactionMetaResult),
  blockTime: superstruct.optional(superstruct.nullable(superstruct.number())),
  transaction: ConfirmedTransactionResult,
  version: superstruct.optional(TransactionVersionStruct)
})));

/**
 * Expected parsed JSON RPC response for the "getTransaction" message
 */
const GetParsedTransactionRpcResult = jsonRpcResult(superstruct.nullable(superstruct.type({
  slot: superstruct.number(),
  transaction: ParsedConfirmedTransactionResult,
  meta: superstruct.nullable(ParsedConfirmedTransactionMetaResult),
  blockTime: superstruct.optional(superstruct.nullable(superstruct.number())),
  version: superstruct.optional(TransactionVersionStruct)
})));

/**
 * Expected JSON RPC response for the "getLatestBlockhash" message
 */
const GetLatestBlockhashRpcResult = jsonRpcResultAndContext(superstruct.type({
  blockhash: superstruct.string(),
  lastValidBlockHeight: superstruct.number()
}));

/**
 * Expected JSON RPC response for the "isBlockhashValid" message
 */
jsonRpcResultAndContext(superstruct.boolean());

/**
 * Expected JSON RPC response for the "requestAirdrop" message
 */
jsonRpcResult(superstruct.string());

/**
 * Expected JSON RPC response for the "sendTransaction" message
 */
const SendTransactionRpcResult = jsonRpcResult(superstruct.string());

/**
 * Information about the latest slot being processed by a node
 */

/**
 * Parsed account data
 */

/**
 * Data slice argument for getProgramAccounts
 */

/**
 * Memory comparison filter for getProgramAccounts
 */

/**
 * Data size comparison filter for getProgramAccounts
 */

/**
 * A filter object for getProgramAccounts
 */

/**
 * Configuration object for getProgramAccounts requests
 */

/**
 * Configuration object for getParsedProgramAccounts
 */

/**
 * Configuration object for getMultipleAccounts
 */

/**
 * Configuration object for `getTokenAccountsByOwner`
 */

/**
 * Configuration object for `getTokenAccountsByDelegate`
 */

/**
 * Configuration object for `getTransactionCount`
 */

/**
 * Configuration object for `getBlocks` and `getBlocksWithLimit`
 */

/**
 * Configuration object for `getTokenSupply`
 */

/**
 * Configuration object for `getTokenAccountBalance`
 */

/**
 * Configuration object for `getTokenLargestAccounts`
 */

/**
 * Configuration object for `getInflationGovernor`
 */

/**
 * Configuration object for `getVoteAccounts`
 */

/**
 * Configuration object for `getMinimumBalanceForRentExemption`
 */

/**
 * Configuration object for `getNonce`
 */

/**
 * Configuration object for `getNonceAndContext`
 */

/**
 * Information describing an account
 */

/**
 * Account information identified by pubkey
 */

/**
 * Callback function for account change notifications
 */

/**
 * Callback function for program account change notifications
 */

/**
 * Callback function for slot change notifications
 */

/**
 * Callback function for slot update notifications
 */

/**
 * Callback function for signature status notifications
 */

/**
 * Signature status notification with transaction result
 */

/**
 * Signature received notification
 */

/**
 * Callback function for signature notifications
 */

/**
 * Signature subscription options
 */

/**
 * Callback function for root change notifications
 */

/**
 * @internal
 */
const LogsResult = superstruct.type({
  err: TransactionErrorResult,
  logs: superstruct.array(superstruct.string()),
  signature: superstruct.string()
});

/**
 * Logs result.
 */

/**
 * Expected JSON RPC response for the "logsNotification" message.
 */
const LogsNotificationResult = superstruct.type({
  result: notificationResultAndContext(LogsResult),
  subscription: superstruct.number()
});

/**
 * Filter for log subscriptions.
 */

/**
 * Callback function for log notifications.
 */

/**
 * Signature result
 */

/**
 * Transaction error
 */

/**
 * Transaction confirmation status
 * <pre>
 *   'processed': Transaction landed in a block which has reached 1 confirmation by the connected node
 *   'confirmed': Transaction landed in a block which has reached 1 confirmation by the cluster
 *   'finalized': Transaction landed in a block which has been finalized by the cluster
 * </pre>
 */

/**
 * Signature status
 */

/**
 * A confirmed signature with its status
 */

/**
 * An object defining headers to be passed to the RPC server
 */

/**
 * Configuration for instantiating a Connection
 */

/**
 * Configuration used to construct an HTTP JSON-RPC transport.
 */

/** @internal */
const COMMON_HTTP_HEADERS = {
  'solana-client': `js/${"2.0.0"}`
};

/**
 * A connection to a fullnode JSON RPC endpoint
 */
class Connection {
  /**
   * Establish a JSON RPC connection
   *
   * @param endpoint URL to the fullnode JSON RPC endpoint
   * @param commitmentOrConfig optional default commitment level or optional ConnectionConfig configuration object
   */
  constructor(endpoint, _commitmentOrConfig) {
    /** @internal */
    this._commitment = void 0;
    /** @internal */
    this._confirmTransactionInitialTimeout = void 0;
    /** @internal */
    this._rpc = void 0;
    /** @internal */
    this._rpcEndpoint = void 0;
    /** @internal */
    this._rpcHttpHeaders = void 0;
    /** @internal */
    this._rpcWsEndpoint = void 0;
    /** @internal */
    this._rpcTransport = void 0;
    /** @internal */
    this._typedRpc = void 0;
    /** @internal */
    this._rpcRequest = void 0;
    /** @internal */
    this._rpcBatchRequest = void 0;
    /** @internal */
    this._rpcWebSocket = void 0;
    /** @internal */
    this._rpcWebSocketConnected = false;
    /** @internal */
    this._rpcWebSocketHeartbeat = null;
    /** @internal */
    this._rpcWebSocketIdleTimeout = null;
    /** @internal
     * A number that we increment every time an active connection closes.
     * Used to determine whether the same socket connection that was open
     * when an async operation started is the same one that's active when
     * its continuation fires.
     *
     */
    this._rpcWebSocketGeneration = 0;
    /** @internal */
    this._disableBlockhashCaching = false;
    /** @internal */
    this._pollingBlockhash = false;
    /** @internal */
    this._blockhashInfo = {
      latestBlockhash: null,
      lastFetch: 0,
      transactionSignatures: [],
      simulatedSignatures: []
    };
    /** @internal */
    this._nextClientSubscriptionId = 0;
    /** @internal */
    this._subscriptionDisposeFunctionsByClientSubscriptionId = {};
    /** @internal */
    this._subscriptionHashByClientSubscriptionId = {};
    /** @internal */
    this._subscriptionStateChangeCallbacksByHash = {};
    /** @internal */
    this._subscriptionCallbacksByServerSubscriptionId = {};
    /** @internal */
    this._subscriptionsByHash = {};
    /**
     * Special case.
     * After a signature is processed, RPCs automatically dispose of the
     * subscription on the server side. We need to track which of these
     * subscriptions have been disposed in such a way, so that we know
     * whether the client is dealing with a not-yet-processed signature
     * (in which case we must tear down the server subscription) or an
     * already-processed signature (in which case the client can simply
     * clear out the subscription locally without telling the server).
     *
     * NOTE: There is a proposal to eliminate this special case, here:
     * https://github.com/solana-labs/solana/issues/18892
     */
    /** @internal */
    this._subscriptionsAutoDisposedByRpc = new Set();
    /*
     * Returns the current block height of the node
     */
    this.getBlockHeight = (() => {
      const requestPromises = {};
      return async commitmentOrConfig => {
        const {
          commitment,
          config
        } = extractCommitmentFromConfig(commitmentOrConfig);
        const args = this._buildArgs([], commitment, undefined /* encoding */, config);
        const requestHash = fastStableStringify(args);
        requestPromises[requestHash] = requestPromises[requestHash] ?? (async () => {
          try {
            const unsafeRes = await this._rpcRequest('getBlockHeight', args);
            const res = superstruct.create(unsafeRes, jsonRpcResult(superstruct.number()));
            if ('error' in res) {
              throw new SolanaJSONRPCError(res.error, 'failed to get block height information');
            }
            return res.result;
          } finally {
            delete requestPromises[requestHash];
          }
        })();
        return await requestPromises[requestHash];
      };
    })();
    let wsEndpoint;
    let httpHeaders;
    let disableRetryOnRateLimit;
    if (_commitmentOrConfig && typeof _commitmentOrConfig === 'string') {
      this._commitment = _commitmentOrConfig;
    } else if (_commitmentOrConfig) {
      this._commitment = _commitmentOrConfig.commitment;
      this._confirmTransactionInitialTimeout = _commitmentOrConfig.confirmTransactionInitialTimeout;
      wsEndpoint = _commitmentOrConfig.wsEndpoint;
      httpHeaders = _commitmentOrConfig.httpHeaders;
      disableRetryOnRateLimit = _commitmentOrConfig.disableRetryOnRateLimit;
    }
    this._rpcEndpoint = assertEndpointUrl(endpoint);
    this._rpcHttpHeaders = httpHeaders;
    this._rpcWsEndpoint = wsEndpoint || makeWebsocketUrl(endpoint);
    const rpcTransportConfig = Object.freeze({
      disableRetryOnRateLimit,
      httpHeaders
    });
    const {
      rpc,
      typedRpc,
      transport
    } = createKitRpcClient(endpoint, rpcTransportConfig);
    this._rpc = rpc;
    this._rpcTransport = transport;
    this._typedRpc = typedRpc;
    this._rpcRequest = createKitRpcRequest(rpc);
    this._rpcBatchRequest = createKitRpcBatchRequest(transport);
    this._rpcWebSocket = new RpcWebSocketClient(this._rpcWsEndpoint, {
      autoconnect: false,
      max_reconnects: Infinity
    });
    this._rpcWebSocket.on('open', this._wsOnOpen.bind(this));
    this._rpcWebSocket.on('error', this._wsOnError.bind(this));
    this._rpcWebSocket.on('close', this._wsOnClose.bind(this));
    this._rpcWebSocket.on('accountNotification', this._wsOnAccountNotification.bind(this));
    this._rpcWebSocket.on('programNotification', this._wsOnProgramAccountNotification.bind(this));
    this._rpcWebSocket.on('slotNotification', this._wsOnSlotNotification.bind(this));
    this._rpcWebSocket.on('slotsUpdatesNotification', this._wsOnSlotUpdatesNotification.bind(this));
    this._rpcWebSocket.on('signatureNotification', this._wsOnSignatureNotification.bind(this));
    this._rpcWebSocket.on('rootNotification', this._wsOnRootNotification.bind(this));
    this._rpcWebSocket.on('logsNotification', this._wsOnLogsNotification.bind(this));
  }

  /**
   * The default commitment used for requests
   */
  get commitment() {
    return this._commitment;
  }

  /**
   * The RPC endpoint
   */
  get rpcEndpoint() {
    return this._rpcEndpoint;
  }

  /**
   * The HTTP headers used by this connection for JSON-RPC requests.
   */
  get rpcHttpHeaders() {
    return this._rpcHttpHeaders;
  }

  /**
   * Fetch the balance for the specified public key, return with context
   */
  async getBalanceAndContext(publicKey, commitmentOrConfig) {
    /** @internal */
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const args = this._buildArgs([publicKey.toBase58()], commitment, undefined /* encoding */, config);
    const unsafeRes = await this._rpcRequest('getBalance', args);
    const res = superstruct.create(unsafeRes, jsonRpcResultAndContext(superstruct.number()));
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, `failed to get balance for ${publicKey.toBase58()}`);
    }
    return res.result;
  }

  /**
   * Fetch the balance for the specified public key
   */
  async getBalance(publicKey, commitmentOrConfig) {
    return await this.getBalanceAndContext(publicKey, commitmentOrConfig).then(x => x.value).catch(e => {
      throw new Error('failed to get balance of account ' + publicKey.toBase58() + ': ' + e);
    });
  }

  /**
   * Fetch the estimated production time of a block
   */
  async getBlockTime(slot) {
    try {
      return await this._typedRpc.getBlockTime(coerceNumericToBigInt(slot, 'slot')).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, `failed to get block time for slot ${slot}`);
    }
  }

  /**
   * Fetch the lowest slot that the node has information about in its ledger.
   * This value may increase over time if the node is configured to purge older ledger data
   */
  async getMinimumLedgerSlot() {
    try {
      return await this._typedRpc.minimumLedgerSlot().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get minimum ledger slot');
    }
  }

  /**
   * Fetch the slot of the lowest confirmed block that has not been purged from the ledger
   */
  async getFirstAvailableBlock() {
    try {
      return await this._typedRpc.getFirstAvailableBlock().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get first available block');
    }
  }

  /**
   * Fetch information about the current supply
   */
  async getSupply(config) {
    let configArg = {};
    if (typeof config === 'string') {
      configArg = {
        commitment: config
      };
    } else if (config) {
      configArg = {
        ...config,
        commitment: config && config.commitment || this.commitment
      };
    } else {
      configArg = {
        commitment: this.commitment
      };
    }
    const unsafeRes = await this._rpcRequest('getSupply', [configArg]);
    const res = superstruct.create(unsafeRes, GetSupplyRpcResult);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get supply');
    }
    return res.result;
  }

  /**
   * Fetch the current supply of a token mint
   */
  async getTokenSupply(tokenMintAddress, commitmentOrConfig) {
    const {
      commitment
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const typedMintAddress = toKitAddress(tokenMintAddress);
    const rpcCommitment = commitment ?? this._commitment;
    try {
      return await (rpcCommitment == null ? this._typedRpc.getTokenSupply(typedMintAddress) : this._typedRpc.getTokenSupply(typedMintAddress, {
        commitment: rpcCommitment
      })).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get token supply');
    }
  }

  /**
   * Fetch the current balance of a token account
   */
  async getTokenAccountBalance(tokenAddress, commitmentOrConfig) {
    const {
      commitment
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const typedTokenAddress = toKitAddress(tokenAddress);
    const rpcCommitment = commitment ?? this._commitment;
    try {
      return await (rpcCommitment == null ? this._typedRpc.getTokenAccountBalance(typedTokenAddress) : this._typedRpc.getTokenAccountBalance(typedTokenAddress, {
        commitment: rpcCommitment
      })).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get token account balance');
    }
  }

  /**
   * Fetch all the token accounts owned by the specified account
   *
   * @return {Promise<RpcResponseAndContext<GetProgramAccountsResponse>}
   */
  async getTokenAccountsByOwner(ownerAddress, filter, commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    let _args = [ownerAddress.toBase58()];
    if ('mint' in filter) {
      _args.push({
        mint: filter.mint.toBase58()
      });
    } else {
      _args.push({
        programId: filter.programId.toBase58()
      });
    }
    const args = this._buildArgs(_args, commitment, 'base64', config);
    const unsafeRes = await this._rpcRequest('getTokenAccountsByOwner', args);
    const res = superstruct.create(unsafeRes, GetTokenAccountsByOwnerBytes);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, `failed to get token accounts owned by account ${ownerAddress.toBase58()}`);
    }
    return res.result;
  }

  /**
   * Fetch all the token accounts delegated to the specified account
   *
   * @return {Promise<RpcResponseAndContext<GetProgramAccountsResponse>}
   */
  async getTokenAccountsByDelegate(delegateAddress, filter, commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    let _args = [delegateAddress.toBase58()];
    if ('mint' in filter) {
      _args.push({
        mint: filter.mint.toBase58()
      });
    } else {
      _args.push({
        programId: filter.programId.toBase58()
      });
    }
    const args = this._buildArgs(_args, commitment, 'base64', config);
    const unsafeRes = await this._rpcRequest('getTokenAccountsByDelegate', args);
    const res = superstruct.create(unsafeRes, GetTokenAccountsByOwnerBytes);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, `failed to get token accounts delegated to account ${delegateAddress.toBase58()}`);
    }
    return res.result;
  }

  /**
   * Fetch parsed token accounts owned by the specified account
   *
   * @return {Promise<RpcResponseAndContext<Array<{pubkey: Address, account: AccountInfo<ParsedAccountData>}>>>}
   */
  async getParsedTokenAccountsByOwner(ownerAddress, filter, commitment) {
    let _args = [ownerAddress.toBase58()];
    if ('mint' in filter) {
      _args.push({
        mint: filter.mint.toBase58()
      });
    } else {
      _args.push({
        programId: filter.programId.toBase58()
      });
    }
    const args = this._buildArgs(_args, commitment, 'jsonParsed');
    const unsafeRes = await this._rpcRequest('getTokenAccountsByOwner', args);
    const res = superstruct.create(unsafeRes, GetParsedTokenAccountsByOwner);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, `failed to get token accounts owned by account ${ownerAddress.toBase58()}`);
    }
    return res.result;
  }

  /**
   * Fetch the 20 largest accounts with their current balances
   */
  async getLargestAccounts(config) {
    const rpcCommitment = config?.commitment ?? this._commitment;
    const rpcConfig = {
      ...(config?.filter != null ? {
        filter: config.filter
      } : null),
      ...(rpcCommitment != null ? {
        commitment: rpcCommitment
      } : null)
    };
    try {
      const result = await (config?.filter != null || rpcCommitment != null ? this._typedRpc.getLargestAccounts(rpcConfig) : this._typedRpc.getLargestAccounts()).send();
      return {
        ...result,
        context: result.context,
        value: result.value.map(account => ({
          ...account,
          address: new Address(account.address)
        }))
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get largest accounts');
    }
  }

  /**
   * Fetch the 20 largest token accounts with their current balances
   * for a given mint.
   */
  async getTokenLargestAccounts(mintAddress, commitmentOrConfig) {
    const {
      commitment
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const typedMintAddress = toKitAddress(mintAddress);
    const rpcCommitment = commitment ?? this._commitment;
    try {
      const result = await (rpcCommitment == null ? this._typedRpc.getTokenLargestAccounts(typedMintAddress) : this._typedRpc.getTokenLargestAccounts(typedMintAddress, {
        commitment: rpcCommitment
      })).send();
      return {
        ...result,
        context: result.context,
        value: result.value.map(account => ({
          ...account,
          address: new Address(account.address)
        }))
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get token largest accounts');
    }
  }

  /**
   * Fetch all the account info for the specified public key, return with context
   */
  async getAccountInfoAndContext(publicKey, commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const args = this._buildArgs([publicKey.toBase58()], commitment, 'base64', config);
    const unsafeRes = await this._rpcRequest('getAccountInfo', args);
    const res = superstruct.create(unsafeRes, jsonRpcResultAndContext(superstruct.nullable(AccountInfoBytesResult)));
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, `failed to get info about account ${publicKey.toBase58()}`);
    }
    return {
      ...res.result,
      value: res.result.value
    };
  }

  /**
   * Fetch parsed account info for the specified public key
   */
  async getParsedAccountInfo(publicKey, commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const args = this._buildArgs([publicKey.toBase58()], commitment, 'jsonParsed', config);
    const unsafeRes = await this._rpcRequest('getAccountInfo', args);
    const res = superstruct.create(unsafeRes, jsonRpcResultAndContext(superstruct.nullable(ParsedAccountInfoBytesResult)));
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, `failed to get info about account ${publicKey.toBase58()}`);
    }
    return {
      ...res.result,
      value: res.result.value
    };
  }

  /**
   * Fetch all the account info for the specified public key
   */
  async getAccountInfo(publicKey, commitmentOrConfig) {
    try {
      const {
        commitment,
        config
      } = extractCommitmentFromConfig(commitmentOrConfig);
      const typedPublicKey = toKitAddress(publicKey);
      const rpcCommitment = commitment ?? this._commitment;
      const minContextSlot = config?.minContextSlot;
      const response = await this._typedRpc.getAccountInfo(typedPublicKey, {
        commitment: rpcCommitment,
        dataSlice: config?.dataSlice,
        encoding: 'base64',
        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
      }).send();
      if (response.value == null) {
        return null;
      }
      const rentEpoch = response.value.rentEpoch;
      const accountInfo = {
        data: superstruct.create(response.value.data, Uint8ArrayFromRawAccountData),
        executable: response.value.executable,
        lamports: response.value.lamports,
        owner: new Address(response.value.owner),
        rentEpoch
      };
      return accountInfo;
    } catch (e) {
      throw new Error('failed to get info about account ' + publicKey.toBase58() + ': ' + e);
    }
  }

  /**
   * Fetch all the account info for multiple accounts specified by an array of public keys, return with context
   */
  async getMultipleParsedAccounts(publicKeys, rawConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(rawConfig);
    const keys = publicKeys.map(key => key.toBase58());
    const args = this._buildArgs([keys], commitment, 'jsonParsed', config);
    const unsafeRes = await this._rpcRequest('getMultipleAccounts', args);
    const res = superstruct.create(unsafeRes, jsonRpcResultAndContext(superstruct.array(superstruct.nullable(ParsedAccountInfoBytesResult))));
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, `failed to get info for accounts ${keys}`);
    }
    return {
      ...res.result,
      value: res.result.value
    };
  }

  /**
   * Fetch all the account info for multiple accounts specified by an array of public keys, return with context
   */
  async getMultipleAccountsInfoAndContext(publicKeys, commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const keys = publicKeys.map(key => key.toBase58());
    const args = this._buildArgs([keys], commitment, 'base64', config);
    const unsafeRes = await this._rpcRequest('getMultipleAccounts', args);
    const res = superstruct.create(unsafeRes, jsonRpcResultAndContext(superstruct.array(superstruct.nullable(AccountInfoBytesResult))));
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, `failed to get info for accounts ${keys}`);
    }
    return {
      ...res.result,
      value: res.result.value
    };
  }

  /**
   * Fetch all the account info for multiple accounts specified by an array of public keys
   */
  async getMultipleAccountsInfo(publicKeys, commitmentOrConfig) {
    const res = await this.getMultipleAccountsInfoAndContext(publicKeys, commitmentOrConfig);
    return res.value;
  }

  /**
   * Fetch all the accounts owned by the specified program id
   *
  * @return {Promise<Array<{pubkey: Address, account: AccountInfo<Uint8Array>}>>}
   */

  // eslint-disable-next-line no-dupe-class-members

  // eslint-disable-next-line no-dupe-class-members
  async getProgramAccounts(programId, configOrCommitment) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(configOrCommitment);
    const {
      encoding,
      ...configWithoutEncoding
    } = config || {};
    const args = this._buildArgs([programId.toBase58()], commitment, encoding || 'base64', {
      ...configWithoutEncoding,
      ...(configWithoutEncoding.filters ? {
        filters: applyDefaultMemcmpEncodingToFilters(configWithoutEncoding.filters)
      } : null)
    });
    const unsafeRes = await this._rpcRequest('getProgramAccounts', args);
    const baseSchema = superstruct.array(KeyedAccountInfoBytesResult);
    if (configWithoutEncoding.withContext === true) {
      const res = superstruct.create(unsafeRes, jsonRpcResultAndContext(baseSchema));
      if ('error' in res) {
        throw new SolanaJSONRPCError(res.error, `failed to get accounts owned by program ${programId.toBase58()}`);
      }
      return res.result;
    }
    const res = superstruct.create(unsafeRes, jsonRpcResult(baseSchema));
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, `failed to get accounts owned by program ${programId.toBase58()}`);
    }
    return res.result;
  }

  /**
   * Fetch and parse all the accounts owned by the specified program id
   *
  * @return {Promise<Array<{pubkey: Address, account: AccountInfo<Uint8Array | ParsedAccountData>}>>}
   */
  async getParsedProgramAccounts(programId, configOrCommitment) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(configOrCommitment);
    const args = this._buildArgs([programId.toBase58()], commitment, 'jsonParsed', config);
    const unsafeRes = await this._rpcRequest('getProgramAccounts', args);
    const res = superstruct.create(unsafeRes, jsonRpcResult(superstruct.array(KeyedParsedAccountInfoBytesResult)));
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, `failed to get accounts owned by program ${programId.toBase58()}`);
    }
    return res.result;
  }

  /** @deprecated Instead, call `confirmTransaction` and pass in {@link TransactionConfirmationStrategy} */
  // eslint-disable-next-line no-dupe-class-members

  // eslint-disable-next-line no-dupe-class-members
  async confirmTransaction(strategy, commitment) {
    let rawSignature;
    if (typeof strategy == 'string') {
      rawSignature = strategy;
    } else {
      const config = strategy;
      if (config.abortSignal?.aborted) {
        return Promise.reject(config.abortSignal.reason);
      }
      rawSignature = config.signature;
    }
    let decodedSignature;
    try {
      decodedSignature = BASE58_ENCODER.encode(rawSignature);
    } catch (err) {
      throw new Error('signature must be base58 encoded: ' + rawSignature);
    }
    assert(decodedSignature.length === 64, 'signature has invalid length');
    if (typeof strategy === 'string') {
      return await this.confirmTransactionUsingLegacyTimeoutStrategy({
        commitment: commitment || this.commitment,
        signature: rawSignature
      });
    } else if ('lastValidBlockHeight' in strategy) {
      return await this.confirmTransactionUsingBlockHeightExceedanceStrategy({
        commitment: commitment || this.commitment,
        strategy
      });
    } else {
      return await this.confirmTransactionUsingDurableNonceStrategy({
        commitment: commitment || this.commitment,
        strategy
      });
    }
  }
  getCancellationPromise(signal) {
    return new Promise((_, reject) => {
      if (signal == null) {
        return;
      }
      if (signal.aborted) {
        reject(signal.reason);
      } else {
        signal.addEventListener('abort', () => {
          reject(signal.reason);
        });
      }
    });
  }
  getTransactionConfirmationPromise({
    commitment,
    signature
  }) {
    let signatureSubscriptionId;
    let disposeSignatureSubscriptionStateChangeObserver;
    let done = false;
    const confirmationPromise = new Promise((resolve, reject) => {
      try {
        signatureSubscriptionId = this.onSignature(signature, (result, context) => {
          signatureSubscriptionId = undefined;
          const response = {
            context,
            value: result
          };
          resolve({
            __type: TransactionStatus.PROCESSED,
            response
          });
        }, commitment);
        const subscriptionSetupPromise = new Promise(resolveSubscriptionSetup => {
          if (signatureSubscriptionId == null) {
            resolveSubscriptionSetup();
          } else {
            disposeSignatureSubscriptionStateChangeObserver = this._onSubscriptionStateChange(signatureSubscriptionId, nextState => {
              if (nextState === 'subscribed') {
                resolveSubscriptionSetup();
              }
            });
          }
        });
        (async () => {
          await subscriptionSetupPromise;
          if (done) return;
          const response = await this.getSignatureStatus(signature);
          if (done) return;
          if (response == null) {
            return;
          }
          const {
            context,
            value
          } = response;
          if (value == null) {
            return;
          }
          if (value?.err) {
            reject(value.err);
          } else {
            switch (commitment) {
              case 'confirmed':
                if (value.confirmationStatus === 'processed') {
                  return;
                }
                break;
              case 'finalized':
                if (value.confirmationStatus === 'processed' || value.confirmationStatus === 'confirmed') {
                  return;
                }
                break;
              // exhaust enums to ensure full coverage
              case 'processed':
            }
            done = true;
            resolve({
              __type: TransactionStatus.PROCESSED,
              response: {
                context,
                value
              }
            });
          }
        })();
      } catch (err) {
        reject(err);
      }
    });
    const abortConfirmation = () => {
      if (disposeSignatureSubscriptionStateChangeObserver) {
        disposeSignatureSubscriptionStateChangeObserver();
        disposeSignatureSubscriptionStateChangeObserver = undefined;
      }
      if (signatureSubscriptionId != null) {
        this.removeSignatureListener(signatureSubscriptionId);
        signatureSubscriptionId = undefined;
      }
    };
    return {
      abortConfirmation,
      confirmationPromise
    };
  }
  async confirmTransactionUsingBlockHeightExceedanceStrategy({
    commitment,
    strategy: {
      abortSignal,
      lastValidBlockHeight,
      signature
    }
  }) {
    let done = false;
    const expiryPromise = new Promise(resolve => {
      const checkBlockHeight = async () => {
        try {
          const blockHeight = await this.getBlockHeight(commitment);
          return blockHeight;
        } catch (_e) {
          return -1;
        }
      };
      (async () => {
        let currentBlockHeight = await checkBlockHeight();
        if (done) return;
        while (currentBlockHeight <= lastValidBlockHeight) {
          await sleep(1000);
          if (done) return;
          currentBlockHeight = await checkBlockHeight();
          if (done) return;
        }
        resolve({
          __type: TransactionStatus.BLOCKHEIGHT_EXCEEDED
        });
      })();
    });
    const {
      abortConfirmation,
      confirmationPromise
    } = this.getTransactionConfirmationPromise({
      commitment,
      signature
    });
    const cancellationPromise = this.getCancellationPromise(abortSignal);
    let result;
    try {
      const outcome = await Promise.race([cancellationPromise, confirmationPromise, expiryPromise]);
      if (outcome.__type === TransactionStatus.PROCESSED) {
        result = outcome.response;
      } else {
        throw new TransactionExpiredBlockheightExceededError(signature);
      }
    } finally {
      done = true;
      abortConfirmation();
    }
    return result;
  }
  async confirmTransactionUsingDurableNonceStrategy({
    commitment,
    strategy: {
      abortSignal,
      minContextSlot,
      nonceAccountPubkey,
      nonceValue,
      signature
    }
  }) {
    let done = false;
    const expiryPromise = new Promise(resolve => {
      let currentNonceValue = nonceValue;
      let lastCheckedSlot = null;
      const getCurrentNonceValue = async () => {
        try {
          const {
            context,
            value: nonceAccount
          } = await this.getNonceAndContext(nonceAccountPubkey, {
            commitment,
            minContextSlot
          });
          lastCheckedSlot = context.slot;
          return nonceAccount?.nonce;
        } catch (e) {
          // If for whatever reason we can't reach/read the nonce
          // account, just keep using the last-known value.
          return currentNonceValue;
        }
      };
      (async () => {
        currentNonceValue = await getCurrentNonceValue();
        if (done) return;
        while (true // eslint-disable-line no-constant-condition
        ) {
          if (nonceValue !== currentNonceValue) {
            resolve({
              __type: TransactionStatus.NONCE_INVALID,
              slotInWhichNonceDidAdvance: lastCheckedSlot
            });
            return;
          }
          await sleep(2000);
          if (done) return;
          currentNonceValue = await getCurrentNonceValue();
          if (done) return;
        }
      })();
    });
    const {
      abortConfirmation,
      confirmationPromise
    } = this.getTransactionConfirmationPromise({
      commitment,
      signature
    });
    const cancellationPromise = this.getCancellationPromise(abortSignal);
    let result;
    try {
      const outcome = await Promise.race([cancellationPromise, confirmationPromise, expiryPromise]);
      if (outcome.__type === TransactionStatus.PROCESSED) {
        result = outcome.response;
      } else {
        // Double check that the transaction is indeed unconfirmed.
        let signatureStatus;
        while (true // eslint-disable-line no-constant-condition
        ) {
          const status = await this.getSignatureStatus(signature);
          if (status == null) {
            break;
          }
          if (status.context.slot < (outcome.slotInWhichNonceDidAdvance ?? minContextSlot)) {
            await sleep(400);
            continue;
          }
          signatureStatus = status;
          break;
        }
        if (signatureStatus?.value) {
          const commitmentForStatus = commitment || 'finalized';
          const {
            confirmationStatus
          } = signatureStatus.value;
          switch (commitmentForStatus) {
            case 'processed':
              if (confirmationStatus !== 'processed' && confirmationStatus !== 'confirmed' && confirmationStatus !== 'finalized') {
                throw new TransactionExpiredNonceInvalidError(signature);
              }
              break;
            case 'confirmed':
              if (confirmationStatus !== 'confirmed' && confirmationStatus !== 'finalized') {
                throw new TransactionExpiredNonceInvalidError(signature);
              }
              break;
            case 'finalized':
              if (confirmationStatus !== 'finalized') {
                throw new TransactionExpiredNonceInvalidError(signature);
              }
              break;
            default:
              // Exhaustive switch.
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              (_ => {})(commitmentForStatus);
          }
          result = {
            context: signatureStatus.context,
            value: {
              err: signatureStatus.value.err
            }
          };
        } else {
          throw new TransactionExpiredNonceInvalidError(signature);
        }
      }
    } finally {
      done = true;
      abortConfirmation();
    }
    return result;
  }
  async confirmTransactionUsingLegacyTimeoutStrategy({
    commitment,
    signature
  }) {
    let timeoutId;
    const expiryPromise = new Promise(resolve => {
      let timeoutMs = this._confirmTransactionInitialTimeout || 60 * 1000;
      switch (commitment) {
        case 'processed':
        case 'confirmed':
          timeoutMs = this._confirmTransactionInitialTimeout || 30 * 1000;
          break;
      }
      timeoutId = setTimeout(() => resolve({
        __type: TransactionStatus.TIMED_OUT,
        timeoutMs
      }), timeoutMs);
    });
    const {
      abortConfirmation,
      confirmationPromise
    } = this.getTransactionConfirmationPromise({
      commitment,
      signature
    });
    let result;
    try {
      const outcome = await Promise.race([confirmationPromise, expiryPromise]);
      if (outcome.__type === TransactionStatus.PROCESSED) {
        result = outcome.response;
      } else {
        throw new TransactionExpiredTimeoutError(signature, outcome.timeoutMs / 1000);
      }
    } finally {
      clearTimeout(timeoutId);
      abortConfirmation();
    }
    return result;
  }

  /**
   * Return the list of nodes that are currently participating in the cluster
   */
  async getClusterNodes() {
    try {
      return await this._typedRpc.getClusterNodes().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get cluster nodes');
    }
  }

  /**
   * Fetch the RPC node health status.
   */
  async getHealth() {
    try {
      return await this._typedRpc.getHealth().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get health');
    }
  }

  /**
   * Fetch the RPC node identity.
   */
  async getIdentity() {
    try {
      const response = await this._typedRpc.getIdentity().send();
      return {
        identity: new Address(response.identity)
      };
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get identity');
    }
  }

  /**
   * Fetch the highest full and incremental snapshot slots available on the RPC node.
   */
  async getHighestSnapshotSlot() {
    try {
      return await this._typedRpc.getHighestSnapshotSlot().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get highest snapshot slot');
    }
  }

  /**
   * Fetch the highest slot seen by retransmit stage.
   */
  async getMaxRetransmitSlot() {
    try {
      return await this._typedRpc.getMaxRetransmitSlot().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get max retransmit slot');
    }
  }

  /**
   * Fetch the highest slot seen by blockstore.
   */
  async getMaxShredInsertSlot() {
    try {
      return await this._typedRpc.getMaxShredInsertSlot().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get max shred insert slot');
    }
  }

  /**
   * Return the list of nodes that are currently participating in the cluster
   */
  async getVoteAccounts(commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const args = this._buildArgs([], commitment, undefined /* encoding */, config);
    const unsafeRes = await this._rpcRequest('getVoteAccounts', args);
    const res = superstruct.create(unsafeRes, GetVoteAccounts);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get vote accounts');
    }
    return res.result;
  }

  /**
   * Fetch the current slot that the node is processing
   */
  async getSlot(commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = commitment ?? this._commitment;
    const minContextSlot = config?.minContextSlot;
    try {
      if (rpcCommitment == null && minContextSlot == null) {
        return await this._typedRpc.getSlot().send();
      }
      return await this._typedRpc.getSlot({
        commitment: rpcCommitment,
        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
      }).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get slot');
    }
  }

  /**
   * Fetch the current slot leader of the cluster
   */
  async getSlotLeader(commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = commitment ?? this._commitment;
    const minContextSlot = config?.minContextSlot;
    try {
      return await (rpcCommitment == null && minContextSlot == null ? this._typedRpc.getSlotLeader() : this._typedRpc.getSlotLeader({
        commitment: rpcCommitment,
        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
      })).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get slot leader');
    }
  }

  /**
   * Fetch `limit` number of slot leaders starting from `startSlot`
   *
   * @param startSlot fetch slot leaders starting from this slot
   * @param limit number of slot leaders to return
   */
  async getSlotLeaders(startSlot, limit) {
    try {
      const response = await this._typedRpc.getSlotLeaders(coerceNumericToBigInt(startSlot, 'startSlot'), limit).send();
      return response.map(address => new Address(address));
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get slot leaders');
    }
  }

  /**
   * Fetch the current status of a signature
   */
  async getSignatureStatus(signature, config) {
    const {
      context,
      value: values
    } = await this.getSignatureStatuses([signature], config);
    assert(values.length === 1);
    const value = values[0];
    return {
      context,
      value
    };
  }

  /**
   * Fetch the current statuses of a batch of signatures
   */
  async getSignatureStatuses(signatures, config) {
    const params = [signatures];
    if (config) {
      params.push(config);
    }
    const unsafeRes = await this._rpcRequest('getSignatureStatuses', params);
    const res = superstruct.create(unsafeRes, GetSignatureStatusesRpcResult);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get signature status');
    }
    return res.result;
  }

  /**
   * Fetch the current transaction count of the cluster
   */
  async getTransactionCount(commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = commitment ?? this._commitment;
    const minContextSlot = config?.minContextSlot;
    try {
      if (rpcCommitment == null && minContextSlot == null) {
        return await this._typedRpc.getTransactionCount().send();
      }
      return await this._typedRpc.getTransactionCount({
        commitment: rpcCommitment,
        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
      }).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get transaction count');
    }
  }

  /**
   * Fetch the current total currency supply of the cluster in lamports
   *
   * @deprecated Deprecated since RPC v1.2.8. Please use {@link getSupply} instead.
   */
  async getTotalSupply(commitment) {
    const result = await this.getSupply({
      commitment,
      excludeNonCirculatingAccountsList: true
    });
    return result.value.total;
  }

  /**
   * Fetch the cluster InflationGovernor parameters
   */
  async getInflationGovernor(commitmentOrConfig) {
    const {
      commitment
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = commitment ?? this._commitment;
    try {
      return await (rpcCommitment == null ? this._typedRpc.getInflationGovernor() : this._typedRpc.getInflationGovernor({
        commitment: rpcCommitment
      })).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get inflation');
    }
  }

  /**
   * Fetch the inflation reward for a list of addresses for an epoch
   */
  async getInflationReward(addresses, epoch, commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const args = this._buildArgs([addresses.map(pubkey => pubkey.toBase58())], commitment, undefined /* encoding */, {
      ...config,
      epoch: epoch != null ? epoch : config?.epoch
    });
    const unsafeRes = await this._rpcRequest('getInflationReward', args);
    const res = superstruct.create(unsafeRes, GetInflationRewardResult);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get inflation reward');
    }
    return res.result;
  }

  /**
   * Fetch the specific inflation values for the current epoch
   */
  async getInflationRate() {
    try {
      return await this._typedRpc.getInflationRate().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get inflation rate');
    }
  }

  /**
   * Fetch the Epoch Info parameters
   */
  async getEpochInfo(commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = commitment ?? this._commitment;
    const minContextSlot = config?.minContextSlot;
    try {
      return await (rpcCommitment == null && minContextSlot == null ? this._typedRpc.getEpochInfo() : this._typedRpc.getEpochInfo({
        commitment: rpcCommitment,
        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
      })).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get epoch info');
    }
  }

  /**
   * Fetch the Epoch Schedule parameters
   */
  async getEpochSchedule() {
    try {
      const epochSchedule = await this._typedRpc.getEpochSchedule().send();
      return new EpochSchedule(epochSchedule.slotsPerEpoch, epochSchedule.leaderScheduleSlotOffset, epochSchedule.warmup, epochSchedule.firstNormalEpoch, epochSchedule.firstNormalSlot);
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get epoch schedule');
    }
  }

  /**
   * Fetch the leader schedule for the current epoch
   * @return {Promise<RpcResponseAndContext<LeaderSchedule>>}
   */
  async getLeaderSchedule(slotOrCommitmentOrConfig, commitmentOrConfig) {
    let slot;
    let rawCommitmentOrConfig;
    if (typeof slotOrCommitmentOrConfig === 'number' || typeof slotOrCommitmentOrConfig === 'bigint' || slotOrCommitmentOrConfig === null) {
      slot = slotOrCommitmentOrConfig;
      rawCommitmentOrConfig = commitmentOrConfig;
    } else {
      rawCommitmentOrConfig = slotOrCommitmentOrConfig;
    }
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(rawCommitmentOrConfig);
    const rpcCommitment = commitment ?? this._commitment;
    const rpcIdentity = config?.identity;
    const rpcConfig = {
      ...(rpcCommitment != null ? {
        commitment: rpcCommitment
      } : null),
      ...(rpcIdentity != null ? {
        identity: rpcIdentity
      } : null)
    };
    try {
      if (slot === undefined) {
        if (Object.keys(rpcConfig).length === 0) {
          return await this._typedRpc.getLeaderSchedule().send();
        }
        return await this._typedRpc.getLeaderSchedule(null, rpcConfig).send();
      }
      if (slot === null) {
        if (Object.keys(rpcConfig).length === 0) {
          return await this._typedRpc.getLeaderSchedule(null).send();
        }
        return await this._typedRpc.getLeaderSchedule(null, rpcConfig).send();
      }
      if (Object.keys(rpcConfig).length === 0) {
        return await this._typedRpc.getLeaderSchedule(coerceNumericToBigInt(slot, 'slot')).send();
      }
      return await this._typedRpc.getLeaderSchedule(coerceNumericToBigInt(slot, 'slot'), rpcConfig).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get leader schedule');
    }
  }

  /**
   * Fetch the minimum balance needed to exempt an account of `dataLength`
   * size from rent
   */
  async getMinimumBalanceForRentExemption(dataLength, commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const args = this._buildArgs([dataLength], commitment, undefined /* encoding */, config);
    const unsafeRes = await this._rpcRequest('getMinimumBalanceForRentExemption', args);
    const res = superstruct.create(unsafeRes, GetMinimumBalanceForRentExemptionRpcResult);
    if ('error' in res) {
      console.warn('Unable to fetch minimum balance for rent exemption');
      return 0;
    }
    return res.result;
  }

  /**
   * Fetch recent performance samples
    * @return {Promise<readonly PerfSample[]>}
   */
  async getRecentPerformanceSamples(limit) {
    try {
      return await (limit ? this._typedRpc.getRecentPerformanceSamples(limit) : this._typedRpc.getRecentPerformanceSamples()).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get recent performance samples');
    }
  }

  /**
   * Fetch the fee for a message from the cluster, return with context
   */
  async getFeeForMessage(message, commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = commitment ?? this._commitment;
    const minContextSlot = config?.minContextSlot;
    const wireMessage = encodeBase64WireData(message.serialize());
    try {
      const response = await (rpcCommitment == null && minContextSlot == null ? this._typedRpc.getFeeForMessage(wireMessage) : this._typedRpc.getFeeForMessage(wireMessage, {
        commitment: rpcCommitment,
        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
      })).send();
      if (response.value === null) {
        throw new Error('invalid blockhash');
      }
      return response;
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get fee for message');
    }
  }

  /**
   * Fetch a list of prioritization fees from recent blocks.
   */
  async getRecentPrioritizationFees(config) {
    const accounts = config?.lockedWritableAccounts?.map(key => toKitAddress(key));
    try {
      return await (accounts == null ? this._typedRpc.getRecentPrioritizationFees() : this._typedRpc.getRecentPrioritizationFees(accounts)).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get recent prioritization fees');
    }
  }
  /**
   * Fetch the latest blockhash from the cluster
   * @return {Promise<BlockhashWithExpiryBlockHeight>}
   */
  async getLatestBlockhash(commitmentOrConfig) {
    try {
      const res = await this.getLatestBlockhashAndContext(commitmentOrConfig);
      return res.value;
    } catch (e) {
      throw new Error('failed to get recent blockhash: ' + e);
    }
  }

  /**
   * Fetch the latest blockhash from the cluster
   * @return {Promise<BlockhashWithExpiryBlockHeight>}
   */
  async getLatestBlockhashAndContext(commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const args = this._buildArgs([], commitment, undefined /* encoding */, config);
    const unsafeRes = await this._rpcRequest('getLatestBlockhash', args);
    const res = superstruct.create(unsafeRes, GetLatestBlockhashRpcResult);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get latest blockhash');
    }
    return res.result;
  }

  /**
   * Returns whether a blockhash is still valid or not
   */
  async isBlockhashValid(blockhash, rawConfig) {
    const rpcBlockhash = blockhash;
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(rawConfig);
    const rpcCommitment = commitment ?? this._commitment;
    const minContextSlot = config?.minContextSlot;
    try {
      return await (rpcCommitment == null && minContextSlot == null ? this._typedRpc.isBlockhashValid(rpcBlockhash) : this._typedRpc.isBlockhashValid(rpcBlockhash, {
        commitment: rpcCommitment,
        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
      })).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to determine if the blockhash `' + blockhash + '`is valid');
    }
  }

  /**
   * Fetch the node version
   */
  async getVersion() {
    try {
      return await this._typedRpc.getVersion().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get version');
    }
  }

  /**
   * Fetch the genesis hash
   */
  async getGenesisHash() {
    try {
      return await this._typedRpc.getGenesisHash().send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get genesis hash');
    }
  }

  /**
   * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
   * setting the `maxSupportedTransactionVersion` property.
   */
  // eslint-disable-next-line no-dupe-class-members

  /**
   * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
   * setting the `maxSupportedTransactionVersion` property.
   */
  // eslint-disable-next-line no-dupe-class-members

  /**
   * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
   * setting the `maxSupportedTransactionVersion` property.
   */
  // eslint-disable-next-line no-dupe-class-members

  /**
   * Fetch a processed block from the cluster.
   *
   * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
   * setting the `maxSupportedTransactionVersion` property.
   */
  // eslint-disable-next-line no-dupe-class-members

  /**
   * Fetch a processed block from the cluster.
   */
  // eslint-disable-next-line no-dupe-class-members

  // eslint-disable-next-line no-dupe-class-members

  // eslint-disable-next-line no-dupe-class-members

  // eslint-disable-next-line no-dupe-class-members

  /**
   * Fetch a processed block from the cluster.
   */
  // eslint-disable-next-line no-dupe-class-members
  async getBlock(slot, rawConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(rawConfig);
    const args = this._buildArgsAtLeastConfirmed([slot], commitment, undefined /* encoding */, config);
    const unsafeRes = await this._rpcRequest('getBlock', args);
    try {
      switch (config?.transactionDetails) {
        case 'accounts':
          {
            const res = superstruct.create(unsafeRes, GetAccountsModeBlockRpcResult);
            if ('error' in res) {
              throw res.error;
            }
            return res.result;
          }
        case 'none':
          {
            const res = superstruct.create(unsafeRes, GetNoneModeBlockRpcResult);
            if ('error' in res) {
              throw res.error;
            }
            return res.result;
          }
        case 'signatures':
          {
            const res = superstruct.create(unsafeRes, GetSignaturesModeBlockRpcResult);
            if ('error' in res) {
              throw res.error;
            }
            return res.result;
          }
        default:
          {
            const res = superstruct.create(unsafeRes, GetBlockRpcResult);
            if ('error' in res) {
              throw res.error;
            }
            const {
              result
            } = res;
            return result ? {
              ...result,
              transactions: result.transactions.map(({
                transaction,
                meta,
                version
              }) => ({
                meta,
                transaction: {
                  ...transaction,
                  message: versionedMessageFromResponse(version, transaction.message)
                },
                version
              }))
            } : null;
          }
      }
    } catch (e) {
      throw new SolanaJSONRPCError(e, 'failed to get confirmed block');
    }
  }

  /**
   * Fetch parsed transaction details for a confirmed or finalized block
   */

  // eslint-disable-next-line no-dupe-class-members

  // eslint-disable-next-line no-dupe-class-members

  // eslint-disable-next-line no-dupe-class-members

  // eslint-disable-next-line no-dupe-class-members
  async getParsedBlock(slot, rawConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(rawConfig);
    const args = this._buildArgsAtLeastConfirmed([slot], commitment, 'jsonParsed', config);
    const unsafeRes = await this._rpcRequest('getBlock', args);
    try {
      switch (config?.transactionDetails) {
        case 'accounts':
          {
            const res = superstruct.create(unsafeRes, GetParsedAccountsModeBlockRpcResult);
            if ('error' in res) {
              throw res.error;
            }
            return res.result;
          }
        case 'none':
          {
            const res = superstruct.create(unsafeRes, GetParsedNoneModeBlockRpcResult);
            if ('error' in res) {
              throw res.error;
            }
            return res.result;
          }
        case 'signatures':
          {
            const res = superstruct.create(unsafeRes, GetParsedSignaturesModeBlockRpcResult);
            if ('error' in res) {
              throw res.error;
            }
            return res.result;
          }
        default:
          {
            const res = superstruct.create(unsafeRes, GetParsedBlockRpcResult);
            if ('error' in res) {
              throw res.error;
            }
            return res.result;
          }
      }
    } catch (e) {
      throw new SolanaJSONRPCError(e, 'failed to get block');
    }
  }
  /*
   * Returns recent block production information from the current or previous epoch
   */
  async getBlockProduction(configOrCommitment) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(configOrCommitment);
    const rpcCommitment = commitment ?? this._commitment;
    const rpcIdentity = config?.identity;
    const rpcRange = config?.range == null ? undefined : {
      firstSlot: coerceNumericToBigInt(config.range.firstSlot, 'firstSlot'),
      ...(config.range.lastSlot == null ? null : {
        lastSlot: coerceNumericToBigInt(config.range.lastSlot, 'lastSlot')
      })
    };
    const rpcConfig = rpcCommitment == null && rpcIdentity == null && rpcRange == null ? undefined : {
      ...(rpcCommitment != null ? {
        commitment: rpcCommitment
      } : null),
      ...(rpcIdentity != null ? {
        identity: rpcIdentity
      } : null),
      ...(rpcRange != null ? {
        range: rpcRange
      } : null)
    };
    try {
      return await (rpcConfig == null ? this._typedRpc.getBlockProduction() : this._typedRpc.getBlockProduction(rpcConfig)).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get block production information');
    }
  }

  /**
   * Fetch a confirmed or finalized transaction from the cluster.
   *
   * @deprecated Instead, call `getTransaction` using a
   * `GetVersionedTransactionConfig` by setting the
   * `maxSupportedTransactionVersion` property.
   */

  /**
   * Fetch a confirmed or finalized transaction from the cluster.
   */
  // eslint-disable-next-line no-dupe-class-members

  /**
   * Fetch a confirmed or finalized transaction from the cluster.
   */
  // eslint-disable-next-line no-dupe-class-members
  async getTransaction(signature, rawConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(rawConfig);
    const args = this._buildArgsAtLeastConfirmed([signature], commitment, undefined /* encoding */, config);
    const unsafeRes = await this._rpcRequest('getTransaction', args);
    const res = superstruct.create(unsafeRes, GetTransactionRpcResult);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get transaction');
    }
    const result = res.result;
    if (!result) return result;
    return {
      ...result,
      transaction: {
        ...result.transaction,
        message: versionedMessageFromResponse(result.version, result.transaction.message)
      }
    };
  }

  /**
   * Fetch parsed transaction details for a confirmed or finalized transaction
   */
  async getParsedTransaction(signature, commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const args = this._buildArgsAtLeastConfirmed([signature], commitment, 'jsonParsed', config);
    const unsafeRes = await this._rpcRequest('getTransaction', args);
    const res = superstruct.create(unsafeRes, GetParsedTransactionRpcResult);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get transaction');
    }
    return res.result;
  }

  /**
   * Fetch parsed transaction details for a batch of confirmed transactions
   */
  async getParsedTransactions(signatures, commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const batch = signatures.map(signature => {
      const args = this._buildArgsAtLeastConfirmed([signature], commitment, 'jsonParsed', config);
      return {
        methodName: 'getTransaction',
        args
      };
    });
    const unsafeRes = await this._rpcBatchRequest(batch);
    const res = unsafeRes.map(unsafeRes => {
      const res = superstruct.create(unsafeRes, GetParsedTransactionRpcResult);
      if ('error' in res) {
        throw new SolanaJSONRPCError(res.error, 'failed to get transactions');
      }
      return res.result;
    });
    return res;
  }

  /**
   * Fetch transaction details for a batch of confirmed transactions.
   * Similar to {@link getParsedTransactions} but returns a {@link TransactionResponse}.
   *
   * @deprecated Instead, call `getTransactions` using a
   * `GetVersionedTransactionConfig` by setting the
   * `maxSupportedTransactionVersion` property.
   */

  /**
   * Fetch transaction details for a batch of confirmed transactions.
   * Similar to {@link getParsedTransactions} but returns a {@link
   * VersionedTransactionResponse}.
   */
  // eslint-disable-next-line no-dupe-class-members

  /**
   * Fetch transaction details for a batch of confirmed transactions.
   * Similar to {@link getParsedTransactions} but returns a {@link
   * VersionedTransactionResponse}.
   */
  // eslint-disable-next-line no-dupe-class-members
  async getTransactions(signatures, commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const batch = signatures.map(signature => {
      const args = this._buildArgsAtLeastConfirmed([signature], commitment, undefined /* encoding */, config);
      return {
        methodName: 'getTransaction',
        args
      };
    });
    const unsafeRes = await this._rpcBatchRequest(batch);
    const res = unsafeRes.map(unsafeRes => {
      const res = superstruct.create(unsafeRes, GetTransactionRpcResult);
      if ('error' in res) {
        throw new SolanaJSONRPCError(res.error, 'failed to get transactions');
      }
      const result = res.result;
      if (!result) return result;
      return {
        ...result,
        transaction: {
          ...result.transaction,
          message: versionedMessageFromResponse(result.version, result.transaction.message)
        }
      };
    });
    return res;
  }

  /**
   * Fetch a list of Transactions and transaction statuses from the cluster
   * for a confirmed block.
   *
   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getBlock} instead.
   */
  async getConfirmedBlock(slot, commitment) {
    const args = this._buildArgsAtLeastConfirmed([slot], commitment);
    const unsafeRes = await this._rpcRequest('getBlock', args);
    const res = superstruct.create(unsafeRes, GetConfirmedBlockRpcResult);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get confirmed block');
    }
    const result = res.result;
    if (!result) {
      throw new Error('Confirmed block ' + slot + ' not found');
    }
    const block = {
      ...result,
      transactions: result.transactions.map(({
        transaction,
        meta
      }) => {
        const message = new Message(transaction.message);
        return {
          meta,
          transaction: {
            ...transaction,
            message
          }
        };
      })
    };
    return {
      ...block,
      transactions: block.transactions.map(({
        transaction,
        meta
      }) => {
        return {
          meta,
          transaction: Transaction.populate(transaction.message, transaction.signatures)
        };
      })
    };
  }

  /**
   * Fetch confirmed blocks between two slots
   */

  // eslint-disable-next-line no-dupe-class-members

  // eslint-disable-next-line no-dupe-class-members

  // eslint-disable-next-line no-dupe-class-members
  async getBlocks(startSlot, endSlotOrCommitmentOrConfig, commitmentOrConfig) {
    const slots = [startSlot];
    let rawCommitmentOrConfig;
    if (typeof endSlotOrCommitmentOrConfig === 'number') {
      slots.push(endSlotOrCommitmentOrConfig);
      rawCommitmentOrConfig = commitmentOrConfig;
    } else {
      rawCommitmentOrConfig = endSlotOrCommitmentOrConfig;
    }
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(rawCommitmentOrConfig);
    const args = this._buildArgsAtLeastConfirmed(slots, commitment, undefined /* encoding */, config);
    const unsafeRes = await this._rpcRequest('getBlocks', args);
    const res = superstruct.create(unsafeRes, jsonRpcResult(superstruct.array(superstruct.number())));
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get blocks');
    }
    return res.result;
  }

  /**
   * Fetch confirmed blocks starting at the provided slot, limited to the requested length.
   */

  // eslint-disable-next-line no-dupe-class-members

  // eslint-disable-next-line no-dupe-class-members
  async getBlocksWithLimit(startSlot, limit, commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const args = this._buildArgsAtLeastConfirmed([startSlot, limit], commitment, undefined /* encoding */, config);
    const unsafeRes = await this._rpcRequest('getBlocksWithLimit', args);
    const res = superstruct.create(unsafeRes, jsonRpcResult(superstruct.array(superstruct.number())));
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get blocks with limit');
    }
    return res.result;
  }

  /**
   * Fetch the amount of cluster stake that has voted on a block.
   */
  async getBlockCommitment(slot) {
    try {
      return await this._typedRpc.getBlockCommitment(coerceNumericToBigInt(slot, 'slot')).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get block commitment');
    }
  }

  /**
   * Fetch a list of Signatures from the cluster for a block, excluding rewards
   */
  async getBlockSignatures(slot, commitment) {
    const args = this._buildArgsAtLeastConfirmed([slot], commitment, undefined, {
      transactionDetails: 'signatures',
      rewards: false
    });
    const unsafeRes = await this._rpcRequest('getBlock', args);
    const res = superstruct.create(unsafeRes, GetBlockSignaturesRpcResult);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get block');
    }
    const result = res.result;
    if (!result) {
      throw new Error('Block ' + slot + ' not found');
    }
    return result;
  }

  /**
   * Fetch a list of Signatures from the cluster for a confirmed block, excluding rewards
   *
   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getBlockSignatures} instead.
   */
  async getConfirmedBlockSignatures(slot, commitment) {
    const args = this._buildArgsAtLeastConfirmed([slot], commitment, undefined, {
      transactionDetails: 'signatures',
      rewards: false
    });
    const unsafeRes = await this._rpcRequest('getBlock', args);
    const res = superstruct.create(unsafeRes, GetBlockSignaturesRpcResult);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get confirmed block');
    }
    const result = res.result;
    if (!result) {
      throw new Error('Confirmed block ' + slot + ' not found');
    }
    return result;
  }

  /**
   * Fetch a transaction details for a confirmed transaction
   *
   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getTransaction} instead.
   */
  async getConfirmedTransaction(signature, commitment) {
    const args = this._buildArgsAtLeastConfirmed([signature], commitment);
    const unsafeRes = await this._rpcRequest('getTransaction', args);
    const res = superstruct.create(unsafeRes, GetTransactionRpcResult);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get transaction');
    }
    const result = res.result;
    if (!result) return result;
    const message = new Message(result.transaction.message);
    const signatures = result.transaction.signatures;
    return {
      ...result,
      transaction: Transaction.populate(message, signatures)
    };
  }

  /**
   * Fetch parsed transaction details for a confirmed transaction
   *
   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getParsedTransaction} instead.
   */
  async getParsedConfirmedTransaction(signature, commitment) {
    const args = this._buildArgsAtLeastConfirmed([signature], commitment, 'jsonParsed');
    const unsafeRes = await this._rpcRequest('getTransaction', args);
    const res = superstruct.create(unsafeRes, GetParsedTransactionRpcResult);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get confirmed transaction');
    }
    return res.result;
  }

  /**
   * Fetch parsed transaction details for a batch of confirmed transactions
   *
   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getParsedTransactions} instead.
   */
  async getParsedConfirmedTransactions(signatures, commitment) {
    const batch = signatures.map(signature => {
      const args = this._buildArgsAtLeastConfirmed([signature], commitment, 'jsonParsed');
      return {
        methodName: 'getTransaction',
        args
      };
    });
    const unsafeRes = await this._rpcBatchRequest(batch);
    const res = unsafeRes.map(unsafeRes => {
      const res = superstruct.create(unsafeRes, GetParsedTransactionRpcResult);
      if ('error' in res) {
        throw new SolanaJSONRPCError(res.error, 'failed to get confirmed transactions');
      }
      return res.result;
    });
    return res;
  }

  /**
   * Returns confirmed signatures for transactions involving an
   * address backwards in time from the provided signature or most recent confirmed block
   *
   *
   * @param address queried address
   * @param options
   */
  async getSignaturesForAddress(address, options, commitment) {
    const args = this._buildArgsAtLeastConfirmed([address.toBase58()], commitment, undefined, options);
    const unsafeRes = await this._rpcRequest('getSignaturesForAddress', args);
    const res = superstruct.create(unsafeRes, GetSignaturesForAddressRpcResult);
    if ('error' in res) {
      throw new SolanaJSONRPCError(res.error, 'failed to get signatures for address');
    }
    return res.result;
  }
  async getAddressLookupTable(accountKey, config) {
    const {
      context,
      value: accountInfo
    } = await this.getAccountInfoAndContext(accountKey, config);
    let value = null;
    if (accountInfo !== null) {
      value = new AddressLookupTableAccount({
        key: accountKey,
        state: AddressLookupTableAccount.deserialize(accountInfo.data)
      });
    }
    return {
      context,
      value
    };
  }

  /**
   * Fetch the contents of a Nonce account from the cluster, return with context
   */
  async getNonceAndContext(nonceAccount, commitmentOrConfig) {
    const {
      context,
      value: accountInfo
    } = await this.getAccountInfoAndContext(nonceAccount, commitmentOrConfig);
    let value = null;
    if (accountInfo !== null) {
      value = NonceAccount.fromAccountData(accountInfo.data);
    }
    return {
      context,
      value
    };
  }

  /**
   * Fetch the contents of a Nonce account from the cluster
   */
  async getNonce(nonceAccount, commitmentOrConfig) {
    return await this.getNonceAndContext(nonceAccount, commitmentOrConfig).then(x => x.value).catch(e => {
      throw new Error('failed to get nonce for account ' + nonceAccount.toBase58() + ': ' + e);
    });
  }

  /**
   * Request an allocation of lamports to the specified address
   *
   * ```typescript
   * import { Connection, Address, LAMPORTS_PER_SOL } from "@solana/web3.js";
   *
   * (async () => {
   *   const connection = new Connection("https://api.testnet.solana.com", "confirmed");
   *   const myAddress = new Address("2nr1bHFT86W9tGnyvmYW4vcHKsQB3sVQfnddasz4kExM");
   *   const signature = await connection.requestAirdrop(myAddress, LAMPORTS_PER_SOL);
   *   await connection.confirmTransaction(signature);
   * })();
   * ```
   */
  async requestAirdrop(to, lamports$1, commitmentOrConfig) {
    const {
      commitment
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const rpcCommitment = commitment ?? this._commitment;
    try {
      return await (rpcCommitment == null ? this._typedRpc.requestAirdrop(toKitAddress(to), lamports(coerceNumericToBigInt(lamports$1, 'lamports'))) : this._typedRpc.requestAirdrop(toKitAddress(to), lamports(coerceNumericToBigInt(lamports$1, 'lamports')), {
        commitment: rpcCommitment
      })).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, `airdrop to ${to.toBase58()} failed`);
    }
  }

  /**
   * @internal
   */
  async _blockhashWithExpiryBlockHeight(disableCache) {
    if (!disableCache) {
      // Wait for polling to finish
      while (this._pollingBlockhash) {
        await sleep(100);
      }
      const timeSinceFetch = Date.now() - this._blockhashInfo.lastFetch;
      const expired = timeSinceFetch >= BLOCKHASH_CACHE_TIMEOUT_MS;
      if (this._blockhashInfo.latestBlockhash !== null && !expired) {
        return this._blockhashInfo.latestBlockhash;
      }
    }
    return await this._pollNewBlockhash();
  }

  /**
   * @internal
   */
  async _pollNewBlockhash() {
    this._pollingBlockhash = true;
    try {
      const startTime = Date.now();
      const cachedLatestBlockhash = this._blockhashInfo.latestBlockhash;
      const cachedBlockhash = cachedLatestBlockhash ? cachedLatestBlockhash.blockhash : null;
      for (let i = 0; i < 50; i++) {
        const latestBlockhash = await this.getLatestBlockhash('finalized');
        if (cachedBlockhash !== latestBlockhash.blockhash) {
          this._blockhashInfo = {
            latestBlockhash,
            lastFetch: Date.now(),
            transactionSignatures: [],
            simulatedSignatures: []
          };
          return latestBlockhash;
        }

        // Sleep for approximately half a slot
        await sleep(MS_PER_SLOT / 2);
      }
      throw new Error(`Unable to obtain a new blockhash after ${Date.now() - startTime}ms`);
    } finally {
      this._pollingBlockhash = false;
    }
  }

  /**
   * get the stake minimum delegation
   */
  async getStakeMinimumDelegation(config) {
    try {
      return await this._typedRpc.getStakeMinimumDelegation(config).send();
    } catch (error) {
      throwSolanaRpcErrorIfNeeded(error, 'failed to get stake minimum delegation');
    }
  }

  /**
   * Simulate a transaction
   *
   * @deprecated Instead, call {@link simulateTransaction} with {@link
   * VersionedTransaction} and {@link SimulateTransactionConfig} parameters
   */

  /**
   * Simulate a transaction
   */
  // eslint-disable-next-line no-dupe-class-members

  /**
   * Simulate a transaction
   */
  // eslint-disable-next-line no-dupe-class-members
  async simulateTransaction(transactionOrMessage, configOrSigners, includeAccounts) {
    if ('message' in transactionOrMessage) {
      const versionedTx = transactionOrMessage;
      const wireTransaction = versionedTx.serialize();
      const encodedTransaction = encodeBase64WireData(wireTransaction);
      if (Array.isArray(configOrSigners) || includeAccounts !== undefined) {
        throw new Error('Invalid arguments');
      }
      const config = configOrSigners || {};
      config.encoding = 'base64';
      if (!('commitment' in config)) {
        config.commitment = this.commitment;
      }
      if (configOrSigners && typeof configOrSigners === 'object' && 'innerInstructions' in configOrSigners) {
        config.innerInstructions = configOrSigners.innerInstructions;
      }
      const args = [encodedTransaction, config];
      const unsafeRes = await this._rpcRequest('simulateTransaction', args);
      const res = superstruct.create(unsafeRes, SimulatedTransactionResponseStruct);
      if ('error' in res) {
        throw new Error('failed to simulate transaction: ' + res.error.message);
      }
      return res.result;
    }
    let transaction;
    if (transactionOrMessage instanceof Transaction) {
      let originalTx = transactionOrMessage;
      transaction = new Transaction();
      transaction.feePayer = originalTx.feePayer;
      transaction.instructions = transactionOrMessage.instructions;
      transaction.nonceInfo = originalTx.nonceInfo;
      transaction.signatures = originalTx.signatures;
    } else {
      transaction = Transaction.populate(transactionOrMessage);
      // HACK: this function relies on mutating the populated transaction
      transaction._message = transaction._json = undefined;
    }
    if (configOrSigners !== undefined && !Array.isArray(configOrSigners)) {
      throw new Error('Invalid arguments');
    }
    const signers = configOrSigners;
    if (transaction.nonceInfo && signers) {
      await transaction.sign(...signers);
    } else {
      let disableCache = this._disableBlockhashCaching;
      for (;;) {
        const latestBlockhash = await this._blockhashWithExpiryBlockHeight(disableCache);
        transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
        transaction.recentBlockhash = latestBlockhash.blockhash;
        if (!signers) break;
        await transaction.sign(...signers);
        if (!transaction.signature) {
          throw new Error('!signature'); // should never happen
        }
        const signature = encodeBase64WireData(transaction.signature);
        if (!this._blockhashInfo.simulatedSignatures.includes(signature) && !this._blockhashInfo.transactionSignatures.includes(signature)) {
          // The signature of this transaction has not been seen before with the
          // current recentBlockhash, all done. Let's break
          this._blockhashInfo.simulatedSignatures.push(signature);
          break;
        } else {
          // This transaction would be treated as duplicate (its derived signature
          // matched to one of already recorded signatures).
          // So, we must fetch a new blockhash for a different signature by disabling
          // our cache not to wait for the cache expiration (BLOCKHASH_CACHE_TIMEOUT_MS).
          disableCache = true;
        }
      }
    }
    const message = transaction._compile();
    const signData = message.serialize();
    const wireTransaction = transaction._serialize(signData);
    const encodedTransaction = encodeBase64WireData(wireTransaction);
    const config = {
      encoding: 'base64',
      commitment: this.commitment
    };
    if (includeAccounts) {
      const addresses = (Array.isArray(includeAccounts) ? includeAccounts : message.nonProgramIds()).map(key => key.toBase58());
      config['accounts'] = {
        encoding: 'base64',
        addresses
      };
    }
    if (signers) {
      config.sigVerify = true;
    }
    if (configOrSigners && typeof configOrSigners === 'object' && 'innerInstructions' in configOrSigners) {
      config.innerInstructions = configOrSigners.innerInstructions;
    }
    const args = [encodedTransaction, config];
    const unsafeRes = await this._rpcRequest('simulateTransaction', args);
    const res = superstruct.create(unsafeRes, SimulatedTransactionResponseStruct);
    if ('error' in res) {
      let logs;
      if ('data' in res.error) {
        logs = res.error.data.logs;
        if (logs && Array.isArray(logs)) {
          const traceIndent = '\n    ';
          const logTrace = traceIndent + logs.join(traceIndent);
          console.error(res.error.message, logTrace);
        }
      }
      throw new SendTransactionError({
        action: 'simulate',
        signature: '',
        transactionMessage: res.error.message,
        logs: logs
      });
    }
    return res.result;
  }

  /**
   * Sign and send a transaction
   *
   * @deprecated Instead, call {@link sendTransaction} with a {@link
   * VersionedTransaction}
   */

  /**
   * Send a signed transaction
   */
  // eslint-disable-next-line no-dupe-class-members

  /**
   * Sign and send a transaction
   */
  // eslint-disable-next-line no-dupe-class-members
  async sendTransaction(transaction, signersOrOptions, options) {
    if ('version' in transaction) {
      if (signersOrOptions && Array.isArray(signersOrOptions)) {
        throw new Error('Invalid arguments');
      }
      const wireTransaction = transaction.serialize();
      return await this.sendRawTransaction(wireTransaction, signersOrOptions);
    }
    if (signersOrOptions === undefined || !Array.isArray(signersOrOptions)) {
      throw new Error('Invalid arguments');
    }
    const signers = signersOrOptions;
    if (transaction.nonceInfo) {
      await transaction.sign(...signers);
    } else {
      let disableCache = this._disableBlockhashCaching;
      for (;;) {
        const latestBlockhash = await this._blockhashWithExpiryBlockHeight(disableCache);
        transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
        transaction.recentBlockhash = latestBlockhash.blockhash;
        await transaction.sign(...signers);
        if (!transaction.signature) {
          throw new Error('!signature'); // should never happen
        }
        const signature = encodeBase64WireData(transaction.signature);
        if (!this._blockhashInfo.transactionSignatures.includes(signature)) {
          // The signature of this transaction has not been seen before with the
          // current recentBlockhash, all done. Let's break
          this._blockhashInfo.transactionSignatures.push(signature);
          break;
        } else {
          // This transaction would be treated as duplicate (its derived signature
          // matched to one of already recorded signatures).
          // So, we must fetch a new blockhash for a different signature by disabling
          // our cache not to wait for the cache expiration (BLOCKHASH_CACHE_TIMEOUT_MS).
          disableCache = true;
        }
      }
    }
    const wireTransaction = transaction.serialize();
    return await this.sendRawTransaction(wireTransaction, options);
  }

  /**
   * Send a transaction that has already been signed and serialized into the
   * wire format
   */
  async sendRawTransaction(rawTransaction, options) {
    const encodedTransaction = encodeBase64WireData(toUint8ArrayView(rawTransaction));
    const result = await this.sendEncodedTransaction(encodedTransaction, options);
    return result;
  }

  /**
   * Send a transaction that has already been signed, serialized into the
   * wire format, and encoded as a base64 string
   */
  async sendEncodedTransaction(encodedTransaction, options) {
    const config = {
      encoding: 'base64'
    };
    const skipPreflight = options && options.skipPreflight;
    const preflightCommitment = skipPreflight === true ? 'processed' // FIXME Remove when https://github.com/anza-xyz/agave/pull/483 is deployed.
    : options && options.preflightCommitment || this.commitment;
    if (options && options.maxRetries != null) {
      config.maxRetries = options.maxRetries;
    }
    if (options && options.minContextSlot != null) {
      config.minContextSlot = options.minContextSlot;
    }
    if (skipPreflight) {
      config.skipPreflight = skipPreflight;
    }
    if (preflightCommitment) {
      config.preflightCommitment = preflightCommitment;
    }
    const args = [encodedTransaction, config];
    const unsafeRes = await this._rpcRequest('sendTransaction', args);
    const res = superstruct.create(unsafeRes, SendTransactionRpcResult);
    if ('error' in res) {
      let logs = undefined;
      if ('data' in res.error) {
        logs = res.error.data.logs;
      }
      throw new SendTransactionError({
        action: skipPreflight ? 'send' : 'simulate',
        signature: '',
        transactionMessage: res.error.message,
        logs: logs
      });
    }
    return res.result;
  }

  /**
   * @internal
   */
  _wsOnOpen() {
    this._rpcWebSocketConnected = true;
    this._rpcWebSocketHeartbeat = setInterval(() => {
      // Ping server every 5s to prevent idle timeouts
      (async () => {
        try {
          await this._rpcWebSocket.notify('ping');
          // eslint-disable-next-line no-empty
        } catch {}
      })();
    }, 5000);
    this._updateSubscriptions();
  }

  /**
   * @internal
   */
  _wsOnError(err) {
    this._rpcWebSocketConnected = false;
    console.error('ws error:', err.message);
  }

  /**
   * @internal
   */
  _wsOnClose(code) {
    this._rpcWebSocketConnected = false;
    this._rpcWebSocketGeneration = (this._rpcWebSocketGeneration + 1) % Number.MAX_SAFE_INTEGER;
    if (this._rpcWebSocketIdleTimeout) {
      clearTimeout(this._rpcWebSocketIdleTimeout);
      this._rpcWebSocketIdleTimeout = null;
    }
    if (this._rpcWebSocketHeartbeat) {
      clearInterval(this._rpcWebSocketHeartbeat);
      this._rpcWebSocketHeartbeat = null;
    }
    if (code === 1000) {
      // explicit close, check if any subscriptions have been made since close
      this._updateSubscriptions();
      return;
    }

    // implicit close, prepare subscriptions for auto-reconnect
    this._subscriptionCallbacksByServerSubscriptionId = {};
    Object.entries(this._subscriptionsByHash).forEach(([hash, subscription]) => {
      this._setSubscription(hash, {
        ...subscription,
        state: 'pending'
      });
    });
  }

  /**
   * @internal
   */
  _setSubscription(hash, nextSubscription) {
    const prevState = this._subscriptionsByHash[hash]?.state;
    this._subscriptionsByHash[hash] = nextSubscription;
    if (prevState !== nextSubscription.state) {
      const stateChangeCallbacks = this._subscriptionStateChangeCallbacksByHash[hash];
      if (stateChangeCallbacks) {
        stateChangeCallbacks.forEach(cb => {
          try {
            cb(nextSubscription.state);
            // eslint-disable-next-line no-empty
          } catch {}
        });
      }
    }
  }

  /**
   * @internal
   */
  _onSubscriptionStateChange(clientSubscriptionId, callback) {
    const hash = this._subscriptionHashByClientSubscriptionId[clientSubscriptionId];
    if (hash == null) {
      return () => {};
    }
    const stateChangeCallbacks = this._subscriptionStateChangeCallbacksByHash[hash] ||= new Set();
    stateChangeCallbacks.add(callback);
    return () => {
      stateChangeCallbacks.delete(callback);
      if (stateChangeCallbacks.size === 0) {
        delete this._subscriptionStateChangeCallbacksByHash[hash];
      }
    };
  }

  /**
   * @internal
   */
  async _updateSubscriptions() {
    if (Object.keys(this._subscriptionsByHash).length === 0) {
      if (this._rpcWebSocketConnected) {
        this._rpcWebSocketConnected = false;
        this._rpcWebSocketIdleTimeout = setTimeout(() => {
          this._rpcWebSocketIdleTimeout = null;
          try {
            this._rpcWebSocket.close();
          } catch (err) {
            // swallow error if socket has already been closed.
            if (err instanceof Error) {
              console.log(`Error when closing socket connection: ${err.message}`);
            }
          }
        }, 500);
      }
      return;
    }
    if (this._rpcWebSocketIdleTimeout !== null) {
      clearTimeout(this._rpcWebSocketIdleTimeout);
      this._rpcWebSocketIdleTimeout = null;
      this._rpcWebSocketConnected = true;
    }
    if (!this._rpcWebSocketConnected) {
      this._rpcWebSocket.connect();
      return;
    }
    const activeWebSocketGeneration = this._rpcWebSocketGeneration;
    const isCurrentConnectionStillActive = () => {
      return activeWebSocketGeneration === this._rpcWebSocketGeneration;
    };
    await Promise.all(
    // Don't be tempted to change this to `Object.entries`. We call
    // `_updateSubscriptions` recursively when processing the state,
    // so it's important that we look up the *current* version of
    // each subscription, every time we process a hash.
    Object.keys(this._subscriptionsByHash).map(async hash => {
      const subscription = this._subscriptionsByHash[hash];
      if (subscription === undefined) {
        // This entry has since been deleted. Skip.
        return;
      }
      switch (subscription.state) {
        case 'pending':
        case 'unsubscribed':
          if (subscription.callbacks.size === 0) {
            /**
             * You can end up here when:
             *
             * - a subscription has recently unsubscribed
             *   without having new callbacks added to it
             *   while the unsubscribe was in flight, or
             * - when a pending subscription has its
             *   listeners removed before a request was
             *   sent to the server.
             *
             * Being that nobody is interested in this
             * subscription any longer, delete it.
             */
            delete this._subscriptionsByHash[hash];
            if (subscription.state === 'unsubscribed') {
              delete this._subscriptionCallbacksByServerSubscriptionId[subscription.serverSubscriptionId];
            }
            await this._updateSubscriptions();
            return;
          }
          await (async () => {
            const {
              args,
              method
            } = subscription;
            try {
              this._setSubscription(hash, {
                ...subscription,
                state: 'subscribing'
              });
              const serverSubscriptionId = await this._rpcWebSocket.call(method, args);
              this._setSubscription(hash, {
                ...subscription,
                serverSubscriptionId,
                state: 'subscribed'
              });
              this._subscriptionCallbacksByServerSubscriptionId[serverSubscriptionId] = subscription.callbacks;
              await this._updateSubscriptions();
            } catch (e) {
              console.error(`Received ${e instanceof Error ? '' : 'JSON-RPC '}error calling \`${method}\``, {
                args,
                error: e
              });
              if (!isCurrentConnectionStillActive()) {
                return;
              }
              // TODO: Maybe add an 'errored' state or a retry limit?
              this._setSubscription(hash, {
                ...subscription,
                state: 'pending'
              });
              await this._updateSubscriptions();
            }
          })();
          break;
        case 'subscribed':
          if (subscription.callbacks.size === 0) {
            // By the time we successfully set up a subscription
            // with the server, the client stopped caring about it.
            // Tear it down now.
            await (async () => {
              const {
                serverSubscriptionId,
                unsubscribeMethod
              } = subscription;
              if (this._subscriptionsAutoDisposedByRpc.has(serverSubscriptionId)) {
                /**
                 * Special case.
                 * If we're dealing with a subscription that has been auto-
                 * disposed by the RPC, then we can skip the RPC call to
                 * tear down the subscription here.
                 *
                 * NOTE: There is a proposal to eliminate this special case, here:
                 * https://github.com/solana-labs/solana/issues/18892
                 */
                this._subscriptionsAutoDisposedByRpc.delete(serverSubscriptionId);
              } else {
                this._setSubscription(hash, {
                  ...subscription,
                  state: 'unsubscribing'
                });
                this._setSubscription(hash, {
                  ...subscription,
                  state: 'unsubscribing'
                });
                try {
                  await this._rpcWebSocket.call(unsubscribeMethod, [serverSubscriptionId]);
                } catch (e) {
                  if (e instanceof Error) {
                    console.error(`${unsubscribeMethod} error:`, e.message);
                  }
                  if (!isCurrentConnectionStillActive()) {
                    return;
                  }
                  // TODO: Maybe add an 'errored' state or a retry limit?
                  this._setSubscription(hash, {
                    ...subscription,
                    state: 'subscribed'
                  });
                  await this._updateSubscriptions();
                  return;
                }
              }
              this._setSubscription(hash, {
                ...subscription,
                state: 'unsubscribed'
              });
              await this._updateSubscriptions();
            })();
          }
          break;
      }
    }));
  }

  /**
   * @internal
   */
  _handleServerNotification(serverSubscriptionId, callbackArgs) {
    const callbacks = this._subscriptionCallbacksByServerSubscriptionId[serverSubscriptionId];
    if (callbacks === undefined) {
      return;
    }
    callbacks.forEach(cb => {
      try {
        cb(
        // I failed to find a way to convince TypeScript that `cb` is of type
        // `TCallback` which is certainly compatible with `Parameters<TCallback>`.
        // See https://github.com/microsoft/TypeScript/issues/47615
        // @ts-ignore
        ...callbackArgs);
      } catch (e) {
        console.error(e);
      }
    });
  }

  /**
   * @internal
   */
  _wsOnAccountNotification(notification) {
    const {
      result,
      subscription
    } = superstruct.create(notification, AccountNotificationResult);
    this._handleServerNotification(subscription, [result.value, result.context]);
  }

  /**
   * @internal
   */
  _makeSubscription(subscriptionConfig,
  /**
   * When preparing `args` for a call to `_makeSubscription`, be sure
   * to carefully apply a default `commitment` property, if necessary.
   *
   * - If the user supplied a `commitment` use that.
   * - Otherwise, if the `Connection::commitment` is set, use that.
   * - Otherwise, set it to the RPC server default: `finalized`.
   *
   * This is extremely important to ensure that these two fundamentally
   * identical subscriptions produce the same identifying hash:
   *
   * - A subscription made without specifying a commitment.
   * - A subscription made where the commitment specified is the same
   *   as the default applied to the subscription above.
   *
   * Example; these two subscriptions must produce the same hash:
   *
   * - An `accountSubscribe` subscription for `'PUBKEY'`
   * - An `accountSubscribe` subscription for `'PUBKEY'` with commitment
   *   `'finalized'`.
   *
   * See the 'making a subscription with defaulted params omitted' test
   * in `connection-subscriptions.ts` for more.
   */
  args) {
    const clientSubscriptionId = this._nextClientSubscriptionId++;
    const hash = fastStableStringify([subscriptionConfig.method, args]);
    const existingSubscription = this._subscriptionsByHash[hash];
    if (existingSubscription === undefined) {
      this._subscriptionsByHash[hash] = {
        ...subscriptionConfig,
        args,
        callbacks: new Set([subscriptionConfig.callback]),
        state: 'pending'
      };
    } else {
      existingSubscription.callbacks.add(subscriptionConfig.callback);
    }
    this._subscriptionHashByClientSubscriptionId[clientSubscriptionId] = hash;
    this._subscriptionDisposeFunctionsByClientSubscriptionId[clientSubscriptionId] = async () => {
      delete this._subscriptionDisposeFunctionsByClientSubscriptionId[clientSubscriptionId];
      delete this._subscriptionHashByClientSubscriptionId[clientSubscriptionId];
      const subscription = this._subscriptionsByHash[hash];
      assert(subscription !== undefined, `Could not find a \`Subscription\` when tearing down client subscription #${clientSubscriptionId}`);
      subscription.callbacks.delete(subscriptionConfig.callback);
      await this._updateSubscriptions();
    };
    this._updateSubscriptions();
    return clientSubscriptionId;
  }

  /**
   * Register a callback to be invoked whenever the specified account changes
   *
   * @param publicKey Public key of the account to monitor
   * @param callback Function to invoke whenever the account is changed
   * @param config
   * @return subscription id
   */

  /** @deprecated Instead, pass in an {@link AccountSubscriptionConfig} */
  // eslint-disable-next-line no-dupe-class-members

  // eslint-disable-next-line no-dupe-class-members
  onAccountChange(publicKey, callback, commitmentOrConfig) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const args = this._buildArgs([publicKey.toBase58()], commitment || this._commitment || 'finalized',
    // Apply connection/server default.
    'base64', config);
    return this._makeSubscription({
      callback,
      method: 'accountSubscribe',
      unsubscribeMethod: 'accountUnsubscribe'
    }, args);
  }

  /**
   * Deregister an account notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeAccountChangeListener(clientSubscriptionId) {
    await this._unsubscribeClientSubscription(clientSubscriptionId, 'account change');
  }

  /**
   * @internal
   */
  _wsOnProgramAccountNotification(notification) {
    const {
      result,
      subscription
    } = superstruct.create(notification, ProgramAccountNotificationResult);
    this._handleServerNotification(subscription, [{
      accountId: result.value.pubkey,
      accountInfo: result.value.account
    }, result.context]);
  }

  /**
   * Register a callback to be invoked whenever accounts owned by the
   * specified program change
   *
   * @param programId Public key of the program to monitor
   * @param callback Function to invoke whenever the account is changed
   * @param config
   * @return subscription id
   */

  /** @deprecated Instead, pass in a {@link ProgramAccountSubscriptionConfig} */
  // eslint-disable-next-line no-dupe-class-members

  // eslint-disable-next-line no-dupe-class-members
  onProgramAccountChange(programId, callback, commitmentOrConfig, maybeFilters) {
    const {
      commitment,
      config
    } = extractCommitmentFromConfig(commitmentOrConfig);
    const args = this._buildArgs([programId.toBase58()], commitment || this._commitment || 'finalized',
    // Apply connection/server default.
    'base64' /* encoding */, config ? config : maybeFilters ? {
      filters: applyDefaultMemcmpEncodingToFilters(maybeFilters)
    } : undefined /* extra */);
    return this._makeSubscription({
      callback,
      method: 'programSubscribe',
      unsubscribeMethod: 'programUnsubscribe'
    }, args);
  }

  /**
   * Deregister an account notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeProgramAccountChangeListener(clientSubscriptionId) {
    await this._unsubscribeClientSubscription(clientSubscriptionId, 'program account change');
  }

  /**
   * Registers a callback to be invoked whenever logs are emitted.
   */
  onLogs(filter, callback, commitment) {
    const args = this._buildArgs([typeof filter === 'object' ? {
      mentions: [filter.toString()]
    } : filter], commitment || this._commitment || 'finalized' // Apply connection/server default.
    );
    return this._makeSubscription({
      callback,
      method: 'logsSubscribe',
      unsubscribeMethod: 'logsUnsubscribe'
    }, args);
  }

  /**
   * Deregister a logs callback.
   *
   * @param clientSubscriptionId client subscription id to deregister.
   */
  async removeOnLogsListener(clientSubscriptionId) {
    await this._unsubscribeClientSubscription(clientSubscriptionId, 'logs');
  }

  /**
   * @internal
   */
  _wsOnLogsNotification(notification) {
    const {
      result,
      subscription
    } = superstruct.create(notification, LogsNotificationResult);
    this._handleServerNotification(subscription, [result.value, result.context]);
  }

  /**
   * @internal
   */
  _wsOnSlotNotification(notification) {
    const {
      result,
      subscription
    } = superstruct.create(notification, SlotNotificationResult);
    this._handleServerNotification(subscription, [result]);
  }

  /**
   * Register a callback to be invoked upon slot changes
   *
   * @param callback Function to invoke whenever the slot changes
   * @return subscription id
   */
  onSlotChange(callback) {
    return this._makeSubscription({
      callback,
      method: 'slotSubscribe',
      unsubscribeMethod: 'slotUnsubscribe'
    }, [] /* args */);
  }

  /**
   * Deregister a slot notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeSlotChangeListener(clientSubscriptionId) {
    await this._unsubscribeClientSubscription(clientSubscriptionId, 'slot change');
  }

  /**
   * @internal
   */
  _wsOnSlotUpdatesNotification(notification) {
    const {
      result,
      subscription
    } = superstruct.create(notification, SlotUpdateNotificationResult);
    this._handleServerNotification(subscription, [result]);
  }

  /**
   * Register a callback to be invoked upon slot updates. {@link SlotUpdate}'s
   * may be useful to track live progress of a cluster.
   *
   * @param callback Function to invoke whenever the slot updates
   * @return subscription id
   */
  onSlotUpdate(callback) {
    return this._makeSubscription({
      callback,
      method: 'slotsUpdatesSubscribe',
      unsubscribeMethod: 'slotsUpdatesUnsubscribe'
    }, [] /* args */);
  }

  /**
   * Deregister a slot update notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeSlotUpdateListener(clientSubscriptionId) {
    await this._unsubscribeClientSubscription(clientSubscriptionId, 'slot update');
  }

  /**
   * @internal
   */

  async _unsubscribeClientSubscription(clientSubscriptionId, subscriptionName) {
    const dispose = this._subscriptionDisposeFunctionsByClientSubscriptionId[clientSubscriptionId];
    if (dispose) {
      await dispose();
    } else {
      console.warn('Ignored unsubscribe request because an active subscription with id ' + `\`${clientSubscriptionId}\` for '${subscriptionName}' events ` + 'could not be found.');
    }
  }
  _buildArgs(args, override, encoding, extra) {
    const commitment = override || this._commitment;
    if (commitment || encoding || extra) {
      let options = {};
      if (encoding) {
        options.encoding = encoding;
      }
      if (commitment) {
        options.commitment = commitment;
      }
      if (extra) {
        options = Object.assign(options, extra);
      }
      args.push(options);
    }
    return args;
  }

  /**
   * @internal
   */
  _buildArgsAtLeastConfirmed(args, override, encoding, extra) {
    const commitment = override || this._commitment;
    if (commitment && !['confirmed', 'finalized'].includes(commitment)) {
      throw new Error('Using Connection with default commitment: `' + this._commitment + '`, but method requires at least `confirmed`');
    }
    return this._buildArgs(args, override, encoding, extra);
  }

  /**
   * @internal
   */
  _wsOnSignatureNotification(notification) {
    const {
      result,
      subscription
    } = superstruct.create(notification, SignatureNotificationResult);
    if (result.value !== 'receivedSignature') {
      /**
       * Special case.
       * After a signature is processed, RPCs automatically dispose of the
       * subscription on the server side. We need to track which of these
       * subscriptions have been disposed in such a way, so that we know
       * whether the client is dealing with a not-yet-processed signature
       * (in which case we must tear down the server subscription) or an
       * already-processed signature (in which case the client can simply
       * clear out the subscription locally without telling the server).
       *
       * NOTE: There is a proposal to eliminate this special case, here:
       * https://github.com/solana-labs/solana/issues/18892
       */
      this._subscriptionsAutoDisposedByRpc.add(subscription);
    }
    this._handleServerNotification(subscription, result.value === 'receivedSignature' ? [{
      type: 'received'
    }, result.context] : [{
      type: 'status',
      result: result.value
    }, result.context]);
  }

  /**
   * Register a callback to be invoked upon signature updates
   *
   * @param signature Transaction signature string in base 58
   * @param callback Function to invoke on signature notifications
   * @param commitment Specify the commitment level signature must reach before notification
   * @return subscription id
   */
  onSignature(signature, callback, commitment) {
    const args = this._buildArgs([signature], commitment || this._commitment || 'finalized' // Apply connection/server default.
    );
    const clientSubscriptionId = this._makeSubscription({
      callback: (notification, context) => {
        if (notification.type === 'status') {
          callback(notification.result, context);
          // Signatures subscriptions are auto-removed by the RPC service
          // so no need to explicitly send an unsubscribe message.
          try {
            this.removeSignatureListener(clientSubscriptionId);
            // eslint-disable-next-line no-empty
          } catch (_err) {
            // Already removed.
          }
        }
      },
      method: 'signatureSubscribe',
      unsubscribeMethod: 'signatureUnsubscribe'
    }, args);
    return clientSubscriptionId;
  }

  /**
   * Register a callback to be invoked when a transaction is
   * received and/or processed.
   *
   * @param signature Transaction signature string in base 58
   * @param callback Function to invoke on signature notifications
   * @param options Enable received notifications and set the commitment
   *   level that signature must reach before notification
   * @return subscription id
   */
  onSignatureWithOptions(signature, callback, options) {
    const {
      commitment,
      ...extra
    } = {
      ...options,
      commitment: options && options.commitment || this._commitment || 'finalized' // Apply connection/server default.
    };
    const args = this._buildArgs([signature], commitment, undefined /* encoding */, extra);
    const clientSubscriptionId = this._makeSubscription({
      callback: (notification, context) => {
        callback(notification, context);
        // Signatures subscriptions are auto-removed by the RPC service
        // so no need to explicitly send an unsubscribe message.
        try {
          this.removeSignatureListener(clientSubscriptionId);
          // eslint-disable-next-line no-empty
        } catch (_err) {
          // Already removed.
        }
      },
      method: 'signatureSubscribe',
      unsubscribeMethod: 'signatureUnsubscribe'
    }, args);
    return clientSubscriptionId;
  }

  /**
   * Deregister a signature notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeSignatureListener(clientSubscriptionId) {
    await this._unsubscribeClientSubscription(clientSubscriptionId, 'signature result');
  }

  /**
   * @internal
   */
  _wsOnRootNotification(notification) {
    const {
      result,
      subscription
    } = superstruct.create(notification, RootNotificationResult);
    this._handleServerNotification(subscription, [result]);
  }

  /**
   * Register a callback to be invoked upon root changes
   *
   * @param callback Function to invoke whenever the root changes
   * @return subscription id
   */
  onRootChange(callback) {
    return this._makeSubscription({
      callback,
      method: 'rootSubscribe',
      unsubscribeMethod: 'rootUnsubscribe'
    }, [] /* args */);
  }

  /**
   * Deregister a root notification callback
   *
   * @param clientSubscriptionId client subscription id to deregister
   */
  async removeRootChangeListener(clientSubscriptionId) {
    await this._unsubscribeClientSubscription(clientSubscriptionId, 'root change');
  }
}

/**
 * Keypair signer interface
 */
var _keypair = /*#__PURE__*/_classPrivateFieldLooseKey__default.default("keypair");
var _privateKeyBytes = /*#__PURE__*/_classPrivateFieldLooseKey__default.default("privateKeyBytes");
var _publicKeyBytes = /*#__PURE__*/_classPrivateFieldLooseKey__default.default("publicKeyBytes");
/**
 * An account keypair backed by WebCrypto.
 */
class Keypair {
  constructor(keypair, privateKeyBytes, publicKeyBytes) {
    Object.defineProperty(this, _keypair, {
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, _privateKeyBytes, {
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, _publicKeyBytes, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldLooseBase__default.default(this, _keypair)[_keypair] = keypair;
    _classPrivateFieldLooseBase__default.default(this, _privateKeyBytes)[_privateKeyBytes] = privateKeyBytes;
    _classPrivateFieldLooseBase__default.default(this, _publicKeyBytes)[_publicKeyBytes] = publicKeyBytes;
  }

  /**
   * Generate a new random keypair
   *
   * @returns {Promise<Keypair>} Keypair
   */
  static async generate() {
    const privateKeyBytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(privateKeyBytes);
    return this.fromSeed(privateKeyBytes);
  }

  /**
   * Create a keypair from a raw 64-byte secret key byte array.
   */
  static async fromSecretKey(secretKey) {
    const packedSecretKey = Uint8Array.from(secretKey);
    const keypair = await createKeyPairFromBytes(packedSecretKey);
    const publicKeyBytes = await exportCryptoKeyBytes(keypair.publicKey);
    return new Keypair(keypair, packedSecretKey.slice(0, 32), publicKeyBytes);
  }

  /**
   * Create a keypair from a 32-byte seed.
   */
  static async fromSeed(seed) {
    const packedSeed = Uint8Array.from(seed);
    const keypair = await createKeyPairFromPrivateKeyBytes(packedSeed);
    const publicKeyBytes = await exportCryptoKeyBytes(keypair.publicKey);
    return new Keypair(keypair, packedSeed, publicKeyBytes);
  }

  /**
   * The public key for this keypair
   *
   * @returns {Address} Address
   */
  get publicKey() {
    return new Address(_classPrivateFieldLooseBase__default.default(this, _publicKeyBytes)[_publicKeyBytes]);
  }

  /**
   * Returns this keypair's secret key bytes.
   */
  get secretKey() {
    const secretKey = new Uint8Array(64);
    secretKey.set(_classPrivateFieldLooseBase__default.default(this, _privateKeyBytes)[_privateKeyBytes]);
    secretKey.set(_classPrivateFieldLooseBase__default.default(this, _publicKeyBytes)[_publicKeyBytes], 32);
    return secretKey;
  }

  /**
   * Sign a message using this keypair.
   */
  async signBytes(message) {
    const privateKey = _classPrivateFieldLooseBase__default.default(this, _keypair)[_keypair].privateKey;
    const signMessage = toPackedUint8Array(message);
    return signBytes(privateKey, signMessage);
  }

  /**
   * Verify a signature using this keypair's public key.
   */
  async verifySignature(signature, message) {
    const publicKey = _classPrivateFieldLooseBase__default.default(this, _keypair)[_keypair].publicKey;
    const verifySignatureBytes = signatureBytes(toPackedUint8Array(signature));
    const verifyMessage = toPackedUint8Array(message);
    return verifySignature(publicKey, verifySignatureBytes, verifyMessage);
  }
}
async function exportCryptoKeyBytes(key) {
  assertKeyExporterIsAvailable();
  const rawKey = await globalThis.crypto.subtle.exportKey('raw', key);
  return new Uint8Array(rawKey);
}

/**
 * An enumeration of valid LookupTableInstructionType's
 */

const ADDRESS_LOOKUP_TABLE_PROGRAM_ID = new Address('AddressLookupTab1e1111111111111111111111111');
const U8_CODEC$3 = codecsNumbers.getU8Codec();
const U32_CODEC$4 = codecsNumbers.getU32Codec();
const U64_CODEC$4 = codecsNumbers.getU64Codec();
const PUBLIC_KEY_BYTES_CODEC$2 = fixCodecSize(getBytesCodec(), 32);
const PUBLIC_KEY_CODEC$1 = transformCodec(PUBLIC_KEY_BYTES_CODEC$2, value => value.toBytes(), bytes => new Address(bytes));
const PUBLIC_KEY_ARRAY_CODEC = getArrayCodec(PUBLIC_KEY_CODEC$1, {
  size: U64_CODEC$4
});
const INSTRUCTION_DEFS$2 = {
  CreateLookupTable: {
    index: 0,
    codec: getStructCodec([['instruction', U32_CODEC$4], ['recentSlot', U64_CODEC$4], ['bumpSeed', U8_CODEC$3]])
  },
  FreezeLookupTable: {
    index: 1,
    codec: getStructCodec([['instruction', U32_CODEC$4]])
  },
  ExtendLookupTable: {
    index: 2,
    codec: getStructCodec([['instruction', U32_CODEC$4], ['addresses', PUBLIC_KEY_ARRAY_CODEC]])
  },
  DeactivateLookupTable: {
    index: 3,
    codec: getStructCodec([['instruction', U32_CODEC$4]])
  },
  CloseLookupTable: {
    index: 4,
    codec: getStructCodec([['instruction', U32_CODEC$4]])
  }
};

/**
 * @internal
 */
const LOOKUP_TABLE_INSTRUCTIONS = ProgramInstructions.create({
  programId: ADDRESS_LOOKUP_TABLE_PROGRAM_ID,
  instructionIndexCodec: U32_CODEC$4,
  instructions: INSTRUCTION_DEFS$2
});
const INSTRUCTIONS$3 = LOOKUP_TABLE_INSTRUCTIONS;

/**
 * An enumeration of valid address lookup table InstructionType's
 * @internal
 * @deprecated use LOOKUP_TABLE_INSTRUCTIONS instead. To be removed in v3
 */
const LOOKUP_TABLE_INSTRUCTION_LAYOUTS = Object.freeze({
  CreateLookupTable: {
    index: 0,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), u64('recentSlot'), BufferLayout__namespace.u8('bumpSeed')])
  },
  FreezeLookupTable: {
    index: 1,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])
  },
  ExtendLookupTable: {
    index: 2,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), u64(), BufferLayout__namespace.seq(publicKey(), BufferLayout__namespace.offset(BufferLayout__namespace.u32(), -8), 'addresses')])
  },
  DeactivateLookupTable: {
    index: 3,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])
  },
  CloseLookupTable: {
    index: 4,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])
  }
});
class AddressLookupTableInstruction {
  /**
   * @internal
   */
  constructor() {}
  static decodeInstructionType(instruction) {
    this.checkProgramId(instruction.programId);
    return INSTRUCTIONS$3.getInstructionType(instruction);
  }
  static decodeCreateLookupTable(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeysLength(instruction.keys, 4);
    const {
      recentSlot
    } = INSTRUCTIONS$3.CreateLookupTable.decode(instruction);
    return {
      authority: instruction.keys[1].pubkey,
      payer: instruction.keys[2].pubkey,
      recentSlot: Number(recentSlot)
    };
  }
  static decodeExtendLookupTable(instruction) {
    this.checkProgramId(instruction.programId);
    if (instruction.keys.length < 2) {
      throw new Error(`invalid instruction; found ${instruction.keys.length} keys, expected at least 2`);
    }
    const {
      addresses
    } = INSTRUCTIONS$3.ExtendLookupTable.decode(instruction);
    return {
      lookupTable: instruction.keys[0].pubkey,
      authority: instruction.keys[1].pubkey,
      payer: instruction.keys.length > 2 ? instruction.keys[2].pubkey : undefined,
      addresses
    };
  }
  static decodeCloseLookupTable(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeysLength(instruction.keys, 3);
    return {
      lookupTable: instruction.keys[0].pubkey,
      authority: instruction.keys[1].pubkey,
      recipient: instruction.keys[2].pubkey
    };
  }
  static decodeFreezeLookupTable(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeysLength(instruction.keys, 2);
    return {
      lookupTable: instruction.keys[0].pubkey,
      authority: instruction.keys[1].pubkey
    };
  }
  static decodeDeactivateLookupTable(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeysLength(instruction.keys, 2);
    return {
      lookupTable: instruction.keys[0].pubkey,
      authority: instruction.keys[1].pubkey
    };
  }

  /**
   * @internal
   */
  static checkProgramId(programId) {
    if (!programId.equals(AddressLookupTableProgram.programId)) {
      throw new Error('invalid instruction; programId is not AddressLookupTable Program');
    }
  }
  /**
   * @internal
   */
  static checkKeysLength(keys, expectedLength) {
    if (keys.length < expectedLength) {
      throw new Error(`invalid instruction; found ${keys.length} keys, expected at least ${expectedLength}`);
    }
  }
}
class AddressLookupTableProgram {
  /**
   * @internal
   */
  constructor() {}
  static createLookupTable(params) {
    const [lookupTableAddress, bumpSeed] = Address.findProgramAddressSync([params.authority.toBytes(), codecsNumbers.getU64Encoder().encode(params.recentSlot)], this.programId);
    const keys = [{
      pubkey: lookupTableAddress,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: params.authority,
      isSigner: true,
      isWritable: false
    }, {
      pubkey: params.payer,
      isSigner: true,
      isWritable: true
    }, {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false
    }];
    const instruction = INSTRUCTIONS$3.CreateLookupTable.build({
      recentSlot: BigInt(params.recentSlot),
      bumpSeed: bumpSeed
    }, {
      keys
    });
    return [instruction, lookupTableAddress];
  }
  static freezeLookupTable(params) {
    const keys = [{
      pubkey: params.lookupTable,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: params.authority,
      isSigner: true,
      isWritable: false
    }];
    return INSTRUCTIONS$3.FreezeLookupTable.build(params, {
      keys
    });
  }
  static extendLookupTable(params) {
    const keys = [{
      pubkey: params.lookupTable,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: params.authority,
      isSigner: true,
      isWritable: false
    }];
    if (params.payer) {
      keys.push({
        pubkey: params.payer,
        isSigner: true,
        isWritable: true
      }, {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false
      });
    }
    return INSTRUCTIONS$3.ExtendLookupTable.build(params, {
      keys
    });
  }
  static deactivateLookupTable(params) {
    const keys = [{
      pubkey: params.lookupTable,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: params.authority,
      isSigner: true,
      isWritable: false
    }];
    return INSTRUCTIONS$3.DeactivateLookupTable.build(params, {
      keys
    });
  }
  static closeLookupTable(params) {
    const keys = [{
      pubkey: params.lookupTable,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: params.authority,
      isSigner: true,
      isWritable: false
    }, {
      pubkey: params.recipient,
      isSigner: false,
      isWritable: true
    }];
    return INSTRUCTIONS$3.CloseLookupTable.build(params, {
      keys
    });
  }
}
AddressLookupTableProgram.programId = ADDRESS_LOOKUP_TABLE_PROGRAM_ID;

const COMPUTE_BUDGET_PROGRAM_ID = new Address('ComputeBudget111111111111111111111111111111');
const U8_CODEC$2 = codecsNumbers.getU8Codec();
const U32_CODEC$3 = codecsNumbers.getU32Codec();
const U64_CODEC$3 = codecsNumbers.getU64Codec();

/**
 * An enumeration of valid ComputeBudgetInstructionType's
 */

/**
 * Request units instruction params
 */

/**
 * Request heap frame instruction params
 */

/**
 * Set compute unit limit instruction params
 */

/**
 * Set compute unit price instruction params
 */

const INSTRUCTION_DEFS$1 = {
  RequestUnits: {
    index: 0,
    codec: getStructCodec([['instruction', U8_CODEC$2], ['units', U32_CODEC$3], ['additionalFee', U32_CODEC$3]])
  },
  RequestHeapFrame: {
    index: 1,
    codec: getStructCodec([['instruction', U8_CODEC$2], ['bytes', U32_CODEC$3]])
  },
  SetComputeUnitLimit: {
    index: 2,
    codec: getStructCodec([['instruction', U8_CODEC$2], ['units', U32_CODEC$3]])
  },
  SetComputeUnitPrice: {
    index: 3,
    codec: getStructCodec([['instruction', U8_CODEC$2], ['microLamports', U64_CODEC$3]])
  }
};

/**
 * @internal
 */
const COMPUTE_BUDGET_INSTRUCTIONS = ProgramInstructions.create({
  programId: COMPUTE_BUDGET_PROGRAM_ID,
  instructionIndexCodec: U8_CODEC$2,
  instructions: INSTRUCTION_DEFS$1
});
const INSTRUCTIONS$2 = COMPUTE_BUDGET_INSTRUCTIONS;

/**
 * An enumeration of valid ComputeBudget InstructionType's
 * @deprecated Use compute budget instruction codecs instead. To be removed in v3
 * @internal
 */
const COMPUTE_BUDGET_INSTRUCTION_LAYOUTS = Object.freeze({
  RequestUnits: {
    index: 0,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u8('instruction'), BufferLayout__namespace.u32('units'), BufferLayout__namespace.u32('additionalFee')])
  },
  RequestHeapFrame: {
    index: 1,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u8('instruction'), BufferLayout__namespace.u32('bytes')])
  },
  SetComputeUnitLimit: {
    index: 2,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u8('instruction'), BufferLayout__namespace.u32('units')])
  },
  SetComputeUnitPrice: {
    index: 3,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u8('instruction'), u64('microLamports')])
  }
});

/**
 * Factory class for transaction instructions to interact with the Compute Budget program
 */
class ComputeBudgetProgram {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the Compute Budget program
   */

  /**
   * @deprecated Instead, call {@link setComputeUnitLimit} and/or {@link setComputeUnitPrice}
   */
  static requestUnits(params) {
    return INSTRUCTIONS$2.RequestUnits.build(params);
  }
  static requestHeapFrame(params) {
    return INSTRUCTIONS$2.RequestHeapFrame.build(params);
  }
  static setComputeUnitLimit(params) {
    return INSTRUCTIONS$2.SetComputeUnitLimit.build(params);
  }
  static setComputeUnitPrice(params) {
    return INSTRUCTIONS$2.SetComputeUnitPrice.build(params);
  }
}
ComputeBudgetProgram.programId = COMPUTE_BUDGET_PROGRAM_ID;

const PRIVATE_KEY_BYTES$1 = 64;
const PUBLIC_KEY_BYTES$1 = 32;
const SIGNATURE_BYTES$1 = 64;

/**
 * Params for creating an ed25519 instruction using a public key
 */

/**
 * Params for creating an ed25519 instruction using a private key
 */

const ED25519_INSTRUCTION_HEADER_ENCODER = getStructEncoder([['numSignatures', codecsNumbers.getU8Encoder()], ['padding', codecsNumbers.getU8Encoder()], ['signatureOffset', codecsNumbers.getU16Encoder()], ['signatureInstructionIndex', codecsNumbers.getU16Encoder()], ['publicKeyOffset', codecsNumbers.getU16Encoder()], ['publicKeyInstructionIndex', codecsNumbers.getU16Encoder()], ['messageDataOffset', codecsNumbers.getU16Encoder()], ['messageDataSize', codecsNumbers.getU16Encoder()], ['messageInstructionIndex', codecsNumbers.getU16Encoder()]]);
class Ed25519Program {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the ed25519 program
   */

  /**
   * Create an ed25519 instruction with a public key and signature. The
   * public key must be 32 bytes long, and the signature must be 64 bytes
   * long.
   */
  static createInstructionWithPublicKey(params) {
    const {
      publicKey,
      message,
      signature,
      instructionIndex
    } = params;
    assert(publicKey.length === PUBLIC_KEY_BYTES$1, `Public Key must be ${PUBLIC_KEY_BYTES$1} bytes but received ${publicKey.length} bytes`);
    assert(signature.length === SIGNATURE_BYTES$1, `Signature must be ${SIGNATURE_BYTES$1} bytes but received ${signature.length} bytes`);
    const publicKeyOffset = ED25519_INSTRUCTION_HEADER_ENCODER.fixedSize;
    const signatureOffset = publicKeyOffset + publicKey.length;
    const messageDataOffset = signatureOffset + signature.length;
    const numSignatures = 1;
    const index = instructionIndex == null ? 0xffff // An index of `u16::MAX` makes it default to the current instruction.
    : instructionIndex;
    const instructionData = new Uint8Array(messageDataOffset + message.length);
    ED25519_INSTRUCTION_HEADER_ENCODER.write({
      numSignatures,
      padding: 0,
      signatureOffset,
      signatureInstructionIndex: index,
      publicKeyOffset,
      publicKeyInstructionIndex: index,
      messageDataOffset,
      messageDataSize: message.length,
      messageInstructionIndex: index
    }, instructionData, 0);
    instructionData.set(publicKey, publicKeyOffset);
    instructionData.set(signature, signatureOffset);
    instructionData.set(message, messageDataOffset);
    return new TransactionInstruction({
      keys: [],
      programId: Ed25519Program.programId,
      data: instructionData
    });
  }

  /**
   * Create an ed25519 instruction with a private key. The private key
   * must be 64 bytes long.
   */
  static async createInstructionWithPrivateKey(params) {
    const {
      privateKey,
      message,
      instructionIndex
    } = params;
    assert(privateKey.length === PRIVATE_KEY_BYTES$1, `Private key must be ${PRIVATE_KEY_BYTES$1} bytes but received ${privateKey.length} bytes`);
    try {
      const keypair = await Keypair.fromSecretKey(privateKey);
      const publicKey = await keypair.publicKey.toBytes();
      const signature = sign(message, privateKey);
      return this.createInstructionWithPublicKey({
        publicKey,
        message,
        signature,
        instructionIndex
      });
    } catch (error) {
      throw new Error(`Error creating instruction; ${error}`);
    }
  }
}
Ed25519Program.programId = new Address('Ed25519SigVerify111111111111111111111111111');

const ecdsaSign = (msgHash, privKey) => {
  const signature = secp256k1.secp256k1.sign(msgHash, privKey);
  return [signature.toCompactRawBytes(), signature.recovery];
};
secp256k1.secp256k1.utils.isValidPrivateKey;
const publicKeyCreate = secp256k1.secp256k1.getPublicKey;

const PRIVATE_KEY_BYTES = 32;
const ETHEREUM_ADDRESS_BYTES = 20;
const PUBLIC_KEY_BYTES = 64;
const SIGNATURE_BYTES = 64;
const SIGNATURE_OFFSETS_SERIALIZED_SIZE = 11;
const BASE16_ENCODER = getBase16Encoder();
const ETHEREUM_ADDRESS_STRING_PATTERN = /^(?:0x)?([0-9a-fA-F]{40})$/;

/**
 * Params for creating an secp256k1 instruction using a public key
 */

/**
 * Params for creating an secp256k1 instruction using an Ethereum address
 */

/**
 * Params for creating an secp256k1 instruction using a private key
 */

const SECP256K1_INSTRUCTION_DATA_ENCODER = getStructEncoder([['numSignatures', codecsNumbers.getU8Encoder()], ['signatureOffset', codecsNumbers.getU16Encoder()], ['signatureInstructionIndex', codecsNumbers.getU8Encoder()], ['ethAddressOffset', codecsNumbers.getU16Encoder()], ['ethAddressInstructionIndex', codecsNumbers.getU8Encoder()], ['messageDataOffset', codecsNumbers.getU16Encoder()], ['messageDataSize', codecsNumbers.getU16Encoder()], ['messageInstructionIndex', codecsNumbers.getU8Encoder()], ['ethAddress', fixEncoderSize(getBytesEncoder(), ETHEREUM_ADDRESS_BYTES)], ['signature', fixEncoderSize(getBytesEncoder(), SIGNATURE_BYTES)], ['recoveryId', codecsNumbers.getU8Encoder()]]);
class Secp256k1Program {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the secp256k1 program
   */

  /**
   * Construct an Ethereum address from a secp256k1 public key.
   * @param {Uint8Array | Array<number>} publicKey a 64 byte
   * secp256k1 public key
   */
  static publicKeyToEthAddress(publicKey) {
    const publicKeyBytes = toPackedUint8Array(publicKey);
    assert(publicKeyBytes.length === PUBLIC_KEY_BYTES, `Public key must be ${PUBLIC_KEY_BYTES} bytes but received ${publicKeyBytes.length} bytes`);
    try {
      return sha3.keccak_256(publicKeyBytes).slice(-ETHEREUM_ADDRESS_BYTES);
    } catch (error) {
      throw new Error(`Error constructing Ethereum address: ${error}`);
    }
  }

  /**
   * Create an secp256k1 instruction with a public key. The public key
   * must be 64 bytes long.
   */
  static createInstructionWithPublicKey(params) {
    const {
      publicKey,
      message,
      signature,
      recoveryId,
      instructionIndex
    } = params;
    return Secp256k1Program.createInstructionWithEthAddress({
      ethAddress: Secp256k1Program.publicKeyToEthAddress(publicKey),
      message,
      signature,
      recoveryId,
      instructionIndex
    });
  }

  /**
   * Create an secp256k1 instruction with an Ethereum address. The address
   * must be a hex string or 20 raw bytes.
   */
  static createInstructionWithEthAddress(params) {
    const {
      ethAddress: rawAddress,
      message,
      signature,
      recoveryId,
      instructionIndex = 0
    } = params;
    const messageBytes = toUint8ArrayView(message);
    const signatureBytes = toUint8ArrayView(signature);
    let ethAddressBytes;
    if (typeof rawAddress === 'string') {
      const addressMatch = ETHEREUM_ADDRESS_STRING_PATTERN.exec(rawAddress);
      assert(addressMatch, `Address must be a ${ETHEREUM_ADDRESS_BYTES * 2}-character hex string with an optional 0x prefix`);
      ethAddressBytes = new Uint8Array(BASE16_ENCODER.encode(addressMatch[1]));
    } else {
      ethAddressBytes = toUint8ArrayView(rawAddress);
    }
    assert(ethAddressBytes.length === ETHEREUM_ADDRESS_BYTES, `Address must be ${ETHEREUM_ADDRESS_BYTES} bytes but received ${ethAddressBytes.length} bytes`);
    assert(signatureBytes.length === SIGNATURE_BYTES, `Signature must be ${SIGNATURE_BYTES} bytes but received ${signatureBytes.length} bytes`);
    const dataStart = 1 + SIGNATURE_OFFSETS_SERIALIZED_SIZE;
    const ethAddressOffset = dataStart;
    const signatureOffset = dataStart + ethAddressBytes.length;
    const messageDataOffset = signatureOffset + SIGNATURE_BYTES + 1;
    const numSignatures = 1;
    const instructionData = new Uint8Array(SECP256K1_INSTRUCTION_DATA_ENCODER.fixedSize + messageBytes.length);
    SECP256K1_INSTRUCTION_DATA_ENCODER.write({
      numSignatures,
      signatureOffset,
      signatureInstructionIndex: instructionIndex,
      ethAddressOffset,
      ethAddressInstructionIndex: instructionIndex,
      messageDataOffset,
      messageDataSize: messageBytes.length,
      messageInstructionIndex: instructionIndex,
      signature: signatureBytes,
      ethAddress: ethAddressBytes,
      recoveryId
    }, instructionData, 0);
    instructionData.set(messageBytes, SECP256K1_INSTRUCTION_DATA_ENCODER.fixedSize);
    return new TransactionInstruction({
      keys: [],
      programId: Secp256k1Program.programId,
      data: instructionData
    });
  }

  /**
   * Create an secp256k1 instruction with a private key. The private key
   * must be 32 bytes long.
   */
  static createInstructionWithPrivateKey(params) {
    const {
      privateKey: pkey,
      message,
      instructionIndex
    } = params;
    const privateKey = toPackedUint8Array(pkey);
    const messageBytes = toPackedUint8Array(message);
    assert(privateKey.length === PRIVATE_KEY_BYTES, `Private key must be ${PRIVATE_KEY_BYTES} bytes but received ${privateKey.length} bytes`);
    try {
      const publicKey = publicKeyCreate(privateKey, false /* isCompressed */).slice(1); // throw away leading byte
      const messageHash = sha3.keccak_256(messageBytes);
      const [signature, recoveryId] = ecdsaSign(messageHash, privateKey);
      return this.createInstructionWithPublicKey({
        publicKey,
        message: messageBytes,
        signature,
        recoveryId,
        instructionIndex
      });
    } catch (error) {
      throw new Error(`Error creating instruction; ${error}`);
    }
  }
}
Secp256k1Program.programId = new Address('KeccakSecp256k11111111111111111111111111111');

var _Lockup;

/**
 * Address of the stake config account which configures the rate
 * of stake warmup and cooldown as well as the slashing penalty.
 */
const STAKE_CONFIG_ID = new Address('StakeConfig11111111111111111111111111111111');
const STAKE_PROGRAM_ID = new Address('Stake11111111111111111111111111111111111111');
const U32_CODEC$2 = codecsNumbers.getU32Codec();
const U64_CODEC$2 = codecsNumbers.getU64Codec();
const I64_NUMBER_CODEC$1 = transformCodec(codecsNumbers.getI64Codec(), value => BigInt(value), value => Number(value));
const PUBLIC_KEY_BYTES_CODEC$1 = transformCodec(fixCodecSize(getBytesCodec(), 32), value => value, value => new Uint8Array(value));
const getRustStringCodec$1 = () => addCodecSizePrefix(getUtf8Codec(), U64_CODEC$2);
const RUST_STRING_CODEC$1 = getRustStringCodec$1();
const AUTHORIZED_CODEC = getStructCodec([['staker', PUBLIC_KEY_BYTES_CODEC$1], ['withdrawer', PUBLIC_KEY_BYTES_CODEC$1]]);
const LOCKUP_CODEC = getStructCodec([['unixTimestamp', I64_NUMBER_CODEC$1], ['epoch', I64_NUMBER_CODEC$1], ['custodian', PUBLIC_KEY_BYTES_CODEC$1]]);

/**
 * Stake account authority info
 */
class Authorized {
  /**
   * Create a new Authorized object
   * @param staker the stake authority
   * @param withdrawer the withdraw authority
   */
  constructor(staker, withdrawer) {
    /** stake authority */
    this.staker = void 0;
    /** withdraw authority */
    this.withdrawer = void 0;
    this.staker = staker;
    this.withdrawer = withdrawer;
  }
}
/**
 * Stake account lockup info
 */
class Lockup {
  /**
   * Create a new Lockup object
   */
  constructor(unixTimestamp, epoch, custodian) {
    /** Unix timestamp of lockup expiration */
    this.unixTimestamp = void 0;
    /** Epoch of lockup expiration */
    this.epoch = void 0;
    /** Lockup custodian authority */
    this.custodian = void 0;
    this.unixTimestamp = unixTimestamp;
    this.epoch = epoch;
    this.custodian = custodian;
  }

  /**
   * Default, inactive Lockup value
   */
}
_Lockup = Lockup;
Lockup.default = new _Lockup(0, 0, Address.default);
/**
 * Create stake account transaction params
 */
/**
 * Create stake account with seed transaction params
 */
/**
 * Initialize stake instruction params
 */
/**
 * Delegate stake instruction params
 */
/**
 * Authorize stake instruction params
 */
/**
 * Authorize stake instruction params using a derived key
 */
/**
 * Split stake instruction params
 */
/**
 * Split with seed transaction params
 */
/**
 * Withdraw stake instruction params
 */
/**
 * Deactivate stake instruction params
 */
/**
 * Merge stake instruction params
 */
/**
 * Stake Instruction class
 */
class StakeInstruction {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Decode a stake instruction and retrieve the instruction type.
   */
  static decodeInstructionType(instruction) {
    this.checkProgramId(instruction.programId);
    return INSTRUCTIONS$1.getInstructionType(instruction);
  }

  /**
   * Decode a initialize stake instruction and retrieve the instruction params.
   */
  static decodeInitialize(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);
    const {
      authorized,
      lockup
    } = INSTRUCTIONS$1.Initialize.decode(instruction);
    return {
      stakePubkey: instruction.keys[0].pubkey,
      authorized: new Authorized(new Address(authorized.staker), new Address(authorized.withdrawer)),
      lockup: new Lockup(lockup.unixTimestamp, lockup.epoch, new Address(lockup.custodian))
    };
  }

  /**
   * Decode a delegate stake instruction and retrieve the instruction params.
   */
  static decodeDelegate(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 6);
    INSTRUCTIONS$1.Delegate.decode(instruction);
    return {
      stakePubkey: instruction.keys[0].pubkey,
      votePubkey: instruction.keys[1].pubkey,
      authorizedPubkey: instruction.keys[5].pubkey
    };
  }

  /**
   * Decode an authorize stake instruction and retrieve the instruction params.
   */
  static decodeAuthorize(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    const {
      newAuthorized,
      stakeAuthorizationType
    } = INSTRUCTIONS$1.Authorize.decode(instruction);
    const o = {
      stakePubkey: instruction.keys[0].pubkey,
      authorizedPubkey: instruction.keys[2].pubkey,
      newAuthorizedPubkey: new Address(newAuthorized),
      stakeAuthorizationType: {
        index: stakeAuthorizationType
      }
    };
    if (instruction.keys.length > 3) {
      o.custodianPubkey = instruction.keys[3].pubkey;
    }
    return o;
  }

  /**
   * Decode an authorize-with-seed stake instruction and retrieve the instruction params.
   */
  static decodeAuthorizeWithSeed(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);
    const {
      newAuthorized,
      stakeAuthorizationType,
      authoritySeed,
      authorityOwner
    } = INSTRUCTIONS$1.AuthorizeWithSeed.decode(instruction);
    const o = {
      stakePubkey: instruction.keys[0].pubkey,
      authorityBase: instruction.keys[1].pubkey,
      authoritySeed: authoritySeed,
      authorityOwner: new Address(authorityOwner),
      newAuthorizedPubkey: new Address(newAuthorized),
      stakeAuthorizationType: {
        index: stakeAuthorizationType
      }
    };
    if (instruction.keys.length > 3) {
      o.custodianPubkey = instruction.keys[3].pubkey;
    }
    return o;
  }

  /**
   * Decode a split stake instruction and retrieve the instruction params.
   */
  static decodeSplit(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    const {
      lamports
    } = INSTRUCTIONS$1.Split.decode(instruction);
    return {
      stakePubkey: instruction.keys[0].pubkey,
      splitStakePubkey: instruction.keys[1].pubkey,
      authorizedPubkey: instruction.keys[2].pubkey,
      lamports
    };
  }

  /**
   * Decode a merge stake instruction and retrieve the instruction params.
   */
  static decodeMerge(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    INSTRUCTIONS$1.Merge.decode(instruction);
    return {
      stakePubkey: instruction.keys[0].pubkey,
      sourceStakePubKey: instruction.keys[1].pubkey,
      authorizedPubkey: instruction.keys[4].pubkey
    };
  }

  /**
   * Decode a withdraw stake instruction and retrieve the instruction params.
   */
  static decodeWithdraw(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 5);
    const {
      lamports
    } = INSTRUCTIONS$1.Withdraw.decode(instruction);
    const o = {
      stakePubkey: instruction.keys[0].pubkey,
      toPubkey: instruction.keys[1].pubkey,
      authorizedPubkey: instruction.keys[4].pubkey,
      lamports
    };
    if (instruction.keys.length > 5) {
      o.custodianPubkey = instruction.keys[5].pubkey;
    }
    return o;
  }

  /**
   * Decode a deactivate stake instruction and retrieve the instruction params.
   */
  static decodeDeactivate(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    INSTRUCTIONS$1.Deactivate.decode(instruction);
    return {
      stakePubkey: instruction.keys[0].pubkey,
      authorizedPubkey: instruction.keys[2].pubkey
    };
  }

  /**
   * @internal
   */
  static checkProgramId(programId) {
    if (!programId.equals(StakeProgram.programId)) {
      throw new Error('invalid instruction; programId is not StakeProgram');
    }
  }

  /**
   * @internal
   */
  static checkKeyLength(keys, expectedLength) {
    if (keys.length < expectedLength) {
      throw new Error(`invalid instruction; found ${keys.length} keys, expected at least ${expectedLength}`);
    }
  }
}

/**
 * An enumeration of valid StakeInstructionType's
 */

/**
 * @internal
 */
const STAKE_INSTRUCTIONS = ProgramInstructions.create({
  programId: STAKE_PROGRAM_ID,
  instructionIndexCodec: U32_CODEC$2,
  instructions: {
    Initialize: {
      index: 0,
      codec: getStructCodec([['instruction', U32_CODEC$2], ['authorized', AUTHORIZED_CODEC], ['lockup', LOCKUP_CODEC]])
    },
    Authorize: {
      index: 1,
      codec: getStructCodec([['instruction', U32_CODEC$2], ['newAuthorized', PUBLIC_KEY_BYTES_CODEC$1], ['stakeAuthorizationType', U32_CODEC$2]])
    },
    Delegate: {
      index: 2,
      codec: getStructCodec([['instruction', U32_CODEC$2]])
    },
    Split: {
      index: 3,
      codec: getStructCodec([['instruction', U32_CODEC$2], ['lamports', I64_NUMBER_CODEC$1]])
    },
    Withdraw: {
      index: 4,
      codec: getStructCodec([['instruction', U32_CODEC$2], ['lamports', I64_NUMBER_CODEC$1]])
    },
    Deactivate: {
      index: 5,
      codec: getStructCodec([['instruction', U32_CODEC$2]])
    },
    Merge: {
      index: 7,
      codec: getStructCodec([['instruction', U32_CODEC$2]])
    },
    AuthorizeWithSeed: {
      index: 8,
      codec: getStructCodec([['instruction', U32_CODEC$2], ['newAuthorized', PUBLIC_KEY_BYTES_CODEC$1], ['stakeAuthorizationType', U32_CODEC$2], ['authoritySeed', RUST_STRING_CODEC$1], ['authorityOwner', PUBLIC_KEY_BYTES_CODEC$1]])
    }
  }
});
const INSTRUCTIONS$1 = STAKE_INSTRUCTIONS;

/**
 * An enumeration of valid stake InstructionType's
 * @internal
 * @deprecated To be removed in v3. Use StakeProgram helpers or ProgramInstructions instead.
 */
const STAKE_INSTRUCTION_LAYOUTS = Object.freeze({
  Initialize: {
    index: 0,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), authorized(), lockup()])
  },
  Authorize: {
    index: 1,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), publicKey('newAuthorized'), BufferLayout__namespace.u32('stakeAuthorizationType')])
  },
  Delegate: {
    index: 2,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])
  },
  Split: {
    index: 3,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), BufferLayout__namespace.ns64('lamports')])
  },
  Withdraw: {
    index: 4,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), BufferLayout__namespace.ns64('lamports')])
  },
  Deactivate: {
    index: 5,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])
  },
  Merge: {
    index: 7,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])
  },
  AuthorizeWithSeed: {
    index: 8,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), publicKey('newAuthorized'), BufferLayout__namespace.u32('stakeAuthorizationType'), rustString('authoritySeed'), publicKey('authorityOwner')])
  }
});

/**
 * Stake authorization type
 */

/**
 * An enumeration of valid StakeAuthorizationLayout's
 */
const StakeAuthorizationLayout = Object.freeze({
  Staker: {
    index: 0
  },
  Withdrawer: {
    index: 1
  }
});

/**
 * Factory class for transactions to interact with the Stake program
 */
class StakeProgram {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the Stake program
   */

  /**
   * Generate an Initialize instruction to add to a Stake Create transaction
   */
  static initialize(params) {
    const {
      stakePubkey,
      authorized,
      lockup: maybeLockup
    } = params;
    const lockup = maybeLockup || Lockup.default;
    return INSTRUCTIONS$1.Initialize.build({
      authorized: {
        staker: authorized.staker.toBytes(),
        withdrawer: authorized.withdrawer.toBytes()
      },
      lockup: {
        unixTimestamp: lockup.unixTimestamp,
        epoch: lockup.epoch,
        custodian: lockup.custodian.toBytes()
      }
    }, {
      keys: [{
        pubkey: stakePubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false
      }],
      programId: this.programId
    });
  }

  /**
   * Generate a Transaction that creates a new Stake account at
   *   an address generated with `from`, a seed, and the Stake programId
   */
  static createAccountWithSeed(params) {
    const transaction = new Transaction();
    transaction.add(SystemProgram.createAccountWithSeed({
      fromPubkey: params.fromPubkey,
      newAccountPubkey: params.stakePubkey,
      basePubkey: params.basePubkey,
      seed: params.seed,
      lamports: params.lamports,
      space: this.space,
      programId: this.programId
    }));
    const {
      stakePubkey,
      authorized,
      lockup
    } = params;
    return transaction.add(this.initialize({
      stakePubkey,
      authorized,
      lockup
    }));
  }

  /**
   * Generate a Transaction that creates a new Stake account
   */
  static createAccount(params) {
    const transaction = new Transaction();
    transaction.add(SystemProgram.createAccount({
      fromPubkey: params.fromPubkey,
      newAccountPubkey: params.stakePubkey,
      lamports: params.lamports,
      space: this.space,
      programId: this.programId
    }));
    const {
      stakePubkey,
      authorized,
      lockup
    } = params;
    return transaction.add(this.initialize({
      stakePubkey,
      authorized,
      lockup
    }));
  }

  /**
   * Generate a Transaction that delegates Stake tokens to a validator
   * Vote Address. This transaction can also be used to redelegate Stake
   * to a new validator Vote Address.
   */
  static delegate(params) {
    const {
      stakePubkey,
      authorizedPubkey,
      votePubkey
    } = params;
    return new Transaction().add(INSTRUCTIONS$1.Delegate.build(undefined, {
      keys: [{
        pubkey: stakePubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: votePubkey,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: SYSVAR_CLOCK_PUBKEY,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: SYSVAR_STAKE_HISTORY_PUBKEY,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: STAKE_CONFIG_ID,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: authorizedPubkey,
        isSigner: true,
        isWritable: false
      }],
      programId: this.programId
    }));
  }

  /**
   * Generate a Transaction that authorizes a new Address as Staker
   * or Withdrawer on the Stake account.
   */
  static authorize(params) {
    const {
      stakePubkey,
      authorizedPubkey,
      newAuthorizedPubkey,
      stakeAuthorizationType,
      custodianPubkey
    } = params;
    const keys = [{
      pubkey: stakePubkey,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: authorizedPubkey,
      isSigner: true,
      isWritable: false
    }];
    if (custodianPubkey) {
      keys.push({
        pubkey: custodianPubkey,
        isSigner: true,
        isWritable: false
      });
    }
    return new Transaction().add(INSTRUCTIONS$1.Authorize.build({
      newAuthorized: newAuthorizedPubkey.toBytes(),
      stakeAuthorizationType: stakeAuthorizationType.index
    }, {
      keys,
      programId: this.programId
    }));
  }

  /**
   * Generate a Transaction that authorizes a new Address as Staker
   * or Withdrawer on the Stake account.
   */
  static authorizeWithSeed(params) {
    const {
      stakePubkey,
      authorityBase,
      authoritySeed,
      authorityOwner,
      newAuthorizedPubkey,
      stakeAuthorizationType,
      custodianPubkey
    } = params;
    const keys = [{
      pubkey: stakePubkey,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: authorityBase,
      isSigner: true,
      isWritable: false
    }, {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false
    }];
    if (custodianPubkey) {
      keys.push({
        pubkey: custodianPubkey,
        isSigner: true,
        isWritable: false
      });
    }
    return new Transaction().add(INSTRUCTIONS$1.AuthorizeWithSeed.build({
      newAuthorized: newAuthorizedPubkey.toBytes(),
      stakeAuthorizationType: stakeAuthorizationType.index,
      authoritySeed: authoritySeed,
      authorityOwner: authorityOwner.toBytes()
    }, {
      keys,
      programId: this.programId
    }));
  }

  /**
   * @internal
   */
  static splitInstruction(params) {
    const {
      stakePubkey,
      authorizedPubkey,
      splitStakePubkey,
      lamports
    } = params;
    return INSTRUCTIONS$1.Split.build({
      lamports
    }, {
      keys: [{
        pubkey: stakePubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: splitStakePubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: authorizedPubkey,
        isSigner: true,
        isWritable: false
      }],
      programId: this.programId
    });
  }

  /**
   * Generate a Transaction that splits Stake tokens into another stake account
   */
  static split(params,
  // Compute the cost of allocating the new stake account in lamports
  rentExemptReserve) {
    const transaction = new Transaction();
    transaction.add(SystemProgram.createAccount({
      fromPubkey: params.authorizedPubkey,
      newAccountPubkey: params.splitStakePubkey,
      lamports: rentExemptReserve,
      space: this.space,
      programId: this.programId
    }));
    return transaction.add(this.splitInstruction(params));
  }

  /**
   * Generate a Transaction that splits Stake tokens into another account
   * derived from a base public key and seed
   */
  static splitWithSeed(params,
  // If this stake account is new, compute the cost of allocating it in lamports
  rentExemptReserve) {
    const {
      stakePubkey,
      authorizedPubkey,
      splitStakePubkey,
      basePubkey,
      seed,
      lamports
    } = params;
    const transaction = new Transaction();
    transaction.add(SystemProgram.allocate({
      accountPubkey: splitStakePubkey,
      basePubkey,
      seed,
      space: this.space,
      programId: this.programId
    }));
    if (rentExemptReserve && rentExemptReserve > 0) {
      transaction.add(SystemProgram.transfer({
        fromPubkey: params.authorizedPubkey,
        toPubkey: splitStakePubkey,
        lamports: rentExemptReserve
      }));
    }
    return transaction.add(this.splitInstruction({
      stakePubkey,
      authorizedPubkey,
      splitStakePubkey,
      lamports
    }));
  }

  /**
   * Generate a Transaction that merges Stake accounts.
   */
  static merge(params) {
    const {
      stakePubkey,
      sourceStakePubKey,
      authorizedPubkey
    } = params;
    return new Transaction().add(INSTRUCTIONS$1.Merge.build(undefined, {
      keys: [{
        pubkey: stakePubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: sourceStakePubKey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: SYSVAR_CLOCK_PUBKEY,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: SYSVAR_STAKE_HISTORY_PUBKEY,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: authorizedPubkey,
        isSigner: true,
        isWritable: false
      }],
      programId: this.programId
    }));
  }

  /**
   * Generate a Transaction that withdraws deactivated Stake tokens.
   */
  static withdraw(params) {
    const {
      stakePubkey,
      authorizedPubkey,
      toPubkey,
      lamports,
      custodianPubkey
    } = params;
    const keys = [{
      pubkey: stakePubkey,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: toPubkey,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false
    }, {
      pubkey: SYSVAR_STAKE_HISTORY_PUBKEY,
      isSigner: false,
      isWritable: false
    }, {
      pubkey: authorizedPubkey,
      isSigner: true,
      isWritable: false
    }];
    if (custodianPubkey) {
      keys.push({
        pubkey: custodianPubkey,
        isSigner: true,
        isWritable: false
      });
    }
    return new Transaction().add(INSTRUCTIONS$1.Withdraw.build({
      lamports
    }, {
      keys,
      programId: this.programId
    }));
  }

  /**
   * Generate a Transaction that deactivates Stake tokens.
   */
  static deactivate(params) {
    const {
      stakePubkey,
      authorizedPubkey
    } = params;
    return new Transaction().add(INSTRUCTIONS$1.Deactivate.build(undefined, {
      keys: [{
        pubkey: stakePubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: SYSVAR_CLOCK_PUBKEY,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: authorizedPubkey,
        isSigner: true,
        isWritable: false
      }],
      programId: this.programId
    }));
  }
}
StakeProgram.programId = STAKE_PROGRAM_ID;
/**
 * Max space of a Stake account
 *
 * This is generated from the solana-stake-program StakeState struct as
 * `StakeStateV2::size_of()`:
 * https://docs.rs/solana-stake-program/latest/solana_stake_program/stake_state/enum.StakeStateV2.html
 */
StakeProgram.space = 200;

/**
 * Vote account info
 */
class VoteInit {
  /** [0, 100] */

  constructor(nodePubkey, authorizedVoter, authorizedWithdrawer, commission) {
    this.nodePubkey = void 0;
    this.authorizedVoter = void 0;
    this.authorizedWithdrawer = void 0;
    this.commission = void 0;
    this.nodePubkey = nodePubkey;
    this.authorizedVoter = authorizedVoter;
    this.authorizedWithdrawer = authorizedWithdrawer;
    this.commission = commission;
  }
}

/**
 * Create vote account transaction params
 */

/**
 * InitializeAccount instruction params
 */

/**
 * Authorize instruction params
 */

/**
 * AuthorizeWithSeed instruction params
 */

/**
 * Withdraw from vote account transaction params
 */

/**
 * Update validator identity (node pubkey) vote account instruction params.
 */

/**
 * Vote Instruction class
 */
class VoteInstruction {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Decode a vote instruction and retrieve the instruction type.
   */
  static decodeInstructionType(instruction) {
    this.checkProgramId(instruction.programId);
    return INSTRUCTIONS.getInstructionType(instruction);
  }

  /**
   * Decode an initialize vote instruction and retrieve the instruction params.
   */
  static decodeInitializeAccount(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 4);
    const {
      voteInit
    } = INSTRUCTIONS.InitializeAccount.decode(instruction);
    return {
      votePubkey: instruction.keys[0].pubkey,
      nodePubkey: instruction.keys[3].pubkey,
      voteInit: new VoteInit(new Address(voteInit.nodePubkey), new Address(voteInit.authorizedVoter), new Address(voteInit.authorizedWithdrawer), voteInit.commission)
    };
  }

  /**
   * Decode an authorize instruction and retrieve the instruction params.
   */
  static decodeAuthorize(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    const {
      newAuthorized,
      voteAuthorizationType
    } = INSTRUCTIONS.Authorize.decode(instruction);
    return {
      votePubkey: instruction.keys[0].pubkey,
      authorizedPubkey: instruction.keys[2].pubkey,
      newAuthorizedPubkey: new Address(newAuthorized),
      voteAuthorizationType: {
        index: voteAuthorizationType
      }
    };
  }

  /**
   * Decode an authorize instruction and retrieve the instruction params.
   */
  static decodeAuthorizeWithSeed(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    const {
      voteAuthorizeWithSeedArgs: {
        currentAuthorityDerivedKeyOwnerPubkey,
        currentAuthorityDerivedKeySeed,
        newAuthorized,
        voteAuthorizationType
      }
    } = INSTRUCTIONS.AuthorizeWithSeed.decode(instruction);
    return {
      currentAuthorityDerivedKeyBasePubkey: instruction.keys[2].pubkey,
      currentAuthorityDerivedKeyOwnerPubkey: new Address(currentAuthorityDerivedKeyOwnerPubkey),
      currentAuthorityDerivedKeySeed: currentAuthorityDerivedKeySeed,
      newAuthorizedPubkey: new Address(newAuthorized),
      voteAuthorizationType: {
        index: voteAuthorizationType
      },
      votePubkey: instruction.keys[0].pubkey
    };
  }

  /**
   * Decode a withdraw instruction and retrieve the instruction params.
   */
  static decodeWithdraw(instruction) {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    const {
      lamports
    } = INSTRUCTIONS.Withdraw.decode(instruction);
    return {
      votePubkey: instruction.keys[0].pubkey,
      authorizedWithdrawerPubkey: instruction.keys[2].pubkey,
      lamports,
      toPubkey: instruction.keys[1].pubkey
    };
  }

  /**
   * @internal
   */
  static checkProgramId(programId) {
    if (!programId.equals(VoteProgram.programId)) {
      throw new Error('invalid instruction; programId is not VoteProgram');
    }
  }

  /**
   * @internal
   */
  static checkKeyLength(keys, expectedLength) {
    if (keys.length < expectedLength) {
      throw new Error(`invalid instruction; found ${keys.length} keys, expected at least ${expectedLength}`);
    }
  }
}

/**
 * An enumeration of valid VoteInstructionType's
 */

/** @internal */

const VOTE_PROGRAM_ID$1 = new Address('Vote111111111111111111111111111111111111111');
const U32_CODEC$1 = codecsNumbers.getU32Codec();
const U8_CODEC$1 = codecsNumbers.getU8Codec();
const U64_CODEC$1 = codecsNumbers.getU64Codec();
const I64_NUMBER_CODEC = transformCodec(codecsNumbers.getI64Codec(), value => BigInt(value), value => Number(value));
const PUBLIC_KEY_BYTES_CODEC = fixCodecSize(getBytesCodec(), 32);
const getRustStringCodec = () => addCodecSizePrefix(getUtf8Codec(), U64_CODEC$1);
const RUST_STRING_CODEC = getRustStringCodec();
const VOTE_INIT_CODEC = getStructCodec([['nodePubkey', PUBLIC_KEY_BYTES_CODEC], ['authorizedVoter', PUBLIC_KEY_BYTES_CODEC], ['authorizedWithdrawer', PUBLIC_KEY_BYTES_CODEC], ['commission', U8_CODEC$1]]);
const VOTE_AUTHORIZE_WITH_SEED_CODEC = getStructCodec([['voteAuthorizationType', U32_CODEC$1], ['currentAuthorityDerivedKeyOwnerPubkey', PUBLIC_KEY_BYTES_CODEC], ['currentAuthorityDerivedKeySeed', RUST_STRING_CODEC], ['newAuthorized', PUBLIC_KEY_BYTES_CODEC]]);
const INSTRUCTION_DEFS = {
  InitializeAccount: {
    index: 0,
    codec: getStructCodec([['instruction', U32_CODEC$1], ['voteInit', VOTE_INIT_CODEC]])
  },
  Authorize: {
    index: 1,
    codec: getStructCodec([['instruction', U32_CODEC$1], ['newAuthorized', PUBLIC_KEY_BYTES_CODEC], ['voteAuthorizationType', U32_CODEC$1]])
  },
  Withdraw: {
    index: 3,
    codec: getStructCodec([['instruction', U32_CODEC$1], ['lamports', I64_NUMBER_CODEC]])
  },
  UpdateValidatorIdentity: {
    index: 4,
    codec: getStructCodec([['instruction', U32_CODEC$1]])
  },
  AuthorizeWithSeed: {
    index: 10,
    codec: getStructCodec([['instruction', U32_CODEC$1], ['voteAuthorizeWithSeedArgs', VOTE_AUTHORIZE_WITH_SEED_CODEC]])
  }
};

/**
 * @internal
 */
const VOTE_INSTRUCTIONS = ProgramInstructions.create({
  programId: VOTE_PROGRAM_ID$1,
  instructionIndexCodec: U32_CODEC$1,
  instructions: INSTRUCTION_DEFS
});
const INSTRUCTIONS = VOTE_INSTRUCTIONS;
Object.freeze({
  InitializeAccount: {
    index: 0,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), voteInit()])
  },
  Authorize: {
    index: 1,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), publicKey('newAuthorized'), BufferLayout__namespace.u32('voteAuthorizationType')])
  },
  Withdraw: {
    index: 3,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), BufferLayout__namespace.ns64('lamports')])
  },
  UpdateValidatorIdentity: {
    index: 4,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])
  },
  AuthorizeWithSeed: {
    index: 10,
    layout: BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'), voteAuthorizeWithSeedArgs()])
  }
});

/**
 * VoteAuthorize type
 */

/**
 * An enumeration of valid VoteAuthorization layouts.
 */
const VoteAuthorizationLayout = Object.freeze({
  Voter: {
    index: 0
  },
  Withdrawer: {
    index: 1
  }
});

/**
 * Factory class for transactions to interact with the Vote program
 */
class VoteProgram {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the Vote program
   */

  /**
   * Generate an Initialize instruction.
   */
  static initializeAccount(params) {
    const {
      votePubkey,
      nodePubkey,
      voteInit
    } = params;
    return INSTRUCTIONS.InitializeAccount.build({
      voteInit: {
        nodePubkey: voteInit.nodePubkey.toBytes(),
        authorizedVoter: voteInit.authorizedVoter.toBytes(),
        authorizedWithdrawer: voteInit.authorizedWithdrawer.toBytes(),
        commission: voteInit.commission
      }
    }, {
      keys: [{
        pubkey: votePubkey,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: SYSVAR_CLOCK_PUBKEY,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: nodePubkey,
        isSigner: true,
        isWritable: false
      }],
      programId: this.programId
    });
  }

  /**
   * Generate a transaction that creates a new Vote account.
   */
  static createAccount(params) {
    const transaction = new Transaction();
    transaction.add(SystemProgram.createAccount({
      fromPubkey: params.fromPubkey,
      newAccountPubkey: params.votePubkey,
      lamports: params.lamports,
      space: this.space,
      programId: this.programId
    }));
    return transaction.add(this.initializeAccount({
      votePubkey: params.votePubkey,
      nodePubkey: params.voteInit.nodePubkey,
      voteInit: params.voteInit
    }));
  }

  /**
   * Generate a transaction that authorizes a new Voter or Withdrawer on the Vote account.
   */
  static authorize(params) {
    const {
      votePubkey,
      authorizedPubkey,
      newAuthorizedPubkey,
      voteAuthorizationType
    } = params;
    const keys = [{
      pubkey: votePubkey,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false
    }, {
      pubkey: authorizedPubkey,
      isSigner: true,
      isWritable: false
    }];
    return new Transaction().add(INSTRUCTIONS.Authorize.build({
      newAuthorized: newAuthorizedPubkey.toBytes(),
      voteAuthorizationType: voteAuthorizationType.index
    }, {
      keys,
      programId: this.programId
    }));
  }

  /**
   * Generate a transaction that authorizes a new Voter or Withdrawer on the Vote account
   * where the current Voter or Withdrawer authority is a derived key.
   */
  static authorizeWithSeed(params) {
    const {
      currentAuthorityDerivedKeyBasePubkey,
      currentAuthorityDerivedKeyOwnerPubkey,
      currentAuthorityDerivedKeySeed,
      newAuthorizedPubkey,
      voteAuthorizationType,
      votePubkey
    } = params;
    const keys = [{
      pubkey: votePubkey,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false
    }, {
      pubkey: currentAuthorityDerivedKeyBasePubkey,
      isSigner: true,
      isWritable: false
    }];
    return new Transaction().add(INSTRUCTIONS.AuthorizeWithSeed.build({
      voteAuthorizeWithSeedArgs: {
        currentAuthorityDerivedKeyOwnerPubkey: currentAuthorityDerivedKeyOwnerPubkey.toBytes(),
        currentAuthorityDerivedKeySeed: currentAuthorityDerivedKeySeed,
        newAuthorized: newAuthorizedPubkey.toBytes(),
        voteAuthorizationType: voteAuthorizationType.index
      }
    }, {
      keys,
      programId: this.programId
    }));
  }

  /**
   * Generate a transaction to withdraw from a Vote account.
   */
  static withdraw(params) {
    const {
      votePubkey,
      authorizedWithdrawerPubkey,
      lamports,
      toPubkey
    } = params;
    const keys = [{
      pubkey: votePubkey,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: toPubkey,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: authorizedWithdrawerPubkey,
      isSigner: true,
      isWritable: false
    }];
    return new Transaction().add(INSTRUCTIONS.Withdraw.build({
      lamports
    }, {
      keys,
      programId: this.programId
    }));
  }

  /**
   * Generate a transaction to withdraw safely from a Vote account.
   *
   * This function was created as a safeguard for vote accounts running validators, `safeWithdraw`
   * checks that the withdraw amount will not exceed the specified balance while leaving enough left
   * to cover rent. If you wish to close the vote account by withdrawing the full amount, call the
   * `withdraw` method directly.
   */
  static safeWithdraw(params, currentVoteAccountBalance, rentExemptMinimum) {
    if (params.lamports > currentVoteAccountBalance - rentExemptMinimum) {
      throw new Error('Withdraw will leave vote account with insufficient funds.');
    }
    return VoteProgram.withdraw(params);
  }

  /**
   * Generate a transaction to update the validator identity (node pubkey) of a Vote account.
   */
  static updateValidatorIdentity(params) {
    const {
      votePubkey,
      authorizedWithdrawerPubkey,
      nodePubkey
    } = params;
    const keys = [{
      pubkey: votePubkey,
      isSigner: false,
      isWritable: true
    }, {
      pubkey: nodePubkey,
      isSigner: true,
      isWritable: false
    }, {
      pubkey: authorizedWithdrawerPubkey,
      isSigner: true,
      isWritable: false
    }];
    return new Transaction().add(INSTRUCTIONS.UpdateValidatorIdentity.build(undefined, {
      keys,
      programId: this.programId
    }));
  }
}
VoteProgram.programId = VOTE_PROGRAM_ID$1;
/**
 * Max space of a Vote account
 *
 * This is generated from the solana-vote-program VoteState struct as
 * `VoteState::size_of()`:
 * https://docs.rs/solana-vote-program/1.9.5/solana_vote_program/vote_state/struct.VoteState.html#method.size_of
 *
 * KEEP IN SYNC WITH `VoteState::size_of()` in https://github.com/solana-labs/solana/blob/a474cb24b9238f5edcc982f65c0b37d4a1046f7e/sdk/program/src/vote/state/mod.rs#L340-L342
 */
VoteProgram.space = 3762;

/**
 * Backwards-compatible exports for the renamed Address module.
 * @deprecated Use Address instead. Target for removal in v3.
 */
/**
 * Backwards-compatible alias for {@link Address}.
 * @deprecated Use {@link Address} instead. Target for removal in v3.
 */
const PublicKey = Address;

const SHORT_U16_DECODER = codecsNumbers.getShortU16Decoder();
const U8_DECODER = codecsNumbers.getU8Decoder();
const CONFIG_KEY_DECODER = getStructDecoder([['publicKey', fixDecoderSize(getBytesDecoder(), PUBLIC_KEY_LENGTH)], ['isSigner', U8_DECODER]]);
const VALIDATOR_INFO_CONFIG_DECODER = getStructDecoder([['configKeys', getArrayDecoder(CONFIG_KEY_DECODER, {
  size: SHORT_U16_DECODER
})], ['infoData', getBytesDecoder()]]);
const VALIDATOR_INFO_KEY = new Address('Va1idator1nfo111111111111111111111111111111');

/**
 * @internal
 */

/**
 * Info used to identity validators.
 */

const InfoString = superstruct.type({
  name: superstruct.string(),
  website: superstruct.optional(superstruct.string()),
  details: superstruct.optional(superstruct.string()),
  iconUrl: superstruct.optional(superstruct.string()),
  keybaseUsername: superstruct.optional(superstruct.string())
});

/**
 * ValidatorInfo class
 */
class ValidatorInfo {
  /**
   * Construct a valid ValidatorInfo
   *
   * @param key validator public key
   * @param info validator information
   */
  constructor(key, info) {
    /**
     * validator public key
     */
    this.key = void 0;
    /**
     * validator information
     */
    this.info = void 0;
    this.key = key;
    this.info = info;
  }

  /**
   * Deserialize ValidatorInfo from the config account data. Exactly two config
   * keys are required in the data.
   *
   * @param buffer config account data
   * @return null if info was not found
   */
  static fromConfigData(buffer) {
    const {
      configKeys: decodedConfigKeys,
      infoData
    } = VALIDATOR_INFO_CONFIG_DECODER.decode(toUint8ArrayView(buffer));
    if (decodedConfigKeys.length !== 2) return null;
    const configKeys = decodedConfigKeys.map(configKey => ({
      publicKey: new Address(configKey.publicKey),
      isSigner: configKey.isSigner === 1
    }));
    if (configKeys[0].publicKey.equals(VALIDATOR_INFO_KEY)) {
      if (configKeys[1].isSigner) {
        const rawInfo = rustString().decode(toUint8ArrayView(infoData));
        const info = JSON.parse(rawInfo);
        superstruct.assert(info, InfoString);
        return new ValidatorInfo(configKeys[1].publicKey, info);
      }
    }
    return null;
  }
}

const VOTE_PROGRAM_ID = new Address('Vote111111111111111111111111111111111111111');

/**
 * Vote account state versions
 */
let VoteStateVersion = /*#__PURE__*/function (VoteStateVersion) {
  VoteStateVersion[VoteStateVersion["Uninitialized"] = 0] = "Uninitialized";
  VoteStateVersion[VoteStateVersion["V1_14_11"] = 1] = "V1_14_11";
  return VoteStateVersion;
}({});

/**
 * History of how many credits earned by the end of each epoch
 */

const U8_CODEC = codecsNumbers.getU8Codec();
const U32_CODEC = codecsNumbers.getU32Codec();
const U64_CODEC = codecsNumbers.getU64Codec();
const U64_NUMBER_CODEC = transformCodec(U64_CODEC, value => BigInt(value), value => Number(value));
const PUBLIC_KEY_CODEC = transformCodec(fixCodecSize(getBytesCodec(), 32), value => value, value => new Uint8Array(value));
const ACCOUNT_VERSION_CODEC = getEnumCodec(VoteStateVersion, {
  size: U32_CODEC
});
const LOCKOUT_CODEC = getStructCodec([['slot', U64_NUMBER_CODEC], ['confirmationCount', U32_CODEC]]);
const AUTHORIZED_VOTER_CODEC = getStructCodec([['epoch', U64_NUMBER_CODEC], ['authorizedVoter', PUBLIC_KEY_CODEC]]);
const PRIOR_VOTER_CODEC = getStructCodec([['authorizedPubkey', PUBLIC_KEY_CODEC], ['epochOfLastAuthorizedSwitch', U64_NUMBER_CODEC], ['targetEpoch', U64_NUMBER_CODEC]]);
const PRIOR_VOTERS_CODEC = getStructCodec([['buf', getArrayCodec(PRIOR_VOTER_CODEC, {
  size: 32
})], ['idx', U64_NUMBER_CODEC], ['isEmpty', U8_CODEC]]);
const EPOCH_CREDITS_CODEC = getStructCodec([['epoch', U64_NUMBER_CODEC], ['credits', U64_NUMBER_CODEC], ['prevCredits', U64_NUMBER_CODEC]]);
const BLOCK_TIMESTAMP_CODEC = getStructCodec([['slot', U64_NUMBER_CODEC], ['timestamp', U64_NUMBER_CODEC]]);
const VOTE_ACCOUNT_V1_14_11_CODEC = getStructCodec([['nodePubkey', PUBLIC_KEY_CODEC], ['authorizedWithdrawer', PUBLIC_KEY_CODEC], ['commission', U8_CODEC], ['votes', getArrayCodec(LOCKOUT_CODEC, {
  size: U64_NUMBER_CODEC
})], ['rootSlotValid', U8_CODEC], ['rootSlot', U64_NUMBER_CODEC], ['authorizedVoters', getArrayCodec(AUTHORIZED_VOTER_CODEC, {
  size: U64_NUMBER_CODEC
})], ['priorVoters', PRIOR_VOTERS_CODEC], ['epochCredits', getArrayCodec(EPOCH_CREDITS_CODEC, {
  size: U64_NUMBER_CODEC
})], ['lastTimestamp', BLOCK_TIMESTAMP_CODEC]]);

/**
 * @internal
 */
const __TEST_ONLY__VOTE_ACCOUNT_V1_14_11_CODEC = VOTE_ACCOUNT_V1_14_11_CODEC;
const ACCOUNT_STATE_CODECS = {
  [VoteStateVersion.V1_14_11]: VOTE_ACCOUNT_V1_14_11_CODEC
};

/**
 * See https://github.com/solana-labs/solana/blob/8a12ed029cfa38d4a45400916c2463fb82bbec8c/programs/vote_api/src/vote_state.rs#L68-L88
 *
 * @internal
 */
const decodeVoteAccountData = bytes => {
  try {
    const version = ACCOUNT_VERSION_CODEC.decode(bytes);
    if (version == VoteStateVersion.Uninitialized) {
      throw new Error('Vote account is uninitialized');
    }
    return ACCOUNT_STATE_CODECS[version].decode(bytes, ACCOUNT_VERSION_CODEC.fixedSize);
  } catch (error) {
    if (error instanceof SolanaError$1 && error.context.__code == SOLANA_ERROR__CODECS__ENUM_DISCRIMINATOR_OUT_OF_RANGE) {
      throw new Error(`Unsupported vote account version: ${error.context.discriminator}. Supported versions: ${Array.from(error.context.validDiscriminators).join(', ')}.`);
    }
    throw error;
  }
};
/**
 * VoteAccount class
 */
class VoteAccount {
  /**
   * @internal
   */
  constructor(args) {
    this.nodePubkey = void 0;
    this.authorizedWithdrawer = void 0;
    this.commission = void 0;
    this.rootSlot = void 0;
    this.votes = void 0;
    this.authorizedVoters = void 0;
    this.priorVoters = void 0;
    this.epochCredits = void 0;
    this.lastTimestamp = void 0;
    this.nodePubkey = args.nodePubkey;
    this.authorizedWithdrawer = args.authorizedWithdrawer;
    this.commission = args.commission;
    this.rootSlot = args.rootSlot;
    this.votes = args.votes;
    this.authorizedVoters = args.authorizedVoters;
    this.priorVoters = args.priorVoters;
    this.epochCredits = args.epochCredits;
    this.lastTimestamp = args.lastTimestamp;
  }

  /**
   * Deserialize VoteAccount from the account data.
   *
   * @param bufferLike account data
   * @return VoteAccount
   */
  static fromAccountData(bufferLike) {
    const va = decodeVoteAccountData(toUint8ArrayView(bufferLike));
    let rootSlot = va.rootSlot;
    if (!va.rootSlotValid) {
      rootSlot = null;
    }
    return new VoteAccount({
      nodePubkey: new Address(va.nodePubkey),
      authorizedWithdrawer: new Address(va.authorizedWithdrawer),
      commission: va.commission,
      votes: va.votes,
      rootSlot,
      authorizedVoters: va.authorizedVoters.map(parseAuthorizedVoter),
      priorVoters: getPriorVoters(va.priorVoters),
      epochCredits: va.epochCredits,
      lastTimestamp: va.lastTimestamp
    });
  }
}
function parseAuthorizedVoter({
  authorizedVoter,
  epoch
}) {
  return {
    epoch,
    authorizedVoter: new Address(authorizedVoter)
  };
}
function parsePriorVoters({
  authorizedPubkey,
  epochOfLastAuthorizedSwitch,
  targetEpoch
}) {
  return {
    authorizedPubkey: new Address(authorizedPubkey),
    epochOfLastAuthorizedSwitch,
    targetEpoch
  };
}
function getPriorVoters({
  buf,
  idx,
  isEmpty
}) {
  if (isEmpty) {
    return [];
  }
  return [...buf.slice(idx + 1).map(parsePriorVoters), ...buf.slice(0, idx).map(parsePriorVoters)];
}

const endpoint = {
  http: {
    devnet: 'http://api.devnet.solana.com',
    testnet: 'http://api.testnet.solana.com',
    'mainnet-beta': 'http://api.mainnet-beta.solana.com/'
  },
  https: {
    devnet: 'https://api.devnet.solana.com',
    testnet: 'https://api.testnet.solana.com',
    'mainnet-beta': 'https://api.mainnet-beta.solana.com/'
  }
};
/**
 * Retrieves the RPC API URL for the specified cluster
 * @param {Cluster} [cluster="devnet"] - The cluster name of the RPC API URL to use. Possible options: 'devnet' | 'testnet' | 'mainnet-beta'
 * @param {boolean} [tls="http"] - Use TLS when connecting to cluster.
 *
 * @returns {string} URL string of the RPC endpoint
 */
function clusterApiUrl(cluster, tls) {
  const key = tls === false ? 'http' : 'https';
  if (!cluster) {
    return endpoint[key]['devnet'];
  }
  const url = endpoint[key][cluster];
  if (!url) {
    throw new Error(`Unknown ${key} cluster: ${cluster}`);
  }
  return url;
}

/**
 * Send and confirm a raw transaction
 *
 * If `commitment` option is not specified, defaults to 'finalized' commitment.
 *
 * @param {Connection} connection
 * @param {Uint8Array | Array<number>} rawTransaction
 * @param {TransactionConfirmationStrategy} confirmationStrategy
 * @param {ConfirmOptions} [options]
 * @returns {Promise<TransactionSignature>}
 */

/**
 * @deprecated Calling `sendAndConfirmRawTransaction()` without a `confirmationStrategy`
 * is no longer supported and will be removed in a future version.
 */
// eslint-disable-next-line no-redeclare

// eslint-disable-next-line no-redeclare
async function sendAndConfirmRawTransaction(connection, rawTransaction, confirmationStrategyOrConfirmOptions, maybeConfirmOptions) {
  let confirmationStrategy;
  let options;
  if (confirmationStrategyOrConfirmOptions && Object.prototype.hasOwnProperty.call(confirmationStrategyOrConfirmOptions, 'lastValidBlockHeight')) {
    confirmationStrategy = confirmationStrategyOrConfirmOptions;
    options = maybeConfirmOptions;
  } else if (confirmationStrategyOrConfirmOptions && Object.prototype.hasOwnProperty.call(confirmationStrategyOrConfirmOptions, 'nonceValue')) {
    confirmationStrategy = confirmationStrategyOrConfirmOptions;
    options = maybeConfirmOptions;
  } else {
    options = confirmationStrategyOrConfirmOptions;
  }
  const sendOptions = options && {
    skipPreflight: options.skipPreflight,
    preflightCommitment: options.preflightCommitment || options.commitment,
    minContextSlot: options.minContextSlot
  };
  const signature = await connection.sendRawTransaction(rawTransaction, sendOptions);
  const commitment = options && options.commitment;
  const confirmationPromise = confirmationStrategy ? connection.confirmTransaction(confirmationStrategy, commitment) : connection.confirmTransaction(signature, commitment);
  const status = (await confirmationPromise).value;
  if (status.err) {
    if (signature != null) {
      throw new SendTransactionError({
        action: sendOptions?.skipPreflight ? 'send' : 'simulate',
        signature: signature,
        transactionMessage: `Status: (${JSON.stringify(status)})`
      });
    }
    throw new Error(`Raw transaction ${signature} failed (${JSON.stringify(status)})`);
  }
  return signature;
}

/**
 * There are 1-billion lamports in one SOL
 */
const LAMPORTS_PER_SOL = 1000000000;

exports.Address = Address;
exports.AddressLookupTableAccount = AddressLookupTableAccount;
exports.AddressLookupTableInstruction = AddressLookupTableInstruction;
exports.AddressLookupTableProgram = AddressLookupTableProgram;
exports.Authorized = Authorized;
exports.BLOCKHASH_CACHE_TIMEOUT_MS = BLOCKHASH_CACHE_TIMEOUT_MS;
exports.BPF_LOADER_DEPRECATED_PROGRAM_ID = BPF_LOADER_DEPRECATED_PROGRAM_ID;
exports.BPF_LOADER_PROGRAM_ID = BPF_LOADER_PROGRAM_ID;
exports.BpfLoader = BpfLoader;
exports.COMPUTE_BUDGET_INSTRUCTIONS = COMPUTE_BUDGET_INSTRUCTIONS;
exports.COMPUTE_BUDGET_INSTRUCTION_LAYOUTS = COMPUTE_BUDGET_INSTRUCTION_LAYOUTS;
exports.ComputeBudgetProgram = ComputeBudgetProgram;
exports.Connection = Connection;
exports.Ed25519Program = Ed25519Program;
exports.EpochSchedule = EpochSchedule;
exports.Keypair = Keypair;
exports.LAMPORTS_PER_SOL = LAMPORTS_PER_SOL;
exports.LOOKUP_TABLE_INSTRUCTIONS = LOOKUP_TABLE_INSTRUCTIONS;
exports.LOOKUP_TABLE_INSTRUCTION_LAYOUTS = LOOKUP_TABLE_INSTRUCTION_LAYOUTS;
exports.Loader = Loader;
exports.Lockup = Lockup;
exports.MAX_SEED_LENGTH = MAX_SEED_LENGTH;
exports.Message = Message;
exports.MessageAccountKeys = MessageAccountKeys;
exports.MessageV0 = MessageV0;
exports.NONCE_ACCOUNT_LENGTH = NONCE_ACCOUNT_LENGTH;
exports.NonceAccount = NonceAccount;
exports.PACKET_DATA_SIZE = PACKET_DATA_SIZE;
exports.PUBLIC_KEY_LENGTH = PUBLIC_KEY_LENGTH;
exports.PublicKey = PublicKey;
exports.SIGNATURE_LENGTH_IN_BYTES = SIGNATURE_LENGTH_IN_BYTES;
exports.STAKE_CONFIG_ID = STAKE_CONFIG_ID;
exports.STAKE_INSTRUCTIONS = STAKE_INSTRUCTIONS;
exports.STAKE_INSTRUCTION_LAYOUTS = STAKE_INSTRUCTION_LAYOUTS;
exports.SYSTEM_INSTRUCTIONS = SYSTEM_INSTRUCTIONS;
exports.SYSTEM_INSTRUCTION_LAYOUTS = SYSTEM_INSTRUCTION_LAYOUTS;
exports.SYSVAR_CLOCK_PUBKEY = SYSVAR_CLOCK_PUBKEY;
exports.SYSVAR_EPOCH_SCHEDULE_PUBKEY = SYSVAR_EPOCH_SCHEDULE_PUBKEY;
exports.SYSVAR_INSTRUCTIONS_PUBKEY = SYSVAR_INSTRUCTIONS_PUBKEY;
exports.SYSVAR_RECENT_BLOCKHASHES_PUBKEY = SYSVAR_RECENT_BLOCKHASHES_PUBKEY;
exports.SYSVAR_RENT_PUBKEY = SYSVAR_RENT_PUBKEY;
exports.SYSVAR_REWARDS_PUBKEY = SYSVAR_REWARDS_PUBKEY;
exports.SYSVAR_SLOT_HASHES_PUBKEY = SYSVAR_SLOT_HASHES_PUBKEY;
exports.SYSVAR_SLOT_HISTORY_PUBKEY = SYSVAR_SLOT_HISTORY_PUBKEY;
exports.SYSVAR_STAKE_HISTORY_PUBKEY = SYSVAR_STAKE_HISTORY_PUBKEY;
exports.Secp256k1Program = Secp256k1Program;
exports.SendTransactionError = SendTransactionError;
exports.SolanaJSONRPCError = SolanaJSONRPCError;
exports.SolanaJSONRPCErrorCode = SolanaJSONRPCErrorCode;
exports.StakeAuthorizationLayout = StakeAuthorizationLayout;
exports.StakeInstruction = StakeInstruction;
exports.StakeProgram = StakeProgram;
exports.SystemInstruction = SystemInstruction;
exports.SystemProgram = SystemProgram;
exports.Transaction = Transaction;
exports.TransactionExpiredBlockheightExceededError = TransactionExpiredBlockheightExceededError;
exports.TransactionExpiredNonceInvalidError = TransactionExpiredNonceInvalidError;
exports.TransactionExpiredTimeoutError = TransactionExpiredTimeoutError;
exports.TransactionInstruction = TransactionInstruction;
exports.TransactionMessage = TransactionMessage;
exports.TransactionStatus = TransactionStatus;
exports.VALIDATOR_INFO_KEY = VALIDATOR_INFO_KEY;
exports.VERSION_PREFIX_MASK = VERSION_PREFIX_MASK;
exports.VOTE_INSTRUCTIONS = VOTE_INSTRUCTIONS;
exports.VOTE_PROGRAM_ID = VOTE_PROGRAM_ID;
exports.ValidatorInfo = ValidatorInfo;
exports.VersionedMessage = VersionedMessage;
exports.VersionedTransaction = VersionedTransaction;
exports.VoteAccount = VoteAccount;
exports.VoteAuthorizationLayout = VoteAuthorizationLayout;
exports.VoteInit = VoteInit;
exports.VoteInstruction = VoteInstruction;
exports.VoteProgram = VoteProgram;
exports.VoteStateVersion = VoteStateVersion;
exports.__TEST_ONLY__VOTE_ACCOUNT_V1_14_11_CODEC = __TEST_ONLY__VOTE_ACCOUNT_V1_14_11_CODEC;
exports.clusterApiUrl = clusterApiUrl;
exports.sendAndConfirmRawTransaction = sendAndConfirmRawTransaction;
exports.sendAndConfirmTransaction = sendAndConfirmTransaction;
//# sourceMappingURL=index.browser.cjs.js.map
