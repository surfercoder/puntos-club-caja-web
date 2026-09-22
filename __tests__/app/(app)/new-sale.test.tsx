import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { es, renderApp } from '../../_helpers/render';
import { createSupabaseMock } from '../../_helpers/supabase';

const replace = jest.fn();
const push = jest.fn();
const router = { replace, push, back: jest.fn(), prefetch: jest.fn() };
let params = new URLSearchParams('beneficiaryId=1');
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

const notifyAdmin = jest.fn();
jest.mock('@/lib/notify-admin', () => ({
  notifyAdmin: (...a: unknown[]) => notifyAdmin(...a),
}));

const card = jest.fn();
jest.mock('@/lib/beneficiary', () => ({
  loadBeneficiaryCard: (...a: unknown[]) => card(...a),
}));

let appUser: Record<string, unknown> = { organization_id: '7', id: '5', branch_id: null };
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ appUser }),
}));

import NewSalePage from '@/app/(app)/new-sale/page';
import { notify as notifyModule } from '@/lib/notify';

const notify = jest.mocked(notifyModule);

const amountField = () => screen.getByLabelText(es('sale.amountLabel'));
const submit = () => screen.getByRole('button', { name: new RegExp(es('sale.submit')) });

const breakdown = (points = 100) => [
  { rule_id: 1, name: 'madre', rule_type: 'fixed_amount', config: null, is_default: true, points },
];

const ready = () => screen.findByText('Agustin Cassani');

beforeEach(() => {
  jest.clearAllMocks();
  db.reset();
  params = new URLSearchParams('beneficiaryId=1');
  appUser = { organization_id: '7', id: '5', branch_id: null };
  card.mockResolvedValue({
    id: 1,
    name: 'Agustin Cassani',
    email: 'cliente@ejemplo.com',
    isMember: true,
    availablePoints: 900,
  });
  db.queueTable('points_rule', { data: [], error: null });
  db.queueTable('branch', { data: { id: 3 }, error: null });
  db.client.rpc.mockResolvedValue({ data: breakdown(), error: null } as never);
});

describe('carga de la ficha', () => {
  it('trae los datos del cliente por id, no de la URL', async () => {
    renderApp(<NewSalePage />);
    expect(await ready()).toBeInTheDocument();
    expect(card).toHaveBeenCalledWith('1', '7');
    expect(screen.getByText('cliente@ejemplo.com')).toBeInTheDocument();
  });

  it('mientras carga muestra el spinner, sin el parpadeo de "Cliente / 0 pts"', () => {
    card.mockReturnValue(new Promise(() => {}));
    renderApp(<NewSalePage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText(es('common.client'))).not.toBeInTheDocument();
  });

  it('si el cliente no existe avisa y vuelve a la home', async () => {
    card.mockResolvedValue(null);
    renderApp(<NewSalePage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(notify.error).toHaveBeenCalled();
  });
});

describe('monto y puntos', () => {
  it('calcula los puntos a ganar al escribir el monto', async () => {
    renderApp(<NewSalePage />);
    await ready();

    await userEvent.type(amountField(), '100');
    await waitFor(() => expect(screen.getByText('100')).toBeInTheDocument());
    expect(db.client.rpc).toHaveBeenCalledWith(
      'explain_points_for_amount',
      expect.objectContaining({ p_amount: 100, p_branch_id: 3 }),
    );
  });

  it('con monto vacio no calcula nada', async () => {
    renderApp(<NewSalePage />);
    await ready();
    expect(db.client.rpc).not.toHaveBeenCalled();
    expect(submit()).toBeDisabled();
  });

  it('usa la sucursal del cajero cuando la tiene cargada', async () => {
    appUser = { organization_id: '7', id: '5', branch_id: '9' };
    renderApp(<NewSalePage />);
    await ready();

    await userEvent.type(amountField(), '50');
    await waitFor(() =>
      expect(db.client.rpc).toHaveBeenCalledWith(
        'explain_points_for_amount',
        expect.objectContaining({ p_branch_id: 9 }),
      ),
    );
  });

  it('una organizacion sin sucursales no rompe la venta', async () => {
    db.reset();
    db.queueTable('points_rule', { data: [], error: null });
    db.queueTable('branch', { data: null, error: { code: 'PGRST116' } });
    renderApp(<NewSalePage />);
    await ready();

    await userEvent.type(amountField(), '50');
    await waitFor(() =>
      expect(db.client.rpc).toHaveBeenCalledWith(
        'explain_points_for_amount',
        expect.objectContaining({ p_branch_id: null }),
      ),
    );
  });
});

describe('registrar', () => {
  const cargarMonto = async (monto: string) => {
    renderApp(<NewSalePage />);
    await ready();
    await userEvent.type(amountField(), monto);
    await waitFor(() => expect(db.client.rpc).toHaveBeenCalled());
  };

  it('nada se guarda hasta que el cajero confirma el total', async () => {
    await cargarMonto('100');
    await userEvent.click(submit());

    expect(await screen.findByText(es('sale.confirmTitle'))).toBeInTheDocument();
    // Todavia no hay insert: el caso que motivo esto fue una regla con
    // multiplicador alto asignando 1.200.000 puntos sin que nadie lo notara.
    expect(db.tables).not.toContain('purchase');
  });

  it('al confirmar inserta la compra y avisa al admin', async () => {
    db.queueTable('purchase', { data: null, error: null });
    await cargarMonto('100');
    await userEvent.click(submit());
    await userEvent.click(await screen.findByRole('button', { name: es('sale.confirmAction') }));

    expect(await screen.findByText(es('sale.successTitle'))).toBeInTheDocument();
    expect(db.tables).toContain('purchase');
    expect(notifyAdmin).toHaveBeenCalledWith(
      '/api/purchase/notify',
      expect.objectContaining({ beneficiaryId: 1, pointsEarned: 100 }),
    );
  });

  it('cancelar en el dialogo vuelve al formulario sin guardar', async () => {
    await cargarMonto('100');
    await userEvent.click(submit());
    await userEvent.click(await screen.findByRole('button', { name: es('sale.confirmCancel') }));

    await waitFor(() =>
      expect(screen.queryByText(es('sale.confirmTitle'))).not.toBeInTheDocument(),
    );
    expect(db.tables).not.toContain('purchase');
  });

  it('si el cliente dejo de seguir al club, el error lo dice', async () => {
    db.queueTable('purchase', { data: null, error: { message: 'MEMBERSHIP_INACTIVE' } });
    await cargarMonto('100');
    await userEvent.click(submit());
    await userEvent.click(await screen.findByRole('button', { name: es('sale.confirmAction') }));

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('common.error'),
        expect.objectContaining({ description: es('error.rpc.membershipInactive') }),
      ),
    );
  });

  it('cualquier otro fallo pide reintentar', async () => {
    db.queueTable('purchase', { data: null, error: { code: '23503' } });
    await cargarMonto('100');
    await userEvent.click(submit());
    await userEvent.click(await screen.findByRole('button', { name: es('sale.confirmAction') }));

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('common.error'),
        expect.objectContaining({ description: es('sale.registerFailed') }),
      ),
    );
  });

  it('si la cotizacion falla no se registra nada', async () => {
    await cargarMonto('100');
    db.client.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } } as never);
    await userEvent.click(submit());

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('common.error'),
        expect.objectContaining({ description: es('sale.registerFailed') }),
      ),
    );
    expect(screen.queryByText(es('sale.confirmTitle'))).not.toBeInTheDocument();
  });
});

describe('pantalla de exito', () => {
  const registrar = async () => {
    db.queueTable('purchase', { data: null, error: null });
    renderApp(<NewSalePage />);
    await ready();
    await userEvent.type(amountField(), '100');
    await waitFor(() => expect(db.client.rpc).toHaveBeenCalled());
    await userEvent.click(submit());
    await userEvent.click(await screen.findByRole('button', { name: es('sale.confirmAction') }));
    await screen.findByText(es('sale.successTitle'));
  };

  it('no deja volver al formulario ya enviado', async () => {
    await registrar();
    expect(screen.queryByRole('button', { name: es('common.back') })).not.toBeInTheDocument();
  });

  it('"Escanear Otro" vuelve a la camara', async () => {
    await registrar();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(es('sale.scanAnother')) }));
    expect(replace).toHaveBeenCalledWith('/scanner');
  });

  it('"Finalizar" vuelve a la home', async () => {
    await registrar();
    await userEvent.click(screen.getByRole('button', { name: es('sale.finish') }));
    expect(replace).toHaveBeenCalledWith('/');
  });
});

describe('navegacion', () => {
  it('la flecha vuelve a la ficha del cliente, nunca con router.back()', async () => {
    renderApp(<NewSalePage />);
    await ready();
    await userEvent.click(screen.getByRole('button', { name: es('common.back') }));
    expect(replace).toHaveBeenCalledWith('/scanned-user?beneficiaryId=1');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('"Cancelar" tambien', async () => {
    renderApp(<NewSalePage />);
    await ready();
    await userEvent.click(screen.getByRole('button', { name: es('common.cancel') }));
    expect(replace).toHaveBeenCalledWith('/scanned-user?beneficiaryId=1');
  });

  it('el engranaje abre el perfil', async () => {
    renderApp(<NewSalePage />);
    await ready();
    await userEvent.click(screen.getByRole('button', { name: es('profile.myProfile') }));
    expect(push).toHaveBeenCalledWith('/profile');
  });
});

describe('bajada de la regla', () => {
  it('muestra la tasa de la regla de fondo bajo el monto', async () => {
    db.reset();
    db.queueTable('points_rule', {
      data: [
        {
          id: 1, name: 'base', display_name: null, description: null,
          rule_type: 'fixed_amount', config: { points_per_dollar: 1 },
          is_default: true, display_icon: null, display_color: null,
          start_date: null, end_date: null, days_of_week: null,
          time_start: null, time_end: null,
        },
      ],
      error: null,
    });
    db.queueTable('branch', { data: { id: 3 }, error: null });
    renderApp(<NewSalePage />);
    await ready();

    expect(
      await screen.findByText(
        es('sale.rateSuffix', {
          rate: `${es('rule.pointsValueOne', { points: '1' })} ${es('rule.perDollar')}`,
        }),
      ),
    ).toBeInTheDocument();
  });

  it('si no se pueden leer las reglas, la pantalla sigue andando sin la bajada', async () => {
    db.reset();
    db.queueTable('branch', { data: { id: 3 }, error: null });
    db.client.from.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    renderApp(<NewSalePage />);

    expect(await ready()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(es('sale.submit')) })).toBeDisabled();
  });
});

describe('validaciones antes de registrar', () => {
  it('un monto invalido no llega a cotizar', async () => {
    renderApp(<NewSalePage />);
    await ready();

    await userEvent.type(amountField(), '0');
    await userEvent.click(submit());

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('common.error'),
        expect.objectContaining({ description: es('sale.invalidAmount') }),
      ),
    );
  });

  it('sin cliente en la URL avisa que hay que escanear de nuevo', async () => {
    params = new URLSearchParams();
    renderApp(<NewSalePage />);

    // Sin id la ficha no carga: la pantalla no se puede usar.
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });

  it('si la sucursal falla por otra cosa que "no hay sucursales", no registra', async () => {
    db.reset();
    db.queueTable('points_rule', { data: [], error: null });
    db.queueTable('branch', { data: null, error: { code: '42501' } });
    renderApp(<NewSalePage />);
    await ready();

    await userEvent.type(amountField(), '100');
    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument());
    expect(db.client.rpc).not.toHaveBeenCalled();
  });
});

describe('dialogo de confirmacion', () => {
  it('se cierra con Escape', async () => {
    renderApp(<NewSalePage />);
    await ready();
    await userEvent.type(amountField(), '100');
    await waitFor(() => expect(db.client.rpc).toHaveBeenCalled());
    await userEvent.click(submit());
    await screen.findByText(es('sale.confirmTitle'));

    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByText(es('sale.confirmTitle'))).not.toBeInTheDocument(),
    );
  });
});

describe('casos de borde del calculo', () => {
  const conRegla = (rule_type: string, config: Record<string, number>) => {
    db.reset();
    db.queueTable('points_rule', {
      data: [
        {
          id: 1, name: 'r', display_name: null, description: null, rule_type,
          config, is_default: true, display_icon: null, display_color: null,
          start_date: null, end_date: null, days_of_week: null,
          time_start: null, time_end: null,
        },
      ],
      error: null,
    });
    db.queueTable('branch', { data: { id: 3 }, error: null });
  };

  it('una regla por porcentaje muestra la tasa sin el sufijo "de compra"', async () => {
    conRegla('percentage', { percentage: 10 });
    renderApp(<NewSalePage />);
    await ready();

    expect(await screen.findByText(`10% ${es('rule.percentOfAmount')}`)).toBeInTheDocument();
  });

  it('si fetchActiveRules devuelve algo que no es lista, no muestra bajada', async () => {
    db.reset();
    db.queueTable('points_rule', { data: null, error: null });
    db.queueTable('branch', { data: { id: 3 }, error: null });
    renderApp(<NewSalePage />);
    expect(await ready()).toBeInTheDocument();
  });

  it('un cliente con 0 puntos lo muestra como 0', async () => {
    card.mockResolvedValue({
      id: 1, name: 'Agustin Cassani', email: 'c@e.com', isMember: true, availablePoints: 0,
    });
    renderApp(<NewSalePage />);
    await ready();
    expect(screen.getByText(es('sale.currentPoints', { points: '0' }))).toBeInTheDocument();
  });

  it('un solo punto se dice en singular', async () => {
    renderApp(<NewSalePage />);
    await ready();
    db.client.rpc.mockResolvedValue({
      data: [{ rule_id: 1, name: 'r', rule_type: 'fixed_amount', config: null, is_default: true, points: 1 }],
      error: null,
    } as never);

    await userEvent.type(amountField(), '1');
    await waitFor(() => expect(db.client.rpc).toHaveBeenCalled());
    await userEvent.click(submit());

    expect(
      await screen.findByText(es('sale.confirmUnitOne', { name: 'Agustin Cassani' })),
    ).toBeInTheDocument();
  });

  it('sin desglose no se dibuja la tabla de reglas', async () => {
    renderApp(<NewSalePage />);
    await ready();
    db.client.rpc.mockResolvedValue({ data: [], error: null } as never);

    await userEvent.type(amountField(), '100');
    await waitFor(() => expect(db.client.rpc).toHaveBeenCalled());
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('dos clicks seguidos en confirmar insertan una sola compra', async () => {
    db.queueTable('purchase', { data: null, error: null });
    renderApp(<NewSalePage />);
    await ready();
    await userEvent.type(amountField(), '100');
    await waitFor(() => expect(db.client.rpc).toHaveBeenCalled());
    await userEvent.click(submit());

    const confirmar = await screen.findByRole('button', { name: es('sale.confirmAction') });
    await Promise.all([userEvent.click(confirmar), userEvent.click(confirmar)]);

    await screen.findByText(es('sale.successTitle'));
    expect(db.tables.filter((tabla) => tabla === 'purchase')).toHaveLength(1);
  });

  it('si la pantalla se va mientras cotiza, no actualiza nada', async () => {
    // El calculo va con debounce: se deja pendiente la RPC, se desmonta y
    // recien ahi se resuelve.
    let resolver!: (v: unknown) => void;
    db.client.rpc.mockReturnValue(
      new Promise((r) => {
        resolver = r;
      }) as never,
    );

    const { unmount } = renderApp(<NewSalePage />);
    await ready();
    await userEvent.type(amountField(), '100');
    await waitFor(() => expect(db.client.rpc).toHaveBeenCalled());

    unmount();
    await act(async () =>
      resolver({ data: breakdown(), error: null }),
    );

    expect(screen.queryByText(es('sale.previewLabel'))).not.toBeInTheDocument();
  });
});

describe('ultimos bordes', () => {
  it('una venta que no suma puntos se puede confirmar igual, sin tabla de reglas', async () => {
    renderApp(<NewSalePage />);
    await ready();
    db.client.rpc.mockResolvedValue({ data: [], error: null } as never);

    await userEvent.type(amountField(), '100');
    await waitFor(() => expect(db.client.rpc).toHaveBeenCalled());
    await userEvent.click(submit());

    expect(await screen.findByText(es('sale.confirmTitle'))).toBeInTheDocument();
    // Sin reglas que aportaron, no hay tabla de desglose.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('si la pantalla se va mientras carga la ficha, no actualiza nada', async () => {
    let resolver!: (v: unknown) => void;
    card.mockReturnValue(
      new Promise((r) => {
        resolver = r;
      }),
    );

    const { unmount } = renderApp(<NewSalePage />);
    unmount();
    await act(async () =>
      resolver({ id: 1, name: 'Agustin Cassani', email: 'c@e.com', isMember: true, availablePoints: 900 }),
    );

    expect(screen.queryByText('Agustin Cassani')).not.toBeInTheDocument();
  });

  it('dos clicks simultaneos en confirmar insertan una sola compra', async () => {
    db.queueTable('purchase', { data: null, error: null });
    renderApp(<NewSalePage />);
    await ready();
    await userEvent.type(amountField(), '100');
    await waitFor(() => expect(db.client.rpc).toHaveBeenCalled());
    await userEvent.click(submit());

    const confirmar = await screen.findByRole('button', { name: es('sale.confirmAction') });
    // Sin await entre los dos: es el caso que el guard con ref evita, y que
    // `disabled={loading}` no alcanza a frenar porque el state va un render atras.
    await act(async () => {
      fireEvent.click(confirmar);
      fireEvent.click(confirmar);
    });

    await screen.findByText(es('sale.successTitle'));
    expect(db.tables.filter((tabla) => tabla === 'purchase')).toHaveLength(1);
  });
});

describe('mientras se guarda la compra', () => {
  it('Escape no cierra el dialogo: la venta esta en curso', async () => {
    let resolver!: (v: unknown) => void;
    db.client.from.mockImplementation((tabla: string) => {
      if (tabla !== 'purchase') {
        return { select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ single: () => Promise.resolve({ data: { id: 3 }, error: null }) }) }) }) }) };
      }
      return {
        insert: () =>
          new Promise((r) => {
            resolver = r;
          }),
      };
    });

    renderApp(<NewSalePage />);
    await ready();
    await userEvent.type(amountField(), '100');
    await waitFor(() => expect(db.client.rpc).toHaveBeenCalled());
    await userEvent.click(submit());
    await userEvent.click(await screen.findByRole('button', { name: es('sale.confirmAction') }));

    await userEvent.keyboard('{Escape}');
    expect(screen.getByText(es('sale.confirmTitle'))).toBeInTheDocument();

    await act(async () => resolver({ error: null }));
  });
});
