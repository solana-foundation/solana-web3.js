import {createServer, type IncomingMessage, type Server} from 'node:http';
import {isDeepStrictEqual} from 'node:util';

export type MockHttpResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
};

type MockHttpRule = {
  body: Record<string, unknown>;
  headers: Record<string, string>;
  respond: () => MockHttpResponse | Promise<MockHttpResponse>;
  requestCount: number;
};

function isBodyMatch(
  received: unknown,
  expected: Record<string, unknown>,
): boolean {
  if (
    received === null ||
    typeof received !== 'object' ||
    Array.isArray(received)
  ) {
    return false;
  }
  return Object.entries(expected).every(([key, value]) =>
    isDeepStrictEqual((received as Record<string, unknown>)[key], value),
  );
}

function isHeaderMatch(
  received: IncomingMessage['headers'],
  expected: Record<string, string>,
): boolean {
  return Object.entries(expected).every(
    ([key, value]) => received[key] === value,
  );
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
 * POST requests are matched against registered rules by JSON body and header.
 * Every top-level key of a rule's body must deep-equal the request's value for
 * that key, so `params` must match exactly; keys the rule omits (such as `id`)
 * are ignored. Request headers need only include the rule's headers. Each rule
 * answers one request, in registration order. Unmatched requests receive a 503.
 */
export class MockHttpServer {
  private rules: MockHttpRule[] = [];
  private server: Server | undefined;

  addRule({
    body,
    headers = {},
    respond,
  }: {
    body: Record<string, unknown>;
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
              isBodyMatch(body, rule.body) &&
              isHeaderMatch(request.headers, rule.headers),
          )
        : [];
    const rule = matchingRules.find(candidate => candidate.requestCount === 0);
    if (!rule) {
      return {statusCode: 503, body: 'Request for unmocked endpoint'};
    }
    rule.requestCount += 1;
    return await rule.respond();
  }
}
