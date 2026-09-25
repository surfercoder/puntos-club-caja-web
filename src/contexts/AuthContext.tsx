'use client';

import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, use, useEffect, useReducer } from 'react';

import type { MessageKey } from '@/i18n';
import { errorDescriptor } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';

// Los helpers de auth no pueden traducir: no son componentes y el idioma vive
// en el contexto de i18n. Devuelven un Error cuyo `message` es la CLAVE de
// i18n, y la pantalla que lo muestra la traduce con errorMessage(t, error).
// Asi ningun texto de GoTrue/PostgREST llega crudo a un toast.
const keyError = (key: MessageKey, params?: Record<string, string | number>) =>
  Object.assign(new Error(key), { params });

const mapped = (error: unknown) => {
  const { key, params } = errorDescriptor(error);
  return keyError(key, params);
};

type AppUser = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  username: string | null;
  active: boolean;
  role_id: string | null;
  auth_user_id: string | null;
};

type Organization = {
  id: string;
  name: string;
};

export type AppUserWithOrg = AppUser & {
  organization?: Organization | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  appUser: AppUserWithOrg | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Roles habilitados para la caja. El dueno de un comercio chico atiende su
// propia caja, asi que entra con su unico app_user de owner — sin registro
// duplicado ni segundo rol.
const CASHIER_APP_ROLES = ['cashier', 'owner'];

async function signInImpl(
  email: string,
  password: string,
): Promise<{ error: Error | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: mapped(error) };

    if (data.user) {
      const { data: appUserData, error: appUserError } = await supabase
        .from('app_user')
        .select('*, user_role:role_id(name)')
        .eq('auth_user_id', data.user.id)
        .single();

      if (appUserError || !appUserData) {
        await supabase.auth.signOut();
        return { error: keyError('error.auth.notCashier') };
      }

      const roleName = (appUserData.user_role as { name?: string } | null)?.name;
      if (!roleName || !CASHIER_APP_ROLES.includes(roleName)) {
        await supabase.auth.signOut();
        return { error: keyError('error.auth.noPermission') };
      }

      if (!appUserData.active) {
        await supabase.auth.signOut();
        return { error: keyError('error.auth.disabledAccount') };
      }
    }

    return { error: null };
  } catch (error) {
    return { error: mapped(error) };
  }
}

// Trae el app_user con rol y organizacion, con corte a los 8s: sin el, una red
// que no responde deja la pantalla en el spinner para siempre.
async function fetchAppUserByAuthUserId(
  authUserId: string,
): Promise<{ appUser: AppUserWithOrg | null; signedOut: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error('fetchAppUser timeout'));
      }, 8000);
    });

    const queryPromise = supabase
      .from('app_user')
      .select('*, user_role:role_id(name), organization:organization_id(id, name)')
      .eq('auth_user_id', authUserId)
      .single();

    // El timer del race hay que apagarlo cuando gana la query: si no, a los 8s
    // rechaza una promesa que ya no tiene a nadie escuchando. Va en un
    // `.finally` de la promesa y no en uno del try, que corre igual pero deja
    // una rama que ningun test puede alcanzar.
    const { data, error } = await Promise.race([
      queryPromise,
      timeoutPromise,
    ]).finally(() => clearTimeout(timer));

    if (error || !data) {
      await supabase.auth.signOut();
      return { appUser: null, signedOut: true };
    }
    const roleName = (data.user_role as { name?: string } | null)?.name;
    if (!roleName || !CASHIER_APP_ROLES.includes(roleName)) {
      await supabase.auth.signOut();
      return { appUser: null, signedOut: true };
    }
    return { appUser: data as AppUserWithOrg, signedOut: false };
  } catch {
    return { appUser: null, signedOut: false };
  }
}

type AuthState = {
  session: Session | null;
  user: User | null;
  appUser: AppUserWithOrg | null;
  loading: boolean;
};

type AuthAction =
  | { type: 'session/loaded'; session: Session | null }
  | { type: 'appUser/set'; appUser: AppUserWithOrg | null }
  | { type: 'session/cleared' }
  | { type: 'loading/done' };

const initialAuthState: AuthState = {
  session: null,
  user: null,
  appUser: null,
  loading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'session/loaded':
      return {
        ...state,
        session: action.session,
        user: action.session?.user ?? null,
      };
    case 'appUser/set':
      return { ...state, appUser: action.appUser, loading: false };
    case 'session/cleared':
      return {
        ...state,
        session: null,
        user: null,
        appUser: null,
        loading: false,
      };
    case 'loading/done':
      return { ...state, loading: false };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const { session, user, appUser, loading } = state;

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const refreshForAuthUser = async (authUserId: string) => {
      const { appUser: next } = await fetchAppUserByAuthUserId(authUserId);
      if (!mounted) return;
      dispatch({ type: 'appUser/set', appUser: next });
    };

    (async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Auth initialization timeout'));
          }, 10000);
        });

        const sessionPromise = supabase.auth.getSession();

        const {
          data: { session: initialSession },
          error: sessionError,
        } = await Promise.race([sessionPromise, timeoutPromise]);

        clearTimeout(timeoutId);

        if (!mounted) return;

        if (sessionError) {
          await supabase.auth.signOut().catch(() => {});
          dispatch({ type: 'session/cleared' });
          return;
        }

        dispatch({ type: 'session/loaded', session: initialSession });

        if (initialSession?.user) {
          await refreshForAuthUser(initialSession.user.id);
        } else {
          dispatch({ type: 'loading/done' });
        }
      } catch {
        if (mounted) {
          dispatch({ type: 'session/cleared' });
        }
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        dispatch({ type: 'session/cleared' });
        return;
      }

      // TOKEN_REFRESHED llega cada hora: el app_user no cambia, y volver a
      // pedirlo pondria `loading` en true y parpadearia la pantalla entera.
      if (event === 'TOKEN_REFRESHED') {
        dispatch({ type: 'session/loaded', session: nextSession });
        return;
      }

      dispatch({ type: 'session/loaded', session: nextSession });
      if (nextSession?.user) {
        await refreshForAuthUser(nextSession.user.id);
      } else {
        dispatch({ type: 'appUser/set', appUser: null });
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Sesion vencida o invalida: se limpia el estado igual.
    }
    dispatch({ type: 'session/cleared' });
  };

  return (
    <AuthContext
      value={{ session, user, appUser, loading, signIn: signInImpl, signOut }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const context = use(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
