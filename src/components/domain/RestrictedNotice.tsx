import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';

/** Shield, explanation and a way back (S08, S25). */
export function RestrictedNotice({ message, backTo }: { message: string; backTo: string }) {
  return (
    <div className="mx-auto mt-10 w-full max-w-lg rounded-card border border-border bg-surface p-8 text-center shadow-card">
      <span aria-hidden className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-muted text-primary">
        <ShieldAlert className="size-icon" />
      </span>
      <h1 className="mt-4 text-h2 text-primary">{message}</h1>
      <ButtonLink to={backTo} className="mt-6" icon={<ArrowLeft aria-hidden className="size-icon-sm" />}>
        Back to dashboard
      </ButtonLink>
    </div>
  );
}
