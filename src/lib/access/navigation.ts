import {
  Bell,
  Building2,
  ClipboardList,
  FileBarChart,
  FolderOpen,
  Gauge,
  History,
  Home,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  Settings,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { ROLE_ORDER, type RoleKey } from './roles';

export type NavItem = { label: string; to: string; icon: LucideIcon };

/** Desktop sidebar items per role (Section 11). UI only: RLS still decides access. */
export const SIDEBAR_ITEMS: Record<RoleKey, NavItem[]> = {
  claimant: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My claims', to: '/claims', icon: FolderOpen },
    { label: 'Notifications', to: '/notifications', icon: Bell },
    { label: 'Profile', to: '/profile', icon: User },
  ],
  lawyer: [
    { label: 'Dashboard', to: '/lawyer/dashboard', icon: LayoutDashboard },
    { label: 'Clients', to: '/lawyer/clients', icon: Users },
    { label: 'Claims', to: '/lawyer/claims', icon: FolderOpen },
    { label: 'Tasks', to: '/lawyer/tasks', icon: ListChecks },
    { label: 'Notifications', to: '/notifications', icon: Bell },
    { label: 'Profile', to: '/lawyer/profile', icon: User },
  ],
  raf_officer: [
    { label: 'Dashboard', to: '/raf/dashboard', icon: LayoutDashboard },
    { label: 'Claims queue', to: '/raf/claims', icon: FolderOpen },
    { label: 'Tasks', to: '/raf/tasks', icon: ListChecks },
    { label: 'Reports', to: '/raf/reports', icon: FileBarChart },
    { label: 'Notifications', to: '/notifications', icon: Bell },
    { label: 'Profile', to: '/profile', icon: User },
  ],
  investigator: [
    { label: 'Risk queue', to: '/raf/risk', icon: ShieldAlert },
    { label: 'Notifications', to: '/notifications', icon: Bell },
    { label: 'Profile', to: '/profile', icon: User },
  ],
  manager: [
    { label: 'Overview', to: '/raf/management', icon: Gauge },
    { label: 'Notifications', to: '/notifications', icon: Bell },
    { label: 'Profile', to: '/profile', icon: User },
  ],
  admin: [
    { label: 'Users', to: '/admin/users', icon: Users },
    { label: 'Roles & permissions', to: '/admin/roles', icon: ShieldCheck },
    { label: 'Organisations', to: '/admin/organisations', icon: Building2 },
    { label: 'Settings', to: '/admin/settings', icon: Settings },
    { label: 'Audit log', to: '/admin/audit', icon: History },
  ],
};

/** The sidebar for one or several roles, in Section 11 role order, each destination once. */
export function sidebarItemsFor(roles: readonly RoleKey[]): NavItem[] {
  const seen = new Set<string>();
  return ROLE_ORDER.filter((role) => roles.includes(role))
    .flatMap((role) => SIDEBAR_ITEMS[role])
    .filter((item) => {
      if (seen.has(item.to)) return false;
      seen.add(item.to);
      return true;
    });
}

/**
 * Claimant mobile bottom tab bar (S45). Requests and Messages live inside the claim workspace,
 * so they open the claim list until the S45 claim shortcuts are built (Phase 16).
 */
export const CLAIMANT_TAB_BAR: NavItem[] = [
  { label: 'Home', to: '/dashboard', icon: Home },
  { label: 'Claim', to: '/claims', icon: FolderOpen },
  { label: 'Requests', to: '/claims', icon: ClipboardList },
  { label: 'Messages', to: '/claims', icon: MessageSquare },
  { label: 'More', to: '/profile', icon: MoreHorizontal },
];

/** Top-bar search placeholders, as in the designs (S09 for claimants, S14/S27 for staff). */
export const SEARCH_PLACEHOLDER: Record<RoleKey, string> = {
  claimant: 'Search your claims, documents, requests…',
  lawyer: 'Search claim reference, ID, claimant or attorney…',
  raf_officer: 'Search claim reference, ID, claimant or attorney…',
  investigator: 'Search claim reference, ID, claimant or attorney…',
  manager: 'Search claim reference, ID, claimant or attorney…',
  admin: 'Search by name or email…',
};
