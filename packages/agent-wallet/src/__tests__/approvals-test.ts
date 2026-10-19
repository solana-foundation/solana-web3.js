import {
  isWalletStandardError,
  WALLET_STANDARD_ERROR__USER__REQUEST_REJECTED,
} from '@wallet-standard/errors';
import {describe, expect, it, vi} from 'vitest';

import {createApprovalQueue} from '../approvals.js';

describe('createApprovalQueue', () => {
  it('approves immediately in auto mode', async () => {
    const approvals = createApprovalQueue();
    await approvals.request('solana:signMessage', [{message: 'hi'}]);
    expect(approvals.pending()).toEqual([]);
  });

  it('waits `delay` milliseconds in auto mode', async () => {
    vi.useFakeTimers();
    try {
      const approvals = createApprovalQueue({delay: 500});
      let settled = false;
      const request = approvals
        .request('standard:connect', [])
        .then(() => (settled = true));
      await vi.advanceTimersByTimeAsync(499);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await request;
      expect(settled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('holds manual requests until approved', async () => {
    const approvals = createApprovalQueue({mode: 'manual'});
    const request = approvals.request('solana:signMessage', [{message: 'hi'}]);
    expect(approvals.pending()).toEqual([
      {id: 1, inputs: [{message: 'hi'}], method: 'solana:signMessage'},
    ]);
    approvals.approve(1);
    await expect(request).resolves.toBeUndefined();
    expect(approvals.pending()).toEqual([]);
  });

  it('rejects manual requests with a user-rejected error', async () => {
    const approvals = createApprovalQueue({mode: 'manual'});
    const request = approvals.request('standard:connect', []);
    approvals.reject(1);
    const error = await request.catch((error: unknown) => error);
    expect(
      isWalletStandardError(
        error,
        WALLET_STANDARD_ERROR__USER__REQUEST_REJECTED,
      ),
    ).toBe(true);
  });

  it('throws for unknown request ids', () => {
    const approvals = createApprovalQueue({mode: 'manual'});
    expect(() => approvals.approve(7)).toThrow(/No pending/);
  });

  it('switches modes at runtime', async () => {
    const approvals = createApprovalQueue({mode: 'manual'});
    approvals.setMode('auto');
    expect(approvals.mode).toBe('auto');
    await approvals.request('standard:connect', []);
    expect(approvals.pending()).toEqual([]);
  });
});
