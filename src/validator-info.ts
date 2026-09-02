import {
  fixDecoderSize,
  getArrayDecoder,
  getBytesDecoder,
  getStructDecoder,
  getShortU16Decoder,
  getU8Decoder,
} from '@solana/kit';

import {RUST_STRING_CODEC} from './codecs';
import {PublicKey, PUBLIC_KEY_LENGTH} from './publickey';
import assert from './utils/assert';
import {toUint8ArrayView} from './utils/typed-array';

const SHORT_U16_DECODER = getShortU16Decoder();
const U8_DECODER = getU8Decoder();
const CONFIG_KEY_DECODER = getStructDecoder([
  ['publicKey', fixDecoderSize(getBytesDecoder(), PUBLIC_KEY_LENGTH)],
  ['isSigner', U8_DECODER],
]);

export const VALIDATOR_INFO_KEY = new PublicKey(
  'Va1idator1nfo111111111111111111111111111111',
);

/**
 * @internal
 */
type ConfigKey = {
  publicKey: PublicKey;
  isSigner: boolean;
};

/**
 * Info used to identity validators.
 */
export type Info = {
  /** validator name */
  name: string;
  /** optional, validator website */
  website?: string;
  /** optional, extra information the validator chose to share */
  details?: string;
  /** optional, validator logo URL */
  iconUrl?: string;
  /** optional, used to identify validators on keybase.io */
  keybaseUsername?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseOptionalStringField(
  info: Record<string, unknown>,
  key: keyof Info,
): string | undefined {
  const value = info[key];
  assert(
    value === undefined || typeof value === 'string',
    `Expected validator info field "${key}" to be a string`,
  );
  return value;
}

function parseInfo(value: unknown): Info {
  assert(isRecord(value), 'Expected validator info to be an object');
  assert(
    typeof value.name === 'string',
    'Expected validator info field "name" to be a string',
  );

  const website = parseOptionalStringField(value, 'website');
  const details = parseOptionalStringField(value, 'details');
  const iconUrl = parseOptionalStringField(value, 'iconUrl');
  const keybaseUsername = parseOptionalStringField(value, 'keybaseUsername');

  return {
    name: value.name,
    ...(website !== undefined ? {website} : null),
    ...(details !== undefined ? {details} : null),
    ...(iconUrl !== undefined ? {iconUrl} : null),
    ...(keybaseUsername !== undefined ? {keybaseUsername} : null),
  };
}

const VALIDATOR_INFO_CONFIG_DECODER = getStructDecoder([
  [
    'configKeys',
    getArrayDecoder(CONFIG_KEY_DECODER, {size: SHORT_U16_DECODER}),
  ],
  ['info', RUST_STRING_CODEC],
]);

/**
 * ValidatorInfo class
 */
export class ValidatorInfo {
  /**
   * validator public key
   */
  key: PublicKey;
  /**
   * validator information
   */
  info: Info;

  /**
   * Construct a valid ValidatorInfo
   *
   * @param key validator public key
   * @param info validator information
   */
  constructor(key: PublicKey, info: Info) {
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
  static fromConfigData(
    buffer: Uint8Array | Array<number>,
  ): ValidatorInfo | null {
    const {configKeys: decodedConfigKeys, info: rawInfo} =
      VALIDATOR_INFO_CONFIG_DECODER.decode(toUint8ArrayView(buffer));
    if (decodedConfigKeys.length !== 2) return null;

    const configKeys: Array<ConfigKey> = decodedConfigKeys.map(configKey => ({
      publicKey: new PublicKey(configKey.publicKey),
      isSigner: configKey.isSigner === 1,
    }));

    if (configKeys[0].publicKey.equals(VALIDATOR_INFO_KEY)) {
      if (configKeys[1].isSigner) {
        const info = parseInfo(JSON.parse(rawInfo));
        return new ValidatorInfo(configKeys[1].publicKey, info);
      }
    }

    return null;
  }
}
