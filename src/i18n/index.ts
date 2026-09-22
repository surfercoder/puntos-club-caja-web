import { en } from './en';
import { es } from './es';

// i18n propio en vez de i18next: son dos idiomas y un diccionario plano, y la
// app ya arrastra suficiente bundle. `es` es la fuente de verdad de las claves
// y `en` esta tipado contra ella, asi que un mensaje nuevo no puede quedar en
// un solo archivo de recursos (falla el type-check).
export const LANGS = ['es', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'es';

export type MessageKey = keyof typeof es;
export type Translate = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string;

const dicts: Record<Lang, Record<MessageKey, string>> = { es, en };

export const isLang = (value: unknown): value is Lang =>
  LANGS.includes(value as Lang);

export const isMessageKey = (value: unknown): value is MessageKey =>
  typeof value === 'string' && Object.hasOwn(es, value);

// Interpolacion {name}. Si falta el parametro se deja el placeholder crudo:
// preferible a un "undefined" en medio de la frase.
export function translate(
  lang: Lang,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const raw = dicts[lang][key] ?? es[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] === undefined ? match : String(params[name]),
  );
}

// Los formateadores de theme.ts (numeros y fechas) los llaman decenas de
// componentes que no reciben `lang` por props. En vez de enhebrarlo por todos,
// el provider publica aca el idioma activo.
// ponytail: modulo mutable, valido porque la app tiene un solo arbol y un solo
// idioma a la vez. Si algun dia hay dos, esto pasa a leerse del contexto.
let activeLang: Lang = DEFAULT_LANG;
export const setActiveLang = (lang: Lang) => {
  activeLang = lang;
};
export const getActiveLang = (): Lang => activeLang;

export { en, es };
