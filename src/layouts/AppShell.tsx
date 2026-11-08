import { Bell, ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, Search, User } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { Logo } from '@/components/domain/Logo';
import { PrototypeNotice } from '@/components/domain/PrototypeNotice';
import { OfflineBanner } from '@/components/ui/States';
import { CLAIMANT_TAB_BAR, SEARCH_PLACEHOLDER, SIDEBAR_ITEMS } from '@/lib/access/navigation';
import { ROLE_LABELS, type RoleKey } from '@/lib/access/roles';
import { cn } from '@/lib/cn';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

function Sidebar({ role, collapsed, onToggle }: { role: RoleKey; collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      data-testid="sidebar"
      data-collapsed={String(collapsed)}
      className={cn('hidden shrink-0 flex-col bg-primary text-text-on-dark md:flex', collapsed ? 'w-rail' : 'w-sidebar')}
    >
      <div className={cn('flex h-top-bar items-center px-4', collapsed && 'justify-center px-2')}>
        <Logo tone="light" compact={collapsed} />
      </div>
      <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-4">
        {SIDEBAR_ITEMS[role].map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-input px-3 py-2 text-body font-medium',
                isActive ? 'bg-accent text-text-on-dark' : 'text-text-on-dark-muted hover:bg-primary-deep hover:text-text-on-dark',
                collapsed && 'justify-center px-2',
                focusRing,
              )
            }
          >
            <Icon aria-hidden className="size-icon shrink-0" />
            <span className={cn(collapsed && 'sr-only')}>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-primary-deep p-3">
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggle}
          className={cn('flex w-full items-center gap-3 rounded-input px-3 py-2 text-text-on-dark-muted hover:text-text-on-dark', collapsed && 'justify-center px-2', focusRing)}
        >
          {collapsed ? <PanelLeftOpen aria-hidden className="size-icon" /> : <PanelLeftClose aria-hidden className="size-icon" />}
        </button>
      </div>
    </aside>
  );
}

function AvatarMenu({ userName, onSignOut }: { userName: string; onSignOut?: () => void }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={userName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className={cn('flex items-center gap-2 rounded-input px-2 py-1 hover:bg-surface-muted', focusRing)}
      >
        <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-primary text-text-on-dark">
          <User className="size-icon-sm" />
        </span>
        <span aria-hidden className="hidden text-body font-medium text-text sm:inline">
          {userName}
        </span>
        <ChevronDown aria-hidden className="size-icon-sm text-text-secondary" />
      </button>
      {open ? (
        <div id={menuId} role="menu" className="absolute right-0 z-30 mt-1 min-w-44 rounded-card border border-border bg-surface py-1 shadow-raised">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut?.();
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-body text-text hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
          >
            <LogOut aria-hidden className="size-icon-sm" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TopBar({ role, userName, unreadCount, onSignOut }: { role: RoleKey; userName: string; unreadCount: number; onSignOut?: () => void }) {
  const searchId = useId();
  return (
    <header className="flex h-top-bar items-center gap-4 border-b border-border bg-surface px-6">
      <div className="relative max-w-md flex-1">
        <label htmlFor={searchId} className="sr-only">
          Search
        </label>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-icon-sm -translate-y-1/2 text-text-secondary" />
        <input
          id={searchId}
          type="search"
          placeholder={SEARCH_PLACEHOLDER[role]}
          className={cn('h-button w-full rounded-input bg-surface-muted pl-9 pr-3 text-body text-text placeholder:text-text-secondary', focusRing)}
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Link
          to="/notifications"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className={cn('relative rounded-input p-2 text-text-secondary hover:bg-surface-muted hover:text-text', focusRing)}
        >
          <Bell aria-hidden className="size-icon" />
          {unreadCount > 0 ? (
            <span aria-hidden className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-error px-1 text-small font-semibold text-text-on-dark">
              {unreadCount}
            </span>
          ) : null}
        </Link>
        <span data-testid="role-badge" className="rounded-chip bg-accent-tint px-2 py-0.5 text-label uppercase text-primary">
          {ROLE_LABELS[role]}
        </span>
        <AvatarMenu userName={userName} onSignOut={onSignOut} />
      </div>
    </header>
  );
}

function MobileTabBar() {
  return (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface md:hidden">
      {CLAIMANT_TAB_BAR.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={label}
          to={to}
          end
          className={({ isActive }) =>
            cn('flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 text-small', isActive ? 'text-accent' : 'text-text-secondary', focusRing)
          }
        >
          <Icon aria-hidden className="size-icon" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

type AppShellProps = {
  role: RoleKey;
  userName: string;
  unreadCount: number;
  onSignOut?: () => void;
  children: ReactNode;
};

/** Signed-in layout (S09–S43): notice bar, role sidebar, top bar, and the claimant mobile tab bar (S45). */
export function AppShell({ role, userName, unreadCount, onSignOut, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PrototypeNotice variant="app" />
      <OfflineBanner />
      <div className="flex flex-1">
        <Sidebar role={role} collapsed={collapsed} onToggle={() => setCollapsed((current) => !current)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar role={role} userName={userName} unreadCount={unreadCount} onSignOut={onSignOut} />
          <main className={cn('flex-1 p-6', role === 'claimant' && 'pb-24 md:pb-6')}>{children}</main>
        </div>
      </div>
      {role === 'claimant' ? <MobileTabBar /> : null}
    </div>
  );
}
