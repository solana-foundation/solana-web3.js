// Internal compatibility shim for Codama-generated Kit clients.
// Prefer direct leaf-package imports elsewhere in this repository.
export * from '@solana/accounts';
export * from '@solana/addresses';
export * from '@solana/codecs-core';
export * from '@solana/codecs-data-structures';
export * from '@solana/codecs-numbers';
export * from '@solana/codecs-strings';
export * from '@solana/errors';
export * from '@solana/functional';
export * from '@solana/instructions';
export * from '@solana/instruction-plans';
export * from '@solana/keys';
export * from '@solana/options';
export type * from '@solana/plugin-interfaces';
export * from '@solana/programs';
export * from '@solana/rpc';
export * from '@solana/rpc-subscriptions';
export * from '@solana/rpc-types';
export * from '@solana/signers';
export * from '@solana/transaction-messages';
export * from '@solana/transactions';
export type {
  RpcRequest,
  RpcRequestTransformer,
  RpcResponse,
  RpcResponseData,
  RpcResponseTransformer,
} from '@solana/rpc-spec-types';
export {createRpcMessage} from '@solana/rpc-spec-types';