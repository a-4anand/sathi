export const LOCALE_COOKIE = 'saathi.locale';
export const SUPPORTED_LOCALES = ['en', 'hi', 'ko', 'pt', 'es'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
