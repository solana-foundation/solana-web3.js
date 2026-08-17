import {
  blockhash,
  createJsonRpcApi,
  createRpc,
  getBase58Codec,
  type Blockhash,
} from '@solana/kit';
import {getTransferSolInstructionDataEncoder} from '@solana-program/system';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {mock, spy, stub, useFakeTimers, SinonFakeTimers} from 'sinon';
import sinonChai from 'sinon-chai';

import {
  Connection,
  EpochSchedule,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  Address,
  sendAndConfirmTransaction,
  Keypair,
  Message,
  AddressLookupTableProgram,
  NONCE_ACCOUNT_LENGTH,
  MessageAddressTableLookup,
  sendAndConfirmRawTransaction,
  SendTransactionError,
} from '../src';
import invariant from '../src/utils/assert';
import {MOCK_PORT, url} from './url';
import {getUniqueAddress} from './utils/address';
import {
  AccountInfo,
  BLOCKHASH_CACHE_TIMEOUT_MS,
  BlockResponse,
  BlockSignatures,
  Commitment,
  ConfirmedBlock,
  Context,
  InflationGovernor,
  Logs,
  SignatureResult,
  SlotInfo,
} from '../src/connection';
import {sleep} from '../src/utils/sleep';
import {
  helpers,
  mockErrorResponse,
  mockRpcResponse,
  mockServer,
} from './mocks/rpc-http';
import {
  createSignatureStatusRpcResult,
  stubSubscriptions,
  restoreSubscriptions,
  mockRpcMessage,
  teardownSubscriptions,
} from './mocks/rpc-subscriptions';
import {
  NonceInformation,
  TransactionInstruction,
  TransactionSignature,
  TransactionExpiredBlockheightExceededError,
  TransactionExpiredNonceInvalidError,
  TransactionExpiredTimeoutError,
  TransactionMessage,
} from '../src/transaction';
import type {SignatureStatus, KeyedAccountInfo} from '../src/connection';
import type {RpcWebSocketSignatureNotificationResult} from '../src/rpc-subscriptions/runtime';
import {VersionedTransaction} from '../src/transaction/versioned';
import {MessageV0} from '../src/message/v0';
import {MessageV1} from '../src/message/v1';

const SAMPLE_BLOCKHASH = blockhash(
  'EkSnNWidA2rMT4wAhyLQ6UxJ2yR6b6bJ7hVn6XK7rxJQ',
);

const BASE58_CODEC = getBase58Codec();

const TOKEN_PROGRAM_ID = new Address(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

// See scripts/fixtures/legacy-token-test-mint-account.json
const LEGACY_TOKEN_TEST_MINT_PUBKEY = new Address(
  '7MbpdfJa5xqwexkp6WUvkYHTPo4VgxYACDBNFWYLwCdo',
);

// See scripts/fixtures/legacy-token-test-token-owner.json
const LEGACY_TOKEN_TEST_OWNER_SECRET_KEY =
  // Public key: `AVGuygVeBmbYiJ47V7tgBNLSukNqW7pWZYJsKUNWhHpc`
  new Uint8Array([
    153, 120, 247, 45, 160, 119, 144, 219, 220, 209, 73, 91, 210, 102, 31, 136,
    155, 12, 68, 27, 226, 215, 61, 214, 10, 245, 247, 180, 236, 63, 100, 202,
    140, 247, 112, 54, 120, 32, 168, 118, 72, 115, 190, 34, 171, 126, 15, 119,
    252, 173, 50, 173, 8, 10, 96, 239, 21, 32, 94, 67, 37, 43, 145, 249,
  ]);

// See scripts/fixtures/legacy-token-test-token-account.json
const LEGACY_TOKEN_TEST_ACCOUNT_PUBKEY = new Address(
  'EryTMgfSEabo5Fc7dN5z3nBQKzfHUJRpHAMnXdCrTq4S',
);

// Exceeds Number.MAX_SAFE_INTEGER, so this fixture exercises bigint-preserving JSON handling instead of safe-number coercion.
const LARGE_BLOCK_TIME = 9007199254740993n;

use(chaiAsPromised);
use(sinonChai);

async function waitForSlot(
  this: Mocha.Context,
  connection: Connection,
  minSlot: number = 0,
): Promise<void> {
  while ((await connection.getSlot()) <= minSlot) {
    if (process.env.TEST_LIVE) {
      // If the test validator is newly spawned, it may not have formed a root yet. Since we're
      // going to have to wait up to 32 slots for a root, let's increase the timeout of this test.
      this.timeout(
        2000 +
          400 * // ms per slot
            (32 + minSlot) * // Max confirmations
            1.25, // Fudge factor to leave time for rest of test
      );
    }
    continue;
  }
}
async function mockNonceAccountResponse(
  nonceAccountPubkey: string,
  nonceValue: string,
  nonceAuthority: string,
  slot?: number,
) {
  const mockNonceAccountData = new Uint8Array(NONCE_ACCOUNT_LENGTH);
  // Authority starts after 4 version bytes and 4 state bytes.
  mockNonceAccountData.set(BASE58_CODEC.encode(nonceAuthority), 4 + 4);
  // Nonce hash starts 32 bytes after the authority.
  mockNonceAccountData.set(BASE58_CODEC.encode(nonceValue), 4 + 4 + 32);
  await mockRpcResponse({
    method: 'getAccountInfo',
    params: [nonceAccountPubkey, {encoding: 'base64'}],
    value: {
      owner: SystemProgram.programId.toBase58(),
      lamports: BigInt(LAMPORTS_PER_SOL),
      data: [Buffer.from(mockNonceAccountData).toString('base64'), 'base64'],
      executable: false,
      rentEpoch: 20n,
      space: 0n,
    },
    slot,
    withContext: true,
  });
}

const verifySignatureStatus = (
  status: SignatureStatus | null,
  err?: unknown,
): SignatureStatus => {
  if (status === null) {
    expect(status).not.to.be.null;
    throw new Error(); // unreachable
  }

  const expectedErr = err || null;
  expect(status.err).to.eql(expectedErr);
  expect(status.slot >= 0n).to.eq(true);
  if (expectedErr !== null) return status;

  const confirmations = status.confirmations;
  if (typeof confirmations === 'bigint') {
    expect(confirmations >= 0n).to.eq(true);
  } else {
    expect(confirmations).to.be.null;
  }
  return status;
};

describe('Connection', function () {
  let connection: Connection;
  beforeEach(() => {
    if (!mockServer) {
      connection = new Connection(url);
    }
  });
  afterEach(async () => {
    await teardownSubscriptions(connection);
  });

  if (mockServer) {
    const server = mockServer;
    beforeEach(() => {
      server.start(MOCK_PORT);
      connection = stubSubscriptions(url);
    });

    afterEach(async () => {
      server.stop();
      await restoreSubscriptions(connection);
    });
  }

  if (mockServer) {
    it('should pass HTTP headers to RPC', async () => {
      const headers = {
        Authorization: 'Bearer 123',
      };

      const connection = new Connection(url, {
        httpHeaders: headers,
      });

      await mockRpcResponse({
        method: 'getVersion',
        params: [],
        value: {'solana-core': '3.1.11'},
        withHeaders: headers,
      });

      expect(await connection.getVersion()).to.be.not.null;
    });

    it('should allow overriding fetch', async () => {
      const fetchCalls: Array<Parameters<typeof globalThis.fetch>> = [];
      const connection = new Connection(url, {
        fetch: async (...args) => {
          fetchCalls.push(args);
          return await globalThis.fetch(...args);
        },
      });

      await mockRpcResponse({
        method: 'getVersion',
        params: [],
        value: {'solana-core': '3.1.11'},
      });

      expect(await connection.getVersion()).to.be.not.null;
      expect(fetchCalls).to.have.length(1);
      expect(String(fetchCalls[0][0])).to.eq(url);
    });

    it('should allow middleware to augment request', async () => {
      const connection = new Connection(url, {
        fetchMiddleware: (url, options, fetch) => {
          options.headers = Object.assign(options.headers, {
            Authorization: 'Bearer 123',
          });
          fetch(url, options);
        },
      });

      await mockRpcResponse({
        method: 'getVersion',
        params: [],
        value: {'solana-core': '3.1.11'},
        withHeaders: {
          Authorization: 'Bearer 123',
        },
      });

      expect(await connection.getVersion()).to.be.not.null;
    });

    it('does not inject Node-specific request options into middleware transport', async () => {
      let requestOptions:
        | {
            body?: BodyInit | null;
            headers?: HeadersInit;
            method?: string;
          }
        | undefined;

      const connection = new Connection(url, {
        fetchMiddleware: (requestUrl, options, fetch) => {
          requestOptions = options;
          fetch(requestUrl, options);
        },
      });

      await mockRpcResponse({
        method: 'getVersion',
        params: [],
        value: {'solana-core': '3.1.11'},
      });

      expect(await connection.getVersion()).to.be.not.null;
      expect(requestOptions).not.to.have.property('dispatcher');
    });

    it('normalizes standard headers in the custom fetch transport', async () => {
      let requestOptions:
        | {
            body?: BodyInit | null;
            headers?: HeadersInit;
            method?: string;
          }
        | undefined;
      const connection = new Connection(url, {
        fetch: (_url, options) => {
          requestOptions = options;
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: '',
                jsonrpc: '2.0',
                result: {'solana-core': '3.1.11'},
              }),
              {
                headers: {'content-type': 'application/json'},
                status: 200,
              },
            ),
          );
        },
        httpHeaders: {
          Authorization: 'Bearer 123',
        },
      });

      expect(await connection.getVersion()).to.be.not.null;
      expect(requestOptions?.method).to.eq('POST');
      expect(requestOptions?.body).to.be.a('string');

      const headers = requestOptions?.headers as Record<string, string>;
      expect(headers).to.include({
        accept: 'application/json',
        authorization: 'Bearer 123',
        'content-type': 'application/json; charset=utf-8',
        'solana-client': `js/${process.env.npm_package_version ?? 'UNKNOWN'}`,
      });
      expect(Number(headers['content-length'])).to.be.greaterThan(0);
      expect(headers).not.to.have.property('Authorization');
    });

    it('exposes framework-agnostic RPC configuration', async () => {
      const headers = {
        Authorization: 'Bearer 123',
      };

      const connection = new Connection(url, {
        httpHeaders: headers,
      });

      expect(connection.rpcEndpoint).to.eq(url);
      expect(connection.rpcHttpHeaders).to.equal(headers);

      await mockRpcResponse({
        method: 'getHealth',
        params: [],
        value: 'ok',
        withHeaders: headers,
      });

      const rpc = createRpc({
        api: createJsonRpcApi<{getHealth(): unknown}>(),
        transport: async ({payload, signal}) => {
          const requestHeaders = new Headers({
            'Content-Type': 'application/json',
          });
          for (const [header, value] of Object.entries(
            connection.rpcHttpHeaders ?? {},
          )) {
            requestHeaders.set(header, value);
          }

          const response = await globalThis.fetch(connection.rpcEndpoint, {
            body: JSON.stringify(payload),
            headers: requestHeaders,
            method: 'POST',
            signal,
          });

          const text = await response.text();
          if (!response.ok) {
            throw new Error(
              `${response.status} ${response.statusText}: ${text}`,
            );
          }

          return text ? JSON.parse(text) : null;
        },
      });
      const healthResponse = await rpc.getHealth().send();

      if (
        healthResponse &&
        typeof healthResponse === 'object' &&
        'result' in healthResponse
      ) {
        expect((healthResponse as {result: unknown}).result).to.eq('ok');
      } else {
        expect(healthResponse).to.eq('ok');
      }
    });

    it('should attribute middleware fatals to the middleware', async () => {
      const connection = new Connection(url, {
        fetchMiddleware: () => {
          throw new Error('This middleware experienced a fatal error');
        },
      });
      const error = await expect(connection.getVersion()).to.be.rejectedWith(
        'This middleware experienced a fatal error',
      );
      expect(error)
        .to.be.an.instanceOf(Error)
        .and.to.have.property('stack')
        .that.include('fetchMiddleware');
    });

    it('should not attribute fetch errors to the middleware', async () => {
      const connection = new Connection(url, {
        fetchMiddleware: (url, _options, fetch) => {
          fetch(url, 'An `Object` was expected here; this is a `TypeError`.');
        },
      });
      const error = await expect(connection.getVersion()).to.be.rejected;
      expect(error)
        .to.be.an.instanceOf(Error)
        .and.to.have.property('stack')
        .that.does.not.include('fetchMiddleware');
    });
  }

  it('get account info - not found', async () => {
    const account = await Keypair.generate();

    await mockRpcResponse({
      method: 'getAccountInfo',
      params: [account.publicKey.toBase58(), {encoding: 'base64'}],
      value: null,
      withContext: true,
    });

    expect(await connection.getAccountInfo(account.publicKey)).to.be.null;

    await mockRpcResponse({
      method: 'getAccountInfo',
      params: [account.publicKey.toBase58(), {encoding: 'jsonParsed'}],
      value: null,
      withContext: true,
    });

    const parsedAccountInfo = await connection.getParsedAccountInfo(
      account.publicKey,
    );
    expect(typeof parsedAccountInfo.context.slot).to.eq('bigint');
    expect(parsedAccountInfo.value).to.be.null;
  });

  it('get account info with config object', async () => {
    const account = await Keypair.generate();
    const dataSlice = {offset: 4, length: 2} as const;

    if (process.env.TEST_LIVE) {
      const payer = await Keypair.generate();
      const lamports = await connection.getMinimumBalanceForRentExemption(
        NONCE_ACCOUNT_LENGTH,
        'confirmed',
      );

      await helpers.airdrop({
        connection,
        address: payer.publicKey,
        amount: LAMPORTS_PER_SOL,
      });

      const transaction = new Transaction().add(
        SystemProgram.createNonceAccount({
          fromPubkey: payer.publicKey,
          noncePubkey: account.publicKey,
          authorizedPubkey: payer.publicKey,
          lamports: Number(lamports),
        }),
      );

      await helpers.processTransaction({
        connection,
        transaction,
        signers: [payer, account],
        commitment: 'confirmed',
      });

      const minContextSlot = await connection.getSlot('confirmed');
      const accountInfo = await connection.getAccountInfo(account.publicKey, {
        commitment: 'confirmed',
        dataSlice,
        minContextSlot: Number(minContextSlot),
      });
      const accountInfoAndContext = await connection.getAccountInfoAndContext(
        account.publicKey,
        {
          commitment: 'confirmed',
          dataSlice,
          minContextSlot: Number(minContextSlot),
        },
      );

      expect(accountInfo).not.to.be.null;
      expect(accountInfo!.data).to.be.instanceOf(Uint8Array);
      expect(Buffer.isBuffer(accountInfo!.data)).to.be.false;
      expect(accountInfo!.data).to.eql(Uint8Array.from([1, 0]));
      expect(accountInfo!.lamports).to.eq(BigInt(lamports));
      expect(accountInfo!.owner).to.eql(SystemProgram.programId);
      expect(typeof accountInfoAndContext.context.slot).to.eq('bigint');
      expect(accountInfoAndContext.value).to.eql(accountInfo);
      return;
    }

    await mockRpcResponse({
      method: 'getAccountInfo',
      params: [
        account.publicKey.toBase58(),
        {
          commitment: 'confirmed',
          dataSlice,
          encoding: 'base64',
          minContextSlot: 5,
        },
      ],
      value: {
        owner: '11111111111111111111111111111111',
        lamports: BigInt(LAMPORTS_PER_SOL),
        data: ['AQA=', 'base64'],
        executable: false,
        rentEpoch: 20n,
        space: 2n,
      },
      withContext: true,
    });

    const accountInfo = await connection.getAccountInfo(account.publicKey, {
      commitment: 'confirmed',
      dataSlice,
      minContextSlot: 5,
    });

    await mockRpcResponse({
      method: 'getAccountInfo',
      params: [
        account.publicKey.toBase58(),
        {
          commitment: 'confirmed',
          dataSlice,
          encoding: 'base64',
          minContextSlot: 5,
        },
      ],
      value: {
        owner: '11111111111111111111111111111111',
        lamports: BigInt(LAMPORTS_PER_SOL),
        data: ['AQA=', 'base64'],
        executable: false,
        rentEpoch: 20n,
        space: 2n,
      },
      withContext: true,
    });

    const accountInfoAndContext = await connection.getAccountInfoAndContext(
      account.publicKey,
      {
        commitment: 'confirmed',
        dataSlice,
        minContextSlot: 5,
      },
    );

    expect(accountInfo?.data).to.be.instanceOf(Uint8Array);
    expect(Buffer.isBuffer(accountInfo?.data)).to.be.false;
    expect(accountInfo?.data).to.eql(Uint8Array.from([1, 0]));
    expect(accountInfo?.lamports).to.eq(BigInt(LAMPORTS_PER_SOL));
    expect(accountInfo?.owner).to.eql(SystemProgram.programId);
    expect(accountInfo?.rentEpoch).to.eq(20n);
    expect(accountInfo?.space).to.eq(2n);
    expect(accountInfoAndContext.context.slot).to.eq(11n);
    expect(accountInfoAndContext.value).to.eql({
      data: Uint8Array.from([1, 0]),
      executable: false,
      lamports: BigInt(LAMPORTS_PER_SOL),
      owner: SystemProgram.programId,
      rentEpoch: 20n,
      space: 2n,
    });
  });

  it('get multiple accounts info', async () => {
    const account1 = await Keypair.generate();
    const account2 = await Keypair.generate();

    {
      await helpers.airdrop({
        connection,
        address: account1.publicKey,
        amount: LAMPORTS_PER_SOL,
      });

      await helpers.airdrop({
        connection,
        address: account2.publicKey,
        amount: LAMPORTS_PER_SOL,
      });
    }

    const value = [
      {
        owner: '11111111111111111111111111111111',
        lamports: BigInt(LAMPORTS_PER_SOL),
        data: ['', 'base64'],
        executable: false,
        rentEpoch: 18446744073709551615n,
        space: 0n,
      },
      {
        owner: '11111111111111111111111111111111',
        lamports: BigInt(LAMPORTS_PER_SOL),
        data: ['', 'base64'],
        executable: false,
        rentEpoch: 18446744073709551615n,
        space: 0n,
      },
    ];

    await mockRpcResponse({
      method: 'getMultipleAccounts',
      params: [
        [account1.publicKey.toBase58(), account2.publicKey.toBase58()],
        {encoding: 'base64'},
      ],
      preserveBigIntJsonValues: true,
      value: value,
      withContext: true,
    });

    const responseWithContext =
      await connection.getMultipleAccountsInfoAndContext(
        [account1.publicKey, account2.publicKey],
        'confirmed',
      );

    await mockRpcResponse({
      method: 'getMultipleAccounts',
      params: [
        [account1.publicKey.toBase58(), account2.publicKey.toBase58()],
        {encoding: 'base64'},
      ],
      preserveBigIntJsonValues: true,
      value: value,
      withContext: true,
    });

    const res = await connection.getMultipleAccountsInfo(
      [account1.publicKey, account2.publicKey],
      'confirmed',
    );

    if (process.env.TEST_LIVE) {
      expect(res).to.have.length(2);
      for (const accountInfo of res) {
        if (accountInfo == null) {
          throw new Error('Expected account info to be present');
        }
        expect(accountInfo.owner).to.eql(
          new Address('11111111111111111111111111111111'),
        );
        expect(accountInfo.lamports).to.eq(BigInt(LAMPORTS_PER_SOL));
        expect(accountInfo.data).to.eql(new Uint8Array());
        expect(accountInfo.executable).to.be.false;
        expect(accountInfo.rentEpoch).to.be.a('bigint');
        expect(accountInfo.rentEpoch! > 0n).to.be.true;
        expect(accountInfo.space).to.be.a('bigint');
        expect(accountInfo.space >= 0n).to.be.true;
      }
      expect(typeof responseWithContext.context.slot).to.eq('bigint');
      expect(responseWithContext.value).to.eql(res);
      return;
    }

    const expectedValue = [
      {
        owner: new Address('11111111111111111111111111111111'),
        lamports: BigInt(LAMPORTS_PER_SOL),
        data: new Uint8Array(),
        executable: false,
        rentEpoch: 2n ** 64n - 1n,
        space: 0n,
      },
      {
        owner: new Address('11111111111111111111111111111111'),
        lamports: BigInt(LAMPORTS_PER_SOL),
        data: new Uint8Array(),
        executable: false,
        rentEpoch: 2n ** 64n - 1n,
        space: 0n,
      },
    ];

    expect(responseWithContext.context.slot).to.eq(11n);
    expect(responseWithContext.value).to.eql(expectedValue);
    expect(res).to.eql(expectedValue);
  });

  it('get program accounts', async () => {
    const account0 = await Keypair.generate();
    const account1 = await Keypair.generate();
    const programId = await Keypair.generate();

    {
      await helpers.airdrop({
        connection,
        address: account0.publicKey,
        amount: LAMPORTS_PER_SOL,
      });

      const transaction = new Transaction().add(
        SystemProgram.assign({
          accountPubkey: account0.publicKey,
          programId: programId.publicKey,
        }),
      );

      await helpers.processTransaction({
        connection,
        transaction,
        signers: [account0],
        commitment: 'confirmed',
      });
    }

    await helpers.airdrop({
      connection,
      address: account1.publicKey,
      amount: 0.5 * LAMPORTS_PER_SOL,
    });

    const {blockhash, lastValidBlockHeight} = await helpers.latestBlockhash({
      connection,
    });
    const feePayer = account1.publicKey;

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight: Number(lastValidBlockHeight),
      feePayer,
    }).add(
      SystemProgram.assign({
        accountPubkey: account1.publicKey,
        programId: programId.publicKey,
      }),
    );

    const message = transaction._compile();
    const fee = Number(
      (await helpers.getFeeForMessage({connection, message})).value ?? 0n,
    );

    await helpers.processTransaction({
      connection,
      transaction,
      signers: [account1],
      commitment: 'confirmed',
    });

    {
      await mockRpcResponse({
        method: 'getProgramAccounts',
        params: [
          programId.publicKey.toBase58(),
          {commitment: 'confirmed', encoding: 'base64'},
        ],
        value: [
          {
            account: {
              data: ['', 'base64'],
              executable: false,
              lamports: BigInt(LAMPORTS_PER_SOL - fee),
              owner: programId.publicKey.toBase58(),
              rentEpoch: 20n,
              space: 0n,
            },
            pubkey: account0.publicKey.toBase58(),
          },
          {
            account: {
              data: ['', 'base64'],
              executable: false,
              lamports: BigInt(LAMPORTS_PER_SOL / 2 - fee),
              owner: programId.publicKey.toBase58(),
              rentEpoch: 20n,
              space: 0n,
            },
            pubkey: account1.publicKey.toBase58(),
          },
        ],
      });

      const programAccounts = await connection.getProgramAccounts(
        programId.publicKey,
        {
          commitment: 'confirmed',
        },
      );
      expect(programAccounts).to.have.length(2);
      programAccounts.forEach(function (keyedAccount) {
        expect(keyedAccount.account.space).to.eq(0n);
        if (keyedAccount.pubkey.equals(account0.publicKey)) {
          expect(keyedAccount.account.lamports).to.eq(
            BigInt(LAMPORTS_PER_SOL - fee),
          );
        } else {
          expect(keyedAccount.pubkey).to.eql(account1.publicKey);
          expect(keyedAccount.account.lamports).to.eq(
            BigInt(LAMPORTS_PER_SOL / 2 - fee),
          );
        }
      });
    }

    {
      await mockRpcResponse({
        method: 'getProgramAccounts',
        params: [
          programId.publicKey.toBase58(),
          {commitment: 'confirmed', encoding: 'base64'},
        ],
        value: [
          {
            account: {
              data: ['', 'base64'],
              executable: false,
              lamports: BigInt(LAMPORTS_PER_SOL - fee),
              owner: programId.publicKey.toBase58(),
              rentEpoch: 20n,
              space: 0n,
            },
            pubkey: account0.publicKey.toBase58(),
          },
          {
            account: {
              data: ['', 'base64'],
              executable: false,
              lamports: BigInt(LAMPORTS_PER_SOL / 2 - fee),
              owner: programId.publicKey.toBase58(),
              rentEpoch: 20n,
              space: 0n,
            },
            pubkey: account1.publicKey.toBase58(),
          },
        ],
      });

      const programAccounts = await connection.getProgramAccounts(
        programId.publicKey,
        'confirmed',
      );
      expect(programAccounts).to.have.length(2);
      programAccounts.forEach(function (keyedAccount) {
        if (keyedAccount.pubkey.equals(account0.publicKey)) {
          expect(keyedAccount.account.lamports).to.eq(
            BigInt(LAMPORTS_PER_SOL - fee),
          );
        } else {
          expect(keyedAccount.pubkey).to.eql(account1.publicKey);
          expect(keyedAccount.account.lamports).to.eq(
            BigInt(LAMPORTS_PER_SOL / 2 - fee),
          );
        }
      });
    }

    {
      await mockRpcResponse({
        method: 'getProgramAccounts',
        params: [
          programId.publicKey.toBase58(),
          {
            commitment: 'confirmed',
            encoding: 'base64',
            filters: [
              {
                dataSize: 0,
              },
            ],
          },
        ],
        value: [
          {
            account: {
              data: ['', 'base64'],
              executable: false,
              lamports: BigInt(LAMPORTS_PER_SOL - fee),
              owner: programId.publicKey.toBase58(),
              rentEpoch: 20n,
              space: 0n,
            },
            pubkey: account0.publicKey.toBase58(),
          },
          {
            account: {
              data: ['', 'base64'],
              executable: false,
              lamports: BigInt(LAMPORTS_PER_SOL / 2 - fee),
              owner: programId.publicKey.toBase58(),
              rentEpoch: 20n,
              space: 0n,
            },
            pubkey: account1.publicKey.toBase58(),
          },
        ],
      });

      const programAccountsDoMatchFilter = await connection.getProgramAccounts(
        programId.publicKey,
        {
          commitment: 'confirmed',
          encoding: 'base64',
          filters: [{dataSize: 0}],
        },
      );
      expect(programAccountsDoMatchFilter).to.have.length(2);
    }

    {
      await mockRpcResponse({
        method: 'getProgramAccounts',
        params: [
          programId.publicKey.toBase58(),
          {
            commitment: 'confirmed',
            encoding: 'base64',
            filters: [
              {
                memcmp: {
                  encoding: 'base58',
                  offset: 0,
                  bytes: 'XzdZ3w',
                },
              },
            ],
          },
        ],
        value: [],
      });

      const programAccountsDontMatchFilter =
        await connection.getProgramAccounts(programId.publicKey, {
          commitment: 'confirmed',
          filters: [
            {
              memcmp: {
                offset: 0n,
                bytes: 'XzdZ3w',
              },
            },
          ],
        });
      expect(programAccountsDontMatchFilter).to.have.length(0);
    }

    {
      await mockRpcResponse({
        method: 'getProgramAccounts',
        params: [
          programId.publicKey.toBase58(),
          {commitment: 'confirmed', encoding: 'jsonParsed'},
        ],
        value: [
          {
            account: {
              data: ['', 'base64'],
              executable: false,
              lamports: LAMPORTS_PER_SOL - fee,
              owner: programId.publicKey.toBase58(),
              rentEpoch: 20,
              space: 0,
            },
            pubkey: account0.publicKey.toBase58(),
          },
          {
            account: {
              data: ['', 'base64'],
              executable: false,
              lamports: 0.5 * LAMPORTS_PER_SOL - fee,
              owner: programId.publicKey.toBase58(),
              rentEpoch: 20,
              space: 0,
            },
            pubkey: account1.publicKey.toBase58(),
          },
        ],
      });

      const programAccounts = await connection.getParsedProgramAccounts(
        programId.publicKey,
        {
          commitment: 'confirmed',
        },
      );
      expect(programAccounts).to.have.length(2);

      programAccounts.forEach(function (element) {
        if (element.pubkey.equals(account0.publicKey)) {
          expect(element.account.lamports).to.eq(
            BigInt(LAMPORTS_PER_SOL - fee),
          );
        } else {
          expect(element.pubkey).to.eql(account1.publicKey);
          expect(element.account.lamports).to.eq(
            BigInt(LAMPORTS_PER_SOL / 2 - fee),
          );
        }
      });
    }

    {
      await mockRpcResponse({
        method: 'getProgramAccounts',
        params: [
          programId.publicKey.toBase58(),
          {
            commitment: 'confirmed',
            encoding: 'jsonParsed',
            filters: [
              {
                dataSize: 2,
              },
            ],
          },
        ],
        value: [],
      });

      const programAccountsDontMatchFilter =
        await connection.getParsedProgramAccounts(programId.publicKey, {
          commitment: 'confirmed',
          filters: [{dataSize: 2}],
        });
      expect(programAccountsDontMatchFilter).to.have.length(0);
    }

    {
      await mockRpcResponse({
        method: 'getProgramAccounts',
        params: [
          programId.publicKey.toBase58(),
          {
            commitment: 'confirmed',
            encoding: 'jsonParsed',
            filters: [
              {
                memcmp: {
                  offset: 0,
                  bytes: '',
                },
              },
            ],
          },
        ],
        value: [
          {
            account: {
              data: ['', 'base64'],
              executable: false,
              lamports: LAMPORTS_PER_SOL - fee,
              owner: programId.publicKey.toBase58(),
              rentEpoch: 20,
              space: 0,
            },
            pubkey: account0.publicKey.toBase58(),
          },
          {
            account: {
              data: ['', 'base64'],
              executable: false,
              lamports: 0.5 * LAMPORTS_PER_SOL - fee,
              owner: programId.publicKey.toBase58(),
              rentEpoch: 20,
              space: 0,
            },
            pubkey: account1.publicKey.toBase58(),
          },
        ],
      });

      const programAccountsDoMatchFilter =
        await connection.getParsedProgramAccounts(programId.publicKey, {
          commitment: 'confirmed',
          filters: [
            {
              memcmp: {
                offset: 0,
                bytes: '',
              },
            },
          ],
        });
      expect(programAccountsDoMatchFilter).to.have.length(2);
    }

    {
      if (mockServer) {
        await mockRpcResponse({
          method: 'getProgramAccounts',
          params: [
            programId.publicKey.toBase58(),
            {
              commitment: 'confirmed',
              withContext: true,
            },
          ],
          value: {
            context: {
              slot: 11,
            },
            value: [],
          },
        });
      }

      const programAccountsWithContext = await connection.getProgramAccounts(
        programId.publicKey,
        {
          commitment: 'confirmed',
          withContext: true,
        },
      );

      if (mockServer) {
        expect(programAccountsWithContext.context.slot).to.eq(11n);
      }
      expect(typeof programAccountsWithContext.context.slot).to.eq('bigint');
      expect(programAccountsWithContext).to.have.property('value');
    }
  }).timeout(30 * 1000);

  if (mockServer) {
    it('get program accounts with config object preserves bigint context slots', async () => {
      const programId = (await Keypair.generate()).publicKey;
      const programAccount = (await Keypair.generate()).publicKey;
      const accountData = Buffer.alloc(32, 1).toString('base64');

      await mockRpcResponse({
        method: 'getProgramAccounts',
        params: [
          programId.toBase58(),
          {
            commitment: 'confirmed',
            dataSlice: {offset: 0, length: 32},
            encoding: 'base64',
            minContextSlot: 123,
            withContext: true,
          },
        ],
        value: [
          {
            pubkey: programAccount.toBase58(),
            account: {
              executable: false,
              owner: programId.toBase58(),
              lamports: 5000,
              data: [accountData, 'base64'],
              rentEpoch: 20,
              space: 32,
            },
          },
        ],
        slot: 37,
        withContext: true,
      });

      const programAccounts = await connection.getProgramAccounts(programId, {
        commitment: 'confirmed',
        dataSlice: {offset: 0, length: 32},
        minContextSlot: 123n,
        withContext: true,
      });

      expect(programAccounts.context.slot).to.eq(37n);
      expect(typeof programAccounts.context.slot).to.eq('bigint');
      expect(programAccounts.value).to.have.length(1);
      expect(programAccounts.value[0].pubkey).to.eql(programAccount);
      expect(programAccounts.value[0].account.owner).to.eql(programId);
      expect(programAccounts.value[0].account.lamports).to.eq(5000n);
      expect(programAccounts.value[0].account.data).to.have.length(32);
      expect(programAccounts.value[0].account.space).to.eq(32n);
    });
  }

  it('get token accounts by delegate', async () => {
    if (mockServer) {
      const delegate = (await Keypair.generate()).publicKey;
      const tokenProgramId = new Address(
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      );
      const tokenAccount = (await Keypair.generate()).publicKey;
      const tokenAccountData = Buffer.alloc(165).toString('base64');

      await mockRpcResponse({
        method: 'getTokenAccountsByDelegate',
        params: [
          delegate.toBase58(),
          {programId: tokenProgramId.toBase58()},
          {commitment: 'confirmed', encoding: 'base64'},
        ],
        value: [
          {
            pubkey: tokenAccount.toBase58(),
            account: {
              executable: false,
              owner: tokenProgramId.toBase58(),
              lamports: 1726080,
              data: [tokenAccountData, 'base64'],
              rentEpoch: 4,
              space: 165,
            },
          },
        ],
        withContext: true,
      });

      const tokenAccounts = await connection.getTokenAccountsByDelegate(
        delegate,
        {programId: tokenProgramId},
        'confirmed',
      );

      expect(tokenAccounts.context.slot).to.eq(11n);
      expect(tokenAccounts.value).to.have.length(1);
      expect(tokenAccounts.value[0].pubkey).to.eql(tokenAccount);
      expect(tokenAccounts.value[0].account.owner).to.eql(tokenProgramId);
      expect(tokenAccounts.value[0].account.data).to.have.length(165);
      expect(tokenAccounts.value[0].account.space).to.eq(165n);
    } else {
      // Match Solana Kit's approach: assert the empty response for a delegate
      // that has no delegated token accounts.
      const delegate = getUniqueAddress();

      const tokenAccounts = await connection.getTokenAccountsByDelegate(
        delegate,
        {
          programId: TOKEN_PROGRAM_ID,
        },
        'confirmed',
      );

      expect(typeof tokenAccounts.context.slot).to.eq('bigint');
      expect(tokenAccounts.value).to.eql([]);
    }
  });

  it('get token accounts by owner with config object', async () => {
    if (mockServer) {
      const owner = (await Keypair.generate()).publicKey;
      const mint = (await Keypair.generate()).publicKey;
      const tokenAccount = (await Keypair.generate()).publicKey;

      await mockRpcResponse({
        method: 'getTokenAccountsByOwner',
        params: [
          owner.toBase58(),
          {mint: mint.toBase58()},
          {
            commitment: 'confirmed',
            dataSlice: {offset: 0, length: 32},
            encoding: 'base64',
            minContextSlot: 123,
          },
        ],
        value: [
          {
            pubkey: tokenAccount.toBase58(),
            account: {
              executable: false,
              owner: SystemProgram.programId.toBase58(),
              lamports: 5000,
              data: [Buffer.alloc(32).toString('base64'), 'base64'],
              rentEpoch: 20,
              space: 165,
            },
          },
        ],
        withContext: true,
      });

      const tokenAccounts = await connection.getTokenAccountsByOwner(
        owner,
        {mint},
        {
          commitment: 'confirmed',
          dataSlice: {offset: 0, length: 32},
          encoding: 'base64',
          minContextSlot: 123n,
        },
      );

      expect(tokenAccounts.context.slot).to.eq(11n);
      expect(tokenAccounts.value).to.have.length(1);
      expect(tokenAccounts.value[0].pubkey).to.eql(tokenAccount);
      expect(tokenAccounts.value[0].account.space).to.eq(165n);
    } else {
      const tokenAccounts = await connection.getTokenAccountsByOwner(
        getUniqueAddress(),
        {
          programId: new Address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        },
        {
          commitment: 'confirmed',
          dataSlice: {offset: 0, length: 32},
          encoding: 'base64',
        },
      );
      expect(typeof tokenAccounts.context.slot).to.eq('bigint');
      expect(Array.isArray(tokenAccounts.value)).to.be.true;
    }
  });

  it('get token accounts by delegate with config object', async () => {
    if (mockServer) {
      const delegate = (await Keypair.generate()).publicKey;
      const tokenProgramId = new Address(
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      );
      const tokenAccount = (await Keypair.generate()).publicKey;
      const tokenAccountDataSlice = Buffer.alloc(32, 1).toString('base64');

      await mockRpcResponse({
        method: 'getTokenAccountsByDelegate',
        params: [
          delegate.toBase58(),
          {programId: tokenProgramId.toBase58()},
          {
            commitment: 'confirmed',
            dataSlice: {offset: 0, length: 32},
            encoding: 'base64',
            minContextSlot: 123,
          },
        ],
        value: [
          {
            pubkey: tokenAccount.toBase58(),
            account: {
              executable: false,
              owner: tokenProgramId.toBase58(),
              lamports: 1726080,
              data: [tokenAccountDataSlice, 'base64'],
              rentEpoch: 4,
              space: 165,
            },
          },
        ],
        withContext: true,
      });

      const tokenAccounts = await connection.getTokenAccountsByDelegate(
        delegate,
        {programId: tokenProgramId},
        {
          commitment: 'confirmed',
          dataSlice: {offset: 0, length: 32},
          encoding: 'base64',
          minContextSlot: 123n,
        },
      );

      expect(tokenAccounts.context.slot).to.eq(11n);
      expect(tokenAccounts.value).to.have.length(1);
      expect(tokenAccounts.value[0].pubkey).to.eql(tokenAccount);
      expect(tokenAccounts.value[0].account.owner).to.eql(tokenProgramId);
      expect(tokenAccounts.value[0].account.data).to.have.length(32);
      expect(tokenAccounts.value[0].account.space).to.eq(165n);
    } else {
      const delegate = getUniqueAddress();

      const tokenAccounts = await connection.getTokenAccountsByDelegate(
        delegate,
        {
          programId: TOKEN_PROGRAM_ID,
        },
        {
          commitment: 'confirmed',
          dataSlice: {offset: 0, length: 32},
          encoding: 'base64',
        },
      );

      expect(typeof tokenAccounts.context.slot).to.eq('bigint');
      expect(tokenAccounts.value).to.eql([]);
    }
  });

  it('get balance', async () => {
    const account = await Keypair.generate();

    await mockRpcResponse({
      method: 'getBalance',
      params: [account.publicKey.toBase58()],
      value: {
        context: {
          slot: 11,
        },
        value: 0,
      },
    });

    const balance = await connection.getBalance(account.publicKey);
    expect(balance).to.eq(0n);
  });

  it('get token supply with config object', async () => {
    if (mockServer) {
      const mint = (await Keypair.generate()).publicKey;

      await mockRpcResponse({
        method: 'getTokenSupply',
        params: [mint.toBase58(), {commitment: 'confirmed'}],
        value: {
          amount: '123',
          decimals: 2,
          uiAmount: 1.23,
          uiAmountString: '1.23',
        },
        withContext: true,
      });

      const supply = await connection.getTokenSupply(mint, {
        commitment: 'confirmed',
      });
      expect(typeof supply.context.slot).to.eq('bigint');
      expect(supply.value.amount).to.eq('123');
    } else {
      const supply = await connection.getTokenSupply(
        new Address('7MbpdfJa5xqwexkp6WUvkYHTPo4VgxYACDBNFWYLwCdo'),
        {
          commitment: 'confirmed',
        },
      );
      expect(typeof supply.context.slot).to.eq('bigint');
      expect(Number(supply.value.amount)).to.be.greaterThan(0);
    }
  });

  it('get token account balance with config object', async () => {
    if (mockServer) {
      const tokenAccount = (await Keypair.generate()).publicKey;

      await mockRpcResponse({
        method: 'getTokenAccountBalance',
        params: [tokenAccount.toBase58(), {commitment: 'confirmed'}],
        value: {
          amount: '456',
          decimals: 2,
          uiAmount: 4.56,
          uiAmountString: '4.56',
        },
        withContext: true,
      });

      const balance = await connection.getTokenAccountBalance(tokenAccount, {
        commitment: 'confirmed',
      });
      expect(typeof balance.context.slot).to.eq('bigint');
      expect(balance.value.amount).to.eq('456');
    } else {
      const balance = await connection.getTokenAccountBalance(
        new Address('EryTMgfSEabo5Fc7dN5z3nBQKzfHUJRpHAMnXdCrTq4S'),
        {
          commitment: 'confirmed',
        },
      );
      expect(typeof balance.context.slot).to.eq('bigint');
      expect(Number(balance.value.amount)).to.be.greaterThan(0);
    }
  });

  it('get token largest accounts', async () => {
    if (mockServer) {
      const mint = (await Keypair.generate()).publicKey;
      const tokenAccount = (await Keypair.generate()).publicKey;

      await mockRpcResponse({
        method: 'getTokenLargestAccounts',
        params: [mint.toBase58()],
        value: [
          {
            address: tokenAccount.toBase58(),
            amount: '789',
            decimals: 2,
            uiAmount: 7.89,
            uiAmountString: '7.89',
          },
        ],
        withContext: true,
      });

      const largestAccounts = await connection.getTokenLargestAccounts(mint);

      expect(largestAccounts.value).to.have.length(1);
      expect(largestAccounts.value[0].address.toBase58()).to.eq(
        tokenAccount.toBase58(),
      );
    } else {
      const largestAccounts = await connection.getTokenLargestAccounts(
        new Address('7MbpdfJa5xqwexkp6WUvkYHTPo4VgxYACDBNFWYLwCdo'),
      );
      expect(largestAccounts.value.length).to.be.greaterThan(0);
    }
  });

  it('get token largest accounts with config object', async () => {
    if (mockServer) {
      const mint = (await Keypair.generate()).publicKey;
      const tokenAccount = (await Keypair.generate()).publicKey;

      await mockRpcResponse({
        method: 'getTokenLargestAccounts',
        params: [mint.toBase58(), {commitment: 'confirmed'}],
        value: [
          {
            address: tokenAccount.toBase58(),
            amount: '789',
            decimals: 2,
            uiAmount: 7.89,
            uiAmountString: '7.89',
          },
        ],
        withContext: true,
      });

      const largestAccounts = await connection.getTokenLargestAccounts(mint, {
        commitment: 'confirmed',
      });
      expect(largestAccounts.value).to.have.length(1);
      expect(largestAccounts.value[0].amount).to.eq('789');

      await mockRpcResponse({
        method: 'getTokenLargestAccounts',
        params: [mint.toBase58(), {commitment: 'confirmed'}],
        value: [
          {
            address: tokenAccount.toBase58(),
            amount: '789',
            decimals: 2,
            uiAmount: 7.89,
            uiAmountString: '7.89',
          },
        ],
        withContext: true,
      });

      const connectionWithCommitment = new Connection(url, 'confirmed');
      const largestAccountsWithDefaultCommitment =
        await connectionWithCommitment.getTokenLargestAccounts(mint);

      expect(largestAccountsWithDefaultCommitment.value).to.have.length(1);
      expect(
        largestAccountsWithDefaultCommitment.value[0].address.toBase58(),
      ).to.eq(tokenAccount.toBase58());
    } else {
      const largestAccounts = await connection.getTokenLargestAccounts(
        new Address('7MbpdfJa5xqwexkp6WUvkYHTPo4VgxYACDBNFWYLwCdo'),
        {
          commitment: 'confirmed',
        },
      );
      expect(largestAccounts.value.length).to.be.greaterThan(0);
    }
  });

  it('get inflation', async () => {
    await mockRpcResponse({
      method: 'getInflationGovernor',
      params: [],
      value: {
        foundation: 0.05,
        foundationTerm: 7.0,
        initial: 0.15,
        taper: 0.15,
        terminal: 0.015,
      },
    });

    const inflation = await connection.getInflationGovernor();
    const inflationKeys: (keyof InflationGovernor)[] = [
      'initial',
      'terminal',
      'taper',
      'foundation',
      'foundationTerm',
    ];

    for (const key of inflationKeys) {
      expect(inflation).to.have.property(key);
      expect(inflation[key]).to.be.greaterThan(0);
    }
  });

  it('get inflation with config object', async () => {
    if (mockServer) {
      await mockRpcResponse({
        method: 'getInflationGovernor',
        params: [{commitment: 'confirmed'}],
        value: {
          foundation: 0.05,
          foundationTerm: 7.0,
          initial: 0.15,
          taper: 0.15,
          terminal: 0.015,
        },
      });

      const inflation = await connection.getInflationGovernor({
        commitment: 'confirmed',
      });
      expect(inflation.initial).to.eq(0.15);
    } else {
      const inflation = await connection.getInflationGovernor({
        commitment: 'confirmed',
      });
      expect(inflation.initial).to.be.greaterThan(0);
    }
  });
  it('get inflation reward', async () => {
    if (mockServer) {
      await mockRpcResponse({
        method: 'getInflationReward',
        params: [
          [
            '7GHnTRB8Rz14qZQhDXf8ox1Kfu7mPcPLpKaBJJirmYj2',
            'CrinLuHjVGDDcQfrEoCmM4k31Ni9sMoTCEEvNSUSh7Jg',
          ],
          {
            epoch: 0,
          },
        ],
        value: [
          {
            amount: 3646143,
            effectiveSlot: 432000,
            epoch: 0,
            postBalance: 30504783,
            commission: 0,
          },
          null,
        ],
      });

      const inflationReward = await connection.getInflationReward(
        [
          new Address('7GHnTRB8Rz14qZQhDXf8ox1Kfu7mPcPLpKaBJJirmYj2'),
          new Address('CrinLuHjVGDDcQfrEoCmM4k31Ni9sMoTCEEvNSUSh7Jg'),
        ],
        0,
      );

      expect(inflationReward).to.have.lengthOf(2);
      expect(inflationReward[0]).to.deep.equal({
        amount: 3646143n,
        effectiveSlot: 432000n,
        epoch: 0n,
        postBalance: 30504783n,
        commission: 0,
      });
      expect(inflationReward[1]).to.be.null;
    }
  });

  it('get inflation rate', async () => {
    await mockRpcResponse({
      method: 'getInflationRate',
      params: [],
      value: {
        total: 0.08,
        validator: 0.076,
        foundation: 0.004,
        epoch: 1,
      },
    });

    const inflation = await connection.getInflationRate();
    expect(inflation).to.have.property('total');
    expect(inflation).to.have.property('validator');
    expect(inflation).to.have.property('foundation');
    expect(inflation).to.have.property('epoch');

    expect(inflation.total).to.be.greaterThan(0);
    expect(inflation.validator).to.be.greaterThan(0);
    expect(inflation.foundation).to.be.greaterThan(0);

    if (mockServer) {
      expect(inflation.epoch).to.eq(1n);
    } else {
      expect(typeof inflation.epoch).to.eq('bigint');
      expect(inflation.epoch >= 0n).to.eq(true);
    }
  });

  it('get epoch info', async () => {
    await mockRpcResponse({
      method: 'getEpochInfo',
      params: [{commitment: 'confirmed'}],
      value: {
        epoch: 0,
        slotIndex: 1,
        slotsInEpoch: 8192,
        absoluteSlot: 1,
        blockHeight: 1,
        transactionCount: 2,
      },
    });

    const epochInfo = await connection.getEpochInfo('confirmed');

    if (mockServer) {
      expect(epochInfo.epoch).to.eq(0n);
      expect(epochInfo.slotIndex).to.eq(1n);
      expect(epochInfo.slotsInEpoch).to.eq(8192n);
      expect(epochInfo.absoluteSlot).to.eq(1n);
      expect(epochInfo.blockHeight).to.eq(1n);
      expect(epochInfo.transactionCount).to.eq(2n);
    } else {
      expect(typeof epochInfo.epoch).to.eq('bigint');
      expect(epochInfo.epoch >= 0n).to.eq(true);
      expect(typeof epochInfo.slotIndex).to.eq('bigint');
      expect(epochInfo.slotIndex >= 0n).to.eq(true);
      expect(typeof epochInfo.slotsInEpoch).to.eq('bigint');
      expect(epochInfo.slotsInEpoch > 0n).to.eq(true);
      expect(epochInfo.slotIndex < epochInfo.slotsInEpoch).to.eq(true);
      expect(typeof epochInfo.absoluteSlot).to.eq('bigint');
      expect(epochInfo.absoluteSlot >= 0n).to.eq(true);
      expect(typeof epochInfo.blockHeight).to.eq('bigint');
      expect(epochInfo.blockHeight >= 0n).to.eq(true);

      if (epochInfo.transactionCount !== null) {
        expect(typeof epochInfo.transactionCount).to.eq('bigint');
        expect(epochInfo.transactionCount >= 0n).to.eq(true);
      }
    }
  });

  it('get epoch schedule', async () => {
    await mockRpcResponse({
      method: 'getEpochSchedule',
      params: [],
      value: {
        firstNormalEpoch: 8,
        firstNormalSlot: 8160,
        leaderScheduleSlotOffset: 8192,
        slotsPerEpoch: 8192,
        warmup: true,
      },
    });

    const epochSchedule = await connection.getEpochSchedule();
    const epochScheduleKeys = [
      'firstNormalEpoch',
      'firstNormalSlot',
      'leaderScheduleSlotOffset',
      'slotsPerEpoch',
    ] as const satisfies readonly (keyof EpochSchedule)[];

    if (mockServer) {
      expect(epochSchedule.firstNormalEpoch).to.eq(8n);
      expect(epochSchedule.firstNormalSlot).to.eq(8160n);
      expect(epochSchedule.leaderScheduleSlotOffset).to.eq(8192n);
      expect(epochSchedule.slotsPerEpoch).to.eq(8192n);
    }

    for (const key of epochScheduleKeys) {
      expect(epochSchedule).to.have.property('warmup');
      expect(epochSchedule).to.have.property(key);
      expect(typeof epochSchedule[key]).to.eq('bigint');
      if (epochSchedule.warmup) {
        expect(epochSchedule[key] > 0n).to.be.true;
      }
    }
  });

  it('get leader schedule', async () => {
    await mockRpcResponse({
      method: 'getLeaderSchedule',
      params: [],
      value: {
        '123vij84ecQEKUvQ7gYMKxKwKF6PbYSzCzzURYA4xULY': [0, 1, 2, 3],
        '8PTjAikKoAybKXcEPnDSoy8wSNNikUBJ1iKawJKQwXnB': [4, 5, 6, 7],
      },
    });

    const leaderSchedule = await connection.getLeaderSchedule();
    invariant(leaderSchedule !== null);
    expect(Object.keys(leaderSchedule).length).to.be.at.least(1);
    for (const key in leaderSchedule) {
      const slots = leaderSchedule[key];
      expect(Array.isArray(slots)).to.be.true;
      expect(slots.length).to.be.at.least(4);
      expect(typeof slots[0]).to.eq('bigint');
    }
  }).timeout(30 * 1000);

  it('get leader schedule with config object', async () => {
    if (mockServer) {
      const identity = (await Keypair.generate()).publicKey.toBase58();
      await mockRpcResponse({
        method: 'getLeaderSchedule',
        params: [{commitment: 'confirmed', identity}],
        value: {
          '123vij84ecQEKUvQ7gYMKxKwKF6PbYSzCzzURYA4xULY': [0, 1, 2, 3],
        },
      });

      const leaderSchedule = await connection.getLeaderSchedule({
        commitment: 'confirmed',
        identity,
      });
      invariant(leaderSchedule !== null);
      expect(Object.keys(leaderSchedule).length).to.eq(1);
    } else {
      const leaderSchedule = await connection.getLeaderSchedule({
        commitment: 'confirmed',
      });
      invariant(leaderSchedule !== null);
      expect(Object.keys(leaderSchedule).length).to.be.greaterThan(0);
    }
  });

  it('get leader schedule for a slot with config object', async () => {
    if (mockServer) {
      const identity = (await Keypair.generate()).publicKey.toBase58();
      await mockRpcResponse({
        method: 'getLeaderSchedule',
        params: [123, {commitment: 'confirmed', identity}],
        value: {
          '123vij84ecQEKUvQ7gYMKxKwKF6PbYSzCzzURYA4xULY': [0, 1, 2, 3],
        },
      });

      const leaderSchedule = await connection.getLeaderSchedule(123, {
        commitment: 'confirmed',
        identity,
      });
      invariant(leaderSchedule !== null);
      expect(Object.keys(leaderSchedule).length).to.eq(1);
    } else {
      const latestSlot = await connection.getSlot('confirmed');
      const leaderSchedule = await connection.getLeaderSchedule(latestSlot, {
        commitment: 'confirmed',
      });
      invariant(leaderSchedule !== null);
      expect(Object.keys(leaderSchedule).length).to.be.greaterThan(0);
    }
  });

  it('get leader schedule for a slot', async () => {
    await mockRpcResponse({
      method: 'getLeaderSchedule',
      params: [123],
      value: {
        '123vij84ecQEKUvQ7gYMKxKwKF6PbYSzCzzURYA4xULY': [0, 1, 2, 3],
      },
    });

    const leaderSchedule = await connection.getLeaderSchedule(123);
    invariant(leaderSchedule !== null);
    expect(Object.keys(leaderSchedule).length).to.eq(1);
  });

  it('get slot', async () => {
    await mockRpcResponse({
      method: 'getSlot',
      params: [],
      value: 123,
    });

    const slot = await connection.getSlot();
    if (mockServer) {
      expect(slot).to.eq(123n);
    } else {
      // No idea what the correct slot value should be on a live cluster, so
      // just check the type
      expect(typeof slot).to.eq('bigint');
    }
  });

  it('get slot with config object', async () => {
    if (mockServer) {
      await mockRpcResponse({
        method: 'getSlot',
        params: [{commitment: 'confirmed', minContextSlot: 5}],
        value: 123,
      });

      const slot = await connection.getSlot({
        commitment: 'confirmed',
        minContextSlot: 5n,
      });
      expect(slot).to.eq(123n);
    } else {
      const slot = await connection.getSlot({
        commitment: 'confirmed',
      });
      expect(typeof slot).to.eq('bigint');
    }
  });

  it('get slot leader', async () => {
    await mockRpcResponse({
      method: 'getSlotLeader',
      params: [],
      value: '11111111111111111111111111111111',
    });

    const slotLeader = await connection.getSlotLeader();
    if (mockServer) {
      expect(slotLeader).to.eq('11111111111111111111111111111111');
    } else {
      // No idea what the correct slotLeader value should be on a live cluster, so
      // just check the type
      expect(typeof slotLeader).to.eq('string');
    }
  });

  it('get slot leader with config object', async () => {
    if (mockServer) {
      await mockRpcResponse({
        method: 'getSlotLeader',
        params: [{commitment: 'confirmed', minContextSlot: 5}],
        value: '11111111111111111111111111111111',
      });

      const slotLeader = await connection.getSlotLeader({
        commitment: 'confirmed',
        minContextSlot: 5,
      });
      expect(slotLeader).to.eq('11111111111111111111111111111111');
    } else {
      const slotLeader = await connection.getSlotLeader({
        commitment: 'confirmed',
      });
      expect(typeof slotLeader).to.eq('string');
    }
  });

  it('get slot leaders', async () => {
    await mockRpcResponse({
      method: 'getSlotLeaders',
      params: [0, 1],
      value: ['11111111111111111111111111111111'],
    });

    const slotLeaders = await connection.getSlotLeaders(0, 1);
    expect(slotLeaders).to.have.length(1);
    expect(slotLeaders[0]).to.be.instanceOf(Address);
  });

  it('get cluster nodes', async () => {
    await mockRpcResponse({
      method: 'getClusterNodes',
      params: [],
      value: [
        {
          pubkey: '11111111111111111111111111111111',
          gossip: '127.0.0.0:1234',
          tpu: '127.0.0.0:1235',
          rpc: null,
          version: '1.1.10',
        },
      ],
    });

    const clusterNodes = await connection.getClusterNodes();
    if (mockServer) {
      expect(clusterNodes).to.have.length(1);
      expect(clusterNodes[0].pubkey).to.eq('11111111111111111111111111111111');
      expect(typeof clusterNodes[0].gossip).to.eq('string');
      expect(typeof clusterNodes[0].tpu).to.eq('string');
      expect(clusterNodes[0].rpc).to.be.null;
    } else {
      // There should be at least one node (the node that we're talking to)
      expect(clusterNodes.length).to.be.greaterThan(0);
    }
  });

  it('get vote accounts with config object', async () => {
    if (!mockServer) {
      return;
    }

    const votePubkey = (await Keypair.generate()).publicKey.toBase58();
    const delinquentVotePubkey = (
      await Keypair.generate()
    ).publicKey.toBase58();
    const nodePubkey = (await Keypair.generate()).publicKey.toBase58();
    await mockRpcResponse({
      method: 'getVoteAccounts',
      params: [
        {
          commitment: 'confirmed',
          votePubkey,
          keepUnstakedDelinquents: true,
          delinquentSlotDistance: 50,
        },
      ],
      value: {
        current: [
          {
            votePubkey,
            nodePubkey,
            activatedStake: 123,
            epochVoteAccount: true,
            epochCredits: [[1, 2, 3]],
            commission: 7,
            lastVote: 456,
            rootSlot: null,
          },
        ],
        delinquent: [
          {
            votePubkey: delinquentVotePubkey,
            nodePubkey,
            activatedStake: 789,
            epochVoteAccount: false,
            epochCredits: [[4, 5, 6]],
            commission: 9,
            lastVote: 654,
            rootSlot: 321,
          },
        ],
      },
    });

    const voteAccounts = await connection.getVoteAccounts({
      commitment: 'confirmed',
      votePubkey,
      keepUnstakedDelinquents: true,
      delinquentSlotDistance: 50,
    });
    expect(voteAccounts.current[0]).to.deep.equal({
      votePubkey,
      nodePubkey,
      activatedStake: 123n,
      epochVoteAccount: true,
      epochCredits: [[1n, 2n, 3n]],
      commission: 7,
      lastVote: 456n,
      rootSlot: null,
    });
    expect(voteAccounts.delinquent[0]).to.deep.equal({
      votePubkey: delinquentVotePubkey,
      nodePubkey,
      activatedStake: 789n,
      epochVoteAccount: false,
      epochCredits: [[4n, 5n, 6n]],
      commission: 9,
      lastVote: 654n,
      rootSlot: 321n,
    });
  });

  it('request airdrop without config object', async () => {
    const recipient = (await Keypair.generate()).publicKey;
    if (mockServer) {
      const signature =
        '2V4fAa12MU5kgwwPmR8xmf2QQ6QkAUf68giQ89vZat4N8fCbN4ec4D8ZGxL8Liyp8xjJ1wvH6XhRar4gbmQjP5wM';

      await mockRpcResponse({
        method: 'requestAirdrop',
        params: [recipient.toBase58(), LAMPORTS_PER_SOL],
        value: signature,
      });

      const result = await connection.requestAirdrop(
        recipient,
        LAMPORTS_PER_SOL,
      );

      expect(result).to.eq(signature);
    } else {
      const result = await connection.requestAirdrop(recipient, 1_000);
      expect(typeof result).to.eq('string');
      expect(result.length).to.be.greaterThan(0);
    }
  });

  it('request airdrop with config object', async () => {
    const recipient = (await Keypair.generate()).publicKey;
    if (mockServer) {
      const signature =
        '2V4fAa12MU5kgwwPmR8xmf2QQ6QkAUf68giQ89vZat4N8fCbN4ec4D8ZGxL8Liyp8xjJ1wvH6XhRar4gbmQjP5wM';

      await mockRpcResponse({
        method: 'requestAirdrop',
        params: [
          recipient.toBase58(),
          LAMPORTS_PER_SOL,
          {commitment: 'confirmed'},
        ],
        value: signature,
      });

      const result = await connection.requestAirdrop(
        recipient,
        LAMPORTS_PER_SOL,
        {commitment: 'confirmed'},
      );

      expect(result).to.eq(signature);
    } else {
      const result = await connection.requestAirdrop(recipient, 1_000, {
        commitment: 'confirmed',
      });
      expect(typeof result).to.eq('string');
      expect(result.length).to.be.greaterThan(0);
    }
  });

  if (process.env.TEST_LIVE) {
    it('get vote accounts', async () => {
      const voteAccounts = await connection.getVoteAccounts();
      expect(
        voteAccounts.current.concat(voteAccounts.delinquent).length,
      ).to.be.greaterThan(0);
    });
  }

  if (process.env.TEST_LIVE) {
    describe('transaction sending error logs', () => {
      async function expectLiveSendFailureLogsOrStatus(
        error: unknown,
        connection: Connection,
      ): Promise<void> {
        expect(error).to.be.instanceOf(SendTransactionError);

        if (!(error instanceof SendTransactionError)) {
          return;
        }

        try {
          const logs = await error.getLogs(connection);
          expect(
            logs.some(log => log.includes('Transfer: insufficient lamports')),
          ).to.eq(true);
          expect(
            logs.some(log =>
              log.includes(
                'Program 11111111111111111111111111111111 failed: custom program error: 0x1',
              ),
            ),
          ).to.eq(true);
        } catch (logsError) {
          expect(logsError).to.be.instanceOf(Error);
          expect((logsError as Error).message).to.eq('Log messages not found');
          expect(error.transactionError.message).to.include('InstructionError');
          expect(error.transactionError.message).to.include('Custom');
          expect(error.transactionError.message).to.include('1');
        }
      }

      it('sendAndConfirmTransaction skipPreflight: false', async () => {
        const keypair = await Keypair.generate();
        const destinationKeypair = await Keypair.generate();

        connection = new Connection(url, 'confirmed');
        const confirmOptions = {
          skipPreflight: false,
          commitment: connection.commitment,
          preflightCommitment: connection.commitment,
          maxRetries: 5n,
          minContextSlot: 0n,
        };

        await connection.confirmTransaction(
          await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL),
        );

        const transferSolTransaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: destinationKeypair.publicKey,
            lamports: 2 * LAMPORTS_PER_SOL,
          }),
        );

        const sendPromise = sendAndConfirmTransaction(
          connection,
          transferSolTransaction,
          [keypair],
          confirmOptions,
        );

        await Promise.all([
          await expect(sendPromise).to.eventually.be.rejectedWith(
            SendTransactionError,
            /Transfer: insufficient lamports/,
          ),
          await expect(sendPromise).to.eventually.be.rejectedWith(
            SendTransactionError,
            /Program 11111111111111111111111111111111 failed: custom program error: 0x1/,
          ),
        ]);
      });

      it('sendAndConfirmTransaction skipPreflight: true', async () => {
        const keypair = await Keypair.generate();
        const destinationKeypair = await Keypair.generate();

        connection = new Connection(url, 'confirmed');
        const confirmOptions = {
          skipPreflight: true,
          commitment: connection.commitment,
          preflightCommitment: connection.commitment,
          maxRetries: 5n,
          minContextSlot: 0n,
        };

        await connection.confirmTransaction(
          await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL),
        );

        const transferSolTransaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: destinationKeypair.publicKey,
            lamports: 2 * LAMPORTS_PER_SOL,
          }),
        );

        try {
          await sendAndConfirmTransaction(
            connection,
            transferSolTransaction,
            [keypair],
            confirmOptions,
          );
          throw new Error('Expected an error but did not get one');
        } catch (error) {
          await expectLiveSendFailureLogsOrStatus(error, connection);
        }
      }).timeout(10 * 1000);

      it('sendAndConfirmRawTransaction skipPreflight: true', async () => {
        const keypair = await Keypair.generate();
        const destinationKeypair = await Keypair.generate();

        connection = new Connection(url, 'confirmed');
        const confirmOptions = {
          skipPreflight: true,
          commitment: connection.commitment,
          preflightCommitment: connection.commitment,
          maxRetries: 5n,
          minContextSlot: 0n,
        };

        await connection.confirmTransaction(
          await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL),
        );

        const transferSolTransaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: destinationKeypair.publicKey,
            lamports: 2 * LAMPORTS_PER_SOL,
          }),
        );

        const {blockhash, lastValidBlockHeight} =
          await connection.getLatestBlockhash('confirmed');
        transferSolTransaction.recentBlockhash = blockhash;
        transferSolTransaction.lastValidBlockHeight = lastValidBlockHeight;
        await transferSolTransaction.sign(keypair);

        try {
          await sendAndConfirmRawTransaction(
            connection,
            await transferSolTransaction.serialize(),
            confirmOptions,
          );
          throw new Error('Expected an error but did not get one');
        } catch (error) {
          await expectLiveSendFailureLogsOrStatus(error, connection);
        }
      }).timeout(10 * 1000);

      it('sendAndConfirmRawTransaction skipPreflight: false', async () => {
        const keypair = await Keypair.generate();
        const destinationKeypair = await Keypair.generate();

        connection = new Connection(url, 'confirmed');
        const confirmOptions = {
          skipPreflight: false,
          commitment: connection.commitment,
          preflightCommitment: connection.commitment,
          maxRetries: 5n,
          minContextSlot: 0n,
        };

        await connection.confirmTransaction(
          await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL),
        );

        const transferSolTransaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: destinationKeypair.publicKey,
            lamports: 2 * LAMPORTS_PER_SOL,
          }),
        );

        const {blockhash, lastValidBlockHeight} =
          await connection.getLatestBlockhash('confirmed');
        transferSolTransaction.recentBlockhash = blockhash;
        transferSolTransaction.lastValidBlockHeight = lastValidBlockHeight;
        await transferSolTransaction.sign(keypair);

        const sendPromise = sendAndConfirmRawTransaction(
          connection,
          await transferSolTransaction.serialize(),
          confirmOptions,
        );

        await Promise.all([
          await expect(sendPromise).to.eventually.be.rejectedWith(
            SendTransactionError,
            /Transfer: insufficient lamports/,
          ),
          await expect(sendPromise).to.eventually.be.rejectedWith(
            SendTransactionError,
            /Program 11111111111111111111111111111111 failed: custom program error: 0x1/,
          ),
        ]);
      });

      it('Simulate transaction contains logs', async () => {
        const keypair = await Keypair.generate();
        const destinationKeypair = await Keypair.generate();

        connection = new Connection(url, 'confirmed');

        await connection.confirmTransaction(
          await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL),
        );

        const transferSolTransaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: destinationKeypair.publicKey,
            lamports: 2 * LAMPORTS_PER_SOL,
          }),
        );

        const {blockhash, lastValidBlockHeight} =
          await connection.getLatestBlockhash('confirmed');
        transferSolTransaction.recentBlockhash = blockhash;
        transferSolTransaction.lastValidBlockHeight = lastValidBlockHeight;
        await transferSolTransaction.sign(keypair);

        const simulationResultPromise = connection.simulateTransaction(
          transferSolTransaction,
          [keypair],
        );

        await Promise.all([
          expect(simulationResultPromise)
            .to.eventually.have.nested.property('value.logs')
            .that.satisfies((logs: string[]) =>
              logs.some(log => log.includes('Transfer: insufficient lamports')),
            ),
          expect(simulationResultPromise)
            .to.eventually.have.nested.property('value.logs')
            .that.satisfies((logs: string[]) =>
              logs.some(log =>
                log.includes(
                  'Program 11111111111111111111111111111111 failed: custom program error: 0x1',
                ),
              ),
            ),
        ]);
      });
    });
  }

  it('sendAndConfirmRawTransaction accepts Uint8Array inputs', async () => {
    const connection = new Connection(url, 'confirmed');
    const rawTransaction = new Uint8Array([1, 2, 3]);
    const signature =
      '1111111111111111111111111111111111111111111111111111111111111111';
    const confirmationStrategy = {
      signature,
      blockhash: blockhash('EkSnNWidA2rMT4wAhyLQ6UxJ2yR6b6bJ7hVn6XK7rxJQ'),
      lastValidBlockHeight: 123,
    };
    const options = {
      skipPreflight: true,
      preflightCommitment: 'processed' as const,
      commitment: 'confirmed' as const,
      minContextSlot: 7n,
    };
    const sendRawTransactionStub = stub(
      connection,
      'sendRawTransaction',
    ).resolves(signature);
    const confirmTransactionStub = stub(
      connection,
      'confirmTransaction',
    ).resolves({
      context: {slot: 0n},
      value: {err: null},
    } as {context: Context; value: SignatureResult});

    try {
      const result = await sendAndConfirmRawTransaction(
        connection,
        rawTransaction,
        confirmationStrategy,
        options,
      );

      expect(result).to.eq(signature);
      expect(sendRawTransactionStub.firstCall.args[0]).to.equal(rawTransaction);
      expect(sendRawTransactionStub.firstCall.args[1]).to.deep.equal({
        skipPreflight: true,
        preflightCommitment: 'processed',
        minContextSlot: 7n,
      });
      expect(confirmTransactionStub).to.have.been.calledOnceWithExactly(
        confirmationStrategy,
        'confirmed',
      );
    } finally {
      sendRawTransactionStub.restore();
      confirmTransactionStub.restore();
    }
  });

  it('sendAndConfirmRawTransaction accepts Array<number> inputs', async () => {
    const connection = new Connection(url, 'processed');
    const rawTransaction = [1, 2, 3];
    const signature =
      '1111111111111111111111111111111111111111111111111111111111111111';
    const options = {
      skipPreflight: false,
      preflightCommitment: 'confirmed' as const,
      commitment: 'finalized' as const,
      minContextSlot: 9n,
    };
    const sendRawTransactionStub = stub(
      connection,
      'sendRawTransaction',
    ).resolves(signature);
    const confirmTransactionStub = stub(
      connection,
      'confirmTransaction',
    ).resolves({
      context: {slot: 0n},
      value: {err: null},
    } as {context: Context; value: SignatureResult});

    try {
      const result = await sendAndConfirmRawTransaction(
        connection,
        rawTransaction,
        options,
      );

      expect(result).to.eq(signature);
      expect(sendRawTransactionStub.firstCall.args[0]).to.equal(rawTransaction);
      expect(sendRawTransactionStub.firstCall.args[1]).to.deep.equal({
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        minContextSlot: 9n,
      });
      expect(confirmTransactionStub).to.have.been.calledOnceWithExactly(
        signature,
        'finalized',
      );
    } finally {
      sendRawTransactionStub.restore();
      confirmTransactionStub.restore();
    }
  });

  it('sendRawTransaction rejects malformed runtime input', async () => {
    const connection = new Connection(url, 'confirmed');
    const malformedRawTransaction = {
      get buffer() {
        throw new Error('malformed raw transaction');
      },
      byteLength: 0,
      byteOffset: 0,
    } as unknown as Uint8Array;

    await expect(
      connection.sendRawTransaction(malformedRawTransaction),
    ).to.be.rejectedWith('malformed raw transaction');
  });

  if (process.env.TEST_LIVE) {
    describe('transaction confirmation (live)', () => {
      let connection: Connection;
      beforeEach(() => {
        connection = new Connection(url, 'confirmed');
      });

      describe('blockheight based transaction confirmation', () => {
        let latestBlockhash: {
          blockhash: Blockhash;
          lastValidBlockHeight: bigint;
        };
        let signature: string;

        beforeEach(async function () {
          this.timeout(60 * 1000);
          const keypair = await Keypair.generate();
          const [_, blockhash] = await Promise.all([
            connection.confirmTransaction(
              await connection.requestAirdrop(
                keypair.publicKey,
                LAMPORTS_PER_SOL,
              ),
            ),
            helpers.latestBlockhash({connection}),
          ]);
          latestBlockhash = blockhash;
          const ix = new TransactionInstruction({
            keys: [
              {
                pubkey: keypair.publicKey,
                isSigner: true,
                isWritable: true,
              },
            ],
            programId: new Address(
              'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
            ),
            data: new TextEncoder().encode('Hello world'),
          });

          const transaction = new Transaction({
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          });
          transaction.add(ix);
          await transaction.sign(keypair);
          signature = await connection.sendTransaction(transaction, [keypair]);
        });

        it('confirms transactions using the last valid blockheight strategy', async () => {
          const result = await connection.confirmTransaction(
            {
              signature,
              ...latestBlockhash,
            },
            'processed',
          );
          expect(result.value).to.have.property('err', null);
        }).timeout(60 * 1000);

        it('throws when confirming using a blockhash whose last valid blockheight has passed', async () => {
          const confirmationPromise = connection.confirmTransaction({
            signature,
            ...latestBlockhash,
            lastValidBlockHeight: (await connection.getBlockHeight()) - 1n, // Simulate the blockheight having passed.
          });
          expect(confirmationPromise).to.eventually.be.rejectedWith(
            TransactionExpiredBlockheightExceededError,
          );
        }).timeout(60 * 1000);
      });

      describe('nonce-based transaction confirmation', () => {
        let keypair: Keypair;
        let minContextSlot: bigint;
        let nonceInfo: NonceInformation;
        let nonceKeypair: Keypair;
        let transaction: Transaction;

        beforeEach(async function () {
          this.timeout(60 * 1000);
          keypair = await Keypair.generate();
          nonceKeypair = await Keypair.generate();
          const [_, blockhash, minimumNonceAccountRentLamports] =
            await Promise.all([
              connection.confirmTransaction(
                await connection.requestAirdrop(
                  keypair.publicKey,
                  LAMPORTS_PER_SOL,
                ),
              ),
              helpers.latestBlockhash({connection}),
              connection.getMinimumBalanceForRentExemption(
                NONCE_ACCOUNT_LENGTH,
              ),
            ]);
          const createNonceAccountTransaction =
            SystemProgram.createNonceAccount({
              authorizedPubkey: keypair.publicKey,
              fromPubkey: keypair.publicKey,
              lamports: Number(minimumNonceAccountRentLamports),
              noncePubkey: nonceKeypair.publicKey,
            });
          createNonceAccountTransaction.recentBlockhash = blockhash.blockhash;
          createNonceAccountTransaction.feePayer = keypair.publicKey;
          const createNonceAccountTransactionSignature =
            await connection.sendTransaction(createNonceAccountTransaction, [
              keypair,
              nonceKeypair,
            ]);
          const {context} = await connection.confirmTransaction({
            ...blockhash,
            signature: createNonceAccountTransactionSignature,
          });
          minContextSlot = context.slot;
          const nonceAccount = await connection.getNonce(
            nonceKeypair.publicKey,
            {minContextSlot},
          );
          nonceInfo = {
            nonce: nonceAccount!.nonce,
            nonceInstruction: SystemProgram.nonceAdvance({
              authorizedPubkey: keypair.publicKey,
              noncePubkey: nonceKeypair.publicKey,
            }),
          };
          invariant(
            nonceAccount,
            'Expected a nonce account to have been created in the test setup',
          );
          const ix = new TransactionInstruction({
            keys: [
              {
                pubkey: keypair.publicKey,
                isSigner: true,
                isWritable: true,
              },
            ],
            programId: new Address(
              'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
            ),
            data: new TextEncoder().encode('Hello world'),
          });
          transaction = new Transaction({minContextSlot, nonceInfo});
          transaction.add(ix);
          await transaction.sign(keypair);
        });

        it('confirms transactions using the durable nonce strategy', async () => {
          const signature = await connection.sendTransaction(transaction, [
            keypair,
          ]);
          const result = await connection.confirmTransaction(
            {
              minContextSlot,
              nonceAccountPubkey: nonceKeypair.publicKey,
              nonceValue: nonceInfo.nonce,
              signature,
            },
            'processed',
          );
          expect(result.value).to.have.property('err', null);
        }).timeout(60 * 1000);

        it('throws when confirming using a nonce that is no longer valid', async () => {
          // Advance the nonce.
          const blockhash = await connection.getLatestBlockhash();
          await sendAndConfirmTransaction(
            connection,
            new Transaction({feePayer: keypair.publicKey, ...blockhash}).add(
              nonceInfo.nonceInstruction,
            ),
            [keypair],
          );
          const [currentSlot, signature] = await Promise.all([
            connection.getSlot(),
            connection.sendTransaction(transaction, [keypair], {
              skipPreflight: true,
            }),
          ]);
          const confirmationPromise = connection.confirmTransaction({
            minContextSlot: Number(currentSlot),
            nonceAccountPubkey: nonceKeypair.publicKey,
            nonceValue: nonceInfo.nonce, // The old nonce.
            signature,
          });
          await expect(confirmationPromise).to.eventually.be.rejectedWith(
            TransactionExpiredNonceInvalidError,
          );
        }).timeout(60 * 1000);
      });
    });
  }

  if (!process.env.TEST_LIVE) {
    describe('transaction confirmation (mock)', () => {
      let clock: SinonFakeTimers;
      beforeEach(() => {
        clock = useFakeTimers({
          toFake: [
            'clearInterval',
            'clearTimeout',
            'setInterval',
            'setTimeout',
          ],
        });
      });

      afterEach(() => {
        clock.restore();
      });

      describe('timeout strategy (deprecated)', () => {
        it('throws a `TransactionExpiredTimeoutError` when the timer elapses without a signature confirmation', async () => {
          const mockSignature =
            'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt';

          await mockRpcMessage({
            method: 'signatureSubscribe',
            params: [mockSignature, {commitment: 'confirmed'}],
            result: new Promise(() => {}),
          });
          const timeoutPromise = connection.confirmTransaction(mockSignature);

          // Advance the clock past all waiting timers, notably the expiry timer.
          clock.runAllAsync();

          await expect(timeoutPromise).to.be.rejectedWith(
            TransactionExpiredTimeoutError,
          );
        });
      });

      describe('block height strategy', () => {
        it('rejects if called with an already-aborted `abortSignal`', () => {
          const mockSignature =
            'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt';
          const abortController = new AbortController();
          abortController.abort();
          expect(
            connection.confirmTransaction({
              abortSignal: abortController.signal,
              blockhash: SAMPLE_BLOCKHASH,
              lastValidBlockHeight: 1,
              signature: mockSignature,
            }),
          ).to.eventually.be.rejectedWith('AbortError');
        });

        it('rejects upon receiving an abort signal', async () => {
          const mockSignature =
            'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt';
          const abortController = new AbortController();
          await teardownSubscriptions(connection);
          const fetch = stub().callsFake(async (_url, requestInfo) => {
            expect(requestInfo.body).to.include('"method":"getBlockHeight"');
            return await new Promise<Response>((_, reject) => {
              requestInfo.signal?.addEventListener(
                'abort',
                () => reject(requestInfo.signal?.reason),
                {once: true},
              );
            });
          });
          connection = stubSubscriptions(url, {fetch});
          await mockRpcMessage({
            method: 'signatureSubscribe',
            params: [mockSignature, {commitment: 'confirmed'}],
            result: createSignatureStatusRpcResult(null),
            subscriptionEstablishmentPromise: new Promise(() => {}),
          });

          const confirmationPromise = connection.confirmTransaction({
            abortSignal: abortController.signal,
            blockhash: SAMPLE_BLOCKHASH,
            lastValidBlockHeight: 1,
            signature: mockSignature,
          });
          await clock.tickAsync(0);
          abortController.abort();
          await expect(confirmationPromise).to.eventually.be.rejected;
          await clock.runAllAsync();
          expect(fetch).to.have.been.calledOnce;
        });

        it('throws a `TransactionExpiredBlockheightExceededError` when the block height advances past the last valid one for this transaction without a signature confirmation', async () => {
          const mockSignature =
            '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG';
          const lastValidBlockHeight = 3;

          await teardownSubscriptions(connection);
          const fetchBlockHeights = [
            lastValidBlockHeight - 1,
            lastValidBlockHeight,
            lastValidBlockHeight + 1,
          ];
          let getBlockHeightCallCount = 0;
          const fetch = stub().callsFake((_url, requestInfo) => {
            const {method} = JSON.parse(requestInfo.body);
            if (method === 'getBlockHeight') {
              getBlockHeightCallCount += 1;
              const blockHeight = fetchBlockHeights.shift();
              expect(blockHeight).to.not.be.undefined;
              return new Response(
                JSON.stringify({jsonrpc: '2.0', id: '', result: blockHeight}),
                {
                  headers: {'content-type': 'application/json'},
                  status: 200,
                },
              );
            }

            expect(method).to.equal('getSignatureStatuses');
            return new Response(
              JSON.stringify({
                jsonrpc: '2.0',
                id: '',
                result: {context: {slot: 11}, value: [null]},
              }),
              {
                headers: {'content-type': 'application/json'},
                status: 200,
              },
            );
          });
          connection = stubSubscriptions(url, {fetch});
          await mockRpcMessage({
            method: 'signatureSubscribe',
            params: [mockSignature, {commitment: 'confirmed'}],
            result: new Promise(() => {}), // Never resolve this = never get a response.
          });

          const confirmationPromise = connection.confirmTransaction({
            signature: mockSignature,
            blockhash: SAMPLE_BLOCKHASH,
            lastValidBlockHeight,
          });
          await clock.tickAsync(0);
          await clock.tickAsync(1000);
          await clock.tickAsync(1000);
          await expect(confirmationPromise).to.be.rejectedWith(
            TransactionExpiredBlockheightExceededError,
          );
          expect(getBlockHeightCallCount).to.equal(3);
        });

        it('when the `getBlockHeight` method throws an error it does not timeout but rather keeps waiting for a confirmation', async () => {
          const mockSignature =
            'LPJ18iiyfz3G1LpNNbcBnBtaS4dVBdPHKrnELqikjER2DcvB4iyTgz43nKQJH3JQAJHuZdM1xVh5Cnc5Hc7LrqC';

          let resolveResultPromise = function (
            result: RpcWebSocketSignatureNotificationResult,
          ): any {
            return result;
          };

          await mockRpcMessage({
            method: 'signatureSubscribe',
            params: [mockSignature, {commitment: 'confirmed'}],
            result: new Promise<RpcWebSocketSignatureNotificationResult>(
              resolve => {
                resolveResultPromise = resolve;
              },
            ),
          });

          // Simulate a failure to fetch the block height.
          let rejectBlockheightPromise = function (): void {};
          await mockRpcResponse({
            method: 'getBlockHeight',
            params: [],
            value: (() => {
              const p = new Promise((_, reject) => {
                rejectBlockheightPromise = reject;
              });
              p.catch(() => {});
              return p;
            })(),
          });

          const confirmationPromise = connection.confirmTransaction({
            signature: mockSignature,
            blockhash: SAMPLE_BLOCKHASH,
            lastValidBlockHeight: 3,
          });

          rejectBlockheightPromise();
          await clock.runToLastAsync();
          resolveResultPromise(createSignatureStatusRpcResult(null));
          await clock.runToLastAsync();

          expect(confirmationPromise).not.to.eventually.be.rejected;
        });

        it('confirms the transaction if the signature confirmation is received before the block height is exceeded', async () => {
          const mockSignature =
            'LPJ18iiyfz3G1LpNNbcBnBtaS4dVBdPHKrnELqikjER2DcvB4iyTgz43nKQJH3JQAJHuZdM1xVh5Cnc5Hc7LrqC';

          let resolveResultPromise = function (
            result: RpcWebSocketSignatureNotificationResult,
          ): any {
            return result;
          };

          await mockRpcMessage({
            method: 'signatureSubscribe',
            params: [mockSignature, {commitment: 'confirmed'}],
            result: new Promise<RpcWebSocketSignatureNotificationResult>(
              resolve => {
                resolveResultPromise = resolve;
              },
            ),
          });

          const lastValidBlockHeight = 3;

          // Advance the block height to the `lastValidBlockHeight`.
          await mockRpcResponse({
            method: 'getBlockHeight',
            params: [],
            value: lastValidBlockHeight,
          });

          const confirmationPromise = connection.confirmTransaction({
            signature: mockSignature,
            blockhash: SAMPLE_BLOCKHASH,
            lastValidBlockHeight,
          });
          clock.runAllAsync();

          // Return a signature result in the nick of time.
          resolveResultPromise(createSignatureStatusRpcResult(null));

          await expect(confirmationPromise).to.eventually.deep.equal({
            context: {slot: 11n},
            value: {err: null},
          });
        });
      });

      describe('nonce strategy', () => {
        it('rejects if called with an already-aborted `abortSignal`', () => {
          const mockSignature =
            'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt';
          const abortController = new AbortController();
          abortController.abort();
          expect(
            connection.confirmTransaction({
              abortSignal: abortController.signal,
              minContextSlot: 1,
              nonceAccountPubkey: new Address(1),
              nonceValue: SAMPLE_BLOCKHASH,
              signature: mockSignature,
            }),
          ).to.eventually.be.rejectedWith('AbortError');
        });

        it('rejects upon receiving an abort signal', async () => {
          const mockSignature =
            'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt';
          const abortController = new AbortController();
          // Keep the subscription from ever returning data.
          await mockRpcMessage({
            method: 'signatureSubscribe',
            params: [mockSignature, {commitment: 'confirmed'}],
            result: new Promise(() => {}), // Never resolve.
          });
          clock.runAllAsync();
          const confirmationPromise = connection.confirmTransaction({
            abortSignal: abortController.signal,
            minContextSlot: 1,
            nonceAccountPubkey: new Address(1),
            nonceValue: SAMPLE_BLOCKHASH,
            signature: mockSignature,
          });
          clock.runAllAsync();
          expect(confirmationPromise).not.to.have.been.rejected;
          abortController.abort();
          await expect(confirmationPromise).to.eventually.be.rejected;
        });

        it('confirms the transaction if the signature confirmation is received before the nonce is advanced', async () => {
          const mockSignature =
            '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG';

          let resolveResultPromise = function (
            result: RpcWebSocketSignatureNotificationResult,
          ): any {
            return result;
          };

          await mockRpcMessage({
            method: 'signatureSubscribe',
            params: [mockSignature, {commitment: 'confirmed'}],
            result: new Promise<RpcWebSocketSignatureNotificationResult>(
              resolve => {
                resolveResultPromise = resolve;
              },
            ),
          });

          const nonceAccountPubkey = new Address(1);
          const nonceValue = blockhash(new Address(2).toBase58());
          const authority = new Address(3);

          // Start with the nonce account matching the nonce used to sign the transaction.
          await mockNonceAccountResponse(
            nonceAccountPubkey.toBase58(),
            nonceValue,
            authority.toBase58(),
          );

          const confirmationPromise = connection.confirmTransaction({
            minContextSlot: 0,
            nonceAccountPubkey,
            nonceValue,
            signature: mockSignature,
          });
          clock.runAllAsync();

          // Respond, a second time, with the same nonce hash.
          await mockNonceAccountResponse(
            nonceAccountPubkey.toBase58(),
            nonceValue,
            authority.toBase58(),
          );
          clock.runAllAsync();

          // Return a signature result in the nick of time.
          resolveResultPromise(createSignatureStatusRpcResult(null));

          await expect(confirmationPromise).to.eventually.deep.equal({
            context: {slot: 11n},
            value: {err: null},
          });
        });

        it('succeeds if double-checking the signature after the nonce-advances demonstrates that the transaction is confirmed', async () => {
          const mockSignature =
            'LPJ18iiyfz3G1LpNNbcBnBtaS4dVBdPHKrnELqikjER2DcvB4iyTgz43nKQJH3JQAJHuZdM1xVh5Cnc5Hc7LrqC';

          await mockRpcMessage({
            method: 'signatureSubscribe',
            params: [mockSignature, {commitment: 'confirmed'}],
            result: new Promise(() => {}), // Never resolve this = never get a response.
          });

          const nonceAccountPubkey = new Address(1);
          const nonceValue = blockhash(new Address(2).toBase58());
          const authority = new Address(3);

          const confirmationPromise = connection.confirmTransaction({
            minContextSlot: 0,
            nonceAccountPubkey,
            nonceValue,
            signature: mockSignature,
          });

          // Simulate the nonce advancing but the double-check of the signature status succeeding.
          await mockNonceAccountResponse(
            nonceAccountPubkey.toBase58(),
            new Address(4).toBase58(), // A new nonce.
            authority.toBase58(),
          );
          await mockRpcResponse({
            method: 'getSignatureStatuses',
            params: [[mockSignature]],
            value: [
              {
                err: null,
                confirmations: 0,
                confirmationStatus: 'finalized', // Demonstrate that the transaction is, in fact, confirmed.
                slot: 0,
              },
            ],
            withContext: true,
          });
          await clock.runToLastAsync();

          await expect(confirmationPromise).to.eventually.deep.equal({
            context: {slot: 11n},
            value: {err: null},
          });
        });

        it('keeps double-checking the signature after the nonce-advances until a signature from the minimum allowable slot is obtained', async () => {
          const mockSignature =
            'LPJ18iiyfz3G1LpNNbcBnBtaS4dVBdPHKrnELqikjER2DcvB4iyTgz43nKQJH3JQAJHuZdM1xVh5Cnc5Hc7LrqC';

          await mockRpcMessage({
            method: 'signatureSubscribe',
            params: [mockSignature, {commitment: 'confirmed'}],
            result: new Promise(() => {}), // Never resolve this = never get a response.
          });

          const nonceAccountPubkey = new Address(1);
          const nonceValue = blockhash(new Address(2).toBase58());
          const authority = new Address(3);

          const confirmationPromise = connection.confirmTransaction({
            minContextSlot: 11,
            nonceAccountPubkey,
            nonceValue,
            signature: mockSignature,
          });

          // Simulate the nonce advancing but the double-check of the signature status succeeding.
          await mockNonceAccountResponse(
            nonceAccountPubkey.toBase58(),
            new Address(4).toBase58(), // A new nonce.
            authority.toBase58(),
          );

          // Simulate getting a response from an old slot.
          await mockRpcResponse({
            method: 'getSignatureStatuses',
            params: [[mockSignature]],
            value: [
              {
                err: null,
                confirmations: 0,
                confirmationStatus: 'processed', // A non-finalized value from an old slot.
                slot: 10,
              },
            ],
            slot: 10,
            withContext: true,
          });

          // Then obtain a response from the minimum allowable slot.
          await mockRpcResponse({
            method: 'getSignatureStatuses',
            params: [[mockSignature]],
            value: [
              {
                err: null,
                confirmations: 32,
                confirmationStatus: 'finalized', // Demonstrate that the transaction is, in fact, confirmed.
                slot: 11,
              },
            ],
            slot: 11,
            withContext: true,
          });
          clock.runAllAsync();

          await expect(confirmationPromise).to.eventually.deep.equal({
            context: {slot: 11n},
            value: {err: null},
          });
        });

        it('throws a `TransactionExpiredNonceInvalidError` when the nonce is no longer the one with which this transaction was signed', async () => {
          const mockSignature =
            'LPJ18iiyfz3G1LpNNbcBnBtaS4dVBdPHKrnELqikjER2DcvB4iyTgz43nKQJH3JQAJHuZdM1xVh5Cnc5Hc7LrqC';

          await mockRpcMessage({
            method: 'signatureSubscribe',
            params: [mockSignature, {commitment: 'confirmed'}],
            result: new Promise(() => {}), // Never resolve this = never get a response.
          });

          const nonceAccountPubkey = new Address(1);
          const nonceValue = blockhash(new Address(2).toBase58());
          const authority = new Address(3);

          const confirmationPromise = connection.confirmTransaction({
            minContextSlot: 0,
            nonceAccountPubkey,
            nonceValue,
            signature: mockSignature,
          });

          // Simulate the nonce advancing but the double-check of the signature status succeeding.
          await mockNonceAccountResponse(
            nonceAccountPubkey.toBase58(),
            new Address(4).toBase58(), // A new nonce.
            authority.toBase58(),
          );
          await mockRpcResponse({
            method: 'getSignatureStatuses',
            params: [[mockSignature]],
            value: [
              {
                err: null,
                confirmations: 0,
                confirmationStatus: 'processed', // Demonstrate that the transaction is, in fact, not confirmed.
                slot: 0,
              },
            ],
            withContext: true,
          });
          await clock.runToLastAsync();

          await expect(confirmationPromise).to.eventually.be.rejectedWith(
            TransactionExpiredNonceInvalidError,
          );
        });

        it('when fetching the nonce account throws an error it does not timeout but rather keeps waiting for a confirmation', async () => {
          const mockSignature =
            'LPJ18iiyfz3G1LpNNbcBnBtaS4dVBdPHKrnELqikjER2DcvB4iyTgz43nKQJH3JQAJHuZdM1xVh5Cnc5Hc7LrqC';

          let resolveResultPromise = function (
            result: RpcWebSocketSignatureNotificationResult,
          ): any {
            return result;
          };

          await mockRpcMessage({
            method: 'signatureSubscribe',
            params: [mockSignature, {commitment: 'confirmed'}],
            result: new Promise<RpcWebSocketSignatureNotificationResult>(
              resolve => {
                resolveResultPromise = resolve;
              },
            ),
          });

          // Simulate a failure to fetch the nonce account.
          let rejectNonceAccountFetchPromise = function (): void {};
          await mockRpcResponse({
            method: 'getAccountInfo',
            params: [],
            value: (() => {
              const p = new Promise((_, reject) => {
                rejectNonceAccountFetchPromise = reject;
              });
              p.catch(() => {});
              return p;
            })(),
          });

          const nonceAccountPubkey = new Address(1);
          const nonceValue = blockhash(new Address(2).toBase58());

          const confirmationPromise = connection.confirmTransaction({
            minContextSlot: 0,
            nonceAccountPubkey,
            nonceValue,
            signature: mockSignature,
          });

          rejectNonceAccountFetchPromise();
          await clock.runToLastAsync();
          resolveResultPromise(createSignatureStatusRpcResult(null));
          await clock.runToLastAsync();

          await expect(confirmationPromise).to.eventually.deep.equal({
            context: {slot: 11n},
            value: {err: null},
          });
        });

        it('throws `TransactionExpiredNonceInvalidError` when the nonce account does not exist', async () => {
          const mockSignature =
            'LPJ18iiyfz3G1LpNNbcBnBtaS4dVBdPHKrnELqikjER2DcvB4iyTgz43nKQJH3JQAJHuZdM1xVh5Cnc5Hc7LrqC';

          await mockRpcMessage({
            method: 'signatureSubscribe',
            params: [mockSignature, {commitment: 'confirmed'}],
            result: new Promise(() => {}), // Never resolve this = never get a response.
          });

          const nonceAccountPubkey = new Address(1);
          const nonceValue = blockhash(new Address(2).toBase58());

          const confirmationPromise = connection.confirmTransaction({
            minContextSlot: 0,
            nonceAccountPubkey,
            nonceValue,
            signature: mockSignature,
          });

          // Simulate a non-existent nonce account.
          await mockRpcResponse({
            method: 'getAccountInfo',
            params: [],
            value: null,
            withContext: true,
          });
          await clock.runToLastAsync();
          await mockRpcResponse({
            method: 'getSignatureStatuses',
            params: [[mockSignature]],
            value: [
              {
                err: null,
                confirmations: 0,
                confirmationStatus: 'processed', // Demonstrate that the transaction is, in fact, not confirmed.
                slot: 0,
              },
            ],
            withContext: true,
          });
          await clock.runToLastAsync();

          await expect(confirmationPromise).to.eventually.be.rejectedWith(
            TransactionExpiredNonceInvalidError,
          );
        });

        it('when the nonce account data fails to deserialize', async () => {
          const mockSignature =
            'LPJ18iiyfz3G1LpNNbcBnBtaS4dVBdPHKrnELqikjER2DcvB4iyTgz43nKQJH3JQAJHuZdM1xVh5Cnc5Hc7LrqC';

          let resolveResultPromise = function (
            result: RpcWebSocketSignatureNotificationResult,
          ): any {
            return result;
          };

          await mockRpcMessage({
            method: 'signatureSubscribe',
            params: [mockSignature, {commitment: 'confirmed'}],
            result: new Promise<RpcWebSocketSignatureNotificationResult>(
              resolve => {
                resolveResultPromise = resolve;
              },
            ),
          });

          const nonceAccountPubkey = new Address(1);
          const nonceValue = blockhash(new Address(2).toBase58());

          // Simulate a failure to deserialize the nonce.
          await mockRpcResponse({
            method: 'getAccountInfo',
            params: [nonceAccountPubkey.toBase58(), {encoding: 'base64'}],
            value: {
              owner: SystemProgram.programId.toBase58(),
              lamports: LAMPORTS_PER_SOL,
              data: ['JUNK_DATA', 'base64'],
              executable: false,
              rentEpoch: 20,
              space: 0,
            },
            withContext: true,
          });

          const confirmationPromise = connection.confirmTransaction({
            minContextSlot: 0,
            nonceAccountPubkey,
            nonceValue,
            signature: mockSignature,
          });
          await clock.runToLastAsync();

          resolveResultPromise(createSignatureStatusRpcResult(null));
          await clock.runToLastAsync();

          await expect(confirmationPromise).to.eventually.deep.equal({
            context: {slot: 11n},
            value: {err: null},
          });
        });
      });

      it('confirm transaction - does not check the signature status before the signature subscription comes alive', async () => {
        const mockSignature =
          'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt';

        await mockRpcMessage({
          method: 'signatureSubscribe',
          params: [mockSignature, {commitment: 'confirmed'}],
          result: createSignatureStatusRpcResult(null),
          subscriptionEstablishmentPromise: new Promise(() => {}), // Never resolve.
        });
        const getSignatureStatusesExpectation = mock(connection)
          .expects('getSignatureStatuses')
          .never();
        connection.confirmTransaction(mockSignature);
        getSignatureStatusesExpectation.verify();
      });

      it('confirm transaction - checks the signature status once the signature subscription comes alive', async () => {
        const mockSignature =
          'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt';

        await mockRpcMessage({
          method: 'signatureSubscribe',
          params: [mockSignature, {commitment: 'confirmed'}],
          result: createSignatureStatusRpcResult(null),
        });
        const getSignatureStatusesExpectation = mock(connection)
          .expects('getSignatureStatuses')
          .once();

        const confirmationPromise =
          connection.confirmTransaction(mockSignature);
        clock.runAllAsync();

        await expect(confirmationPromise).to.eventually.deep.equal({
          context: {slot: 11n},
          value: {err: null},
        });
        getSignatureStatusesExpectation.verify();
      });

      it('confirm transaction - checks the signature status if the signature subscription fails before coming alive', async () => {
        const mockSignature =
          'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt';

        let rejectSubscriptionSetupFailure!: (_reason: {
          code: number;
          message: string;
        }) => void;
        const subscriptionSetupFailure = new Promise<void>((_, reject) => {
          rejectSubscriptionSetupFailure = reason => reject(reason);
        });

        await mockRpcMessage({
          method: 'signatureSubscribe',
          params: [mockSignature, {commitment: 'confirmed'}],
          result: new Promise(() => {}),
          subscriptionEstablishmentPromise: subscriptionSetupFailure,
        });
        await mockRpcResponse({
          method: 'getSignatureStatuses',
          params: [[mockSignature]],
          value: [
            {
              slot: 0,
              confirmations: 0,
              confirmationStatus: 'finalized',
              err: null,
            },
          ],
          withContext: true,
        });
        const getSignatureStatusesSpy = spy(connection, 'getSignatureStatuses');

        const confirmationPromise =
          connection.confirmTransaction(mockSignature);
        rejectSubscriptionSetupFailure({
          code: -32602,
          message: 'Invalid params',
        });
        await clock.tickAsync(0);

        await expect(confirmationPromise).to.eventually.have.nested.property(
          'value.err',
          null,
        );
        expect(getSignatureStatusesSpy).to.have.been.calledOnce;
        getSignatureStatusesSpy.restore();
      });

      it('confirm transaction - checks the signature status if the signature subscription state is already terminal when observation begins', async () => {
        const mockSignature =
          'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt';

        await mockRpcMessage({
          method: 'signatureSubscribe',
          params: [mockSignature, {commitment: 'confirmed'}],
          result: createSignatureStatusRpcResult(null),
          subscriptionEstablishmentPromise: new Promise(() => {}),
        });
        await mockRpcResponse({
          method: 'getSignatureStatuses',
          params: [[mockSignature]],
          value: [
            {
              slot: 0,
              confirmations: 0,
              confirmationStatus: 'finalized',
              err: null,
            },
          ],
          withContext: true,
        });

        const disposeStateObserver = spy();
        const observeStateChangesStub = stub(
          (
            connection as unknown as {
              _subscriptionRegistry: {observeStateChanges: unknown};
            }
          )._subscriptionRegistry,
          'observeStateChanges',
        ).returns({
          currentState: 'failed',
          dispose: disposeStateObserver,
        });
        const getSignatureStatusesSpy = spy(connection, 'getSignatureStatuses');

        const confirmationPromise =
          connection.confirmTransaction(mockSignature);
        await clock.tickAsync(0);

        await expect(confirmationPromise).to.eventually.have.nested.property(
          'value.err',
          null,
        );
        expect(observeStateChangesStub).to.have.been.calledOnce;
        expect(disposeStateObserver).to.have.been.calledOnce;

        getSignatureStatusesSpy.restore();
        observeStateChangesStub.restore();
      });

      it('confirm transaction - checks the signature status if the signature subscription becomes inactive before observation settles', async () => {
        const mockSignature =
          'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt';

        await mockRpcMessage({
          method: 'signatureSubscribe',
          params: [mockSignature, {commitment: 'confirmed'}],
          result: createSignatureStatusRpcResult(null),
          subscriptionEstablishmentPromise: new Promise(() => {}),
        });
        await mockRpcResponse({
          method: 'getSignatureStatuses',
          params: [[mockSignature]],
          value: [
            {
              slot: 0,
              confirmations: 0,
              confirmationStatus: 'finalized',
              err: null,
            },
          ],
          withContext: true,
        });

        const disposeStateObserver = spy();
        const observeStateChangesStub = stub(
          (
            connection as unknown as {
              _subscriptionRegistry: {observeStateChanges: unknown};
            }
          )._subscriptionRegistry,
          'observeStateChanges',
        ).returns({
          currentState: 'inactive',
          dispose: disposeStateObserver,
        });
        const getSignatureStatusesSpy = spy(connection, 'getSignatureStatuses');

        const confirmationPromise =
          connection.confirmTransaction(mockSignature);
        await clock.tickAsync(0);

        await expect(confirmationPromise).to.eventually.have.nested.property(
          'value.err',
          null,
        );
        expect(observeStateChangesStub).to.have.been.calledOnce;
        expect(disposeStateObserver).to.have.been.calledOnce;

        getSignatureStatusesSpy.restore();
        observeStateChangesStub.restore();
      });

      // FIXME: This test does not work.
      // it('confirm transaction - confirms transaction when signature status check yields confirmation before signature subscription does', async () => {
      //   const mockSignature =
      //     'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt';

      //   // Keep the subscription from ever returning data.
      //   await mockRpcMessage({
      //     method: 'signatureSubscribe',
      //     params: [mockSignature, {commitment: 'finalized'}],
      //     result: new Promise(() => {}), // Never resolve.
      //   });
      //   clock.runAllAsync();

      //   const confirmationPromise =
      //     connection.confirmTransaction(mockSignature);
      //   clock.runAllAsync();

      //   // Return a signature status through the RPC API.
      //   await mockRpcResponse({
      //     method: 'getSignatureStatuses',
      //     params: [[mockSignature]],
      //     value: [
      //       {
      //         slot: 0,
      //         confirmations: 11,
      //         status: {Ok: null},
      //         err: null,
      //       },
      //     ],
      //   });
      //   clock.runAllAsync();

      //   await expect(confirmationPromise).to.eventually.deep.equal({
      //     context: {slot: 11},
      //     value: {err: null},
      //   });
      // });

      it('confirm transaction - does not confirm the transaction when signature status check yields confirmation for a lower commitment before signature subscription confirms the transaction', async () => {
        const mockSignature =
          'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt';

        // Keep the subscription from ever returning data.
        await mockRpcMessage({
          method: 'signatureSubscribe',
          params: [mockSignature, {commitment: 'confirmed'}],
          result: new Promise(() => {}), // Never resolve.
        });
        clock.runAllAsync();

        const confirmationPromise =
          connection.confirmTransaction(mockSignature);
        clock.runAllAsync();

        // Return a signature status with a lower finality through the RPC API.
        await mockRpcResponse({
          method: 'getSignatureStatuses',
          params: [[mockSignature]],
          value: [
            {
              slot: 0,
              confirmations: null,
              confirmationStatus: 'processed', // Lower than we expect
              err: null,
            },
          ],
        });
        clock.runAllAsync();

        await expect(confirmationPromise).to.be.rejectedWith(
          TransactionExpiredTimeoutError,
        );
      });
    });
  }

  describe('transaction confirmation', () => {
    it('confirm transaction - error', async () => {
      const badTransactionSignature = 'bad transaction signature';

      await expect(
        connection.confirmTransaction({
          blockhash: SAMPLE_BLOCKHASH,
          lastValidBlockHeight: 9999,
          signature: badTransactionSignature,
        }),
      ).to.be.rejectedWith('signature must be base58 encoded');

      await mockRpcResponse({
        method: 'getSignatureStatuses',
        params: [[badTransactionSignature]],
        error: mockErrorResponse,
      });

      await expect(
        connection.getSignatureStatus(badTransactionSignature),
      ).to.be.rejectedWith('base58-encoded signature string');
    });
  });

  it('get transaction count', async () => {
    await mockRpcResponse({
      method: 'getTransactionCount',
      params: [],
      value: 1000000,
    });

    const count = await connection.getTransactionCount();
    expect(count).to.be.at.least(0);
  });

  it('get transaction count uses the connection default commitment', async () => {
    await mockRpcResponse({
      method: 'getTransactionCount',
      params: [{commitment: 'confirmed'}],
      value: 1000000,
    });

    const connectionWithCommitment = new Connection(url, 'confirmed');
    const count = await connectionWithCommitment.getTransactionCount();

    if (mockServer) {
      expect(count).to.eq(1000000n);
    } else {
      expect(typeof count).to.eq('bigint');
      expect(count >= 0n).to.be.true;
    }
  });

  it('get minimum balance for rent exemption', async () => {
    await mockRpcResponse({
      method: 'getMinimumBalanceForRentExemption',
      params: [512],
      value: 1000000,
    });

    const count = await connection.getMinimumBalanceForRentExemption(512);
    expect(count >= 0n).to.eq(true);
  });

  it('get minimum balance for rent exemption with config object', async () => {
    await mockRpcResponse({
      method: 'getMinimumBalanceForRentExemption',
      params: [512, {commitment: 'confirmed'}],
      value: 1000000,
    });

    const count = await connection.getMinimumBalanceForRentExemption(512, {
      commitment: 'confirmed',
    });
    expect(count >= 0n).to.eq(true);
  });

  if (mockServer) {
    it('get minimum balance for rent exemption warns and returns zero on RPC error', async () => {
      await mockRpcResponse({
        method: 'getMinimumBalanceForRentExemption',
        params: [0],
        error: {
          code: -32000,
          message: 'rent unavailable',
        },
      });

      const warnSpy = spy(console, 'warn');
      try {
        await expect(
          connection.getMinimumBalanceForRentExemption(0),
        ).to.eventually.eq(0n);
        expect(warnSpy).to.have.been.calledOnceWithExactly(
          'Unable to fetch minimum balance for rent exemption',
        );
      } finally {
        warnSpy.restore();
      }
    });
  }

  it('get signatures for address', async function () {
    const connection = new Connection(url);

    await mockRpcResponse({
      method: 'getSlot',
      params: [],
      value: 2,
    });

    await waitForSlot.call(this, connection, 1);

    await mockRpcResponse({
      method: 'getBlock',
      params: [1, {commitment: 'confirmed'}],
      value: {
        blockTime: 1614281964,
        blockhash: '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
        previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
        parentSlot: 0,
        transactions: [
          {
            meta: {
              fee: 10000,
              postBalances: [499260347380, 15298080, 1, 1, 1],
              preBalances: [499260357380, 15298080, 1, 1, 1],
              status: {Ok: null},
              err: null,
            },
            transaction: {
              message: {
                accountKeys: [
                  'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
                  '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
                  'SysvarS1otHashes111111111111111111111111111',
                  'SysvarC1ock11111111111111111111111111111111',
                  'Vote111111111111111111111111111111111111111',
                ],
                header: {
                  numReadonlySignedAccounts: 0,
                  numReadonlyUnsignedAccounts: 3,
                  numRequiredSignatures: 2,
                },
                instructions: [
                  {
                    accounts: [1, 2, 3],
                    data: '37u9WtQpcm6ULa3VtWDFAWoQc1hUvybPrA3dtx99tgHvvcE7pKRZjuGmn7VX2tC3JmYDYGG7',
                    programIdIndex: 4,
                  },
                ],
                recentBlockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
              },
              signatures: [
                'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt',
                '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG',
              ],
            },
          },
        ],
      },
    });

    // Find a block that has a transaction.
    await mockRpcResponse({
      method: 'getFirstAvailableBlock',
      params: [],
      value: 1,
    });
    let slot = Number(await connection.getFirstAvailableBlock());

    let address: Address | undefined;
    let expectedSignature: string | undefined;
    while (!address || !expectedSignature) {
      const block = await connection.getConfirmedBlock(slot);
      if (block.transactions.length > 0) {
        const {signature, publicKey} =
          block.transactions[0].transaction.signatures[0];
        if (signature) {
          address = publicKey;
          expectedSignature = BASE58_CODEC.decode(signature);
          break;
        }
      }
      slot++;
    }

    // getSignaturesForAddress tests...
    await mockRpcResponse({
      method: 'getSignaturesForAddress',
      params: [address.toBase58(), {commitment: 'confirmed', limit: 1}],
      value: [
        {
          signature: expectedSignature,
          slot,
          err: null,
          memo: null,
        },
      ],
    });

    const signatures = await connection.getSignaturesForAddress(address, {
      limit: 1,
    });
    expect(signatures).to.have.length(1);
    if (mockServer) {
      expect(signatures[0].signature).to.eq(expectedSignature);
      expect(signatures[0].slot).to.eq(BigInt(slot));
      expect(signatures[0].err).to.be.null;
      expect(signatures[0].memo).to.be.null;
    }
  });

  it('get parsed confirmed transactions', async function () {
    await mockRpcResponse({
      method: 'getSlot',
      params: [],
      value: 2,
    });

    await waitForSlot.call(this, connection, 1);

    await mockRpcResponse({
      method: 'getBlock',
      params: [1, {commitment: 'confirmed'}],
      value: {
        blockTime: 1614281964,
        blockhash: '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
        previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
        parentSlot: 0,
        transactions: [
          {
            meta: {
              fee: 10000,
              postBalances: [499260347380, 15298080, 1, 1, 1],
              preBalances: [499260357380, 15298080, 1, 1, 1],
              status: {Ok: null},
              err: null,
            },
            transaction: {
              message: {
                accountKeys: [
                  'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
                  '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
                  'SysvarS1otHashes111111111111111111111111111',
                  'SysvarC1ock11111111111111111111111111111111',
                  'Vote111111111111111111111111111111111111111',
                ],
                header: {
                  numReadonlySignedAccounts: 0,
                  numReadonlyUnsignedAccounts: 3,
                  numRequiredSignatures: 2,
                },
                instructions: [
                  {
                    accounts: [1, 2, 3],
                    data: '37u9WtQpcm6ULa3VtWDFAWoQc1hUvybPrA3dtx99tgHvvcE7pKRZjuGmn7VX2tC3JmYDYGG7',
                    programIdIndex: 4,
                  },
                ],
                recentBlockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
              },
              signatures: [
                'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt',
                '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG',
              ],
            },
          },
        ],
      },
    });

    // Find a block that has a transaction.
    await mockRpcResponse({
      method: 'getFirstAvailableBlock',
      params: [],
      value: 1,
    });
    let slot = Number(await connection.getFirstAvailableBlock());

    let confirmedTransaction: string | undefined;
    while (!confirmedTransaction) {
      const block = await connection.getConfirmedBlock(slot);
      for (const tx of block.transactions) {
        if (tx.transaction.signature) {
          confirmedTransaction = BASE58_CODEC.decode(tx.transaction.signature);
          break;
        }
      }
      slot++;
    }

    const parsedConfirmedTransactionResponse = {
      blockTime: 1616102519,
      meta: {
        err: null,
        fee: 5000,
        innerInstructions: [],
        logMessages: [
          'Program Vote111111111111111111111111111111111111111 invoke [1]',
          'Program Vote111111111111111111111111111111111111111 success',
        ],
        postBalances: [499999995000, 26858640, 1, 1, 1],
        postTokenBalances: [],
        preBalances: [500000000000, 26858640, 1, 1, 1],
        preTokenBalances: [],
        status: {
          Ok: null,
        },
      },
      slot: 2,
      transaction: {
        message: {
          accountKeys: [
            {
              pubkey: 'jcU4R7JccGEvDpe1i6bahvHpe47XahMXacG73EzE198',
              signer: true,
              writable: true,
            },
            {
              pubkey: 'GfBcnCAU7kWfAYqKRCNyWEHjdEJZmzRZvEcX5bbzEQqt',
              signer: false,
              writable: true,
            },
            {
              pubkey: 'SysvarS1otHashes111111111111111111111111111',
              signer: false,
              writable: false,
            },
            {
              pubkey: 'SysvarC1ock11111111111111111111111111111111',
              signer: false,
              writable: false,
            },
            {
              pubkey: 'Vote111111111111111111111111111111111111111',
              signer: false,
              writable: false,
            },
          ],
          instructions: [
            {
              parsed: {
                info: {
                  clockSysvar: 'SysvarC1ock11111111111111111111111111111111',
                  slotHashesSysvar:
                    'SysvarS1otHashes111111111111111111111111111',
                  vote: {
                    hash: 'GuCya3AAGxn1qhoqxqy3WEdZdZUkXKpa9pthQ3tqvbpx',
                    slots: [1],
                    timestamp: 1616102669,
                  },
                  voteAccount: 'GfBcnCAU7kWfAYqKRCNyWEHjdEJZmzRZvEcX5bbzEQqt',
                  voteAuthority: 'jcU4R7JccGEvDpe1i6bahvHpe47XahMXacG73EzE198',
                },
                type: 'vote',
              },
              program: 'vote',
              programId: 'Vote111111111111111111111111111111111111111',
            },
          ],
          recentBlockhash: 'G9ywjV5CVgMtLXruXtrE7af4QgFKYNXgDTw4jp7SWcSo',
        },
        signatures: [
          '4G4rTqnUdzrmBHsdKJSiMtonpQLWSw1avJ8YxWQ95jE6iFFHFsEkBnoYycxnkBS9xHWRc6EarDsrFG9USFBbjfjx',
        ],
      },
    };

    await mockRpcResponse({
      method: 'getTransaction',
      params: [
        confirmedTransaction,
        {commitment: 'confirmed', encoding: 'jsonParsed'},
      ],
      value: parsedConfirmedTransactionResponse,
    });

    let result = await connection.getParsedConfirmedTransactions([
      confirmedTransaction,
      confirmedTransaction,
    ]);

    if (!result) {
      expect(result).to.be.ok;
      return;
    }

    expect(result).to.be.length(2);
    expect(result[0]).to.not.be.null;
    expect(result[1]).to.not.be.null;
    if (result[0] !== null) {
      expect(result[0].transaction.signatures).not.to.be.null;
    }
    if (result[1] !== null) {
      expect(result[1].transaction.signatures).not.to.be.null;
    }

    result = await connection.getParsedConfirmedTransactions([]);
    if (!result) {
      expect(result).to.be.ok;
      return;
    }

    expect(result).to.be.empty;
  });

  it('get block height', async () => {
    await mockRpcResponse({
      method: 'getBlockHeight',
      params: [{commitment: 'confirmed'}],
      value: 10,
    });

    const blockHeight = await connection.getBlockHeight('confirmed');
    expect(blockHeight).to.be.a('bigint');
  });

  if (!process.env.TEST_LIVE) {
    it('identical get block height calls get coalesced', async () => {
      // This is equivalent to asserting that `getBlockHeight` only gets called once.
      await mockRpcResponse({
        method: 'getBlockHeight',
        params: [{commitment: 'confirmed'}],
        value: 10,
      });

      const [blockHeightA, blockHeightB, blockHeightC] = await Promise.all([
        connection.getBlockHeight('confirmed'),
        connection.getBlockHeight({commitment: 'confirmed'}),
        connection.getBlockHeight('confirmed'),
      ]);
      expect(blockHeightA).to.be.a('bigint');
      expect(blockHeightB).to.be.a('bigint');
      expect(blockHeightC).to.be.a('bigint');
    });

    it('get block height calls whose args are in different orders but functionally identical get coalesced', async () => {
      // This is equivalent to asserting that `getBlockHeight` only gets called once.
      await mockRpcResponse({
        method: 'getBlockHeight',
        params: [{commitment: 'confirmed', minContextSlot: 5}],
        value: 10,
      });

      const [blockHeightA, blockHeightB] = await Promise.all([
        connection.getBlockHeight({commitment: 'confirmed', minContextSlot: 5}),
        connection.getBlockHeight({minContextSlot: 5, commitment: 'confirmed'}),
      ]);
      expect(blockHeightA).to.be.a('bigint');
      expect(blockHeightB).to.be.a('bigint');
    });

    it('get block height calls with different params do not get coalesced', async () => {
      // This is equivalent to asserting that `getBlockHeight` gets called three times.
      await mockRpcResponse({
        method: 'getBlockHeight',
        params: [{commitment: 'confirmed'}],
        value: 10,
      });
      await mockRpcResponse({
        method: 'getBlockHeight',
        params: [],
        value: 10,
      });
      await mockRpcResponse({
        method: 'getBlockHeight',
        params: [{commitment: 'confirmed', minContextSlot: 5}],
        value: 10,
      });

      const [blockHeightA, blockHeightB, blockHeightC] = await Promise.all([
        connection.getBlockHeight('confirmed'),
        connection.getBlockHeight('finalized'),
        connection.getBlockHeight({commitment: 'confirmed', minContextSlot: 5}),
      ]);
      expect(blockHeightA).to.be.a('bigint');
      expect(blockHeightB).to.be.a('bigint');
      expect(blockHeightC).to.be.a('bigint');
    });

    it('get block height calls that fail bubble up to each coalesced caller', async () => {
      // This is equivalent to asserting that `getBlockHeight` only gets called once.
      await mockRpcResponse({
        method: 'getBlockHeight',
        params: [{commitment: 'confirmed'}],
        error: {
          message: 'Something bad happened',
        },
      });

      const blockHeightPromiseA = connection.getBlockHeight('confirmed');
      const blockHeightPromiseB = connection.getBlockHeight({
        commitment: 'confirmed',
      });
      const blockHeightPromiseC = connection.getBlockHeight('confirmed');
      await expect(blockHeightPromiseA).to.eventually.be.rejected;
      await expect(blockHeightPromiseB).to.eventually.be.rejected;
      await expect(blockHeightPromiseC).to.eventually.be.rejected;
    });

    it('follow on calls to get block height generate new network requests', async () => {
      await mockRpcResponse({
        method: 'getBlockHeight',
        params: [{commitment: 'confirmed'}],
        value: 10,
      });
      await expect(connection.getBlockHeight('confirmed')).to.eventually.eq(
        10n,
      );
      // Second call with identical options should make a *new* request, since the first has completed
      await mockRpcResponse({
        method: 'getBlockHeight',
        params: [{commitment: 'confirmed'}],
        error: {
          message: 'Try again',
        },
      });
      await expect(connection.getBlockHeight('confirmed')).to.be.rejected;
      // Third call identical to the second, failed one, should also make a new request.
      await mockRpcResponse({
        method: 'getBlockHeight',
        params: [{commitment: 'confirmed'}],
        value: 11,
      });
      await expect(connection.getBlockHeight('confirmed')).to.eventually.eq(
        11n,
      );
    });
  }

  it('get block production', async () => {
    const commitment: Commitment = 'processed';

    // Find slot of the lowest confirmed block
    await mockRpcResponse({
      method: 'getFirstAvailableBlock',
      params: [],
      value: 1,
    });
    const firstSlot = Number(await connection.getFirstAvailableBlock());

    // Find current block height
    await mockRpcResponse({
      method: 'getBlockHeight',
      params: [{commitment: commitment}],
      value: 10,
    });
    const lastSlot = await connection.getBlockHeight(commitment);

    const blockProductionConfig = {
      commitment: commitment,
      range: {
        firstSlot,
        lastSlot: Number(lastSlot),
      },
    };

    const blockProductionRet = {
      byIdentity: {
        '85iYT5RuzRTDgjyRa3cP8SYhM2j21fj7NhfJ3peu1DPr': [12, 10],
      },
      range: {
        firstSlot,
        lastSlot: Number(lastSlot),
      },
    };

    //mock RPC call with config specified
    await mockRpcResponse({
      method: 'getBlockProduction',
      params: [blockProductionConfig],
      value: blockProductionRet,
      withContext: true,
    });

    //mock RPC call with commitment only
    await mockRpcResponse({
      method: 'getBlockProduction',
      params: [{commitment: commitment}],
      value: blockProductionRet,
      withContext: true,
    });

    const result = await connection.getBlockProduction(blockProductionConfig);

    expect(result.context).to.be.ok;
    expect(result.value).to.be.ok;

    const resultContextSlot = result.context.slot;
    expect(typeof resultContextSlot).to.eq('bigint');

    const resultIdentityDictionary = result.value.byIdentity;
    expect(resultIdentityDictionary).to.be.a('object');

    for (const [key, validatorProduction] of Object.entries(
      resultIdentityDictionary,
    )) {
      expect(key).to.be.a('string');
      expect(validatorProduction).to.be.a('array');
      if (validatorProduction == null) {
        continue;
      }
      expect(typeof validatorProduction[0]).to.eq('bigint');
      expect(typeof validatorProduction[1]).to.eq('bigint');
    }

    const resultSlotRange = result.value.range;
    expect(resultSlotRange.firstSlot).to.equal(BigInt(firstSlot));
    expect(resultSlotRange.lastSlot).to.equal(BigInt(lastSlot));

    const resultCommitmentOnly =
      await connection.getBlockProduction(commitment);

    expect(resultCommitmentOnly.context).to.be.ok;
    expect(resultCommitmentOnly.value).to.be.ok;

    const resultCOContextSlot = resultCommitmentOnly.context.slot;
    expect(typeof resultCOContextSlot).to.eq('bigint');

    const resultCOIdentityDictionary = resultCommitmentOnly.value.byIdentity;
    expect(resultCOIdentityDictionary).to.be.a('object');

    for (const [property, validatorProduction] of Object.entries(
      resultCOIdentityDictionary,
    )) {
      expect(property).to.be.a('string');
      expect(validatorProduction).to.be.a('array');
      if (validatorProduction == null) {
        continue;
      }
      expect(typeof validatorProduction[0]).to.eq('bigint');
      expect(typeof validatorProduction[1]).to.eq('bigint');
    }

    const resultCOSlotRange = resultCommitmentOnly.value.range;
    if (mockServer) {
      expect(resultCOSlotRange.firstSlot).to.equal(BigInt(firstSlot));
      expect(resultCOSlotRange.lastSlot).to.equal(BigInt(lastSlot));
    } else {
      expect(typeof resultCOSlotRange.firstSlot).to.eq('bigint');
      expect(resultCOSlotRange.firstSlot >= 0n).to.eq(true);
      if (resultCOSlotRange.lastSlot !== undefined) {
        expect(typeof resultCOSlotRange.lastSlot).to.eq('bigint');
        expect(resultCOSlotRange.lastSlot >= resultCOSlotRange.firstSlot).to.eq(
          true,
        );
      }
    }
  });

  if (!process.env.TEST_LIVE) {
    describe('v1 transactions', () => {
      const signature =
        'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt';
      const v1JsonMessage = {
        accountKeys: [
          'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
          '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
          '11111111111111111111111111111111',
        ],
        header: {
          numReadonlySignedAccounts: 0,
          numReadonlyUnsignedAccounts: 1,
          numRequiredSignatures: 1,
        },
        instructions: [
          {
            accounts: [0, 1],
            data: '3Bxs4NN8M2Yn4TLb',
            programIdIndex: 2,
          },
        ],
        recentBlockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
        transactionConfig: {
          computeUnitLimit: 300000,
          priorityFee: 5000,
        },
      };
      const v1TransactionMeta = {
        err: null,
        fee: 10000,
        postBalances: [499260347380, 15298080, 1],
        preBalances: [499260357380, 15298080, 1],
        status: {Ok: null},
      };

      it('getTransaction returns a MessageV1 with its transaction config', async () => {
        await mockRpcResponse({
          method: 'getTransaction',
          params: [
            signature,
            {commitment: 'confirmed', maxSupportedTransactionVersion: 1},
          ],
          value: {
            blockTime: 1614281964,
            meta: v1TransactionMeta,
            slot: 1,
            transaction: {
              message: v1JsonMessage,
              signatures: [signature],
            },
            version: 1,
          },
        });

        const response = await connection.getTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 1,
        });

        invariant(response !== null);
        expect(response.version).to.eq(1);
        const message = response.transaction.message;
        invariant(message instanceof MessageV1);
        expect(message.version).to.eq(1);
        expect(message.staticAccountKeys.map(key => key.toBase58())).to.eql(
          v1JsonMessage.accountKeys,
        );
        expect(message.transactionConfig).to.eql({
          computeUnitLimit: 300000,
          priorityFeeLamports: 5000n,
        });
      });

      it('getParsedTransaction maps the v1 transaction config', async () => {
        await mockRpcResponse({
          method: 'getTransaction',
          params: [
            signature,
            {
              commitment: 'confirmed',
              encoding: 'jsonParsed',
              maxSupportedTransactionVersion: 1,
            },
          ],
          value: {
            blockTime: 1614281964,
            meta: v1TransactionMeta,
            slot: 1,
            transaction: {
              message: {
                accountKeys: [
                  {
                    pubkey: 'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
                    signer: true,
                    source: 'transaction',
                    writable: true,
                  },
                  {
                    pubkey: '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
                    signer: false,
                    source: 'transaction',
                    writable: true,
                  },
                  {
                    pubkey: '11111111111111111111111111111111',
                    signer: false,
                    source: 'transaction',
                    writable: false,
                  },
                ],
                instructions: [
                  {
                    accounts: [
                      'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
                      '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
                    ],
                    data: '3Bxs4NN8M2Yn4TLb',
                    programId: '11111111111111111111111111111111',
                  },
                ],
                recentBlockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
                transactionConfig: {
                  computeUnitLimit: 300000,
                  priorityFee: 5000,
                },
              },
              signatures: [signature],
            },
            version: 1,
          },
        });

        const response = await connection.getParsedTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 1,
        });

        invariant(response !== null);
        expect(response.version).to.eq(1);
        expect(response.transaction.message.transactionConfig).to.eql({
          computeUnitLimit: 300000,
          priorityFeeLamports: 5000n,
        });
      });

      it('getBlock returns v1 transactions as MessageV1', async () => {
        await mockRpcResponse({
          method: 'getBlock',
          params: [
            1,
            {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 1,
              transactionDetails: 'full',
            },
          ],
          value: {
            blockHeight: 0,
            blockTime: 1614281964,
            blockhash: '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
            parentSlot: 0,
            previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
            transactions: [
              {
                meta: v1TransactionMeta,
                transaction: {
                  message: v1JsonMessage,
                  signatures: [signature],
                },
                version: 1,
              },
            ],
          },
        });

        const block = await connection.getBlock(1, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 1,
          transactionDetails: 'full',
        });

        invariant(block !== null);
        const blockTransaction = block.transactions[0];
        expect(blockTransaction.version).to.eq(1);
        const message = blockTransaction.transaction.message;
        invariant(message instanceof MessageV1);
        expect(message.transactionConfig).to.eql({
          computeUnitLimit: 300000,
          priorityFeeLamports: 5000n,
        });
      });
    });
  }

  it('get transaction', async function () {
    await mockRpcResponse({
      method: 'getSlot',
      params: [],
      value: 2,
    });

    await waitForSlot.call(this, connection, 1);

    await mockRpcResponse({
      method: 'getBlock',
      params: [1, {commitment: 'confirmed'}],
      value: {
        blockHeight: 0,
        blockTime: 1614281964,
        blockhash: '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
        previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
        parentSlot: 0,
        transactions: [
          {
            meta: {
              fee: 10000,
              postBalances: [499260347380, 15298080, 1, 1, 1],
              preBalances: [499260357380, 15298080, 1, 1, 1],
              status: {Ok: null},
              err: null,
            },
            transaction: {
              message: {
                accountKeys: [
                  'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
                  '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
                  'SysvarS1otHashes111111111111111111111111111',
                  'SysvarC1ock11111111111111111111111111111111',
                  'Vote111111111111111111111111111111111111111',
                ],
                header: {
                  numReadonlySignedAccounts: 0,
                  numReadonlyUnsignedAccounts: 3,
                  numRequiredSignatures: 2,
                },
                instructions: [
                  {
                    accounts: [1, 2, 3],
                    data: '37u9WtQpcm6ULa3VtWDFAWoQc1hUvybPrA3dtx99tgHvvcE7pKRZjuGmn7VX2tC3JmYDYGG7',
                    programIdIndex: 4,
                  },
                ],
                recentBlockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
              },
              signatures: [
                'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt',
                '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG',
              ],
            },
          },
        ],
      },
    });

    // Find a block that has a transaction.
    await mockRpcResponse({
      method: 'getFirstAvailableBlock',
      params: [],
      value: 1,
    });
    let slot = Number(await connection.getFirstAvailableBlock());

    let transaction: string | undefined;
    while (!transaction) {
      const block = await connection.getBlock(slot);
      if (block && block.transactions.length > 0) {
        transaction = block.transactions[0].transaction.signatures[0];
        continue;
      }
      slot++;
    }

    await mockRpcResponse({
      method: 'getTransaction',
      params: [transaction, {commitment: 'confirmed'}],
      value: {
        slot,
        transaction: {
          message: {
            accountKeys: [
              'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
              '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
              'SysvarS1otHashes111111111111111111111111111',
              'SysvarC1ock11111111111111111111111111111111',
              'Vote111111111111111111111111111111111111111',
            ],
            header: {
              numReadonlySignedAccounts: 0,
              numReadonlyUnsignedAccounts: 3,
              numRequiredSignatures: 2,
            },
            instructions: [
              {
                accounts: [1, 2, 3],
                data: '37u9WtQpcm6ULa3VtWDFAWoQc1hUvybPrA3dtx99tgHvvcE7pKRZjuGmn7VX2tC3JmYDYGG7',
                programIdIndex: 4,
              },
            ],
            recentBlockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
          },
          signatures: [
            'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt',
            '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG',
          ],
        },
        meta: {
          fee: 10000,
          postBalances: [499260347380, 15298080, 1, 1, 1],
          preBalances: [499260357380, 15298080, 1, 1, 1],
          status: {Ok: null},
          err: null,
        },
      },
    });

    const result = await connection.getTransaction(transaction);

    if (!result) {
      expect(result).to.be.ok;
      return;
    }

    const resultSignature = result.transaction.signatures[0];
    expect(resultSignature).to.eq(transaction);
    if (mockServer) {
      expect(result.slot).to.eq(BigInt(slot));
      expect(result.meta?.fee).to.eq(10000n);
      expect(result.meta?.preBalances).to.eql([
        499260357380n,
        15298080n,
        1n,
        1n,
        1n,
      ]);
      expect(result.meta?.postBalances).to.eql([
        499260347380n,
        15298080n,
        1n,
        1n,
        1n,
      ]);
    } else {
      expect(result.slot).to.be.a('bigint');
      expect(result.meta?.fee).to.be.a('bigint');
      expect(result.meta?.preBalances).to.satisfy(
        (balances: bigint[] | undefined) =>
          balances != null &&
          balances.length > 0 &&
          balances.every(balance => typeof balance === 'bigint'),
      );
      expect(result.meta?.postBalances).to.satisfy(
        (balances: bigint[] | undefined) =>
          balances != null &&
          balances.length > 0 &&
          balances.every(balance => typeof balance === 'bigint'),
      );
    }

    const newAddress = (await Keypair.generate()).publicKey;
    const recentSignature = await helpers.airdrop({
      connection,
      address: newAddress,
      amount: 1,
    });

    await mockRpcResponse({
      method: 'getTransaction',
      params: [recentSignature],
      value: null,
    });

    const nullResponse = await connection.getTransaction(recentSignature, {
      commitment: 'finalized',
    });
    expect(nullResponse).to.be.null;
  });

  it('get confirmed transaction', async function () {
    await mockRpcResponse({
      method: 'getSlot',
      params: [],
      value: 2,
    });

    await waitForSlot.call(this, connection, 1);

    await mockRpcResponse({
      method: 'getBlock',
      params: [1, {commitment: 'confirmed'}],
      value: {
        blockTime: 1614281964,
        blockhash: '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
        previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
        parentSlot: 0,
        transactions: [
          {
            meta: {
              fee: 10000,
              postBalances: [499260347380, 15298080, 1, 1, 1],
              preBalances: [499260357380, 15298080, 1, 1, 1],
              status: {Ok: null},
              err: null,
            },
            transaction: {
              message: {
                accountKeys: [
                  'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
                  '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
                  'SysvarS1otHashes111111111111111111111111111',
                  'SysvarC1ock11111111111111111111111111111111',
                  'Vote111111111111111111111111111111111111111',
                ],
                header: {
                  numReadonlySignedAccounts: 0,
                  numReadonlyUnsignedAccounts: 3,
                  numRequiredSignatures: 2,
                },
                instructions: [
                  {
                    accounts: [1, 2, 3],
                    data: '37u9WtQpcm6ULa3VtWDFAWoQc1hUvybPrA3dtx99tgHvvcE7pKRZjuGmn7VX2tC3JmYDYGG7',
                    programIdIndex: 4,
                  },
                ],
                recentBlockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
              },
              signatures: [
                'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt',
                '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG',
              ],
            },
          },
        ],
      },
    });

    // Find a block that has a transaction.
    await mockRpcResponse({
      method: 'getFirstAvailableBlock',
      params: [],
      value: 1,
    });
    let slot = Number(await connection.getFirstAvailableBlock());

    let confirmedTransaction: string | undefined;
    while (!confirmedTransaction) {
      const block = await connection.getConfirmedBlock(slot);
      for (const tx of block.transactions) {
        if (tx.transaction.signature) {
          confirmedTransaction = BASE58_CODEC.decode(tx.transaction.signature);
          break;
        }
      }
      slot++;
    }

    await mockRpcResponse({
      method: 'getTransaction',
      params: [confirmedTransaction, {commitment: 'confirmed'}],
      value: {
        slot,
        transaction: {
          message: {
            accountKeys: [
              'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
              '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
              'SysvarS1otHashes111111111111111111111111111',
              'SysvarC1ock11111111111111111111111111111111',
              'Vote111111111111111111111111111111111111111',
            ],
            header: {
              numReadonlySignedAccounts: 0,
              numReadonlyUnsignedAccounts: 3,
              numRequiredSignatures: 2,
            },
            instructions: [
              {
                accounts: [1, 2, 3],
                data: '37u9WtQpcm6ULa3VtWDFAWoQc1hUvybPrA3dtx99tgHvvcE7pKRZjuGmn7VX2tC3JmYDYGG7',
                programIdIndex: 4,
              },
            ],
            recentBlockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
          },
          signatures: [
            'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt',
            '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG',
          ],
        },
        meta: {
          fee: 10000,
          postBalances: [499260347380, 15298080, 1, 1, 1],
          preBalances: [499260357380, 15298080, 1, 1, 1],
          status: {Ok: null},
          err: null,
        },
      },
    });

    const result =
      await connection.getConfirmedTransaction(confirmedTransaction);

    if (!result) {
      expect(result).to.be.ok;
      return;
    }

    if (result.transaction.signature === null) {
      expect(result.transaction.signature).not.to.be.null;
      return;
    }

    const resultSignature = BASE58_CODEC.decode(result.transaction.signature);
    expect(resultSignature).to.eq(confirmedTransaction);
    if (mockServer) {
      expect(result.slot).to.eq(BigInt(slot));
      expect(result.meta?.fee).to.eq(10000n);
    } else {
      expect(result.slot).to.be.a('bigint');
      expect(result.meta?.fee).to.be.a('bigint');
    }

    const newAddress = (await Keypair.generate()).publicKey;
    const recentSignature = await helpers.airdrop({
      connection,
      address: newAddress,
      amount: 1,
    });

    await mockRpcResponse({
      method: 'getTransaction',
      params: [recentSignature],
      value: null,
    });

    const nullResponse = await connection.getConfirmedTransaction(
      recentSignature,
      'finalized',
    );
    expect(nullResponse).to.be.null;
  });

  it('get transactions', async function () {
    await mockRpcResponse({
      method: 'getSlot',
      params: [],
      value: 2,
    });

    await waitForSlot.call(this, connection, 1);

    await mockRpcResponse({
      method: 'getBlock',
      params: [1, {commitment: 'confirmed'}],
      value: {
        blockHeight: 0,
        blockTime: 1614281964,
        blockhash: '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
        previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
        parentSlot: 0,
        transactions: [
          {
            meta: {
              fee: 10000,
              postBalances: [499260347380, 15298080, 1, 1, 1],
              preBalances: [499260357380, 15298080, 1, 1, 1],
              status: {Ok: null},
              err: null,
            },
            transaction: {
              message: {
                accountKeys: [
                  'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
                  '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
                  'SysvarS1otHashes111111111111111111111111111',
                  'SysvarC1ock11111111111111111111111111111111',
                  'Vote111111111111111111111111111111111111111',
                ],
                header: {
                  numReadonlySignedAccounts: 0,
                  numReadonlyUnsignedAccounts: 3,
                  numRequiredSignatures: 2,
                },
                instructions: [
                  {
                    accounts: [1, 2, 3],
                    data: '37u9WtQpcm6ULa3VtWDFAWoQc1hUvybPrA3dtx99tgHvvcE7pKRZjuGmn7VX2tC3JmYDYGG7',
                    programIdIndex: 4,
                  },
                ],
                recentBlockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
              },
              signatures: [
                'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt',
                '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG',
              ],
            },
          },
        ],
      },
    });

    // Find a block that has a transaction.
    await mockRpcResponse({
      method: 'getFirstAvailableBlock',
      params: [],
      value: 1,
    });
    let slot = Number(await connection.getFirstAvailableBlock());

    let transaction: string | undefined;
    while (!transaction) {
      const block = await connection.getBlock(slot);
      if (block && block.transactions.length > 0) {
        transaction = block.transactions[0].transaction.signatures[0];
        continue;
      }
      slot++;
    }

    await mockRpcResponse({
      method: 'getTransaction',
      params: [transaction, {commitment: 'confirmed'}],
      value: {
        slot,
        transaction: {
          message: {
            accountKeys: [
              'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
              '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
              'SysvarS1otHashes111111111111111111111111111',
              'SysvarC1ock11111111111111111111111111111111',
              'Vote111111111111111111111111111111111111111',
            ],
            header: {
              numReadonlySignedAccounts: 0,
              numReadonlyUnsignedAccounts: 3,
              numRequiredSignatures: 2,
            },
            instructions: [
              {
                accounts: [1, 2, 3],
                data: '37u9WtQpcm6ULa3VtWDFAWoQc1hUvybPrA3dtx99tgHvvcE7pKRZjuGmn7VX2tC3JmYDYGG7',
                programIdIndex: 4,
              },
            ],
            recentBlockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
          },
          signatures: [
            'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt',
            '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG',
          ],
        },
        meta: {
          fee: 10000,
          postBalances: [499260347380, 15298080, 1, 1, 1],
          preBalances: [499260357380, 15298080, 1, 1, 1],
          status: {Ok: null},
          err: null,
        },
      },
    });
    const [firstResult] = await connection.getTransactions([transaction]);
    if (firstResult == null) {
      expect.fail('Expected `getTransactions()` to return one result');
    }
    expect(firstResult.slot).to.eq(BigInt(slot));
    expect(firstResult.meta?.fee).to.eq(10000n);
    expect(firstResult.transaction.message.isAccountSigner(0)).to.be.true;
  });

  if (mockServer) {
    it('get parsed confirmed transaction coerces public keys of inner instructions', async () => {
      const confirmedTransaction: TransactionSignature =
        '4ADvAUQYxkh4qWKYE9QLW8gCLomGG94QchDLG4quvpBz1WqARYvzWQDDitKduAKspuy1DjcbnaDAnCAfnKpJYs48';

      function getMockData(inner: any) {
        return {
          slot: 353050305,
          transaction: {
            message: {
              accountKeys: [
                {
                  pubkey: 'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
                  signer: true,
                  writable: true,
                },
              ],
              instructions: [
                {
                  accounts: ['va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf'],
                  data: '37u9WtQpcm6ULa3VtWDFAWoQc1hUvybPrA3dtx99tgHvvcE7pKRZjuGmn7VX2tC3JmYDYGG7',
                  programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                },
              ],
              recentBlockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
            },
            signatures: [
              'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt',
              '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG',
            ],
          },
          meta: {
            fee: 10000,
            postBalances: [499260347380, 15298080, 1, 1, 1],
            preBalances: [499260357380, 15298080, 1, 1, 1],
            innerInstructions: [
              {
                index: 0,
                instructions: [inner],
              },
            ],
            status: {Ok: null},
            err: null,
          },
        };
      }

      await mockRpcResponse({
        method: 'getTransaction',
        params: [
          confirmedTransaction,
          {commitment: 'confirmed', encoding: 'jsonParsed'},
        ],
        value: getMockData({
          parsed: {},
          program: 'spl-token',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        }),
      });

      const result =
        await connection.getParsedConfirmedTransaction(confirmedTransaction);

      if (result && result.meta && result.meta.innerInstructions) {
        expect(result.slot).to.eq(353050305n);
        expect(result.meta.fee).to.eq(10000n);
        const innerInstructions = result.meta.innerInstructions;
        const firstIx = innerInstructions[0].instructions[0];
        expect(firstIx.programId).to.be.instanceOf(Address);
      }

      await mockRpcResponse({
        method: 'getTransaction',
        params: [
          confirmedTransaction,
          {commitment: 'confirmed', encoding: 'jsonParsed'},
        ],
        value: getMockData({
          accounts: [
            'EeJqWk5pczNjsqqY3jia9xfFNG1dD68te4s8gsdCuEk7',
            '6tVrjJhFm5SAvvdh6tysjotQurCSELpxuW3JaAAYeC1m',
          ],
          data: 'ai3535',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        }),
      });

      const result2 =
        await connection.getParsedConfirmedTransaction(confirmedTransaction);

      if (result2 && result2.meta && result2.meta.innerInstructions) {
        expect(result2.slot).to.eq(353050305n);
        expect(result2.meta.fee).to.eq(10000n);
        const innerInstructions = result2.meta.innerInstructions;
        const instruction = innerInstructions[0].instructions[0];
        expect(instruction.programId).to.be.instanceOf(Address);
        if ('accounts' in instruction) {
          expect(instruction.accounts[0]).to.be.instanceOf(Address);
          expect(instruction.accounts[1]).to.be.instanceOf(Address);
        } else {
          expect('accounts' in instruction).to.be.true;
        }
      }
    });
  }

  describe('get parsed block', function () {
    it('can deserialize a response when `transactionDetails` is `full`', async () => {
      // Mock block with transaction, fetched using `"transactionDetails": "full"`.
      await mockRpcResponse({
        method: 'getBlock',
        params: [
          1,
          {
            commitment: 'confirmed',
            encoding: 'jsonParsed',
            maxSupportedTransactionVersion: 0,
            transactionDetails: 'full',
          },
        ],
        value: {
          blockHeight: 0,
          blockTime: 1614281964,
          blockhash: '49d2UbduiZWjtR3Wvfv2t2QxmXvtZNWSPFRZxEDYAvQN',
          parentSlot: 0,
          previousBlockhash: 'mDd5yMLfuroS1JVZMHo2VZLTgKXXNBXrzPR5UkzFD4X',
          transactions: [
            {
              meta: {
                err: null,
                fee: 5000,
                innerInstructions: [],
                logMessages: [
                  'Program Vote111111111111111111111111111111111111111 invoke [1]',
                  'Program Vote111111111111111111111111111111111111111 success',
                ],
                postBalances: [3712706991, 5765419239, 1169280, 143487360, 1],
                postTokenBalances: [],
                preBalances: [3712711991, 5765419239, 1169280, 143487360, 1],
                preTokenBalances: [],
                rewards: null,
                status: {Ok: null},
              },
              transaction: {
                message: {
                  accountKeys: [
                    {
                      pubkey: '7v5fMKBqC9PuwjSdS9k9JU7efEXmq3bHTMF5fuSHnqrm',
                      signer: true,
                      source: 'transaction',
                      writable: true,
                    },
                    {
                      pubkey: 'AhcvnNdppGEcgdpK5gfcaZnAWz4ct8V4n7De5QiLiuzG',
                      signer: false,
                      source: 'transaction',
                      writable: true,
                    },
                    {
                      pubkey: 'SysvarC1ock11111111111111111111111111111111',
                      signer: false,
                      source: 'transaction',
                      writable: false,
                    },
                    {
                      pubkey: 'SysvarS1otHashes111111111111111111111111111',
                      signer: false,
                      source: 'transaction',
                      writable: false,
                    },
                    {
                      pubkey: 'Vote111111111111111111111111111111111111111',
                      signer: false,
                      source: 'transaction',
                      writable: false,
                    },
                  ],
                  addressTableLookups: null,
                  instructions: [
                    {
                      parsed: {
                        info: {
                          clockSysvar:
                            'SysvarC1ock11111111111111111111111111111111',
                          slotHashesSysvar:
                            'SysvarS1otHashes111111111111111111111111111',
                          vote: {
                            hash: '2gmQ8xMjZaXn63kr8qzPAUjQAHi7xCDjSibPdJxhVYMm',
                            slots: [164153060, 164153061],
                            timestamp: 1669845645,
                          },
                          voteAccount:
                            'AhcvnNdppGEcgdpK5gfcaZnAWz4ct8V4n7De5QiLiuzG',
                          voteAuthority:
                            '7v5fMKBqC9PuwjSdS9k9JU7efEXmq3bHTMF5fuSHnqrm',
                        },
                        type: 'vote',
                      },
                      program: 'vote',
                      programId: 'Vote111111111111111111111111111111111111111',
                    },
                  ],
                  recentBlockhash:
                    'GLqYrN6AQxCGtFTQywkPj2WN5tafC3KerBhW4QkmAyD4',
                },
                signatures: [
                  '5qDZ3nUUwp8VHFfAE5ydTQRULCoVLMGs16EprwdXsvyNCLe1NfckCkRE4BPi6wyEW9hXvG9iWU2prXfbM8SNPVEC',
                ],
              },
              version: 'legacy',
            },
          ],
        },
      });
      const fullModeBlockPromise = connection.getParsedBlock(1, {
        maxSupportedTransactionVersion: 0,
        transactionDetails: 'full',
      });
      await expect(fullModeBlockPromise).not.to.eventually.be.rejected;
    });

    it('can deserialize a response when `transactionDetails` is `none`', async () => {
      // Mock block with transaction, fetched using `"transactionDetails": "none"`.
      await mockRpcResponse({
        method: 'getBlock',
        params: [
          1,
          {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
            transactionDetails: 'none',
          },
        ],
        value: {
          blockHeight: 0,
          blockTime: 1614281964,
          blockhash: '49d2UbduiZWjtR3Wvfv2t2QxmXvtZNWSPFRZxEDYAvQN',
          parentSlot: 0,
          previousBlockhash: 'mDd5yMLfuroS1JVZMHo2VZLTgKXXNBXrzPR5UkzFD4X',
        },
      });
      const noneModeBlockPromise = connection.getParsedBlock(1, {
        maxSupportedTransactionVersion: 0,
        transactionDetails: 'none',
      });
      await expect(noneModeBlockPromise).not.to.eventually.be.rejected;
    });

    it('can deserialize a response when `transactionDetails` is `accounts`', async () => {
      // Mock block with transaction, fetched using `"transactionDetails": "accounts"`.
      await mockRpcResponse({
        method: 'getBlock',
        params: [
          1,
          {
            commitment: 'confirmed',
            encoding: 'jsonParsed',
            maxSupportedTransactionVersion: 0,
            transactionDetails: 'accounts',
          },
        ],
        value: {
          blockHeight: 0,
          blockTime: 1614281964,
          blockhash: '49d2UbduiZWjtR3Wvfv2t2QxmXvtZNWSPFRZxEDYAvQN',
          parentSlot: 0,
          previousBlockhash: 'mDd5yMLfuroS1JVZMHo2VZLTgKXXNBXrzPR5UkzFD4X',
          transactions: [
            {
              meta: {
                err: null,
                fee: 5000,
                postBalances: [18237691394, 26858640, 1169280, 143487360, 1],
                postTokenBalances: [],
                preBalances: [18237696394, 26858640, 1169280, 143487360, 1],
                preTokenBalances: [],
                status: {Ok: null},
              },
              transaction: {
                accountKeys: [
                  {
                    pubkey: '914RFshndUeZaNPjf8UWDCyo49ahQ1XQ2w9BnEMwpHKF',
                    signer: true,
                    source: 'transaction',
                    writable: true,
                  },
                  {
                    pubkey: '4cCd4SGrMswhqboYBJ5AcCVvCjh5NtaeZNwWFJzsnUWY',
                    signer: false,
                    source: 'transaction',
                    writable: true,
                  },
                  {
                    pubkey: 'SysvarC1ock11111111111111111111111111111111',
                    signer: false,
                    source: 'transaction',
                    writable: false,
                  },
                  {
                    pubkey: 'SysvarS1otHashes111111111111111111111111111',
                    signer: false,
                    source: 'transaction',
                    writable: false,
                  },
                  {
                    pubkey: 'Vote111111111111111111111111111111111111111',
                    signer: false,
                    source: 'transaction',
                    writable: false,
                  },
                ],
                signatures: [
                  '5ZDp1HfNZhNRHc75ncsiZ4sCq1fGJHMGf9u36M3foD5PMH4Xu5S4X2x7aryn4JinUdG11oSYCk7zxbNmLJzzqUft',
                ],
              },
              version: 'legacy',
            },
          ],
        },
      });
      const accountsModeBlockPromise = connection.getParsedBlock(1, {
        maxSupportedTransactionVersion: 0,
        transactionDetails: 'accounts',
      });
      await expect(accountsModeBlockPromise).not.to.eventually.be.rejected;

      const accountsModeBlock = await accountsModeBlockPromise;
      expect(accountsModeBlock).to.not.be.null;
      if (accountsModeBlock === null) {
        throw new Error('Expected parsed accounts-mode block response');
      }
      if (mockServer) {
        expect(accountsModeBlock.parentSlot).to.eq(0n);
        expect(accountsModeBlock.blockHeight).to.eq(0n);
        expect(accountsModeBlock.blockTime).to.eq(1614281964n);
      } else {
        expect(accountsModeBlock.parentSlot).to.be.a('bigint');
        expect(accountsModeBlock.blockHeight).to.satisfy(
          (blockHeight: bigint | null) =>
            blockHeight === null || typeof blockHeight === 'bigint',
        );
        expect(accountsModeBlock.blockTime).to.satisfy(
          (blockTime: bigint | null) =>
            blockTime === null || typeof blockTime === 'bigint',
        );
      }
    });

    it('can deserialize a response when `transactionDetails` is `signatures`', async () => {
      // Mock block with signatures, fetched using `"transactionDetails": "signatures"`.
      await mockRpcResponse({
        method: 'getBlock',
        params: [
          1,
          {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
            transactionDetails: 'signatures',
          },
        ],
        value: {
          blockHeight: 0,
          blockTime: 1614281964,
          blockhash: '49d2UbduiZWjtR3Wvfv2t2QxmXvtZNWSPFRZxEDYAvQN',
          parentSlot: 0,
          previousBlockhash: 'mDd5yMLfuroS1JVZMHo2VZLTgKXXNBXrzPR5UkzFD4X',
          signatures: [
            '5ZDp1HfNZhNRHc75ncsiZ4sCq1fGJHMGf9u36M3foD5PMH4Xu5S4X2x7aryn4JinUdG11oSYCk7zxbNmLJzzqUft',
          ],
        },
      });
      const signaturesModeBlock = await connection.getParsedBlock(1, {
        maxSupportedTransactionVersion: 0,
        transactionDetails: 'signatures',
      });

      expect(signaturesModeBlock).to.not.be.null;
      if (signaturesModeBlock === null) {
        throw new Error('Expected parsed signatures-mode block response');
      }
      if (mockServer) {
        expect(signaturesModeBlock.blockHeight).to.eq(0n);
        expect(signaturesModeBlock.parentSlot).to.eq(0n);
        expect(signaturesModeBlock.blockTime).to.eq(1614281964n);
        expect(signaturesModeBlock.signatures).to.eql([
          '5ZDp1HfNZhNRHc75ncsiZ4sCq1fGJHMGf9u36M3foD5PMH4Xu5S4X2x7aryn4JinUdG11oSYCk7zxbNmLJzzqUft',
        ]);
      } else {
        expect(signaturesModeBlock.blockHeight).to.satisfy(
          (blockHeight: bigint | null) =>
            blockHeight === null || blockHeight >= 0n,
        );
        expect(signaturesModeBlock.signatures).to.satisfy(
          (signatures: Array<unknown>) =>
            signatures.every(signature => typeof signature === 'string'),
        );
      }
    });
  });

  describe('get block', function () {
    beforeEach(async function () {
      await mockRpcResponse({
        method: 'getSlot',
        params: [],
        value: 1,
      });

      await waitForSlot.call(this, connection);
    });

    it('gets the genesis block', async function () {
      await mockRpcResponse({
        method: 'getBlock',
        params: [0, {commitment: 'confirmed'}],
        preserveBigIntJsonValues: true,
        value: {
          blockHeight: 0,
          blockTime: LARGE_BLOCK_TIME,
          blockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          parentSlot: 0,
          transactions: [],
        },
      });

      let maybeBlock0: BlockResponse | null;
      try {
        maybeBlock0 = await connection.getBlock(0);
      } catch (e) {
        if (process.env.TEST_LIVE) {
          console.warn(
            'WARNING: We ran no assertions about the genesis block because block 0 ' +
              'could not be found. See https://github.com/solana-labs/solana/issues/23853.',
          );
          this.skip();
        } else {
          throw e;
        }
      }
      expect(maybeBlock0).not.to.be.null;
      const block0 = maybeBlock0!;

      // Block 0 never has any transactions in test validator
      const blockhash0 = block0.blockhash;
      expect(block0.transactions).to.have.length(0);
      expect(blockhash0).not.to.be.null;
      expect(block0.previousBlockhash).not.to.be.null;
      expect(block0.parentSlot).to.eq(0n);
      expect(block0.blockHeight).to.eq(0n);
      if (process.env.TEST_LIVE) {
        expect(typeof block0.blockTime).to.eq('bigint');
      } else {
        expect(block0.blockTime).to.eq(LARGE_BLOCK_TIME);
      }
    });

    it('accepts bigint slots', async function () {
      let slot = 1n;
      if (mockServer) {
        await mockRpcResponse({
          method: 'getBlock',
          params: [1, {commitment: 'confirmed'}],
          value: {
            blockHeight: 1,
            blockTime: 1614281965,
            blockhash: '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
            previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
            parentSlot: 0,
            transactions: [],
          },
        });
      } else {
        slot = await connection.getFirstAvailableBlock();
      }

      const block = await connection.getBlock(slot);
      expect(block).not.to.be.null;
      if (mockServer) {
        expect(block?.parentSlot).to.eq(0n);
        expect(block?.blockHeight).to.eq(1n);
      } else {
        expect(block?.parentSlot).to.be.a('bigint');
        expect(block?.blockHeight).to.satisfy(
          (blockHeight: bigint | null) =>
            blockHeight === null || typeof blockHeight === 'bigint',
        );
      }
    });

    it('gets a block having a parent', async function () {
      // Mock parent of block with transaction.
      await mockRpcResponse({
        method: 'getBlock',
        params: [0, {commitment: 'confirmed'}],
        value: {
          blockHeight: 0,
          blockTime: 1614281964,
          blockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          parentSlot: 0,
          transactions: [],
        },
      });
      // Mock block with transaction.
      await mockRpcResponse({
        method: 'getBlock',
        params: [1, {commitment: 'confirmed'}],
        value: {
          blockHeight: 0,
          blockTime: 1614281964,
          blockhash: '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
          previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          parentSlot: 0,
          transactions: [
            {
              meta: {
                fee: 10000,
                postBalances: [499260347380, 15298080, 1, 1, 1],
                preBalances: [499260357380, 15298080, 1, 1, 1],
                status: {Ok: null},
                err: null,
              },
              transaction: {
                message: {
                  accountKeys: [
                    'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
                    '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
                    'SysvarS1otHashes111111111111111111111111111',
                    'SysvarC1ock11111111111111111111111111111111',
                    'Vote111111111111111111111111111111111111111',
                  ],
                  header: {
                    numReadonlySignedAccounts: 0,
                    numReadonlyUnsignedAccounts: 3,
                    numRequiredSignatures: 2,
                  },
                  instructions: [
                    {
                      accounts: [1, 2, 3],
                      data: '37u9WtQpcm6ULa3VtWDFAWoQc1hUvybPrA3dtx99tgHvvcE7pKRZjuGmn7VX2tC3JmYDYGG7',
                      programIdIndex: 4,
                    },
                  ],
                  recentBlockhash:
                    'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
                },
                signatures: [
                  'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt',
                  '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG',
                ],
              },
            },
          ],
        },
      });

      // Find a block that has a transaction *and* a parent.
      await mockRpcResponse({
        method: 'getFirstAvailableBlock',
        params: [],
        value: 0,
      });
      let candidateSlot = Number(await connection.getFirstAvailableBlock()) + 1;
      let result:
        | {
            blockWithTransaction: BlockResponse;
            parentBlock: BlockResponse;
          }
        | undefined;
      while (!result) {
        const candidateBlock = await connection.getBlock(candidateSlot);
        if (candidateBlock && candidateBlock.transactions.length) {
          const parentBlock = await connection.getBlock(candidateSlot - 1);
          if (parentBlock) {
            result = {blockWithTransaction: candidateBlock, parentBlock};
            break;
          }
        }
        candidateSlot++;
      }

      // Compare data with parent
      expect(result.blockWithTransaction.previousBlockhash).to.eq(
        result.parentBlock.blockhash,
      );
      expect(result.blockWithTransaction.blockhash).not.to.be.null;
      expect(result.blockWithTransaction.transactions[0].transaction).not.to.be
        .null;
      expect(typeof result.blockWithTransaction.parentSlot).to.eq('bigint');
      expect(typeof result.blockWithTransaction.blockHeight).to.eq('bigint');
      expect(typeof result.blockWithTransaction.blockTime).to.eq('bigint');

      await mockRpcResponse({
        method: 'getBlock',
        params: [Number.MAX_SAFE_INTEGER, {commitment: 'confirmed'}],
        error: {
          message: `Block not available for slot ${Number.MAX_SAFE_INTEGER}`,
        },
      });
      await expect(
        connection.getBlock(Number.MAX_SAFE_INTEGER),
      ).to.be.rejectedWith(
        `Block not available for slot ${Number.MAX_SAFE_INTEGER}`,
      );
    });

    it('can deserialize a response when `transactionDetails` is `full`', async () => {
      // Mock block with transaction, fetched using `"transactionDetails": "full"`.
      await mockRpcResponse({
        method: 'getBlock',
        params: [
          1,
          {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
            transactionDetails: 'full',
          },
        ],
        value: {
          blockHeight: 0,
          blockTime: 1614281964,
          blockhash: '49d2UbduiZWjtR3Wvfv2t2QxmXvtZNWSPFRZxEDYAvQN',
          parentSlot: 0,
          previousBlockhash: 'mDd5yMLfuroS1JVZMHo2VZLTgKXXNBXrzPR5UkzFD4X',
          transactions: [
            {
              meta: {
                err: null,
                fee: 5000,
                innerInstructions: [],
                loadedAddresses: {readonly: [], writable: []},
                logMessages: [
                  'Program Vote111111111111111111111111111111111111111 invoke [1]',
                  'Program Vote111111111111111111111111111111111111111 success',
                ],
                postBalances: [12278161908, 39995373, 1169280, 143487360, 1],
                postTokenBalances: [],
                preBalances: [12278166908, 39995373, 1169280, 143487360, 1],
                preTokenBalances: [],
                rewards: null,
                status: {Ok: null},
              },
              transaction: {
                message: {
                  accountKeys: [
                    'FTWuJ2tqjecNizCSE66z4BD1tBHomG6DVffGUwRuWUkM',
                    'H2z3pBT62ByS4jpqsiEMtgN3NUFEuZHiTvoKCFjqCtD6',
                    'SysvarC1ock11111111111111111111111111111111',
                    'SysvarS1otHashes111111111111111111111111111',
                    'Vote111111111111111111111111111111111111111',
                  ],
                  header: {
                    numReadonlySignedAccounts: 0,
                    numReadonlyUnsignedAccounts: 3,
                    numRequiredSignatures: 1,
                  },
                  instructions: [
                    {
                      accounts: [1, 3, 2, 0],
                      data: '29z5mr1JoRmJYQ6zG7p2F3mu68pWTNw9q49Tu7KrSEgoS6Jh1LMPGUK3HXs1N3Dody3icCcXxu6xPYoXLWnUTafEGm3knK',
                      programIdIndex: 4,
                    },
                  ],
                  recentBlockhash:
                    'GLqYrN6AQxCGtFTQywkPj2WN5tafC3KerBhW4QkmAyD4',
                },
                signatures: [
                  '4SZofEnXEVzCYvzk16z6ScR6F3iNtZ3FsCC1PEWegpzvGwTJR6x9cDi8VHRmCFGC5XFs2yEFms3j36Mj7XVyHXbb',
                ],
              },
              version: 'legacy',
            },
          ],
        },
      });
      await expect(
        connection.getBlock(1, {
          maxSupportedTransactionVersion: 0,
          transactionDetails: 'full',
        }),
      ).not.to.eventually.be.rejected;
    });

    it('can deserialize a response when `transactionDetails` is `none`', async () => {
      // Mock block with transaction, fetched using `"transactionDetails": "none"`.
      await mockRpcResponse({
        method: 'getBlock',
        params: [
          1,
          {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
            transactionDetails: 'none',
          },
        ],
        value: {
          blockHeight: 0,
          blockTime: 1614281964,
          blockhash: '49d2UbduiZWjtR3Wvfv2t2QxmXvtZNWSPFRZxEDYAvQN',
          parentSlot: 0,
          previousBlockhash: 'mDd5yMLfuroS1JVZMHo2VZLTgKXXNBXrzPR5UkzFD4X',
        },
      });
      await expect(
        connection.getBlock(1, {
          maxSupportedTransactionVersion: 0,
          transactionDetails: 'none',
        }),
      ).not.to.eventually.be.rejected;
    });

    it('can deserialize a response when `transactionDetails` is `accounts`', async () => {
      // Mock block with transaction, fetched using `"transactionDetails": "accounts"`.
      await mockRpcResponse({
        method: 'getBlock',
        params: [
          1,
          {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
            transactionDetails: 'accounts',
          },
        ],
        value: {
          blockHeight: 0,
          blockTime: 1614281964,
          blockhash: '49d2UbduiZWjtR3Wvfv2t2QxmXvtZNWSPFRZxEDYAvQN',
          parentSlot: 0,
          previousBlockhash: 'mDd5yMLfuroS1JVZMHo2VZLTgKXXNBXrzPR5UkzFD4X',
          transactions: [
            {
              meta: {
                err: null,
                fee: 5000,
                postBalances: [2751549948, 11751747405, 1169280, 143487360, 1],
                postTokenBalances: [],
                preBalances: [2751554948, 11751747405, 1169280, 143487360, 1],
                preTokenBalances: [],
                status: {Ok: null},
              },
              transaction: {
                accountKeys: [
                  {
                    pubkey: 'D7hwgGRTr1vaCxzmfEKCaf56SPgBJmjHh6UXHG3p12bB',
                    signer: true,
                    source: 'transaction',
                    writable: true,
                  },
                  {
                    pubkey: '8iLE53Y9k4sccy4gxrT936BHbhYS6J13kQT5vRXhXFMX',
                    signer: false,
                    source: 'transaction',
                    writable: true,
                  },
                  {
                    pubkey: 'SysvarC1ock11111111111111111111111111111111',
                    signer: false,
                    source: 'transaction',
                    writable: false,
                  },
                  {
                    pubkey: 'SysvarS1otHashes111111111111111111111111111',
                    signer: false,
                    source: 'transaction',
                    writable: false,
                  },
                  {
                    pubkey: 'Vote111111111111111111111111111111111111111',
                    signer: false,
                    source: 'transaction',
                    writable: false,
                  },
                ],
                signatures: [
                  'uNKj2ogn8ZRRjyVWXLC7sLRWpKQyMUomm66RXoDuWLXikPSJN8C7ZZK95j8S2bzcjwH6MvrXKSHtCWEURPpEXMB',
                ],
              },
              version: 'legacy',
            },
          ],
        },
      });
      await expect(
        connection.getBlock(1, {
          maxSupportedTransactionVersion: 0,
          transactionDetails: 'accounts',
        }),
      ).not.to.eventually.be.rejected;
    });

    it('can deserialize a response when `transactionDetails` is `signatures`', async () => {
      // Mock block with signatures, fetched using `"transactionDetails": "signatures"`.
      await mockRpcResponse({
        method: 'getBlock',
        params: [
          1,
          {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
            transactionDetails: 'signatures',
          },
        ],
        value: {
          blockHeight: 0,
          blockTime: 1614281964,
          blockhash: '49d2UbduiZWjtR3Wvfv2t2QxmXvtZNWSPFRZxEDYAvQN',
          parentSlot: 0,
          previousBlockhash: 'mDd5yMLfuroS1JVZMHo2VZLTgKXXNBXrzPR5UkzFD4X',
          signatures: [
            'uNKj2ogn8ZRRjyVWXLC7sLRWpKQyMUomm66RXoDuWLXikPSJN8C7ZZK95j8S2bzcjwH6MvrXKSHtCWEURPpEXMB',
          ],
        },
      });
      const signaturesModeBlock = await connection.getBlock(1, {
        maxSupportedTransactionVersion: 0,
        transactionDetails: 'signatures',
      });

      expect(signaturesModeBlock).to.not.be.null;
      if (signaturesModeBlock === null) {
        throw new Error('Expected signatures-mode block response');
      }
      if (mockServer) {
        expect(signaturesModeBlock.blockHeight).to.eq(0n);
        expect(signaturesModeBlock.parentSlot).to.eq(0n);
        expect(signaturesModeBlock.blockTime).to.eq(1614281964n);
        expect(signaturesModeBlock.signatures).to.eql([
          'uNKj2ogn8ZRRjyVWXLC7sLRWpKQyMUomm66RXoDuWLXikPSJN8C7ZZK95j8S2bzcjwH6MvrXKSHtCWEURPpEXMB',
        ]);
      } else {
        expect(signaturesModeBlock.blockHeight).to.satisfy(
          (blockHeight: bigint | null) =>
            blockHeight === null || blockHeight >= 0n,
        );
        expect(signaturesModeBlock.signatures).to.satisfy(
          (signatures: Array<unknown>) =>
            signatures.every(signature => typeof signature === 'string'),
        );
      }
    });
  });

  describe('get confirmed block', function () {
    beforeEach(async function () {
      await mockRpcResponse({
        method: 'getSlot',
        params: [],
        value: 1,
      });

      await waitForSlot.call(this, connection);
    });

    it('gets the genesis block', async function () {
      await mockRpcResponse({
        method: 'getBlock',
        params: [0, {commitment: 'confirmed'}],
        preserveBigIntJsonValues: true,
        value: {
          blockHeight: 0,
          blockTime: LARGE_BLOCK_TIME,
          blockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          parentSlot: 0,
          transactions: [],
        },
      });

      let block0: ConfirmedBlock;
      try {
        block0 = await connection.getConfirmedBlock(0);
      } catch (e) {
        if (process.env.TEST_LIVE) {
          console.warn(
            'WARNING: We ran no assertions about the genesis block because block 0 ' +
              'could not be found. See https://github.com/solana-labs/solana/issues/23853.',
          );
          this.skip();
        } else {
          throw e;
        }
      }

      // Block 0 never has any transactions in test validator
      const blockhash0 = block0.blockhash;
      expect(block0.transactions).to.have.length(0);
      expect(blockhash0).not.to.be.null;
      expect(block0.previousBlockhash).not.to.be.null;
      expect(block0.parentSlot).to.eq(0n);
      if (process.env.TEST_LIVE) {
        expect(typeof block0.blockTime).to.eq('bigint');
      } else {
        expect(block0.blockTime).to.eq(LARGE_BLOCK_TIME);
      }
    });

    it('gets a block having a parent', async function () {
      // Mock parent of block with transaction.
      await mockRpcResponse({
        method: 'getBlock',
        params: [0, {commitment: 'confirmed'}],
        value: {
          blockHeight: 0,
          blockTime: 1614281964,
          blockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          parentSlot: 0,
          transactions: [],
        },
      });
      // Mock block with transaction.
      await mockRpcResponse({
        method: 'getBlock',
        params: [1, {commitment: 'confirmed'}],
        value: {
          blockTime: 1614281964,
          blockhash: '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
          previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          parentSlot: 0,
          transactions: [
            {
              meta: {
                fee: 10000,
                postBalances: [499260347380, 15298080, 1, 1, 1],
                preBalances: [499260357380, 15298080, 1, 1, 1],
                status: {Ok: null},
                err: null,
              },
              transaction: {
                message: {
                  accountKeys: [
                    'va12u4o9DipLEB2z4fuoHszroq1U9NcAB9aooFDPJSf',
                    '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
                    'SysvarS1otHashes111111111111111111111111111',
                    'SysvarC1ock11111111111111111111111111111111',
                    'Vote111111111111111111111111111111111111111',
                  ],
                  header: {
                    numReadonlySignedAccounts: 0,
                    numReadonlyUnsignedAccounts: 3,
                    numRequiredSignatures: 2,
                  },
                  instructions: [
                    {
                      accounts: [1, 2, 3],
                      data: '37u9WtQpcm6ULa3VtWDFAWoQc1hUvybPrA3dtx99tgHvvcE7pKRZjuGmn7VX2tC3JmYDYGG7',
                      programIdIndex: 4,
                    },
                  ],
                  recentBlockhash:
                    'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
                },
                signatures: [
                  'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt',
                  '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG',
                ],
              },
            },
          ],
        },
      });

      // Find a block that has a transaction *and* a parent.
      await mockRpcResponse({
        method: 'getFirstAvailableBlock',
        params: [],
        value: 0,
      });
      let candidateSlot = Number(await connection.getFirstAvailableBlock()) + 1;
      let result:
        | {
            blockWithTransaction: ConfirmedBlock;
            parentBlock: ConfirmedBlock;
          }
        | undefined;
      while (!result) {
        const candidateBlock =
          await connection.getConfirmedBlock(candidateSlot);
        if (candidateBlock && candidateBlock.transactions.length) {
          const parentBlock = await connection.getConfirmedBlock(
            candidateSlot - 1,
          );
          if (parentBlock) {
            result = {blockWithTransaction: candidateBlock, parentBlock};
            break;
          }
        }
        candidateSlot++;
      }

      // Compare data with parent
      expect(result.blockWithTransaction.previousBlockhash).to.eq(
        result.parentBlock.blockhash,
      );
      expect(result.blockWithTransaction.blockhash).not.to.be.null;
      expect(result.blockWithTransaction.transactions[0].transaction).not.to.be
        .null;

      await mockRpcResponse({
        method: 'getBlock',
        params: [Number.MAX_SAFE_INTEGER, {commitment: 'confirmed'}],
        error: {
          message: `Block not available for slot ${Number.MAX_SAFE_INTEGER}`,
        },
      });
      await expect(
        connection.getConfirmedBlock(Number.MAX_SAFE_INTEGER),
      ).to.be.rejectedWith(
        `Block not available for slot ${Number.MAX_SAFE_INTEGER}`,
      );
    });
  });

  it('get blocks between two slots', async function () {
    await mockRpcResponse({
      method: 'getBlocks',
      params: [0, 9, {commitment: 'confirmed'}],
      value: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    });
    await mockRpcResponse({
      method: 'getFirstAvailableBlock',
      params: [],
      value: 0,
    });
    await mockRpcResponse({
      method: 'getSlot',
      params: [],
      value: 9,
    });

    await waitForSlot.call(this, connection, 1);

    const [startSlot, latestSlot] = await Promise.all([
      connection.getFirstAvailableBlock().then(Number),
      connection.getSlot().then(Number),
    ]);
    const blocks = await connection.getBlocks(startSlot, latestSlot);
    expect(blocks).to.have.length(latestSlot - startSlot + 1);
    expect(Number(blocks[0])).to.eq(startSlot);
    expect(blocks.map(Number)).to.contain(latestSlot);
  });

  it('get blocks from starting slot', async function () {
    await mockRpcResponse({
      method: 'getBlocks',
      params: [0, null, {commitment: 'confirmed'}],
      value: [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37,
        38, 39, 40, 41, 42,
      ],
    });
    await mockRpcResponse({
      method: 'getFirstAvailableBlock',
      params: [],
      value: 0,
    });
    await mockRpcResponse({
      method: 'getSlot',
      params: [],
      value: 20,
    });

    await waitForSlot.call(this, connection, 1);

    const startSlot = Number(await connection.getFirstAvailableBlock());
    const [blocks, latestSlot] = await Promise.all([
      connection.getBlocks(startSlot),
      connection.getSlot().then(Number),
    ]);
    if (mockServer) {
      expect(blocks).to.have.length(43);
    } else {
      expect(blocks).to.have.length(latestSlot - startSlot + 1);
    }
    expect(Number(blocks[0])).to.eq(startSlot);
    expect(blocks.map(Number)).to.contain(latestSlot);
  });

  it('get blocks with config object', async () => {
    if (mockServer) {
      await mockRpcResponse({
        method: 'getBlocks',
        params: [5, null, {commitment: 'confirmed'}],
        value: [5, 6, 7],
      });

      await mockRpcResponse({
        method: 'getBlocks',
        params: [5, 8, {commitment: 'confirmed'}],
        value: [5, 6, 7, 8],
      });

      const blocksFromStart = await connection.getBlocks(5, {
        commitment: 'confirmed',
      });
      const blocksWithEnd = await connection.getBlocks(5, 8, {
        commitment: 'confirmed',
      });

      expect(blocksFromStart).to.deep.equal([5n, 6n, 7n]);
      expect(blocksWithEnd).to.deep.equal([5n, 6n, 7n, 8n]);
    } else {
      const startSlot = Number(await connection.getFirstAvailableBlock());
      const latestSlot = Number(await connection.getSlot('confirmed'));
      const endSlot = Math.min(startSlot + 2, latestSlot);

      const blocksFromStart = await connection.getBlocks(startSlot, {
        commitment: 'confirmed',
      });
      const blocksWithEnd = await connection.getBlocks(startSlot, endSlot, {
        commitment: 'confirmed',
      });

      expect(Number(blocksFromStart[0])).to.eq(startSlot);
      expect(Number(blocksWithEnd[0])).to.eq(startSlot);
      expect(Number(blocksWithEnd[blocksWithEnd.length - 1])).to.eq(endSlot);
    }
  });

  it('get blocks accepts bigint slots', async () => {
    if (mockServer) {
      await mockRpcResponse({
        method: 'getBlocks',
        params: [5, 8, {commitment: 'confirmed'}],
        value: [5, 6, 7, 8],
      });

      const blocks = await connection.getBlocks(5n, 8n, {
        commitment: 'confirmed',
      });

      expect(blocks).to.deep.equal([5n, 6n, 7n, 8n]);
    } else {
      const startSlot = await connection.getFirstAvailableBlock();
      const latestSlot = await connection.getSlot('confirmed');
      const endSlot =
        startSlot + 2n <= latestSlot ? startSlot + 2n : latestSlot;

      const blocks = await connection.getBlocks(startSlot, endSlot, {
        commitment: 'confirmed',
      });

      expect(blocks[0]).to.eq(startSlot);
      expect(blocks[blocks.length - 1]).to.eq(endSlot);
    }
  });

  it('get blocks with limit', async () => {
    await mockRpcResponse({
      method: 'getBlocksWithLimit',
      params: [5, 3, {commitment: 'confirmed'}],
      value: [5, 6, 7],
    });

    const blocks = await connection.getBlocksWithLimit(5, 3, 'confirmed');
    expect(blocks).to.deep.equal([5n, 6n, 7n]);
  });

  it('get blocks with limit using config object', async () => {
    await mockRpcResponse({
      method: 'getBlocksWithLimit',
      params: [5, 3, {commitment: 'confirmed'}],
      value: [5, 6, 7],
    });

    const blocks = await connection.getBlocksWithLimit(5, 3, {
      commitment: 'confirmed',
    });
    expect(blocks).to.deep.equal([5n, 6n, 7n]);
  });

  it('get blocks with limit accepts bigint start slots', async () => {
    if (mockServer) {
      await mockRpcResponse({
        method: 'getBlocksWithLimit',
        params: [5, 3, {commitment: 'confirmed'}],
        value: [5, 6, 7],
      });

      const blocks = await connection.getBlocksWithLimit(5n, 3, {
        commitment: 'confirmed',
      });

      expect(blocks).to.deep.equal([5n, 6n, 7n]);
    } else {
      const startSlot = await connection.getFirstAvailableBlock();
      const blocks = await connection.getBlocksWithLimit(startSlot, 3, {
        commitment: 'confirmed',
      });

      expect(blocks[0]).to.eq(startSlot);
      expect(blocks).to.have.length.at.most(3);
    }
  });

  it('get block commitment', async () => {
    if (mockServer) {
      await mockRpcResponse({
        method: 'getBlockCommitment',
        params: [42],
        value: {
          commitment: [10, 9, 8],
          totalStake: 27,
        },
      });

      const blockCommitment = await connection.getBlockCommitment(42);
      expect(blockCommitment.commitment).to.deep.equal([10n, 9n, 8n]);
      expect(blockCommitment.totalStake).to.eq(27n);
    } else {
      const latestSlot = await connection.getSlot('confirmed');
      const blockCommitment = await connection.getBlockCommitment(latestSlot);
      if (blockCommitment.commitment !== null) {
        expect(Array.isArray(blockCommitment.commitment)).to.be.true;
        expect(typeof blockCommitment.commitment[0]).to.eq('bigint');
      }
      expect(blockCommitment.totalStake > 0n).to.eq(true);
    }
  });

  describe('get block signatures', function () {
    beforeEach(async function () {
      await mockRpcResponse({
        method: 'getSlot',
        params: [],
        value: 1,
      });

      await waitForSlot.call(this, connection);
    });

    it('gets the genesis block', async function () {
      await mockRpcResponse({
        method: 'getBlock',
        params: [
          0,
          {
            commitment: 'confirmed',
            transactionDetails: 'signatures',
            rewards: false,
          },
        ],
        preserveBigIntJsonValues: true,
        value: {
          blockHeight: 0,
          blockTime: LARGE_BLOCK_TIME,
          blockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          parentSlot: 0,
          signatures: [],
        },
      });

      let block0: BlockSignatures;
      try {
        block0 = await connection.getBlockSignatures(0);
      } catch (e) {
        if (process.env.TEST_LIVE) {
          console.warn(
            'WARNING: We ran no assertions about the genesis block because block 0 ' +
              'could not be found. See https://github.com/solana-labs/solana/issues/23853.',
          );
          this.skip();
        } else {
          throw e;
        }
      }

      // Block 0 never has any transactions in test validator
      const blockhash0 = block0.blockhash;
      expect(block0.signatures).to.have.length(0);
      expect(blockhash0).not.to.be.null;
      expect(block0.previousBlockhash).not.to.be.null;
      expect(block0.parentSlot).to.eq(0n);
      expect(block0.blockHeight).to.eq(0n);
      if (process.env.TEST_LIVE) {
        expect(typeof block0.blockTime).to.eq('bigint');
      } else {
        expect(block0.blockTime).to.eq(LARGE_BLOCK_TIME);
      }
      expect(block0).to.not.have.property('rewards');
    });

    it('gets the genesis block via the deprecated alias', async function () {
      await mockRpcResponse({
        method: 'getBlock',
        params: [
          0,
          {
            commitment: 'confirmed',
            transactionDetails: 'signatures',
            rewards: false,
          },
        ],
        preserveBigIntJsonValues: true,
        value: {
          blockHeight: 0,
          blockTime: LARGE_BLOCK_TIME,
          blockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          parentSlot: 0,
          signatures: [],
        },
      });

      const block0 = await connection.getConfirmedBlockSignatures(0);
      expect(block0.parentSlot).to.eq(0n);
      expect(block0.blockHeight).to.eq(0n);
      if (process.env.TEST_LIVE) {
        expect(typeof block0.blockTime).to.eq('bigint');
      } else {
        expect(block0.blockTime).to.eq(LARGE_BLOCK_TIME);
      }
      expect(block0.signatures).to.have.length(0);
    });

    it('gets a block having a parent', async function () {
      // Mock parent of block with transaction.
      await mockRpcResponse({
        method: 'getBlock',
        params: [
          0,
          {
            commitment: 'confirmed',
            transactionDetails: 'signatures',
            rewards: false,
          },
        ],
        value: {
          blockHeight: 0,
          blockTime: 1614281964,
          blockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          parentSlot: 0,
          signatures: [],
        },
      });
      // Mock block with transaction.
      await mockRpcResponse({
        method: 'getBlock',
        params: [
          1,
          {
            commitment: 'confirmed',
            transactionDetails: 'signatures',
            rewards: false,
          },
        ],
        value: {
          blockHeight: 1,
          blockTime: 1614281964,
          blockhash: '57zQNBZBEiHsCZFqsaY6h176ioXy5MsSLmcvHkEyaLGy',
          previousBlockhash: 'H5nJ91eGag3B5ZSRHZ7zG5ZwXJ6ywCt2hyR8xCsV7xMo',
          parentSlot: 0,
          signatures: [
            'w2Zeq8YkpyB463DttvfzARD7k9ZxGEwbsEw4boEK7jDp3pfoxZbTdLFSsEPhzXhpCcjGi2kHtHFobgX49MMhbWt',
            '4oCEqwGrMdBeMxpzuWiukCYqSfV4DsSKXSiVVCh1iJ6pS772X7y219JZP3mgqBz5PhsvprpKyhzChjYc3VSBQXzG',
          ],
        },
      });

      // Find a block that has a transaction *and* a parent.
      await mockRpcResponse({
        method: 'getFirstAvailableBlock',
        params: [],
        value: 0,
      });
      let candidateSlot = Number(await connection.getFirstAvailableBlock()) + 1;
      let result:
        | {
            blockWithTransaction: BlockSignatures;
            parentBlock: BlockSignatures;
          }
        | undefined;
      while (!result) {
        const candidateBlock =
          await connection.getBlockSignatures(candidateSlot);
        if (candidateBlock && candidateBlock.signatures.length) {
          const parentBlock = await connection.getBlockSignatures(
            candidateSlot - 1,
          );
          if (parentBlock) {
            result = {blockWithTransaction: candidateBlock, parentBlock};
            break;
          }
        }
        candidateSlot++;
      }

      // Compare data with parent
      expect(result.blockWithTransaction.previousBlockhash).to.eq(
        result.parentBlock.blockhash,
      );
      expect(result.blockWithTransaction.blockhash).not.to.be.null;
      expect(result.blockWithTransaction.signatures[0]).not.to.be.null;
      expect(typeof result.blockWithTransaction.parentSlot).to.eq('bigint');
      expect(typeof result.blockWithTransaction.blockHeight).to.eq('bigint');
      expect(typeof result.blockWithTransaction.blockTime).to.eq('bigint');
      expect(result.blockWithTransaction).to.not.have.property('rewards');

      await mockRpcResponse({
        method: 'getBlock',
        params: [
          Number.MAX_SAFE_INTEGER,
          {
            commitment: 'confirmed',
            transactionDetails: 'signatures',
            rewards: false,
          },
        ],
        error: {
          message: `Block not available for slot ${Number.MAX_SAFE_INTEGER}`,
        },
      });
      await expect(
        connection.getBlockSignatures(Number.MAX_SAFE_INTEGER),
      ).to.be.rejectedWith(
        `Block not available for slot ${Number.MAX_SAFE_INTEGER}`,
      );
    });
  });

  it('get latest blockhash', async () => {
    const commitments: Commitment[] = ['processed', 'confirmed', 'finalized'];
    for (const commitment of commitments) {
      const {blockhash, lastValidBlockHeight} = await helpers.latestBlockhash({
        connection,
        commitment,
      });
      expect(BASE58_CODEC.encode(blockhash)).to.have.length(32);
      expect(typeof lastValidBlockHeight).to.eq('bigint');
      expect(lastValidBlockHeight >= 0n).to.eq(true);
    }
  });

  if (mockServer) {
    it('get latest blockhash and context preserves the Kit bigint shape', async () => {
      const blockhash = 'FDeS2dHPUQgAsLZpExG7WUFiMHRcVGgUAeiJr8rfXR1K';

      await mockRpcResponse({
        method: 'getLatestBlockhash',
        params: [{commitment: 'confirmed', minContextSlot: 123}],
        value: {
          blockhash,
          lastValidBlockHeight: 456,
        },
        slot: 37,
        withContext: true,
      });

      const latestBlockhashResponse =
        await connection.getLatestBlockhashAndContext({
          commitment: 'confirmed',
          minContextSlot: 123,
        });

      expect(latestBlockhashResponse.context.slot).to.eq(37n);
      expect(typeof latestBlockhashResponse.context.slot).to.eq('bigint');
      expect(latestBlockhashResponse.value).to.eql({
        blockhash,
        lastValidBlockHeight: 456n,
      });
      expect(typeof latestBlockhashResponse.value.lastValidBlockHeight).to.eq(
        'bigint',
      );
    });
  }

  it('is blockhash valid', async () => {
    const validatedBlockhash = blockhash(
      'FDeS2dHPUQgAsLZpExG7WUFiMHRcVGgUAeiJr8rfXR1K',
    );
    if (mockServer) {
      for (const isBlockhashValid of [true, false]) {
        await mockRpcResponse({
          method: 'isBlockhashValid',
          params: [validatedBlockhash, {commitment: 'confirmed'}],
          value: isBlockhashValid,
          slot: 37,
          withContext: true,
        });

        const isBlockhashValidRpcResult = await connection.isBlockhashValid(
          validatedBlockhash,
          {commitment: 'confirmed'},
        );

        expect(isBlockhashValidRpcResult.context.slot).to.eq(37n);
        expect(isBlockhashValidRpcResult.value).to.eq(isBlockhashValid);
      }
      return;
    }

    const isBlockhashValidRpcResult = await connection.isBlockhashValid(
      validatedBlockhash,
      {commitment: 'confirmed'},
    );

    expect(typeof isBlockhashValidRpcResult.context.slot).to.eq('bigint');
    expect(isBlockhashValidRpcResult.context.slot > 0n).to.eq(true);
    expect(isBlockhashValidRpcResult.value).to.eq(false);
  });

  it('get fee for message (legacy)', async () => {
    const accountFrom = await Keypair.generate();
    const accountTo = await Keypair.generate();

    const latestBlockhash = await helpers.latestBlockhash({connection});

    const transaction = new Transaction({
      feePayer: accountFrom.publicKey,
      ...latestBlockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: accountFrom.publicKey,
        toPubkey: accountTo.publicKey,
        lamports: 10,
      }),
    );
    const message = transaction.compileMessage();

    await mockRpcResponse({
      method: 'getFeeForMessage',
      params: [
        Buffer.from(message.serialize()).toString('base64'),
        {commitment: 'confirmed'},
      ],
      value: 5000,
      withContext: true,
    });

    const feeResponse = await connection.getFeeForMessage(message, 'confirmed');

    if (mockServer) {
      expect(feeResponse.context.slot).to.eq(11n);
      expect(feeResponse.value).to.eq(5000n);
    } else {
      expect(typeof feeResponse.context.slot).to.eq('bigint');
      expect(feeResponse.value).not.to.eq(null);
      expect(typeof feeResponse.value).to.eq('bigint');
    }
  });

  it('get fee for message with config object', async () => {
    const accountFrom = await Keypair.generate();
    const accountTo = await Keypair.generate();

    const latestBlockhash = await helpers.latestBlockhash({connection});

    const transaction = new Transaction({
      feePayer: accountFrom.publicKey,
      ...latestBlockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: accountFrom.publicKey,
        toPubkey: accountTo.publicKey,
        lamports: 10,
      }),
    );
    const message = transaction.compileMessage();

    if (mockServer) {
      await mockRpcResponse({
        method: 'getFeeForMessage',
        params: [
          Buffer.from(message.serialize()).toString('base64'),
          {commitment: 'confirmed', minContextSlot: 123},
        ],
        value: 5000,
        withContext: true,
      });

      const feeResponse = await connection.getFeeForMessage(message, {
        commitment: 'confirmed',
        minContextSlot: 123n,
      });
      expect(feeResponse.context.slot).to.eq(11n);
      expect(feeResponse.value).to.eq(5000n);
    } else {
      const currentSlot = await connection.getSlot('confirmed');
      const feeResponse = await connection.getFeeForMessage(message, {
        commitment: 'confirmed',
        minContextSlot: currentSlot,
      });
      expect(typeof feeResponse.context.slot).to.eq('bigint');
      expect(feeResponse.value).not.to.eq(null);
      expect(typeof feeResponse.value).to.eq('bigint');
      expect(feeResponse.value! > 0n).to.be.true;
    }
  });

  it('get fee for message (v0)', async () => {
    const accountFrom = await Keypair.generate();
    const accountTo = await Keypair.generate();

    const recentBlockhash = (await helpers.latestBlockhash({connection}))
      .blockhash;
    const instructions = [
      SystemProgram.transfer({
        fromPubkey: accountFrom.publicKey,
        toPubkey: accountTo.publicKey,
        lamports: 10,
      }),
    ];

    const messageV0 = new TransactionMessage({
      payerKey: accountFrom.publicKey,
      recentBlockhash,
      instructions,
    }).compileToV0Message();

    await mockRpcResponse({
      method: 'getFeeForMessage',
      params: [
        Buffer.from(messageV0.serialize()).toString('base64'),
        {commitment: 'confirmed'},
      ],
      value: 5000,
      withContext: true,
    });

    const feeResponse = await connection.getFeeForMessage(
      messageV0,
      'confirmed',
    );

    if (mockServer) {
      expect(feeResponse.context.slot).to.eq(11n);
      expect(feeResponse.value).to.eq(5000n);
    } else {
      expect(typeof feeResponse.context.slot).to.eq('bigint');
      expect(feeResponse.value).not.to.eq(null);
      expect(typeof feeResponse.value).to.eq('bigint');
    }
  });

  it('get recent prioritization fee', async () => {
    const pubkey = (await Keypair.generate()).publicKey;
    await mockRpcResponse({
      method: 'getRecentPrioritizationFees',
      params: [[pubkey.toBase58()]],
      value: [
        {
          slot: 348127,
          prioritizationFee: 500,
        },
        {
          slot: 348128,
          prioritizationFee: 0,
        },
      ],
    });

    const recentPrioritizationFees =
      await connection.getRecentPrioritizationFees({
        lockedWritableAccounts: [pubkey],
      });
    expect(recentPrioritizationFees).to.be.an('array');

    if (mockServer) {
      expect(recentPrioritizationFees).to.deep.equal([
        {
          slot: 348127n,
          prioritizationFee: 500n,
        },
        {
          slot: 348128n,
          prioritizationFee: 0n,
        },
      ]);
    } else {
      for (const prioritizationFee of recentPrioritizationFees) {
        expect(typeof prioritizationFee.prioritizationFee).to.eq('bigint');
        expect(typeof prioritizationFee.slot).to.eq('bigint');
      }
    }
  });

  it('get block time', async () => {
    await mockRpcResponse({
      method: 'getBlockTime',
      params: [1],
      value: 10000,
    });

    await mockRpcResponse({
      method: 'getFirstAvailableBlock',
      params: [],
      value: 1,
    });
    const slot = await connection.getFirstAvailableBlock();
    const blockTime = await connection.getBlockTime(slot);
    if (mockServer) {
      expect(blockTime).to.eq(10000n);
    } else {
      expect(typeof blockTime).to.eq('bigint');
      expect(blockTime > 0n).to.eq(true);
    }
  });

  it('get minimum ledger slot', async () => {
    await mockRpcResponse({
      method: 'minimumLedgerSlot',
      params: [],
      value: 0,
    });

    const minimumLedgerSlot = await connection.getMinimumLedgerSlot();
    expect(minimumLedgerSlot).to.be.at.least(0);
  });

  it('get first available block', async () => {
    await mockRpcResponse({
      method: 'getFirstAvailableBlock',
      params: [],
      value: 0,
    });

    const firstAvailableBlock = await connection.getFirstAvailableBlock();
    expect(firstAvailableBlock).to.eq(0n);
  });

  it('get supply', async () => {
    if (!mockServer) {
      const supply = (await connection.getSupply('finalized')).value;
      expect(typeof supply.total).to.eq('bigint');
      expect(typeof supply.circulating).to.eq('bigint');
      expect(typeof supply.nonCirculating).to.eq('bigint');
      expect(supply.total).to.eq(supply.circulating + supply.nonCirculating);
      for (const account of supply.nonCirculatingAccounts) {
        expect(account).to.be.instanceOf(Address);
      }
      return;
    }

    const nonCirculatingAccount = (
      await Keypair.generate()
    ).publicKey.toBase58();
    await mockRpcResponse({
      method: 'getSupply',
      params: [],
      value: {
        total: 1000,
        circulating: 100,
        nonCirculating: 900,
        nonCirculatingAccounts: [nonCirculatingAccount],
      },
      withContext: true,
    });

    const supply = (await connection.getSupply('finalized')).value;
    expect(supply.total).to.eq(1000n);
    expect(supply.circulating).to.eq(100n);
    expect(supply.nonCirculating).to.eq(900n);
    expect(supply.nonCirculatingAccounts).to.have.lengthOf(1);
    expect(supply.nonCirculatingAccounts[0]).to.be.instanceOf(Address);
    expect(supply.nonCirculatingAccounts[0].toBase58()).to.eq(
      nonCirculatingAccount,
    );
  });

  it('get supply without accounts', async () => {
    if (!mockServer) {
      const supply = (
        await connection.getSupply({
          commitment: 'finalized',
          excludeNonCirculatingAccountsList: true,
        })
      ).value;
      expect(typeof supply.total).to.eq('bigint');
      expect(typeof supply.circulating).to.eq('bigint');
      expect(typeof supply.nonCirculating).to.eq('bigint');
      expect(supply.total).to.eq(supply.circulating + supply.nonCirculating);
      expect(supply.nonCirculatingAccounts.length).to.eq(0);
      return;
    }

    await mockRpcResponse({
      method: 'getSupply',
      params: [{excludeNonCirculatingAccountsList: true}],
      value: {
        total: 1000,
        circulating: 100,
        nonCirculating: 900,
        nonCirculatingAccounts: [],
      },
      withContext: true,
    });

    const supply = (
      await connection.getSupply({
        commitment: 'finalized',
        excludeNonCirculatingAccountsList: true,
      })
    ).value;
    expect(supply.total).to.eq(1000n);
    expect(supply.circulating).to.eq(100n);
    expect(supply.nonCirculating).to.eq(900n);
    expect(supply.nonCirculatingAccounts.length).to.eq(0);
  });

  [undefined, 'confirmed' as Commitment].forEach(function (commitment) {
    describe(
      "when the connection's default commitment is `" + commitment + '`',
      () => {
        let connectionWithCommitment: Connection;
        beforeEach(() => {
          connectionWithCommitment = new Connection(url, commitment);
        });
        it('get performance samples', async () => {
          await mockRpcResponse({
            method: 'getRecentPerformanceSamples',
            params: [],
            value: [
              {
                slot: 1234,
                numNonVoteTransactions: 900,
                numTransactions: 1000,
                numSlots: 60,
                samplePeriodSecs: 60,
              },
            ],
          });

          const perfSamples =
            await connectionWithCommitment.getRecentPerformanceSamples();
          expect(Array.isArray(perfSamples)).to.be.true;

          if (perfSamples.length > 0) {
            if (mockServer) {
              expect(perfSamples[0].slot).to.eq(1234n);
              expect(perfSamples[0].numNonVoteTransactions).to.eq(900n);
              expect(perfSamples[0].numTransactions).to.eq(1000n);
              expect(perfSamples[0].numSlots).to.eq(60n);
              expect(perfSamples[0].samplePeriodSecs).to.eq(60);
            } else {
              expect(typeof perfSamples[0].slot).to.eq('bigint');
              expect(typeof perfSamples[0].numNonVoteTransactions).to.eq(
                'bigint',
              );
              expect(typeof perfSamples[0].numTransactions).to.eq('bigint');
              expect(typeof perfSamples[0].numSlots).to.eq('bigint');
              expect(perfSamples[0].samplePeriodSecs).to.be.greaterThan(0);
            }
          }
        });
      },
    );
  });

  it('get performance samples limit too high', async () => {
    await mockRpcResponse({
      method: 'getRecentPerformanceSamples',
      params: [100000],
      error: mockErrorResponse,
    });

    await expect(connection.getRecentPerformanceSamples(100000)).to.be.rejected;
  });

  it('treats a zero performance sample limit like an omitted limit', async () => {
    if (mockServer) {
      await mockRpcResponse({
        method: 'getRecentPerformanceSamples',
        params: [],
        value: [],
      });

      expect(await connection.getRecentPerformanceSamples(0)).to.deep.equal([]);
      return;
    }

    const perfSamples = await connection.getRecentPerformanceSamples(0);
    expect(Array.isArray(perfSamples)).to.be.true;
  });

  if (process.env.TEST_LIVE) {
    describe('token methods', () => {
      const connection = new Connection(url, 'confirmed');
      const newAccount = getUniqueAddress();
      const testTokenMintPubkey = LEGACY_TOKEN_TEST_MINT_PUBKEY;
      let testOwnerKeypair: Keypair;
      const testTokenAccountPubkey = LEGACY_TOKEN_TEST_ACCOUNT_PUBKEY;
      let selfTransferSignature: TransactionSignature;

      // Setup token mints and accounts for token tests
      before(async function () {
        this.timeout(30 * 1000);
        testOwnerKeypair = await Keypair.fromSecretKey(
          LEGACY_TOKEN_TEST_OWNER_SECRET_KEY,
        );

        const selfTransferTransaction = new Transaction().add(
          new TransactionInstruction({
            keys: [
              {
                pubkey: testTokenAccountPubkey,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: testTokenAccountPubkey,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: testOwnerKeypair.publicKey,
                isSigner: true,
                isWritable: false,
              },
            ],
            programId: TOKEN_PROGRAM_ID,
            data: Uint8Array.from(
              // prettier-ignore
              [
                3, // TRANSFER instruction
                1, 0, 0, 0, 0, 0, 0, 0, // 1 Lamport
            ],
            ),
          }),
        );

        selfTransferSignature = await sendAndConfirmTransaction(
          connection,
          selfTransferTransaction,
          [testOwnerKeypair],
        );
      });

      it('get token supply', async () => {
        const response = await connection.getTokenSupply(testTokenMintPubkey);
        expect(typeof response.context.slot).to.eq('bigint');

        const supply = response.value;
        expect(supply.uiAmount).to.eq(111.11);
        expect(supply.decimals).to.eq(2);
        expect(supply.amount).to.eq('11111');

        await expect(connection.getTokenSupply(newAccount)).to.be.rejected;
      });

      it('get token largest accounts', async () => {
        const largestAccounts = (
          await connection.getTokenLargestAccounts(testTokenMintPubkey)
        ).value;

        expect(largestAccounts).to.have.length(1);
        const largestAccount = largestAccounts[0];
        expect(largestAccount.address.equals(testTokenAccountPubkey)).to.be
          .true;
        expect(largestAccount.amount).to.eq('11110');
        expect(largestAccount.decimals).to.eq(2);
        expect(largestAccount.uiAmount).to.eq(111.1);

        await expect(connection.getTokenLargestAccounts(newAccount)).to.be
          .rejected;
      });

      it('get confirmed token transaction', async () => {
        let foundParsedTx = false;
        for (let attempt = 0; attempt < 10; attempt++) {
          const transaction = await connection.getParsedConfirmedTransaction(
            selfTransferSignature,
            'confirmed',
          );
          if (transaction !== null) {
            foundParsedTx = true;
            break;
          }
          await sleep(500);
        }
        expect(foundParsedTx).to.be.true;

        const parsedTx = await connection.getParsedConfirmedTransaction(
          selfTransferSignature,
          'confirmed',
        );
        if (parsedTx === null) {
          expect(parsedTx).not.to.be.null;
          return;
        }
        const {signatures, message} = parsedTx.transaction;
        expect(signatures[0]).to.eq(selfTransferSignature);
        const ix = message.instructions[0];
        if ('parsed' in ix) {
          expect(ix.program).to.eq('spl-token');
          expect(ix.programId).to.eql(TOKEN_PROGRAM_ID);
        } else {
          expect('parsed' in ix).to.be.true;
        }

        const missingSignature =
          '45pGoC4Rr3fJ1TKrsiRkhHRbdUeX7633XAGVec6XzVdpRbzQgHhe6ZC6Uq164MPWtiqMg7wCkC6Wy3jy2BqsDEKf';
        const nullResponse =
          await connection.getParsedConfirmedTransaction(missingSignature);

        expect(nullResponse).to.be.null;
      });

      it('get token account balance', async () => {
        const response = await connection.getTokenAccountBalance(
          testTokenAccountPubkey,
        );
        expect(typeof response.context.slot).to.eq('bigint');

        const balance = response.value;
        expect(balance.amount).to.eq('11110');
        expect(balance.decimals).to.eq(2);
        expect(balance.uiAmount).to.eq(111.1);

        await expect(connection.getTokenAccountBalance(newAccount)).to.be
          .rejected;
      });

      it('get parsed token account info', async () => {
        const response = await connection.getParsedAccountInfo(
          testTokenAccountPubkey,
        );
        expect(typeof response.context.slot).to.eq('bigint');

        const accountInfo = response.value;
        if (accountInfo) {
          const data = accountInfo.data;
          if (data instanceof Uint8Array) {
            expect(Buffer.isBuffer(data)).to.eq(false);
          } else {
            expect(data.program).to.eq('spl-token');
            expect(data.parsed).to.be.ok;
            expect(typeof data.space).to.eq('bigint');
          }
        }
      });

      it('get multiple parsed token accounts', async () => {
        const response = await connection.getMultipleParsedAccounts([
          testTokenAccountPubkey,
          testTokenMintPubkey,
          testOwnerKeypair.publicKey,
          newAccount,
        ]);
        expect(typeof response.context.slot).to.eq('bigint');

        const accounts = response.value;
        expect(accounts.length).to.eq(4);

        const parsedTokenAccount = accounts[0];
        if (parsedTokenAccount) {
          const data = parsedTokenAccount.data;
          if (data instanceof Uint8Array) {
            expect(Buffer.isBuffer(data)).to.eq(false);
          } else {
            expect(data.program).to.eq('spl-token');
            expect(data.parsed).to.be.ok;
            expect(typeof data.space).to.eq('bigint');
          }
        } else {
          expect(parsedTokenAccount).to.be.ok;
        }

        const parsedTokenMint = accounts[1];
        if (parsedTokenMint) {
          const data = parsedTokenMint.data;
          if (data instanceof Uint8Array) {
            expect(Buffer.isBuffer(data)).to.eq(false);
          } else {
            expect(data.program).to.eq('spl-token');
            expect(data.parsed).to.be.ok;
            expect(typeof data.space).to.eq('bigint');
          }
        } else {
          expect(parsedTokenMint).to.be.ok;
        }

        const unparsedOwnerAccount = accounts[2];
        if (unparsedOwnerAccount) {
          const data = unparsedOwnerAccount.data;
          expect(data).to.be.instanceOf(Uint8Array);
          expect(Buffer.isBuffer(data)).to.be.false;
        } else {
          expect(unparsedOwnerAccount).to.be.ok;
        }

        const unknownAccount = accounts[3];
        expect(unknownAccount).to.not.be.ok;
      });

      it('get parsed token program accounts', async () => {
        const tokenAccounts =
          await connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID);
        tokenAccounts.forEach(({account}) => {
          expect(account.owner).to.eql(TOKEN_PROGRAM_ID);
          const data = account.data;
          if (data instanceof Uint8Array) {
            expect(Buffer.isBuffer(data)).to.eq(false);
          } else {
            expect(data.parsed).to.be.ok;
            expect(data.program).to.eq('spl-token');
            expect(typeof data.space).to.eq('bigint');
          }
        });
      });

      it('get parsed token accounts by owner', async () => {
        const response = await connection.getParsedTokenAccountsByOwner(
          testOwnerKeypair.publicKey,
          {
            mint: testTokenMintPubkey,
          },
        );
        expect(typeof response.context.slot).to.eq('bigint');

        const tokenAccounts = response.value;
        tokenAccounts.forEach(({account}) => {
          expect(account.owner).to.eql(TOKEN_PROGRAM_ID);
          const data = account.data;
          if (data instanceof Uint8Array) {
            expect(Buffer.isBuffer(data)).to.eq(false);
          } else {
            expect(data.parsed).to.be.ok;
            expect(data.program).to.eq('spl-token');
            expect(typeof data.space).to.eq('bigint');
          }
        });
      });

      it('get token accounts by owner', async () => {
        const accountsWithMintFilter = (
          await connection.getTokenAccountsByOwner(testOwnerKeypair.publicKey, {
            mint: testTokenMintPubkey,
          })
        ).value;
        expect(accountsWithMintFilter).to.have.length(1);

        const accountsWithProgramFilter = (
          await connection.getTokenAccountsByOwner(testOwnerKeypair.publicKey, {
            programId: TOKEN_PROGRAM_ID,
          })
        ).value;
        expect(accountsWithProgramFilter).to.have.length(1);

        const noAccounts = (
          await connection.getTokenAccountsByOwner(newAccount, {
            mint: testTokenMintPubkey,
          })
        ).value;
        expect(noAccounts).to.have.length(0);

        await expect(
          connection.getTokenAccountsByOwner(testOwnerKeypair.publicKey, {
            mint: newAccount,
          }),
        ).to.be.rejected;

        await expect(
          connection.getTokenAccountsByOwner(testOwnerKeypair.publicKey, {
            programId: newAccount,
          }),
        ).to.be.rejected;
      });
    });

    it('consistent preflightCommitment', async () => {
      const connection = new Connection(url, 'confirmed');
      const sender = await Keypair.generate();
      const recipient = await Keypair.generate();
      const signature = await connection.requestAirdrop(
        sender.publicKey,
        2 * LAMPORTS_PER_SOL,
      );
      await connection.confirmTransaction(signature, 'confirmed');
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: sender.publicKey,
          toPubkey: recipient.publicKey,
          lamports: LAMPORTS_PER_SOL,
        }),
      );
      await sendAndConfirmTransaction(connection, transaction, [sender]);
    }).timeout(20 * 1000);
  }

  // FIXME Remove when https://github.com/anza-xyz/agave/pull/483 is deployed.
  (
    [undefined, 'processed', 'confirmed', 'finalized'] as (
      | Commitment
      | undefined
    )[]
  ).forEach(explicitPreflightCommitment => {
    it(`sets \`preflightCommitment\` to \`processed\` when \`skipPreflight\` is \`true\`, no matter that \`preflightCommitment\` was set to \`${explicitPreflightCommitment}\``, async () => {
      const connection = new Connection(url);
      const sendTransactionMethod = stub().returns({
        send: () =>
          Promise.resolve({
            id: '1',
            jsonrpc: '2.0',
            result:
              '5ZDp1HfNZhNRHc75ncsiZ4sCq1fGJHMGf9u36M3foD5PMH4Xu5S4X2x7aryn4JinUdG11oSYCk7zxbNmLJzzqUft',
          }),
      });
      connection._typedRpc = {sendTransaction: sendTransactionMethod} as any;

      await connection.sendEncodedTransaction('AQ==', {
        ...(explicitPreflightCommitment
          ? {preflightCommitment: explicitPreflightCommitment}
          : null),
        skipPreflight: true,
      });

      expect(sendTransactionMethod).to.have.been.calledWithExactly('AQ==', {
        encoding: 'base64',
        preflightCommitment: 'processed',
        skipPreflight: true,
      });
    });
  });

  it('get largest accounts', async () => {
    await mockRpcResponse({
      method: 'getLargestAccounts',
      params: [],
      value: await Promise.all(
        new Array(20).fill(0).map(async () => ({
          address: (await Keypair.generate()).publicKey.toBase58(),
          lamports: 1000,
        })),
      ),
      withContext: true,
    });

    const response = await connection.getLargestAccounts();
    expect(typeof response.context.slot).to.eq('bigint');
    expect(response.value).to.have.length(20);
    expect(response.value[0].address).to.be.instanceOf(Address);

    if (mockServer) {
      expect(response.value[0].lamports).to.eq(1000n);
    } else {
      expect(typeof response.value[0].lamports).to.eq('bigint');
      expect(response.value[0].lamports > 0n).to.be.true;
    }
  });

  it('getVersion', async () => {
    await mockRpcResponse({
      method: 'getVersion',
      params: [],
      value: {'solana-core': '3.1.11'},
    });

    const version = await connection.getVersion();
    expect(version['solana-core']).to.be.ok;
  });

  it('getHealth', async () => {
    await mockRpcResponse({
      method: 'getHealth',
      params: [],
      value: 'ok',
    });

    const health = await connection.getHealth();
    expect(health).to.eq('ok');
  });

  it('getIdentity', async () => {
    if (mockServer) {
      await mockRpcResponse({
        method: 'getIdentity',
        params: [],
        value: {identity: '11111111111111111111111111111111'},
      });

      const mockedIdentity = await connection.getIdentity();
      expect(mockedIdentity.identity).to.be.instanceOf(Address);
      expect(mockedIdentity.identity.toBase58()).to.eq(
        '11111111111111111111111111111111',
      );
      return;
    }

    const identity = await connection.getIdentity();
    expect(identity.identity).to.be.instanceOf(Address);
    expect(identity.identity.toBase58()).to.not.equal('');
  });

  it('getHighestSnapshotSlot', async () => {
    if (mockServer) {
      await mockRpcResponse({
        method: 'getHighestSnapshotSlot',
        params: [],
        value: {full: 1234, incremental: 1250},
      });

      const highestSnapshotSlot = await connection.getHighestSnapshotSlot();
      expect(highestSnapshotSlot.full).to.eq(1234n);
      expect(highestSnapshotSlot.incremental).to.eq(1250n);
      return;
    }

    try {
      const highestSnapshotSlot = await connection.getHighestSnapshotSlot();
      expect(highestSnapshotSlot.full >= 0n).to.be.true;
      if (highestSnapshotSlot.incremental != null) {
        expect(highestSnapshotSlot.incremental >= 0n).to.be.true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        !message.includes('No snapshot') &&
        !message.includes('Method not found')
      ) {
        throw error;
      }
    }
  });

  it('getMaxRetransmitSlot', async () => {
    if (mockServer) {
      await mockRpcResponse({
        method: 'getMaxRetransmitSlot',
        params: [],
        value: 100,
      });

      const maxRetransmitSlot = await connection.getMaxRetransmitSlot();
      expect(maxRetransmitSlot).to.eq(100n);
      return;
    }

    const maxRetransmitSlot = await connection.getMaxRetransmitSlot();
    expect(maxRetransmitSlot >= 0n).to.be.true;
  });

  it('getMaxShredInsertSlot', async () => {
    if (mockServer) {
      await mockRpcResponse({
        method: 'getMaxShredInsertSlot',
        params: [],
        value: 101,
      });

      const maxShredInsertSlot = await connection.getMaxShredInsertSlot();
      expect(maxShredInsertSlot).to.eq(101n);
      return;
    }

    const maxShredInsertSlot = await connection.getMaxShredInsertSlot();
    expect(maxShredInsertSlot >= 0n).to.be.true;
  });

  it('getGenesisHash', async () => {
    await mockRpcResponse({
      method: 'getGenesisHash',
      params: [],
      value: 'GH7ome3EiwEr7tu9JuTh2dpYWBJK3z69Xm1ZE3MEE6JC',
    });

    const genesisHash = await connection.getGenesisHash();
    expect(genesisHash).not.to.be.empty;
  });

  it('getStakeMinimumDelegation', async () => {
    await mockRpcResponse({
      method: 'getStakeMinimumDelegation',
      params: [],
      value: 1_000_000_000,
      withContext: true,
    });

    const minimumStakeDelegation = await connection.getStakeMinimumDelegation();
    if (mockServer) {
      expect(minimumStakeDelegation.context.slot).to.eq(11n);
      expect(minimumStakeDelegation.value).to.eq(1_000_000_000n);
    } else {
      expect(typeof minimumStakeDelegation.context.slot).to.eq('bigint');
      expect(typeof minimumStakeDelegation.value).to.eq('bigint');
      expect(minimumStakeDelegation.context.slot > 0n).to.eq(true);
      expect(minimumStakeDelegation.value > 0n).to.eq(true);
    }
  });

  it('request airdrop', async () => {
    const account = await Keypair.generate();

    await helpers.airdrop({
      connection,
      address: account.publicKey,
      amount: LAMPORTS_PER_SOL,
    });

    await mockRpcResponse({
      method: 'getBalance',
      params: [account.publicKey.toBase58(), {commitment: 'confirmed'}],
      value: LAMPORTS_PER_SOL,
      withContext: true,
    });

    const balance = await connection.getBalance(account.publicKey, 'confirmed');
    expect(balance).to.eq(BigInt(LAMPORTS_PER_SOL));

    await mockRpcResponse({
      method: 'getAccountInfo',
      params: [
        account.publicKey.toBase58(),
        {commitment: 'confirmed', encoding: 'base64'},
      ],
      value: {
        owner: '11111111111111111111111111111111',
        lamports: LAMPORTS_PER_SOL,
        data: ['', 'base64'],
        executable: false,
        rentEpoch: 20,
        space: 0,
      },
      withContext: true,
    });

    const accountInfo = await connection.getAccountInfo(
      account.publicKey,
      'confirmed',
    );
    if (accountInfo === null) {
      expect(accountInfo).not.to.be.null;
      return;
    }
    expect(accountInfo.lamports).to.eq(BigInt(LAMPORTS_PER_SOL));
    expect(accountInfo.data).to.be.instanceOf(Uint8Array);
    expect(Buffer.isBuffer(accountInfo.data)).to.be.false;
    expect(accountInfo.data).to.have.length(0);
    expect(accountInfo.owner).to.eql(SystemProgram.programId);

    await mockRpcResponse({
      method: 'getAccountInfo',
      params: [
        account.publicKey.toBase58(),
        {commitment: 'confirmed', encoding: 'jsonParsed'},
      ],
      value: {
        owner: '11111111111111111111111111111111',
        lamports: LAMPORTS_PER_SOL,
        data: ['', 'base64'],
        executable: false,
        rentEpoch: 20,
        space: 0,
      },
      withContext: true,
    });

    const parsedAccountInfo = (
      await connection.getParsedAccountInfo(account.publicKey, 'confirmed')
    ).value;
    if (parsedAccountInfo === null) {
      expect(parsedAccountInfo).not.to.be.null;
      return;
    } else if ('parsed' in parsedAccountInfo.data) {
      expect(parsedAccountInfo.data.parsed).not.to.be.ok;
      return;
    }
    expect(parsedAccountInfo.lamports).to.eq(BigInt(LAMPORTS_PER_SOL));
    expect(parsedAccountInfo.data).to.have.length(0);
    expect(parsedAccountInfo.owner).to.eql(SystemProgram.programId);
  });

  it('transaction failure', async () => {
    const payer = await Keypair.generate();

    await helpers.airdrop({
      connection,
      address: payer.publicKey,
      amount: LAMPORTS_PER_SOL,
    });

    const newAccount = await Keypair.generate();
    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: newAccount.publicKey,
        lamports: LAMPORTS_PER_SOL / 2,
        space: 0,
        programId: SystemProgram.programId,
      }),
    );

    await helpers.processTransaction({
      connection,
      transaction,
      signers: [payer, newAccount],
      commitment: 'confirmed',
    });

    // This should fail because the account is already created
    const expectedStatusErr = {
      InstructionError: [0n, {Custom: 0n}],
    };
    const wireErr = {InstructionError: [0, {Custom: 0}]};
    const confirmResult = (
      await helpers.processTransaction({
        connection,
        transaction,
        signers: [payer, newAccount],
        commitment: 'confirmed',
        err: expectedStatusErr,
      })
    ).value;
    expect(confirmResult.err).to.eql(expectedStatusErr);

    invariant(transaction.signature);
    const signature = BASE58_CODEC.decode(transaction.signature);
    await mockRpcResponse({
      method: 'getSignatureStatuses',
      params: [[signature]],
      value: [
        {
          slot: 0,
          confirmations: 11,
          status: {Err: wireErr},
          err: wireErr,
        },
      ],
      withContext: true,
    });

    const response = (await connection.getSignatureStatus(signature)).value;
    verifySignatureStatus(response, expectedStatusErr);
  });

  if (mockServer) {
    it('returnData on simulateTransaction', async () => {
      const tx = new Transaction();
      tx.feePayer = (await Keypair.generate()).publicKey;

      const getLatestBlockhashResponse = {
        method: 'getLatestBlockhash',
        params: [],
        value: {
          blockhash: 'CSymwgTNX1j3E4qhKfJAUE41nBWEwXufoYryPbkde5RR',
          feeCalculator: {
            lamportsPerSignature: 5000,
          },
          lastValidBlockHeight: 51,
        },
        withContext: true,
      };
      const simulateTransactionResponse = {
        method: 'simulateTransaction',
        params: [],
        value: {
          err: null,
          accounts: null,
          logs: [
            'Program 83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri invoke [1]',
            'Program 83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri consumed 2366 of 1400000 compute units',
            'Program return: 83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri KgAAAAAAAAA=',
            'Program 83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri success',
          ],
          returnData: {
            data: ['KgAAAAAAAAA==', 'base64'],
            programId: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
          },
          unitsConsumed: 2366,
        },
        withContext: true,
      };
      await mockRpcResponse(getLatestBlockhashResponse);
      await mockRpcResponse(simulateTransactionResponse);
      const responseWithContext = await connection.simulateTransaction(tx);
      const response = responseWithContext.value;
      expect(responseWithContext.context.slot).to.eq(11n);
      expect(typeof responseWithContext.context.slot).to.eq('bigint');
      expect(response.unitsConsumed).to.eq(2366n);
      expect(response.returnData).to.eql({
        data: ['KgAAAAAAAAA==', 'base64'],
        programId: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
      });
    });

    it('simulateTransaction with config object preserves bigint fields', async () => {
      const payer = (await Keypair.generate()).publicKey;
      const versionedTx = new VersionedTransaction(
        new Message({
          header: {
            numRequiredSignatures: 1,
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0,
          },
          recentBlockhash: blockhash(
            'CSymwgTNX1j3E4qhKfJAUE41nBWEwXufoYryPbkde5RR',
          ),
          instructions: [],
          accountKeys: [payer.toBase58()],
        }),
      );
      const accountData = Buffer.alloc(32, 1).toString('base64');

      await mockRpcResponse({
        method: 'simulateTransaction',
        params: [],
        value: {
          err: null,
          accounts: [
            {
              data: [accountData, 'base64'],
              executable: false,
              lamports: 5000,
              owner: SystemProgram.programId.toBase58(),
              rentEpoch: 20,
              space: 32,
            },
          ],
          innerInstructions: [
            {
              index: 0,
              instructions: [
                {
                  program: 'system',
                  programId: SystemProgram.programId.toBase58(),
                  parsed: {
                    info: {lamports: 1},
                    type: 'transfer',
                  },
                },
                {
                  accounts: [payer.toBase58()],
                  data: '',
                  programId: SystemProgram.programId.toBase58(),
                },
              ],
            },
          ],
          unitsConsumed: 2366,
        },
        slot: 37,
        withContext: true,
      });

      const response = await connection.simulateTransaction(versionedTx, {
        accounts: {
          encoding: 'base64',
          addresses: [payer.toBase58()],
        },
        innerInstructions: true,
        minContextSlot: 123n,
      });

      expect(response.context.slot).to.eq(37n);
      expect(typeof response.context.slot).to.eq('bigint');
      expect(response.value.unitsConsumed).to.eq(2366n);
      expect(response.value.accounts).to.eql([
        {
          data: [accountData, 'base64'],
          executable: false,
          lamports: 5000n,
          owner: SystemProgram.programId.toBase58(),
          rentEpoch: 20n,
          space: 32n,
        },
      ]);
      expect(response.value.innerInstructions).to.have.length(1);
      expect(response.value.innerInstructions?.[0].index).to.eq(0);
      expect(response.value.innerInstructions?.[0].instructions).to.have.length(
        2,
      );

      const parsedInstruction =
        response.value.innerInstructions?.[0].instructions[0];
      if (!parsedInstruction || !('parsed' in parsedInstruction)) {
        expect.fail('Expected a parsed inner instruction');
      }
      expect(parsedInstruction.parsed).to.eql({
        info: {lamports: 1n},
        type: 'transfer',
      });
      expect(parsedInstruction.program).to.eq('system');
      expect(parsedInstruction.programId).to.eql(SystemProgram.programId);

      const rawInstruction =
        response.value.innerInstructions?.[0].instructions[1];
      if (!rawInstruction || !('accounts' in rawInstruction)) {
        expect.fail('Expected a partially decoded inner instruction');
      }
      expect(rawInstruction.accounts).to.eql([payer]);
      expect(rawInstruction.data).to.eq('');
      expect(rawInstruction.programId).to.eql(SystemProgram.programId);
    });
  }

  if (process.env.TEST_LIVE) {
    it('getStakeMinimumDelegation', async () => {
      const {context, value} = await connection.getStakeMinimumDelegation();
      expect(typeof context.slot).to.eq('bigint');
      expect(typeof value).to.eq('bigint');
      expect(value > 0n).to.eq(true);
    });

    it('sendTransaction', async () => {
      const connection = new Connection(url, 'confirmed');
      const payer = await Keypair.generate();

      await helpers.airdrop({
        connection,
        address: payer.publicKey,
        amount: LAMPORTS_PER_SOL,
      });

      const recentBlockhash = await (
        await helpers.latestBlockhash({connection})
      ).blockhash;

      const versionedTx = new VersionedTransaction(
        new Message({
          header: {
            numRequiredSignatures: 1,
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0,
          },
          recentBlockhash,
          instructions: [],
          accountKeys: [payer.publicKey.toBase58()],
        }),
      );

      await versionedTx.sign([payer]);
      await connection.sendTransaction(versionedTx);
    });

    it('simulateTransaction', async () => {
      const connection = new Connection(url, 'confirmed');
      const payer = await Keypair.generate();

      await helpers.airdrop({
        connection,
        address: payer.publicKey,
        amount: LAMPORTS_PER_SOL,
      });

      const recentBlockhash = await (
        await helpers.latestBlockhash({connection})
      ).blockhash;

      const versionedTx = new VersionedTransaction(
        new Message({
          header: {
            numRequiredSignatures: 1,
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0,
          },
          recentBlockhash,
          instructions: [],
          accountKeys: [payer.publicKey.toBase58()],
        }),
      );

      const response = await connection.simulateTransaction(versionedTx, {
        accounts: {
          encoding: 'base64',
          addresses: [payer.publicKey.toBase58()],
        },
      });
      expect(typeof response.context.slot).to.eq('bigint');
      expect(response.value.err).to.be.null;

      if (process.env.TEST_LIVE) {
        expect(response.value.accounts).to.have.length(1);
        const accountInfo = response.value.accounts?.[0];
        if (accountInfo == null) {
          throw new Error('Expected simulated account info');
        }
        expect(accountInfo.data).to.eql(['', 'base64']);
        expect(accountInfo.executable).to.be.false;
        expect(accountInfo.lamports).to.eq(BigInt(LAMPORTS_PER_SOL - 5000));
        expect(accountInfo.owner).to.eq(SystemProgram.programId.toBase58());
        expect(accountInfo.rentEpoch).to.be.a('bigint');
        expect(accountInfo.rentEpoch! > 0n).to.be.true;
        expect(accountInfo.space).to.be.a('bigint');
        expect(accountInfo.space >= 0n).to.be.true;
        return;
      }

      expect(response.value.accounts).to.eql([
        {
          data: ['', 'base64'],
          executable: false,
          lamports: BigInt(LAMPORTS_PER_SOL - 5000),
          owner: SystemProgram.programId.toBase58(),
          rentEpoch: 2n ** 64n - 1n,
          space: 0,
        },
      ]);
    });

    it('simulate transaction with message', async () => {
      connection._commitment = 'confirmed';

      const account1 = await Keypair.generate();
      const account2 = await Keypair.generate();

      await helpers.airdrop({
        connection,
        address: account1.publicKey,
        amount: LAMPORTS_PER_SOL,
      });

      await helpers.airdrop({
        connection,
        address: account2.publicKey,
        amount: LAMPORTS_PER_SOL,
      });

      const recentBlockhash = await (
        await helpers.latestBlockhash({connection})
      ).blockhash;
      const message = new Message({
        accountKeys: [
          account1.publicKey.toString(),
          account2.publicKey.toString(),
          'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
        ],
        header: {
          numReadonlySignedAccounts: 1,
          numReadonlyUnsignedAccounts: 2,
          numRequiredSignatures: 1,
        },
        instructions: [
          {
            accounts: [0, 1],
            data: BASE58_CODEC.decode(new Uint8Array(5).fill(9)),
            programIdIndex: 2,
          },
        ],
        recentBlockhash,
      });

      const results1 = await connection.simulateTransaction(
        message,
        [account1],
        true,
      );

      expect(results1.value.accounts).lengthOf(2);

      const results2 = await connection.simulateTransaction(
        message,
        [account1],
        [
          account1.publicKey,
          new Address('Missing111111111111111111111111111111111111'),
        ],
      );

      expect(results2.value.accounts).lengthOf(2);
      if (results2.value.accounts) {
        expect(results2.value.accounts[1]).to.be.null;
      }
    }).timeout(10000);

    it('transaction', async () => {
      connection._commitment = 'confirmed';

      const accountFrom = await Keypair.generate();
      const accountTo = await Keypair.generate();
      const minimumAmount =
        await connection.getMinimumBalanceForRentExemption(0);

      await helpers.airdrop({
        connection,
        address: accountFrom.publicKey,
        amount: Number(minimumAmount + 100010n),
      });
      await helpers.airdrop({
        connection,
        address: accountTo.publicKey,
        amount: Number(minimumAmount),
      });

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: accountFrom.publicKey,
          toPubkey: accountTo.publicKey,
          lamports: 10,
        }),
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [accountFrom],
        {preflightCommitment: 'confirmed'},
      );

      // Send again and ensure that new blockhash is used
      const lastFetch = Date.now();
      const transaction2 = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: accountFrom.publicKey,
          toPubkey: accountTo.publicKey,
          lamports: 10,
        }),
      );

      const signature2 = await sendAndConfirmTransaction(
        connection,
        transaction2,
        [accountFrom],
        {preflightCommitment: 'confirmed'},
      );

      expect(signature).not.to.eq(signature2);
      expect(transaction.recentBlockhash).not.to.eq(
        transaction2.recentBlockhash,
      );

      // Send new transaction and ensure that same blockhash is used
      const transaction3 = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: accountFrom.publicKey,
          toPubkey: accountTo.publicKey,
          lamports: 9,
        }),
      );
      await sendAndConfirmTransaction(connection, transaction3, [accountFrom], {
        preflightCommitment: 'confirmed',
      });
      expect(transaction2.recentBlockhash).to.eq(transaction3.recentBlockhash);

      // Sleep until blockhash cache times out
      await sleep(
        Math.max(
          0,
          1000 + BLOCKHASH_CACHE_TIMEOUT_MS - (Date.now() - lastFetch),
        ),
      );

      const transaction4 = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: accountFrom.publicKey,
          toPubkey: accountTo.publicKey,
          lamports: 13,
        }),
      );

      await sendAndConfirmTransaction(connection, transaction4, [accountFrom], {
        preflightCommitment: 'confirmed',
      });

      expect(transaction4.recentBlockhash).not.to.eq(
        transaction3.recentBlockhash,
      );

      // accountFrom may have less than 100000 due to transaction fees
      const balance = await connection.getBalance(accountFrom.publicKey);
      expect(balance > 0n).to.eq(true);
      expect(balance <= minimumAmount + 100000n).to.eq(true);
      expect(await connection.getBalance(accountTo.publicKey)).to.eq(
        minimumAmount + 42n,
      );
    }).timeout(45 * 1000); // waits 30s for cache timeout

    it('multi-instruction transaction', async () => {
      connection._commitment = 'confirmed';

      const accountFrom = await Keypair.generate();
      const accountTo = await Keypair.generate();

      let signature = await connection.requestAirdrop(
        accountFrom.publicKey,
        LAMPORTS_PER_SOL,
      );
      await connection.confirmTransaction(signature);
      expect(await connection.getBalance(accountFrom.publicKey)).to.eq(
        BigInt(LAMPORTS_PER_SOL),
      );

      const minimumAmount =
        await connection.getMinimumBalanceForRentExemption(0);

      signature = await connection.requestAirdrop(
        accountTo.publicKey,
        Number(minimumAmount + 21n),
      );
      await connection.confirmTransaction(signature);
      expect(await connection.getBalance(accountTo.publicKey)).to.eq(
        minimumAmount + 21n,
      );

      // 1. Move(accountFrom, accountTo)
      // 2. Move(accountTo, accountFrom)
      const transaction = new Transaction()
        .add(
          SystemProgram.transfer({
            fromPubkey: accountFrom.publicKey,
            toPubkey: accountTo.publicKey,
            lamports: 100,
          }),
        )
        .add(
          SystemProgram.transfer({
            fromPubkey: accountTo.publicKey,
            toPubkey: accountFrom.publicKey,
            lamports: 100,
          }),
        );
      signature = await connection.sendTransaction(
        transaction,
        [accountFrom, accountTo],
        {skipPreflight: true},
      );

      await connection.confirmTransaction({
        blockhash: transaction.recentBlockhash!,
        lastValidBlockHeight: transaction.lastValidBlockHeight!,
        signature: signature,
      });

      const response = (await connection.getSignatureStatus(signature)).value;
      if (response !== null) {
        expect(typeof response.slot).to.eq('bigint');
        expect(response.err).to.be.null;
      } else {
        expect(response).not.to.be.null;
      }

      // accountFrom may have less than LAMPORTS_PER_SOL due to transaction fees
      expect((await connection.getBalance(accountFrom.publicKey)) > 0n).to.eq(
        true,
      );
      expect(
        (await connection.getBalance(accountFrom.publicKey)) <=
          BigInt(LAMPORTS_PER_SOL),
      ).to.eq(true);

      expect(await connection.getBalance(accountTo.publicKey)).to.eq(
        minimumAmount + 21n,
      );
    });

    describe('given an open websocket connection', () => {
      it('account change notification', async () => {
        const owner = await Keypair.generate();

        let subscriptionId: number | undefined;
        try {
          const accountInfoPromise = new Promise<AccountInfo<Uint8Array>>(
            resolve => {
              subscriptionId = connection.onAccountChange(
                owner.publicKey,
                resolve,
                {commitment: 'confirmed'},
              );
            },
          );
          await connection.requestAirdrop(owner.publicKey, LAMPORTS_PER_SOL);
          const accountInfo = await accountInfoPromise;
          expect(accountInfo.lamports).to.eq(BigInt(LAMPORTS_PER_SOL));
          expect(accountInfo.data).to.be.instanceOf(Uint8Array);
          expect(Buffer.isBuffer(accountInfo.data)).to.be.false;
          expect(accountInfo.owner.equals(SystemProgram.programId)).to.be.true;
        } finally {
          if (subscriptionId != null) {
            await connection.removeAccountChangeListener(subscriptionId);
          }
        }
      }).timeout(20 * 1000);

      it('program account change notification', async () => {
        connection._commitment = 'confirmed';

        const owner = await Keypair.generate();
        const programAccount = await Keypair.generate();
        const balanceNeeded =
          await connection.getMinimumBalanceForRentExemption(0);

        let subscriptionId: number | undefined;
        try {
          const keyedAccountInfoPromise = new Promise<KeyedAccountInfo>(
            resolve => {
              subscriptionId = connection.onProgramAccountChange(
                SystemProgram.programId,
                keyedAccountInfo => {
                  if (
                    keyedAccountInfo.accountId.equals(programAccount.publicKey)
                  ) {
                    resolve(keyedAccountInfo);
                  }
                },
              );
            },
          );

          await helpers.airdrop({
            connection,
            address: owner.publicKey,
            amount: LAMPORTS_PER_SOL,
          });

          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: owner.publicKey,
              toPubkey: programAccount.publicKey,
              lamports: balanceNeeded,
            }),
          );
          await sendAndConfirmTransaction(connection, transaction, [owner], {
            commitment: 'confirmed',
          });

          const keyedAccountInfo = await keyedAccountInfoPromise;
          expect(keyedAccountInfo.accountInfo.lamports).to.eq(
            BigInt(balanceNeeded),
          );
          expect(keyedAccountInfo.accountInfo.data).to.be.instanceOf(
            Uint8Array,
          );
          expect(Buffer.isBuffer(keyedAccountInfo.accountInfo.data)).to.be
            .false;
          expect(
            keyedAccountInfo.accountInfo.owner.equals(SystemProgram.programId),
          ).to.be.true;
        } finally {
          if (subscriptionId != null) {
            await connection.removeProgramAccountChangeListener(subscriptionId);
          }
        }
      }).timeout(20 * 1000);

      it('slot notification', async () => {
        let subscriptionId: number | undefined;
        try {
          const notifiedSlotInfo = await new Promise<SlotInfo>(resolve => {
            subscriptionId = connection.onSlotChange(resolve);
          });
          expect(notifiedSlotInfo.parent).to.be.at.least(0);
          expect(notifiedSlotInfo.root).to.be.at.least(0);
          expect(notifiedSlotInfo.slot).to.be.at.least(1);
        } finally {
          if (subscriptionId != null) {
            await connection.removeSlotChangeListener(subscriptionId);
          }
        }
      });

      it('root notification', async () => {
        let subscriptionId: number | undefined;
        try {
          const atLeastTwoRoots = await new Promise<bigint[]>(resolve => {
            const roots: bigint[] = [];
            subscriptionId = connection.onRootChange(root => {
              if (roots.length === 2) {
                return;
              }
              roots.push(root);
              if (roots.length === 2) {
                // Collect at least two, then resolve.
                resolve(roots);
              }
            });
          });
          expect(atLeastTwoRoots[1] > atLeastTwoRoots[0]).to.eq(true);
        } finally {
          if (subscriptionId != null) {
            await connection.removeRootChangeListener(subscriptionId);
          }
        }
      });

      it('signature notification', async () => {
        const owner = await Keypair.generate();
        const signature = await connection.requestAirdrop(
          owner.publicKey,
          LAMPORTS_PER_SOL,
        );
        const signatureResult = await new Promise<SignatureResult>(resolve => {
          // NOTE: Signature subscriptions auto-remove themselves, so there's no
          // need to track the subscription id and remove it when the test ends.
          connection.onSignature(signature, resolve, 'processed');
        });
        expect(signatureResult.err).to.be.null;
      });

      it('logs notification', async () => {
        let subscriptionId: number | undefined;
        const owner = await Keypair.generate();
        try {
          const logPromise = new Promise<[Logs, Context]>(resolve => {
            subscriptionId = connection.onLogs(
              owner.publicKey,
              (logs, ctx) => {
                if (!logs.err) {
                  resolve([logs, ctx]);
                }
              },
              'processed',
            );
          });

          // Execute a transaction so that we can pickup its logs.
          await connection.requestAirdrop(owner.publicKey, LAMPORTS_PER_SOL);

          const [logsRes, ctx] = await logPromise;
          expect(ctx.slot).to.be.greaterThan(0);
          expect(logsRes.logs.length).to.eq(2);
          expect(logsRes.logs[0]).to.eq(
            'Program 11111111111111111111111111111111 invoke [1]',
          );
          expect(logsRes.logs[1]).to.eq(
            'Program 11111111111111111111111111111111 success',
          );
        } finally {
          if (subscriptionId != null) {
            await connection.removeOnLogsListener(subscriptionId);
          }
        }
      });
    });

    it('https request', async () => {
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      const version = await connection.getVersion();
      expect(version['solana-core']).to.be.ok;
    }).timeout(20 * 1000);

    let lookupTableKey: Address;
    let lookupTableAddresses: Address[] = [];

    describe('address lookup table program', () => {
      const connection = new Connection(url);
      let payer: Keypair;

      before(async () => {
        payer = await Keypair.generate();
        lookupTableAddresses = await Promise.all(
          new Array(10)
            .fill(0)
            .map(async () => (await Keypair.generate()).publicKey),
        );

        await helpers.airdrop({
          connection,
          address: payer.publicKey,
          amount: 10 * LAMPORTS_PER_SOL,
        });
      });

      it('createLookupTable', async () => {
        const recentSlot = await connection.getSlot('finalized');

        let createIx: TransactionInstruction;
        [createIx, lookupTableKey] =
          await AddressLookupTableProgram.createLookupTable({
            recentSlot,
            payer: payer.publicKey,
            authority: payer.publicKey,
          });

        await helpers.processTransaction({
          connection,
          transaction: new Transaction().add(createIx),
          signers: [payer],
          commitment: 'processed',
        });
      });

      it('extendLookupTable', async () => {
        const transaction = new Transaction().add(
          AddressLookupTableProgram.extendLookupTable({
            lookupTable: lookupTableKey,
            addresses: lookupTableAddresses,
            authority: payer.publicKey,
            payer: payer.publicKey,
          }),
        );

        await helpers.processTransaction({
          connection,
          transaction,
          signers: [payer],
          commitment: 'processed',
        });
      });

      it('freezeLookupTable', async () => {
        const transaction = new Transaction().add(
          AddressLookupTableProgram.freezeLookupTable({
            lookupTable: lookupTableKey,
            authority: payer.publicKey,
          }),
        );

        await helpers.processTransaction({
          connection,
          transaction,
          signers: [payer],
          commitment: 'processed',
        });
      });

      it('getAddressLookupTable', async () => {
        const lookupTableResponse = await connection.getAddressLookupTable(
          lookupTableKey,
          {
            commitment: 'processed',
          },
        );
        const lookupTableAccount = lookupTableResponse.value;
        if (!lookupTableAccount) {
          expect(lookupTableAccount).to.be.ok;
          return;
        }
        expect(lookupTableAccount.isActive()).to.be.true;
        expect(lookupTableAccount.state.authority).to.be.undefined;
        expect(lookupTableAccount.state.addresses).to.eql(lookupTableAddresses);
      });
    });

    describe('v0 transaction', () => {
      const connection = new Connection(url);
      let payer: Keypair;
      const waitFor = async (predicate: () => Promise<boolean>) => {
        for (let ii = 0; ii < 30; ii++) {
          if (await predicate()) {
            return true;
          }
          await sleep(250);
        }
        return false;
      };

      const ensureTransactionSlot = async (): Promise<number> => {
        if (transactionSlot != null) {
          return Number(transactionSlot);
        }

        const foundViaStatus = await waitFor(async () => {
          const signatureStatus = await connection.getSignatureStatus(
            signature,
            {
              searchTransactionHistory: true,
            },
          );
          if (signatureStatus?.value?.slot != null) {
            transactionSlot = BigInt(signatureStatus.value.slot);
            return true;
          }
          return false;
        });

        if (!foundViaStatus) {
          const fetchedTransaction = await connection.getTransaction(
            signature,
            {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            },
          );
          if (fetchedTransaction?.slot != null) {
            transactionSlot = fetchedTransaction.slot;
          }
        }

        expect(transactionSlot).to.not.be.undefined;
        return Number(transactionSlot);
      };

      before(async () => {
        payer = await Keypair.generate();
        await helpers.airdrop({
          connection,
          address: payer.publicKey,
          amount: 10 * LAMPORTS_PER_SOL,
        });
      });

      // wait for lookup table to be usable
      before(async () => {
        const lookupTableResponse = await connection.getAddressLookupTable(
          lookupTableKey,
          {
            commitment: 'processed',
          },
        );

        const lookupTableAccount = lookupTableResponse.value;
        if (!lookupTableAccount) {
          expect(lookupTableAccount).to.be.ok;
          return;
        }

        while (true) {
          const latestSlot = await connection.getSlot('confirmed');
          if (latestSlot > lookupTableAccount.state.lastExtendedSlot) {
            break;
          } else {
            console.log('Waiting for next slot...');
            await sleep(500);
          }
        }
      });

      let signature: TransactionSignature;
      let addressTableLookups: MessageAddressTableLookup[];
      let transactionSlot: bigint | undefined;
      it('send and confirm', async () => {
        const {blockhash, lastValidBlockHeight} =
          await connection.getLatestBlockhash();
        const transferIxData = Uint8Array.from(
          getTransferSolInstructionDataEncoder().encode({
            amount: BigInt(LAMPORTS_PER_SOL),
          }),
        );
        addressTableLookups = [
          {
            accountKey: lookupTableKey,
            writableIndexes: [0],
            readonlyIndexes: [],
          },
        ];
        const transaction = new VersionedTransaction(
          new MessageV0({
            header: {
              numRequiredSignatures: 1,
              numReadonlySignedAccounts: 0,
              numReadonlyUnsignedAccounts: 1,
            },
            staticAccountKeys: [payer.publicKey, SystemProgram.programId],
            recentBlockhash: blockhash,
            compiledInstructions: [
              {
                programIdIndex: 1,
                accountKeyIndexes: [0, 2],
                data: transferIxData,
              },
            ],
            addressTableLookups,
          }),
        );
        await transaction.sign([payer]);
        signature = BASE58_CODEC.decode(transaction.signatures[0]);
        const serializedTransaction = await transaction.serialize();
        await connection.sendRawTransaction(serializedTransaction, {
          preflightCommitment: 'confirmed',
        });

        await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          'confirmed',
        );

        const foundTransactionSlot = await waitFor(async () => {
          const signatureStatus = await connection.getSignatureStatus(
            signature,
            {
              searchTransactionHistory: true,
            },
          );
          if (signatureStatus?.value?.slot != null) {
            transactionSlot = BigInt(signatureStatus.value.slot);
            return true;
          }
          return false;
        });
        expect(foundTransactionSlot).to.be.true;

        const transferToKey = lookupTableAddresses[0];
        const transferToAccount = await connection.getAccountInfo(
          transferToKey,
          {commitment: 'confirmed', dataSlice: {length: 0, offset: 0}},
        );
        expect(transferToAccount?.data.length).to.be.eq(0);
        expect(transferToAccount?.lamports).to.be.eq(BigInt(LAMPORTS_PER_SOL));
      }).timeout(30 * 1000);

      it('getTransaction (failure)', async () => {
        try {
          const transaction = await connection.getTransaction(signature, {
            commitment: 'confirmed',
          });
          expect(transaction).to.be.null;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          expect(message).to.include(
            'Transaction version (0) is not supported',
          );
        }
      });

      it('getTransaction', async () => {
        const foundTransaction = await waitFor(async () => {
          const transaction = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });
          return transaction !== null;
        });
        expect(foundTransaction).to.be.true;
        const fetchedTransaction = await connection.getTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });
        if (fetchedTransaction === null) {
          expect(fetchedTransaction).to.not.be.null;
          return;
        }
        transactionSlot = transactionSlot ?? fetchedTransaction.slot;
        expect(fetchedTransaction.slot).to.be.a('bigint');
        expect(fetchedTransaction.version).to.eq(0);
        expect(fetchedTransaction.meta?.fee).to.be.a('bigint');
        expect(fetchedTransaction.meta?.loadedAddresses).to.eql({
          readonly: [],
          writable: [lookupTableAddresses[0]],
        });
        expect(fetchedTransaction.meta?.computeUnitsConsumed).to.not.be
          .undefined;
        const fetchedMessage = fetchedTransaction.transaction.message;
        invariant(fetchedMessage instanceof MessageV0);
        expect(fetchedMessage.addressTableLookups).to.eql(addressTableLookups);
      }).timeout(30 * 1000);

      it('getParsedTransaction (failure)', async () => {
        try {
          const transaction = await connection.getParsedTransaction(signature, {
            commitment: 'confirmed',
          });
          expect(transaction).to.be.null;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          expect(message).to.include(
            'Transaction version (0) is not supported',
          );
        }
      });

      it('getParsedTransaction', async () => {
        const foundParsedTransaction = await waitFor(async () => {
          const transaction = await connection.getParsedTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });
          return transaction !== null;
        });
        expect(foundParsedTransaction).to.be.true;
        const parsedTransaction = await connection.getParsedTransaction(
          signature,
          {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          },
        );
        expect(parsedTransaction).to.not.be.null;
        if (parsedTransaction === null) {
          return;
        }
        expect(parsedTransaction.slot).to.be.a('bigint');
        expect(parsedTransaction.version).to.eq(0);
        // loaded addresses are not returned for parsed transactions
        expect(parsedTransaction.meta?.loadedAddresses).to.be.undefined;
        expect(parsedTransaction.meta?.fee).to.be.a('bigint');
        expect(parsedTransaction.meta?.computeUnitsConsumed).to.not.be
          .undefined;
        expect(
          parsedTransaction.transaction.message.addressTableLookups,
        ).to.eql(addressTableLookups);
        expect(parsedTransaction.transaction.message.accountKeys).to.eql([
          {
            pubkey: payer.publicKey,
            signer: true,
            writable: true,
            source: 'transaction',
          },
          {
            pubkey: SystemProgram.programId,
            signer: false,
            writable: false,
            source: 'transaction',
          },
          {
            pubkey: lookupTableAddresses[0],
            signer: false,
            writable: true,
            source: 'lookupTable',
          },
        ]);
      }).timeout(30 * 1000);

      it('getBlock (failure)', async () => {
        const slot = await ensureTransactionSlot();
        try {
          const block = await connection.getBlock(slot, {
            commitment: 'confirmed',
          });
          expect(block).to.be.null;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          expect(message).to.include(
            'Transaction version (0) is not supported',
          );
        }
      }).timeout(30 * 1000);

      it('getBlock', async () => {
        const slot = await ensureTransactionSlot();
        const foundBlock = await waitFor(async () => {
          const found = await connection.getBlock(slot, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed',
          });
          return found !== null;
        });
        expect(foundBlock).to.be.true;
        const block = await connection.getBlock(slot, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed',
        });
        expect(block).to.not.be.null;
        if (block === null) throw new Error(); // unreachable

        let foundTx = false;
        for (const tx of block.transactions) {
          if (tx.transaction.signatures[0] === signature) {
            foundTx = true;
            expect(tx.version).to.eq(0);
          }
        }
        expect(foundTx).to.be.true;
      }).timeout(30 * 1000);

      it('getParsedBlock', async () => {
        const slot = await ensureTransactionSlot();
        const foundParsedBlock = await waitFor(async () => {
          const found = await connection.getParsedBlock(slot, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed',
          });
          return found !== null;
        });
        expect(foundParsedBlock).to.be.true;
        const block = await connection.getParsedBlock(slot, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed',
        });
        expect(block).to.not.be.null;
        if (block === null) throw new Error(); // unreachable

        let foundTx = false;
        for (const tx of block.transactions) {
          if (tx.transaction.signatures[0] === signature) {
            foundTx = true;
            expect(tx.version).to.eq(0);
          }
        }
        expect(foundTx).to.be.true;
      }).timeout(30 * 1000);
    }).timeout(30 * 1000);
  }
});
