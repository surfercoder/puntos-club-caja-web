import { createBrowserClient } from '@supabase/ssr';

import { env } from '@/lib/env';

// Un solo cliente por pestana: createBrowserClient ya devuelve el mismo, pero
// el modulo lo fija para que ningun componente cree uno nuevo por render y
// dispare dos veces onAuthStateChange.
export const supabase = createBrowserClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
