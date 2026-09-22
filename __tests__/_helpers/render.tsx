import { render, type RenderOptions } from '@testing-library/react';
import React from 'react';

import { I18nProvider } from '@/contexts/I18nContext';
import { translate, type Lang, type MessageKey } from '@/i18n';

/** Traduce igual que la pantalla, para no hardcodear textos en las assertions. */
export const es = (key: MessageKey, params?: Record<string, string | number>) =>
  translate('es', key, params);

/** Envuelve en el provider de i18n: sin el, las pantallas caen al fallback y
 *  los tests dejarian de ver el idioma real. */
export function renderApp(
  ui: React.ReactElement,
  { lang = 'es' as Lang, ...options }: { lang?: Lang } & RenderOptions = {},
) {
  return render(<I18nProvider initialLang={lang}>{ui}</I18nProvider>, options);
}
