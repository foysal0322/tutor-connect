'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastActions {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

// Split into two contexts so action-only consumers don't re-render
// every time a toast enters or leaves the visible list.
const ToastActionsContext = createContext<ToastActions | null>(null);
// State context is read only by the host that renders the toast container.
const ToastStateContext = createContext<Toast[] | null>(null);

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const AUTO_DISMISS_MS = 3500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    // Start exit animation
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    // Remove after animation
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timers.current.delete(id);
    }, 260);
    timers.current.set(`exit-${id}`, timer);
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);

    const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    timers.current.set(id, timer);
  }, [dismiss]);

  // Cleanup all timers on unmount
  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      currentTimers.forEach(t => clearTimeout(t));
    };
  }, []);

  // Actions context is stable across renders — consumers that only call
  // toast.success/error/info do not re-render when toasts change.
  const actions = useMemo<ToastActions>(
    () => ({
      toast: {
        success: (msg: string) => addToast(msg, 'success'),
        error: (msg: string) => addToast(msg, 'error'),
        info: (msg: string) => addToast(msg, 'info'),
      },
    }),
    [addToast],
  );

  return (
    <ToastActionsContext.Provider value={actions}>
      <ToastStateContext.Provider value={toasts}>
        {children}
        <div className="toast-container" aria-live="polite" aria-label="Notifications">
          {toasts.map(t => (
            <div
              key={t.id}
              role="alert"
              className={`toast toast-${t.type}${t.exiting ? ' toast-exit' : ''}`}
            >
              <span className="toast-icon" aria-hidden="true">{ICONS[t.type]}</span>
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  opacity: 0.6,
                  padding: '0 0.25rem',
                  color: 'inherit',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </ToastStateContext.Provider>
    </ToastActionsContext.Provider>
  );
}

/**
 * Hook to show toast notifications anywhere in the app.
 *
 * @example
 * const { toast } = useToast();
 * toast.success('Profile updated!');
 * toast.error('Something went wrong.');
 */
export function useToast(): ToastActions {
  const ctx = useContext(ToastActionsContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
