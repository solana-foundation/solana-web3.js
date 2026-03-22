import { Buffer } from 'buffer';
import { Address as Address$1 } from '@solana/addresses';
import { ReadonlyUint8Array } from '@solana/codecs-core';
import * as _solana_rpc_types from '@solana/rpc-types';
import { Commitment } from '@solana/rpc-types';
export { Commitment } from '@solana/rpc-types';
import { GetRecentPrioritizationFeesApi, GetInflationRateApi, GetEpochInfoApi, GetBlockProductionApi, GetRecentPerformanceSamplesApi, GetBlockTimeApi, GetFirstAvailableBlockApi, GetTokenSupplyApi, GetTokenAccountBalanceApi, GetSlotApi, GetFeeForMessageApi, IsBlockhashValidApi, GetBlockCommitmentApi, GetStakeMinimumDelegationApi, GetClusterNodesApi, GetTokenLargestAccountsApi, GetLargestAccountsApi } from '@solana/rpc-api';

/**
 * Blockhash as Base58 string.
 */
type Blockhash = string;

/**
 * Maximum length of derived pubkey seed
 */
declare const MAX_SEED_LENGTH = 32;
/**
 * Size of public key in bytes
 */
declare const PUBLIC_KEY_LENGTH = 32;
/**
 * Value to be converted into public key
 */
type AddressInitData = number | bigint | string | Uint8Array | ReadonlyUint8Array | Array<number> | Address | Address$1;
/**
 * A Solana address
 */
declare class Address {
    private readonly _publicKeyBytes;
    /**
     * Create a new Address object
     * @param value ed25519 public key as bytes or base-58 encoded string
     */
    constructor(value: AddressInitData);
    /**
     * Returns a unique PublicKey for tests and benchmarks using a counter
     * @deprecated To be removed in v3, and replaced with test-specific utilities for generating unique public keys.
     */
    static unique(): Address;
    /**
     * Default public key value. The base58-encoded string representation is all ones (as seen below)
     * The underlying number is 32 bytes that are all zeros
     */
    static default: Address;
    /**
     * Checks if two publicKeys are equal
     */
    equals(address: Address): boolean;
    /**
     * Return the base-58 representation of the public key
     */
    toBase58(): string;
    toJSON(): string;
    /**
     * Return the byte array representation of the public key in big endian
     */
    toBytes(): Uint8Array;
    /**
     * Verify a signature for the provided message with this public key.
     * @since 2.0.0
     */
    verifySignature(signature: Uint8Array, message: Uint8Array): Promise<boolean>;
    /**
     * Verify a signature for the provided message with this public key.
     * @deprecated Deprecated: scheduled for removal in v3. Use {@link verifySignature} instead.
     */
    verifySignatureSync(signature: Uint8Array, message: Uint8Array): boolean;
    /**
     * Return the Buffer representation of the public key in big endian
     * @deprecated Deprecated: scheduled for removal in v3. Use {@link toBytes} instead.
     */
    toBuffer(): Buffer;
    /**
     * Borsh-compatible encoding (little-endian)
     */
    encode(): Uint8Array;
    /**
     * Borsh-compatible decoding (little-endian)
     */
    static decode(data: Uint8Array | Array<number>): Address;
    /**
     * Borsh-compatible unchecked decoding (little-endian)
     */
    static decodeUnchecked(data: Uint8Array | Array<number>): Address;
    get [Symbol.toStringTag](): string;
    /**
     * Return the base-58 representation of the public key
     */
    toString(): string;
    /**
     * Derive a public key from another key, a seed, and a program ID.
     * The program ID will also serve as the owner of the public key, giving
     * it permission to write data to the account.
     */
    static createWithSeed(fromAddress: Address, seed: string, programId: Address): Promise<Address>;
    /**
     * Sync version of createProgramAddress
     * For backwards compatibility
     *
     * @deprecated Use {@link createProgramAddress} instead
     */
    static createProgramAddressSync(seeds: Array<Uint8Array | ReadonlyUint8Array>, programId: Address): Address;
    /**
     * Derive a program address from seeds and a program ID.
     */
    static createProgramAddress(seeds: Array<Uint8Array | ReadonlyUint8Array>, programId: Address): Promise<Address>;
    /**
     * Find a valid program address
     *
     * Valid program addresses must fall off the ed25519 curve.  This function
     * iterates a nonce until it finds one that when combined with the seeds
     * results in a valid program address.
     */
    static findProgramAddressSync(seeds: Array<Uint8Array | ReadonlyUint8Array>, programId: Address): [Address, number];
    /**
     * Async version of findProgramAddressSync
     * For backwards compatibility
     *
     * @deprecated Use {@link findProgramAddressSync} instead
     */
    static findProgramAddress(seeds: Array<Uint8Array | ReadonlyUint8Array>, programId: Address): Promise<[Address, number]>;
    /**
     * Check that a pubkey is on the ed25519 curve.
     */
    static isOnCurve(addressData: AddressInitData): boolean;
}

declare const BPF_LOADER_DEPRECATED_PROGRAM_ID: Address;

/**
 * Epoch schedule
 * (see https://docs.solana.com/terminology#epoch)
 * Can be retrieved with the {@link Connection.getEpochSchedule} method
 */
declare class EpochSchedule {
    /** The maximum number of slots in each epoch */
    slotsPerEpoch: bigint;
    /** The number of slots before beginning of an epoch to calculate a leader schedule for that epoch */
    leaderScheduleSlotOffset: bigint;
    /** Indicates whether epochs start short and grow */
    warmup: boolean;
    /** The first epoch with `slotsPerEpoch` slots */
    firstNormalEpoch: bigint;
    /** The first slot of `firstNormalEpoch` */
    firstNormalSlot: bigint;
    constructor(slotsPerEpoch: bigint, leaderScheduleSlotOffset: bigint, warmup: boolean, firstNormalEpoch: bigint, firstNormalSlot: bigint);
    getEpoch(slot: bigint): bigint;
    getEpochAndSlotIndex(slot: bigint): [bigint, bigint];
    getFirstSlotInEpoch(epoch: bigint): bigint;
    getLastSlotInEpoch(epoch: bigint): bigint;
    getSlotsInEpoch(epoch: bigint): bigint;
}

declare const NONCE_ACCOUNT_LENGTH = 80;
/**
 * A durable nonce is a 32 byte value encoded as a base58 string.
 */
type DurableNonce = string;
/**
 * NonceAccount class
 */
declare class NonceAccount {
    authorizedPubkey: Address;
    nonce: DurableNonce;
    feeCalculator: {
        lamportsPerSignature: number;
    };
    /**
     * Deserialize NonceAccount from the account data.
     *
     * @param buffer account data
     * @return NonceAccount
     */
    static fromAccountData(buffer: Uint8Array | Array<number>): NonceAccount;
}

/**
 * Keypair signer interface
 */
interface Signer {
    publicKey: Address;
    secretKey?: Uint8Array;
    signBytes(message: Uint8Array): Promise<Uint8Array>;
}
/**
 * An account keypair backed by WebCrypto.
 */
declare class Keypair implements Signer {
    #private;
    private constructor();
    /**
     * Generate a new random keypair
     *
     * @returns {Promise<Keypair>} Keypair
     */
    static generate(): Promise<Keypair>;
    /**
     * Create a keypair from a raw 64-byte secret key byte array.
     */
    static fromSecretKey(secretKey: Uint8Array): Promise<Keypair>;
    /**
     * Create a keypair from a 32-byte seed.
     */
    static fromSeed(seed: Uint8Array): Promise<Keypair>;
    /**
     * The public key for this keypair
     *
     * @returns {Address} Address
     */
    get publicKey(): Address;
    /**
     * Returns this keypair's secret key bytes.
     */
    get secretKey(): Uint8Array;
    /**
     * Sign a message using this keypair.
     */
    signBytes(message: Uint8Array): Promise<Uint8Array>;
    /**
     * Verify a signature using this keypair's public key.
     */
    verifySignature(signature: Uint8Array, message: Uint8Array): Promise<boolean>;
}

/**
 * Maximum over-the-wire size of a Transaction
 *
 * 1280 is IPv6 minimum MTU
 * 40 bytes is the size of the IPv6 header
 * 8 bytes is the size of the fragment header
 */
declare const PACKET_DATA_SIZE: number;
declare const VERSION_PREFIX_MASK = 127;
declare const SIGNATURE_LENGTH_IN_BYTES = 64;

declare class TransactionExpiredBlockheightExceededError extends Error {
    signature: string;
    constructor(signature: string);
}
declare class TransactionExpiredTimeoutError extends Error {
    signature: string;
    constructor(signature: string, timeoutSeconds: number);
}
declare class TransactionExpiredNonceInvalidError extends Error {
    signature: string;
    constructor(signature: string);
}

type AccountKeysFromLookups = LoadedAddresses;
declare class MessageAccountKeys {
    staticAccountKeys: Array<Address>;
    accountKeysFromLookups?: AccountKeysFromLookups;
    constructor(staticAccountKeys: Array<Address>, accountKeysFromLookups?: AccountKeysFromLookups);
    keySegments(): Array<Array<Address>>;
    get(index: number): Address | undefined;
    get length(): number;
    compileInstructions(instructions: Array<TransactionInstruction>): Array<MessageCompiledInstruction>;
}

/**
 * An instruction to execute by a program
 *
 * @property {number} programIdIndex
 * @property {number[]} accounts
 * @property {string} data
 */
type CompiledInstruction = {
    /** Index into the transaction keys array indicating the program account that executes this instruction */
    programIdIndex: number;
    /** Ordered indices into the transaction keys array indicating which accounts to pass to the program */
    accounts: number[];
    /** The program input data encoded as base 58 */
    data: string;
};
/**
 * Message constructor arguments
 */
type MessageArgs = {
    /** The message header, identifying signed and read-only `accountKeys` */
    header: MessageHeader;
    /** All the account keys used by this transaction */
    accountKeys: string[] | Address[];
    /** The hash of a recent ledger block */
    recentBlockhash: Blockhash;
    /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
    instructions: CompiledInstruction[];
};
type CompileLegacyArgs = {
    payerKey: Address;
    instructions: Array<TransactionInstruction>;
    recentBlockhash: Blockhash;
};
/**
 * List of instructions to be processed atomically
 */
declare class Message {
    header: MessageHeader;
    accountKeys: Address[];
    recentBlockhash: Blockhash;
    instructions: CompiledInstruction[];
    private indexToProgramIds;
    constructor(args: MessageArgs);
    get version(): 'legacy';
    get staticAccountKeys(): Array<Address>;
    get compiledInstructions(): Array<MessageCompiledInstruction>;
    get addressTableLookups(): Array<MessageAddressTableLookup>;
    getAccountKeys(): MessageAccountKeys;
    static compile(args: CompileLegacyArgs): Message;
    isAccountSigner(index: number): boolean;
    isAccountWritable(index: number): boolean;
    isProgramId(index: number): boolean;
    programIds(): Address[];
    nonProgramIds(): Address[];
    serialize(): Uint8Array;
    /**
     * Decode a compiled message into a Message object.
     */
    static from(buffer: Uint8Array | Array<number>): Message;
}

type AddressLookupTableState = {
    deactivationSlot: bigint;
    lastExtendedSlot: number;
    lastExtendedSlotStartIndex: number;
    authority?: Address;
    addresses: Array<Address>;
};
type AddressLookupTableAccountArgs = {
    key: Address;
    state: AddressLookupTableState;
};
declare class AddressLookupTableAccount {
    key: Address;
    state: AddressLookupTableState;
    constructor(args: AddressLookupTableAccountArgs);
    isActive(): boolean;
    static deserialize(accountData: Uint8Array): AddressLookupTableState;
}

type CreateLookupTableParams = {
    /** Account used to derive and control the new address lookup table. */
    authority: Address;
    /** Account that will fund the new address lookup table. */
    payer: Address;
    /** A recent slot must be used in the derivation path for each initialized table. */
    recentSlot: bigint | number;
};
type FreezeLookupTableParams = {
    /** Address lookup table account to freeze. */
    lookupTable: Address;
    /** Account which is the current authority. */
    authority: Address;
};
type ExtendLookupTableParams = {
    /** Address lookup table account to extend. */
    lookupTable: Address;
    /** Account which is the current authority. */
    authority: Address;
    /** Account that will fund the table reallocation.
     * Not required if the reallocation has already been funded. */
    payer?: Address;
    /** List of Public Keys to be added to the lookup table. */
    addresses: Array<Address>;
};
type DeactivateLookupTableParams = {
    /** Address lookup table account to deactivate. */
    lookupTable: Address;
    /** Account which is the current authority. */
    authority: Address;
};
type CloseLookupTableParams = {
    /** Address lookup table account to close. */
    lookupTable: Address;
    /** Account which is the current authority. */
    authority: Address;
    /** Recipient of closed account lamports. */
    recipient: Address;
};
/**
 * An enumeration of valid LookupTableInstructionType's
 */
type LookupTableInstructionType = 'CreateLookupTable' | 'ExtendLookupTable' | 'CloseLookupTable' | 'FreezeLookupTable' | 'DeactivateLookupTable';
declare class AddressLookupTableInstruction {
    static decodeInstructionType(instruction: TransactionInstruction): LookupTableInstructionType;
    static decodeCreateLookupTable(instruction: TransactionInstruction): CreateLookupTableParams;
    static decodeExtendLookupTable(instruction: TransactionInstruction): ExtendLookupTableParams;
    static decodeCloseLookupTable(instruction: TransactionInstruction): CloseLookupTableParams;
    static decodeFreezeLookupTable(instruction: TransactionInstruction): FreezeLookupTableParams;
    static decodeDeactivateLookupTable(instruction: TransactionInstruction): DeactivateLookupTableParams;
}
declare class AddressLookupTableProgram {
    static programId: Address;
    static createLookupTable(params: CreateLookupTableParams): [TransactionInstruction, Address];
    static freezeLookupTable(params: FreezeLookupTableParams): TransactionInstruction;
    static extendLookupTable(params: ExtendLookupTableParams): TransactionInstruction;
    static deactivateLookupTable(params: DeactivateLookupTableParams): TransactionInstruction;
    static closeLookupTable(params: CloseLookupTableParams): TransactionInstruction;
}

/**
 * An enumeration of valid ComputeBudgetInstructionType's
 */
type ComputeBudgetInstructionType = 'RequestUnits' | 'RequestHeapFrame' | 'SetComputeUnitLimit' | 'SetComputeUnitPrice';
/**
 * Request units instruction params
 */
interface RequestUnitsParams {
    /** Units to request for transaction-wide compute */
    units: number;
    /** Prioritization fee lamports */
    additionalFee: number;
}
/**
 * Request heap frame instruction params
 */
type RequestHeapFrameParams = {
    /** Requested transaction-wide program heap size in bytes. Must be multiple of 1024. Applies to each program, including CPIs. */
    bytes: number;
};
/**
 * Set compute unit limit instruction params
 */
interface SetComputeUnitLimitParams {
    /** Transaction-wide compute unit limit */
    units: number;
}
/**
 * Set compute unit price instruction params
 */
interface SetComputeUnitPriceParams {
    /** Transaction compute unit price used for prioritization fees */
    microLamports: number | bigint;
}
/**
 * Factory class for transaction instructions to interact with the Compute Budget program
 */
declare class ComputeBudgetProgram {
    /**
     * Public key that identifies the Compute Budget program
     */
    static programId: Address;
    /**
     * @deprecated Instead, call {@link setComputeUnitLimit} and/or {@link setComputeUnitPrice}
     */
    static requestUnits(params: RequestUnitsParams): TransactionInstruction;
    static requestHeapFrame(params: RequestHeapFrameParams): TransactionInstruction;
    static setComputeUnitLimit(params: SetComputeUnitLimitParams): TransactionInstruction;
    static setComputeUnitPrice(params: SetComputeUnitPriceParams): TransactionInstruction;
}

/**
 * Params for creating an ed25519 instruction using a public key
 */
type CreateEd25519InstructionWithPublicKeyParams = {
    publicKey: Uint8Array;
    message: Uint8Array;
    signature: Uint8Array;
    instructionIndex?: number;
};
/**
 * Params for creating an ed25519 instruction using a private key
 */
type CreateEd25519InstructionWithPrivateKeyParams = {
    privateKey: Uint8Array;
    message: Uint8Array;
    instructionIndex?: number;
};
declare class Ed25519Program {
    /**
     * Public key that identifies the ed25519 program
     */
    static programId: Address;
    /**
     * Create an ed25519 instruction with a public key and signature. The
     * public key must be 32 bytes long, and the signature must be 64 bytes
     * long.
     */
    static createInstructionWithPublicKey(params: CreateEd25519InstructionWithPublicKeyParams): TransactionInstruction;
    /**
     * Create an ed25519 instruction with a private key. The private key
     * must be 64 bytes long.
     */
    static createInstructionWithPrivateKey(params: CreateEd25519InstructionWithPrivateKeyParams): Promise<TransactionInstruction>;
}

/**
 * Params for creating an secp256k1 instruction using a public key
 */
type CreateSecp256k1InstructionWithPublicKeyParams = {
    publicKey: Uint8Array | Array<number>;
    message: Uint8Array | Array<number>;
    signature: Uint8Array | Array<number>;
    recoveryId: number;
    instructionIndex?: number;
};
/**
 * Params for creating an secp256k1 instruction using an Ethereum address
 */
type CreateSecp256k1InstructionWithEthAddressParams = {
    ethAddress: Uint8Array | Array<number> | string;
    message: Uint8Array | Array<number>;
    signature: Uint8Array | Array<number>;
    recoveryId: number;
    instructionIndex?: number;
};
/**
 * Params for creating an secp256k1 instruction using a private key
 */
type CreateSecp256k1InstructionWithPrivateKeyParams = {
    privateKey: Uint8Array | Array<number>;
    message: Uint8Array | Array<number>;
    instructionIndex?: number;
};
declare class Secp256k1Program {
    /**
     * Public key that identifies the secp256k1 program
     */
    static programId: Address;
    /**
     * Construct an Ethereum address from a secp256k1 public key.
     * @param {Uint8Array | Array<number>} publicKey a 64 byte
     * secp256k1 public key
     */
    static publicKeyToEthAddress(publicKey: Uint8Array | Array<number>): Uint8Array;
    /**
     * Create an secp256k1 instruction with a public key. The public key
     * must be 64 bytes long.
     */
    static createInstructionWithPublicKey(params: CreateSecp256k1InstructionWithPublicKeyParams): TransactionInstruction;
    /**
     * Create an secp256k1 instruction with an Ethereum address. The address
     * must be a hex string or 20 raw bytes.
     */
    static createInstructionWithEthAddress(params: CreateSecp256k1InstructionWithEthAddressParams): TransactionInstruction;
    /**
     * Create an secp256k1 instruction with a private key. The private key
     * must be 32 bytes long.
     */
    static createInstructionWithPrivateKey(params: CreateSecp256k1InstructionWithPrivateKeyParams): TransactionInstruction;
}

/**
 * Address of the stake config account which configures the rate
 * of stake warmup and cooldown as well as the slashing penalty.
 */
declare const STAKE_CONFIG_ID: Address;
/**
 * Stake account authority info
 */
declare class Authorized {
    /** stake authority */
    staker: Address;
    /** withdraw authority */
    withdrawer: Address;
    /**
     * Create a new Authorized object
     * @param staker the stake authority
     * @param withdrawer the withdraw authority
     */
    constructor(staker: Address, withdrawer: Address);
}
/**
 * Stake account lockup info
 */
declare class Lockup {
    /** Unix timestamp of lockup expiration */
    unixTimestamp: number;
    /** Epoch of lockup expiration */
    epoch: number;
    /** Lockup custodian authority */
    custodian: Address;
    /**
     * Create a new Lockup object
     */
    constructor(unixTimestamp: number, epoch: number, custodian: Address);
    /**
     * Default, inactive Lockup value
     */
    static default: Lockup;
}
/**
 * Create stake account transaction params
 */
type CreateStakeAccountParams = {
    /** Address of the account which will fund creation */
    fromPubkey: Address;
    /** Address of the new stake account */
    stakePubkey: Address;
    /** Authorities of the new stake account */
    authorized: Authorized;
    /** Lockup of the new stake account */
    lockup?: Lockup;
    /** Funding amount */
    lamports: number;
};
/**
 * Create stake account with seed transaction params
 */
type CreateStakeAccountWithSeedParams = {
    fromPubkey: Address;
    stakePubkey: Address;
    basePubkey: Address;
    seed: string;
    authorized: Authorized;
    lockup?: Lockup;
    lamports: number;
};
/**
 * Initialize stake instruction params
 */
type InitializeStakeParams = {
    stakePubkey: Address;
    authorized: Authorized;
    lockup?: Lockup;
};
/**
 * Delegate stake instruction params
 */
type DelegateStakeParams = {
    stakePubkey: Address;
    authorizedPubkey: Address;
    votePubkey: Address;
};
/**
 * Authorize stake instruction params
 */
type AuthorizeStakeParams = {
    stakePubkey: Address;
    authorizedPubkey: Address;
    newAuthorizedPubkey: Address;
    stakeAuthorizationType: StakeAuthorizationType;
    custodianPubkey?: Address;
};
/**
 * Authorize stake instruction params using a derived key
 */
type AuthorizeWithSeedStakeParams = {
    stakePubkey: Address;
    authorityBase: Address;
    authoritySeed: string;
    authorityOwner: Address;
    newAuthorizedPubkey: Address;
    stakeAuthorizationType: StakeAuthorizationType;
    custodianPubkey?: Address;
};
/**
 * Split stake instruction params
 */
type SplitStakeParams = {
    stakePubkey: Address;
    authorizedPubkey: Address;
    splitStakePubkey: Address;
    lamports: number;
};
/**
 * Split with seed transaction params
 */
type SplitStakeWithSeedParams = {
    stakePubkey: Address;
    authorizedPubkey: Address;
    splitStakePubkey: Address;
    basePubkey: Address;
    seed: string;
    lamports: number;
};
/**
 * Withdraw stake instruction params
 */
type WithdrawStakeParams = {
    stakePubkey: Address;
    authorizedPubkey: Address;
    toPubkey: Address;
    lamports: number;
    custodianPubkey?: Address;
};
/**
 * Deactivate stake instruction params
 */
type DeactivateStakeParams = {
    stakePubkey: Address;
    authorizedPubkey: Address;
};
/**
 * Merge stake instruction params
 */
type MergeStakeParams = {
    stakePubkey: Address;
    sourceStakePubKey: Address;
    authorizedPubkey: Address;
};
/**
 * Stake Instruction class
 */
declare class StakeInstruction {
    /**
     * Decode a stake instruction and retrieve the instruction type.
     */
    static decodeInstructionType(instruction: TransactionInstruction): StakeInstructionType;
    /**
     * Decode a initialize stake instruction and retrieve the instruction params.
     */
    static decodeInitialize(instruction: TransactionInstruction): InitializeStakeParams;
    /**
     * Decode a delegate stake instruction and retrieve the instruction params.
     */
    static decodeDelegate(instruction: TransactionInstruction): DelegateStakeParams;
    /**
     * Decode an authorize stake instruction and retrieve the instruction params.
     */
    static decodeAuthorize(instruction: TransactionInstruction): AuthorizeStakeParams;
    /**
     * Decode an authorize-with-seed stake instruction and retrieve the instruction params.
     */
    static decodeAuthorizeWithSeed(instruction: TransactionInstruction): AuthorizeWithSeedStakeParams;
    /**
     * Decode a split stake instruction and retrieve the instruction params.
     */
    static decodeSplit(instruction: TransactionInstruction): SplitStakeParams;
    /**
     * Decode a merge stake instruction and retrieve the instruction params.
     */
    static decodeMerge(instruction: TransactionInstruction): MergeStakeParams;
    /**
     * Decode a withdraw stake instruction and retrieve the instruction params.
     */
    static decodeWithdraw(instruction: TransactionInstruction): WithdrawStakeParams;
    /**
     * Decode a deactivate stake instruction and retrieve the instruction params.
     */
    static decodeDeactivate(instruction: TransactionInstruction): DeactivateStakeParams;
}
/**
 * An enumeration of valid StakeInstructionType's
 */
type StakeInstructionType = 'Authorize' | 'AuthorizeWithSeed' | 'Deactivate' | 'Delegate' | 'Initialize' | 'Merge' | 'Split' | 'Withdraw';
/**
 * Stake authorization type
 */
type StakeAuthorizationType = {
    /** The Stake Authorization index (from solana-stake-program) */
    index: number;
};
/**
 * An enumeration of valid StakeAuthorizationLayout's
 */
declare const StakeAuthorizationLayout: Readonly<{
    Staker: {
        index: number;
    };
    Withdrawer: {
        index: number;
    };
}>;
/**
 * Factory class for transactions to interact with the Stake program
 */
declare class StakeProgram {
    /**
     * Public key that identifies the Stake program
     */
    static programId: Address;
    /**
     * Max space of a Stake account
     *
     * This is generated from the solana-stake-program StakeState struct as
     * `StakeStateV2::size_of()`:
     * https://docs.rs/solana-stake-program/latest/solana_stake_program/stake_state/enum.StakeStateV2.html
     */
    static space: number;
    /**
     * Generate an Initialize instruction to add to a Stake Create transaction
     */
    static initialize(params: InitializeStakeParams): TransactionInstruction;
    /**
     * Generate a Transaction that creates a new Stake account at
     *   an address generated with `from`, a seed, and the Stake programId
     */
    static createAccountWithSeed(params: CreateStakeAccountWithSeedParams): Transaction;
    /**
     * Generate a Transaction that creates a new Stake account
     */
    static createAccount(params: CreateStakeAccountParams): Transaction;
    /**
     * Generate a Transaction that delegates Stake tokens to a validator
     * Vote Address. This transaction can also be used to redelegate Stake
     * to a new validator Vote Address.
     */
    static delegate(params: DelegateStakeParams): Transaction;
    /**
     * Generate a Transaction that authorizes a new Address as Staker
     * or Withdrawer on the Stake account.
     */
    static authorize(params: AuthorizeStakeParams): Transaction;
    /**
     * Generate a Transaction that authorizes a new Address as Staker
     * or Withdrawer on the Stake account.
     */
    static authorizeWithSeed(params: AuthorizeWithSeedStakeParams): Transaction;
    /**
     * Generate a Transaction that splits Stake tokens into another stake account
     */
    static split(params: SplitStakeParams, rentExemptReserve: number): Transaction;
    /**
     * Generate a Transaction that splits Stake tokens into another account
     * derived from a base public key and seed
     */
    static splitWithSeed(params: SplitStakeWithSeedParams, rentExemptReserve?: number): Transaction;
    /**
     * Generate a Transaction that merges Stake accounts.
     */
    static merge(params: MergeStakeParams): Transaction;
    /**
     * Generate a Transaction that withdraws deactivated Stake tokens.
     */
    static withdraw(params: WithdrawStakeParams): Transaction;
    /**
     * Generate a Transaction that deactivates Stake tokens.
     */
    static deactivate(params: DeactivateStakeParams): Transaction;
}

/**
 * Create account system transaction params
 */
type CreateAccountParams = {
    /** The account that will transfer lamports to the created account */
    fromPubkey: Address;
    /** Public key of the created account */
    newAccountPubkey: Address;
    /** Amount of lamports to transfer to the created account */
    lamports: number;
    /** Amount of space in bytes to allocate to the created account */
    space: number;
    /** Public key of the program to assign as the owner of the created account */
    programId: Address;
};
/**
 * Transfer system transaction params
 */
type TransferParams = {
    /** Account that will transfer lamports */
    fromPubkey: Address;
    /** Account that will receive transferred lamports */
    toPubkey: Address;
    /** Amount of lamports to transfer */
    lamports: number | bigint;
};
/**
 * Assign system transaction params
 */
type AssignParams = {
    /** Public key of the account which will be assigned a new owner */
    accountPubkey: Address;
    /** Public key of the program to assign as the owner */
    programId: Address;
};
/**
 * Create account with seed system transaction params
 */
type CreateAccountWithSeedParams = {
    /** The account that will transfer lamports to the created account */
    fromPubkey: Address;
    /** Public key of the created account. Must be pre-calculated with Address.createWithSeed() */
    newAccountPubkey: Address;
    /** Base public key to use to derive the address of the created account. Must be the same as the base key used to create `newAccountPubkey` */
    basePubkey: Address;
    /** Seed to use to derive the address of the created account. Must be the same as the seed used to create `newAccountPubkey` */
    seed: string;
    /** Amount of lamports to transfer to the created account */
    lamports: number;
    /** Amount of space in bytes to allocate to the created account */
    space: number;
    /** Public key of the program to assign as the owner of the created account */
    programId: Address;
};
/**
 * Create nonce account system transaction params
 */
type CreateNonceAccountParams = {
    /** The account that will transfer lamports to the created nonce account */
    fromPubkey: Address;
    /** Public key of the created nonce account */
    noncePubkey: Address;
    /** Public key to set as authority of the created nonce account */
    authorizedPubkey: Address;
    /** Amount of lamports to transfer to the created nonce account */
    lamports: number;
};
/**
 * Create nonce account with seed system transaction params
 */
type CreateNonceAccountWithSeedParams = {
    /** The account that will transfer lamports to the created nonce account */
    fromPubkey: Address;
    /** Public key of the created nonce account */
    noncePubkey: Address;
    /** Public key to set as authority of the created nonce account */
    authorizedPubkey: Address;
    /** Amount of lamports to transfer to the created nonce account */
    lamports: number;
    /** Base public key to use to derive the address of the nonce account */
    basePubkey: Address;
    /** Seed to use to derive the address of the nonce account */
    seed: string;
};
/**
 * Initialize nonce account system instruction params
 */
type InitializeNonceParams = {
    /** Nonce account which will be initialized */
    noncePubkey: Address;
    /** Public key to set as authority of the initialized nonce account */
    authorizedPubkey: Address;
};
/**
 * Advance nonce account system instruction params
 */
type AdvanceNonceParams = {
    /** Nonce account */
    noncePubkey: Address;
    /** Public key of the nonce authority */
    authorizedPubkey: Address;
};
/**
 * Withdraw nonce account system transaction params
 */
type WithdrawNonceParams = {
    /** Nonce account */
    noncePubkey: Address;
    /** Public key of the nonce authority */
    authorizedPubkey: Address;
    /** Public key of the account which will receive the withdrawn nonce account balance */
    toPubkey: Address;
    /** Amount of lamports to withdraw from the nonce account */
    lamports: number;
};
/**
 * Authorize nonce account system transaction params
 */
type AuthorizeNonceParams = {
    /** Nonce account */
    noncePubkey: Address;
    /** Public key of the current nonce authority */
    authorizedPubkey: Address;
    /** Public key to set as the new nonce authority */
    newAuthorizedPubkey: Address;
};
/**
 * Allocate account system transaction params
 */
type AllocateParams = {
    /** Account to allocate */
    accountPubkey: Address;
    /** Amount of space in bytes to allocate */
    space: number;
};
/**
 * Allocate account with seed system transaction params
 */
type AllocateWithSeedParams = {
    /** Account to allocate */
    accountPubkey: Address;
    /** Base public key to use to derive the address of the allocated account */
    basePubkey: Address;
    /** Seed to use to derive the address of the allocated account */
    seed: string;
    /** Amount of space in bytes to allocate */
    space: number;
    /** Public key of the program to assign as the owner of the allocated account */
    programId: Address;
};
/**
 * Assign account with seed system transaction params
 */
type AssignWithSeedParams = {
    /** Public key of the account which will be assigned a new owner */
    accountPubkey: Address;
    /** Base public key to use to derive the address of the assigned account */
    basePubkey: Address;
    /** Seed to use to derive the address of the assigned account */
    seed: string;
    /** Public key of the program to assign as the owner */
    programId: Address;
};
/**
 * Transfer with seed system transaction params
 */
type TransferWithSeedParams = {
    /** Account that will transfer lamports */
    fromPubkey: Address;
    /** Base public key to use to derive the funding account address */
    basePubkey: Address;
    /** Account that will receive transferred lamports */
    toPubkey: Address;
    /** Amount of lamports to transfer */
    lamports: number | bigint;
    /** Seed to use to derive the funding account address */
    seed: string;
    /** Program id to use to derive the funding account address */
    programId: Address;
};
/** Decoded transfer system transaction instruction */
type DecodedTransferInstruction = {
    /** Account that will transfer lamports */
    fromPubkey: Address;
    /** Account that will receive transferred lamports */
    toPubkey: Address;
    /** Amount of lamports to transfer */
    lamports: bigint;
};
/** Decoded transferWithSeed system transaction instruction */
type DecodedTransferWithSeedInstruction = {
    /** Account that will transfer lamports */
    fromPubkey: Address;
    /** Base public key to use to derive the funding account address */
    basePubkey: Address;
    /** Account that will receive transferred lamports */
    toPubkey: Address;
    /** Amount of lamports to transfer */
    lamports: bigint;
    /** Seed to use to derive the funding account address */
    seed: string;
    /** Program id to use to derive the funding account address */
    programId: Address;
};
/**
 * System Instruction class
 */
declare class SystemInstruction {
    /**
     * Decode a system instruction and retrieve the instruction type.
     */
    static decodeInstructionType(instruction: TransactionInstruction): SystemInstructionType;
    /**
     * Decode a create account system instruction and retrieve the instruction params.
     */
    static decodeCreateAccount(instruction: TransactionInstruction): CreateAccountParams;
    /**
     * Decode a transfer system instruction and retrieve the instruction params.
     */
    static decodeTransfer(instruction: TransactionInstruction): DecodedTransferInstruction;
    /**
     * Decode a transfer with seed system instruction and retrieve the instruction params.
     */
    static decodeTransferWithSeed(instruction: TransactionInstruction): DecodedTransferWithSeedInstruction;
    /**
     * Decode an allocate system instruction and retrieve the instruction params.
     */
    static decodeAllocate(instruction: TransactionInstruction): AllocateParams;
    /**
     * Decode an allocate with seed system instruction and retrieve the instruction params.
     */
    static decodeAllocateWithSeed(instruction: TransactionInstruction): AllocateWithSeedParams;
    /**
     * Decode an assign system instruction and retrieve the instruction params.
     */
    static decodeAssign(instruction: TransactionInstruction): AssignParams;
    /**
     * Decode an assign with seed system instruction and retrieve the instruction params.
     */
    static decodeAssignWithSeed(instruction: TransactionInstruction): AssignWithSeedParams;
    /**
     * Decode a create account with seed system instruction and retrieve the instruction params.
     */
    static decodeCreateWithSeed(instruction: TransactionInstruction): CreateAccountWithSeedParams;
    /**
     * Decode a nonce initialize system instruction and retrieve the instruction params.
     */
    static decodeNonceInitialize(instruction: TransactionInstruction): InitializeNonceParams;
    /**
     * Decode a nonce advance system instruction and retrieve the instruction params.
     */
    static decodeNonceAdvance(instruction: TransactionInstruction): AdvanceNonceParams;
    /**
     * Decode a nonce withdraw system instruction and retrieve the instruction params.
     */
    static decodeNonceWithdraw(instruction: TransactionInstruction): WithdrawNonceParams;
    /**
     * Decode a nonce authorize system instruction and retrieve the instruction params.
     */
    static decodeNonceAuthorize(instruction: TransactionInstruction): AuthorizeNonceParams;
}
/**
 * An enumeration of valid SystemInstructionType's
 */
type SystemInstructionType = 'AdvanceNonceAccount' | 'Allocate' | 'AllocateWithSeed' | 'Assign' | 'AssignWithSeed' | 'AuthorizeNonceAccount' | 'Create' | 'CreateWithSeed' | 'InitializeNonceAccount' | 'Transfer' | 'TransferWithSeed' | 'WithdrawNonceAccount' | 'UpgradeNonceAccount';
/**
 * Factory class for transactions to interact with the System program
 */
declare class SystemProgram {
    /**
     * Public key that identifies the System program
     */
    static programId: Address;
    /**
     * Generate a transaction instruction that creates a new account
     */
    static createAccount(params: CreateAccountParams): TransactionInstruction;
    /**
     * Generate a transaction instruction that transfers lamports from one account to another
     */
    static transfer(params: TransferParams | TransferWithSeedParams): TransactionInstruction;
    /**
     * Generate a transaction instruction that assigns an account to a program
     */
    static assign(params: AssignParams | AssignWithSeedParams): TransactionInstruction;
    /**
     * Generate a transaction instruction that creates a new account at
     *   an address generated with `from`, a seed, and programId
     */
    static createAccountWithSeed(params: CreateAccountWithSeedParams): TransactionInstruction;
    /**
     * Generate a transaction that creates a new Nonce account
     */
    static createNonceAccount(params: CreateNonceAccountParams | CreateNonceAccountWithSeedParams): Transaction;
    /**
     * Generate an instruction to initialize a Nonce account
     */
    static nonceInitialize(params: InitializeNonceParams): TransactionInstruction;
    /**
     * Generate an instruction to advance the nonce in a Nonce account
     */
    static nonceAdvance(params: AdvanceNonceParams): TransactionInstruction;
    /**
     * Generate a transaction instruction that withdraws lamports from a Nonce account
     */
    static nonceWithdraw(params: WithdrawNonceParams): TransactionInstruction;
    /**
     * Generate a transaction instruction that authorizes a new Address as the authority
     * on a Nonce account.
     */
    static nonceAuthorize(params: AuthorizeNonceParams): TransactionInstruction;
    /**
     * Generate a transaction instruction that allocates space in an account without funding
     */
    static allocate(params: AllocateParams | AllocateWithSeedParams): TransactionInstruction;
}

/**
 * Vote account info
 */
declare class VoteInit {
    nodePubkey: Address;
    authorizedVoter: Address;
    authorizedWithdrawer: Address;
    commission: number; /** [0, 100] */
    constructor(nodePubkey: Address, authorizedVoter: Address, authorizedWithdrawer: Address, commission: number);
}
/**
 * Create vote account transaction params
 */
type CreateVoteAccountParams = {
    fromPubkey: Address;
    votePubkey: Address;
    voteInit: VoteInit;
    lamports: number;
};
/**
 * InitializeAccount instruction params
 */
type InitializeAccountParams = {
    votePubkey: Address;
    nodePubkey: Address;
    voteInit: VoteInit;
};
/**
 * Authorize instruction params
 */
type AuthorizeVoteParams = {
    votePubkey: Address;
    /** Current vote or withdraw authority, depending on `voteAuthorizationType` */
    authorizedPubkey: Address;
    newAuthorizedPubkey: Address;
    voteAuthorizationType: VoteAuthorizationType;
};
/**
 * AuthorizeWithSeed instruction params
 */
type AuthorizeVoteWithSeedParams = {
    currentAuthorityDerivedKeyBasePubkey: Address;
    currentAuthorityDerivedKeyOwnerPubkey: Address;
    currentAuthorityDerivedKeySeed: string;
    newAuthorizedPubkey: Address;
    voteAuthorizationType: VoteAuthorizationType;
    votePubkey: Address;
};
/**
 * Withdraw from vote account transaction params
 */
type WithdrawFromVoteAccountParams = {
    votePubkey: Address;
    authorizedWithdrawerPubkey: Address;
    lamports: number;
    toPubkey: Address;
};
/**
 * Update validator identity (node pubkey) vote account instruction params.
 */
type UpdateValidatorIdentityParams = {
    votePubkey: Address;
    authorizedWithdrawerPubkey: Address;
    nodePubkey: Address;
};
/**
 * Vote Instruction class
 */
declare class VoteInstruction {
    /**
     * Decode a vote instruction and retrieve the instruction type.
     */
    static decodeInstructionType(instruction: TransactionInstruction): VoteInstructionType;
    /**
     * Decode an initialize vote instruction and retrieve the instruction params.
     */
    static decodeInitializeAccount(instruction: TransactionInstruction): InitializeAccountParams;
    /**
     * Decode an authorize instruction and retrieve the instruction params.
     */
    static decodeAuthorize(instruction: TransactionInstruction): AuthorizeVoteParams;
    /**
     * Decode an authorize instruction and retrieve the instruction params.
     */
    static decodeAuthorizeWithSeed(instruction: TransactionInstruction): AuthorizeVoteWithSeedParams;
    /**
     * Decode a withdraw instruction and retrieve the instruction params.
     */
    static decodeWithdraw(instruction: TransactionInstruction): WithdrawFromVoteAccountParams;
}
/**
 * An enumeration of valid VoteInstructionType's
 */
type VoteInstructionType = 'Authorize' | 'AuthorizeWithSeed' | 'InitializeAccount' | 'Withdraw' | 'UpdateValidatorIdentity';
/**
 * VoteAuthorize type
 */
type VoteAuthorizationType = {
    /** The VoteAuthorize index (from solana-vote-program) */
    index: number;
};
/**
 * An enumeration of valid VoteAuthorization layouts.
 */
declare const VoteAuthorizationLayout: Readonly<{
    Voter: {
        index: number;
    };
    Withdrawer: {
        index: number;
    };
}>;
/**
 * Factory class for transactions to interact with the Vote program
 */
declare class VoteProgram {
    /**
     * Public key that identifies the Vote program
     */
    static programId: Address;
    /**
     * Max space of a Vote account
     *
     * This is generated from the solana-vote-program VoteState struct as
     * `VoteState::size_of()`:
     * https://docs.rs/solana-vote-program/1.9.5/solana_vote_program/vote_state/struct.VoteState.html#method.size_of
     *
     * KEEP IN SYNC WITH `VoteState::size_of()` in https://github.com/solana-labs/solana/blob/a474cb24b9238f5edcc982f65c0b37d4a1046f7e/sdk/program/src/vote/state/mod.rs#L340-L342
     */
    static space: number;
    /**
     * Generate an Initialize instruction.
     */
    static initializeAccount(params: InitializeAccountParams): TransactionInstruction;
    /**
     * Generate a transaction that creates a new Vote account.
     */
    static createAccount(params: CreateVoteAccountParams): Transaction;
    /**
     * Generate a transaction that authorizes a new Voter or Withdrawer on the Vote account.
     */
    static authorize(params: AuthorizeVoteParams): Transaction;
    /**
     * Generate a transaction that authorizes a new Voter or Withdrawer on the Vote account
     * where the current Voter or Withdrawer authority is a derived key.
     */
    static authorizeWithSeed(params: AuthorizeVoteWithSeedParams): Transaction;
    /**
     * Generate a transaction to withdraw from a Vote account.
     */
    static withdraw(params: WithdrawFromVoteAccountParams): Transaction;
    /**
     * Generate a transaction to withdraw safely from a Vote account.
     *
     * This function was created as a safeguard for vote accounts running validators, `safeWithdraw`
     * checks that the withdraw amount will not exceed the specified balance while leaving enough left
     * to cover rent. If you wish to close the vote account by withdrawing the full amount, call the
     * `withdraw` method directly.
     */
    static safeWithdraw(params: WithdrawFromVoteAccountParams, currentVoteAccountBalance: number, rentExemptMinimum: number): Transaction;
    /**
     * Generate a transaction to update the validator identity (node pubkey) of a Vote account.
     */
    static updateValidatorIdentity(params: UpdateValidatorIdentityParams): Transaction;
}

/**
 * Message constructor arguments
 */
type MessageV0Args = {
    /** The message header, identifying signed and read-only `accountKeys` */
    header: MessageHeader;
    /** The static account keys used by this transaction */
    staticAccountKeys: Address[];
    /** The hash of a recent ledger block */
    recentBlockhash: Blockhash;
    /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
    compiledInstructions: MessageCompiledInstruction[];
    /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
    addressTableLookups: MessageAddressTableLookup[];
};
type CompileV0Args = {
    payerKey: Address;
    instructions: Array<TransactionInstruction>;
    recentBlockhash: Blockhash;
    addressLookupTableAccounts?: Array<AddressLookupTableAccount>;
};
type GetAccountKeysArgs = {
    accountKeysFromLookups?: AccountKeysFromLookups | null;
} | {
    addressLookupTableAccounts?: AddressLookupTableAccount[] | null;
};
declare class MessageV0 {
    header: MessageHeader;
    staticAccountKeys: Array<Address>;
    recentBlockhash: Blockhash;
    compiledInstructions: Array<MessageCompiledInstruction>;
    addressTableLookups: Array<MessageAddressTableLookup>;
    constructor(args: MessageV0Args);
    get version(): 0;
    get numAccountKeysFromLookups(): number;
    getAccountKeys(args?: GetAccountKeysArgs): MessageAccountKeys;
    isAccountSigner(index: number): boolean;
    isAccountWritable(index: number): boolean;
    resolveAddressTableLookups(addressLookupTableAccounts: AddressLookupTableAccount[]): AccountKeysFromLookups;
    static compile(args: CompileV0Args): MessageV0;
    serialize(): Uint8Array;
    private serializeInstructions;
    private serializeAddressTableLookups;
    static deserialize(serializedMessage: Uint8Array): MessageV0;
}

type VersionedMessage = Message | MessageV0;
declare const VersionedMessage: {
    deserializeMessageVersion(serializedMessage: Uint8Array): "legacy" | number;
    deserialize: (serializedMessage: Uint8Array) => VersionedMessage;
};

/**
 * The message header, identifying signed and read-only account
 */
type MessageHeader = {
    /**
     * The number of signatures required for this message to be considered valid. The
     * signatures must match the first `numRequiredSignatures` of `accountKeys`.
     */
    numRequiredSignatures: number;
    /** The last `numReadonlySignedAccounts` of the signed keys are read-only accounts */
    numReadonlySignedAccounts: number;
    /** The last `numReadonlySignedAccounts` of the unsigned keys are read-only accounts */
    numReadonlyUnsignedAccounts: number;
};
/**
 * An address table lookup used to load additional accounts
 */
type MessageAddressTableLookup = {
    accountKey: Address;
    writableIndexes: Array<number>;
    readonlyIndexes: Array<number>;
};
/**
 * An instruction to execute by a program
 *
 * @property {number} programIdIndex
 * @property {number[]} accountKeyIndexes
 * @property {Uint8Array} data
 */
type MessageCompiledInstruction = {
    /** Index into the transaction keys array indicating the program account that executes this instruction */
    programIdIndex: number;
    /** Ordered indices into the transaction keys array indicating which accounts to pass to the program */
    accountKeyIndexes: number[];
    /** The program input data */
    data: Uint8Array;
};

type TransactionSigner = Signer;
/**
 * Transaction signature as base-58 encoded string
 */
type TransactionSignature = string;
declare const enum TransactionStatus {
    BLOCKHEIGHT_EXCEEDED = 0,
    PROCESSED = 1,
    TIMED_OUT = 2,
    NONCE_INVALID = 3
}
/**
 * Account metadata used to define instructions
 */
type AccountMeta = {
    /** An account's public key */
    pubkey: Address;
    /** True if an instruction requires a transaction signature matching `pubkey` */
    isSigner: boolean;
    /** True if the `pubkey` can be loaded as a read-write account. */
    isWritable: boolean;
};
/**
 * List of TransactionInstruction object fields that may be initialized at construction
 */
type TransactionInstructionCtorFields = {
    keys: Array<AccountMeta>;
    programId: Address;
    data?: Uint8Array;
};
/**
 * Configuration object for Transaction.serialize()
 */
type SerializeConfig = {
    /** Require all transaction signatures be present (default: true) */
    requireAllSignatures?: boolean;
    /** Verify provided signatures (default: true) */
    verifySignatures?: boolean;
};
/**
 * Transaction Instruction class
 */
declare class TransactionInstruction {
    /**
     * Public keys to include in this transaction
     * Boolean represents whether this pubkey needs to sign the transaction
     */
    keys: Array<AccountMeta>;
    /**
     * Program Id to execute
     */
    programId: Address;
    /**
     * Program input
     */
    private _data;
    get data(): Uint8Array;
    set data(data: Uint8Array);
    constructor(opts: TransactionInstructionCtorFields);
}
/**
 * Pair of signature and corresponding public key
 */
type SignaturePubkeyPair = {
    signature: Uint8Array | null;
    publicKey: Address;
};
/**
 * List of Transaction object fields that may be initialized at construction
 */
type TransactionCtorFields_DEPRECATED = {
    /** Optional nonce information used for offline nonce'd transactions */
    nonceInfo?: NonceInformation | null;
    /** The transaction fee payer */
    feePayer?: Address | null;
    /** One or more signatures */
    signatures?: Array<{
        signature: Uint8Array | null;
        publicKey: Address;
    }>;
    /** A recent blockhash */
    recentBlockhash?: Blockhash;
};
type TransactionCtorFields = TransactionCtorFields_DEPRECATED;
/**
 * Blockhash-based transactions have a lifetime that are defined by
 * the blockhash they include. Any transaction whose blockhash is
 * too old will be rejected.
 */
type TransactionBlockhashCtor = {
    /** The transaction fee payer */
    feePayer?: Address | null;
    /** One or more signatures */
    signatures?: Array<SignaturePubkeyPair>;
    /** A recent blockhash */
    blockhash: Blockhash;
    /** the last block chain can advance to before tx is declared expired */
    lastValidBlockHeight: number;
};
/**
 * Use these options to construct a durable nonce transaction.
 */
type TransactionNonceCtor = {
    /** The transaction fee payer */
    feePayer?: Address | null;
    minContextSlot: number;
    nonceInfo: NonceInformation;
    /** One or more signatures */
    signatures?: Array<SignaturePubkeyPair>;
};
/**
 * Nonce information to be used to build an offline Transaction.
 */
type NonceInformation = {
    /** The current blockhash stored in the nonce */
    nonce: Blockhash;
    /** AdvanceNonceAccount Instruction */
    nonceInstruction: TransactionInstruction;
};
/**
 * Transaction class
 */
declare class Transaction {
    /**
     * Signatures for the transaction.  Typically created by invoking the
     * `sign()` method
     */
    signatures: Array<SignaturePubkeyPair>;
    /**
     * The first (payer) Transaction signature
     *
     * @returns {Uint8Array | null} The payer's signature bytes
     */
    get signature(): Uint8Array | null;
    /**
     * The transaction fee payer
     */
    feePayer?: Address;
    /**
     * The instructions to atomically execute
     */
    instructions: Array<TransactionInstruction>;
    /**
     * A recent transaction id. Must be populated by the caller
     */
    recentBlockhash?: Blockhash;
    /**
     * the last block chain can advance to before tx is declared expired
     * */
    lastValidBlockHeight?: number;
    /**
     * Optional Nonce information. If populated, transaction will use a durable
     * Nonce hash instead of a recentBlockhash. Must be populated by the caller
     */
    nonceInfo?: NonceInformation;
    /**
     * If this is a nonce transaction this represents the minimum slot from which
     * to evaluate if the nonce has advanced when attempting to confirm the
     * transaction. This protects against a case where the transaction confirmation
     * logic loads the nonce account from an old slot and assumes the mismatch in
     * nonce value implies that the nonce has been advanced.
     */
    minNonceContextSlot?: number;
    constructor(opts?: TransactionBlockhashCtor);
    constructor(opts?: TransactionNonceCtor);
    /**
     * @deprecated `TransactionCtorFields` has been deprecated and will be removed in a future version.
     * Please supply a `TransactionBlockhashCtor` instead.
     */
    constructor(opts?: TransactionCtorFields_DEPRECATED);
    /**
     * Add one or more instructions to this Transaction
     *
     * @param {Array< Transaction | TransactionInstruction | TransactionInstructionCtorFields >} items - Instructions to add to the Transaction
     */
    add(...items: Array<Transaction | TransactionInstruction | TransactionInstructionCtorFields>): Transaction;
    /**
     * Compile transaction data
     */
    compileMessage(): Message;
    /**
     * Get the Transaction data that need to be covered by signatures
     */
    serializeMessage(): Uint8Array;
    /**
     * Get the estimated fee associated with a transaction
     *
     * @param {Connection} connection Connection to RPC Endpoint.
     *
     * @returns {Promise<bigint | null>} The estimated fee for the transaction
     */
    getEstimatedFee(connection: Connection): Promise<Awaited<ReturnType<Connection['getFeeForMessage']>>['value']>;
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
    setSigners(...signers: Array<Address>): void;
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
    sign(...signers: Array<TransactionSigner>): Promise<void>;
    /**
     * Partially sign a transaction with the specified accounts. All accounts must
     * correspond to either the fee payer or a signer account in the transaction
     * instructions.
     *
     * All the caveats from the `sign` method apply to `partialSign`
     *
     * @param {Array<Signer>} signers Array of signers that will sign the transaction
     */
    partialSign(...signers: Array<TransactionSigner>): Promise<void>;
    private _dedupeSigners;
    /**
     * Add an externally created signature to a transaction. The public key
     * must correspond to either the fee payer or a signer account in the transaction
     * instructions.
     *
     * @param {Address} pubkey Public key that will be added to the transaction.
     * @param {Uint8Array} signature An externally created signature to add to the transaction.
     */
    addSignature(pubkey: Address, signature: Uint8Array): void;
    /**
     * Verify signatures of a Transaction
     * Optional parameter specifies if we're expecting a fully signed Transaction or a partially signed one.
     * If no boolean is provided, we expect a fully signed Transaction by default.
     *
     * @param {boolean} [requireAllSignatures=true] Require a fully signed Transaction
     */
    verifySignatures(requireAllSignatures?: boolean): boolean;
    /**
     * Serialize the Transaction in the wire format.
     *
    * @param {SerializeConfig} [config] Config of transaction.
     *
    * @returns {Uint8Array} Signature of transaction in wire format.
     */
    serialize(config?: SerializeConfig): Uint8Array;
    /**
     * Parse a wire transaction into a Transaction object.
     *
     * @param {Uint8Array | Array<number>} buffer Signature of wire Transaction
     *
     * @returns {Transaction} Transaction associated with the signature
     */
    static from(buffer: Uint8Array | Array<number>): Transaction;
    /**
     * Populate Transaction object from message and signatures
     *
     * @param {Message} message Message of transaction
     * @param {Array<string>} signatures List of signatures to assign to the transaction
     *
     * @returns {Transaction} The populated Transaction
     */
    static populate(message: Message, signatures?: Array<string>): Transaction;
}

type TransactionMessageArgs = {
    payerKey: Address;
    instructions: Array<TransactionInstruction>;
    recentBlockhash: Blockhash;
};
type DecompileArgs = {
    accountKeysFromLookups: AccountKeysFromLookups;
} | {
    addressLookupTableAccounts: AddressLookupTableAccount[];
};
declare class TransactionMessage {
    payerKey: Address;
    instructions: Array<TransactionInstruction>;
    recentBlockhash: Blockhash;
    constructor(args: TransactionMessageArgs);
    static decompile(message: VersionedMessage, args?: DecompileArgs): TransactionMessage;
    compileToLegacyMessage(): Message;
    compileToV0Message(addressLookupTableAccounts?: AddressLookupTableAccount[]): MessageV0;
}

type TransactionVersion = 'legacy' | 0;
/**
 * Versioned transaction class
 */
declare class VersionedTransaction {
    signatures: Array<Uint8Array>;
    message: VersionedMessage;
    get version(): TransactionVersion;
    constructor(message: VersionedMessage, signatures?: Array<Uint8Array>);
    serialize(): Uint8Array;
    static deserialize(serializedTransaction: Uint8Array): VersionedTransaction;
    sign(signers: Array<Signer>): Promise<void>;
    addSignature(publicKey: Address, signature: Uint8Array): void;
}

type ClientSubscriptionId = number;
type Overwrite<T, U extends Partial<Record<keyof T, unknown>>> = Omit<T, keyof U> & U;
type TokenAccountsFilter = {
    mint: Address;
} | {
    programId: Address;
};
/**
 * Extra contextual information for RPC responses
 */
type Context = {
    slot: number;
};
/**
 * Options for sending transactions
 */
type SendOptions = {
    /** disable transaction verification step */
    skipPreflight?: boolean;
    /** preflight commitment level */
    preflightCommitment?: Commitment;
    /** Maximum number of times for the RPC node to retry sending the transaction to the leader. */
    maxRetries?: number;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
};
/**
 * Options for confirming transactions
 */
type ConfirmOptions = {
    /** disable transaction verification step */
    skipPreflight?: boolean;
    /** desired commitment level */
    commitment?: Commitment;
    /** preflight commitment level */
    preflightCommitment?: Commitment;
    /** Maximum number of times for the RPC node to retry sending the transaction to the leader. */
    maxRetries?: number;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
};
/**
 * Options for getSignaturesForAddress
 */
type SignaturesForAddressOptions = {
    /**
     * Start searching backwards from this transaction signature.
     * @remarks If not provided the search starts from the highest max confirmed block.
     */
    before?: TransactionSignature;
    /** Search until this transaction signature is reached, if found before `limit`. */
    until?: TransactionSignature;
    /** Maximum transaction signatures to return (between 1 and 1,000, default: 1,000). */
    limit?: number;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
};
/**
 * RPC Response with extra contextual information
 */
type RpcResponseAndContext<T> = {
    /** response context */
    context: Context;
    /** response value */
    value: T;
};
type BlockhashWithExpiryBlockHeight = Readonly<{
    blockhash: Blockhash;
    lastValidBlockHeight: number;
}>;
/**
 * A strategy for confirming transactions that uses the last valid
 * block height for a given blockhash to check for transaction expiration.
 */
type BlockheightBasedTransactionConfirmationStrategy = BaseTransactionConfirmationStrategy & BlockhashWithExpiryBlockHeight;
/**
 * A strategy for confirming durable nonce transactions.
 */
type DurableNonceTransactionConfirmationStrategy = BaseTransactionConfirmationStrategy & {
    /**
     * The lowest slot at which to fetch the nonce value from the
     * nonce account. This should be no lower than the slot at
     * which the last-known value of the nonce was fetched.
     */
    minContextSlot: number;
    /**
     * The account where the current value of the nonce is stored.
     */
    nonceAccountPubkey: Address;
    /**
     * The nonce value that was used to sign the transaction
     * for which confirmation is being sought.
     */
    nonceValue: DurableNonce;
};
/**
 * Properties shared by all transaction confirmation strategies
 */
type BaseTransactionConfirmationStrategy = Readonly<{
    /** A signal that, when aborted, cancels any outstanding transaction confirmation operations */
    abortSignal?: AbortSignal;
    signature: TransactionSignature;
}>;
/**
 * This type represents all transaction confirmation strategies
 */
type TransactionConfirmationStrategy = BlockheightBasedTransactionConfirmationStrategy | DurableNonceTransactionConfirmationStrategy;

/**
 * A subset of Commitment levels, which are at least optimistically confirmed
 * <pre>
 *   'confirmed': Query the most recent block which has reached 1 confirmation by the cluster
 *   'finalized': Query the most recent block which has been finalized by the cluster
 * </pre>
 */
type Finality = 'confirmed' | 'finalized';
/**
 * Filter for largest accounts query
 * <pre>
 *   'circulating':    Return the largest accounts that are part of the circulating supply
 *   'nonCirculating': Return the largest accounts that are not part of the circulating supply
 * </pre>
 */
type LargestAccountsFilter = 'circulating' | 'nonCirculating';
/**
 * Configuration object for changing `getAccountInfo` query behavior
 */
type GetAccountInfoConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
    /** Optional data slice to limit the returned account data */
    dataSlice?: DataSlice;
};
/**
 * Configuration object for changing `getBalance` query behavior
 */
type GetBalanceConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
};
/**
 * Configuration object for changing `getBlock` query behavior
 */
type GetBlockConfig = {
    /** The level of finality desired */
    commitment?: Finality;
    /**
     * Whether to populate the rewards array. If parameter not provided, the default includes rewards.
     */
    rewards?: boolean;
    /**
     * Level of transaction detail to return, either "full", "accounts", "signatures", or "none". If
     * parameter not provided, the default detail level is "full". If "accounts" are requested,
     * transaction details only include signatures and an annotated list of accounts in each
     * transaction. Transaction metadata is limited to only: fee, err, pre_balances, post_balances,
     * pre_token_balances, and post_token_balances.
     */
    transactionDetails?: 'accounts' | 'full' | 'none' | 'signatures';
};
/**
 * Configuration object for changing `getBlock` query behavior
 */
type GetVersionedBlockConfig = {
    /** The level of finality desired */
    commitment?: Finality;
    /** The max transaction version to return in responses. If the requested transaction is a higher version, an error will be returned */
    maxSupportedTransactionVersion?: number;
    /**
     * Whether to populate the rewards array. If parameter not provided, the default includes rewards.
     */
    rewards?: boolean;
    /**
     * Level of transaction detail to return, either "full", "accounts", "signatures", or "none". If
     * parameter not provided, the default detail level is "full". If "accounts" are requested,
     * transaction details only include signatures and an annotated list of accounts in each
     * transaction. Transaction metadata is limited to only: fee, err, pre_balances, post_balances,
     * pre_token_balances, and post_token_balances.
     */
    transactionDetails?: 'accounts' | 'full' | 'none' | 'signatures';
};
/**
 * Configuration object for changing `getStakeMinimumDelegation` query behavior
 */
type GetStakeMinimumDelegationConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
};
/**
 * Configuration object for changing `getBlockHeight` query behavior
 */
type GetBlockHeightConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
};
/**
 * Configuration object for changing `getEpochInfo` query behavior
 */
type GetEpochInfoConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number | bigint;
};
/**
 * Configuration object for changing `getLeaderSchedule` query behavior
 */
type GetLeaderScheduleConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
    /** Only return results for this validator identity */
    identity?: string;
};
/**
 * Configuration object for changing `getInflationReward` query behavior
 */
type GetInflationRewardConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
    /** An epoch for which the reward occurs. If omitted, the previous epoch will be used */
    epoch?: number;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
};
/**
 * Configuration object for changing `getLatestBlockhash` query behavior
 */
type GetLatestBlockhashConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
};
/**
 * Configuration object for changing `getFeeForMessage` query behavior
 */
type GetFeeForMessageConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number | bigint;
};
/**
 * Configuration object for changing `requestAirdrop` query behavior
 */
type RequestAirdropConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
};
/**
 * Configuration object for changing `isBlockhashValid` query behavior
 */
type IsBlockhashValidConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number | bigint;
};
/**
 * Configuration object for changing `getSlot` query behavior
 */
type GetSlotConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number | bigint;
};
/**
 * Configuration object for changing `getSlotLeader` query behavior
 */
type GetSlotLeaderConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
};
/**
 * Configuration object for changing `getTransaction` query behavior
 */
type GetTransactionConfig = {
    /** The level of finality desired */
    commitment?: Finality;
};
/**
 * Configuration object for changing `getTransaction` query behavior
 */
type GetVersionedTransactionConfig = {
    /** The level of finality desired */
    commitment?: Finality;
    /** The max transaction version to return in responses. If the requested transaction is a higher version, an error will be returned */
    maxSupportedTransactionVersion?: number;
};
/**
 * Configuration object for changing `getLargestAccounts` query behavior
 */
type GetLargestAccountsConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
    /** Filter largest accounts by whether they are part of the circulating supply */
    filter?: LargestAccountsFilter;
};
/**
 * Configuration object for changing `getSupply` request behavior
 */
type GetSupplyConfig = {
    /** The level of commitment desired */
    commitment?: Commitment;
    /** Exclude non circulating accounts list from response */
    excludeNonCirculatingAccountsList?: boolean;
};
/**
 * Configuration object for changing query behavior
 */
type SignatureStatusConfig = {
    /** enable searching status history, not needed for recent transactions */
    searchTransactionHistory: boolean;
};
/**
 * Information describing a cluster node
 */
type ContactInfo = {
    /** Identity public key of the node */
    pubkey: string;
    /** Gossip network address for the node */
    gossip: string | null;
    /** TPU network address for the node (null if not available) */
    tpu: string | null;
    /** JSON RPC network address for the node (null if not available) */
    rpc: string | null;
    /** Software version of the node (null if not available) */
    version: string | null;
};
/**
 * Information describing a vote account
 */
type VoteAccountInfo = {
    /** Public key of the vote account */
    votePubkey: string;
    /** Identity public key of the node voting with this account */
    nodePubkey: string;
    /** The stake, in lamports, delegated to this vote account and activated */
    activatedStake: number;
    /** Whether the vote account is staked for this epoch */
    epochVoteAccount: boolean;
    /** Recent epoch voting credit history for this voter */
    epochCredits: Array<[number, number, number]>;
    /** A percentage (0-100) of rewards payout owed to the voter */
    commission: number;
    /** Most recent slot voted on by this vote account */
    lastVote: number;
};
/**
 * A collection of cluster vote accounts
 */
type VoteAccountStatus = {
    /** Active vote accounts */
    current: Array<VoteAccountInfo>;
    /** Inactive vote accounts */
    delinquent: Array<VoteAccountInfo>;
};
/**
 * Network Inflation
 * (see https://docs.solana.com/implemented-proposals/ed_overview)
 */
type InflationGovernor = {
    foundation: number;
    foundationTerm: number;
    initial: number;
    taper: number;
    terminal: number;
};
/**
 * The inflation reward for an epoch
 */
type InflationReward = {
    /** epoch for which the reward occurs */
    epoch: number;
    /** the slot in which the rewards are effective */
    effectiveSlot: number;
    /** reward amount in lamports */
    amount: number;
    /** post balance of the account in lamports */
    postBalance: number;
    /** vote account commission when the reward was credited */
    commission?: number | null;
};
type RecentPrioritizationFees = ReturnType<GetRecentPrioritizationFeesApi['getRecentPrioritizationFees']>[number];
/**
 * Configuration object for changing `getRecentPrioritizationFees` query behavior
 */
type GetRecentPrioritizationFeesConfig = {
    /**
     * If this parameter is provided, the response will reflect a fee to land a transaction locking
     * all of the provided accounts as writable.
     */
    lockedWritableAccounts?: Address[];
};
type InflationRate = ReturnType<GetInflationRateApi['getInflationRate']>;
/**
 * Information about the current epoch
 */
type EpochInfo = ReturnType<GetEpochInfoApi['getEpochInfo']>;
/**
 * Leader schedule
 * (see https://docs.solana.com/terminology#leader-schedule)
 */
type LeaderSchedule = {
    [address: string]: bigint[];
};
/**
 * Identity for an RPC node.
 */
type Identity = {
    identity: Address;
};
type SimulatedTransactionAccountInfo = {
    /** `true` if this account's data contains a loaded program */
    executable: boolean;
    /** Identifier of the program that owns the account */
    owner: string;
    /** Number of lamports assigned to the account */
    lamports: bigint;
    /** Optional data assigned to the account */
    data: string[];
    /** Optional rent epoch info for account */
    rentEpoch?: bigint;
};
type TransactionReturnDataEncoding = 'base64';
type TransactionReturnData = {
    programId: string;
    data: [string, TransactionReturnDataEncoding];
};
type SimulateTransactionConfig = {
    /** Optional parameter used to enable signature verification before simulation */
    sigVerify?: boolean;
    /** Optional parameter used to replace the simulated transaction's recent blockhash with the latest blockhash */
    replaceRecentBlockhash?: boolean;
    /** Optional parameter used to set the commitment level when selecting the latest block */
    commitment?: Commitment;
    /** Optional parameter used to specify a list of base58-encoded account addresses to return post simulation state for */
    accounts?: {
        /** The encoding of the returned account's data */
        encoding: 'base64';
        addresses: string[];
    };
    /** Optional parameter used to specify the minimum block slot that can be used for simulation */
    minContextSlot?: number;
    /** Optional parameter used to include inner instructions in the simulation */
    innerInstructions?: boolean;
};
type SimulatedTransactionResponse = {
    err: TransactionError | string | null;
    logs: Array<string> | null;
    accounts?: (SimulatedTransactionAccountInfo | null)[] | null;
    unitsConsumed?: number;
    returnData?: TransactionReturnData | null;
    innerInstructions?: ParsedInnerInstruction[] | null;
};
type ParsedInnerInstruction = {
    index: number;
    instructions: (ParsedInstruction | PartiallyDecodedInstruction)[];
};
type TokenBalance = {
    accountIndex: number;
    mint: string;
    owner?: string;
    programId?: string;
    uiTokenAmount: TokenAmount;
};
/**
 * Metadata for a parsed confirmed transaction on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0. Please use {@link ParsedTransactionMeta} instead.
 */
type ParsedConfirmedTransactionMeta = ParsedTransactionMeta;
/**
 * Collection of addresses loaded by a transaction using address table lookups
 */
type LoadedAddresses = {
    writable: Array<Address>;
    readonly: Array<Address>;
};
/**
 * Metadata for a parsed transaction on the ledger
 */
type ParsedTransactionMeta = {
    /** The fee charged for processing the transaction */
    fee: number;
    /** An array of cross program invoked parsed instructions */
    innerInstructions?: ParsedInnerInstruction[] | null;
    /** The balances of the transaction accounts before processing */
    preBalances: Array<number>;
    /** The balances of the transaction accounts after processing */
    postBalances: Array<number>;
    /** An array of program log messages emitted during a transaction */
    logMessages?: Array<string> | null;
    /** The token balances of the transaction accounts before processing */
    preTokenBalances?: Array<TokenBalance> | null;
    /** The token balances of the transaction accounts after processing */
    postTokenBalances?: Array<TokenBalance> | null;
    /** The error result of transaction processing */
    err: TransactionError | null;
    /** The collection of addresses loaded using address lookup tables */
    loadedAddresses?: LoadedAddresses;
    /** The compute units consumed after processing the transaction */
    computeUnitsConsumed?: number;
    /** The cost units consumed after processing the transaction */
    costUnits?: number;
};
type CompiledInnerInstruction = {
    index: number;
    instructions: CompiledInstruction[];
};
/**
 * Metadata for a confirmed transaction on the ledger
 */
type ConfirmedTransactionMeta = {
    /** The fee charged for processing the transaction */
    fee: number;
    /** An array of cross program invoked instructions */
    innerInstructions?: CompiledInnerInstruction[] | null;
    /** The balances of the transaction accounts before processing */
    preBalances: Array<number>;
    /** The balances of the transaction accounts after processing */
    postBalances: Array<number>;
    /** An array of program log messages emitted during a transaction */
    logMessages?: Array<string> | null;
    /** The token balances of the transaction accounts before processing */
    preTokenBalances?: Array<TokenBalance> | null;
    /** The token balances of the transaction accounts after processing */
    postTokenBalances?: Array<TokenBalance> | null;
    /** The error result of transaction processing */
    err: TransactionError | null;
    /** The collection of addresses loaded using address lookup tables */
    loadedAddresses?: LoadedAddresses;
    /** The compute units consumed after processing the transaction */
    computeUnitsConsumed?: number;
    /** The cost units consumed after processing the transaction */
    costUnits?: number;
};
/**
 * A processed transaction from the RPC API
 */
type TransactionResponse = {
    /** The slot during which the transaction was processed */
    slot: number;
    /** The transaction */
    transaction: {
        /** The transaction message */
        message: Message;
        /** The transaction signatures */
        signatures: string[];
    };
    /** Metadata produced from the transaction */
    meta: ConfirmedTransactionMeta | null;
    /** The unix timestamp of when the transaction was processed */
    blockTime?: number | null;
};
/**
 * A processed transaction from the RPC API
 */
type VersionedTransactionResponse = {
    /** The slot during which the transaction was processed */
    slot: number;
    /** The transaction */
    transaction: {
        /** The transaction message */
        message: VersionedMessage;
        /** The transaction signatures */
        signatures: string[];
    };
    /** Metadata produced from the transaction */
    meta: ConfirmedTransactionMeta | null;
    /** The unix timestamp of when the transaction was processed */
    blockTime?: number | null;
    /** The transaction version */
    version?: TransactionVersion;
};
/**
 * A confirmed transaction on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0.
 */
type ConfirmedTransaction = {
    /** The slot during which the transaction was processed */
    slot: number;
    /** The details of the transaction */
    transaction: Transaction;
    /** Metadata produced from the transaction */
    meta: ConfirmedTransactionMeta | null;
    /** The unix timestamp of when the transaction was processed */
    blockTime?: number | null;
};
/**
 * A partially decoded transaction instruction
 */
type PartiallyDecodedInstruction = {
    /** Program id called by this instruction */
    programId: Address;
    /** Public keys of accounts passed to this instruction */
    accounts: Array<Address>;
    /** Raw base-58 instruction data */
    data: string;
};
/**
 * A parsed transaction message account
 */
type ParsedMessageAccount = {
    /** Public key of the account */
    pubkey: Address;
    /** Indicates if the account signed the transaction */
    signer: boolean;
    /** Indicates if the account is writable for this transaction */
    writable: boolean;
    /** Indicates if the account key came from the transaction or a lookup table */
    source?: 'transaction' | 'lookupTable';
};
/**
 * A parsed transaction instruction
 */
type ParsedInstruction = {
    /** Name of the program for this instruction */
    program: string;
    /** ID of the program for this instruction */
    programId: Address;
    /** Parsed instruction info */
    parsed: any;
};
/**
 * A parsed address table lookup
 */
type ParsedAddressTableLookup = {
    /** Address lookup table account key */
    accountKey: Address;
    /** Parsed instruction info */
    writableIndexes: number[];
    /** Parsed instruction info */
    readonlyIndexes: number[];
};
/**
 * A parsed transaction message
 */
type ParsedMessage = {
    /** Accounts used in the instructions */
    accountKeys: ParsedMessageAccount[];
    /** The atomically executed instructions for the transaction */
    instructions: (ParsedInstruction | PartiallyDecodedInstruction)[];
    /** Recent blockhash */
    recentBlockhash: string;
    /** Address table lookups used to load additional accounts */
    addressTableLookups?: ParsedAddressTableLookup[] | null;
};
/**
 * A parsed transaction
 */
type ParsedTransaction = {
    /** Signatures for the transaction */
    signatures: Array<string>;
    /** Message of the transaction */
    message: ParsedMessage;
};
/**
 * A parsed and confirmed transaction on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0. Please use {@link ParsedTransactionWithMeta} instead.
 */
type ParsedConfirmedTransaction = ParsedTransactionWithMeta;
/**
 * A parsed transaction on the ledger with meta
 */
type ParsedTransactionWithMeta = {
    /** The slot during which the transaction was processed */
    slot: number;
    /** The details of the transaction */
    transaction: ParsedTransaction;
    /** Metadata produced from the transaction */
    meta: ParsedTransactionMeta | null;
    /** The unix timestamp of when the transaction was processed */
    blockTime?: number | null;
    /** The version of the transaction message */
    version?: TransactionVersion;
};
/**
 * A processed block fetched from the RPC API
 */
type BlockResponse = {
    /** Blockhash of this block */
    blockhash: Blockhash;
    /** Blockhash of this block's parent */
    previousBlockhash: Blockhash;
    /** Slot index of this block's parent */
    parentSlot: number;
    /** Vector of transactions with status meta and original message */
    transactions: Array<{
        /** The transaction */
        transaction: {
            /** The transaction message */
            message: Message;
            /** The transaction signatures */
            signatures: string[];
        };
        /** Metadata produced from the transaction */
        meta: ConfirmedTransactionMeta | null;
        /** The transaction version */
        version?: TransactionVersion;
    }>;
    /** Vector of block rewards */
    rewards?: Array<{
        /** Public key of reward recipient */
        pubkey: string;
        /** Reward value in lamports */
        lamports: number;
        /** Account balance after reward is applied */
        postBalance: number | null;
        /** Type of reward received */
        rewardType: string | null;
        /** Vote account commission when the reward was credited, only present for voting and staking rewards */
        commission?: number | null;
    }>;
    /** The unix timestamp of when the block was processed */
    blockTime: number | null;
    /** The number of blocks beneath this block */
    blockHeight: number | null;
};
/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `accounts`
 */
type AccountsModeBlockResponse = VersionedAccountsModeBlockResponse;
/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `none`
 */
type NoneModeBlockResponse = VersionedNoneModeBlockResponse;
/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `signatures`
 */
type SignaturesModeBlockResponse = VersionedSignaturesModeBlockResponse;
/**
 * A block with parsed transactions
 */
type ParsedBlockResponse = {
    /** Blockhash of this block */
    blockhash: Blockhash;
    /** Blockhash of this block's parent */
    previousBlockhash: Blockhash;
    /** Slot index of this block's parent */
    parentSlot: number;
    /** Vector of transactions with status meta and original message */
    transactions: Array<{
        /** The details of the transaction */
        transaction: ParsedTransaction;
        /** Metadata produced from the transaction */
        meta: ParsedTransactionMeta | null;
        /** The transaction version */
        version?: TransactionVersion;
    }>;
    /** Vector of block rewards */
    rewards?: Array<{
        /** Public key of reward recipient */
        pubkey: string;
        /** Reward value in lamports */
        lamports: number;
        /** Account balance after reward is applied */
        postBalance: number | null;
        /** Type of reward received */
        rewardType: string | null;
        /** Vote account commission when the reward was credited, only present for voting and staking rewards */
        commission?: number | null;
    }>;
    /** The unix timestamp of when the block was processed */
    blockTime: number | null;
    /** The number of blocks beneath this block */
    blockHeight: number | null;
};
/**
 * A block with parsed transactions where the `transactionDetails` mode is `accounts`
 */
type ParsedAccountsModeBlockResponse = Omit<ParsedBlockResponse, 'transactions'> & {
    transactions: Array<Omit<ParsedBlockResponse['transactions'][number], 'transaction'> & {
        transaction: Pick<ParsedBlockResponse['transactions'][number]['transaction'], 'signatures'> & {
            accountKeys: ParsedMessageAccount[];
        };
    }>;
};
/**
 * A block with parsed transactions where the `transactionDetails` mode is `none`
 */
type ParsedNoneModeBlockResponse = Omit<ParsedBlockResponse, 'transactions'>;
/**
 * A block with parsed transactions where the `transactionDetails` mode is `signatures`
 */
type ParsedSignaturesModeBlockResponse = Omit<ParsedBlockResponse, 'transactions'> & {
    signatures: Array<string>;
};
/**
 * A processed block fetched from the RPC API
 */
type VersionedBlockResponse = {
    /** Blockhash of this block */
    blockhash: Blockhash;
    /** Blockhash of this block's parent */
    previousBlockhash: Blockhash;
    /** Slot index of this block's parent */
    parentSlot: number;
    /** Vector of transactions with status meta and original message */
    transactions: Array<{
        /** The transaction */
        transaction: {
            /** The transaction message */
            message: VersionedMessage;
            /** The transaction signatures */
            signatures: string[];
        };
        /** Metadata produced from the transaction */
        meta: ConfirmedTransactionMeta | null;
        /** The transaction version */
        version?: TransactionVersion;
    }>;
    /** Vector of block rewards */
    rewards?: Array<{
        /** Public key of reward recipient */
        pubkey: string;
        /** Reward value in lamports */
        lamports: number;
        /** Account balance after reward is applied */
        postBalance: number | null;
        /** Type of reward received */
        rewardType: string | null;
        /** Vote account commission when the reward was credited, only present for voting and staking rewards */
        commission?: number | null;
    }>;
    /** The unix timestamp of when the block was processed */
    blockTime: number | null;
    /** The number of blocks beneath this block */
    blockHeight: number | null;
};
/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `accounts`
 */
type VersionedAccountsModeBlockResponse = Omit<VersionedBlockResponse, 'transactions'> & {
    transactions: Array<Omit<VersionedBlockResponse['transactions'][number], 'transaction'> & {
        transaction: Pick<VersionedBlockResponse['transactions'][number]['transaction'], 'signatures'> & {
            accountKeys: ParsedMessageAccount[];
        };
    }>;
};
/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `none`
 */
type VersionedNoneModeBlockResponse = Omit<VersionedBlockResponse, 'transactions'>;
/**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `signatures`
 */
type VersionedSignaturesModeBlockResponse = Omit<VersionedBlockResponse, 'transactions'> & {
    signatures: Array<string>;
};
/**
 * A confirmed block on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0.
 */
type ConfirmedBlock = {
    /** Blockhash of this block */
    blockhash: Blockhash;
    /** Blockhash of this block's parent */
    previousBlockhash: Blockhash;
    /** Slot index of this block's parent */
    parentSlot: number;
    /** Vector of transactions and status metas */
    transactions: Array<{
        transaction: Transaction;
        meta: ConfirmedTransactionMeta | null;
    }>;
    /** Vector of block rewards */
    rewards?: Array<{
        pubkey: string;
        lamports: number;
        postBalance: number | null;
        rewardType: string | null;
        commission?: number | null;
    }>;
    /** The unix timestamp of when the block was processed */
    blockTime: number | null;
};
/**
 * A Block on the ledger with signatures only
 */
type BlockSignatures = {
    /** Blockhash of this block */
    blockhash: Blockhash;
    /** Blockhash of this block's parent */
    previousBlockhash: Blockhash;
    /** Slot index of this block's parent */
    parentSlot: number;
    /** Vector of signatures */
    signatures: Array<string>;
    /** The unix timestamp of when the block was processed */
    blockTime: number | null;
    /** The number of blocks beneath this block */
    blockHeight: number | null;
};
/**
 * Amount of stake committed to a block at each depth.
 */
type BlockCommitment = {
    /**
     * Amount of cluster stake in lamports that has voted on the block at each lockout depth.
     */
    commitment: Array<bigint> | null;
    /** Total active stake, in lamports, for the current epoch. */
    totalStake: bigint;
};
/**
 * recent block production information
 */
type BlockProduction = ReturnType<GetBlockProductionApi['getBlockProduction']>['value'];
type GetBlockProductionConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
    /** Slot range to return block production for. If parameter not provided, defaults to current epoch. */
    range?: {
        /** first slot to return block production information for (inclusive) */
        firstSlot: number | bigint;
        /** last slot to return block production information for (inclusive). If parameter not provided, defaults to the highest slot */
        lastSlot?: number | bigint;
    };
    /** Only return results for this validator identity (base-58 encoded) */
    identity?: string;
};
/**
 * A performance sample
 */
type PerfSample = ReturnType<GetRecentPerformanceSamplesApi['getRecentPerformanceSamples']>[number];
/**
 * Supply
 */
type Supply = {
    /** Total supply in lamports */
    total: number;
    /** Circulating supply in lamports */
    circulating: number;
    /** Non-circulating supply in lamports */
    nonCirculating: number;
    /** List of non-circulating account addresses */
    nonCirculatingAccounts: Array<Address>;
};
/**
 * Token amount object which returns a token amount in different formats
 * for various client use cases.
 */
type TokenAmount = {
    /** Raw amount of tokens as string ignoring decimals */
    amount: string;
    /** Number of decimals configured for token's mint */
    decimals: number;
    /** Token amount as float, accounts for decimals */
    uiAmount: number | null;
    /** Token amount as string, accounts for decimals */
    uiAmountString?: string;
};
/**
 * Token address and balance.
 */
type TokenAccountBalancePair = {
    /** Address of the token account */
    address: Address;
    /** Raw amount of tokens as string ignoring decimals */
    amount: string;
    /** Number of decimals configured for token's mint */
    decimals: number;
    /** Token amount as float, accounts for decimals */
    uiAmount: number | null;
    /** Token amount as string, accounts for decimals */
    uiAmountString?: string;
};
type GetTokenLargestAccountsKitResult = ReturnType<GetTokenLargestAccountsApi['getTokenLargestAccounts']>;
type GetClusterNodesApiResponse = ReturnType<GetClusterNodesApi['getClusterNodes']>;
type GetLargestAccountsKitResult = ReturnType<GetLargestAccountsApi['getLargestAccounts']>;
type GetTokenLargestAccountsWithPublicKeys = Overwrite<GetTokenLargestAccountsKitResult, {
    value: ReadonlyArray<Overwrite<GetTokenLargestAccountsKitResult['value'][number], {
        address: Address;
    }>>;
}>;
type GetLargestAccountsWithPublicKeys = Overwrite<GetLargestAccountsKitResult, {
    value: ReadonlyArray<Overwrite<GetLargestAccountsKitResult['value'][number], {
        address: Address;
    }>>;
}>;
/**
 * Pair of an account address and its balance
 */
type AccountBalancePair = {
    readonly address: Address;
    readonly lamports: bigint;
};
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
type SlotUpdate = {
    type: 'firstShredReceived';
    slot: number;
    timestamp: number;
} | {
    type: 'completed';
    slot: number;
    timestamp: number;
} | {
    type: 'createdBank';
    slot: number;
    timestamp: number;
    parent: number;
} | {
    type: 'frozen';
    slot: number;
    timestamp: number;
    stats: {
        numTransactionEntries: number;
        numSuccessfulTransactions: number;
        numFailedTransactions: number;
        maxTransactionsPerEntry: number;
    };
} | {
    type: 'dead';
    slot: number;
    timestamp: number;
    err: string;
} | {
    type: 'optimisticConfirmation';
    slot: number;
    timestamp: number;
} | {
    type: 'root';
    slot: number;
    timestamp: number;
};
/**
 * Information about the latest slot being processed by a node
 */
type SlotInfo = {
    /** Currently processing slot */
    slot: number;
    /** Parent of the current slot */
    parent: number;
    /** The root block of the current slot's fork */
    root: number;
};
/**
 * Parsed account data
 */
type ParsedAccountData = {
    /** Name of the program that owns this account */
    program: string;
    /** Parsed account data */
    parsed: any;
    /** Space used by account data */
    space: number;
};
/**
 * Data slice argument for getProgramAccounts
 */
type DataSlice = {
    /** offset of data slice */
    offset: number;
    /** length of data slice */
    length: number;
};
/**
 * Memory comparison filter for getProgramAccounts
 */
type MemcmpFilter = {
    memcmp: {
        /** offset into program account data to start comparison */
        offset: number;
    } & ({
        encoding?: 'base58';
        /** data to match, as base-58 encoded string and limited to less than 129 bytes */
        bytes: string;
    } | {
        encoding: 'base64';
        /** data to match, as base-64 encoded string */
        bytes: string;
    });
};
/**
 * Data size comparison filter for getProgramAccounts
 */
type DataSizeFilter = {
    /** Size of data for program account data length comparison */
    dataSize: number;
};
/**
 * A filter object for getProgramAccounts
 */
type GetProgramAccountsFilter = MemcmpFilter | DataSizeFilter;
/**
 * Configuration object for getProgramAccounts requests
 */
type GetProgramAccountsConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
    /** Optional encoding for account data (default base64)
     * To use "jsonParsed" encoding, please refer to `getParsedProgramAccounts` in connection.ts
     * */
    encoding?: 'base64';
    /** Optional data slice to limit the returned account data */
    dataSlice?: DataSlice;
    /** Optional array of filters to apply to accounts */
    filters?: GetProgramAccountsFilter[];
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
    /** wrap the result in an RpcResponse JSON object */
    withContext?: boolean;
};
type GetProgramAccountsResponse = readonly Readonly<{
    account: AccountInfo<Uint8Array>;
    /** the account Pubkey as base-58 encoded string */
    pubkey: Address;
}>[];
/**
 * Configuration object for getParsedProgramAccounts
 */
type GetParsedProgramAccountsConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
    /** Optional array of filters to apply to accounts */
    filters?: GetProgramAccountsFilter[];
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
};
/**
 * Configuration object for getMultipleAccounts
 */
type GetMultipleAccountsConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
    /** Optional data slice to limit the returned account data */
    dataSlice?: DataSlice;
};
/**
 * Configuration object for `getTokenAccountsByOwner`
 */
type GetTokenAccountsByOwnerConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
    /** Optional encoding for account data (default base64) */
    encoding?: 'base64';
    /** Optional data slice to limit the returned account data */
    dataSlice?: DataSlice;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
};
/**
 * Configuration object for `getTokenAccountsByDelegate`
 */
type GetTokenAccountsByDelegateConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
    /** Optional encoding for account data (default base64) */
    encoding?: 'base64';
    /** Optional data slice to limit the returned account data */
    dataSlice?: DataSlice;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
};
/**
 * Configuration object for `getTransactionCount`
 */
type GetTransactionCountConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number | bigint;
};
/**
 * Configuration object for `getBlocks` and `getBlocksWithLimit`
 */
type GetBlocksConfig = {
    /** Optional finality level */
    commitment?: Finality;
};
/**
 * Configuration object for `getTokenSupply`
 */
type GetTokenSupplyConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
};
/**
 * Configuration object for `getTokenAccountBalance`
 */
type GetTokenAccountBalanceConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
};
/**
 * Configuration object for `getTokenLargestAccounts`
 */
type GetTokenLargestAccountsConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
};
/**
 * Configuration object for `getInflationGovernor`
 */
type GetInflationGovernorConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
};
/**
 * Configuration object for `getVoteAccounts`
 */
type GetVoteAccountsConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
    /** Return only results for this validator vote account */
    votePubkey?: string;
    /** Keep unstaked delinquent validators */
    keepUnstakedDelinquents?: boolean;
    /** Custom delinquent slot distance */
    delinquentSlotDistance?: number;
};
/**
 * Configuration object for `getMinimumBalanceForRentExemption`
 */
type GetMinimumBalanceForRentExemptionConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
};
/**
 * Configuration object for `getNonce`
 */
type GetNonceConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
};
/**
 * Configuration object for `getNonceAndContext`
 */
type GetNonceAndContextConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
    /** The minimum slot that the request can be evaluated at */
    minContextSlot?: number;
};
type AccountSubscriptionConfig = Readonly<{
    /** Optional commitment level */
    commitment?: Commitment;
    /**
     * Encoding format for Account data
     *   - `base58` is slow.
     *   - `jsonParsed` encoding attempts to use program-specific state parsers to return more
     *      human-readable and explicit account state data
     *   - If `jsonParsed` is requested but a parser cannot be found, the field falls back to `base64`
     *     encoding, detectable when the `data` field is type `string`.
     */
    encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed';
}>;
type ProgramAccountSubscriptionConfig = Readonly<{
    /** Optional commitment level */
    commitment?: Commitment;
    /**
     * Encoding format for Account data
     *   - `base58` is slow.
     *   - `jsonParsed` encoding attempts to use program-specific state parsers to return more
     *      human-readable and explicit account state data
     *   - If `jsonParsed` is requested but a parser cannot be found, the field falls back to `base64`
     *     encoding, detectable when the `data` field is type `string`.
     */
    encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed';
    /**
     * Filter results using various filter objects
     * The resultant account must meet ALL filter criteria to be included in the returned results
     */
    filters?: GetProgramAccountsFilter[];
}>;
/**
 * Information describing an account
 */
type AccountInfo<T> = {
    /** `true` if this account's data contains a loaded program */
    executable: boolean;
    /** Identifier of the program that owns the account */
    owner: Address;
    /** Number of lamports assigned to the account */
    lamports: bigint;
    /** Optional data assigned to the account */
    data: T;
    /** Optional rent epoch info for account */
    rentEpoch?: bigint;
};
/**
 * Account information identified by pubkey
 */
type KeyedAccountInfo = {
    accountId: Address;
    accountInfo: AccountInfo<Uint8Array>;
};
/**
 * Callback function for account change notifications
 */
type AccountChangeCallback = (accountInfo: AccountInfo<Uint8Array>, context: Context) => void;
/**
 * Callback function for program account change notifications
 */
type ProgramAccountChangeCallback = (keyedAccountInfo: KeyedAccountInfo, context: Context) => void;
/**
 * Callback function for slot change notifications
 */
type SlotChangeCallback = (slotInfo: SlotInfo) => void;
/**
 * Callback function for slot update notifications
 */
type SlotUpdateCallback = (slotUpdate: SlotUpdate) => void;
/**
 * Callback function for signature status notifications
 */
type SignatureResultCallback = (signatureResult: SignatureResult, context: Context) => void;
/**
 * Signature status notification with transaction result
 */
type SignatureStatusNotification = {
    type: 'status';
    result: SignatureResult;
};
/**
 * Signature received notification
 */
type SignatureReceivedNotification = {
    type: 'received';
};
/**
 * Callback function for signature notifications
 */
type SignatureSubscriptionCallback = (notification: SignatureStatusNotification | SignatureReceivedNotification, context: Context) => void;
/**
 * Signature subscription options
 */
type SignatureSubscriptionOptions = {
    commitment?: Commitment;
    enableReceivedNotification?: boolean;
};
/**
 * Callback function for root change notifications
 */
type RootChangeCallback = (root: number) => void;
/**
 * Logs result.
 */
type Logs = {
    err: TransactionError | null;
    logs: string[];
    signature: string;
};
/**
 * Filter for log subscriptions.
 */
type LogsFilter = Address | 'all' | 'allWithVotes';
/**
 * Callback function for log notifications.
 */
type LogsCallback = (logs: Logs, ctx: Context) => void;
/**
 * Signature result
 */
type SignatureResult = {
    err: TransactionError | null;
};
/**
 * Transaction error
 */
type TransactionError = {} | string;
/**
 * Transaction confirmation status
 * <pre>
 *   'processed': Transaction landed in a block which has reached 1 confirmation by the connected node
 *   'confirmed': Transaction landed in a block which has reached 1 confirmation by the cluster
 *   'finalized': Transaction landed in a block which has been finalized by the cluster
 * </pre>
 */
type TransactionConfirmationStatus = 'processed' | 'confirmed' | 'finalized';
/**
 * Signature status
 */
type SignatureStatus = {
    /** when the transaction was processed */
    slot: number;
    /** the number of blocks that have been confirmed and voted on in the fork containing `slot` */
    confirmations: number | null;
    /** transaction error, if any */
    err: TransactionError | null;
    /** cluster confirmation status, if data available. Possible responses: `processed`, `confirmed`, `finalized` */
    confirmationStatus?: TransactionConfirmationStatus;
};
/**
 * A confirmed signature with its status
 */
type ConfirmedSignatureInfo = {
    /** the transaction signature */
    signature: string;
    /** when the transaction was processed */
    slot: number;
    /** error, if any */
    err: TransactionError | null;
    /** memo associated with the transaction, if any */
    memo: string | null;
    /** The unix timestamp of when the transaction was processed */
    blockTime?: number | null;
    /** Cluster confirmation status, if available. Possible values: `processed`, `confirmed`, `finalized` */
    confirmationStatus?: TransactionConfirmationStatus;
};
/**
 * An object defining headers to be passed to the RPC server
 */
type HttpHeaders = {
    [header: string]: string;
} & {
    'solana-client'?: never;
};
/**
 * Configuration for instantiating a Connection
 */
type ConnectionConfig = {
    /** Optional commitment level */
    commitment?: Commitment;
    /** Optional endpoint URL to the fullnode JSON RPC PubSub WebSocket Endpoint */
    wsEndpoint?: string;
    /** Optional HTTP headers object */
    httpHeaders?: HttpHeaders;
    /** Optional Disable retrying calls when server responds with HTTP 429 (Too Many Requests) */
    disableRetryOnRateLimit?: boolean;
    /** time to allow for the server to initially process a transaction (in milliseconds) */
    confirmTransactionInitialTimeout?: number;
};
/**
 * A connection to a fullnode JSON RPC endpoint
 */
declare class Connection {
    /**
     * Establish a JSON RPC connection
     *
     * @param endpoint URL to the fullnode JSON RPC endpoint
     * @param commitmentOrConfig optional default commitment level or optional ConnectionConfig configuration object
     */
    constructor(endpoint: string, commitmentOrConfig?: Commitment | ConnectionConfig);
    /**
     * The default commitment used for requests
     */
    get commitment(): Commitment | undefined;
    /**
     * The RPC endpoint
     */
    get rpcEndpoint(): string;
    /**
     * The HTTP headers used by this connection for JSON-RPC requests.
     */
    get rpcHttpHeaders(): HttpHeaders | undefined;
    /**
     * Fetch the balance for the specified public key, return with context
     */
    getBalanceAndContext(publicKey: Address, commitmentOrConfig?: Commitment | GetBalanceConfig): Promise<RpcResponseAndContext<number>>;
    /**
     * Fetch the balance for the specified public key
     */
    getBalance(publicKey: Address, commitmentOrConfig?: Commitment | GetBalanceConfig): Promise<number>;
    /**
     * Fetch the estimated production time of a block
     */
    getBlockTime(slot: number | bigint): Promise<ReturnType<GetBlockTimeApi['getBlockTime']>>;
    /**
     * Fetch the lowest slot that the node has information about in its ledger.
     * This value may increase over time if the node is configured to purge older ledger data
     */
    getMinimumLedgerSlot(): Promise<bigint>;
    /**
     * Fetch the slot of the lowest confirmed block that has not been purged from the ledger
     */
    getFirstAvailableBlock(): Promise<ReturnType<GetFirstAvailableBlockApi['getFirstAvailableBlock']>>;
    /**
     * Fetch information about the current supply
     */
    getSupply(config?: GetSupplyConfig | Commitment): Promise<RpcResponseAndContext<Supply>>;
    /**
     * Fetch the current supply of a token mint
     */
    getTokenSupply(tokenMintAddress: Address, commitmentOrConfig?: Commitment | GetTokenSupplyConfig): Promise<ReturnType<GetTokenSupplyApi['getTokenSupply']>>;
    /**
     * Fetch the current balance of a token account
     */
    getTokenAccountBalance(tokenAddress: Address, commitmentOrConfig?: Commitment | GetTokenAccountBalanceConfig): Promise<ReturnType<GetTokenAccountBalanceApi['getTokenAccountBalance']>>;
    /**
     * Fetch all the token accounts owned by the specified account
     *
     * @return {Promise<RpcResponseAndContext<GetProgramAccountsResponse>}
     */
    getTokenAccountsByOwner(ownerAddress: Address, filter: TokenAccountsFilter, commitmentOrConfig?: Commitment | GetTokenAccountsByOwnerConfig): Promise<RpcResponseAndContext<GetProgramAccountsResponse>>;
    /**
     * Fetch all the token accounts delegated to the specified account
     *
     * @return {Promise<RpcResponseAndContext<GetProgramAccountsResponse>}
     */
    getTokenAccountsByDelegate(delegateAddress: Address, filter: TokenAccountsFilter, commitmentOrConfig?: Commitment | GetTokenAccountsByDelegateConfig): Promise<RpcResponseAndContext<GetProgramAccountsResponse>>;
    /**
     * Fetch parsed token accounts owned by the specified account
     *
     * @return {Promise<RpcResponseAndContext<Array<{pubkey: Address, account: AccountInfo<ParsedAccountData>}>>>}
     */
    getParsedTokenAccountsByOwner(ownerAddress: Address, filter: TokenAccountsFilter, commitment?: Commitment): Promise<RpcResponseAndContext<Array<{
        pubkey: Address;
        account: AccountInfo<ParsedAccountData>;
    }>>>;
    /**
     * Fetch the 20 largest accounts with their current balances
     */
    getLargestAccounts(config?: GetLargestAccountsConfig): Promise<GetLargestAccountsWithPublicKeys>;
    /**
     * Fetch the 20 largest token accounts with their current balances
     * for a given mint.
     */
    getTokenLargestAccounts(mintAddress: Address, commitmentOrConfig?: Commitment | GetTokenLargestAccountsConfig): Promise<GetTokenLargestAccountsWithPublicKeys>;
    /**
     * Fetch all the account info for the specified public key, return with context
     */
    getAccountInfoAndContext(publicKey: Address, commitmentOrConfig?: Commitment | GetAccountInfoConfig): Promise<RpcResponseAndContext<AccountInfo<Uint8Array> | null>>;
    /**
     * Fetch parsed account info for the specified public key
     */
    getParsedAccountInfo(publicKey: Address, commitmentOrConfig?: Commitment | GetAccountInfoConfig): Promise<RpcResponseAndContext<AccountInfo<Uint8Array | ParsedAccountData> | null>>;
    /**
     * Fetch all the account info for the specified public key
     */
    getAccountInfo(publicKey: Address, commitmentOrConfig?: Commitment | GetAccountInfoConfig): Promise<AccountInfo<Uint8Array> | null>;
    /**
     * Fetch all the account info for multiple accounts specified by an array of public keys, return with context
     */
    getMultipleParsedAccounts(publicKeys: Address[], rawConfig?: GetMultipleAccountsConfig): Promise<RpcResponseAndContext<(AccountInfo<Uint8Array | ParsedAccountData> | null)[]>>;
    /**
     * Fetch all the account info for multiple accounts specified by an array of public keys, return with context
     */
    getMultipleAccountsInfoAndContext(publicKeys: Address[], commitmentOrConfig?: Commitment | GetMultipleAccountsConfig): Promise<RpcResponseAndContext<(AccountInfo<Uint8Array> | null)[]>>;
    /**
     * Fetch all the account info for multiple accounts specified by an array of public keys
     */
    getMultipleAccountsInfo(publicKeys: Address[], commitmentOrConfig?: Commitment | GetMultipleAccountsConfig): Promise<(AccountInfo<Uint8Array> | null)[]>;
    /**
     * Fetch all the accounts owned by the specified program id
     *
    * @return {Promise<Array<{pubkey: Address, account: AccountInfo<Uint8Array>}>>}
     */
    getProgramAccounts(programId: Address, configOrCommitment: GetProgramAccountsConfig & Readonly<{
        withContext: true;
    }>): Promise<RpcResponseAndContext<GetProgramAccountsResponse>>;
    getProgramAccounts(programId: Address, configOrCommitment?: GetProgramAccountsConfig | Commitment): Promise<GetProgramAccountsResponse>;
    /**
     * Fetch and parse all the accounts owned by the specified program id
     *
    * @return {Promise<Array<{pubkey: Address, account: AccountInfo<Uint8Array | ParsedAccountData>}>>}
     */
    getParsedProgramAccounts(programId: Address, configOrCommitment?: GetParsedProgramAccountsConfig | Commitment): Promise<Array<{
        pubkey: Address;
        account: AccountInfo<Uint8Array | ParsedAccountData>;
    }>>;
    confirmTransaction(strategy: TransactionConfirmationStrategy, commitment?: Commitment): Promise<RpcResponseAndContext<SignatureResult>>;
    /** @deprecated Instead, call `confirmTransaction` and pass in {@link TransactionConfirmationStrategy} */
    confirmTransaction(strategy: TransactionSignature, commitment?: Commitment): Promise<RpcResponseAndContext<SignatureResult>>;
    private getCancellationPromise;
    private getTransactionConfirmationPromise;
    private confirmTransactionUsingBlockHeightExceedanceStrategy;
    private confirmTransactionUsingDurableNonceStrategy;
    private confirmTransactionUsingLegacyTimeoutStrategy;
    /**
     * Return the list of nodes that are currently participating in the cluster
     */
    getClusterNodes(): Promise<GetClusterNodesApiResponse>;
    /**
     * Fetch the RPC node health status.
     */
    getHealth(): Promise<"ok">;
    /**
     * Fetch the RPC node identity.
     */
    getIdentity(): Promise<{
        identity: Address;
    }>;
    /**
     * Fetch the highest full and incremental snapshot slots available on the RPC node.
     */
    getHighestSnapshotSlot(): Promise<Readonly<{
        full: _solana_rpc_types.Slot;
        incremental: _solana_rpc_types.Slot | null;
    }>>;
    /**
     * Fetch the highest slot seen by retransmit stage.
     */
    getMaxRetransmitSlot(): Promise<bigint>;
    /**
     * Fetch the highest slot seen by blockstore.
     */
    getMaxShredInsertSlot(): Promise<bigint>;
    /**
     * Return the list of nodes that are currently participating in the cluster
     */
    getVoteAccounts(commitmentOrConfig?: Commitment | GetVoteAccountsConfig): Promise<VoteAccountStatus>;
    /**
     * Fetch the current slot that the node is processing
     */
    getSlot(commitmentOrConfig?: Commitment | GetSlotConfig): Promise<ReturnType<GetSlotApi['getSlot']>>;
    /**
     * Fetch the current slot leader of the cluster
     */
    getSlotLeader(commitmentOrConfig?: Commitment | GetSlotLeaderConfig): Promise<string>;
    /**
     * Fetch `limit` number of slot leaders starting from `startSlot`
     *
     * @param startSlot fetch slot leaders starting from this slot
     * @param limit number of slot leaders to return
     */
    getSlotLeaders(startSlot: number | bigint, limit: number): Promise<Array<Address>>;
    /**
     * Fetch the current status of a signature
     */
    getSignatureStatus(signature: TransactionSignature, config?: SignatureStatusConfig): Promise<RpcResponseAndContext<SignatureStatus | null>>;
    /**
     * Fetch the current statuses of a batch of signatures
     */
    getSignatureStatuses(signatures: Array<TransactionSignature>, config?: SignatureStatusConfig): Promise<RpcResponseAndContext<Array<SignatureStatus | null>>>;
    /**
     * Fetch the current transaction count of the cluster
     */
    getTransactionCount(commitmentOrConfig?: Commitment | GetTransactionCountConfig): Promise<bigint>;
    /**
     * Fetch the current total currency supply of the cluster in lamports
     *
     * @deprecated Deprecated since RPC v1.2.8. Please use {@link getSupply} instead.
     */
    getTotalSupply(commitment?: Commitment): Promise<number>;
    /**
     * Fetch the cluster InflationGovernor parameters
     */
    getInflationGovernor(commitmentOrConfig?: Commitment | GetInflationGovernorConfig): Promise<InflationGovernor>;
    /**
     * Fetch the inflation reward for a list of addresses for an epoch
     */
    getInflationReward(addresses: Address[], epoch?: number, commitmentOrConfig?: Commitment | GetInflationRewardConfig): Promise<(InflationReward | null)[]>;
    /**
     * Fetch the specific inflation values for the current epoch
     */
    getInflationRate(): Promise<InflationRate>;
    /**
     * Fetch the Epoch Info parameters
     */
    getEpochInfo(commitmentOrConfig?: Commitment | GetEpochInfoConfig): Promise<EpochInfo>;
    /**
     * Fetch the Epoch Schedule parameters
     */
    getEpochSchedule(): Promise<EpochSchedule>;
    /**
     * Fetch the leader schedule for the current epoch
     * @return {Promise<RpcResponseAndContext<LeaderSchedule>>}
     */
    getLeaderSchedule(slotOrCommitmentOrConfig?: number | bigint | null | Commitment | GetLeaderScheduleConfig, commitmentOrConfig?: Commitment | GetLeaderScheduleConfig): Promise<LeaderSchedule | null>;
    /**
     * Fetch the minimum balance needed to exempt an account of `dataLength`
     * size from rent
     */
    getMinimumBalanceForRentExemption(dataLength: number, commitmentOrConfig?: Commitment | GetMinimumBalanceForRentExemptionConfig): Promise<number>;
    /**
     * Fetch recent performance samples
      * @return {Promise<readonly PerfSample[]>}
     */
    getRecentPerformanceSamples(limit?: number): Promise<ReturnType<GetRecentPerformanceSamplesApi['getRecentPerformanceSamples']>>;
    /**
     * Fetch the fee for a message from the cluster, return with context
     */
    getFeeForMessage(message: VersionedMessage, commitmentOrConfig?: Commitment | GetFeeForMessageConfig): Promise<ReturnType<GetFeeForMessageApi['getFeeForMessage']>>;
    /**
     * Fetch a list of prioritization fees from recent blocks.
     */
    getRecentPrioritizationFees(config?: GetRecentPrioritizationFeesConfig): Promise<readonly RecentPrioritizationFees[]>;
    /**
     * Fetch the latest blockhash from the cluster
     * @return {Promise<BlockhashWithExpiryBlockHeight>}
     */
    getLatestBlockhash(commitmentOrConfig?: Commitment | GetLatestBlockhashConfig): Promise<BlockhashWithExpiryBlockHeight>;
    /**
     * Fetch the latest blockhash from the cluster
     * @return {Promise<BlockhashWithExpiryBlockHeight>}
     */
    getLatestBlockhashAndContext(commitmentOrConfig?: Commitment | GetLatestBlockhashConfig): Promise<RpcResponseAndContext<BlockhashWithExpiryBlockHeight>>;
    /**
     * Returns whether a blockhash is still valid or not
     */
    isBlockhashValid(blockhash: Blockhash, rawConfig?: IsBlockhashValidConfig): Promise<ReturnType<IsBlockhashValidApi['isBlockhashValid']>>;
    /**
     * Fetch the node version
     */
    getVersion(): Promise<Readonly<{
        'feature-set': number;
        'solana-core': string;
    }>>;
    /**
     * Fetch the genesis hash
     */
    getGenesisHash(): Promise<_solana_rpc_types.Base58EncodedBytes>;
    /**
     * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
     * setting the `maxSupportedTransactionVersion` property.
     */
    getBlock(slot: number, rawConfig: GetBlockConfig & {
        transactionDetails: 'accounts';
    }): Promise<AccountsModeBlockResponse | null>;
    /**
     * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
     * setting the `maxSupportedTransactionVersion` property.
     */
    getBlock(slot: number, rawConfig: GetBlockConfig & {
        transactionDetails: 'none';
    }): Promise<NoneModeBlockResponse | null>;
    /**
     * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
     * setting the `maxSupportedTransactionVersion` property.
     */
    getBlock(slot: number, rawConfig: GetBlockConfig & {
        transactionDetails: 'signatures';
    }): Promise<SignaturesModeBlockResponse | null>;
    /**
     * Fetch a processed block from the cluster.
     *
     * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
     * setting the `maxSupportedTransactionVersion` property.
     */
    getBlock(slot: number, rawConfig?: GetBlockConfig): Promise<BlockResponse | null>;
    /**
     * Fetch a processed block from the cluster.
     */
    getBlock(slot: number, rawConfig: GetVersionedBlockConfig & {
        transactionDetails: 'accounts';
    }): Promise<VersionedAccountsModeBlockResponse | null>;
    getBlock(slot: number, rawConfig: GetVersionedBlockConfig & {
        transactionDetails: 'none';
    }): Promise<VersionedNoneModeBlockResponse | null>;
    getBlock(slot: number, rawConfig: GetVersionedBlockConfig & {
        transactionDetails: 'signatures';
    }): Promise<VersionedSignaturesModeBlockResponse | null>;
    getBlock(slot: number, rawConfig?: GetVersionedBlockConfig): Promise<VersionedBlockResponse | null>;
    /**
     * Fetch parsed transaction details for a confirmed or finalized block
     */
    getParsedBlock(slot: number, rawConfig: GetVersionedBlockConfig & {
        transactionDetails: 'accounts';
    }): Promise<ParsedAccountsModeBlockResponse | null>;
    getParsedBlock(slot: number, rawConfig: GetVersionedBlockConfig & {
        transactionDetails: 'none';
    }): Promise<ParsedNoneModeBlockResponse | null>;
    getParsedBlock(slot: number, rawConfig: GetVersionedBlockConfig & {
        transactionDetails: 'signatures';
    }): Promise<ParsedSignaturesModeBlockResponse | null>;
    getParsedBlock(slot: number, rawConfig?: GetVersionedBlockConfig): Promise<ParsedBlockResponse | null>;
    getBlockHeight: (commitmentOrConfig?: Commitment | GetBlockHeightConfig) => Promise<number>;
    getBlockProduction(configOrCommitment?: GetBlockProductionConfig | Commitment): Promise<ReturnType<GetBlockProductionApi['getBlockProduction']>>;
    /**
     * Fetch a confirmed or finalized transaction from the cluster.
     *
     * @deprecated Instead, call `getTransaction` using a
     * `GetVersionedTransactionConfig` by setting the
     * `maxSupportedTransactionVersion` property.
     */
    getTransaction(signature: string, rawConfig?: GetTransactionConfig): Promise<TransactionResponse | null>;
    /**
     * Fetch a confirmed or finalized transaction from the cluster.
     */
    getTransaction(signature: string, rawConfig: GetVersionedTransactionConfig): Promise<VersionedTransactionResponse | null>;
    /**
     * Fetch parsed transaction details for a confirmed or finalized transaction
     */
    getParsedTransaction(signature: TransactionSignature, commitmentOrConfig?: GetVersionedTransactionConfig | Finality): Promise<ParsedTransactionWithMeta | null>;
    /**
     * Fetch parsed transaction details for a batch of confirmed transactions
     */
    getParsedTransactions(signatures: TransactionSignature[], commitmentOrConfig?: GetVersionedTransactionConfig | Finality): Promise<(ParsedTransactionWithMeta | null)[]>;
    /**
     * Fetch transaction details for a batch of confirmed transactions.
     * Similar to {@link getParsedTransactions} but returns a {@link TransactionResponse}.
     *
     * @deprecated Instead, call `getTransactions` using a
     * `GetVersionedTransactionConfig` by setting the
     * `maxSupportedTransactionVersion` property.
     */
    getTransactions(signatures: TransactionSignature[], commitmentOrConfig?: GetTransactionConfig | Finality): Promise<(TransactionResponse | null)[]>;
    /**
     * Fetch transaction details for a batch of confirmed transactions.
     * Similar to {@link getParsedTransactions} but returns a {@link
     * VersionedTransactionResponse}.
     */
    getTransactions(signatures: TransactionSignature[], commitmentOrConfig: GetVersionedTransactionConfig | Finality): Promise<(VersionedTransactionResponse | null)[]>;
    /**
     * Fetch a list of Transactions and transaction statuses from the cluster
     * for a confirmed block.
     *
     * @deprecated Deprecated since RPC v1.7.0. Please use {@link getBlock} instead.
     */
    getConfirmedBlock(slot: number, commitment?: Finality): Promise<ConfirmedBlock>;
    /**
     * Fetch confirmed blocks between two slots
     */
    getBlocks(startSlot: number, endSlot?: number, commitment?: Finality): Promise<Array<number>>;
    getBlocks(startSlot: number, endSlot?: number, config?: GetBlocksConfig): Promise<Array<number>>;
    getBlocks(startSlot: number, config?: GetBlocksConfig): Promise<Array<number>>;
    /**
     * Fetch confirmed blocks starting at the provided slot, limited to the requested length.
     */
    getBlocksWithLimit(startSlot: number, limit: number, commitment?: Finality): Promise<Array<number>>;
    getBlocksWithLimit(startSlot: number, limit: number, config?: GetBlocksConfig): Promise<Array<number>>;
    /**
     * Fetch the amount of cluster stake that has voted on a block.
     */
    getBlockCommitment(slot: number | bigint): Promise<ReturnType<GetBlockCommitmentApi['getBlockCommitment']>>;
    /**
     * Fetch a list of Signatures from the cluster for a block, excluding rewards
     */
    getBlockSignatures(slot: number, commitment?: Finality): Promise<BlockSignatures>;
    /**
     * Fetch a list of Signatures from the cluster for a confirmed block, excluding rewards
     *
     * @deprecated Deprecated since RPC v1.7.0. Please use {@link getBlockSignatures} instead.
     */
    getConfirmedBlockSignatures(slot: number, commitment?: Finality): Promise<BlockSignatures>;
    /**
     * Fetch a transaction details for a confirmed transaction
     *
     * @deprecated Deprecated since RPC v1.7.0. Please use {@link getTransaction} instead.
     */
    getConfirmedTransaction(signature: TransactionSignature, commitment?: Finality): Promise<ConfirmedTransaction | null>;
    /**
     * Fetch parsed transaction details for a confirmed transaction
     *
     * @deprecated Deprecated since RPC v1.7.0. Please use {@link getParsedTransaction} instead.
     */
    getParsedConfirmedTransaction(signature: TransactionSignature, commitment?: Finality): Promise<ParsedConfirmedTransaction | null>;
    /**
     * Fetch parsed transaction details for a batch of confirmed transactions
     *
     * @deprecated Deprecated since RPC v1.7.0. Please use {@link getParsedTransactions} instead.
     */
    getParsedConfirmedTransactions(signatures: TransactionSignature[], commitment?: Finality): Promise<(ParsedConfirmedTransaction | null)[]>;
    /**
     * Returns confirmed signatures for transactions involving an
     * address backwards in time from the provided signature or most recent confirmed block
     *
     *
     * @param address queried address
     * @param options
     */
    getSignaturesForAddress(address: Address, options?: SignaturesForAddressOptions, commitment?: Finality): Promise<Array<ConfirmedSignatureInfo>>;
    getAddressLookupTable(accountKey: Address, config?: GetAccountInfoConfig): Promise<RpcResponseAndContext<AddressLookupTableAccount | null>>;
    /**
     * Fetch the contents of a Nonce account from the cluster, return with context
     */
    getNonceAndContext(nonceAccount: Address, commitmentOrConfig?: Commitment | GetNonceAndContextConfig): Promise<RpcResponseAndContext<NonceAccount | null>>;
    /**
     * Fetch the contents of a Nonce account from the cluster
     */
    getNonce(nonceAccount: Address, commitmentOrConfig?: Commitment | GetNonceConfig): Promise<NonceAccount | null>;
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
    requestAirdrop(to: Address, lamports: number, commitmentOrConfig?: Commitment | RequestAirdropConfig): Promise<TransactionSignature>;
    /**
     * get the stake minimum delegation
     */
    getStakeMinimumDelegation(config?: GetStakeMinimumDelegationConfig): Promise<ReturnType<GetStakeMinimumDelegationApi['getStakeMinimumDelegation']>>;
    /**
     * Simulate a transaction
     *
     * @deprecated Instead, call {@link simulateTransaction} with {@link
     * VersionedTransaction} and {@link SimulateTransactionConfig} parameters
     */
    simulateTransaction(transactionOrMessage: Transaction | Message, signers?: Array<Signer>, includeAccounts?: boolean | Array<Address>): Promise<RpcResponseAndContext<SimulatedTransactionResponse>>;
    /**
     * Simulate a transaction
     */
    simulateTransaction(transaction: VersionedTransaction, config?: SimulateTransactionConfig): Promise<RpcResponseAndContext<SimulatedTransactionResponse>>;
    /**
     * Sign and send a transaction
     *
     * @deprecated Instead, call {@link sendTransaction} with a {@link
     * VersionedTransaction}
     */
    sendTransaction(transaction: Transaction, signers: Array<Signer>, options?: SendOptions): Promise<TransactionSignature>;
    /**
     * Send a signed transaction
     */
    sendTransaction(transaction: VersionedTransaction, options?: SendOptions): Promise<TransactionSignature>;
    /**
     * Send a transaction that has already been signed and serialized into the
     * wire format
     */
    sendRawTransaction(rawTransaction: Uint8Array | Array<number>, options?: SendOptions): Promise<TransactionSignature>;
    /**
     * Send a transaction that has already been signed, serialized into the
     * wire format, and encoded as a base64 string
     */
    sendEncodedTransaction(encodedTransaction: string, options?: SendOptions): Promise<TransactionSignature>;
    /**
     * Register a callback to be invoked whenever the specified account changes
     *
     * @param publicKey Public key of the account to monitor
     * @param callback Function to invoke whenever the account is changed
     * @param config
     * @return subscription id
     */
    onAccountChange(publicKey: Address, callback: AccountChangeCallback, config?: AccountSubscriptionConfig): ClientSubscriptionId;
    /** @deprecated Instead, pass in an {@link AccountSubscriptionConfig} */
    onAccountChange(publicKey: Address, callback: AccountChangeCallback, commitment?: Commitment): ClientSubscriptionId;
    /**
     * Deregister an account notification callback
     *
     * @param clientSubscriptionId client subscription id to deregister
     */
    removeAccountChangeListener(clientSubscriptionId: ClientSubscriptionId): Promise<void>;
    /**
     * Register a callback to be invoked whenever accounts owned by the
     * specified program change
     *
     * @param programId Public key of the program to monitor
     * @param callback Function to invoke whenever the account is changed
     * @param config
     * @return subscription id
     */
    onProgramAccountChange(programId: Address, callback: ProgramAccountChangeCallback, config?: ProgramAccountSubscriptionConfig): ClientSubscriptionId;
    /** @deprecated Instead, pass in a {@link ProgramAccountSubscriptionConfig} */
    onProgramAccountChange(programId: Address, callback: ProgramAccountChangeCallback, commitment?: Commitment, filters?: GetProgramAccountsFilter[]): ClientSubscriptionId;
    /**
     * Deregister an account notification callback
     *
     * @param clientSubscriptionId client subscription id to deregister
     */
    removeProgramAccountChangeListener(clientSubscriptionId: ClientSubscriptionId): Promise<void>;
    /**
     * Registers a callback to be invoked whenever logs are emitted.
     */
    onLogs(filter: LogsFilter, callback: LogsCallback, commitment?: Commitment): ClientSubscriptionId;
    /**
     * Deregister a logs callback.
     *
     * @param clientSubscriptionId client subscription id to deregister.
     */
    removeOnLogsListener(clientSubscriptionId: ClientSubscriptionId): Promise<void>;
    /**
     * Register a callback to be invoked upon slot changes
     *
     * @param callback Function to invoke whenever the slot changes
     * @return subscription id
     */
    onSlotChange(callback: SlotChangeCallback): ClientSubscriptionId;
    /**
     * Deregister a slot notification callback
     *
     * @param clientSubscriptionId client subscription id to deregister
     */
    removeSlotChangeListener(clientSubscriptionId: ClientSubscriptionId): Promise<void>;
    /**
     * Register a callback to be invoked upon slot updates. {@link SlotUpdate}'s
     * may be useful to track live progress of a cluster.
     *
     * @param callback Function to invoke whenever the slot updates
     * @return subscription id
     */
    onSlotUpdate(callback: SlotUpdateCallback): ClientSubscriptionId;
    /**
     * Deregister a slot update notification callback
     *
     * @param clientSubscriptionId client subscription id to deregister
     */
    removeSlotUpdateListener(clientSubscriptionId: ClientSubscriptionId): Promise<void>;
    _buildArgs(args: Array<any>, override?: Commitment, encoding?: 'jsonParsed' | 'base64', extra?: any): Array<any>;
    /**
     * Register a callback to be invoked upon signature updates
     *
     * @param signature Transaction signature string in base 58
     * @param callback Function to invoke on signature notifications
     * @param commitment Specify the commitment level signature must reach before notification
     * @return subscription id
     */
    onSignature(signature: TransactionSignature, callback: SignatureResultCallback, commitment?: Commitment): ClientSubscriptionId;
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
    onSignatureWithOptions(signature: TransactionSignature, callback: SignatureSubscriptionCallback, options?: SignatureSubscriptionOptions): ClientSubscriptionId;
    /**
     * Deregister a signature notification callback
     *
     * @param clientSubscriptionId client subscription id to deregister
     */
    removeSignatureListener(clientSubscriptionId: ClientSubscriptionId): Promise<void>;
    /**
     * Register a callback to be invoked upon root changes
     *
     * @param callback Function to invoke whenever the root changes
     * @return subscription id
     */
    onRootChange(callback: RootChangeCallback): ClientSubscriptionId;
    /**
     * Deregister a root notification callback
     *
     * @param clientSubscriptionId client subscription id to deregister
     */
    removeRootChangeListener(clientSubscriptionId: ClientSubscriptionId): Promise<void>;
}

/**
 * @deprecated Deprecated since Solana v1.17.20.
 */
declare const BPF_LOADER_PROGRAM_ID: Address;
/**
 * Factory class for transactions to interact with a program loader
 *
 * @deprecated Deprecated since Solana v1.17.20.
 */
declare class BpfLoader {
    /**
     * Minimum number of signatures required to load a program not including
     * retries
     *
     * Can be used to calculate transaction fees
     */
    static getMinNumSignatures(dataLength: number): number;
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
    static load(connection: Connection, payer: Signer, program: Signer, elf: Uint8Array | Array<number>, loaderProgramId: Address): Promise<boolean>;
}

declare class SendTransactionError extends Error {
    private signature;
    private transactionMessage;
    private transactionLogs;
    constructor({ action, signature, transactionMessage, logs, }: {
        action: 'send' | 'simulate';
        signature: TransactionSignature;
        transactionMessage: string;
        logs?: string[];
    });
    get transactionError(): {
        message: string;
        logs?: string[];
    };
    get logs(): string[] | undefined;
    getLogs(connection: Connection): Promise<string[]>;
}
declare const SolanaJSONRPCErrorCode: {
    readonly JSON_RPC_SERVER_ERROR_BLOCK_CLEANED_UP: -32001;
    readonly JSON_RPC_SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE: -32002;
    readonly JSON_RPC_SERVER_ERROR_TRANSACTION_SIGNATURE_VERIFICATION_FAILURE: -32003;
    readonly JSON_RPC_SERVER_ERROR_BLOCK_NOT_AVAILABLE: -32004;
    readonly JSON_RPC_SERVER_ERROR_NODE_UNHEALTHY: -32005;
    readonly JSON_RPC_SERVER_ERROR_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE: -32006;
    readonly JSON_RPC_SERVER_ERROR_SLOT_SKIPPED: -32007;
    readonly JSON_RPC_SERVER_ERROR_NO_SNAPSHOT: -32008;
    readonly JSON_RPC_SERVER_ERROR_LONG_TERM_STORAGE_SLOT_SKIPPED: -32009;
    readonly JSON_RPC_SERVER_ERROR_KEY_EXCLUDED_FROM_SECONDARY_INDEX: -32010;
    readonly JSON_RPC_SERVER_ERROR_TRANSACTION_HISTORY_NOT_AVAILABLE: -32011;
    readonly JSON_RPC_SCAN_ERROR: -32012;
    readonly JSON_RPC_SERVER_ERROR_TRANSACTION_SIGNATURE_LEN_MISMATCH: -32013;
    readonly JSON_RPC_SERVER_ERROR_BLOCK_STATUS_NOT_AVAILABLE_YET: -32014;
    readonly JSON_RPC_SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION: -32015;
    readonly JSON_RPC_SERVER_ERROR_MIN_CONTEXT_SLOT_NOT_REACHED: -32016;
};
type SolanaJSONRPCErrorCodeEnum = (typeof SolanaJSONRPCErrorCode)[keyof typeof SolanaJSONRPCErrorCode];
declare class SolanaJSONRPCError extends Error {
    code: SolanaJSONRPCErrorCodeEnum | unknown;
    data?: any;
    constructor({ code, message, data, }: Readonly<{
        code: unknown;
        message: string;
        data?: any;
    }>, customMessage?: string);
}

/**
 * Program loader interface
 */
declare class Loader {
    /**
     * Amount of program data placed in each load Transaction
     */
    static chunkSize: number;
    /**
     * Minimum number of signatures required to load a program not including
     * retries
     *
     * Can be used to calculate transaction fees
     */
    static getMinNumSignatures(dataLength: number): number;
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
    static load(connection: Connection, payer: Signer, program: Signer, programId: Address, data: Uint8Array | Array<number>): Promise<boolean>;
}

/**
 * Backwards-compatible exports for the renamed Address module.
 * @deprecated Use Address instead. Target for removal in v3.
 */

/**
 * Backwards-compatible alias for {@link Address}.
 * @deprecated Use {@link Address} instead. Target for removal in v3.
 */
declare const PublicKey: typeof Address;
type PublicKey = Address;
type PublicKeyInitData = AddressInitData;

declare const VALIDATOR_INFO_KEY: Address;
/**
 * Info used to identity validators.
 */
type Info = {
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
/**
 * ValidatorInfo class
 */
declare class ValidatorInfo {
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
    constructor(key: Address, info: Info);
    /**
     * Deserialize ValidatorInfo from the config account data. Exactly two config
     * keys are required in the data.
     *
     * @param buffer config account data
     * @return null if info was not found
     */
    static fromConfigData(buffer: Uint8Array | Array<number>): ValidatorInfo | null;
}

declare const VOTE_PROGRAM_ID: Address;
/**
 * Vote account state versions
 */
declare enum VoteStateVersion {
    Uninitialized = 0,
    V1_14_11 = 1
}
type Lockout = {
    slot: number;
    confirmationCount: number;
};
/**
 * History of how many credits earned by the end of each epoch
 */
type EpochCredits = Readonly<{
    epoch: number;
    credits: number;
    prevCredits: number;
}>;
type AuthorizedVoter = Readonly<{
    epoch: number;
    authorizedVoter: Address;
}>;
type AuthorizedVoterRaw = Readonly<{
    authorizedVoter: Uint8Array;
    epoch: number;
}>;
type PriorVoters = Readonly<{
    buf: PriorVoterRaw[];
    idx: number;
    isEmpty: number;
}>;
type PriorVoter = Readonly<{
    authorizedPubkey: Address;
    epochOfLastAuthorizedSwitch: number;
    targetEpoch: number;
}>;
type PriorVoterRaw = Readonly<{
    authorizedPubkey: Uint8Array;
    epochOfLastAuthorizedSwitch: number;
    targetEpoch: number;
}>;
type BlockTimestamp = Readonly<{
    slot: number;
    timestamp: number;
}>;
type VoteAccountData = Readonly<{
    authorizedVoters: AuthorizedVoterRaw[];
    authorizedWithdrawer: Uint8Array;
    commission: number;
    epochCredits: EpochCredits[];
    lastTimestamp: BlockTimestamp;
    nodePubkey: Uint8Array;
    priorVoters: PriorVoters;
    rootSlot: number;
    rootSlotValid: number;
    votes: Lockout[];
}>;
/**
 * VoteAccount class
 */
declare class VoteAccount {
    nodePubkey: Address;
    authorizedWithdrawer: Address;
    commission: number;
    rootSlot: number | null;
    votes: Lockout[];
    authorizedVoters: AuthorizedVoter[];
    priorVoters: PriorVoter[];
    epochCredits: EpochCredits[];
    lastTimestamp: BlockTimestamp;
    /**
     * Deserialize VoteAccount from the account data.
     *
     * @param bufferLike account data
     * @return VoteAccount
     */
    static fromAccountData(bufferLike: Uint8Array | Array<number>): VoteAccount;
}

declare const SYSVAR_CLOCK_PUBKEY: Address;
declare const SYSVAR_EPOCH_SCHEDULE_PUBKEY: Address;
declare const SYSVAR_INSTRUCTIONS_PUBKEY: Address;
declare const SYSVAR_RECENT_BLOCKHASHES_PUBKEY: Address;
declare const SYSVAR_RENT_PUBKEY: Address;
declare const SYSVAR_REWARDS_PUBKEY: Address;
declare const SYSVAR_SLOT_HASHES_PUBKEY: Address;
declare const SYSVAR_SLOT_HISTORY_PUBKEY: Address;
declare const SYSVAR_STAKE_HISTORY_PUBKEY: Address;

type Cluster = 'devnet' | 'testnet' | 'mainnet-beta';
/**
 * Retrieves the RPC API URL for the specified cluster
 * @param {Cluster} [cluster="devnet"] - The cluster name of the RPC API URL to use. Possible options: 'devnet' | 'testnet' | 'mainnet-beta'
 * @param {boolean} [tls="http"] - Use TLS when connecting to cluster.
 *
 * @returns {string} URL string of the RPC endpoint
 */
declare function clusterApiUrl(cluster?: Cluster, tls?: boolean): string;

/**
 * A 64 byte secret key, the first 32 bytes of which is the
 * private scalar and the last 32 bytes is the public key.
 * Read more: https://blog.mozilla.org/warner/2011/11/29/ed25519-keys/
 */
type Ed25519SecretKey = Uint8Array;
/**
 * Ed25519 Keypair
 */
interface Ed25519Keypair {
    publicKey: Uint8Array;
    secretKey: Ed25519SecretKey;
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
declare function sendAndConfirmRawTransaction(connection: Connection, rawTransaction: Uint8Array | Array<number>, confirmationStrategy: TransactionConfirmationStrategy, options?: ConfirmOptions): Promise<TransactionSignature>;
/**
 * @deprecated Calling `sendAndConfirmRawTransaction()` without a `confirmationStrategy`
 * is no longer supported and will be removed in a future version.
 */
declare function sendAndConfirmRawTransaction(connection: Connection, rawTransaction: Uint8Array | Array<number>, options?: ConfirmOptions): Promise<TransactionSignature>;

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
declare function sendAndConfirmTransaction(connection: Connection, transaction: Transaction, signers: Array<Signer>, options?: ConfirmOptions & Readonly<{
    abortSignal?: AbortSignal;
}>): Promise<TransactionSignature>;

/**
 * There are 1-billion lamports in one SOL
 */
declare const LAMPORTS_PER_SOL = 1000000000;

export { type AccountBalancePair, type AccountChangeCallback, type AccountInfo, type AccountKeysFromLookups, type AccountMeta, type AccountSubscriptionConfig, type AccountsModeBlockResponse, Address, type AddressInitData, AddressLookupTableAccount, type AddressLookupTableAccountArgs, AddressLookupTableInstruction, AddressLookupTableProgram, type AddressLookupTableState, type AdvanceNonceParams, type AllocateParams, type AllocateWithSeedParams, type AssignParams, type AssignWithSeedParams, type AuthorizeNonceParams, type AuthorizeStakeParams, type AuthorizeVoteParams, type AuthorizeVoteWithSeedParams, type AuthorizeWithSeedStakeParams, Authorized, type AuthorizedVoter, BPF_LOADER_DEPRECATED_PROGRAM_ID, BPF_LOADER_PROGRAM_ID, type BaseTransactionConfirmationStrategy, type BlockCommitment, type BlockProduction, type BlockResponse, type BlockSignatures, type BlockTimestamp, type Blockhash, type BlockhashWithExpiryBlockHeight, type BlockheightBasedTransactionConfirmationStrategy, BpfLoader, type CloseLookupTableParams, type Cluster, type CompileLegacyArgs, type CompileV0Args, type CompiledInnerInstruction, type CompiledInstruction, type ComputeBudgetInstructionType, ComputeBudgetProgram, type ConfirmOptions, type ConfirmedBlock, type ConfirmedSignatureInfo, type ConfirmedTransaction, type ConfirmedTransactionMeta, Connection, type ConnectionConfig, type ContactInfo, type Context, type CreateAccountParams, type CreateAccountWithSeedParams, type CreateEd25519InstructionWithPrivateKeyParams, type CreateEd25519InstructionWithPublicKeyParams, type CreateLookupTableParams, type CreateNonceAccountParams, type CreateNonceAccountWithSeedParams, type CreateSecp256k1InstructionWithEthAddressParams, type CreateSecp256k1InstructionWithPrivateKeyParams, type CreateSecp256k1InstructionWithPublicKeyParams, type CreateStakeAccountParams, type CreateStakeAccountWithSeedParams, type CreateVoteAccountParams, type DataSizeFilter, type DataSlice, type DeactivateLookupTableParams, type DeactivateStakeParams, type DecodedTransferInstruction, type DecodedTransferWithSeedInstruction, type DecompileArgs, type DelegateStakeParams, type DurableNonce, type DurableNonceTransactionConfirmationStrategy, type Ed25519Keypair, Ed25519Program, type EpochCredits, type EpochInfo, EpochSchedule, type ExtendLookupTableParams, type Finality, type FreezeLookupTableParams, type GetAccountInfoConfig, type GetAccountKeysArgs, type GetBalanceConfig, type GetBlockConfig, type GetBlockHeightConfig, type GetBlockProductionConfig, type GetBlocksConfig, type GetEpochInfoConfig, type GetFeeForMessageConfig, type GetInflationGovernorConfig, type GetInflationRewardConfig, type GetLargestAccountsConfig, type GetLatestBlockhashConfig, type GetLeaderScheduleConfig, type GetMinimumBalanceForRentExemptionConfig, type GetMultipleAccountsConfig, type GetNonceAndContextConfig, type GetNonceConfig, type GetParsedProgramAccountsConfig, type GetProgramAccountsConfig, type GetProgramAccountsFilter, type GetProgramAccountsResponse, type GetRecentPrioritizationFeesConfig, type GetSlotConfig, type GetSlotLeaderConfig, type GetStakeMinimumDelegationConfig, type GetSupplyConfig, type GetTokenAccountBalanceConfig, type GetTokenAccountsByDelegateConfig, type GetTokenAccountsByOwnerConfig, type GetTokenLargestAccountsConfig, type GetTokenSupplyConfig, type GetTransactionConfig, type GetTransactionCountConfig, type GetVersionedBlockConfig, type GetVersionedTransactionConfig, type GetVoteAccountsConfig, type HttpHeaders, type Identity, type InflationGovernor, type InflationRate, type InflationReward, type Info, type InitializeAccountParams, type InitializeNonceParams, type InitializeStakeParams, type IsBlockhashValidConfig, type KeyedAccountInfo, Keypair, LAMPORTS_PER_SOL, type LargestAccountsFilter, type LeaderSchedule, type LoadedAddresses, Loader, type Lockout, Lockup, type Logs, type LogsCallback, type LogsFilter, type LookupTableInstructionType, MAX_SEED_LENGTH, type MemcmpFilter, type MergeStakeParams, Message, MessageAccountKeys, type MessageAddressTableLookup, type MessageArgs, type MessageCompiledInstruction, type MessageHeader, MessageV0, type MessageV0Args, NONCE_ACCOUNT_LENGTH, NonceAccount, type NonceInformation, type NoneModeBlockResponse, PACKET_DATA_SIZE, PUBLIC_KEY_LENGTH, type ParsedAccountData, type ParsedAccountsModeBlockResponse, type ParsedAddressTableLookup, type ParsedBlockResponse, type ParsedConfirmedTransaction, type ParsedConfirmedTransactionMeta, type ParsedInnerInstruction, type ParsedInstruction, type ParsedMessage, type ParsedMessageAccount, type ParsedNoneModeBlockResponse, type ParsedSignaturesModeBlockResponse, type ParsedTransaction, type ParsedTransactionMeta, type ParsedTransactionWithMeta, type PartiallyDecodedInstruction, type PerfSample, type PriorVoter, type ProgramAccountChangeCallback, type ProgramAccountSubscriptionConfig, PublicKey, type PublicKeyInitData, type RecentPrioritizationFees, type RequestAirdropConfig, type RequestHeapFrameParams, type RequestUnitsParams, type RootChangeCallback, type RpcResponseAndContext, SIGNATURE_LENGTH_IN_BYTES, STAKE_CONFIG_ID, SYSVAR_CLOCK_PUBKEY, SYSVAR_EPOCH_SCHEDULE_PUBKEY, SYSVAR_INSTRUCTIONS_PUBKEY, SYSVAR_RECENT_BLOCKHASHES_PUBKEY, SYSVAR_RENT_PUBKEY, SYSVAR_REWARDS_PUBKEY, SYSVAR_SLOT_HASHES_PUBKEY, SYSVAR_SLOT_HISTORY_PUBKEY, SYSVAR_STAKE_HISTORY_PUBKEY, Secp256k1Program, type SendOptions, SendTransactionError, type SerializeConfig, type SetComputeUnitLimitParams, type SetComputeUnitPriceParams, type SignaturePubkeyPair, type SignatureReceivedNotification, type SignatureResult, type SignatureResultCallback, type SignatureStatus, type SignatureStatusConfig, type SignatureStatusNotification, type SignatureSubscriptionCallback, type SignatureSubscriptionOptions, type SignaturesForAddressOptions, type SignaturesModeBlockResponse, type Signer, type SimulateTransactionConfig, type SimulatedTransactionAccountInfo, type SimulatedTransactionResponse, type SlotChangeCallback, type SlotInfo, type SlotUpdate, type SlotUpdateCallback, SolanaJSONRPCError, SolanaJSONRPCErrorCode, type SolanaJSONRPCErrorCodeEnum, type SplitStakeParams, type SplitStakeWithSeedParams, StakeAuthorizationLayout, type StakeAuthorizationType, StakeInstruction, type StakeInstructionType, StakeProgram, type Supply, SystemInstruction, type SystemInstructionType, SystemProgram, type TokenAccountBalancePair, type TokenAccountsFilter, type TokenAmount, type TokenBalance, Transaction, type TransactionBlockhashCtor, type TransactionConfirmationStatus, type TransactionConfirmationStrategy, type TransactionCtorFields, type TransactionCtorFields_DEPRECATED, type TransactionError, TransactionExpiredBlockheightExceededError, TransactionExpiredNonceInvalidError, TransactionExpiredTimeoutError, TransactionInstruction, type TransactionInstructionCtorFields, TransactionMessage, type TransactionMessageArgs, type TransactionNonceCtor, type TransactionResponse, type TransactionReturnData, type TransactionReturnDataEncoding, type TransactionSignature, TransactionStatus, type TransactionVersion, type TransferParams, type TransferWithSeedParams, type UpdateValidatorIdentityParams, VALIDATOR_INFO_KEY, VERSION_PREFIX_MASK, VOTE_PROGRAM_ID, ValidatorInfo, type VersionedAccountsModeBlockResponse, type VersionedBlockResponse, VersionedMessage, type VersionedNoneModeBlockResponse, type VersionedSignaturesModeBlockResponse, VersionedTransaction, type VersionedTransactionResponse, VoteAccount, type VoteAccountData, type VoteAccountInfo, type VoteAccountStatus, VoteAuthorizationLayout, type VoteAuthorizationType, VoteInit, VoteInstruction, type VoteInstructionType, VoteProgram, VoteStateVersion, type WithdrawFromVoteAccountParams, type WithdrawNonceParams, type WithdrawStakeParams, clusterApiUrl, sendAndConfirmRawTransaction, sendAndConfirmTransaction };
