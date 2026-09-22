import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/lib/env';
import {
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  langFromAcceptLanguage,
} from '@/i18n/cookie';

const PUBLIC_PATHS = ['/sign-in', '/auth'];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // No meter codigo entre createServerClient y getUser(): cualquier await en el
  // medio deja la cookie refrescada fuera de la respuesta y desloguea al azar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // getUser() puede haber refrescado la sesion: esas cookies viven en
  // supabaseResponse, asi que un redirect que no las copie desloguea al cajero.
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = '';
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach(({ name, value, ...options }) =>
        response.cookies.set(name, value, options),
      );
    return response;
  };

  // Primera visita: se siembra el idioma con el Accept-Language del navegador
  // para que el primer HTML ya salga traducido. Despues manda la cookie, que es
  // lo que cambia el selector del perfil.
  if (!request.cookies.has(LANG_COOKIE)) {
    supabaseResponse.cookies.set(
      LANG_COOKIE,
      langFromAcceptLanguage(request.headers.get('accept-language')),
      { path: '/', maxAge: LANG_COOKIE_MAX_AGE, sameSite: 'lax' },
    );
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // El rol se valida en AuthContext (necesita la tabla app_user). Aca solo se
  // corta lo barato: sin sesion no hay pantalla de caja que tenga sentido.
  if (!user && !isPublic) return redirectTo('/sign-in');
  if (user && pathname === '/sign-in') return redirectTo('/');

  return supabaseResponse;
}
