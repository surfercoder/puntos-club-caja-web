'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { FullScreenSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/lib/theme';

// El proxy ya corta a quien no tiene sesion. Aca se valida lo que el proxy no
// puede: que ese usuario tenga un app_user de cajero o dueno activo (vive en la
// base, detras de RLS). Mismo guardia que el (app)/_layout.tsx de la app movil.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, loading, appUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!session || !appUser)) router.replace('/sign-in');
  }, [loading, session, appUser, router]);

  if (loading || !session || !appUser) {
    return <FullScreenSpinner color={colors.green} />;
  }

  return <>{children}</>;
}
