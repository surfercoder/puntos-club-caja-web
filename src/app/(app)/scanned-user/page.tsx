'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import React, {
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useState,
} from 'react';
import {
  IoCart,
  IoPerson,
  IoPersonAdd,
  IoQrCode,
  IoSettingsSharp,
  IoShieldCheckmark,
  IoStorefront,
} from 'react-icons/io5';

import ScreenHeader from '@/components/ScreenHeader';
import { notify } from '@/lib/notify';
import { FullScreenSpinner, Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import type { Translate } from '@/i18n';
import { loadBeneficiaryCard, type BeneficiaryCard } from '@/lib/beneficiary';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import { colors, formatPoints } from '@/lib/theme';
import { cn } from '@/lib/utils';

const CARD_SHADOW = 'shadow-[0px_1px_3px_rgba(16,24,40,0.06)]';

async function loadLatestPoints(
  beneficiaryId: string,
  organizationId: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('beneficiary_organization')
    .select('available_points')
    .eq('beneficiary_id', parseInt(beneficiaryId))
    .eq('organization_id', parseInt(organizationId))
    .single();

  if (error || !data) return null;
  return data.available_points as number;
}

async function checkPointsRulesFor(organizationId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('points_rule')
    .select('id')
    .eq('is_active', true)
    .eq('organization_id', parseInt(organizationId))
    .limit(1);

  return !error && !!data && data.length > 0;
}

function usePointsRealtimeSync(
  isMember: boolean,
  beneficiaryId: string | undefined,
  organizationId: string | undefined,
) {
  const [livePoints, setLivePoints] = useState<number | null>(null);

  useEffect(() => {
    if (!isMember || !beneficiaryId || !organizationId) return;

    // Primer valor: el que viaja en la URL puede estar viejo si el beneficiario
    // canjeo algo entre el escaneo y esta pantalla.
    loadLatestPoints(beneficiaryId, organizationId).then((next) => {
      if (next !== null) setLivePoints(next);
    });

    const channelName = `caja-points-${beneficiaryId}-${organizationId}`;
    const existing = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${channelName}`);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel: RealtimeChannel = supabase.channel(channelName);
    const bound = channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'beneficiary_organization',
        filter: `beneficiary_id=eq.${beneficiaryId}`,
      },
      (payload) => {
        const newRow = payload.new as {
          organization_id?: number | string;
          available_points?: number;
        };
        if (newRow.organization_id?.toString() === organizationId) {
          setLivePoints(newRow.available_points ?? null);
        }
      },
    );
    bound.subscribe();

    return () => {
      bound.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [isMember, beneficiaryId, organizationId]);

  return livePoints;
}

type RulesState = { hasPointsRules: boolean; checkingRules: boolean };
type RulesAction = { type: 'checking' } | { type: 'set'; hasRules: boolean };

function rulesReducer(state: RulesState, action: RulesAction): RulesState {
  switch (action.type) {
    case 'checking':
      return { ...state, checkingRules: true };
    case 'set':
      return { hasPointsRules: action.hasRules, checkingRules: false };
  }
}

function usePointsRulesCheck(
  isMember: boolean,
  organizationId: string | undefined,
) {
  const [state, dispatch] = useReducer(rulesReducer, {
    hasPointsRules: true,
    checkingRules: false,
  });

  useEffect(() => {
    if (!isMember || !organizationId) return;
    let mounted = true;
    dispatch({ type: 'checking' });
    checkPointsRulesFor(organizationId).then((hasRules) => {
      if (mounted) dispatch({ type: 'set', hasRules });
    });
    return () => {
      mounted = false;
    };
  }, [isMember, organizationId]);

  return state;
}

function useInviteUser(
  beneficiaryId: string | undefined,
  organizationId: string | undefined,
  beneficiaryName: string | undefined,
  onInvited: () => void,
  t: Translate,
) {
  const [inviting, setInviting] = useState(false);

  const handleInviteUser = async () => {
    // Inalcanzable desde la UI: sin los dos ids la ficha no llega a cargar y
    // este boton no se dibuja. Queda porque es lo que le da el tipo `string` a
    // los parseInt de abajo.
    /* v8 ignore next 6 */
    if (!beneficiaryId || !organizationId) {
      notify.error(t('common.error'), {
        description: t('client.inviteMissingData'),
      });
      return;
    }

    setInviting(true);
    try {
      const { error } = await supabase
        .from('beneficiary_organization')
        .insert({
          beneficiary_id: parseInt(beneficiaryId),
          organization_id: parseInt(organizationId),
          available_points: 0,
          total_points_earned: 0,
          total_points_redeemed: 0,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        // Ya existia la membresia pero dada de baja: se reactiva en vez de
        // fallar con el duplicado.
        if (error.code === '23505') {
          const { error: updateError } = await supabase
            .from('beneficiary_organization')
            .update({ is_active: true })
            .eq('beneficiary_id', parseInt(beneficiaryId))
            .eq('organization_id', parseInt(organizationId))
            .select()
            .single();

          if (updateError) {
            notify.error(t('common.error'), {
              description: errorMessage(t, updateError),
            });
            setInviting(false);
            return;
          }
        } else {
          notify.error(t('common.error'), { description: errorMessage(t, error) });
          setInviting(false);
          return;
        }
      }

      notify.success(t('client.invitedTitle'), {
        description: t('client.invitedBody', {
          name: beneficiaryName ?? t('common.client'),
        }),
      });
      onInvited();
      setInviting(false);
    } catch (err) {
      notify.error(t('common.error'), { description: errorMessage(t, err) });
      setInviting(false);
    }
  };

  return { inviting, handleInviteUser };
}

function MemberPointsSection({
  availablePoints,
  hasPointsRules,
  checkingRules,
  onNewSale,
  t,
}: {
  availablePoints: number;
  hasPointsRules: boolean;
  checkingRules: boolean;
  onNewSale: () => void;
  t: Translate;
}) {
  return (
    <>
      <div className="mb-4 w-full rounded-2xl bg-green-card py-[22px] text-center">
        <p className="mb-0.5 text-[15px] text-white/90">
          {t('client.availablePoints')}
        </p>
        <p className="text-[56px] font-bold leading-none text-white">
          {formatPoints(availablePoints)}
        </p>
      </div>

      {!hasPointsRules && !checkingRules && (
        <div className="mb-4 flex w-full items-start rounded-xl bg-orange-soft p-4">
          <span className="mr-3 text-[20px] leading-none">⚠️</span>
          <p className="flex-1 text-[14px] leading-5 text-orange-ink">
            {t('client.noRulesWarning')}
          </p>
        </div>
      )}

      <div className="mb-[14px] w-full">
        <button
          type="button"
          className={cn(
            'pressable flex w-full flex-col items-center gap-2 rounded-xl py-[18px]',
            hasPointsRules ? 'bg-green-card' : 'bg-subtle',
          )}
          onClick={onNewSale}
          disabled={!hasPointsRules || checkingRules}
        >
          {checkingRules ? (
            <Spinner size={20} color="#FFFFFF" />
          ) : (
            <>
              <IoCart size={26} color="#FFFFFF" />
              <span className="text-[16px] font-bold text-white">
                {t('client.newSale')}
              </span>
            </>
          )}
        </button>
      </div>
    </>
  );
}

function NonMemberInviteSection({
  inviting,
  onInvite,
  t,
}: {
  inviting: boolean;
  onInvite: () => void;
  t: Translate;
}) {
  return (
    <>
      <div className="mb-4 flex w-full flex-col items-center rounded-2xl bg-orange-soft p-6">
        <IoPersonAdd size={48} color={colors.orange} className="mb-4" />
        <p className="text-center text-[14px] leading-[22px] text-orange-ink">
          {t('client.inviteMessage')}
        </p>
      </div>

      <button
        type="button"
        className="pressable mb-[14px] flex w-full items-center justify-center gap-2 rounded-xl bg-orange py-4"
        onClick={onInvite}
        disabled={inviting}
      >
        {inviting ? (
          <Spinner size={20} color="#FFFFFF" />
        ) : (
          <>
            <IoPersonAdd size={20} color="#FFFFFF" />
            <span className="text-[16px] font-semibold text-white">
              {t('client.inviteAction')}
            </span>
          </>
        )}
      </button>
    </>
  );
}

function ClientStatusBadge({ isMember, t }: { isMember: boolean; t: Translate }) {
  return (
    <div
      className={cn(
        'mb-[22px] rounded-[22px] px-[26px] py-[10px] text-[15px] font-bold tracking-[0.6px]',
        isMember
          ? 'bg-green-soft text-green-ink'
          : 'bg-orange-soft text-orange',
      )}
    >
      {t(isMember ? 'client.member' : 'client.notMember')}
    </div>
  );
}

function ScreenFooter({ isMember, t }: { isMember: boolean; t: Translate }) {
  const router = useRouter();
  return (
    <>
      <button
        type="button"
        className={cn(
          'pressable flex w-full items-center justify-center gap-[10px] rounded-xl border-[1.5px] bg-card py-4',
          isMember ? 'border-green-card' : 'border-orange',
        )}
        onClick={() => router.replace('/scanner')}
      >
        <IoQrCode size={22} color={isMember ? colors.greenCard : colors.orange} />
        <span
          className={cn(
            'text-[16px] font-bold',
            isMember ? 'text-green-card' : 'text-orange',
          )}
        >
          {t(isMember ? 'client.scanAnotherMember' : 'client.scanAnother')}
        </span>
      </button>

      {isMember ? (
        <div className="mt-[18px] flex w-full items-center gap-3 rounded-xl bg-green-tint p-[14px] text-left">
          <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-green-soft">
            <IoShieldCheckmark size={22} color={colors.greenCard} />
          </span>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[15.5px] font-bold text-green-ink">
              {t('client.verifiedTitle')}
            </span>
            <span className="text-[14px] text-muted">
              {t('client.verifiedBody')}
            </span>
          </span>
        </div>
      ) : null}

      <button
        type="button"
        className="pressable w-full py-[18px] text-[16px] text-muted"
        onClick={() => router.replace('/')}
      >
        {t('client.goHome')}
      </button>
    </>
  );
}

function ScannedUserScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const { appUser } = useAuth();
  const t = useT();

  const beneficiaryId = search.get('beneficiaryId') ?? undefined;
  const organizationId = appUser?.organization_id;
  const [card, setCard] = useState<BeneficiaryCard | null>(null);

  // La ficha se carga aca y no viaja por la URL. Si el cliente no existe no hay
  // nada que mostrar: se avisa y se vuelve a la home en vez de dejar la pantalla
  // vacia sin salida.
  const reloadCard = useCallback(() => {
    if (!beneficiaryId || !organizationId) return;
    loadBeneficiaryCard(beneficiaryId, organizationId).then((next) => {
      if (next) {
        setCard(next);
        return;
      }
      notify.error(t('common.error'), { description: t('scanner.userNotFound') });
      router.replace('/');
    });
  }, [beneficiaryId, organizationId, router, t]);

  useEffect(() => {
    reloadCard();
  }, [reloadCard]);

  const isMember = !!card?.isMember;
  const beneficiaryName = card?.name || undefined;
  const beneficiaryEmail = card?.email ?? '';

  const livePoints = usePointsRealtimeSync(isMember, beneficiaryId, organizationId);
  const { hasPointsRules, checkingRules } = usePointsRulesCheck(
    isMember,
    organizationId,
  );
  const { inviting, handleInviteUser } = useInviteUser(
    beneficiaryId,
    organizationId,
    beneficiaryName,
    reloadCard,
    t,
  );

  const availablePoints = livePoints ?? card?.availablePoints ?? 0;

  const handleNewSale = () => {
    router.push(`/new-sale?beneficiaryId=${beneficiaryId}`);
  };

  if (!card) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col bg-bg">
        <ScreenHeader
          width="form"
          title={t('client.scannedTitle')}
          backIcon="home"
          onBack={() => router.replace('/')}
        />
        <FullScreenSpinner color={colors.green} />
      </div>
    );
  }

  const organizationName =
    (appUser?.organization as { name?: string } | null | undefined)?.name ||
    t('common.noOrganization');

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader
        width="form"
        title={t(isMember ? 'client.foundTitle' : 'client.scannedTitle')}
        backIcon="home"
        onBack={() => router.replace('/')}
        right={
          <button
            type="button"
            className="pressable text-white"
            aria-label={t('profile.myProfile')}
            onClick={() => router.push('/profile')}
          >
            <IoSettingsSharp size={24} />
          </button>
        }
      />
      <div className="page-column page-form no-scrollbar flex-1 justify-items-center overflow-y-auto p-5 pb-[calc(24px+env(safe-area-inset-bottom))]">
        {/* ponytail: se reusa la mascota de "Buscar Cliente" (misma pose, lupa
            con QR en vez de vacia) en lugar de pedir un PNG nuevo. */}
        <Image
          src="/images/search/mascot.png"
          alt=""
          width={390}
          height={220}
          priority
          className="h-[220px] w-full object-contain"
        />

        <ClientStatusBadge isMember={isMember} t={t} />

        <div
          className={cn(
            'mb-[18px] flex w-full items-center gap-4 rounded-2xl bg-card p-4',
            CARD_SHADOW,
          )}
        >
          <span className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full bg-green-card">
            <IoPerson size={38} color="#FFFFFF" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <p className="text-[20px] font-bold text-ink">
              {beneficiaryName || t('common.user')}
            </p>
            <p className="truncate text-[14px] text-muted">{beneficiaryEmail}</p>
            <div className="mt-1 flex items-center gap-2">
              <IoStorefront size={20} color={colors.greenCard} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink-soft">
                {organizationName}
              </span>
            </div>
          </div>
        </div>

        {isMember ? (
          <MemberPointsSection
            availablePoints={availablePoints}
            hasPointsRules={hasPointsRules}
            checkingRules={checkingRules}
            onNewSale={handleNewSale}
            t={t}
          />
        ) : (
          <NonMemberInviteSection
            inviting={inviting}
            onInvite={handleInviteUser}
            t={t}
          />
        )}

        <ScreenFooter isMember={isMember} t={t} />
      </div>
    </div>
  );
}

export default function ScannedUserPage() {
  return (
    <Suspense fallback={<FullScreenSpinner color={colors.green} />}>
      <ScannedUserScreen />
    </Suspense>
  );
}
