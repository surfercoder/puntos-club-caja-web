'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useReducer, useRef } from 'react';
import {
  IoCheckmarkCircle,
  IoCheckmarkDoneCircle,
  IoClose,
  IoCloseCircle,
  IoCloseCircleOutline,
  IoFileTrayOutline,
  IoPricetagsOutline,
  IoTimeOutline,
} from 'react-icons/io5';

import ScreenHeader from '@/components/ScreenHeader';
import { confirm } from '@/lib/confirm';
import { notify } from '@/lib/notify';
import { FullScreenSpinner, Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import { translate, type MessageKey, type Translate } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { notifyAdmin } from '@/lib/notify-admin';
import { supabase } from '@/lib/supabase/client';
import { colors, formatPoints, formatRequestedAt } from '@/lib/theme';
import { cn } from '@/lib/utils';

type Tab = 'pending' | 'delivered' | 'cancelled';

type Row = {
  id: number;
  beneficiary_id: number;
  product_id: number | null;
  points_used: number;
  status: string;
  requested_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  beneficiary: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  product: { name: string } | null;
};

type Beneficiary = Row['beneficiary'];

const beneficiaryLabel = (
  row: { beneficiary: Beneficiary },
  t: Translate,
): string => {
  const b = row.beneficiary;
  if (!b) return t('common.client');
  const name = `${b.first_name || ''} ${b.last_name || ''}`.trim();
  return name || b.email || t('common.client');
};

// Los textos por pestana en una tabla: tres ternarios anidados por copy no.
const TAB_COPY: Record<
  Tab,
  {
    title: MessageKey;
    unit: MessageKey;
    emptyIcon: 'checkmark-done-circle' | 'file-tray-outline';
    emptyTitle: MessageKey;
    emptySubtitle: MessageKey;
  }
> = {
  pending: {
    title: 'redemptions.pendingTitle',
    unit: 'redemptions.pendingUnit',
    emptyIcon: 'checkmark-done-circle',
    emptyTitle: 'redemptions.pendingEmptyTitle',
    emptySubtitle: 'redemptions.pendingEmptyBody',
  },
  delivered: {
    title: 'redemptions.deliveredTitle',
    unit: 'redemptions.deliveredUnit',
    emptyIcon: 'file-tray-outline',
    emptyTitle: 'redemptions.deliveredEmptyTitle',
    emptySubtitle: 'redemptions.deliveredEmptyBody',
  },
  cancelled: {
    title: 'redemptions.cancelledTitle',
    unit: 'redemptions.cancelledUnit',
    emptyIcon: 'file-tray-outline',
    emptyTitle: 'redemptions.cancelledEmptyTitle',
    emptySubtitle: 'redemptions.cancelledEmptyBody',
  },
};

const SELECT = `
  id,
  beneficiary_id,
  product_id,
  points_used,
  status,
  requested_at,
  delivered_at,
  cancelled_at,
  beneficiary:beneficiary_id(first_name, last_name, email),
  product:product_id(name)
`;

// Las tres pestanas se traen juntas: el mockup muestra los contadores en la
// barra de pestanas, asi que igual hace falta el total de todas.
async function loadAll(orgId: number): Promise<Row[]> {
  const { data } = await supabase
    .from('redemption')
    .select(SELECT)
    .eq('organization_id', orgId)
    .in('status', ['pending', 'delivered', 'cancelled'])
    .order('requested_at', { ascending: true });
  return (data ?? []) as unknown as Row[];
}

type State = {
  rows: Row[];
  loading: boolean;
  acting: number | null;
  tab: Tab;
  banner: boolean;
};

type Action =
  | { type: 'rows/loaded'; rows: Row[] }
  | { type: 'fetch/start' }
  | { type: 'acting/set'; id: number | null }
  | { type: 'tab/set'; tab: Tab }
  | { type: 'banner/hide' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'fetch/start':
      return { ...state, loading: true };
    case 'rows/loaded':
      return { ...state, rows: action.rows, loading: false };
    case 'acting/set':
      return { ...state, acting: action.id };
    case 'tab/set':
      return { ...state, tab: action.tab };
    case 'banner/hide':
      return { ...state, banner: false };
  }
}

// Fila de un canje. Vive afuera de la pantalla: adentro era un render-prop que
// hacia del componente principal un bloque imposible de leer de un saque.
function RedemptionRow({
  item,
  acting,
  onDeliver,
  onCancel,
  t,
}: {
  item: Row;
  acting: number | null;
  onDeliver: (row: Row) => void;
  onCancel: (row: Row) => void;
  t: Translate;
}) {
  const isPending = item.status === 'pending';
  const isCancelled = item.status === 'cancelled';
  return (
    <div
      key={item.id}
      className={cn(
        'mb-[14px] rounded-xl border bg-card p-3 shadow-[0px_1px_3px_rgba(16,24,40,0.06)]',
        isPending ? 'border-orange-line' : 'border-line',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl',
            isPending ? 'bg-orange-soft' : 'bg-green-soft',
          )}
        >
          {isCancelled ? (
            <IoCloseCircleOutline size={26} color={colors.danger} />
          ) : (
            <IoPricetagsOutline
              size={26}
              color={isPending ? colors.orange : colors.greenInk}
            />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-[17px] font-bold text-ink">
            {item.product?.name || t('redemptions.product')}
          </p>
          <p className="text-[14.5px] text-muted">
            {beneficiaryLabel(item, t)}
          </p>
          <p className="text-[13px] text-subtle">
            {isPending
              ? t('redemptions.requestedAt', {
                  date: formatRequestedAt(item.requested_at),
                })
              : isCancelled
                ? t('redemptions.cancelledAt', {
                    date: formatRequestedAt(
                      item.cancelled_at ?? item.requested_at,
                    ),
                  })
                : t('redemptions.deliveredAt', {
                    date: formatRequestedAt(
                      item.delivered_at ?? item.requested_at,
                    ),
                  })}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-lg px-[10px] py-1.5 text-[13px] font-bold text-white',
            isPending ? 'bg-orange' : 'bg-green-card',
          )}
        >
          {formatPoints(item.points_used)} {t('common.pts')}
        </span>
      </div>

      {isPending && (
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            className={cn(
              'pressable flex h-[46px] flex-1 items-center justify-center gap-2 rounded-[10px] bg-green-card',
              acting === item.id && 'opacity-60',
            )}
            onClick={() => onDeliver(item)}
            disabled={acting === item.id}
          >
            {acting === item.id ? (
              <Spinner size={20} color="#FFFFFF" />
            ) : (
              <>
                <IoCheckmarkCircle size={20} color="#FFFFFF" />
                <span className="text-[15.5px] font-bold text-white">
                  {t('redemptions.deliver')}
                </span>
              </>
            )}
          </button>
          <button
            type="button"
            className="pressable flex h-[46px] flex-1 items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-danger bg-card"
            onClick={() => onCancel(item)}
            disabled={acting === item.id}
          >
            <IoCloseCircle size={20} color={colors.danger} />
            <span className="text-[15.5px] font-bold text-danger">
              {t('redemptions.cancel')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function RedemptionsScreen() {
  const router = useRouter();
  const { appUser } = useAuth();
  const t = useT();
  // La home entra con ?tab=delivered desde "Historial de canjes".
  const tabParam = useSearchParams().get('tab');
  const [state, dispatch] = useReducer(reducer, {
    rows: [],
    loading: true,
    acting: null,
    tab:
      tabParam === 'delivered' || tabParam === 'cancelled'
        ? tabParam
        : 'pending',
    banner: true,
  });
  const { rows, loading, acting, tab, banner } = state;
  const refreshRef = useRef<(() => void) | null>(null);

  const orgId = appUser?.organization_id
    ? parseInt(appUser.organization_id)
    : null;

  useEffect(() => {
    if (!orgId) return;
    let mounted = true;

    const refresh = async () => {
      dispatch({ type: 'fetch/start' });
      const next = await loadAll(orgId);
      if (!mounted) return;
      dispatch({ type: 'rows/loaded', rows: next });
    };

    refreshRef.current = () => {
      void refresh();
    };
    void refresh();

    const channel: RealtimeChannel = supabase.channel(
      `cashier-redemptions-${orgId}`,
    );
    const bound = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'redemption',
        filter: `organization_id=eq.${orgId}`,
      },
      () => {
        void refresh();
      },
    );
    bound.subscribe();

    return () => {
      mounted = false;
      bound.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  const pending = rows.filter((r) => r.status === 'pending');
  const delivered = rows.filter((r) => r.status === 'delivered');
  // Los cancelados no se borran: quedan como registro de la operacion.
  const cancelled = rows.filter((r) => r.status === 'cancelled');
  const visible = { pending, delivered, cancelled }[tab];

  const handleDeliver = async (row: Row) => {
    dispatch({ type: 'acting/set', id: row.id });
    const { error } = await supabase.rpc('deliver_redemption', {
      p_redemption_id: row.id,
    });
    dispatch({ type: 'acting/set', id: null });
    if (error) {
      notify.error(t('redemptions.deliverFailed'), {
        description: errorMessage(t, error),
      });
      return;
    }
    // El aviso al beneficiario sale del admin: la RPC no puede mandar push.
    notifyAdmin('/api/redemption/notify', { redemptionId: row.id });
    refreshRef.current?.();
  };

  const handleCancel = async (row: Row) => {
    const ok = await confirm({
      title: t('redemptions.cancelConfirmTitle'),
      message: t('redemptions.cancelConfirmBody'),
      confirmText: t('redemptions.cancelConfirmAction'),
      cancelText: t('common.no'),
      destructive: true,
    });
    if (!ok) return;

    dispatch({ type: 'acting/set', id: row.id });
    const { error } = await supabase.rpc('cancel_redemption', {
      p_redemption_id: row.id,
      // El motivo se guarda en la base y lo leen el admin y la app del
      // beneficiario: va siempre en espanol, el idioma canonico de los datos,
      // y no en el que tenga el navegador del cajero.
      p_reason: translate('es', 'redemptions.cancelReason'),
    });
    dispatch({ type: 'acting/set', id: null });
    if (error) {
      notify.error(t('redemptions.cancelFailed'), {
        description: errorMessage(t, error),
      });
      return;
    }
    notifyAdmin('/api/redemption/notify', { redemptionId: row.id });
    refreshRef.current?.();
  };

  const copy = TAB_COPY[tab];
  const EmptyIcon =
    copy.emptyIcon === 'checkmark-done-circle'
      ? IoCheckmarkDoneCircle
      : IoFileTrayOutline;

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader
        title={t('redemptions.header')}
        tone="orange"
        onBack={() => router.replace('/')}
      />

      {/* La linea inferior de las pestanas va a sangre; las pestanas se
          alinean con el contenido. */}
      <div className="page-column shrink-0 border-b border-line bg-card">
        <div className="flex">
          {(
            [
              {
                key: 'pending',
                label: 'redemptions.tabPending',
                count: pending.length,
              },
              {
                key: 'delivered',
                label: 'redemptions.tabDelivered',
                count: delivered.length,
              },
              {
                key: 'cancelled',
                label: 'redemptions.tabCancelled',
                count: cancelled.length,
              },
            ] as const satisfies readonly {
              key: Tab;
              label: MessageKey;
              count: number;
            }[]
          ).map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                className={cn(
                  'pressable flex h-[52px] flex-1 items-center justify-center gap-2 border-b-[3px]',
                  active ? 'border-orange' : 'border-transparent',
                )}
                onClick={() => dispatch({ type: 'tab/set', tab: item.key })}
              >
                <span
                  className={cn(
                    'text-[16px]',
                    active
                      ? 'font-bold text-orange'
                      : 'font-semibold text-muted',
                  )}
                >
                  {t(item.label)}
                </span>
                <span
                  className={cn(
                    'flex h-6 min-w-6 items-center justify-center rounded-xl px-1.5 text-[13px] font-bold',
                    active ? 'bg-orange text-white' : 'bg-line-soft text-muted',
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-[60px]">
          <Spinner size={36} color={colors.orange} />
        </div>
      ) : (
        <div className="page-column no-scrollbar flex-1 overflow-y-auto p-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
          {tab === 'pending' && banner && (
            <div className="mb-[22px] flex items-center gap-3 rounded-xl bg-orange-tint p-[14px]">
              <IoTimeOutline
                size={26}
                color={colors.orange}
                className="shrink-0"
              />
              <p className="flex-1 text-[13.5px] leading-[19px] text-[#8A5209]">
                {t('redemptions.banner')}
              </p>
              <button
                type="button"
                className="pressable shrink-0"
                aria-label={t('redemptions.dismissBanner')}
                onClick={() => dispatch({ type: 'banner/hide' })}
              >
                <IoClose size={22} color={colors.muted} />
              </button>
            </div>
          )}

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16.5px] font-bold text-ink">
              {t(copy.title)}
            </h2>
            <span className="text-[14.5px] font-semibold text-orange">
              {visible.length} {t(copy.unit)}
            </span>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-[10px] py-[60px]">
              <EmptyIcon size={60} color={colors.greenCard} />
              <p className="text-[17px] font-bold text-ink">
                {t(copy.emptyTitle)}
              </p>
              <p className="text-center text-[14px] text-muted">
                {t(copy.emptySubtitle)}
              </p>
            </div>
          ) : (
            // Dos canjes por fila en una ventana ancha: son tarjetas cortas y
            // apiladas dejarian 1000px de aire a la derecha.
            <div className="lg:grid lg:grid-cols-2 lg:gap-x-[14px]">
              {visible.map((item) => (
              <RedemptionRow
                key={item.id}
                item={item}
                acting={acting}
                onDeliver={handleDeliver}
                onCancel={handleCancel}
                t={t}
              />
            ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PendingDeliveriesPage() {
  return (
    <Suspense fallback={<FullScreenSpinner color={colors.orange} />}>
      <RedemptionsScreen />
    </Suspense>
  );
}
