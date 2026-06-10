import assert from 'assert';
import sinon from 'sinon';
import { fetchWithRetry } from '../src/fetch-impl';

describe('fetchWithRetry', () => {
  it('succeeds on first try without retries', async () => {
    const stub = sinon.stub().resolves({ ok: true });

    const result = await fetchWithRetry(stub, 'https://example.com');

    assert.strictEqual(result.ok, true);
    assert.strictEqual(stub.callCount, 1);
  });

  it('retries when fetch fails and succeeds on second attempt', async () => {
    const stub = sinon.stub();
    stub.onFirstCall().rejects(new Error('network error'));
    stub.onSecondCall().resolves({ ok: true });

    const result = await fetchWithRetry(stub, 'https://example.com');

    assert.strictEqual(result.ok, true);
    assert.strictEqual(stub.callCount, 2);
  });

  it('fails after max retries', async () => {
    const stub = sinon.stub().rejects(new Error('network error'));

    try {
      await fetchWithRetry(stub, 'https://example.com');
      assert.fail('Expected error');
    } catch (err) {
      assert.strictEqual(stub.callCount, 3);
    }
  });

  it('applies exponential backoff delays', async () => {
    const clock = sinon.useFakeTimers();
    const stub = sinon.stub().rejects(new Error('network error'));

    const p = fetchWithRetry(stub, 'https://example.com').catch(() => {});

    await clock.tickAsync(200);
    assert.strictEqual(stub.callCount, 2);

    await clock.tickAsync(400);
    assert.strictEqual(stub.callCount, 3);

    clock.restore();
  });
});
