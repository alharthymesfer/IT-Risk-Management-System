import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { roleStyles } from '../../lib/colors';
import { formatFullName } from '../../lib/format';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, enumLabel } = useLocale();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="flex h-16 flex-none items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="text-sm font-medium text-slate-400 md:hidden">{t('common.appName')}</div>
      <div className="ms-auto flex items-center gap-3">
        <LanguageSwitcher />
        <Badge className={roleStyles[user.role]}>{enumLabel('role', user.role)}</Badge>
        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="text-sm">
            <p className="font-medium leading-tight text-slate-900">{formatFullName(user)}</p>
            <p className="leading-tight text-slate-400">{user.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<LogOut className="h-4 w-4" />}
          onClick={handleLogout}
          isLoading={isLoggingOut}
        >
          {t('common.signOut')}
        </Button>
      </div>
    </header>
  );
}
