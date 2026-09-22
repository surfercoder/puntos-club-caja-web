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
  return loaded.env;
};

describe('validacion del entorno', () => {
  it('acepta una url de admin valida', async () => {
    const env = await loadEnv('https://admin.puntosclub.com.ar');
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('https://admin.puntosclub.com.ar');
  });

  it('trata la cadena vacia como ausente, en vez de fallar por "no es una url"', async () => {
    await expect(loadEnv('')).resolves.toMatchObject({
      NEXT_PUBLIC_SITE_URL: undefined,
    });
  });

  it('la variable es opcional', async () => {
    await expect(loadEnv(undefined)).resolves.toMatchObject({
      NEXT_PUBLIC_SITE_URL: undefined,
    });
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
