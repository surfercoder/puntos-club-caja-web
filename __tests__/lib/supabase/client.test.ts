jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({ marker: 'cliente' })),
}));

import { createBrowserClient } from '@supabase/ssr';

import { supabase } from '@/lib/supabase/client';

const created = jest.mocked(createBrowserClient);

describe('cliente de Supabase', () => {
  it('se arma con la url y la clave publica del entorno', () => {
    expect(created).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
    expect(supabase).toBeDefined();
  });

  it('es uno solo por pestana: dos clientes disparan onAuthStateChange dos veces', () => {
    expect(created).toHaveBeenCalledTimes(1);
  });
});
