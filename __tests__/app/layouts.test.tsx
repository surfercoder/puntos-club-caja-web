import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const replace = jest.fn();
const router = { replace, push: jest.fn(), back: jest.fn(), prefetch: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => router,
}));

const signOut = jest.fn().mockResolvedValue(undefined);
const auth = {
  session: null as unknown,
  appUser: null as unknown,
  loading: false,
  // El tipo es la firma, no el mock: los tests que imitan al provider le
  // asignan una funcion nueva para rearmar la identidad de `signOut`.
  signOut: signOut as () => Promise<void>,
};
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => auth,
}));

import AppLayout from '@/app/(app)/layout';
import AuthLayout from '@/app/(auth)/layout';
import NotFound from '@/app/not-found';

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(auth, {
    session: null,
    appUser: null,
    loading: false,
    signOut,
  });
});

describe('guardia de (app)', () => {
  it('mientras carga muestra el spinner y no redirige', () => {
    auth.loading = true;
    render(<AppLayout>contenido</AppLayout>);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('sin sesion manda al login', async () => {
    render(<AppLayout>contenido</AppLayout>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(screen.queryByText('contenido')).not.toBeInTheDocument();
  });

  // Con la cookie todavia viva el proxy rebota /sign-in a /: sin cerrar sesion
  // primero, el cajero queda dando vueltas contra el spinner.
  it('con sesion pero sin app_user de caja cierra sesion y manda al login', async () => {
    auth.session = { user: { id: 'a' } };
    render(<AppLayout>contenido</AppLayout>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  // El provider rearma `signOut` en cada render, asi que el efecto se repite:
  // no tiene que disparar un segundo cierre de sesion. El wrapper imita ese
  // cambio de identidad — con la misma funcion el efecto no se volveria a
  // correr y el test pasaria incluso sin el flag que lo corta.
  it('no repite el cierre de sesion si el layout se vuelve a renderizar', async () => {
    auth.session = { user: { id: 'a' } };
    const { rerender } = render(<AppLayout>contenido</AppLayout>);
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    auth.signOut = () => signOut();
    rerender(<AppLayout>contenido</AppLayout>);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('con cajero valido deja pasar', () => {
    auth.session = { user: { id: 'a' } };
    auth.appUser = { organization_id: '7' };
    render(<AppLayout>contenido</AppLayout>);
    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('layout de (auth)', () => {
  it('solo pasa a los hijos', () => {
    render(<AuthLayout>login</AuthLayout>);
    expect(screen.getByText('login')).toBeInTheDocument();
  });
});

describe('404', () => {
  it('ofrece volver a la home', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PuntosClub Caja' })).toHaveAttribute('href', '/');
  });
});
