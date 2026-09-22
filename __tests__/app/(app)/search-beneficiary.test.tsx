import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { es, renderApp } from '../../_helpers/render';
import { createSupabaseMock } from '../../_helpers/supabase';

const replace = jest.fn();
const push = jest.fn();
const router = { replace, push, back: jest.fn(), prefetch: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => router,
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

import SearchBeneficiaryPage from '@/app/(app)/search-beneficiary/page';
import { notify as notifyModule } from '@/lib/notify';

const notify = jest.mocked(notifyModule);

const field = () => screen.getByPlaceholderText(es('search.emailPlaceholder'));
const dniField = () => screen.getByPlaceholderText(es('search.dniPlaceholder'));
const send = () => screen.getByRole('button', { name: es('search.submitLabel') });

beforeEach(() => {
  jest.clearAllMocks();
  db.reset();
});

describe('busqueda por email', () => {
  it('encuentra al cliente y va a la ficha pasando solo el id', async () => {
    db.queue({ data: { id: 7 }, error: null });
    renderApp(<SearchBeneficiaryPage />);

    await userEvent.type(field(), 'cliente@ejemplo.com');
    await userEvent.click(send());

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/scanned-user?beneficiaryId=7'),
    );
    expect(replace.mock.calls[0][0]).not.toContain('@');
    expect(db.tables).toEqual(['beneficiary']);
  });

  it('se puede mandar con Enter', async () => {
    db.queue({ data: { id: 7 }, error: null });
    renderApp(<SearchBeneficiaryPage />);
    await userEvent.type(field(), 'cliente@ejemplo.com{Enter}');
    await waitFor(() => expect(replace).toHaveBeenCalled());
  });

  it('avisa si no lo encuentra', async () => {
    db.queue({ data: null, error: { code: 'PGRST116' } });
    renderApp(<SearchBeneficiaryPage />);

    await userEvent.type(field(), 'nadie@ejemplo.com');
    await userEvent.click(send());

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('search.notFoundTitle'),
        expect.objectContaining({ description: es('search.notFoundEmail') }),
      ),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('no busca con el campo vacio', async () => {
    renderApp(<SearchBeneficiaryPage />);
    // Sin texto no hay boton de enviar: se manda el formulario igual.
    await userEvent.type(field(), 'a');
    await userEvent.clear(field());
    expect(screen.queryByRole('button', { name: es('search.submitLabel') })).not.toBeInTheDocument();
  });
});

describe('busqueda por DNI', () => {
  it('cambia de modo y busca por documento', async () => {
    db.queue({ data: { id: 7 }, error: null });
    renderApp(<SearchBeneficiaryPage />);

    await userEvent.click(screen.getByRole('button', { name: es('search.modeDni') }));
    await userEvent.type(dniField(), '30111222');
    await userEvent.click(send());

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/scanned-user?beneficiaryId=7'),
    );
  });

  it('avisa con el texto de DNI cuando no lo encuentra', async () => {
    db.queue({ data: null, error: { code: 'PGRST116' } });
    renderApp(<SearchBeneficiaryPage />);

    await userEvent.click(screen.getByRole('button', { name: es('search.modeDni') }));
    await userEvent.type(dniField(), '30111222');
    await userEvent.click(send());

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('search.notFoundTitle'),
        expect.objectContaining({ description: es('search.notFoundDni') }),
      ),
    );
  });

  it('cambiar de modo limpia lo escrito', async () => {
    renderApp(<SearchBeneficiaryPage />);
    await userEvent.type(field(), 'cliente@ejemplo.com');
    await userEvent.click(screen.getByRole('button', { name: es('search.modeDni') }));
    expect(dniField()).toHaveValue('');
  });
});

describe('errores', () => {
  it('un fallo de red sale traducido', async () => {
    db.client.from.mockImplementationOnce(() => {
      throw new TypeError('Failed to fetch');
    });
    renderApp(<SearchBeneficiaryPage />);

    await userEvent.type(field(), 'cliente@ejemplo.com');
    await userEvent.click(send());

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('common.error'),
        expect.objectContaining({ description: es('error.network') }),
      ),
    );
  });
});

describe('navegacion', () => {
  it('la tarjeta verde abre la camara', async () => {
    renderApp(<SearchBeneficiaryPage />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(es('search.scanSubtitle')) }));
    expect(push).toHaveBeenCalledWith('/scanner');
  });

  it.each([0, 1])('el boton de volver #%i va a la home', async (indice) => {
    renderApp(<SearchBeneficiaryPage />);
    // Hay dos: la flecha del header y el "Volver" del pie.
    const botones = screen.getAllByRole('button', { name: es('common.back') });
    expect(botones).toHaveLength(2);

    await userEvent.click(botones[indice]);
    expect(replace).toHaveBeenCalledWith('/');
  });
});

describe('campo vacio', () => {
  it('mandar el formulario sin escribir nada solo avisa', async () => {
    renderApp(<SearchBeneficiaryPage />);
    // El boton de enviar solo aparece con texto: se manda el form directo.
    const form = document.querySelector('form')!;
    await userEvent.type(screen.getByPlaceholderText(es('search.emailPlaceholder')), ' ');
    form.requestSubmit();

    await waitFor(() =>
      expect(notify.info).toHaveBeenCalledWith(
        es('search.requiredTitle'),
        expect.objectContaining({ description: es('search.requiredEmail') }),
      ),
    );
    expect(db.tables).toEqual([]);
  });

  it('en modo DNI el aviso es el de documento', async () => {
    renderApp(<SearchBeneficiaryPage />);
    await userEvent.click(screen.getByRole('button', { name: es('search.modeDni') }));
    await userEvent.type(screen.getByPlaceholderText(es('search.dniPlaceholder')), ' ');
    document.querySelector('form')!.requestSubmit();

    await waitFor(() =>
      expect(notify.info).toHaveBeenCalledWith(
        es('search.requiredTitle'),
        expect.objectContaining({ description: es('search.requiredDni') }),
      ),
    );
  });
});
