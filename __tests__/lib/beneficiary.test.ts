import { createSupabaseMock } from '../_helpers/supabase';

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

import { findBeneficiary, loadBeneficiaryCard } from '@/lib/beneficiary';

const signedInAs = (id: string | null) =>
  db.client.auth.getSession.mockResolvedValue({
    data: { session: id ? { user: { id } } : null },
  } as never);

beforeEach(() => {
  db.reset();
  sessionStorage.clear();
  signedInAs('cajero-a');
});

const beneficiario = {
  id: 1,
  email: 'cliente@ejemplo.com',
  first_name: 'Agustin',
  last_name: 'Cassani',
};

describe('loadBeneficiaryCard', () => {
  it('arma la ficha de un miembro', async () => {
    db.queue(
      { data: [beneficiario], error: null },
      { data: { available_points: 900, is_active: true }, error: null },
    );

    await expect(loadBeneficiaryCard('1', '7')).resolves.toEqual({
      id: 1,
      name: 'Agustin Cassani',
      email: 'cliente@ejemplo.com',
      isMember: true,
      availablePoints: 900,
    });
    expect(db.tables).toEqual(['beneficiary_organization']);
    expect(db.client.rpc).toHaveBeenCalledWith('cashier_find_beneficiary', {
      p_email: null,
      p_document_id: null,
      p_id: 1,
    });
  });

  it('sin fila de membresia el cliente existe pero no es miembro', async () => {
    db.queue(
      { data: [beneficiario], error: null },
      { data: null, error: { code: 'PGRST116' } },
    );

    await expect(loadBeneficiaryCard('1', '7')).resolves.toMatchObject({
      isMember: false,
      availablePoints: 0,
    });
  });

  it('una membresia dada de baja tampoco es miembro', async () => {
    db.queue(
      { data: [beneficiario], error: null },
      { data: { available_points: 50, is_active: false }, error: null },
    );

    await expect(loadBeneficiaryCard('1', '7')).resolves.toMatchObject({
      isMember: false,
    });
  });

  it('completa el nombre con lo que haya', async () => {
    db.queue(
      { data: [{ ...beneficiario, last_name: null }], error: null },
      { data: null, error: null },
    );
    await expect(loadBeneficiaryCard('1', '7')).resolves.toMatchObject({
      name: 'Agustin',
    });
  });

  it('tolera un beneficiario sin email ni nombre', async () => {
    db.queue(
      { data: [{ id: 1, email: null, first_name: null, last_name: null }], error: null },
      { data: null, error: null },
    );
    await expect(loadBeneficiaryCard('1', '7')).resolves.toMatchObject({
      name: '',
      email: '',
    });
  });

  it('devuelve null si el cliente no existe o no es socio', async () => {
    db.queue({ data: [], error: null });
    await expect(loadBeneficiaryCard('999', '7')).resolves.toBeNull();
  });

  it('devuelve null si la RPC falla', async () => {
    db.queue({ data: null, error: { message: 'boom' } });
    await expect(loadBeneficiaryCard('1', '7')).resolves.toBeNull();
  });

  it('usa lo que encontro la busqueda sin volver a pedirlo por id', async () => {
    db.queue({ data: [beneficiario], error: null });
    await findBeneficiary({ email: 'cliente@ejemplo.com' });
    db.client.rpc.mockClear();

    db.queue({ data: null, error: null });
    await expect(loadBeneficiaryCard('1', '7')).resolves.toMatchObject({
      name: 'Agustin Cassani',
      isMember: false,
    });
    expect(db.client.rpc).not.toHaveBeenCalled();
  });

  it('lo recordado de otro cliente no sirve', async () => {
    db.queue({ data: [beneficiario], error: null });
    await findBeneficiary({ email: 'cliente@ejemplo.com' });

    db.queue({ data: [], error: null });
    await expect(loadBeneficiaryCard('2', '7')).resolves.toBeNull();
  });

  it('otro cajero en la misma pestaña no hereda lo recordado', async () => {
    db.queue({ data: [beneficiario], error: null });
    await findBeneficiary({ email: 'cliente@ejemplo.com' });

    signedInAs('cajero-b');
    db.queue({ data: [], error: null });
    await expect(loadBeneficiaryCard('1', '7')).resolves.toBeNull();
  });

  it('una busqueda en vuelo queda a nombre de quien la pidio', async () => {
    db.queue({ data: [beneficiario], error: null });
    const pending = findBeneficiary({ email: 'cliente@ejemplo.com' });
    signedInAs(null);
    await pending;

    signedInAs('cajero-b');
    db.queue({ data: [], error: null });
    await expect(loadBeneficiaryCard('1', '7')).resolves.toBeNull();
  });

  it('sin sesion no recuerda nada', async () => {
    signedInAs(null);
    db.queue({ data: [beneficiario], error: null });
    await findBeneficiary({ email: 'cliente@ejemplo.com' });
    expect(sessionStorage.getItem('caja:found-beneficiary')).toBeNull();

    db.queue({ data: [], error: null });
    await expect(loadBeneficiaryCard('1', '7')).resolves.toBeNull();
  });

  it('sin storage disponible busca por id igual', async () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    db.queue({ data: [beneficiario], error: null }, { data: null, error: null });
    await expect(loadBeneficiaryCard('1', '7')).resolves.toMatchObject({ id: 1 });
    spy.mockRestore();
    setSpy.mockRestore();
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
