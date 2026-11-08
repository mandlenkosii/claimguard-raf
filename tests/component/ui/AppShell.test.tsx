import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/layouts/AppShell';
import type { RoleKey } from '@/lib/access/roles';

function renderShell(role: RoleKey, props: Partial<Parameters<typeof AppShell>[0]> = {}) {
  return render(
    <MemoryRouter>
      <AppShell role={role} userName="Thandiwe Mokoena" unreadCount={0} {...props}>
        <p>Screen body</p>
      </AppShell>
    </MemoryRouter>,
  );
}

// Section 11 sidebar items per role.
const SIDEBAR: Record<RoleKey, [string, string][]> = {
  claimant: [
    ['Dashboard', '/dashboard'],
    ['My claims', '/claims'],
    ['Notifications', '/notifications'],
    ['Profile', '/profile'],
  ],
  lawyer: [
    ['Dashboard', '/lawyer/dashboard'],
    ['Clients', '/lawyer/clients'],
    ['Claims', '/lawyer/claims'],
    ['Tasks', '/lawyer/tasks'],
    ['Notifications', '/notifications'],
    ['Profile', '/lawyer/profile'],
  ],
  raf_officer: [
    ['Dashboard', '/raf/dashboard'],
    ['Claims queue', '/raf/claims'],
    ['Tasks', '/raf/tasks'],
    ['Reports', '/raf/reports'],
    ['Notifications', '/notifications'],
    ['Profile', '/profile'],
  ],
  investigator: [
    ['Risk queue', '/raf/risk'],
    ['Notifications', '/notifications'],
    ['Profile', '/profile'],
  ],
  manager: [
    ['Overview', '/raf/management'],
    ['Notifications', '/notifications'],
    ['Profile', '/profile'],
  ],
  admin: [
    ['Users', '/admin/users'],
    ['Roles & permissions', '/admin/roles'],
    ['Organisations', '/admin/organisations'],
    ['Settings', '/admin/settings'],
    ['Audit log', '/admin/audit'],
  ],
};

const ROLE_BADGE: Record<RoleKey, string> = {
  claimant: 'Claimant',
  lawyer: 'Lawyer',
  raf_officer: 'RAF officer',
  investigator: 'Investigator',
  manager: 'Manager',
  admin: 'Administrator',
};

describe('T-C-9 AppShell', () => {
  it.each(Object.keys(SIDEBAR) as RoleKey[])('T-C-9 shows the Section 11 sidebar items for %s', (role) => {
    renderShell(role);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => [link.textContent?.trim(), link.getAttribute('href')])).toEqual(SIDEBAR[role]);
  });

  it.each(Object.keys(ROLE_BADGE) as RoleKey[])('T-C-9 shows the role badge for %s', (role) => {
    renderShell(role);
    expect(screen.getByTestId('role-badge')).toHaveTextContent(ROLE_BADGE[role]);
  });

  it('T-C-9 the top bar has search, the bell with the unread count, and the avatar menu', () => {
    const onSignOut = vi.fn();
    renderShell('claimant', { unreadCount: 3, onSignOut });
    const topBar = screen.getByRole('banner');
    expect(within(topBar).getByRole('searchbox', { name: 'Search' })).toBeInTheDocument();
    const bell = within(topBar).getByRole('link', { name: 'Notifications, 3 unread' });
    expect(bell).toHaveAttribute('href', '/notifications');
    expect(within(bell).getByText('3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thandiwe Mokoena' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('T-C-9 the bell shows no count when there is nothing unread', () => {
    renderShell('claimant', { unreadCount: 0 });
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('T-C-9 the sidebar collapses to an icon rail that keeps accessible names', () => {
    renderShell('lawyer');
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Clients' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  });

  it('T-C-9 claimants get the mobile bottom tab bar (S45)', () => {
    renderShell('claimant');
    const tabBar = screen.getByRole('navigation', { name: 'Mobile' });
    expect(within(tabBar).getAllByRole('link').map((l) => l.textContent?.trim())).toEqual([
      'Home',
      'Claim',
      'Requests',
      'Messages',
      'More',
    ]);
  });

  it('T-C-9 other roles have no bottom tab bar', () => {
    renderShell('raf_officer');
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).toBeNull();
  });

  it('T-C-9 renders the screen body in the main region', () => {
    renderShell('manager');
    expect(within(screen.getByRole('main')).getByText('Screen body')).toBeInTheDocument();
  });
});
