import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {Keypair} from '../src/keypair';
import {PublicKey, MAX_SEED_LENGTH} from '../src/publickey';
import {getUniqueAddress} from './utils/address';

use(chaiAsPromised);

describe('PublicKey', function () {
  it('invalid', () => {
    expect(() => {
      new PublicKey([
        3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ]);
    }).to.throw();

    expect(() => {
      new PublicKey(
        '0x300000000000000000000000000000000000000000000000000000000000000000000',
      );
    }).to.throw();

    expect(() => {
      new PublicKey(
        '0x300000000000000000000000000000000000000000000000000000000000000',
      );
    }).to.throw();

    expect(() => {
      new PublicKey(
        '135693854574979916511997248057056142015550763280047535983739356259273198796800000',
      );
    }).to.throw();

    expect(() => {
      new PublicKey('12345');
    }).to.throw();
  });

  it('rejects invalid numeric constructor inputs', () => {
    expect(() => {
      new PublicKey(-1);
    }).to.throw();

    expect(() => {
      new PublicKey(1.5);
    }).to.throw();

    expect(() => {
      new PublicKey(Number.MAX_SAFE_INTEGER + 1);
    }).to.throw();

    expect(() => {
      new PublicKey(-1n);
    }).to.throw();

    expect(() => {
      new PublicKey(1n << 256n);
    }).to.throw();
  });

  it('accepts max 256-bit bigint', () => {
    const max256Bit = (1n << 256n) - 1n;
    const key = new PublicKey(max256Bit);
    expect(Array.from(key.toBytes())).to.eql(Array(32).fill(0xff));
  });

  it('normalizes short Uint8Array and number[] inputs', () => {
    const fromUint8Array = new PublicKey(Uint8Array.from([1]));
    const fromNumberArray = new PublicKey([1]);
    const fromNumber = new PublicKey(1);

    expect(fromUint8Array.equals(fromNumber)).to.be.true;
    expect(fromNumberArray.equals(fromNumber)).to.be.true;
  });

  it('rejects invalid number[] byte values', () => {
    expect(() => {
      new PublicKey([256]);
    }).to.throw();

    expect(() => {
      new PublicKey([-1]);
    }).to.throw();

    expect(() => {
      new PublicKey([1.5]);
    }).to.throw();

    expect(() => {
      new PublicKey([Number.NaN]);
    }).to.throw();
  });

  it('does not retain mutable constructor input references', () => {
    const source = Uint8Array.from([1]);
    const key = new PublicKey(source);

    source[0] = 2;

    expect(key.equals(new PublicKey(1))).to.be.true;
  });

  it('equals', () => {
    const arrayKey = new PublicKey([
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0,
    ]);
    const base58Key = new PublicKey(
      'CiDwVBFgWV9E5MvXWoLgnEgn2hK7rJikbvfWavzAQz3',
    );

    expect(arrayKey.equals(base58Key)).to.be.true;
  });

  it('processes number', () => {
    const key = new PublicKey(58);
    expect(key.toBase58()).to.eq('111111111111111111111111111111121');
    expect(key.toString()).to.eq('111111111111111111111111111111121');
  });

  it('processes bigint', () => {
    const key = new PublicKey(1337n);
    expect(key.toBase58()).to.eq('111111111111111111111111111111Q4');
    expect(key.toString()).to.eq('111111111111111111111111111111Q4');
  });

  it('toBase58', () => {
    const key = new PublicKey('CiDwVBFgWV9E5MvXWoLgnEgn2hK7rJikbvfWavzAQz3');
    expect(key.toBase58()).to.eq('CiDwVBFgWV9E5MvXWoLgnEgn2hK7rJikbvfWavzAQz3');
    expect(key.toString()).to.eq('CiDwVBFgWV9E5MvXWoLgnEgn2hK7rJikbvfWavzAQz3');

    const key2 = new PublicKey('1111111111111111111111111111BukQL');
    expect(key2.toBase58()).to.eq('1111111111111111111111111111BukQL');
    expect(key2.toString()).to.eq('1111111111111111111111111111BukQL');

    const key3 = new PublicKey('11111111111111111111111111111111');
    expect(key3.toBase58()).to.eq('11111111111111111111111111111111');

    const key4 = new PublicKey([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(key4.toBase58()).to.eq('11111111111111111111111111111111');
  });

  it('toJSON', () => {
    const key = new PublicKey('CiDwVBFgWV9E5MvXWoLgnEgn2hK7rJikbvfWavzAQz3');
    expect(key.toJSON()).to.eq('CiDwVBFgWV9E5MvXWoLgnEgn2hK7rJikbvfWavzAQz3');
    expect(JSON.stringify(key)).to.eq(
      '"CiDwVBFgWV9E5MvXWoLgnEgn2hK7rJikbvfWavzAQz3"',
    );
    expect(JSON.stringify({key})).to.eq(
      '{"key":"CiDwVBFgWV9E5MvXWoLgnEgn2hK7rJikbvfWavzAQz3"}',
    );
  });

  it('toBytes', () => {
    const key = new PublicKey('CiDwVBFgWV9E5MvXWoLgnEgn2hK7rJikbvfWavzAQz3');
    expect(key.toBytes()).to.be.instanceOf(Uint8Array);
    expect(key.toBytes()).to.have.length(32);
    expect(key.toBase58()).to.eq('CiDwVBFgWV9E5MvXWoLgnEgn2hK7rJikbvfWavzAQz3');

    const key2 = new PublicKey('11111111111111111111111111111111');
    expect(key2.toBytes()).to.have.length(32);
    expect(key2.toBase58()).to.eq('11111111111111111111111111111111');

    const key3 = new PublicKey(0);
    expect(key3.toBytes()).to.have.length(32);
    expect(key3.toBase58()).to.eq('11111111111111111111111111111111');
  });

  it('toBytes returns a defensive copy', () => {
    const key = new PublicKey(1);
    const bytes = key.toBytes();

    bytes[31] = 2;

    expect(key.equals(new PublicKey(1))).to.be.true;
  });

  it('toBytes returns a fresh copy on each call', () => {
    const key = new PublicKey(1);
    const first = key.toBytes();
    const second = key.toBytes();

    first[31] = 2;

    expect(second[31]).to.eq(1);
    expect(key.equals(new PublicKey(1))).to.be.true;
  });

  it('default key', () => {
    expect(PublicKey.default.equals(new PublicKey(0))).to.be.true;
  });

  it('test helper returns distinct keys', () => {
    const key1 = getUniqueAddress();
    const key2 = getUniqueAddress();
    expect(key1.equals(key2)).to.be.false;
  });

  it('equals (II)', () => {
    const key1 = new PublicKey([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 1,
    ]);
    const key2 = new PublicKey(key1.toBytes());

    expect(key1.equals(key2)).to.be.true;
  });

  it('createWithSeed', async () => {
    const defaultPublicKey = new PublicKey('11111111111111111111111111111111');
    const derivedKey = await PublicKey.createWithSeed(
      defaultPublicKey,
      'limber chicken: 4/45',
      defaultPublicKey,
    );

    expect(
      derivedKey.equals(
        new PublicKey('9h1HyLCW5dZnBVap8C5egQ9Z6pHyjsh5MNy83iPqqRuq'),
      ),
    ).to.be.true;
  });

  it('createProgramAddress', async () => {
    const programId = new PublicKey(
      'BPFLoader1111111111111111111111111111111111',
    );
    const publicKey = new PublicKey(
      'SeedPubey1111111111111111111111111111111111',
    );

    let programAddress = await PublicKey.createProgramAddress(
      [Buffer.from('', 'utf8'), Buffer.from([1])],
      programId,
    );
    expect(
      programAddress.equals(
        new PublicKey('3gF2KMe9KiC6FNVBmfg9i267aMPvK37FewCip4eGBFcT'),
      ),
    ).to.be.true;

    programAddress = await PublicKey.createProgramAddress(
      [Buffer.from('☉', 'utf8')],
      programId,
    );
    expect(
      programAddress.equals(
        new PublicKey('7ytmC1nT1xY4RfxCV2ZgyA7UakC93do5ZdyhdF3EtPj7'),
      ),
    ).to.be.true;

    programAddress = await PublicKey.createProgramAddress(
      [Buffer.from('Talking', 'utf8'), Buffer.from('Squirrels', 'utf8')],
      programId,
    );
    expect(
      programAddress.equals(
        new PublicKey('HwRVBufQ4haG5XSgpspwKtNd3PC9GM9m1196uJW36vds'),
      ),
    ).to.be.true;

    programAddress = await PublicKey.createProgramAddress(
      [publicKey.toBytes()],
      programId,
    );
    expect(
      programAddress.equals(
        new PublicKey('GUs5qLUfsEHkcMB9T38vjr18ypEhRuNWiePW2LoK4E3K'),
      ),
    ).to.be.true;

    const programAddress2 = await PublicKey.createProgramAddress(
      [Buffer.from('Talking', 'utf8')],
      programId,
    );
    expect(programAddress.equals(programAddress2)).to.eq(false);

    await expect(
      PublicKey.createProgramAddress(
        [Buffer.alloc(MAX_SEED_LENGTH + 1)],
        programId,
      ),
    ).to.be.rejectedWith('The seed at index 0 with length 33 exceeds');

    await expect(
      PublicKey.createProgramAddress(
        Array(17).fill(Buffer.alloc(0)),
        programId,
      ),
    ).to.be.rejectedWith(
      'A maximum of 16 seeds, including the bump seed, may be supplied when creating an address.',
    );

    // https://github.com/solana-labs/solana/issues/11950
    {
      const nonceSeed = Buffer.alloc(8);
      nonceSeed.writeBigUInt64LE(2n, 0);
      const seeds = [
        new PublicKey('H4snTKK9adiU15gP22ErfZYtro3aqR9BTMXiH3AwiUTQ').toBytes(),
        nonceSeed,
      ];
      const programId = new PublicKey(
        '4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn',
      );
      programAddress = await PublicKey.createProgramAddress(seeds, programId);
      expect(
        programAddress.equals(
          new PublicKey('12rqwuEgBYiGhBrDJStCiqEtzQpTTiZbh7teNVLuYcFA'),
        ),
      ).to.be.true;
    }

    // Should work in promise mode, for backwards compatibility
    PublicKey.createProgramAddress(
      [Buffer.from('', 'utf8'), Buffer.from([1])],
      programId,
    ).then();
  });

  it('findProgramAddress', async () => {
    const programId = new PublicKey(
      'BPFLoader1111111111111111111111111111111111',
    );
    const [programAddress, nonce] = await PublicKey.findProgramAddress(
      [Buffer.from('', 'utf8')],
      programId,
    );
    expect(
      programAddress.equals(
        await PublicKey.createProgramAddress(
          [Buffer.from('', 'utf8'), Buffer.from([nonce])],
          programId,
        ),
      ),
    ).to.be.true;

    await expect(
      PublicKey.findProgramAddress(Array(16).fill(Buffer.alloc(0)), programId),
    ).to.be.rejectedWith(
      'A maximum of 16 seeds, including the bump seed, may be supplied when creating an address.',
    );

    // Should work in promise mode, for backwards compatibility
    PublicKey.findProgramAddress([Buffer.from('', 'utf8')], programId).then();
  });

  it('accepts Uint8Array seeds for program address derivation APIs', async () => {
    const programId = new PublicKey(
      'BPFLoader1111111111111111111111111111111111',
    );
    const bufferSeeds = [Buffer.from('Talking', 'utf8'), Buffer.from([1])];
    const uint8Seeds = bufferSeeds.map(seed => Uint8Array.from(seed));

    const asyncAddressFromBuffers = await PublicKey.createProgramAddress(
      bufferSeeds,
      programId,
    );
    const asyncAddressFromUint8 = await PublicKey.createProgramAddress(
      uint8Seeds,
      programId,
    );

    expect(asyncAddressFromUint8.equals(asyncAddressFromBuffers)).to.be.true;

    const [addressFromBuffers, nonceFromBuffers] =
      await PublicKey.findProgramAddress([Buffer.from('', 'utf8')], programId);
    const [addressFromUint8, nonceFromUint8] =
      await PublicKey.findProgramAddress(
        [Uint8Array.from(Buffer.from('', 'utf8'))],
        programId,
      );

    expect(addressFromUint8.equals(addressFromBuffers)).to.be.true;
    expect(nonceFromUint8).to.eq(nonceFromBuffers);
  });

  it('accepts sliced Uint8Array seeds for program address derivation APIs', async () => {
    const programId = new PublicKey(
      'BPFLoader1111111111111111111111111111111111',
    );
    const bufferSeeds = [Buffer.from('Talking', 'utf8'), Buffer.from([1])];
    const slicedSeeds = [
      Uint8Array.from([99, ...bufferSeeds[0], 77]).subarray(
        1,
        bufferSeeds[0].length + 1,
      ),
      Uint8Array.from([88, ...bufferSeeds[1], 66]).subarray(1, 2),
    ];

    const asyncAddressFromBuffers = await PublicKey.createProgramAddress(
      bufferSeeds,
      programId,
    );
    const asyncAddressFromSlicedUint8 = await PublicKey.createProgramAddress(
      slicedSeeds,
      programId,
    );

    expect(asyncAddressFromSlicedUint8.equals(asyncAddressFromBuffers)).to.be
      .true;
  });

  it('isOnCurve', async () => {
    const onCurve = (await Keypair.generate()).publicKey;
    expect(PublicKey.isOnCurve(onCurve.toBytes())).to.be.true;
    expect(PublicKey.isOnCurve(onCurve.toBase58())).to.be.true;
    expect(PublicKey.isOnCurve(onCurve)).to.be.true;
    // A program address, yanked from one of the above tests. This is a pretty
    // poor test vector since it was created by the same code it is testing.
    // Unfortunately, I've been unable to find a golden negative example input
    // for curve25519 point decompression :/
    const offCurve = new PublicKey(
      '12rqwuEgBYiGhBrDJStCiqEtzQpTTiZbh7teNVLuYcFA',
    );
    expect(PublicKey.isOnCurve(offCurve.toBytes())).to.be.false;
    expect(PublicKey.isOnCurve(offCurve.toBase58())).to.be.false;
    expect(PublicKey.isOnCurve(offCurve)).to.be.false;
  });

  it('canBeSerializedWithBorsh', async () => {
    const publicKey = (await Keypair.generate()).publicKey;
    const encoded = publicKey.encode();

    expect(encoded.constructor).to.equal(Uint8Array);

    const decoded = PublicKey.decode(Uint8Array.from(encoded));
    expect(decoded.equals(publicKey)).to.be.true;
  });

  it('decode validates exact input length', () => {
    expect(() => {
      PublicKey.decode(new Uint8Array(31));
    }).to.throw();

    expect(() => {
      PublicKey.decode(new Uint8Array(33));
    }).to.throw();
  });

  it('decode accepts Array<number> input', () => {
    const publicKey = new PublicKey(1);
    const encoded = Array.from(publicKey.encode());

    const decoded = PublicKey.decode(encoded);

    expect(decoded.equals(publicKey)).to.be.true;
  });

  it('decode accepts sliced Uint8Array input', () => {
    const publicKey = new PublicKey(1);
    const encoded = publicKey.encode();
    const sliced = Uint8Array.from([99, ...encoded, 77]).subarray(
      1,
      encoded.length + 1,
    );

    const decoded = PublicKey.decode(sliced);

    expect(decoded.equals(publicKey)).to.be.true;
  });

  it('decode does not mutate caller-provided bytes', () => {
    const publicKey = new PublicKey(1);
    const encoded = publicKey.encode();
    const padded = Uint8Array.from([99, ...encoded, 77]);
    const sliced = padded.subarray(1, encoded.length + 1);
    const before = Array.from(sliced);

    PublicKey.decode(sliced);

    expect(Array.from(sliced)).to.eql(before);
  });

  it('canBeDeserializedUncheckedWithBorsh', async () => {
    const publicKey = (await Keypair.generate()).publicKey;
    const encoded = Uint8Array.from([
      ...publicKey.encode(),
      ...new Uint8Array(10),
    ]);
    const decoded = PublicKey.decodeUnchecked(encoded);
    expect(decoded.equals(publicKey)).to.be.true;
  });

  it('decodeUnchecked uses the first 32 bytes and rejects short input', () => {
    const firstField = new Uint8Array(32);
    firstField[31] = 1;
    const encoded = Uint8Array.from([...firstField, 9, 8, 7]);

    const decoded = PublicKey.decodeUnchecked(encoded);
    const expected = PublicKey.decode(firstField);
    expect(decoded.equals(expected)).to.be.true;

    expect(() => {
      PublicKey.decodeUnchecked(new Uint8Array(31));
    }).to.throw();
  });

  it('decodeUnchecked accepts Array<number> input', () => {
    const publicKey = new PublicKey(1);
    const encoded = [...publicKey.encode(), 9, 8, 7];

    const decoded = PublicKey.decodeUnchecked(encoded);

    expect(decoded.equals(publicKey)).to.be.true;
  });

  it('decodeUnchecked accepts sliced Uint8Array input', () => {
    const publicKey = new PublicKey(1);
    const encoded = publicKey.encode();
    const extended = Uint8Array.from([99, ...encoded, 9, 8, 7, 77]).subarray(
      1,
      encoded.length + 4,
    );

    const decoded = PublicKey.decodeUnchecked(extended);

    expect(decoded.equals(publicKey)).to.be.true;
  });

  it('decodeUnchecked does not mutate caller-provided bytes', () => {
    const publicKey = new PublicKey(1);
    const encoded = publicKey.encode();
    const padded = Uint8Array.from([99, ...encoded, 9, 8, 7, 77]);
    const sliced = padded.subarray(1, encoded.length + 4);
    const before = Array.from(sliced);

    PublicKey.decodeUnchecked(sliced);

    expect(Array.from(sliced)).to.eql(before);
    expect(PublicKey.decodeUnchecked(sliced).equals(publicKey)).to.be.true;
  });

  it('verifies signatures in async and sync modes', async () => {
    const signer = await Keypair.generate();
    const message = Buffer.from('public key verify message');
    const signature = await signer.signBytes(message);

    expect(await signer.publicKey.verifySignature(signature, message)).to.be
      .true;

    const wrongMessage = Buffer.from('wrong message');
    expect(await signer.publicKey.verifySignature(signature, wrongMessage)).to
      .be.false;
  });
});
