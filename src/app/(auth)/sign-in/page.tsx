'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import {
  IoChevronForward,
  IoEyeOffOutline,
  IoEyeOutline,
  IoHeadsetOutline,
  IoLockClosedOutline,
  IoMailOutline,
} from 'react-icons/io5';

import { Spinner } from '@/components/ui/spinner';
import { notify } from '@/lib/notify';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import { APP_VERSION } from '@/lib/app-version';
import { errorMessage } from '@/lib/errors';
import { SUPPORT_EMAIL } from '@/lib/support';
import { supabase } from '@/lib/supabase/client';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

// Fila "icono verde + label" que el mockup repite encima de cada campo.
const FieldLabel = ({
  icon,
  children,
  htmlFor,
}: {
  icon: React.ReactNode;
  children: string;
  htmlFor: string;
}) => (
  <label htmlFor={htmlFor} className="mb-[9px] flex items-center gap-2">
    <span className="text-green-card">{icon}</span>
    <span className="text-[15px] font-bold text-ink">{children}</span>
  </label>
);

// Campo del login: caja de 50px con borde verdoso, icono a la izquierda.
const FIELD =
  'mb-[18px] flex h-[50px] items-center gap-[10px] rounded-xl border-[1.5px] border-green-field bg-card px-[14px]';
const FIELD_INPUT =
  'h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-subtle';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const t = useT();

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      notify.error(t('common.error'), { description: t('signIn.missingFields') });
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password).finally(() =>
      setLoading(false),
    );

    if (error) {
      notify.error(t('common.error'), { description: errorMessage(t, error) });
      return;
    }

    // replace y no push: volver atras despues de entrar tiene que dejar al
    // cajero fuera de la app, no de vuelta en el formulario.
    router.replace('/');
  };

  // Sin pantalla propia de recuperacion: el mail abre /auth/update-password en
  // el admin. Sin redirectTo, Supabase manda al Site URL y el link no sirve.
  const handleForgotPassword = async () => {
    if (!email) {
      notify.info(t('forgot.title'), { description: t('forgot.needEmail') });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`,
    });
    // El rate limit de GoTrue ("you can only request this after 60 seconds")
    // sale traducido y con los segundos.
    if (error) {
      notify.error(t('forgot.title'), { description: errorMessage(t, error) });
    } else {
      notify.success(t('forgot.title'), { description: t('forgot.sent') });
    }
  };

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-auth-bg">
      <form
        onSubmit={handleSignIn}
        className="page-column page-form page-center no-scrollbar flex-1 overflow-y-auto px-7 pb-[calc(16px+env(safe-area-inset-bottom))] pt-[calc(8px+env(safe-area-inset-top))]"
      >
        <Image
          src="/images/auth/hero.png"
          alt=""
          width={430}
          height={210}
          priority
          className="mb-1 h-[210px] w-full object-contain"
        />

        <h1 className="text-center text-[30px] font-extrabold text-green-bright">
          {t('signIn.title')}
        </h1>
        <p className="mb-[30px] mt-2 text-center text-[16px] font-semibold text-[#585D6A]">
          {t('signIn.subtitle')}
        </p>

        <FieldLabel htmlFor="email" icon={<IoMailOutline size={20} />}>
          {t('signIn.email')}
        </FieldLabel>
        <div className={FIELD}>
          <IoMailOutline size={20} className="shrink-0 text-green-card" />
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="username"
            className={FIELD_INPUT}
            placeholder={t('signIn.emailPlaceholder')}
            value={email}
            // El email siempre en minuscula: se puede tipear o pegar en mayusculas.
            onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
          />
        </div>

        <FieldLabel htmlFor="password" icon={<IoLockClosedOutline size={20} />}>
          {t('signIn.password')}
        </FieldLabel>
        <div className={FIELD}>
          <IoLockClosedOutline size={20} className="shrink-0 text-green-card" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            className={FIELD_INPUT}
            placeholder={t('signIn.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="pressable shrink-0 text-muted"
            aria-label={t(
              showPassword ? 'signIn.hidePassword' : 'signIn.showPassword',
            )}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <IoEyeOffOutline size={22} /> : <IoEyeOutline size={22} />}
          </button>
        </div>

        <div className="mb-5 mt-0.5 flex items-center justify-between">
          <label className="pressable flex cursor-pointer items-center gap-[10px]">
            <input
              type="checkbox"
              className="sr-only"
              checked={remember}
              onChange={() => setRemember(!remember)}
            />
            <span
              className={cn(
                'flex h-[22px] w-[22px] items-center justify-center rounded-md border-[1.5px]',
                remember
                  ? 'border-green-card bg-green-card'
                  : 'border-green-line',
              )}
              aria-hidden
            >
              {remember ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            <span className="text-[15px] font-medium text-ink-soft">
              {t('signIn.remember')}
            </span>
          </label>
          <button
            type="button"
            className="pressable text-[14px] font-semibold text-green-ink"
            onClick={handleForgotPassword}
          >
            {t('signIn.forgot')}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'pressable flex h-[54px] w-full items-center justify-center gap-[10px] rounded-xl bg-green-card',
            loading && 'opacity-70',
          )}
        >
          {loading ? (
            <Spinner size={22} color="#FFFFFF" />
          ) : (
            <>
              <IoLockClosedOutline size={20} color="#FFFFFF" />
              <span className="text-[17px] font-bold text-white">
                {t('signIn.submit')}
              </span>
            </>
          )}
        </button>

        {/* Antes de entrar no se puede saber a que organizacion pertenece
            quien mira esta pantalla: get_my_owner_email() resuelve todo desde
            auth.uid(), que todavia es null. Y a quien no puede entrar lo tiene
            que atender PuntosClub igual — el owner tampoco le puede resetear
            la contrasena, eso lo hace GoTrue. Por eso va al soporte nuestro.
            El mail del owner sigue estando en la home, ya con sesion. */}
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('signIn.helpSubject'))}`}
          className="pressable mt-6 flex w-full items-center gap-3 rounded-[14px] border border-green-line bg-green-tint p-[14px] text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-soft">
            <IoHeadsetOutline size={22} color={colors.greenInk} />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-bold text-green-ink">
              {t('signIn.helpTitle')}
            </span>
            <span className="block text-[13px] text-muted">
              {t('signIn.helpSubtitle')}
            </span>
          </span>
          <IoChevronForward size={20} color={colors.greenInk} />
        </a>

        <p className="mt-[22px] text-center text-[12px] text-subtle">
          PuntosClub Caja {APP_VERSION}
        </p>
      </form>
    </div>
  );
}
