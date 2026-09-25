import { z } from 'zod';

// Mismo patron que puntos-club-admin: el build falla de entrada si falta una
// variable, en vez de romper en runtime con un `undefined!` adentro de Supabase.
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // Base del panel admin: es quien manda el push y el mail al beneficiario.
  NEXT_PUBLIC_SITE_URL: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.url().optional(),
  ),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

// Base del admin para los links que van por mail (recuperar contrasena). A
// diferencia de notifyAdmin, aca la ausencia no puede significar "no hagas
// nada": el mail se manda igual y sin base sale un `undefined/auth/...` que no
// abre nada. Sale de `env` y no de process.env para no saltearse la validacion.
export const ADMIN_URL =
  env.NEXT_PUBLIC_SITE_URL ?? 'https://puntos-club-admin.vercel.app';
