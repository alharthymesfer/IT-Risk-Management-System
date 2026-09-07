import { ShieldCheck } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleContext';
import { Spinner } from './Spinner';

export function LoadingScreen({ label }: { label?: string }) {
  const { t } = useLocale();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
      <ShieldCheck className="h-8 w-8 text-slate-300" aria-hidden="true" />
      <div className="flex items-center gap-2 text-sm">
        <Spinner className="h-4 w-4" />
        {label ?? t('common.loading')}
      </div>
    </div>
  );
}
