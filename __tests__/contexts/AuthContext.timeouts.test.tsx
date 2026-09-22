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

function Probe() {
  const { loading, appUser, session } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="session">{session ? 'si' : 'no'}</span>
      <span data-testid="appUser">{appUser?.organization_id ?? '-'}</span>
    </div>
  );
}

const mount = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

beforeEach(() => {
  db.reset();
  jest.useFakeTimers();
  db.client.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  } as never);
});

afterEach(() => jest.useRealTimers());

describe('cortes por timeout', () => {
  it('si getSession nunca responde, a los 10s deja de cargar en vez de girar para siempre', async () => {
    db.client.auth.getSession.mockReturnValue(new Promise(() => {}) as never);
    mount();

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('session')).toHaveTextContent('no');
  });

  it('si la consulta del app_user se cuelga, a los 8s la pantalla sigue viva sin cajero', async () => {
    db.client.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'auth-1' } } },
      error: null,
    } as never);
    // El select de app_user no resuelve nunca.
    db.client.from.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => new Promise(() => {}) }) }),
    } as never);

    mount();
    // Dos vueltas: la primera resuelve getSession, la segunda vence el timeout
    // de la consulta del app_user (que recien ahi arranca).
    await act(async () => {});
    await act(async () => {
      jest.advanceTimersByTime(8_000);
    });

    await waitFor(
      () => expect(screen.getByTestId('loading')).toHaveTextContent('false'),
      { timeout: 2000 },
    );
    expect(screen.getByTestId('appUser')).toHaveTextContent('-');
  });
});
