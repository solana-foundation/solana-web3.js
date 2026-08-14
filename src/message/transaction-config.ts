/**
 * Configuration options embedded in a v1 transaction message.
 *
 * In v1 transactions, resource limits and prioritization are expressed at the
 * message level instead of through Compute Budget program instructions (which
 * are no-ops when included in a v1 transaction).
 *
 * All fields are optional and are only encoded when present.
 */
export type TransactionConfig = {
  /**
   * Maximum number of compute units the transaction may consume.
   *
   * If not specified, defaults to 200,000 CUs per instruction. The maximum
   * allowed value is 1,400,000 CUs.
   */
  computeUnitLimit?: number;
  /** Requested heap frame size in bytes for the transaction's execution. */
  heapSize?: number;
  /** Maximum size in bytes for loaded account data. */
  loadedAccountsDataSizeLimit?: number;
  /**
   * Total priority fee in lamports to pay for transaction prioritization.
   *
   * Unlike the Compute Budget program's `setComputeUnitPrice` (micro-lamports
   * per compute unit), this is the total fee in lamports.
   */
  priorityFeeLamports?: bigint | number;
};

/** A single config value as encoded in a compiled v1 message. */
export type CompiledTransactionConfigValue =
  | {kind: 'u32'; value: number}
  | {kind: 'u64'; value: bigint};

// The priority fee occupies bits 0 and 1; both must be set or both unset.
const PRIORITY_FEE_LAMPORTS_BIT_MASK = 3;
const COMPUTE_UNIT_LIMIT_BIT_MASK = 4;
const LOADED_ACCOUNTS_DATA_SIZE_LIMIT_BIT_MASK = 8;
const HEAP_SIZE_BIT_MASK = 16;

export function getTransactionConfigMask(config: TransactionConfig): number {
  let mask = 0;
  if (config.priorityFeeLamports !== undefined) {
    mask |= PRIORITY_FEE_LAMPORTS_BIT_MASK;
  }
  if (config.computeUnitLimit !== undefined) {
    mask |= COMPUTE_UNIT_LIMIT_BIT_MASK;
  }
  if (config.loadedAccountsDataSizeLimit !== undefined) {
    mask |= LOADED_ACCOUNTS_DATA_SIZE_LIMIT_BIT_MASK;
  }
  if (config.heapSize !== undefined) {
    mask |= HEAP_SIZE_BIT_MASK;
  }
  return mask;
}

/**
 * Returns the config values in canonical encoding order: priority fee,
 * compute unit limit, loaded accounts data size limit, heap size.
 */
export function getTransactionConfigValues(
  config: TransactionConfig,
): CompiledTransactionConfigValue[] {
  const values: CompiledTransactionConfigValue[] = [];
  if (config.priorityFeeLamports !== undefined) {
    values.push({kind: 'u64', value: BigInt(config.priorityFeeLamports)});
  }
  if (config.computeUnitLimit !== undefined) {
    values.push({kind: 'u32', value: config.computeUnitLimit});
  }
  if (config.loadedAccountsDataSizeLimit !== undefined) {
    values.push({kind: 'u32', value: config.loadedAccountsDataSizeLimit});
  }
  if (config.heapSize !== undefined) {
    values.push({kind: 'u32', value: config.heapSize});
  }
  return values;
}

function maskHasPriorityFee(mask: number): boolean {
  const bits = mask & PRIORITY_FEE_LAMPORTS_BIT_MASK;
  if (bits !== 0 && bits !== PRIORITY_FEE_LAMPORTS_BIT_MASK) {
    throw new Error(
      'Invalid transaction config mask: exactly one of the two priority fee bits is set',
    );
  }
  return bits === PRIORITY_FEE_LAMPORTS_BIT_MASK;
}

export function decompileTransactionConfig(
  configMask: number,
  configValues: readonly CompiledTransactionConfigValue[],
): TransactionConfig {
  const supportedConfigs: Array<
    [keyof TransactionConfig, 'u32' | 'u64', (mask: number) => boolean]
  > = [
    ['priorityFeeLamports', 'u64', maskHasPriorityFee],
    [
      'computeUnitLimit',
      'u32',
      mask => (mask & COMPUTE_UNIT_LIMIT_BIT_MASK) !== 0,
    ],
    [
      'loadedAccountsDataSizeLimit',
      'u32',
      mask => (mask & LOADED_ACCOUNTS_DATA_SIZE_LIMIT_BIT_MASK) !== 0,
    ],
    ['heapSize', 'u32', mask => (mask & HEAP_SIZE_BIT_MASK) !== 0],
  ];

  const config: TransactionConfig = {};
  let index = 0;
  for (const [name, kind, predicate] of supportedConfigs) {
    if (!predicate(configMask)) {
      continue;
    }
    const configValue = configValues[index++];
    if (configValue.kind !== kind) {
      throw new Error(
        `Invalid transaction config value kind for ${name}: expected ${kind} but found ${configValue.kind}`,
      );
    }
    (config[name] as CompiledTransactionConfigValue['value']) =
      configValue.value;
  }
  return config;
}
