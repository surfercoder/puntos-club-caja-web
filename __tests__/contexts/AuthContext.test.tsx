import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { createSupabaseMock } from '../_helpers/supabase';

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

type Listener = (event: string, session: unknown) => Promise<void> | void;
let listener: Listener = () => {};

const session = (id = 'auth-1') => ({ user: { id } });

const appUserRow = (over: Record<string, unknown> = {}) => ({
  id: '5',
  organization_id: '7',
  active: true,
  user_role: { name: 'cashier' },
  organization: { id: '7', name: 'Churrico' },
  ...over,
});

function Probe() {
  const { appUser, session: s, loading, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="session">{s ? 'si' : 'no'}</span>
      <span data-testid="appUser">{appUser?.organization_id ?? '-'}</span>
      <button onClick={() => void signOut()}>salir</button>
    </div>
  );
}

const renderAuth = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

const ready = () =>
  waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

beforeEach(() => {
  db.reset();
  jest.useRealTimers();
  db.client.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  } as never);
  db.client.auth.onAuthStateChange.mockImplementation(((cb: Listener) => {
    listener = cb;
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  }) as never);
});

describe('arranque', () => {
  it('sin sesion deja de cargar y no consulta app_user', async () => {
    renderAuth();
    await ready();
    expect(screen.getByTestId('session')).toHaveTextContent('no');
    expect(db.tables).toEqual([]);
  });

  it('con sesion valida carga el app_user con su organizacion', async () => {
    db.client.auth.getSession.mockResolvedValue({
      data: { session: session() },
      error: null,
    } as never);
    db.queue({ data: appUserRow(), error: null });

    renderAuth();
    await ready();
    expect(screen.getByTestId('appUser')).toHaveTextContent('7');
    expect(db.tables).toEqual(['app_user']);
  });

  it('un owner tambien entra: atiende su propia caja', async () => {
    db.client.auth.getSession.mockResolvedValue({
      data: { session: session() },
      error: null,
    } as never);
    db.queue({ data: appUserRow({ user_role: { name: 'owner' } }), error: null });

    renderAuth();
    await ready();
    expect(screen.getByTestId('appUser')).toHaveTextContent('7');
  });

  it.each([
    ['sin app_user', { data: null, error: { code: 'PGRST116' } }],
    ['con un rol que no es de caja', { data: appUserRow({ user_role: { name: 'beneficiary' } }), error: null }],
    ['sin rol', { data: appUserRow({ user_role: null }), error: null }],
  ])('%s cierra la sesion', async (_label, result) => {
    db.client.auth.getSession.mockResolvedValue({
      data: { session: session() },
      error: null,
    } as never);
    db.queue(result as never);

    renderAuth();
    await ready();
    expect(screen.getByTestId('appUser')).toHaveTextContent('-');
    expect(db.client.auth.signOut).toHaveBeenCalled();
  });

  it('un getSession con error limpia todo', async () => {
    db.client.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'boom' },
    } as never);

    renderAuth();
    await ready();
    expect(screen.getByTestId('session')).toHaveTextContent('no');
    expect(db.client.auth.signOut).toHaveBeenCalled();
  });

  it('un getSession que explota tambien', async () => {
    db.client.auth.getSession.mockRejectedValue(new Error('sin red') as never);
    renderAuth();
    await ready();
    expect(screen.getByTestId('session')).toHaveTextContent('no');
  });
});

describe('onAuthStateChange', () => {
  it('SIGNED_OUT limpia la sesion', async () => {
    renderAuth();
    await ready();
    await act(() => listener('SIGNED_OUT', null));
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('no'));
  });

  it('TOKEN_REFRESHED no vuelve a pedir el app_user: parpadearia la pantalla', async () => {
    renderAuth();
    await ready();
    db.tables.length = 0;

    await act(() => listener('TOKEN_REFRESHED', session()));
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('si'));
    expect(db.tables).toEqual([]);
  });

  it('SIGNED_IN carga el app_user', async () => {
    renderAuth();
    await ready();
    db.queue({ data: appUserRow(), error: null });

    await act(() => listener('SIGNED_IN', session()));
    await waitFor(() => expect(screen.getByTestId('appUser')).toHaveTextContent('7'));
  });

  it('un evento sin sesion borra el app_user', async () => {
    renderAuth();
    await ready();
    await act(() => listener('USER_UPDATED', null));
    await waitFor(() => expect(screen.getByTestId('appUser')).toHaveTextContent('-'));
  });
});

describe('signOut', () => {
  it('limpia el estado', async () => {
    db.client.auth.getSession.mockResolvedValue({
      data: { session: session() },
      error: null,
    } as never);
    db.queue({ data: appUserRow(), error: null });

    renderAuth();
    await ready();
    await act(async () => screen.getByText('salir').click());
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('no'));
  });

  it('limpia el estado igual si el signOut de Supabase falla', async () => {
    db.client.auth.signOut.mockRejectedValue(new Error('sesion vencida') as never);
    renderAuth();
    await ready();
    await act(async () => screen.getByText('salir').click());
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('no'));
  });
});

describe('useAuth fuera del provider', () => {
  it('explota, porque un contexto de auth ausente es un bug', () => {
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/AuthProvider/);
    quiet.mockRestore();
  });
});

describe('desmontar a mitad de camino', () => {
  it('no toca el estado si la pantalla ya se fue', async () => {
    let resolveSession!: (v: unknown) => void;
    db.client.auth.getSession.mockReturnValue(
      new Promise((r) => {
        resolveSession = r;
      }) as never,
    );

    const { unmount } = renderAuth();
    unmount();
    // Resolver despues del unmount no puede provocar un update de React.
    await act(async () =>
      resolveSession({ data: { session: session() }, error: null }),
    );
    expect(db.tables).toEqual([]);
  });

  it('un evento de auth despues de salir se ignora', async () => {
    const { unmount } = renderAuth();
    await ready();
    unmount();

    await act(() => listener('SIGNED_IN', session()));
    expect(db.tables).toEqual([]);
  });
});

describe('desmontar mientras carga el cajero', () => {
  it('la consulta que vuelve tarde no actualiza nada', async () => {
    db.client.auth.getSession.mockResolvedValue({
      data: { session: session() },
      error: null,
    } as never);

    let resolver!: (v: unknown) => void;
    db.client.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () =>
            new Promise((r) => {
              resolver = r;
            }),
        }),
      }),
    } as never);

    const { unmount } = renderAuth();
    await act(async () => {});
    unmount();
    await act(async () => resolver({ data: appUserRow(), error: null }));

    expect(screen.queryByTestId('appUser')).not.toBeInTheDocument();
  });
});
