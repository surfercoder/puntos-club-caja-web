import { supabase } from '@/lib/supabase/client';

export type BeneficiaryCard = {
  id: number;
  name: string;
  email: string;
  isMember: boolean;
  availablePoints: number;
};

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

  const { data: beneficiary, error } = await supabase
    .from('beneficiary')
    .select('id, email, first_name, last_name')
    .eq('id', id)
    .single();

  if (error || !beneficiary) return null;

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
