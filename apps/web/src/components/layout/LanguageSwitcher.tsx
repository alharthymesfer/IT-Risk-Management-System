import { Languages } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleContext';
import type { Locale } from '../../i18n/translations';

const LOCALES: Locale[] = ['en', 'ar'];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-500">
      <Languages className="h-4 w-4 flex-none" aria-hidden="true" />
      <span className="sr-only">{t('language.label')}</span>
      <select
        aria-label={t('language.label')}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded-md border-0 bg-transparent py-1 pe-6 ps-1 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {t(`language.${l}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
