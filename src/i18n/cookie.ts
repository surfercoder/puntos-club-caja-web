import { DEFAULT_LANG, isLang, type Lang } from './index';

// Mismo nombre de cookie que puntos-club-admin: las tres webs comparten
// dominio, asi que el idioma elegido en una vale para las otras.
export const LANG_COOKIE = 'NEXT_LOCALE';
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const readLangCookie = (raw: string | undefined | null): Lang =>
  isLang(raw) ? raw : DEFAULT_LANG;

/** Idioma del navegador segun el header Accept-Language ("en-US,en;q=0.9"). */
export const langFromAcceptLanguage = (header: string | null): Lang =>
  header?.trim().toLowerCase().startsWith('en') ? 'en' : DEFAULT_LANG;

export function writeLangCookie(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
}
