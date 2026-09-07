import {
  Boxes,
  Bug,
  ClipboardList,
  LayoutDashboard,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
  Users as UsersIcon,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { permissions } from '../../auth/permissions';
import { useLocale, type TranslationKey } from '../../i18n/LocaleContext';
import type { Role } from '../../types';

interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: ComponentType<{ className?: string }>;
  visible?: (role: Role) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/risks', labelKey: 'nav.risks', icon: ShieldAlert },
  { to: '/threats', labelKey: 'nav.threats', icon: ShieldHalf },
  { to: '/vulnerabilities', labelKey: 'nav.vulnerabilities', icon: Bug },
  { to: '/controls', labelKey: 'nav.controls', icon: ShieldCheck },
  { to: '/assets', labelKey: 'nav.assets', icon: Boxes },
  { to: '/treatment-plans', labelKey: 'nav.treatmentPlans', icon: ClipboardList },
  { to: '/users', labelKey: 'nav.users', icon: UsersIcon, visible: permissions.canViewUsers },
  {
    to: '/audit-logs',
    labelKey: 'nav.auditLogs',
    icon: ScrollText,
    visible: permissions.canViewAuditLogs,
  },
];

export function Sidebar() {
  const { user } = useAuth();
  const { t } = useLocale();
  if (!user) return null;

  return (
    <aside className="hidden w-60 flex-none flex-col border-e border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
        <ShieldCheck className="h-6 w-6 text-indigo-600" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-tight text-slate-900">
          {t('common.appName')}
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.filter((item) => !item.visible || item.visible(user.role)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
