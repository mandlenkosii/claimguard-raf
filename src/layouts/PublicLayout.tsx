import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { Logo } from '@/components/domain/Logo';
import { PrototypeNotice } from '@/components/domain/PrototypeNotice';
import { ButtonLink } from '@/components/ui/Button';
import { OfflineBanner } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { NOT_AFFILIATED } from '@/lib/format/messages';

const PUBLIC_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'Security', to: '/security' },
];

function PublicNav() {
  return (
    <header data-testid="public-nav" className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-6 px-6">
        <Link to="/" aria-label="ClaimGuard RAF home" className="rounded-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Logo />
        </Link>
        <nav aria-label="Public" className="hidden items-center gap-8 md:flex">
          {PUBLIC_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'rounded-input text-body font-medium hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isActive ? 'text-accent' : 'text-text',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink to="/login" variant="ghost">
            Sign in
          </ButtonLink>
          <ButtonLink to="/register" variant="primary">
            Register
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer data-testid="footer" className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-content gap-8 px-6 py-10 md:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-md text-small text-text-secondary">
            A claim intelligence and assurance platform that helps people find and resolve claim-information problems earlier.
          </p>
          <p className="max-w-md rounded-card bg-surface-muted p-3 text-small text-text-secondary">{NOT_AFFILIATED}</p>
        </div>
        <div>
          <h2 className="text-label uppercase text-text-secondary">Platform</h2>
          <ul className="mt-3 space-y-2">
            {PUBLIC_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-body text-text hover:text-accent">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

/** Public pages S01–S04 (and S05–S07 later): notice bar, nav, page, footer. */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PrototypeNotice variant="public" />
      <OfflineBanner />
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
