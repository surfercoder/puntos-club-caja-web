import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { es, renderApp } from '../../_helpers/render';
import { createSupabaseMock } from '../../_helpers/supabase';

const replace = jest.fn();
const router = { replace, push: jest.fn(), back: jest.fn(), prefetch: jest.fn() };
let params = new URLSearchParams();
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

const confirmMock = jest.fn();
jest.mock('@/lib/confirm', () => ({
  confirm: (...a: unknown[]) => confirmMock(...a),
}));

const notifyAdmin = jest.fn();
jest.mock('@/lib/notify-admin', () => ({
  notifyAdmin: (...a: unknown[]) => notifyAdmin(...a),
}));

let orgId: string | null = '7';
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ appUser: { organization_id: orgId } }),
}));

import PendingDeliveriesPage from '@/app/(app)/pending-deliveries/page';
import { notify as notifyModule } from '@/lib/notify';

const notify = jest.mocked(notifyModule);

const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  beneficiary_id: 10,
  product_id: 20,
  points_used: 100,
  status: 'pending',
  requested_at: '2026-09-16T10:52:23.000Z',
  delivered_at: null,
  cancelled_at: null,
  beneficiary: { first_name: 'Javier', last_name: 'Schmidt', email: 'j@e.com' },
  product: { name: 'Churros pasteleros' },
  ...over,
});

const rows = (...list: unknown[]) => db.queueTable('redemption', { data: list, error: null });

beforeEach(() => {
  jest.clearAllMocks();
  db.reset();
  params = new URLSearchParams();
  orgId = '7';
  confirmMock.mockResolvedValue(true);
});

describe('listado', () => {
  it('muestra los pendientes con su producto, cliente y puntos', async () => {
    rows(row());
    renderApp(<PendingDeliveriesPage />);

    expect(await screen.findByText('Churros pasteleros')).toBeInTheDocument();
    expect(screen.getByText('Javier Schmidt')).toBeInTheDocument();
    expect(screen.getByText('100 pts')).toBeInTheDocument();
  });

  it('separa las tres pestanas y cuenta cada una', async () => {
    rows(
      row({ id: 1 }),
      row({ id: 2, status: 'delivered', delivered_at: '2026-09-16T11:00:00.000Z' }),
      row({ id: 3, status: 'cancelled', cancelled_at: '2026-09-16T12:00:00.000Z' }),
    );
    renderApp(<PendingDeliveriesPage />);

    // Las pestanas existen desde el primer render: hay que esperar los datos.
    await screen.findByText('Churros pasteleros');
    const pendientes = screen.getByRole('button', {
      name: new RegExp(es('redemptions.tabPending')),
    });
    expect(pendientes).toHaveAttribute('aria-pressed', 'true');
    // Cada pestana lleva su contador al lado del nombre.
    expect(pendientes).toHaveTextContent(new RegExp(`${es('redemptions.tabPending')}\\s*1`));
    expect(
      screen.getByRole('button', { name: new RegExp(es('redemptions.tabDelivered')) }),
    ).toHaveTextContent(new RegExp(`${es('redemptions.tabDelivered')}\\s*1`));
    expect(
      screen.getByRole('button', { name: new RegExp(es('redemptions.tabCancelled')) }),
    ).toHaveTextContent(new RegExp(`${es('redemptions.tabCancelled')}\\s*1`));
  });

  it('un canje sin producto cargado no rompe la fila', async () => {
    rows(row({ product: null, beneficiary: null }));
    renderApp(<PendingDeliveriesPage />);
    expect(await screen.findByText(es('redemptions.product'))).toBeInTheDocument();
  });

  it('sin canjes muestra el vacio de la pestana', async () => {
    rows();
    renderApp(<PendingDeliveriesPage />);
    expect(await screen.findByText(es('redemptions.pendingEmptyTitle'))).toBeInTheDocument();
  });
});

describe('pestanas', () => {
  it('la home entra directo a Entregados con ?tab=delivered', async () => {
    params = new URLSearchParams('tab=delivered');
    rows(row({ id: 2, status: 'delivered', delivered_at: '2026-09-16T11:00:00.000Z' }));
    renderApp(<PendingDeliveriesPage />);

    expect(await screen.findByText(es('redemptions.deliveredTitle'))).toBeInTheDocument();
  });

  it('tambien a Cancelados', async () => {
    params = new URLSearchParams('tab=cancelled');
    rows();
    renderApp(<PendingDeliveriesPage />);
    expect(await screen.findByText(es('redemptions.cancelledEmptyTitle'))).toBeInTheDocument();
  });

  it('un tab desconocido cae en Pendientes', async () => {
    params = new URLSearchParams('tab=cualquiera');
    rows();
    renderApp(<PendingDeliveriesPage />);
    expect(await screen.findByText(es('redemptions.pendingEmptyTitle'))).toBeInTheDocument();
  });

  it('se puede cambiar de pestana a mano', async () => {
    rows(row({ id: 2, status: 'delivered', delivered_at: '2026-09-16T11:00:00.000Z' }));
    renderApp(<PendingDeliveriesPage />);
    await screen.findByText(es('redemptions.pendingEmptyTitle'));

    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(es('redemptions.tabDelivered')) }),
    );
    expect(screen.getByText(es('redemptions.deliveredTitle'))).toBeInTheDocument();
  });
});

describe('entregar', () => {
  it('llama a la RPC y avisa al admin para que mande el push', async () => {
    rows(row());
    db.client.rpc.mockResolvedValue({ data: null, error: null } as never);
    renderApp(<PendingDeliveriesPage />);

    await userEvent.click(await screen.findByRole('button', { name: new RegExp(es('redemptions.deliver')) }));

    await waitFor(() =>
      expect(db.client.rpc).toHaveBeenCalledWith('deliver_redemption', { p_redemption_id: 1 }),
    );
    expect(notifyAdmin).toHaveBeenCalledWith('/api/redemption/notify', { redemptionId: 1 });
  });

  it('si la RPC falla avisa y no notifica al admin', async () => {
    rows(row());
    db.client.rpc.mockResolvedValue({ data: null, error: { message: 'OUT_OF_STOCK' } } as never);
    renderApp(<PendingDeliveriesPage />);

    await userEvent.click(await screen.findByRole('button', { name: new RegExp(es('redemptions.deliver')) }));

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('redemptions.deliverFailed'),
        expect.objectContaining({ description: es('error.rpc.outOfStock') }),
      ),
    );
    expect(notifyAdmin).not.toHaveBeenCalled();
  });
});

describe('cancelar', () => {
  it('pide confirmacion y manda el motivo siempre en espanol', async () => {
    rows(row());
    db.client.rpc.mockResolvedValue({ data: null, error: null } as never);
    renderApp(<PendingDeliveriesPage />, { lang: 'en' });

    await screen.findByText('Churros pasteleros');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(db.client.rpc).toHaveBeenCalledWith('cancel_redemption', {
        p_redemption_id: 1,
        // El motivo lo leen el admin y la app del beneficiario.
        p_reason: 'Cancelado por cajero',
      }),
    );
  });

  it('si el cajero dice que no, no cancela nada', async () => {
    confirmMock.mockResolvedValue(false);
    rows(row());
    renderApp(<PendingDeliveriesPage />);

    await userEvent.click(await screen.findByRole('button', { name: new RegExp(es('redemptions.cancel')) }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(db.client.rpc).not.toHaveBeenCalled();
  });

  it('un fallo de cancelacion sale traducido', async () => {
    rows(row());
    db.client.rpc.mockResolvedValue({ data: null, error: { message: 'REDEMPTION_NOT_PENDING' } } as never);
    renderApp(<PendingDeliveriesPage />);

    await userEvent.click(await screen.findByRole('button', { name: new RegExp(es('redemptions.cancel')) }));
    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('redemptions.cancelFailed'),
        expect.objectContaining({ description: es('error.rpc.notPending') }),
      ),
    );
  });
});

describe('aviso superior', () => {
  it('se puede cerrar', async () => {
    rows(row());
    renderApp(<PendingDeliveriesPage />);
    await screen.findByText('Churros pasteleros');

    await userEvent.click(screen.getByRole('button', { name: es('redemptions.dismissBanner') }));
    expect(screen.queryByRole('button', { name: es('redemptions.dismissBanner') })).not.toBeInTheDocument();
  });
});

describe('tiempo real', () => {
  it('se suscribe a los canjes de la organizacion y se desuscribe al salir', async () => {
    rows(row());
    const { unmount } = renderApp(<PendingDeliveriesPage />);
    await screen.findByText('Churros pasteleros');

    expect(db.client.channel).toHaveBeenCalledWith('cashier-redemptions-7');
    unmount();
    expect(db.channel.unsubscribe).toHaveBeenCalled();
    expect(db.client.removeChannel).toHaveBeenCalled();
  });
});

describe('navegacion', () => {
  it('la flecha vuelve a la home', async () => {
    rows();
    renderApp(<PendingDeliveriesPage />);
    await screen.findByText(es('redemptions.pendingEmptyTitle'));
    await userEvent.click(screen.getByRole('button', { name: es('common.back') }));
    expect(replace).toHaveBeenCalledWith('/');
  });
});

describe('detalles', () => {
  it('muestra la fecha de cancelacion en la pestana de cancelados', async () => {
    params = new URLSearchParams('tab=cancelled');
    rows(row({ id: 3, status: 'cancelled', cancelled_at: '2026-09-16T12:00:00.000Z' }));
    renderApp(<PendingDeliveriesPage />);

    expect(await screen.findByText(es('redemptions.cancelledTitle'))).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(es('redemptions.cancelledAt', { date: '' }).trim())),
    ).toBeInTheDocument();
  });

  it('un canje nuevo en tiempo real refresca la lista', async () => {
    rows(row());
    renderApp(<PendingDeliveriesPage />);
    await screen.findByText('Churros pasteleros');

    db.queueTable('redemption', {
      data: [row({ id: 9, product: { name: 'Medialunas' } })],
      error: null,
    });
    const onChange = db.channel.on.mock.calls[0][2] as () => void;
    await act(async () => onChange());

    expect(await screen.findByText('Medialunas')).toBeInTheDocument();
  });

  it('sin organizacion no consulta ni se suscribe', async () => {
    orgId = null;
    renderApp(<PendingDeliveriesPage />);
    await waitFor(() => expect(db.client.channel).not.toHaveBeenCalled());
    expect(db.tables).toEqual([]);
    orgId = '7';
  });
});

describe('nombre del cliente', () => {
  it('sin nombre cae al email', async () => {
    rows(row({ beneficiary: { first_name: null, last_name: null, email: 'j@e.com' } }));
    renderApp(<PendingDeliveriesPage />);
    expect(await screen.findByText('j@e.com')).toBeInTheDocument();
  });

  it('sin nombre ni email dice "cliente"', async () => {
    rows(row({ beneficiary: { first_name: null, last_name: null, email: null } }));
    renderApp(<PendingDeliveriesPage />);
    expect(await screen.findByText(es('common.client'))).toBeInTheDocument();
  });

  it('un entregado sin fecha de entrega usa la de solicitud', async () => {
    params = new URLSearchParams('tab=delivered');
    rows(row({ id: 2, status: 'delivered', delivered_at: null }));
    renderApp(<PendingDeliveriesPage />);
    expect(await screen.findByText(es('redemptions.deliveredTitle'))).toBeInTheDocument();
  });

  it('un cancelado sin fecha de cancelacion tambien', async () => {
    params = new URLSearchParams('tab=cancelled');
    rows(row({ id: 3, status: 'cancelled', cancelled_at: null }));
    renderApp(<PendingDeliveriesPage />);
    expect(await screen.findByText(es('redemptions.cancelledTitle'))).toBeInTheDocument();
  });
});

describe('desmontar a mitad de la carga', () => {
  it('no toca el estado si la pantalla ya se fue', async () => {
    let resolver!: (v: unknown) => void;
    db.client.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          in: () => ({
            order: () =>
              new Promise((r) => {
                resolver = r;
              }),
          }),
        }),
      }),
    } as never);

    const { unmount } = renderApp(<PendingDeliveriesPage />);
    unmount();
    await act(async () => resolver({ data: [row()], error: null }));

    expect(screen.queryByText('Churros pasteleros')).not.toBeInTheDocument();
  });
});
