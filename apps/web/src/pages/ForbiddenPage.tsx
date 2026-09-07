import { ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useLocale } from '../i18n/LocaleContext';

export function ForbiddenPage() {
  const { t } = useLocale();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <ShieldOff className="h-7 w-7 text-red-500" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">{t('forbidden.title')}</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{t('forbidden.message')}</p>
      <Link to="/dashboard" className="mt-6">
        <Button variant="primary">{t('forbidden.backToDashboard')}</Button>
      </Link>
    </div>
  );
}
