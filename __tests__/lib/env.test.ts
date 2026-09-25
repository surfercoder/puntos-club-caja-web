/** El modulo valida al importarse, asi que cada caso lo carga de cero. */
const loadEnv = async (siteUrl: string | undefined) => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = siteUrl;

  let loaded!: typeof import('@/lib/env');
  await jest.isolateModulesAsync(async () => {
    loaded = await import('@/lib/env');
  });

  process.env.NEXT_PUBLIC_SITE_URL = previous;
  return loaded;
};

describe('validacion del entorno', () => {
  it('acepta una url de admin valida', async () => {
    const { env, ADMIN_URL } = await loadEnv('https://admin.puntosclub.com.ar');
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('https://admin.puntosclub.com.ar');
    expect(ADMIN_URL).toBe('https://admin.puntosclub.com.ar');
  });

  it('trata la cadena vacia como ausente, en vez de fallar por "no es una url"', async () => {
    const { env } = await loadEnv('');
    expect(env.NEXT_PUBLIC_SITE_URL).toBeUndefined();
  });

  // El mail de recuperar contrasena se manda igual sin la variable: el link
  // tiene que apuntar a algun lado, no a `undefined/auth/update-password`.
  it('sin la variable, ADMIN_URL cae en la base de produccion', async () => {
    const { env, ADMIN_URL } = await loadEnv(undefined);
    expect(env.NEXT_PUBLIC_SITE_URL).toBeUndefined();
    expect(ADMIN_URL).toBe('https://puntos-club-admin.vercel.app');
  });

  it('el build falla de entrada si falta Supabase, en vez de romper en runtime', async () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    await expect(
      jest.isolateModulesAsync(async () => {
        await import('@/lib/env');
      }),
    ).rejects.toThrow();

    process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  });
});
