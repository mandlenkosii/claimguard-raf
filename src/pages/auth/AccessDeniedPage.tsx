import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/app/auth';
import { Logo } from '@/components/domain/Logo';
import { PrototypeNotice } from '@/components/domain/PrototypeNotice';
import { Button, ButtonLink } from '@/components/ui/Button';
import { landingRoute } from '@/lib/access/roles';
import { ACCESS_DENIED } from '@/lib/format/messages';

/** S08 403: a user opening a route their role may not open. */
export function AccessDeniedPage() {
  const { session } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PrototypeNotice variant="app" />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <Logo />
        <div className="w-full max-w-lg rounded-card border border-border bg-surface p-8 text-center shadow-card">
          <span aria-hidden className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-muted text-primary">
            <ShieldAlert className="size-icon" />
          </span>
          <h1 className="mt-4 text-h2 text-primary">{ACCESS_DENIED}</h1>
          <p className="mt-2 text-body text-text-secondary">This content is restricted to authorised roles.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink to={landingRoute(session?.roles ?? []) ?? '/'} icon={<ArrowLeft aria-hidden className="size-icon-sm" />}>
              Back to dashboard
            </ButtonLink>
            {/* No request-access operation exists in the plan yet (Section 18 #52). */}
            <Button variant="secondary" disabled>
              Request access
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
