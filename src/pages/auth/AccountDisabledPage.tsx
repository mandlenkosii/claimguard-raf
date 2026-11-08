import { Clock, Lock } from 'lucide-react';
import { Logo } from '@/components/domain/Logo';
import { PrototypeNotice } from '@/components/domain/PrototypeNotice';
import { Button } from '@/components/ui/Button';
import * as api from '@/features/auth/api';
import { ACCOUNT_DISABLED, TXT } from '@/lib/format/messages';

/** S08: account disabled, or a legal practitioner awaiting verification (Section 18 #8). */
export function AccountDisabledPage({ variant }: { variant: 'disabled' | 'pending' }) {
  const pending = variant === 'pending';
  const Icon = pending ? Clock : Lock;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PrototypeNotice variant="app" />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <Logo />
        <div className="w-full max-w-lg rounded-card border border-border bg-surface p-8 text-center shadow-card">
          <span aria-hidden className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-muted text-primary">
            <Icon className="size-icon" />
          </span>
          <h1 className="mt-4 text-h2 text-primary">{pending ? 'Awaiting verification' : 'Account disabled'}</h1>
          <p className="mt-2 text-body text-text-secondary">{pending ? TXT[11] : ACCOUNT_DISABLED}</p>
          <Button variant="secondary" className="mt-6" onClick={() => void api.signOut()}>
            Sign out
          </Button>
        </div>
      </main>
    </div>
  );
}
