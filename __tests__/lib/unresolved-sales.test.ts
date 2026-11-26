import { UNRESOLVED_TTL_MS, unresolvedSales, type PendingSale } from '@/lib/unresolved-sales';

const sale = { requestId: 'k1', points: 10, amount: 100 } as PendingSale;

describe('unresolvedSales', () => {
  let now = 1_000_000;
  beforeEach(() => {
    unresolvedSales.clear();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });
  afterEach(() => jest.restoreAllMocks());

  it('dentro de los 5 minutos la misma venta es un reintento', () => {
    unresolvedSales.set('a', sale);
    now += UNRESOLVED_TTL_MS;
    expect(unresolvedSales.get('a')).toBe(sale);
    expect(unresolvedSales.has('a')).toBe(true);
  });

  it('pasados los 5 minutos una venta identica es nueva', () => {
    unresolvedSales.set('a', sale);
    now += UNRESOLVED_TTL_MS + 1;
    expect(unresolvedSales.has('a')).toBe(false);
    expect(unresolvedSales.get('a')).toBeUndefined();
  });

  it('cada intento renueva el plazo y delete la olvida', () => {
    unresolvedSales.set('a', sale);
    now += UNRESOLVED_TTL_MS - 1;
    const attempt = unresolvedSales.set('a', sale);
    now += UNRESOLVED_TTL_MS - 1;
    expect(unresolvedSales.get('a')).toBe(sale);
    unresolvedSales.delete('a', attempt);
    expect(unresolvedSales.get('a')).toBeUndefined();
  });

  it('el exito tardio de un intento viejo no borra el reintento', () => {
    const old = unresolvedSales.set('a', sale);
    unresolvedSales.set('a', sale);
    unresolvedSales.delete('a', old);
    expect(unresolvedSales.get('a')).toBe(sale);
  });
});
