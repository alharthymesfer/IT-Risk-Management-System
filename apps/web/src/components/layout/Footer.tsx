import { useLocale } from '../../i18n/LocaleContext';

export function Footer() {
  const { t } = useLocale();

  return (
    <footer className="flex-none border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-400 sm:px-6">
      {t('common.footer')}
    </footer>
  );
}
