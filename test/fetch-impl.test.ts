import { strict as assert } from 'assert';
import sinon from 'sinon';
import fetchWithRetry from '../src/fetch-impl';

describe('fetchWithRetry', () => {
  it('succeeds without retries', async () => {
    const stub = sinon.stub().resolves('ok');

    const result = await fetchWithRetry(stub as any, 'https://example.com');
    assert.equal(result, 'ok');
    assert.equal(stub.callCount, 1);
  });

  it('retries on transient errors', async () => {
    const stub = sinon
      .stub()
      .onFirstCall()
      .rejects(new TypeError('network error'))
      .onSecondCall()
      .resolves('ok');

    const result = await fetchWithRetry(stub as any, 'https://example.com', {
      retry: { retries: 2 },
    });

    assert.equal(result, 'ok');
    assert.equal(stub.callCount, 2);
  });

  it('applies exponential backoff delays', async () => {
    const clock = sinon.useFakeTimers();
    const stub = sinon.stub().rejects(new Error('network error'));

    const p = fetchWithRetry(stub as any, 'https://example.com', {
      retry: { retries: 2, initialDelay: 100, backoffFactor: 2 },
    }).catch(() => {});

    // attempt 0 → delay = 100 * 2^0 = 100
    await clock.tickAsync(100);
    assert.equal(stub.callCount, 2);

    // attempt 1 → delay = 100 * 2^1 = 200
    await clock.tickAsync(200);
    assert.equal(stub.callCount, 3);

    await p;
    clock.restore();
  });

  it('does not retry non-transient errors', async () => {
    const stub = sinon.stub().rejects(new Error('Invalid URL'));

    await assert.rejects(
      fetchWithRetry(stub as any, 'bad', {
        retry: { retries: 3, retryOn: () => false },
      }),
    );

    assert.equal(stub.callCount, 1);
  });
});
