/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const getUser = jest.fn();
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn((_url: string, _key: string, opts: {
    cookies: { getAll: () => unknown[]; setAll: (c: unknown[]) => void };
  }) => {
    // El shim de cookies se ejercita igual que en produccion.
    opts.cookies.getAll();
    opts.cookies.setAll([
      { name: 'sb-token', value: 'refrescado', options: { path: '/' } },
    ]);
    return { auth: { getUser } };
  }),
}));

import { LANG_COOKIE } from '@/i18n/cookie';
import { updateSession } from '@/lib/supabase/middleware';

const request = (
  path: string,
  { cookies = {}, acceptLanguage }: { cookies?: Record<string, string>; acceptLanguage?: string } = {},
) => {
  const req = new NextRequest(`http://localhost:3002${path}`, {
    headers: acceptLanguage ? { 'accept-language': acceptLanguage } : undefined,
  });
  for (const [name, value] of Object.entries(cookies)) req.cookies.set(name, value);
  return req;
};

const signedIn = () => getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
const signedOut = () => getUser.mockResolvedValue({ data: { user: null } });

const location = (res: Response) => res.headers.get('location');

beforeEach(() => jest.clearAllMocks());

describe('guardia de sesion', () => {
  it('sin sesion manda al login', async () => {
    signedOut();
    const res = await updateSession(request('/new-sale'));
    expect(res.status).toBe(307);
    expect(location(res)).toContain('/sign-in');
  });

  it('el redirect se lleva las cookies refrescadas, o desloguea al cajero', async () => {
    signedOut();
    const res = await updateSession(request('/'));
    expect(res.headers.get('set-cookie')).toContain('sb-token=refrescado');
  });

  it('borra la query al redirigir: puede traer datos del cliente', async () => {
    signedOut();
    const res = await updateSession(request('/scanned-user?beneficiaryId=1'));
    expect(location(res)).not.toContain('beneficiaryId');
  });

  it.each(['/sign-in', '/auth/callback'])('%s es publica', async (path) => {
    signedOut();
    const res = await updateSession(request(path));
    expect(location(res)).toBeNull();
  });

  it('con sesion deja pasar', async () => {
    signedIn();
    const res = await updateSession(request('/new-sale'));
    expect(location(res)).toBeNull();
  });

  it('con sesion, /sign-in rebota a la home', async () => {
    signedIn();
    const res = await updateSession(request('/sign-in'));
    expect(location(res)).toContain('/');
    expect(location(res)).not.toContain('sign-in');
  });
});

describe('cookie de idioma', () => {
  it('la siembra con el Accept-Language en la primera visita', async () => {
    signedIn();
    const res = await updateSession(
      request('/', { acceptLanguage: 'en-US,en;q=0.9' }),
    );
    expect(res.headers.get('set-cookie')).toContain(`${LANG_COOKIE}=en`);
  });

  it('cae a espanol si el navegador no pide ingles', async () => {
    signedIn();
    const res = await updateSession(request('/', { acceptLanguage: 'pt-BR' }));
    expect(res.headers.get('set-cookie')).toContain(`${LANG_COOKIE}=es`);
  });

  it('no la pisa si el cajero ya eligio idioma en su perfil', async () => {
    signedIn();
    const res = await updateSession(
      request('/', { cookies: { [LANG_COOKIE]: 'en' }, acceptLanguage: 'es-AR' }),
    );
    expect(res.headers.get('set-cookie') ?? '').not.toContain(`${LANG_COOKIE}=es`);
  });
});
