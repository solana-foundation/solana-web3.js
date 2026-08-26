/**
 * Boundary: Connection subscription APIs -> internal subscription specs.
 *
 * This module translates Connection-facing subscription inputs into
 * normalized `SubscriptionSpec` values consumed by the rpc-subscriptions
 * subsystem. It sits between Connection and the runtime/controller stack,
 * using request-side adapters where needed so defaulting and compatibility
 * logic stay out of the runtime, registry, and controller.
 */
import type {Commitment} from '@solana/kit';

import type {Address} from '../address';
import {getProgramAccountsRpcFilters} from './request';
import type {
  AccountSubscriptionSpec,
  BlockSubscriptionSpec,
  LogsSubscriptionSpec,
  ProgramSubscriptionSpec,
  SignatureSubscriptionSpec,
} from '../rpc-subscriptions/runtime';
import type {
  AccountSubscriptionConfig,
  BlockSubscriptionConfig,
  BlockSubscriptionFilter,
  LogsFilter,
  ProgramAccountSubscriptionConfig,
  SignatureSubscriptionReceivedOptions,
  SignatureSubscriptionStatusOptions,
} from './subscription-types';

type ProgramSubscriptionFilters = ProgramAccountSubscriptionConfig['filters'];
type AccountSubscriptionSpecConfig = Readonly<{
  commitment: Commitment;
}> &
  Omit<AccountSubscriptionConfig, 'commitment'>;
type ProgramSubscriptionSpecConfig = Readonly<{
  commitment: Commitment;
}> &
  Omit<ProgramAccountSubscriptionConfig, 'commitment'>;
type SignatureSubscriptionSpecOptions =
  | (Readonly<{
      commitment: Commitment;
    }> &
      Omit<SignatureSubscriptionStatusOptions, 'commitment'>)
  | (Readonly<{
      commitment: Commitment;
    }> &
      Omit<SignatureSubscriptionReceivedOptions, 'commitment'>);
type BlockSubscriptionSpecConfig = Readonly<{
  commitment: NonNullable<BlockSubscriptionConfig['commitment']>;
}> &
  Omit<BlockSubscriptionConfig, 'commitment'>;

function normalizeDeprecatedProgramSubscriptionFilters(
  filters: ProgramSubscriptionFilters | undefined,
): NonNullable<ProgramSubscriptionSpec['options']>['filters'] {
  return getProgramAccountsRpcFilters(filters);
}

export function buildAccountSubscriptionSpec(
  address: Address,
  config: AccountSubscriptionSpecConfig,
): AccountSubscriptionSpec {
  return {
    address: address.toBase58(),
    kind: 'account',
    options: {
      commitment: config.commitment,
      encoding: config.encoding ?? 'base64',
    },
  };
}

export function buildProgramSubscriptionSpec(
  address: Address,
  config: ProgramSubscriptionSpecConfig,
  deprecatedFilters?: ProgramSubscriptionFilters,
): ProgramSubscriptionSpec {
  const filters =
    config.filters !== undefined
      ? getProgramAccountsRpcFilters(config.filters)
      : normalizeDeprecatedProgramSubscriptionFilters(deprecatedFilters);

  return {
    address: address.toBase58(),
    kind: 'program',
    options: {
      commitment: config.commitment,
      encoding: config.encoding ?? 'base64',
      ...(filters == null ? null : {filters}),
    },
  };
}

export function buildLogsSubscriptionSpec(
  filter: LogsFilter,
  commitment: Commitment,
): LogsSubscriptionSpec {
  return {
    filter:
      typeof filter === 'object'
        ? {mentions: [filter.toString()] as const}
        : filter,
    kind: 'logs',
    options: {commitment},
  };
}

export function buildSignatureSubscriptionSpec(
  signature: string,
  options: SignatureSubscriptionSpecOptions,
): SignatureSubscriptionSpec {
  return {
    kind: 'signature',
    options: options as SignatureSubscriptionSpec['options'],
    signature,
  };
}

export function buildBlockSubscriptionSpec(
  filter: BlockSubscriptionFilter,
  config: BlockSubscriptionSpecConfig,
): BlockSubscriptionSpec {
  return {
    filter:
      filter === 'all' ? 'all' : {mentionsAccountOrProgram: filter.toBase58()},
    kind: 'block',
    options: {
      commitment: config.commitment,
      ...(config.encoding != null ? {encoding: config.encoding} : null),
      ...(config.maxSupportedTransactionVersion !== undefined
        ? {
            maxSupportedTransactionVersion:
              config.maxSupportedTransactionVersion as 0 | 1,
          }
        : null),
      ...(config.rewards !== undefined ? {rewards: config.rewards} : null),
      ...(config.transactionDetails !== undefined
        ? {transactionDetails: config.transactionDetails}
        : null),
    } as BlockSubscriptionSpec['options'],
  };
}
