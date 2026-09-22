'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { FiSave } from 'react-icons/fi';
import {
  IoLanguageOutline,
  IoLogOutOutline,
  IoMailOutline,
  IoPersonCircleOutline,
  IoPersonOutline,
  IoShieldCheckmarkOutline,
  IoStorefrontOutline,
} from 'react-icons/io5';

import ScreenHeader from '@/components/ScreenHeader';
import { confirm } from '@/lib/confirm';
import { notify } from '@/lib/notify';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { LANGS } from '@/i18n';
import { APP_VERSION } from '@/lib/app-version';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

// Tokens de campo compartidos con el login (formInput de la app movil).
const INPUT =
  'h-[50px] w-full rounded-xl border-[1.5px] border-line bg-card px-[14px] text-[15px] font-bold text-ink outline-none placeholder:font-normal placeholder:text-subtle';

// Cada campo del mockup es "icono verde + label" y abajo el input. Los de solo
// lectura (email, organizacion) van grises y sin borde marcado.
const Field = ({
  icon,
  label,
  children,
  hint,
  htmlFor,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  hint?: string;
  htmlFor?: string;
}) => (
  <div className="mb-[18px]">
    <label
      htmlFor={htmlFor}
      className="mb-[9px] flex items-center gap-[9px]"
    >
      <span className="text-green-card">{icon}</span>
      <span className="text-[15.5px] font-medium text-ink-soft">{label}</span>
    </label>
    {children}
    {hint ? <p className="mt-[7px] text-[12.5px] text-subtle">{hint}</p> : null}
  </div>
);

const Readonly = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-[50px] items-center rounded-xl border-[1.5px] border-line bg-disabled px-[14px]">
    <span className="truncate text-[15px] font-bold text-subtle">{children}</span>
  </div>
);

export default function ProfilePage() {
  const router = useRouter();
  const { appUser, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: appUser?.first_name || '',
    last_name: appUser?.last_name || '',
  });

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!appUser?.id) return;

    setIsLoading(true);

    await (async () => {
      // Usuario y email no entran en el update: cambiar el email rompe la
      // autenticacion, lo tiene que hacer el owner o un administrador.
      const { error: updateError } = await supabase
        .from('app_user')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
        })
        .eq('id', appUser.id);

      if (updateError) {
        notify.error(t('common.error'), {
          description: errorMessage(t, updateError),
        });
        return;
      }

      notify.success(t('profile.savedTitle'), {
        description: t('profile.savedBody'),
      });
    })().finally(() => setIsLoading(false));
  };

  const handleSignOut = async () => {
    const ok = await confirm({
      title: t('signOut.confirmTitle'),
      message: t('signOut.confirmBody'),
      confirmText: t('signOut.action'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await signOut();
    router.replace('/sign-in');
  };

  const organizationName =
    (appUser?.organization as { name?: string } | null | undefined)?.name ||
    t('common.noOrganization');

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader
        width="form"
        title={t('profile.header')}
        onBack={() => router.replace('/')}
        right={<IoPersonCircleOutline size={28} color="#FFFFFF" />}
      />

      <form
        onSubmit={handleSave}
        className="page-column page-form no-scrollbar flex-1 overflow-y-auto p-4 pb-[calc(24px+env(safe-area-inset-bottom))]"
      >
        <h1 className="mt-3 text-[30px] font-extrabold text-ink">
          {t('profile.title')}
        </h1>
        <p className="mb-5 mt-1.5 text-[16px] text-muted">{t('profile.subtitle')}</p>

        <div className="mb-[18px] rounded-[14px] border border-line bg-card p-4">
          <Field
            htmlFor="first_name"
            icon={<IoPersonOutline size={20} />}
            label={t('profile.firstName')}
          >
            <input
              id="first_name"
              name="given-name"
              autoComplete="given-name"
              className={INPUT}
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              placeholder={t('profile.firstName')}
            />
          </Field>

          <Field
            htmlFor="last_name"
            icon={<IoPersonOutline size={20} />}
            label={t('profile.lastName')}
          >
            <input
              id="last_name"
              name="family-name"
              autoComplete="family-name"
              className={INPUT}
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              placeholder={t('profile.lastName')}
            />
          </Field>

          <Field
            icon={<IoMailOutline size={20} />}
            label={t('profile.email')}
            hint={t('profile.emailHint')}
          >
            <Readonly>{appUser?.email || '—'}</Readonly>
          </Field>

          <Field
            icon={<IoStorefrontOutline size={20} />}
            label={t('profile.organization')}
          >
            <Readonly>{organizationName}</Readonly>
          </Field>

          <Field
            icon={<IoShieldCheckmarkOutline size={20} />}
            label={t('profile.status')}
          >
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-[10px] px-[14px] py-[9px] text-[15.5px] font-bold',
                appUser?.active
                  ? 'bg-green-soft text-green-ink'
                  : 'bg-danger-soft text-danger',
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  appUser?.active ? 'bg-green-ink' : 'bg-danger',
                )}
              />
              {t(appUser?.active ? 'common.active' : 'common.inactive')}
            </span>
          </Field>

          {/* Selector de idioma: arranca en el del navegador y queda guardado en
              este equipo (cookie), no en el perfil. Es una preferencia del
              dispositivo, no un dato del cajero. */}
          <Field icon={<IoLanguageOutline size={20} />} label={t('profile.language')}>
            <div role="radiogroup" className="flex gap-[10px]">
              {LANGS.map((code) => {
                const on = lang === code;
                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={cn(
                      'pressable flex h-[50px] flex-1 items-center justify-center rounded-xl border-[1.5px] text-[15px]',
                      on
                        ? 'border-green-card bg-green-soft font-bold text-green-ink'
                        : 'border-line bg-card font-semibold text-muted',
                    )}
                    onClick={() => setLang(code)}
                  >
                    {t(
                      code === 'es' ? 'profile.languageEs' : 'profile.languageEn',
                    )}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <button
          type="submit"
          className={cn(
            'pressable mb-[14px] flex h-[56px] w-full items-center justify-center gap-3 rounded-xl bg-green-card',
            isLoading && 'opacity-60',
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <Spinner size={21} color="#FFFFFF" />
          ) : (
            <>
              <FiSave size={21} color="#FFFFFF" />
              <span className="text-[17px] font-bold text-white">
                {t('profile.save')}
              </span>
            </>
          )}
        </button>

        <button
          type="button"
          className="pressable flex h-[56px] w-full items-center justify-center gap-[10px] rounded-xl border border-danger-line bg-danger-soft"
          onClick={handleSignOut}
        >
          <IoLogOutOutline size={22} color={colors.danger} />
          <span className="text-[17px] font-bold text-danger">
            {t('signOut.action')}
          </span>
        </button>

        <p className="mt-[22px] text-center text-[12px] text-subtle">
          PuntosClub Caja {APP_VERSION}
        </p>
      </form>
    </div>
  );
}
