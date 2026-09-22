import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { es, renderApp } from '../../_helpers/render';
import { createSupabaseMock } from '../../_helpers/supabase';

const replace = jest.fn();
const push = jest.fn();
let params = new URLSearchParams('beneficiaryId=1');
const router = { replace, push, back: jest.fn(), prefetch: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => params,
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

const card = jest.fn();
jest.mock('@/lib/beneficiary', () => ({
  loadBeneficiaryCard: (...args: unknown[]) => card(...args),
}));

let orgId: string | null = '7';
let sinNombreDeOrg = false;
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    appUser: {
      organization_id: orgId,
      organization: sinNombreDeOrg ? null : { name: 'Churrico' },
    },
  }),
}));

import ScannedUserPage from '@/app/(app)/scanned-user/page';
import { notify as notifyModule } from '@/lib/notify';

const notify = jest.mocked(notifyModule);

const miembro = {
  id: 1,
  name: 'Agustin Cassani',
  email: 'cliente@ejemplo.com',
  isMember: true,
  availablePoints: 900,
};
const noMiembro = { ...miembro, isMember: false, availablePoints: 0 };

beforeEach(() => {
  jest.clearAllMocks();
  db.reset();
  params = new URLSearchParams('beneficiaryId=1');
  orgId = '7';
  sinNombreDeOrg = false;
  card.mockResolvedValue(miembro);
});

/** Lo que consulta la ficha de un miembro: reglas activas y puntos al dia. Los
 *  dos efectos corren en paralelo, por eso va encolado por tabla. */
const conDatosDeMiembro = () => {
  db.queueTable('points_rule', { data: [{ id: 1 }], error: null });
  db.queueTable('beneficiary_organization', {
    data: { available_points: 900 },
    error: null,
  });
};

const shown = (name: string) => screen.findByText(name);

describe('ficha de un miembro', () => {
  beforeEach(conDatosDeMiembro);

  it('muestra nombre, email, organizacion y puntos', async () => {
    renderApp(<ScannedUserPage />);
    expect(await shown('Agustin Cassani')).toBeInTheDocument();
    expect(screen.getByText('cliente@ejemplo.com')).toBeInTheDocument();
    expect(screen.getByText('Churrico')).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument();
    expect(screen.getByText(es('client.member'))).toBeInTheDocument();
  });

  it('carga la ficha por id: no la lee de la URL', async () => {
    renderApp(<ScannedUserPage />);
    await shown('Agustin Cassani');
    expect(card).toHaveBeenCalledWith('1', '7');
  });

  it('Nueva Venta pasa solo el id', async () => {
    renderApp(<ScannedUserPage />);
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(es('client.newSale')) }));
    expect(push).toHaveBeenCalledWith('/new-sale?beneficiaryId=1');
  });
});

describe('ficha de un no miembro', () => {
  beforeEach(() => card.mockResolvedValue(noMiembro));

  it('ofrece invitarlo', async () => {
    renderApp(<ScannedUserPage />);
    expect(await screen.findByText(es('client.notMember'))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: new RegExp(es('client.inviteAction')) }),
    ).toBeInTheDocument();
  });

  it('al invitar lo suma al club y recarga la ficha ahi mismo', async () => {
    db.queueTable('beneficiary_organization', { data: { id: 1 }, error: null });
    renderApp(<ScannedUserPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: new RegExp(es('client.inviteAction')) }),
    );

    await waitFor(() => expect(notify.success).toHaveBeenCalled());
    // Recarga en vez de irse de la pantalla: el cliente ya es miembro.
    await waitFor(() => expect(card).toHaveBeenCalledTimes(2));
    expect(replace).not.toHaveBeenCalledWith('/');
  });

  it('si ya existia la membresia la reactiva', async () => {
    db.queueTable(
      'beneficiary_organization',
      { data: null, error: { code: '23505' } },
      { data: { id: 1 }, error: null },
    );
    renderApp(<ScannedUserPage />);
    await userEvent.click(
      await screen.findByRole('button', { name: new RegExp(es('client.inviteAction')) }),
    );
    await waitFor(() => expect(notify.success).toHaveBeenCalled());
  });

  it('si el insert falla avisa y no dice que lo invito', async () => {
    db.queueTable('beneficiary_organization', { data: null, error: { code: '42501' } });
    renderApp(<ScannedUserPage />);
    await userEvent.click(
      await screen.findByRole('button', { name: new RegExp(es('client.inviteAction')) }),
    );
    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(notify.success).not.toHaveBeenCalled();
  });
});

describe('cliente inexistente', () => {
  it('avisa y vuelve a la home en vez de quedar colgado', async () => {
    card.mockResolvedValue(null);
    renderApp(<ScannedUserPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(notify.error).toHaveBeenCalledWith(
      es('common.error'),
      expect.objectContaining({ description: es('scanner.userNotFound') }),
    );
  });

  it('mientras carga muestra el spinner', () => {
    card.mockReturnValue(new Promise(() => {}));
    renderApp(<ScannedUserPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('navegacion', () => {
  beforeEach(conDatosDeMiembro);

  it('la casita vuelve a la home', async () => {
    renderApp(<ScannedUserPage />);
    await shown('Agustin Cassani');
    await userEvent.click(screen.getByRole('button', { name: es('common.back') }));
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('el engranaje abre el perfil', async () => {
    renderApp(<ScannedUserPage />);
    await shown('Agustin Cassani');
    await userEvent.click(screen.getByRole('button', { name: es('profile.myProfile') }));
    expect(push).toHaveBeenCalledWith('/profile');
  });

  it('"Escanear otro" vuelve a la camara', async () => {
    renderApp(<ScannedUserPage />);
    await shown('Agustin Cassani');
    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(es('client.scanAnotherMember')) }),
    );
    expect(replace).toHaveBeenCalledWith('/scanner');
  });

  it('"Volver al inicio" tambien', async () => {
    renderApp(<ScannedUserPage />);
    await shown('Agustin Cassani');
    await userEvent.click(screen.getByRole('button', { name: es('client.goHome') }));
    expect(replace).toHaveBeenCalledWith('/');
  });
});

describe('invitar: caminos de borde', () => {
  beforeEach(() => card.mockResolvedValue(noMiembro));

  it('si la reactivacion tambien falla, avisa y no dice que lo invito', async () => {
    db.queueTable(
      'beneficiary_organization',
      { data: null, error: { code: '23505' } },
      { data: null, error: { code: '42501' } },
    );
    renderApp(<ScannedUserPage />);
    await userEvent.click(
      await screen.findByRole('button', { name: new RegExp(es('client.inviteAction')) }),
    );

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('common.error'),
        expect.objectContaining({ description: es('error.db.forbidden') }),
      ),
    );
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('un fallo de red sale traducido', async () => {
    db.client.from.mockImplementationOnce(() => {
      throw new TypeError('Failed to fetch');
    });
    renderApp(<ScannedUserPage />);
    await userEvent.click(
      await screen.findByRole('button', { name: new RegExp(es('client.inviteAction')) }),
    );

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('common.error'),
        expect.objectContaining({ description: es('error.network') }),
      ),
    );
  });

  it('sin organizacion la ficha ni siquiera carga: no hay nada que invitar', async () => {
    orgId = null;
    renderApp(<ScannedUserPage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: new RegExp(es('client.inviteAction')) }),
    ).not.toBeInTheDocument();
    expect(db.tables).toEqual([]);
  });
});

describe('puntos en tiempo real', () => {
  beforeEach(conDatosDeMiembro);

  it('un canje del cliente actualiza sus puntos sin recargar', async () => {
    renderApp(<ScannedUserPage />);
    await screen.findByText('900');

    const onChange = db.channel.on.mock.calls[0][2] as (p: unknown) => void;
    await act(async () =>
      onChange({ new: { organization_id: 7, available_points: 750 } }),
    );

    expect(await screen.findByText('750')).toBeInTheDocument();
  });

  it('ignora el cambio si es de otra organizacion', async () => {
    renderApp(<ScannedUserPage />);
    await screen.findByText('900');

    const onChange = db.channel.on.mock.calls[0][2] as (p: unknown) => void;
    await act(async () =>
      onChange({ new: { organization_id: 99, available_points: 0 } }),
    );

    expect(screen.getByText('900')).toBeInTheDocument();
  });

  it('reusa el topic: si quedo un canal viejo lo remueve antes de abrir otro', async () => {
    db.client.getChannels.mockReturnValue([
      { topic: 'realtime:caja-points-1-7' },
    ]);
    renderApp(<ScannedUserPage />);
    await screen.findByText('900');

    expect(db.client.removeChannel).toHaveBeenCalledWith({
      topic: 'realtime:caja-points-1-7',
    });
  });

  it('una organizacion sin nombre cargado se muestra como "sin organizacion"', async () => {
    sinNombreDeOrg = true;
    card.mockResolvedValue(miembro);
    renderApp(<ScannedUserPage />);
    expect(await screen.findByText(es('common.noOrganization'))).toBeInTheDocument();
  });
});

describe('chequeo de reglas', () => {
  let restoreFrom: (() => void) | null = null;
  afterEach(() => {
    restoreFrom?.();
    restoreFrom = null;
  });

  beforeEach(() => {
    db.queueTable('beneficiary_organization', {
      data: { available_points: 900 },
      error: null,
    });
  });

  it('mientras se fija si hay reglas, "Nueva Venta" espera', async () => {
    // clearAllMocks no borra implementaciones: hay que devolver la original o
    // se filtra al test siguiente.
    const original = db.client.from.getMockImplementation()!;
    restoreFrom = () => db.client.from.mockImplementation(original);

    db.client.from.mockImplementation((table: string) => {
      if (table === 'points_rule') {
        return { select: () => ({ eq: () => ({ eq: () => ({ limit: () => new Promise(() => {}) }) }) }) };
      }
      return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { available_points: 900 }, error: null }) }) }) }) };
    });
    renderApp(<ScannedUserPage />);
    await screen.findByText('Agustin Cassani');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '' })).toBeDisabled(),
    );
  });

  it('sin reglas configuradas avisa y no deja vender', async () => {
    db.queueTable('points_rule', { data: [], error: null });
    renderApp(<ScannedUserPage />);

    expect(await screen.findByText(es('client.noRulesWarning'))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: new RegExp(es('client.newSale')) }),
    ).toBeDisabled();
  });
});

describe('datos incompletos del cliente', () => {
  beforeEach(() => {
    db.queueTable('points_rule', { data: [{ id: 1 }], error: null });
  });

  it('un cliente sin nombre se muestra como "usuario"', async () => {
    card.mockResolvedValue({ ...miembro, name: '' });
    db.queueTable('beneficiary_organization', { data: { available_points: 900 }, error: null });
    renderApp(<ScannedUserPage />);
    expect(await screen.findByText(es('common.user'))).toBeInTheDocument();
  });

  it('si no se pueden releer los puntos, se queda con los de la ficha', async () => {
    db.queueTable('beneficiary_organization', { data: null, error: { code: 'PGRST116' } });
    renderApp(<ScannedUserPage />);
    expect(await screen.findByText('900')).toBeInTheDocument();
  });

  it('un cambio en tiempo real sin puntos no rompe la pantalla', async () => {
    db.queueTable('beneficiary_organization', { data: { available_points: 900 }, error: null });
    renderApp(<ScannedUserPage />);
    await screen.findByText('900');

    const onChange = db.channel.on.mock.calls[0][2] as (p: unknown) => void;
    await act(async () => onChange({ new: { organization_id: '7' } }));

    expect(await screen.findByText('900')).toBeInTheDocument();
  });

  it('sin beneficiaryId en la URL la pantalla no carga nada', async () => {
    params = new URLSearchParams();
    renderApp(<ScannedUserPage />);
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(card).not.toHaveBeenCalled();
  });
});

describe('invitar a un cliente sin nombre', () => {
  it('el aviso de exito dice "cliente"', async () => {
    card.mockResolvedValue({ ...noMiembro, name: '' });
    db.queueTable('beneficiary_organization', { data: { id: 1 }, error: null });
    renderApp(<ScannedUserPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: new RegExp(es('client.inviteAction')) }),
    );
    await waitFor(() =>
      expect(notify.success).toHaveBeenCalledWith(
        es('client.invitedTitle'),
        expect.objectContaining({
          description: es('client.invitedBody', { name: es('common.client') }),
        }),
      ),
    );
  });
});

describe('salida durante la carga', () => {
  it('la casita funciona tambien mientras la ficha carga', async () => {
    card.mockReturnValue(new Promise(() => {}));
    renderApp(<ScannedUserPage />);

    await userEvent.click(await screen.findByRole('button', { name: es('common.back') }));
    expect(replace).toHaveBeenCalledWith('/');
  });
});
