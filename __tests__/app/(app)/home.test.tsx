import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { es, renderApp } from '../../_helpers/render';
import { createSupabaseMock } from '../../_helpers/supabase';

const replace = jest.fn();
const push = jest.fn();
const router = { replace, push, back: jest.fn(), prefetch: jest.fn() };
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

const fetchActiveRules = jest.fn();
jest.mock('@/lib/points-rules', () => ({
  ...jest.requireActual('@/lib/points-rules'),
  fetchActiveRules: (...a: unknown[]) => fetchActiveRules(...a),
}));

const signOut = jest.fn();
let appUser: Record<string, unknown> | null = {
  id: '5',
  organization_id: '7',
  first_name: 'Agustin',
  last_name: 'Cassani',
  email: 'cajero@puntosclub.com.ar',
  active: true,
  organization: { name: 'Churrico' },
};
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ appUser, signOut }),
}));

import HomePage from '@/app/(app)/page';
import { notify as notifyModule } from '@/lib/notify';
import type { PointsRule } from '@/lib/points-rules';

const notify = jest.mocked(notifyModule);

const rule = (over: Partial<PointsRule> = {}): PointsRule => ({
  id: 1, name: 'r', display_name: null, description: null,
  rule_type: 'fixed_amount', config: { points_per_dollar: 1 }, is_default: true,
  display_icon: null, display_color: null, start_date: null, end_date: null,
  days_of_week: null, time_start: null, time_end: null, ...over,
});

const futuro = () => String(new Date().getFullYear() + 2);
const pasado = () => String(new Date().getFullYear() - 2);

const pendientes = (count: number) =>
  db.queueTable('redemption', { data: null, error: null, count } as never);

beforeEach(() => {
  jest.clearAllMocks();
  db.reset();
  confirmMock.mockResolvedValue(true);
  signOut.mockResolvedValue(undefined);
  fetchActiveRules.mockResolvedValue([]);
  db.client.rpc.mockResolvedValue({ data: null, error: null } as never);
  appUser = {
    id: '5', organization_id: '7', first_name: 'Agustin', last_name: 'Cassani',
    email: 'cajero@puntosclub.com.ar', active: true,
    organization: { name: 'Churrico' },
  };
});

describe('encabezado', () => {
  it('saluda al cajero y muestra su organizacion', async () => {
    renderApp(<HomePage />);
    expect(screen.getByText(es('home.greeting', { name: 'Agustin' }))).toBeInTheDocument();
    expect(screen.getByText('Churrico')).toBeInTheDocument();
  });

  it('sin nombre cargado usa "cajero"', () => {
    appUser = { ...appUser, first_name: null, last_name: null };
    renderApp(<HomePage />);
    expect(
      screen.getByText(es('home.greeting', { name: es('common.cashier') })),
    ).toBeInTheDocument();
  });

  it('sin organizacion lo dice en vez de dejar el hueco', () => {
    appUser = { ...appUser, organization: null };
    renderApp(<HomePage />);
    expect(screen.getByText(es('common.noOrganization'))).toBeInTheDocument();
  });
});

describe('QR de la organizacion', () => {
  it('se abre en un modal con el id de la organizacion', async () => {
    renderApp(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: es('home.orgQrLabel') }));

    const qr = await screen.findByTestId('qr-code');
    expect(JSON.parse(qr.getAttribute('data-value')!)).toEqual({
      type: 'organization',
      id: '7',
      name: 'Churrico',
    });
  });

  it('se puede cerrar', async () => {
    renderApp(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: es('home.orgQrLabel') }));
    await screen.findByTestId('qr-code');

    await userEvent.click(screen.getByRole('button', { name: es('common.close') }));
    await waitFor(() => expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument());
  });

  it('sin organizacion no ofrece el QR', () => {
    appUser = { ...appUser, organization_id: null };
    renderApp(<HomePage />);
    expect(screen.queryByRole('button', { name: es('home.orgQrLabel') })).not.toBeInTheDocument();
  });
});

describe('canjes pendientes', () => {
  it('la campanita lleva a las entregas cuando hay pendientes', async () => {
    pendientes(2);
    renderApp(<HomePage />);

    const bell = await screen.findByRole('button', {
      name: new RegExp(es('home.notifications')),
    });
    await userEvent.click(bell);
    expect(push).toHaveBeenCalledWith('/pending-deliveries');
  });

  it('sin pendientes solo avisa, no navega', async () => {
    pendientes(0);
    renderApp(<HomePage />);

    await userEvent.click(screen.getByRole('button', { name: es('home.notifications') }));
    expect(push).not.toHaveBeenCalled();
    expect(notify.info).toHaveBeenCalledWith(
      es('home.notifications'),
      expect.objectContaining({ description: es('home.noPendingDeliveries') }),
    );
  });
});

describe('contador de reglas', () => {
  it('sin reglas lo dice', async () => {
    renderApp(<HomePage />);
    expect(await screen.findByText(es('home.rulesEmpty'))).toBeInTheDocument();
  });

  it('una campana vencida NO cuenta como aplicandose ahora', async () => {
    fetchActiveRules.mockResolvedValue([
      rule({ id: 1, is_default: true }),
      rule({ id: 2, is_default: false, start_date: `${pasado()}-06-21`, end_date: `${pasado()}-09-21` }),
    ]);
    renderApp(<HomePage />);

    await waitFor(() =>
      expect(
        screen.getByText(
          es('home.rulesSummary', {
            campaigns: es('plural.campaignMany', { count: 0 }),
            general: es('plural.generalRuleOne'),
          }),
        ),
      ).toBeInTheDocument(),
    );
  });

  it('una campana vigente si cuenta', async () => {
    fetchActiveRules.mockResolvedValue([
      rule({ id: 1, is_default: true }),
      rule({ id: 2, is_default: false, start_date: `${pasado()}-01-01`, end_date: `${futuro()}-12-31` }),
    ]);
    renderApp(<HomePage />);

    await waitFor(() =>
      expect(
        screen.getByText(
          es('home.rulesSummary', {
            campaigns: es('plural.campaignOne'),
            general: es('plural.generalRuleOne'),
          }),
        ),
      ).toBeInTheDocument(),
    );
  });
});

describe('accesos', () => {
  it.each([
    ['home.scanClient', '/scanner'],
    ['home.pendingDeliveries', '/pending-deliveries'],
    ['home.searchClient', '/search-beneficiary'],
  ] as const)('%s lleva a %s', async (key, destino) => {
    renderApp(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(es(key)) }));
    expect(push).toHaveBeenCalledWith(destino);
  });

  it('"Ver" abre las reglas', async () => {
    renderApp(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: es('home.rulesView') }));
    expect(push).toHaveBeenCalledWith('/points-rules');
  });

  it('"Historial de canjes" entra directo a la pestana de entregados', async () => {
    renderApp(<HomePage />);
    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(es('home.redemptionHistory')) }),
    );
    expect(push).toHaveBeenCalledWith('/pending-deliveries?tab=delivered');
  });

  it('"Editar" abre el perfil', async () => {
    renderApp(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(es('home.edit')) }));
    expect(push).toHaveBeenCalledWith('/profile');
  });
});

describe('ayuda', () => {
  it('con email del dueno abre un mailto', async () => {
    db.client.rpc.mockResolvedValue({ data: 'dueno@churrico.com', error: null } as never);
    renderApp(<HomePage />);

    const link = await screen.findByRole('link', { name: new RegExp(es('home.helpTitle')) });
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:dueno@churrico.com'));
  });

  it('sin email avisa en vez de ser un link muerto', async () => {
    renderApp(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(es('home.helpTitle')) }));

    expect(notify.error).toHaveBeenCalledWith(
      es('help.title'),
      expect.objectContaining({ description: es('help.noOwnerEmail') }),
    );
  });
});

describe('cerrar sesion', () => {
  it('pide confirmacion y sale al login', async () => {
    renderApp(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: es('signOut.action') }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(replace).toHaveBeenCalledWith('/sign-in');
  });

  it('si cancela no cierra nada', async () => {
    confirmMock.mockResolvedValue(false);
    renderApp(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: es('signOut.action') }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe('tiempo real', () => {
  it('se suscribe a los canjes y se limpia al salir', async () => {
    const { unmount } = renderApp(<HomePage />);
    await waitFor(() => expect(db.client.channel).toHaveBeenCalled());

    unmount();
    expect(db.channel.unsubscribe).toHaveBeenCalled();
    expect(db.client.removeChannel).toHaveBeenCalled();
  });

  it('sin organizacion no se suscribe ni consulta', async () => {
    appUser = { ...appUser, organization_id: null };
    renderApp(<HomePage />);
    await waitFor(() => expect(fetchActiveRules).toHaveBeenCalled());
    expect(db.client.channel).not.toHaveBeenCalled();
  });
});

describe('detalles', () => {
  it('el modal de QR se cierra con Escape', async () => {
    renderApp(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: es('home.orgQrLabel') }));
    await screen.findByTestId('qr-code');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument());
  });

  it('una cuenta desactivada se marca en rojo', () => {
    appUser = { ...appUser, active: false };
    renderApp(<HomePage />);
    expect(screen.getByText(es('common.inactive'))).toBeInTheDocument();
  });

  it('un canje nuevo en tiempo real actualiza el contador', async () => {
    pendientes(0);
    renderApp(<HomePage />);
    await waitFor(() => expect(db.channel.on).toHaveBeenCalled());

    pendientes(3);
    const onChange = db.channel.on.mock.calls[0][2] as () => void;
    await act(async () => onChange());

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: new RegExp(es('home.notifications')),
        }),
      ).toHaveTextContent('3'),
    );
  });
});

describe('badge de la campanita', () => {
  it('con mas de nueve pendientes muestra 9+', async () => {
    pendientes(12);
    renderApp(<HomePage />);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: new RegExp(es('home.notifications')) }),
      ).toHaveTextContent('9+'),
    );
  });
});

describe('reabrir el QR', () => {
  it('se puede cerrar con Escape y volver a abrir', async () => {
    renderApp(<HomePage />);
    const boton = screen.getByRole('button', { name: es('home.orgQrLabel') });

    await userEvent.click(boton);
    await screen.findByTestId('qr-code');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument());

    // El evento `close` de <dialog> no burbujea: si se escucha como prop de
    // React el modal queda montado y este segundo abrir no muestra nada.
    await userEvent.click(boton);
    expect(await screen.findByTestId('qr-code')).toBeInTheDocument();
  });
});

describe('bordes tras el refactor', () => {
  it('tocar el QR no cierra el modal: solo el backdrop', async () => {
    renderApp(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: es('home.orgQrLabel') }));
    const qr = await screen.findByTestId('qr-code');

    await userEvent.click(qr);
    expect(screen.getByTestId('qr-code')).toBeInTheDocument();
  });

  it('tocar fuera del cuadro si lo cierra', async () => {
    renderApp(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: es('home.orgQrLabel') }));
    await screen.findByTestId('qr-code');

    // El click en el ::backdrop llega al propio <dialog>.
    const dialog = document.querySelector('dialog')!;
    await act(async () => {
      dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await waitFor(() => expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument());
  });

  it('sin app_user la tarjeta del cajero no rompe', () => {
    appUser = null;
    renderApp(<HomePage />);
    expect(screen.getByText(es('common.cashier'))).toBeInTheDocument();
  });

  it('si la pantalla se va antes de saber el mail del dueno, no actualiza nada', async () => {
    let resolver!: (v: unknown) => void;
    db.client.rpc.mockReturnValue(
      new Promise((r) => {
        resolver = r;
      }) as never,
    );

    const { unmount } = renderApp(<HomePage />);
    unmount();
    await act(async () => resolver({ data: 'dueno@churrico.com', error: null }));

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
