import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, SUPPORTED_LOCALES } from './config';

function mergeMessages(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const current = result[key];
    result[key] =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
        ? mergeMessages(
            current as Record<string, unknown>,
            value as Record<string, unknown>
          )
        : value;
  }
  return result;
}

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const configuredLocale = process.env.NEXT_PUBLIC_APP_LOCALE || 'en';
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(
    cookieLocale ?? ''
  )
    ? cookieLocale!
    : (SUPPORTED_LOCALES as readonly string[]).includes(configuredLocale)
      ? configuredLocale
      : 'en';

  const english = (await import(`../../messages/en.json`)).default;
  let messages: typeof english = english;
  try {
    if (locale !== 'en') {
      const localized = (await import(`../../messages/${locale}.json`)).default;
      messages = mergeMessages(english, localized) as typeof english;
    }
  } catch {
    // English remains the complete fallback catalogue.
  }

  return {
    locale,
    messages,
  };
});
