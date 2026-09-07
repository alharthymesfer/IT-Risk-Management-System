import { ar } from './ar';
import { en, type TranslationSchema } from './en';

export type Locale = 'en' | 'ar';

export const DEFAULT_LOCALE: Locale = 'en';

export const translations: Record<Locale, TranslationSchema> = { en, ar };

export type { TranslationSchema };
