import {createServer, type IncomingMessage, type Server} from 'http';

export type MockHttpResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
};

type MockHttpRule = {
  body: unknown;
  headers: Record<string, string>;
  respond: () => MockHttpResponse | Promise<MockHttpResponse>;
  requestCount: number;
};

/**
 * Recursive subset match with the same semantics as lodash's `isMatch`:
 * objects match when every expected key is present and matches, and arrays
 * match when every expected element matches a distinct received element,
 * regardless of order.
 */
function isPartialMatch(received: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) {
    if (!Array.isArray(received) || received.length < expected.length) {
      return false;
    }
    const usedIndices = new Set<number>();
    return expected.every(expectedItem => {
      const index = received.findIndex(
        (receivedItem, receivedIndex) =>
          !usedIndices.has(receivedIndex) &&
          isPartialMatch(receivedItem, expectedItem),
      );
      if (index === -1) return false;
      usedIndices.add(index);
      return true;
    });
  }
  if (expected !== null && typeof expected === 'object') {
    if (
      received === null ||
      typeof received !== 'object' ||
      Array.isArray(received)
    ) {
      return false;
    }
    return Object.entries(expected).every(
      ([key, value]) =>
        Object.hasOwn(received, key) &&
        isPartialMatch((received as Record<string, unknown>)[key], value),
    );
  }
  return received === expected;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return undefined;
  }
}

/**
 * Minimal JSON-RPC HTTP mock for unit tests.
 *
 * POST requests are matched against registered rules by partial JSON body and
 * header match. The first matching rule that has not yet served a request is
 * used; once every matching rule has been used, the most recently registered
 * matching rule keeps answering. Unmatched requests receive a 503.
 */
export class MockHttpServer {
  private rules: MockHttpRule[] = [];
  private server: Server | undefined;

  addRule({
    body,
    headers = {},
    respond,
  }: {
    body: unknown;
    headers?: Record<string, string>;
    respond: MockHttpRule['respond'];
  }): Promise<void> {
    this.rules.push({
      body,
      headers: Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [
          key.toLowerCase(),
          value,
        ]),
      ),
      respond,
      requestCount: 0,
    });
    return Promise.resolve();
  }

  async start(port: number) {
    const server = createServer((request, response) => {
      this.handle(request).then(
        ({statusCode, headers, body}) => {
          response.writeHead(statusCode, headers);
          response.end(body);
        },
        (error: unknown) => {
          response.writeHead(500, {'content-type': 'text/plain'});
          response.end(String(error));
        },
      );
    });
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });
  }

  async stop() {
    this.rules = [];
    const server = this.server;
    this.server = undefined;
    if (!server) return;
    await new Promise<void>(resolve => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  }

  private async handle(request: IncomingMessage): Promise<MockHttpResponse> {
    const body = await readJsonBody(request);
    const matchingRules =
      request.method === 'POST'
        ? this.rules.filter(
            rule =>
              isPartialMatch(body, rule.body) &&
              isPartialMatch(request.headers, rule.headers),
          )
        : [];
    const rule =
      matchingRules.find(candidate => candidate.requestCount === 0) ??
      matchingRules.at(-1);
    if (!rule) {
      return {statusCode: 503, body: 'Request for unmocked endpoint'};
    }
    rule.requestCount += 1;
    return await rule.respond();
  }
}
