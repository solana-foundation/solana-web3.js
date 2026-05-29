import {
  CommonClient,
  ICommonWebSocket,
  IWSClientAdditionalOptions,
  NodeWebSocketType,
  NodeWebSocketTypeOptions,
  WebSocket as createRpc,
} from 'rpc-websockets';

interface IHasReadyState {
  readyState: WebSocket['readyState'];
}

export class RpcWebSocketConnectionError extends Error {
  constructor(
    public readonly methodName: string,
    public readonly readyState: WebSocket['readyState'] | undefined,
    action: 'call a JSON-RPC method' | 'send a JSON-RPC notification',
  ) {
    super(
      'Tried to ' +
        action +
        ' `' +
        methodName +
        '` but the socket was not `CONNECTING` or `OPEN` (`readyState` was ' +
        readyState +
        ')',
    );
  }
}

export default class RpcWebSocketClient extends CommonClient {
  private underlyingSocket: IHasReadyState | undefined;
  constructor(
    address?: string,
    options?: IWSClientAdditionalOptions & NodeWebSocketTypeOptions,
    generate_request_id?: (
      method: string,
      params: object | Array<any>,
    ) => number,
  ) {
    const webSocketFactory = (url: string) => {
      const rpc = createRpc(url, {
        autoconnect: true,
        max_reconnects: 5,
        reconnect: true,
        reconnect_interval: 1000,
        ...options,
      });
      if ('socket' in rpc) {
        this.underlyingSocket = rpc.socket as ReturnType<typeof createRpc>;
      } else {
        this.underlyingSocket = rpc as NodeWebSocketType;
      }
      return rpc as ICommonWebSocket;
    };
    super(webSocketFactory, address, options, generate_request_id);
  }
  call(
    ...args: Parameters<CommonClient['call']>
  ): ReturnType<CommonClient['call']> {
    const readyState = this.underlyingSocket?.readyState;
    if (readyState === 1 /* WebSocket.OPEN */) {
      return super.call(...args);
    }
    return Promise.reject(
      new RpcWebSocketConnectionError(
        args[0],
        readyState,
        'call a JSON-RPC method',
      ),
    );
  }
  notify(
    ...args: Parameters<CommonClient['notify']>
  ): ReturnType<CommonClient['notify']> {
    const readyState = this.underlyingSocket?.readyState;
    if (readyState === 1 /* WebSocket.OPEN */) {
      return super.notify(...args);
    }
    return Promise.reject(
      new RpcWebSocketConnectionError(
        args[0],
        readyState,
        'send a JSON-RPC notification',
      ),
    );
  }
}
