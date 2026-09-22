import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const replace = jest.fn();
const router = { replace, push: jest.fn(), back: jest.fn(), prefetch: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => router,
}));

const auth = {
  session: null as unknown,
  appUser: null as unknown,
  loading: false,
};
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => auth,
}));

import AppLayout from '@/app/(app)/layout';
import AuthLayout from '@/app/(auth)/layout';
import NotFound from '@/app/not-found';

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(auth, { session: null, appUser: null, loading: false });
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

  it('con sesion pero sin app_user de caja tambien manda al login', async () => {
    auth.session = { user: { id: 'a' } };
    render(<AppLayout>contenido</AppLayout>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
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
