import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '@/components/domain/Logo';
import { PrototypeNotice } from '@/components/domain/PrototypeNotice';
import { OfflineBanner } from '@/components/ui/States';
import { NOT_AFFILIATED } from '@/lib/format/messages';

type AuthLayoutProps = {
  headline: string;
  text: string;
  points: Array<{ icon: LucideIcon; title: string; text: string }>;
  children: ReactNode;
};

/** The split layout of S05–S07: navy brand panel and a form card. */
export function AuthLayout({ headline, text, points, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PrototypeNotice variant="app" />
      <OfflineBanner />
      <div className="grid flex-1 lg:grid-cols-[45%_55%]">
        <aside className="hidden flex-col bg-primary p-12 text-text-on-dark lg:flex">
          <Link to="/" aria-label="ClaimGuard RAF home" className="w-fit rounded-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <Logo tone="light" />
          </Link>
          <h2 className="mt-16 text-h1 text-text-on-dark">{headline}</h2>
          <p className="mt-4 text-body text-text-on-dark-muted">{text}</p>
          <ul className="mt-10 space-y-4">
            {points.map(({ icon: Icon, title, text: detail }) => (
              <li key={title} className="flex gap-4 rounded-card bg-primary-deep/40 p-4">
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-input bg-primary-deep text-accent-tint">
                  <Icon className="size-icon-sm" />
                </span>
                <div>
                  <p className="text-body font-semibold">{title}</p>
                  <p className="text-small text-text-on-dark-muted">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-auto pt-8 text-small text-text-on-dark-muted">{NOT_AFFILIATED}</p>
        </aside>
        <main className="flex items-start justify-center p-6 lg:p-12">
          <div className="w-full max-w-lg rounded-card border border-border bg-surface p-8 shadow-card">{children}</div>
        </main>
      </div>
    </div>
  );
}
