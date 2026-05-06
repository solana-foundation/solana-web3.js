// Internal compatibility shim for vendored program clients.
// Do not edit manually; update via ./scripts/vendor-program-clients.mjs.

export {assertAccountExists, assertAccountsExist, BASE_ACCOUNT_SIZE, decodeAccount, fetchEncodedAccount, fetchEncodedAccounts} from '@solana/accounts';
export type {Account, EncodedAccount, FetchAccountConfig, FetchAccountsConfig, MaybeAccount, MaybeEncodedAccount} from '@solana/accounts';

export {getAddressDecoder, getAddressEncoder, getProgramDerivedAddress, isProgramDerivedAddress} from '@solana/addresses';
export type {Address, ProgramDerivedAddress} from '@solana/addresses';

export {addDecoderSizePrefix, addEncoderSizePrefix, combineCodec, containsBytes, transformEncoder} from '@solana/codecs-core';
export type {Codec, Decoder, Encoder, FixedSizeCodec, FixedSizeDecoder, FixedSizeEncoder, ReadonlyUint8Array} from '@solana/codecs-core';

export {getArrayDecoder, getArrayEncoder, getDiscriminatedUnionDecoder, getDiscriminatedUnionEncoder, getEnumDecoder, getEnumEncoder, getStructDecoder, getStructEncoder, getTupleDecoder, getTupleEncoder, getUnitDecoder, getUnitEncoder} from '@solana/codecs-data-structures';
export type {GetDiscriminatedUnionVariant, GetDiscriminatedUnionVariantContent} from '@solana/codecs-data-structures';

export {getI64Decoder, getI64Encoder, getU16Decoder, getU16Encoder, getU32Decoder, getU32Encoder, getU64Decoder, getU64Encoder, getU8Decoder, getU8Encoder} from '@solana/codecs-numbers';

export {getUtf8Decoder, getUtf8Encoder} from '@solana/codecs-strings';

export {getSolanaErrorFromTransactionError, isSolanaError, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM, SOLANA_ERROR__PROGRAM_CLIENTS__FAILED_TO_IDENTIFY_INSTRUCTION, SOLANA_ERROR__PROGRAM_CLIENTS__INSUFFICIENT_ACCOUNT_METAS, SOLANA_ERROR__PROGRAM_CLIENTS__UNRECOGNIZED_INSTRUCTION_TYPE, SOLANA_ERROR__TRANSACTION__FAILED_TO_ESTIMATE_COMPUTE_LIMIT, SOLANA_ERROR__TRANSACTION__FAILED_WHEN_SIMULATING_TO_ESTIMATE_COMPUTE_LIMIT, SolanaError} from '@solana/errors';
export type {RpcSimulateTransactionResult} from '@solana/errors';

export {pipe} from '@solana/functional';

export {AccountRole, assertIsInstructionWithAccounts, upgradeRoleToSigner} from '@solana/instructions';
export type {AccountMeta, Instruction, InstructionWithAccounts, InstructionWithData, ReadonlyAccount, ReadonlySignerAccount, WritableAccount, WritableSignerAccount} from '@solana/instructions';

export {getOptionDecoder, getOptionEncoder} from '@solana/options';
export type {Option, OptionOrNullable} from '@solana/options';

export type {ClientWithPayer, ClientWithRpc, ClientWithTransactionPlanning, ClientWithTransactionSending} from '@solana/plugin-interfaces';

export {isProgramError} from '@solana/programs';

export type {Rpc} from '@solana/rpc';

export type {GetAccountInfoApi, GetMultipleAccountsApi, SimulateTransactionApi} from '@solana/rpc-api';

export type {Commitment, MicroLamports, Slot} from '@solana/rpc-types';

export {isTransactionSigner} from '@solana/signers';
export type {AccountSignerMeta, TransactionSigner} from '@solana/signers';

export {appendTransactionMessageInstruction, isTransactionMessageWithDurableNonceLifetime} from '@solana/transaction-messages';
export type {TransactionMessage, TransactionMessageWithFeePayer} from '@solana/transaction-messages';

export {compileTransaction, getBase64EncodedWireTransaction} from '@solana/transactions';
export type {Transaction} from '@solana/transactions';
