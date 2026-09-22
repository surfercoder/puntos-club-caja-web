import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { es, renderApp } from '../../_helpers/render';
import { createSupabaseMock } from '../../_helpers/supabase';

const replace = jest.fn();
const router = { replace, push: jest.fn(), back: jest.fn(), prefetch: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => router }));

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

jest.mock('@/lib/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const confirmMock = jest.fn();
jest.mock('@/lib/confirm', () => ({
  confirm: (...a: unknown[]) => confirmMock(...a),
}));

const signOut = jest.fn();
const appUser = {
  id: '5',
  first_name: 'Elena',
  last_name: 'Diaz',
  email: 'elena@puntosclub.com.ar',
  username: 'elena',
  active: true,
  organization: { name: 'Churrico' },
};
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ appUser, signOut }),
}));

import ProfilePage from '@/app/(app)/profile/page';
import { notify as notifyModule } from '@/lib/notify';

const notify = jest.mocked(notifyModule);

const save = () => screen.getByRole('button', { name: es('profile.save') });

beforeEach(() => {
  jest.clearAllMocks();
  db.reset();
  confirmMock.mockResolvedValue(true);
  signOut.mockResolvedValue(undefined);
});

describe('datos', () => {
  it('precarga nombre, apellido y los campos de solo lectura', () => {
    renderApp(<ProfilePage />);
    expect(screen.getByDisplayValue('Elena')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Diaz')).toBeInTheDocument();
    expect(screen.getByText('elena@puntosclub.com.ar')).toBeInTheDocument();
    expect(screen.getByText('Churrico')).toBeInTheDocument();
  });
});

describe('guardar', () => {
  it('actualiza nombre y apellido, nunca el email', async () => {
    db.queue({ data: null, error: null });
    renderApp(<ProfilePage />);

    const nombre = screen.getByDisplayValue('Elena');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Elena Maria');
    await userEvent.click(save());

    await waitFor(() => expect(notify.success).toHaveBeenCalled());
    expect(db.tables).toEqual(['app_user']);
  });

  it('un error de base sale traducido', async () => {
    db.queue({ data: null, error: { code: '42501' } });
    renderApp(<ProfilePage />);
    await userEvent.click(save());

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('common.error'),
        expect.objectContaining({ description: es('error.db.forbidden') }),
      ),
    );
    expect(notify.success).not.toHaveBeenCalled();
  });
});

describe('idioma', () => {
  it('se puede pasar a ingles desde el perfil', async () => {
    renderApp(<ProfilePage />);
    expect(save()).toBeInTheDocument();
    const english = screen.getByRole('radio', { name: es('profile.languageEn') });
    expect(english).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(english);

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: es('profile.save') }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: es('profile.languageEn') }),
    ).toHaveAttribute('aria-checked', 'true');
  });
});

describe('cerrar sesion', () => {
  it('pide confirmacion y, si confirma, sale al login', async () => {
    renderApp(<ProfilePage />);
    await userEvent.click(screen.getByRole('button', { name: es('signOut.action') }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(replace).toHaveBeenCalledWith('/sign-in');
  });

  it('si cancela no cierra nada', async () => {
    confirmMock.mockResolvedValue(false);
    renderApp(<ProfilePage />);
    await userEvent.click(screen.getByRole('button', { name: es('signOut.action') }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(signOut).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('navegacion', () => {
  it('la flecha vuelve a la home', async () => {
    renderApp(<ProfilePage />);
    await userEvent.click(screen.getByRole('button', { name: es('common.back') }));
    expect(replace).toHaveBeenCalledWith('/');
  });
});

describe('detalles', () => {
  it('se puede editar el apellido', async () => {
    renderApp(<ProfilePage />);
    const apellido = screen.getByDisplayValue('Diaz');
    await userEvent.clear(apellido);
    await userEvent.type(apellido, 'Diaz Lopez');
    expect(apellido).toHaveValue('Diaz Lopez');
  });

  it('una cuenta desactivada se marca en rojo', () => {
    Object.assign(appUser, { active: false });
    renderApp(<ProfilePage />);
    expect(screen.getByText(es('common.inactive'))).toBeInTheDocument();
    Object.assign(appUser, { active: true });
  });

  it('sin organizacion lo dice en vez de dejar el hueco', () => {
    const previa = appUser.organization;
    Object.assign(appUser, { organization: null });
    renderApp(<ProfilePage />);
    expect(screen.getByText(es('common.noOrganization'))).toBeInTheDocument();
    Object.assign(appUser, { organization: previa });
  });
});

describe('perfil incompleto', () => {
  it('sin nombre cargado arranca con los campos vacios', () => {
    Object.assign(appUser, { first_name: null, last_name: null, email: null });
    renderApp(<ProfilePage />);

    expect(screen.getByLabelText(es('profile.firstName'))).toHaveValue('');
    expect(screen.getByLabelText(es('profile.lastName'))).toHaveValue('');
    // Sin email el campo muestra un guion, no "null".
    expect(screen.getByText('—')).toBeInTheDocument();

    Object.assign(appUser, {
      first_name: 'Elena',
      last_name: 'Diaz',
      email: 'elena@puntosclub.com.ar',
    });
  });

  it('sin id de usuario no intenta guardar', async () => {
    const previo = appUser.id;
    Object.assign(appUser, { id: null });
    renderApp(<ProfilePage />);

    await userEvent.click(save());
    expect(db.tables).toEqual([]);

    Object.assign(appUser, { id: previo });
  });
});
