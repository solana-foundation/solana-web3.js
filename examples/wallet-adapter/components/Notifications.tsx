'use client';

import type {ReactNode} from 'react';
import {createContext, useCallback, useContext, useState} from 'react';
import {useSettings} from './Settings';

type Variant = 'info' | 'success' | 'error';

interface Notification {
  id: number;
  variant: Variant;
  message: string;
  signature?: string;
}

type Notify = (variant: Variant, message: string, signature?: string) => void;

const NotifyContext = createContext<Notify | null>(null);

export function useNotify(): Notify {
  const notify = useContext(NotifyContext);
  if (!notify) throw new Error('NotificationProvider is missing.');
  return notify;
}

let nextId = 0;

export function NotificationProvider({children}: {children: ReactNode}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dismiss = useCallback((id: number) => {
    setNotifications(current => current.filter(n => n.id !== id));
  }, []);
  const notify = useCallback<Notify>(
    (variant, message, signature) => {
      const id = nextId++;
      setNotifications(current => [
        ...current,
        {id, variant, message, signature},
      ]);
      setTimeout(() => dismiss(id), 8000);
    },
    [dismiss],
  );
  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <div className="notifications" role="status">
        {notifications.map(notification => (
          <Snackbar
            key={notification.id}
            notification={notification}
            onDismiss={() => dismiss(notification.id)}
          />
        ))}
      </div>
    </NotifyContext.Provider>
  );
}

function Snackbar({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: () => void;
}) {
  const {network} = useSettings();
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return (
    <div className="notification" data-variant={notification.variant}>
      {notification.message}
      {notification.signature && (
        <a
          href={`https://explorer.solana.com/tx/${notification.signature}${cluster}`}
          target="_blank"
          rel="noreferrer"
        >
          Transaction ↗
        </a>
      )}
      <button type="button" aria-label="Dismiss" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
