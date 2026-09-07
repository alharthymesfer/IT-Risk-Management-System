/** `RISK_MANAGER` -> `Risk Manager`, `IN_PROGRESS` -> `In Progress`. */
export function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Explicit per-language locales so date formatting never falls back to the browser/system
 * locale. Arabic is pinned to the Gregorian calendar and Latin (0-9) digits via Unicode
 * extensions so switching language only changes wording/month names — never the calendar
 * system, the numerals, or which day a date falls on.
 */
const DATE_LOCALE: Record<'en' | 'ar', string> = {
  en: 'en-US',
  ar: 'ar-u-ca-gregory-nu-latn',
};

export function formatDate(value: string | Date, locale: 'en' | 'ar' = 'en'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(DATE_LOCALE[locale], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(value: string | Date, locale: 'en' | 'ar' = 'en'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString(DATE_LOCALE[locale], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Always Western digits, regardless of UI language — stats/scores stay easy to scan. */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export function formatFullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`;
}

export function isOverdue(dueDate: string, status: string): boolean {
  return (status === 'OPEN' || status === 'IN_PROGRESS') && new Date(dueDate) < new Date();
}
