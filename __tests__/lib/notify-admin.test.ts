import { createSupabaseMock } from '../_helpers/supabase';

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

import { notifyAdmin } from '@/lib/notify-admin';

const withSession = (token: string | null) =>
  db.client.auth.getSession.mockResolvedValue({
    data: { session: token ? { access_token: token } : null },
  } as never);

beforeEach(() => {
  db.reset();
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as never;
});

describe('notifyAdmin', () => {
  it('le pega al admin con el token del cajero', async () => {
    withSession('token-123');
    await notifyAdmin('/api/purchase/notify', { beneficiaryId: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/purchase/notify',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
        body: JSON.stringify({ beneficiaryId: 1 }),
      }),
    );
  });

  it('no hace nada sin sesion', async () => {
    withSession(null);
    await notifyAdmin('/api/purchase/notify', {});
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('se traga el error: la venta ya quedo guardada y un push caido no la voltea', async () => {
    withSession('token-123');
    (global.fetch as jest.Mock).mockRejectedValue(new Error('sin red'));
    await expect(notifyAdmin('/api/purchase/notify', {})).resolves.toBeUndefined();
  });

  it('tampoco explota si getSession falla', async () => {
    db.client.auth.getSession.mockRejectedValue(new Error('boom') as never);
    await expect(notifyAdmin('/api/purchase/notify', {})).resolves.toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('sin la url del admin configurada', () => {
  it('no intenta notificar', async () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;

    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/client', () => ({ supabase: db.client }));
      const { notifyAdmin: fresh } = await import('@/lib/notify-admin');
      withSession('token-123');
      await fresh('/api/purchase/notify', {});
    });

    expect(global.fetch).not.toHaveBeenCalled();
    process.env.NEXT_PUBLIC_SITE_URL = previous;
  });
});
