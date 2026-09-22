import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { es, renderApp } from '../../_helpers/render';
import { createSupabaseMock } from '../../_helpers/supabase';

const replace = jest.fn();
const router = { replace, push: jest.fn(), back: jest.fn(), prefetch: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => router,
}));

const signIn = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signIn }),
}));

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

jest.mock('@/lib/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import SignInPage from '@/app/(auth)/sign-in/page';
import { notify as notifyModule } from '@/lib/notify';

const notify = jest.mocked(notifyModule);

const emailField = () => screen.getByPlaceholderText(es('signIn.emailPlaceholder'));
const passwordField = () => screen.getByPlaceholderText(es('signIn.passwordPlaceholder'));
const submit = () => screen.getByRole('button', { name: es('signIn.submit') });

beforeEach(() => {
  jest.clearAllMocks();
  db.reset();
  signIn.mockResolvedValue({ error: null });
});

describe('formulario', () => {
  it('muestra el titulo y la version', () => {
    renderApp(<SignInPage />);
    expect(screen.getByRole('heading', { name: es('signIn.title') })).toBeInTheDocument();
  });

  it('no llama a signIn si falta algun campo', async () => {
    renderApp(<SignInPage />);
    await userEvent.click(submit());
    expect(signIn).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith(
      es('common.error'),
      expect.objectContaining({ description: es('signIn.missingFields') }),
    );
  });

  it('entra y reemplaza la ruta, para no volver al formulario con el boton atras', async () => {
    renderApp(<SignInPage />);
    await userEvent.type(emailField(), 'cajero@puntosclub.com.ar');
    await userEvent.type(passwordField(), 'secreto');
    await userEvent.click(submit());

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(signIn).toHaveBeenCalledWith('cajero@puntosclub.com.ar', 'secreto');
  });

  it('muestra el error traducido y no navega', async () => {
    signIn.mockResolvedValue({ error: new Error('error.auth.invalidCredentials') });
    renderApp(<SignInPage />);
    await userEvent.type(emailField(), 'cajero@puntosclub.com.ar');
    await userEvent.type(passwordField(), 'mal');
    await userEvent.click(submit());

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('common.error'),
        expect.objectContaining({
          description: es('error.auth.invalidCredentials'),
        }),
      ),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('nunca muestra el texto crudo de GoTrue', async () => {
    signIn.mockResolvedValue({ error: { code: 'invalid_credentials', message: 'Invalid login credentials' } });
    renderApp(<SignInPage />);
    await userEvent.type(emailField(), 'a@b.com');
    await userEvent.type(passwordField(), 'x');
    await userEvent.click(submit());

    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    const { description } = notify.error.mock.calls[0][1]!;
    expect(description).not.toContain('Invalid login');
  });
});

describe('mostrar contrasena', () => {
  it('alterna entre password y text', async () => {
    renderApp(<SignInPage />);
    expect(passwordField()).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: es('signIn.showPassword') }));
    expect(passwordField()).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: es('signIn.hidePassword') }));
    expect(passwordField()).toHaveAttribute('type', 'password');
  });
});

describe('recordarme', () => {
  it('se puede desmarcar', async () => {
    renderApp(<SignInPage />);
    const toggle = screen.getByRole('checkbox', { name: es('signIn.remember') });
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    expect(toggle).not.toBeChecked();
  });
});

describe('olvide mi contrasena', () => {
  it('pide el email antes de mandar nada', async () => {
    renderApp(<SignInPage />);
    await userEvent.click(screen.getByRole('button', { name: es('signIn.forgot') }));
    expect(db.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(notify.info).toHaveBeenCalledWith(
      es('forgot.title'),
      expect.objectContaining({ description: es('forgot.needEmail') }),
    );
  });

  it('manda el mail con el redirect al admin, normalizando el email', async () => {
    renderApp(<SignInPage />);
    // El campo baja a minusculas y recorta al tipear: se puede pegar en mayusculas.
    await userEvent.type(emailField(), 'Cajero@Puntosclub.com.ar');
    await userEvent.click(screen.getByRole('button', { name: es('signIn.forgot') }));

    await waitFor(() =>
      expect(db.client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'cajero@puntosclub.com.ar',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/update-password'),
        }),
      ),
    );
    expect(notify.success).toHaveBeenCalled();
  });

  it('el rate limit sale traducido y con los segundos', async () => {
    db.client.auth.resetPasswordForEmail.mockResolvedValue({
      error: { status: 429, message: 'you can only request this after 60 seconds' },
    } as never);
    renderApp(<SignInPage />);
    await userEvent.type(emailField(), 'a@b.com');
    await userEvent.click(screen.getByRole('button', { name: es('signIn.forgot') }));

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('forgot.title'),
        expect.objectContaining({
          description: es('error.auth.rateLimitSeconds', { seconds: 60 }),
        }),
      ),
    );
  });
});

describe('ayuda', () => {
  it('abre un mail a soporte', () => {
    renderApp(<SignInPage />);
    const link = screen.getByRole('link', { name: new RegExp(es('signIn.helpTitle')) });
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:'));
  });
});
