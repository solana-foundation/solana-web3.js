import {Buffer} from 'buffer';
import {expect} from 'chai';

import {Keypair} from '../src/keypair';
import {Address} from '../src/address';
import {ValidatorInfo} from '../src/validator-info';

describe('ValidatorInfo', () => {
  it('from config account data', async () => {
    const keypair = await Keypair.fromSeed(Uint8Array.from(Array(32).fill(8)));

    const expectedValidatorInfo = new ValidatorInfo(
      new Address(keypair.publicKey),
      {
        name: 'Validator',
        keybaseUsername: 'validator_id',
        iconUrl: 'https://example.com/icon',
      },
    );

    // Config data string steps:
    // 1) Generate a keypair
    // 2) Airdrop lamports to the account
    // 3) Modify the `solana-validator-info` tool
    //   a) Remove the keybase id verification step
    //   b) Print base64 account data in the `get --all` codepath
    //   c) Add `println!("Account data: {:?}", base64::encode(&account.data));`
    // 4) Use modified `solana-validator-info` tool to publish validator info
    // 5) And then use it again to fetch the data! (feel free to trim some A's)
    const configData = Buffer.from(
      'AgdRlwF0SPKsXcI8nrx6x4wKJyV6xhRFjeCk8W+AAAAAABOY9ixtGkV8UbpqS189vS9p/KkyFiGNyJl+QWvRfZPKAVoAAAAAAAAAeyJrZXliYXNlVXNlcm5hbWUiOiJ2YWxpZGF0b3JfaWQiLCJuYW1lIjoiVmFsaWRhdG9yIiwiaWNvblVybCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vaWNvbiJ9',
      'base64',
    );
    const info = ValidatorInfo.fromConfigData(configData);

    expect(info).to.eql(expectedValidatorInfo);
  });

  it('from config account data accepts Uint8Array input', async () => {
    const keypair = await Keypair.fromSeed(Uint8Array.from(Array(32).fill(8)));

    const expectedValidatorInfo = new ValidatorInfo(
      new Address(keypair.publicKey),
      {
        name: 'Validator',
        keybaseUsername: 'validator_id',
        iconUrl: 'https://example.com/icon',
      },
    );

    const configData = Buffer.from(
      'AgdRlwF0SPKsXcI8nrx6x4wKJyV6xhRFjeCk8W+AAAAAABOY9ixtGkV8UbpqS189vS9p/KkyFiGNyJl+QWvRfZPKAVoAAAAAAAAAeyJrZXliYXNlVXNlcm5hbWUiOiJ2YWxpZGF0b3JfaWQiLCJuYW1lIjoiVmFsaWRhdG9yIiwiaWNvblVybCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vaWNvbiJ9',
      'base64',
    );
    const info = ValidatorInfo.fromConfigData(Uint8Array.from(configData));

    expect(info).to.eql(expectedValidatorInfo);
  });

  it('from config account data accepts sliced Uint8Array input', async () => {
    const keypair = await Keypair.fromSeed(Uint8Array.from(Array(32).fill(8)));

    const expectedValidatorInfo = new ValidatorInfo(
      new Address(keypair.publicKey),
      {
        name: 'Validator',
        keybaseUsername: 'validator_id',
        iconUrl: 'https://example.com/icon',
      },
    );

    const configData = Buffer.from(
      'AgdRlwF0SPKsXcI8nrx6x4wKJyV6xhRFjeCk8W+AAAAAABOY9ixtGkV8UbpqS189vS9p/KkyFiGNyJl+QWvRfZPKAVoAAAAAAAAAeyJrZXliYXNlVXNlcm5hbWUiOiJ2YWxpZGF0b3JfaWQiLCJuYW1lIjoiVmFsaWRhdG9yIiwiaWNvblVybCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vaWNvbiJ9',
      'base64',
    );
    const padded = Uint8Array.from([99, ...configData, 77]);
    const info = ValidatorInfo.fromConfigData(
      padded.subarray(1, configData.length + 1),
    );

    expect(info).to.eql(expectedValidatorInfo);
  });
});
