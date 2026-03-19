import {
  assert as assertType,
  optional,
  string,
  type as pick,
} from 'superstruct';
import {fixDecoderSize} from '@solana/codecs-core';
import {
  getArrayDecoder,
  getBytesDecoder,
  getStructDecoder,
} from '@solana/codecs-data-structures';
import {getShortU16Decoder} from '@solana/codecs-numbers';
import {getU8Decoder} from '@solana/codecs-numbers';

import * as Layout from './layout';
import {Address, PUBLIC_KEY_LENGTH} from './address';
import {toUint8ArrayView} from './utils/typed-array';

const SHORT_U16_DECODER = getShortU16Decoder();
const U8_DECODER = getU8Decoder();
const CONFIG_KEY_DECODER = getStructDecoder([
  ['publicKey', fixDecoderSize(getBytesDecoder(), PUBLIC_KEY_LENGTH)],
  ['isSigner', U8_DECODER],
]);
const VALIDATOR_INFO_CONFIG_DECODER = getStructDecoder([
  ['configKeys', getArrayDecoder(CONFIG_KEY_DECODER, {size: SHORT_U16_DECODER})],
  ['infoData', getBytesDecoder()],
]);

export const VALIDATOR_INFO_KEY = new Address(
  'Va1idator1nfo111111111111111111111111111111',
);

/**
 * @internal
 */
type ConfigKey = {
  publicKey: Address;
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

const InfoString = pick({
  name: string(),
  website: optional(string()),
  details: optional(string()),
  iconUrl: optional(string()),
  keybaseUsername: optional(string()),
});

/**
 * ValidatorInfo class
 */
export class ValidatorInfo {
  /**
   * validator public key
   */
  key: Address;
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
  constructor(key: Address, info: Info) {
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
    const {configKeys: decodedConfigKeys, infoData} =
      VALIDATOR_INFO_CONFIG_DECODER.decode(toUint8ArrayView(buffer));
    if (decodedConfigKeys.length !== 2) return null;

    const configKeys: Array<ConfigKey> = decodedConfigKeys.map(configKey => ({
      publicKey: new Address(configKey.publicKey),
      isSigner: configKey.isSigner === 1,
    }));

    if (configKeys[0].publicKey.equals(VALIDATOR_INFO_KEY)) {
      if (configKeys[1].isSigner) {
        const rawInfo: any = Layout.rustString().decode(
          toUint8ArrayView(infoData),
        );
        const info = JSON.parse(rawInfo as string);
        assertType(info, InfoString);
        return new ValidatorInfo(configKeys[1].publicKey, info);
      }
    }

    return null;
  }
}
