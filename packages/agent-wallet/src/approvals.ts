import {
  WALLET_STANDARD_ERROR__USER__REQUEST_REJECTED,
  WalletStandardError,
} from '@wallet-standard/errors';

export type SigningMode = 'auto' | 'manual';

export interface PendingRequest {
  id: number;
  /** The Wallet Standard feature that was called, e.g. `solana:signTransaction`. */
  method: string;
  /** One summary per input of the call, in order. */
  inputs: readonly Record<string, unknown>[];
}

interface Entry {
  reject: (error: Error) => void;
  request: PendingRequest;
  resolve: () => void;
}

/**
 * Stands in for the approval popup of a real wallet. In `auto` mode every
 * request is approved, after `delay` milliseconds when set. In `manual` mode
 * requests wait in `pending()` until `approve(id)` or `reject(id)` is called;
 * a rejection surfaces to the dApp as a Wallet Standard user-rejected error.
 */
export function createApprovalQueue({
  delay = 0,
  mode = 'auto',
}: {delay?: number; mode?: SigningMode} = {}) {
  let nextId = 1;
  const entries = new Map<number, Entry>();
  function take(id: number): Entry {
    const entry = entries.get(id);
    if (!entry) throw new Error(`No pending agent wallet request ${id}.`);
    entries.delete(id);
    return entry;
  }
  return {
    approve(id: number) {
      take(id).resolve();
    },
    get mode() {
      return mode;
    },
    pending(): PendingRequest[] {
      return [...entries.values()].map(({request}) => request);
    },
    reject(id: number) {
      take(id).reject(
        new WalletStandardError(WALLET_STANDARD_ERROR__USER__REQUEST_REJECTED),
      );
    },
    async request(
      method: string,
      inputs: readonly Record<string, unknown>[],
    ): Promise<void> {
      if (mode === 'manual') {
        const id = nextId++;
        await new Promise<void>((resolve, reject) => {
          entries.set(id, {reject, request: {id, inputs, method}, resolve});
        });
      } else if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    },
    setMode(next: SigningMode) {
      mode = next;
    },
  };
}

export type ApprovalQueue = ReturnType<typeof createApprovalQueue>;
