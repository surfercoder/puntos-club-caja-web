import { createSupabaseMock } from '../_helpers/supabase';

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

import { loadBeneficiaryCard } from '@/lib/beneficiary';

beforeEach(() => db.reset());

const beneficiario = {
  id: 1,
  email: 'cliente@ejemplo.com',
  first_name: 'Agustin',
  last_name: 'Cassani',
};

describe('loadBeneficiaryCard', () => {
  it('arma la ficha de un miembro', async () => {
    db.queue(
      { data: beneficiario, error: null },
      { data: { available_points: 900, is_active: true }, error: null },
    );

    await expect(loadBeneficiaryCard('1', '7')).resolves.toEqual({
      id: 1,
      name: 'Agustin Cassani',
      email: 'cliente@ejemplo.com',
      isMember: true,
      availablePoints: 900,
    });
    expect(db.tables).toEqual(['beneficiary', 'beneficiary_organization']);
  });

  it('sin fila de membresia el cliente existe pero no es miembro', async () => {
    db.queue(
      { data: beneficiario, error: null },
      { data: null, error: { code: 'PGRST116' } },
    );

    await expect(loadBeneficiaryCard('1', '7')).resolves.toMatchObject({
      isMember: false,
      availablePoints: 0,
    });
  });

  it('una membresia dada de baja tampoco es miembro', async () => {
    db.queue(
      { data: beneficiario, error: null },
      { data: { available_points: 50, is_active: false }, error: null },
    );

    await expect(loadBeneficiaryCard('1', '7')).resolves.toMatchObject({
      isMember: false,
    });
  });

  it('completa el nombre con lo que haya', async () => {
    db.queue(
      { data: { ...beneficiario, last_name: null }, error: null },
      { data: null, error: null },
    );
    await expect(loadBeneficiaryCard('1', '7')).resolves.toMatchObject({
      name: 'Agustin',
    });
  });

  it('tolera un beneficiario sin email ni nombre', async () => {
    db.queue(
      { data: { id: 1, email: null, first_name: null, last_name: null }, error: null },
      { data: null, error: null },
    );
    await expect(loadBeneficiaryCard('1', '7')).resolves.toMatchObject({
      name: '',
      email: '',
    });
  });

  it('devuelve null si el cliente no existe', async () => {
    db.queue({ data: null, error: { code: 'PGRST116' } });
    await expect(loadBeneficiaryCard('999', '7')).resolves.toBeNull();
  });

  it.each([
    ['sin id', undefined, '7'],
    ['id vacio', '', '7'],
    ['sin organizacion', '1', undefined],
    ['id que no es un numero', 'abc', '7'],
  ])('%s devuelve null sin pegarle a la base', async (_label, id, org) => {
    await expect(loadBeneficiaryCard(id, org)).resolves.toBeNull();
    expect(db.tables).toEqual([]);
  });
});
