'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { FullScreenSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/lib/theme';

// El proxy ya corta a quien no tiene sesion. Aca se valida lo que el proxy no
// puede: que ese usuario tenga un app_user de cajero o dueno activo (vive en la
// base, detras de RLS). Mismo guardia que el (app)/_layout.tsx de la app movil.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, loading, appUser, signOut } = useAuth();
  const router = useRouter();
  // `signOut` se rearma en cada render del provider, asi que el efecto se
  // repite solo: el flag corta los pases de mas mientras la sesion todavia no
  // se limpio.
  const bouncing = useRef(false);

  useEffect(() => {
    if (loading || bouncing.current) return;
    // Con sesion valida pero sin app_user hay que soltar la cookie antes de
    // mandarlo al login: el proxy ve un usuario y rebota /sign-in a /, asi que
    // sin esto queda en un loop de redirects contra el spinner. Pasa cuando el
    // fetch del app_user corta por timeout — cuando no existe la fila, o el rol
    // no es de caja, AuthContext ya cerro la sesion.
    if (session && !appUser) {
      bouncing.current = true;
      void signOut().finally(() => router.replace('/sign-in'));
      return;
    }
    if (!session) router.replace('/sign-in');
  }, [loading, session, appUser, router, signOut]);

  if (loading || !session || !appUser) {
    return <FullScreenSpinner color={colors.green} />;
  }

  return <>{children}</>;
}
