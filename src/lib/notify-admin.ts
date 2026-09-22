import { env } from '@/lib/env';

import { supabase } from '@/lib/supabase/client';

// El aviso al beneficiario (push + mail) lo manda el admin: la caja solo le
// avisa que paso algo. Best-effort y en silencio — la venta o el canje ya
// quedaron guardados, un push caido no puede voltearlos ni frenar la pantalla.
export async function notifyAdmin(path: string, body: Record<string, unknown>) {
  try {
    const siteUrl = env.NEXT_PUBLIC_SITE_URL || '';
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token || !siteUrl) return;

    await fetch(`${siteUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Silencio a proposito: ver arriba.
  }
}
