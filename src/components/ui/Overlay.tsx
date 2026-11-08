import { X } from 'lucide-react';
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type PanelProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  description?: string;
  kind: 'modal' | 'drawer' | 'confirm';
};

/** Shared dialog panel: Escape closes, focus moves in and is trapped, focus returns on close (PRD 10.5). */
function OverlayPanel({ open, title, onClose, children, footer, description, kind }: PanelProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panelRef.current)?.focus();
    return () => previous?.focus?.();
  }, [open]);

  if (!open) return null;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const isDrawer = kind === 'drawer';
  return (
    <div className={cn('fixed inset-0 z-40 flex bg-overlay', isDrawer ? 'justify-end' : 'items-center justify-center p-4')}>
      <div
        ref={panelRef}
        role={kind === 'confirm' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-overlay={kind}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          'flex flex-col bg-surface shadow-raised focus:outline-none',
          isDrawer ? 'h-full w-full max-w-lg' : 'max-h-full w-full max-w-2xl rounded-card',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div>
            <h2 id={titleId} className="text-h2 text-primary">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-body text-text-secondary">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-input p-2 text-text-secondary hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X aria-hidden className="size-icon" />
          </button>
        </div>
        {children ? <div className="flex-1 overflow-y-auto p-6">{children}</div> : null}
        {footer ? <div className="flex justify-end gap-3 border-t border-border p-4">{footer}</div> : null}
      </div>
    </div>
  );
}

type OverlayProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  description?: string;
};

export function Modal(props: OverlayProps) {
  return <OverlayPanel {...props} kind="modal" />;
}

export function Drawer(props: OverlayProps) {
  return <OverlayPanel {...props} kind="drawer" />;
}

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <OverlayPanel
      open={open}
      title={title}
      description={message}
      onClose={onCancel}
      kind="confirm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </OverlayPanel>
  );
}
