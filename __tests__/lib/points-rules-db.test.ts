import { createSupabaseMock } from '../_helpers/supabase';

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

import { explainPoints, fetchActiveRules } from '@/lib/points-rules';

beforeEach(() => db.reset());

describe('fetchActiveRules', () => {
  it('trae las reglas activas de la organizacion', async () => {
    db.queue({ data: [{ id: 1 }], error: null });
    await expect(fetchActiveRules('7')).resolves.toEqual([{ id: 1 }]);
    expect(db.tables).toEqual(['points_rule']);
  });

  it('sin organizacion no consulta nada', async () => {
    await expect(fetchActiveRules(null)).resolves.toEqual([]);
    await expect(fetchActiveRules(undefined)).resolves.toEqual([]);
    expect(db.tables).toEqual([]);
  });

  it('devuelve lista vacia si la consulta no trae datos', async () => {
    db.queue({ data: null, error: null });
    await expect(fetchActiveRules('7')).resolves.toEqual([]);
  });
});

describe('explainPoints', () => {
  it('devuelve el desglose que calcula la base', async () => {
    const rows = [
      { rule_id: 1, name: 'madre', rule_type: 'fixed_amount', config: null, is_default: true, points: 100 },
    ];
    db.queue({ data: rows, error: null });
    await expect(explainPoints(100, '7', 3)).resolves.toEqual(rows);
    expect(db.client.rpc).toHaveBeenCalledWith(
      'explain_points_for_amount',
      expect.objectContaining({
        p_amount: 100,
        p_organization_id: 7,
        p_branch_id: 3,
        p_category_id: null,
      }),
    );
  });

  it('manda la organizacion en null si no hay', async () => {
    db.queue({ data: [], error: null });
    await explainPoints(100, null, null);
    expect(db.client.rpc).toHaveBeenCalledWith(
      'explain_points_for_amount',
      expect.objectContaining({ p_organization_id: null }),
    );
  });

  it('devuelve null si la RPC falla, para que la pantalla no invente puntos', async () => {
    db.queue({ data: null, error: { message: 'boom' } });
    await expect(explainPoints(100, '7', null)).resolves.toBeNull();
  });

  it('devuelve lista vacia si la RPC no trae filas', async () => {
    db.queue({ data: null, error: null });
    await expect(explainPoints(100, '7', null)).resolves.toEqual([]);
  });
});
