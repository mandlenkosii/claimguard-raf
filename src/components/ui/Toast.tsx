import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

const toneStyles: Record<ToastTone, { icon: typeof Info; classes: string }> = {
  success: { icon: CircleCheck, classes: 'border-success bg-success-tint text-success' },
  info: { icon: Info, classes: 'border-info bg-info-tint text-info' },
  warning: { icon: TriangleAlert, classes: 'border-warning bg-warning-tint text-warning' },
  error: { icon: CircleAlert, classes: 'border-error bg-error-tint text-error' },
};

type ToastProps = { tone: ToastTone; message: string; onDismiss: () => void };

export function Toast({ tone, message, onDismiss }: ToastProps) {
  const { icon: Icon, classes } = toneStyles[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      data-tone={tone}
      className={cn('flex w-full max-w-sm items-start gap-2 rounded-card border-l-4 p-3 shadow-raised', classes)}
    >
      <Icon aria-hidden className="mt-0.5 size-icon shrink-0" />
      <p className="flex-1 text-body font-medium text-text">{message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="rounded-chip p-0.5 text-text-secondary hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X aria-hidden className="size-icon-sm" />
      </button>
    </div>
  );
}

type ToastItem = { id: number; tone: ToastTone; message: string };
type ToastApi = { show: (toast: { tone: ToastTone; message: string }) => void };

const ToastContext = createContext<ToastApi | null>(null);
const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback<ToastApi['show']>(
    ({ tone, message }) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, tone, message }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full">
            <Toast tone={toast.tone} message={toast.message} onDismiss={() => dismiss(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside ToastProvider');
  return api;
}
