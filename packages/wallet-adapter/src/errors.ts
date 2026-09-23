export class WalletError extends Error {
    constructor(message?: string, cause?: unknown) {
        super(message, { cause });
        this.name = 'WalletError';
    }

    /** The underlying failure, under its v1 name. */
    get error(): unknown {
        return this.cause;
    }
}

export class WalletNotReadyError extends WalletError {
    name = 'WalletNotReadyError';
}

export class WalletConfigError extends WalletError {
    name = 'WalletConfigError';
}

export class WalletConnectionError extends WalletError {
    name = 'WalletConnectionError';
}

export class WalletDisconnectionError extends WalletError {
    name = 'WalletDisconnectionError';
}

export class WalletNotConnectedError extends WalletError {
    name = 'WalletNotConnectedError';
}

export class WalletNotSelectedError extends WalletError {
    name = 'WalletNotSelectedError';
}

export class WalletSendTransactionError extends WalletError {
    name = 'WalletSendTransactionError';
}

export class WalletSignTransactionError extends WalletError {
    name = 'WalletSignTransactionError';
}

export class WalletSignMessageError extends WalletError {
    name = 'WalletSignMessageError';
}

export class WalletSignOffchainMessageError extends WalletError {
    name = 'WalletSignOffchainMessageError';
}

export class WalletSignInError extends WalletError {
    name = 'WalletSignInError';
}
