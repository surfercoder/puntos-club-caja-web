import { render, screen, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';

import { createSupabaseMock } from '../_helpers/supabase';

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

type SignIn = (e: string, p: string) => Promise<{ error: Error | null }>;

// El signIn se saca por un ref y no reasignando una variable en el render:
// escribir durante el render es un efecto y React lo prohibe.
const signInRef: { current: SignIn | null } = { current: null };
const doSignIn: SignIn = (email, password) => signInRef.current!(email, password);

function Probe() {
  const { signIn, loading } = useAuth();
  useEffect(() => {
    signInRef.current = signIn;
  }, [signIn]);
  return <span data-testid="loading">{String(loading)}</span>;
}

const appUserRow = (over: Record<string, unknown> = {}) => ({
  id: '5',
  organization_id: '7',
  active: true,
  user_role: { name: 'cashier' },
  ...over,
});

const mount = async () => {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
  db.reset();
};

beforeEach(async () => {
  db.reset();
  db.client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
  db.client.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  } as never);
  db.client.auth.signInWithPassword.mockResolvedValue({
    data: { user: { id: 'auth-1' } },
    error: null,
  } as never);
  await mount();
});

describe('signIn', () => {
  it('con un cajero activo entra sin error', async () => {
    db.queue({ data: appUserRow(), error: null });
    await expect(doSignIn('a@b.com', 'x')).resolves.toEqual({ error: null });
    expect(db.client.auth.signOut).not.toHaveBeenCalled();
  });

  it('un owner tambien: atiende su propia caja', async () => {
    db.queue({ data: appUserRow({ user_role: { name: 'owner' } }), error: null });
    await expect(doSignIn('a@b.com', 'x')).resolves.toEqual({ error: null });
  });

  it('credenciales malas devuelven la clave de i18n, no el texto de GoTrue', async () => {
    db.client.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    } as never);

    const { error } = await doSignIn('a@b.com', 'mal');
    expect(error?.message).toBe('error.auth.invalidCredentials');
  });

  it('un usuario de auth sin app_user no es cajero y se lo desloguea', async () => {
    db.queue({ data: null, error: { code: 'PGRST116' } });

    const { error } = await doSignIn('a@b.com', 'x');
    expect(error?.message).toBe('error.auth.notCashier');
    expect(db.client.auth.signOut).toHaveBeenCalled();
  });

  it.each([
    ['un rol que no es de caja', { name: 'beneficiary' }],
    ['sin rol', null],
  ])('%s no tiene permiso', async (_label, user_role) => {
    db.queue({ data: appUserRow({ user_role }), error: null });

    const { error } = await doSignIn('a@b.com', 'x');
    expect(error?.message).toBe('error.auth.noPermission');
    expect(db.client.auth.signOut).toHaveBeenCalled();
  });

  it('una cuenta desactivada no entra', async () => {
    db.queue({ data: appUserRow({ active: false }), error: null });

    const { error } = await doSignIn('a@b.com', 'x');
    expect(error?.message).toBe('error.auth.disabledAccount');
    expect(db.client.auth.signOut).toHaveBeenCalled();
  });

  it('sin user en la respuesta no consulta app_user', async () => {
    db.client.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null } as never);
    await expect(doSignIn('a@b.com', 'x')).resolves.toEqual({ error: null });
    expect(db.tables).toEqual([]);
  });

  it('un fallo de red sale como error.network', async () => {
    db.client.auth.signInWithPassword.mockRejectedValue(
      new TypeError('Network request failed') as never,
    );
    const { error } = await doSignIn('a@b.com', 'x');
    expect(error?.message).toBe('error.network');
  });

  it('el rate limit conserva los segundos', async () => {
    db.client.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { status: 429, message: 'you can only request this after 45 seconds' },
    } as never);

    const { error } = await doSignIn('a@b.com', 'x');
    expect(error?.message).toBe('error.auth.rateLimitSeconds');
    expect((error as Error & { params?: unknown }).params).toEqual({ seconds: 45 });
  });
});
