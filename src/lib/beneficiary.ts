import { supabase } from '@/lib/supabase/client';

export type BeneficiaryCard = {
  id: number;
  name: string;
  email: string;
  isMember: boolean;
  availablePoints: number;
};

type BeneficiaryRow = {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
};

const STORAGE_KEY = 'caja:found-beneficiary';

/** El dueño de lo recordado es el usuario de auth que hizo la busqueda: otro
 *  cajero en la misma pestaña (logout, cambio de cuenta, busqueda en vuelo)
 *  no hereda nombre y email de alguien que su club no puede resolver. */
async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** La caja no puede leer la tabla beneficiary entera: busca por coincidencia
 *  exacta (email, DNI o el QR con id + email) con la RPC, que devuelve solo
 *  lo que se muestra. */
export async function findBeneficiary(by: {
  email?: string;
  documentId?: string;
  id?: number;
}): Promise<BeneficiaryRow | null> {
  // Antes de la RPC: si la sesion cambia mientras esta en vuelo, la fila queda
  // a nombre de quien la pidio y nadie mas la recupera.
  const owner = await currentUserId();
  const { data, error } = await supabase.rpc('cashier_find_beneficiary', {
    p_email: by.email ?? null,
    p_document_id: by.documentId ?? null,
    p_id: by.id ?? null,
  });
  if (error) throw error;
  const row = (data as BeneficiaryRow[] | null)?.[0] ?? null;
  if (row && owner) rememberBeneficiary(owner, row);
  return row;
}

/** Lo que se encontro viaja a la ficha por sessionStorage y no por la URL: la
 *  query string queda en el historial. Sin esto, la ficha de alguien que
 *  todavia no es socio no se podria recargar por id (la RPC solo resuelve por
 *  id a los socios del club). */
function rememberBeneficiary(owner: string, row: BeneficiaryRow) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ owner, row }));
  } catch {
    // Sin storage la ficha se recarga por id y funciona igual para los socios.
  }
}

async function recallBeneficiary(id: number): Promise<BeneficiaryRow | null> {
  const owner = await currentUserId();
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as {
      owner: string;
      row: BeneficiaryRow;
    } | null;
    return owner && saved?.owner === owner && saved.row.id === id ? saved.row : null;
  } catch {
    return null;
  }
}

/** Lo unico que viaja entre pantallas es el id: en web la query string queda en
 *  el historial del navegador y en la barra de direcciones, asi que el nombre y
 *  el email del cliente se cargan en destino en vez de pasarse por la URL. */
export async function loadBeneficiaryCard(
  beneficiaryId: string | null | undefined,
  organizationId: string | null | undefined,
): Promise<BeneficiaryCard | null> {
  if (!beneficiaryId || !organizationId) return null;
  const id = parseInt(beneficiaryId, 10);
  if (isNaN(id)) return null;

  const beneficiary =
    (await recallBeneficiary(id)) ?? (await findBeneficiary({ id }).catch(() => null));
  if (!beneficiary) return null;

  // Sin fila en beneficiary_organization el cliente existe pero no sigue al
  // club: no es un error, es la ficha de "no miembro" con el boton de invitar.
  const { data: membership } = await supabase
    .from('beneficiary_organization')
    .select('available_points, is_active')
    .eq('beneficiary_id', id)
    .eq('organization_id', parseInt(organizationId, 10))
    .single();

  return {
    id: beneficiary.id,
    name: `${beneficiary.first_name || ''} ${beneficiary.last_name || ''}`.trim(),
    email: beneficiary.email || '',
    isMember: !!membership?.is_active,
    availablePoints: membership?.available_points ?? 0,
  };
}
