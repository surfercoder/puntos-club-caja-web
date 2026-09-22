'use client';

import React, { createContext, use, useState } from 'react';

import {
  DEFAULT_LANG,
  isLang,
  setActiveLang,
  translate,
  type Lang,
  type Translate,
} from '@/i18n';
import { writeLangCookie } from '@/i18n/cookie';

type I18nContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translate;
};

// Sin provider se traduce igual, en el idioma por defecto. Un contexto de auth
// ausente es un bug que conviene que explote; uno de i18n ausente solo puede
// dejar la pantalla en blanco, y un texto en espanol es mejor que eso.
const FALLBACK: I18nContextType = {
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key, params) => translate(DEFAULT_LANG, key, params),
};

const I18nContext = createContext<I18nContextType>(FALLBACK);

// `initialLang` sale de la cookie, que el proxy siembra con el Accept-Language
// en la primera visita. Asi el primer HTML ya viene en el idioma correcto: no
// hay efecto de deteccion, ni parpadeo, ni mismatch de hidratacion (en movil
// esto se resolvia reteniendo el render hasta que AsyncStorage respondia).
export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(() => {
    setActiveLang(initialLang);
    return initialLang;
  });

  const setLang = (next: Lang) => {
    if (!isLang(next)) return;
    setLangState(next);
    setActiveLang(next);
    writeLangCookie(next);
  };

  const t: Translate = (key, params) => translate(lang, key, params);

  return <I18nContext value={{ lang, setLang, t }}>{children}</I18nContext>;
}

export function useI18n(): I18nContextType {
  return use(I18nContext);
}

/** Atajo para los componentes que solo necesitan traducir. */
export function useT(): Translate {
  return useI18n().t;
}
