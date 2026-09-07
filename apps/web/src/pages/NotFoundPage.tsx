import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useLocale } from '../i18n/LocaleContext';

export function NotFoundPage() {
  const { t } = useLocale();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <Compass className="h-7 w-7 text-slate-400" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">{t('notFound.title')}</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{t('notFound.message')}</p>
      <Link to="/dashboard" className="mt-6">
        <Button variant="primary">{t('notFound.backToDashboard')}</Button>
      </Link>
    </div>
  );
}
