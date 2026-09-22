import React from 'react';

const get = jest.fn();
jest.mock('next/headers', () => ({
  cookies: async () => ({ get }),
}));

jest.mock('@/contexts/AuthContext', () => ({ AuthProvider: () => null }));
jest.mock('@/components/ui/notify', () => ({ NotifyHost: () => null }));
jest.mock('@/components/ui/confirm', () => ({ ConfirmHost: () => null }));

import RootLayout, { metadata, viewport } from '@/app/layout';
import { LANG_COOKIE } from '@/i18n/cookie';

beforeEach(() => jest.clearAllMocks());

/** El layout raiz devuelve <html>: montarlo en jsdom no aporta nada, asi que se
 *  inspecciona el arbol que arma. */
const render = async () =>
  (await RootLayout({ children: null })) as React.ReactElement<{ lang: string }>;

describe('layout raiz', () => {
  it('toma el idioma de la cookie que siembra el proxy', async () => {
    get.mockReturnValue({ value: 'en' });
    const tree = await render();

    expect(get).toHaveBeenCalledWith(LANG_COOKIE);
    expect(tree.props.lang).toBe('en');
  });

  it('sin cookie cae a espanol', async () => {
    get.mockReturnValue(undefined);
    expect((await render()).props.lang).toBe('es');
  });

  it('un idioma que no existe tambien cae a espanol', async () => {
    get.mockReturnValue({ value: 'pt' });
    expect((await render()).props.lang).toBe('es');
  });
});

describe('metadata', () => {
  it('declara el titulo de la app', () => {
    expect(metadata.title).toBe('PuntosClub Caja');
  });

  it('pinta la barra del navegador del mismo verde que el header', () => {
    expect(viewport.themeColor).toBe('#02875B');
  });

  it('deja el zoom habilitado: bloquearlo es una barrera de accesibilidad', () => {
    expect(viewport).not.toHaveProperty('maximumScale');
    expect(viewport).not.toHaveProperty('userScalable');
  });
});
