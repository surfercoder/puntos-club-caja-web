'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, {
  Suspense,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  IoAlertCircleOutline,
  IoCheckmarkCircle,
  IoPersonCircle,
  IoQrCode,
  IoReceiptOutline,
  IoSettingsSharp,
  IoStar,
} from 'react-icons/io5';

import ScreenHeader from '@/components/ScreenHeader';
import { notify } from '@/lib/notify';
import { FullScreenSpinner, Spinner } from '@/components/ui/spinner';
import { useAuth, type AppUserWithOrg } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import type { Translate } from '@/i18n';
import { loadBeneficiaryCard, type BeneficiaryCard } from '@/lib/beneficiary';
import { errorDescriptor } from '@/lib/errors';
import { notifyAdmin } from '@/lib/notify-admin';
import {
  explainPoints,
  fetchActiveRules,
  isCampaign,
  ruleParts,
  totalPoints,
  type PointsBreakdownRow,
} from '@/lib/points-rules';
import { supabase } from '@/lib/supabase/client';
import { colors, formatPoints } from '@/lib/theme';
import { cn } from '@/lib/utils';

const CARD_SHADOW = 'shadow-[0px_1px_3px_rgba(16,24,40,0.06)]';

// La bajada verde del mockup ("1 punto por cada $10 de compra"): es la misma
// regla que la RPC usa para calcular, descrita con el helper de la pantalla de
// reglas. Se muestra la regla de fondo, no las campanas con vigencia.
async function fetchRateLabel(
  organizationId: string | undefined,
  t: Translate,
): Promise<string> {
  try {
    const rules = await fetchActiveRules(organizationId);
    const base = rules.find((rule) => !isCampaign(rule)) ?? rules[0];
    if (!base) return '';
    const { value, unit } = ruleParts(base, t);
    const rate = `${value} ${unit}`;
    return base.rule_type === 'fixed_amount' ? t('sale.rateSuffix', { rate }) : rate;
  } catch {
    return '';
  }
}

// La venta se atribuye a la sucursal del cajero: de ahi salen las reglas que
// aplican (una regla con branch_id suma solo en la suya) y el branch_id de la
// compra. Todavia ningun app_user tiene branch_id cargado, asi que el fallback
// es la sucursal mas vieja de la organizacion; va ordenado por id porque sin
// `order` Postgres puede devolver cualquiera y dos ventas iguales darian puntos
// distintos. PGRST116 es "la organizacion no tiene sucursales" y es valido
// (branch null). Cualquier otro error si importa: con branch null las reglas
// atadas a una sucursal no aplican y el cliente cobraria de menos.
async function fetchBranchId(
  organizationId: string | undefined,
  cashierBranchId: string | null | undefined,
): Promise<number | null> {
  if (cashierBranchId) return parseInt(cashierBranchId);
  const { data, error } = await supabase
    .from('branch')
    .select('id')
    // organizationId siempre viene cargado: sin el la ficha del cliente no carga
    // y este formulario no se dibuja. El fallback existe solo porque el tipo lo
    // deja opcional, asi que la rama es inalcanzable.
    /* v8 ignore next */
    .eq('organization_id', organizationId || 0)
    .order('id', { ascending: true })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.id ?? null;
}

// El desglose reemplaza al total suelto: las reglas suman entre si, asi que el
// cajero tiene que ver de donde sale cada punto. El total nunca se calcula
// aparte, siempre es la suma de estas filas.
type Quote = { branchId: number | null; rows: PointsBreakdownRow[] };

async function quoteFor(
  amount: number,
  organizationId: string | undefined,
  cashierBranchId: string | null | undefined,
): Promise<Quote | null> {
  try {
    const branchId = await fetchBranchId(organizationId, cashierBranchId);
    const rows = await explainPoints(amount, organizationId, branchId);
    return rows ? { branchId, rows } : null;
  } catch {
    return null;
  }
}

// La venta ya calculada y esperando el OK del cajero: es la fila que se va a
// insertar tal cual. Los puntos que se guardan son estos mismos, no un
// recalculo, asi que lo que el cajero confirma es exactamente lo que se asigna.
type PendingSale = {
  points: number;
  breakdown: PointsBreakdownRow[];
  amount: number;
  branchId: number | null;
  beneficiaryId: number;
  cashierId: number;
  organizationId: number;
};

type State = {
  amount: string;
  loading: boolean;
  calculating: boolean;
  breakdown: PointsBreakdownRow[] | null;
  rateLabel: string;
  showSuccess: boolean;
  earnedPoints: number;
  pending: PendingSale | null;
};

type Action =
  | { type: 'amount/set'; amount: string }
  | { type: 'loading/set'; loading: boolean }
  | { type: 'calculating/set'; calculating: boolean }
  | { type: 'points/set'; breakdown: PointsBreakdownRow[] | null }
  | { type: 'rate/set'; label: string }
  | { type: 'confirm/open'; pending: PendingSale }
  | { type: 'confirm/close' }
  | { type: 'success/show'; earnedPoints: number };

const initialState: State = {
  amount: '',
  loading: false,
  calculating: false,
  breakdown: null,
  rateLabel: '',
  showSuccess: false,
  earnedPoints: 0,
  pending: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'amount/set':
      return { ...state, amount: action.amount };
    case 'loading/set':
      return { ...state, loading: action.loading };
    case 'calculating/set':
      return { ...state, calculating: action.calculating };
    case 'points/set':
      return { ...state, breakdown: action.breakdown, calculating: false };
    case 'rate/set':
      return { ...state, rateLabel: action.label };
    case 'confirm/open':
      return { ...state, pending: action.pending, loading: false };
    case 'confirm/close':
      return { ...state, pending: null, loading: false };
    case 'success/show':
      return {
        ...state,
        showSuccess: true,
        earnedPoints: action.earnedPoints,
        loading: false,
        pending: null,
      };
  }
}

function CustomerCard({
  name,
  email,
  availablePoints,
  t,
}: {
  name: string;
  email: string;
  availablePoints: string;
  t: Translate;
}) {
  return (
    <div
      className={cn(
        'mb-5 flex items-center rounded-2xl bg-card p-4',
        CARD_SHADOW,
      )}
    >
      <span className="mr-3 shrink-0">
        <IoPersonCircle size={48} color={colors.greenCard} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[18px] font-bold text-ink">{name}</p>
        <p className="mb-2 truncate text-[14px] text-muted">{email}</p>
        <span className="inline-flex items-center gap-[10px] rounded-xl bg-green-tint px-3 py-[5px]">
          <IoStar size={14} color={colors.greenInk} />
          <span className="text-[12px] font-semibold text-green-ink">
            {t('sale.currentPoints', {
              points: formatPoints(parseInt(availablePoints)),
            })}
          </span>
        </span>
      </div>
    </div>
  );
}

// Desglose regla por regla. Las reglas suman, asi que sin esta lista el cajero
// ve un total que no coincide con ninguna regla suelta y parece un error.
function PointsBreakdown({
  rows,
  compact,
  t,
}: {
  rows: PointsBreakdownRow[];
  compact?: boolean;
  t: Translate;
}) {
  if (!rows.length) return null;
  return (
    <div
      className={cn(
        'flex w-full flex-col gap-2 self-stretch border-t pt-[10px]',
        compact ? 'mb-1 mt-1 border-line' : 'mt-3 border-green-line',
      )}
    >
      {rows.map((row) => {
        const { value, unit } = ruleParts(row, t);
        return (
          <div key={row.rule_id} className="flex items-center gap-[10px]">
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[13.5px] font-bold text-ink">{row.name}</p>
              <p className="mt-px truncate text-[12px] text-muted">
                {value} {unit}
              </p>
            </div>
            <span className="shrink-0 text-[15px] font-extrabold text-green-ink">
              +{formatPoints(row.points)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ConfirmModal({
  pending,
  beneficiaryName,
  loading,
  onConfirm,
  onClose,
  t,
}: {
  pending: PendingSale;
  beneficiaryName: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
  t: Translate;
}) {
  // <dialog> nativo: Escape y foco atrapado los pone el navegador. Mientras la
  // compra se esta guardando, cancelar el evento deja el dialogo abierto.
  //
  // `close` y `cancel` no burbujean, asi que van a mano: como props de React la
  // delegacion no los entrega y el dialogo quedaba cerrado pero montado.
  const ref = useRef<HTMLDialogElement | null>(null);
  // onClose vive en un ref para que el efecto no se vuelva a suscribir cuando
  // el padre re-renderiza y le cambia la identidad al handler. Se actualiza en
  // un efecto y no en el render: escribir un ref durante el render es un
  // efecto secundario (mismo patron que useQrCamera).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    // El <dialog> esta en el JSX de este mismo componente: cuando corre el
    // efecto el ref ya apunta. El guardia existe solo por el tipo.
    /* v8 ignore next */
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const close = () => onCloseRef.current();
    dialog.addEventListener('close', close);
    return () => dialog.removeEventListener('close', close);
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    /* v8 ignore next -- mismo caso que arriba: el ref siempre apunta. */
    if (!dialog) return;
    if (!loading) return;
    const block = (event: Event) => event.preventDefault();
    dialog.addEventListener('cancel', block);
    return () => dialog.removeEventListener('cancel', block);
  }, [loading]);

  return (
    <dialog
      ref={ref}
      aria-label={t('sale.confirmTitle')}
      className="m-auto max-w-[400px] bg-transparent p-5 backdrop:bg-black/70"
    >
      <div className="flex w-full flex-col items-center rounded-[20px] bg-white p-6">
        <span className="mb-3 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-orange-soft">
          <IoAlertCircleOutline size={34} color={colors.orange} />
        </span>

        <h2 className="mb-[14px] text-[20px] font-extrabold text-ink">
          {t('sale.confirmTitle')}
        </h2>
        <p className="text-[14px] text-muted">{t('sale.confirmLead')}</p>

        {/* El numero es lo unico que el cajero tiene que mirar: se lleva todo el
            ancho y baja de cuerpo en pantallas angostas (el caso de los
            1.200.000 puntos que motivo esta confirmacion). */}
        <p className="my-0.5 whitespace-nowrap text-[clamp(28px,11vw,44px)] font-bold leading-tight text-green-card">
          {formatPoints(pending.points)}
        </p>
        <p className="mb-[18px] text-center text-[16px] font-semibold text-ink">
          {t(
            pending.points === 1 ? 'sale.confirmUnitOne' : 'sale.confirmUnitMany',
            { name: beneficiaryName },
          )}
        </p>

        <div className="flex w-full items-center justify-between rounded-xl bg-line-soft px-[14px] py-3">
          <span className="text-[14px] text-muted">
            {t('sale.confirmAmountLabel')}
          </span>
          <span className="text-[16px] font-bold text-ink">
            ${pending.amount.toFixed(2)}
          </span>
        </div>

        <PointsBreakdown rows={pending.breakdown} compact t={t} />

        <p className="mb-[18px] mt-[14px] text-center text-[13px] leading-[18px] text-muted">
          {t('sale.confirmHint')}
        </p>

        <button
          type="button"
          className={cn(
            'pressable flex h-[52px] w-full items-center justify-center rounded-xl',
            loading ? 'bg-subtle' : 'bg-green-card',
          )}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? (
            <Spinner size={20} color="#FFFFFF" />
          ) : (
            <span className="text-[16px] font-bold text-white">
              {t('sale.confirmAction')}
            </span>
          )}
        </button>

        <button
          type="button"
          className="pressable w-full py-[14px] text-[15px] font-semibold text-muted"
          onClick={onClose}
          disabled={loading}
        >
          {t('sale.confirmCancel')}
        </button>
      </div>
    </dialog>
  );
}

// Pantalla de venta registrada. Es un render alternativo completo: afuera de
// NewSaleScreen para que el componente principal no cargue con dos pantallas.
function SaleSuccess({
  beneficiaryName,
  earnedPoints,
  amount,
  t,
}: {
  beneficiaryName: string;
  earnedPoints: number;
  amount: string;
  t: Translate;
}) {
  const router = useRouter();
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <ScreenHeader width="form" title={t('sale.successHeader')} backIcon={null} />
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center bg-bg p-6">
        <IoCheckmarkCircle size={80} color={colors.greenCard} className="mb-4" />
        <h1 className="mb-2 text-[28px] font-bold text-ink">
          {t('sale.successTitle')}
        </h1>
        <p className="mb-6 text-[18px] text-muted">{beneficiaryName}</p>

        <div className="mb-6 flex flex-col items-center rounded-[20px] bg-green-card px-12 py-8">
          <p className="mb-2 text-[14px] text-green-soft">
            {t('sale.pointsEarned')}
          </p>
          <p className="text-[64px] font-bold leading-none text-white">
            {formatPoints(earnedPoints)}
          </p>
        </div>

        <div className="mb-8 w-full rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-muted">
              {t('sale.detailAmount')}
            </span>
            <span className="text-[18px] font-semibold text-ink">
              ${parseFloat(amount).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            className="pressable flex items-center justify-center rounded-xl border-2 border-green-card bg-white p-4"
            onClick={() => router.replace('/scanner')}
          >
            <IoQrCode size={20} color={colors.greenCard} />
            <span className="ml-2 text-[16px] font-semibold text-green-card">
              {t('sale.scanAnother')}
            </span>
          </button>
          <button
            type="button"
            className="pressable rounded-xl bg-green-card p-4 text-[16px] font-semibold text-white"
            onClick={() => router.replace('/')}
          >
            {t('sale.finish')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Campo del monto de la compra. Afuera de NewSaleScreen: el componente
// principal ya carga con el calculo de puntos, la confirmacion y la venta.
function AmountField({
  amount,
  onChange,
  t,
}: {
  amount: string;
  onChange: (next: string) => void;
  t: Translate;
}) {
  return (
      <div className={cn('mb-5 rounded-2xl bg-card p-5', CARD_SHADOW)}>
        <label
          htmlFor="amount"
          className="mb-3 block text-[14px] text-muted"
        >
          {t('sale.amountLabel')}
        </label>
        <div className="flex items-center">
          <span className="mr-2 text-[36px] font-bold text-green-ink">$</span>
          <input
            id="amount"
            // inputMode decimal abre el teclado numerico del celular; type
            // number agregaria las flechitas y comeria la coma en algunos
            // locales.
            type="text"
            inputMode="decimal"
            autoFocus
            className="w-full min-w-0 flex-1 bg-transparent p-0 text-[56px] font-bold text-ink caret-green-card outline-none placeholder:text-ink"
            value={amount}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="mt-5 h-px bg-line" />
        <div className="mt-4 flex items-center gap-3">
          <IoReceiptOutline size={20} color={colors.greenInk} className="shrink-0" />
          <span className="text-[13px] text-muted">{t('sale.amountHint')}</span>
        </div>
      </div>
  );
}

// Igual que en /scanned-user: por la URL va solo el id y los datos del cliente
// se cargan aca. Sin cliente no hay venta que cargar: se avisa y se vuelve a la
// home en vez de dejar un formulario sin nombre.
// La bajada verde ("1 punto por cada $10 de compra") se rearma al cambiar de
// idioma, por eso `t` entra en las deps.
function useRateLabel(
  organizationId: string | undefined,
  dispatch: React.Dispatch<Action>,
  t: Translate,
) {
  useEffect(() => {
    let mounted = true;
    fetchRateLabel(organizationId, t).then((label) => {
      if (mounted) dispatch({ type: 'rate/set', label });
    });
    return () => {
      mounted = false;
    };
  }, [organizationId, dispatch, t]);
}

// Puntos a ganar mientras el cajero escribe, con debounce para no pegarle a la
// RPC en cada tecla.
function usePointsQuote(
  amount: string,
  organizationId: string | undefined,
  branchId: string | null | undefined,
  dispatch: React.Dispatch<Action>,
) {
  useEffect(() => {
    const parsed = parseFloat(amount);
    if (!amount || parsed <= 0 || isNaN(parsed)) {
      dispatch({ type: 'points/set', breakdown: null });
      return;
    }
    let mounted = true;
    dispatch({ type: 'calculating/set', calculating: true });
    const timer = setTimeout(async () => {
      const quote = await quoteFor(parsed, organizationId, branchId);
      if (mounted) dispatch({ type: 'points/set', breakdown: quote?.rows ?? null });
    }, 300);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [amount, organizationId, branchId, dispatch]);
}

function useBeneficiaryCard(
  beneficiaryId: string,
  organizationId: string | undefined,
  t: Translate,
) {
  const router = useRouter();
  const [card, setCard] = useState<BeneficiaryCard | null>(null);

  useEffect(() => {
    if (!beneficiaryId || !organizationId) return;
    let mounted = true;
    loadBeneficiaryCard(beneficiaryId, organizationId).then((next) => {
      if (!mounted) return;
      if (next) {
        setCard(next);
        return;
      }
      notify.error(t('common.error'), { description: t('scanner.userNotFound') });
      router.replace('/');
    });
    return () => {
      mounted = false;
    };
  }, [beneficiaryId, organizationId, router, t]);

  return card;
}

function useSaleSubmission({
  amount,
  beneficiaryId,
  appUser,
  dispatch,
  t,
}: {
  amount: string;
  beneficiaryId: string;
  appUser: AppUserWithOrg | null;
  dispatch: React.Dispatch<Action>;
  t: Translate;
}) {
  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      notify.error(t('common.error'), { description: t('sale.invalidAmount') });
      return;
    }

    // Inalcanzable desde la UI: sin los dos ids la ficha del cliente no carga
    // y el formulario no llega a dibujarse. Queda porque es lo que le da el
    // tipo `string` a los parseInt de abajo.
    /* v8 ignore next 4 */
    if (!beneficiaryId || !appUser?.organization_id) {
      notify.error(t('common.error'), { description: t('sale.missingData') });
      return;
    }

    dispatch({ type: 'loading/set', loading: true });
    const purchaseAmount = parseFloat(amount);

    const quote = await quoteFor(
      purchaseAmount,
      appUser.organization_id,
      appUser.branch_id,
    );

    if (!quote) {
      notify.error(t('common.error'), { description: t('sale.registerFailed') });
      dispatch({ type: 'loading/set', loading: false });
      return;
    }

    // Nada se guarda hasta que el cajero ve cuantos puntos son y confirma: el
    // caso que motivo esto fue una regla con multiplicador alto asignando
    // 1.200.000 puntos sin que nadie lo notara.
    dispatch({
      type: 'confirm/open',
      pending: {
        points: totalPoints(quote.rows),
        breakdown: quote.rows,
        amount: purchaseAmount,
        branchId: quote.branchId,
        beneficiaryId: parseInt(beneficiaryId),
        cashierId: parseInt(appUser.id),
        organizationId: parseInt(appUser.organization_id),
      },
    });
  };

  // `disabled={loading}` no alcanza: el state recien se aplica en el proximo
  // render, asi que dos clicks seguidos entran los dos e insertan dos compras.
  const confirming = useRef(false);

  const handleConfirm = async (sale: PendingSale) => {
    if (confirming.current) return;
    confirming.current = true;
    dispatch({ type: 'loading/set', loading: true });

    const { error: purchaseError } = await supabase.from('purchase').insert({
      beneficiary_id: sale.beneficiaryId,
      cashier_id: sale.cashierId,
      branch_id: sale.branchId,
      organization_id: sale.organizationId,
      total_amount: sale.amount,
      points_earned: sale.points,
      notes: t('sale.note'),
    });
    confirming.current = false;

    if (purchaseError) {
      // El trigger check_purchase_membership frena la venta si el cliente dejo
      // de seguir al club: hay que volver a sumarlo antes de cargarle puntos.
      // El resto de los fallos no se distinguen para el cajero: reintentar.
      const { key } = errorDescriptor(purchaseError);
      notify.error(t('common.error'), {
        description: t(
          key === 'error.rpc.membershipInactive' ? key : 'sale.registerFailed',
        ),
      });
      dispatch({ type: 'confirm/close' });
      return;
    }

    dispatch({ type: 'success/show', earnedPoints: sale.points });

    notifyAdmin('/api/purchase/notify', {
      beneficiaryId: sale.beneficiaryId,
      pointsEarned: sale.points,
      totalAmount: sale.amount,
      organizationId: sale.organizationId,
    });
  };


  return { handleSubmit, handleConfirm };
}

// Los puntos que va a ganar la venta, con el desglose por regla debajo (o la
// bajada de la regla de fondo si todavia no hay monto).
function PointsPreview({
  breakdown,
  calculating,
  rateLabel,
  t,
}: {
  breakdown: PointsBreakdownRow[] | null;
  calculating: boolean;
  rateLabel: string;
  t: Translate;
}) {
  return (
      <div className="mb-8 flex flex-col items-center rounded-2xl bg-green-tint px-6 py-5">
        <p className="mb-2 text-[14px] font-semibold text-green-ink">
          {t('sale.previewLabel')}
        </p>
        {/* El numero y el "pts" van juntos y centrados como grupo: el mockup
            dibuja el "0" centrado con el "pts" colgando, pero con "1,250" eso
            queda torcido. */}
        <div className="flex min-h-[66px] items-end justify-center">
          {calculating ? (
            <Spinner size={20} color={colors.greenInk} className="mb-4" />
          ) : (
            <>
              <span className="text-[56px] font-bold leading-none text-green-ink">
                {formatPoints(breakdown ? totalPoints(breakdown) : 0)}
              </span>
              <span className="mb-[10px] ml-1 text-[16px] font-bold text-green-ink">
                {t('common.pts')}
              </span>
            </>
          )}
        </div>
        {breakdown?.length ? (
          <PointsBreakdown rows={breakdown} t={t} />
        ) : rateLabel && !calculating ? (
          <p className="mt-2 text-center text-[13px] text-muted">{rateLabel}</p>
        ) : null}
      </div>
  );
}

function NewSaleScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const { appUser } = useAuth();
  const t = useT();
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    amount,
    loading,
    calculating,
    breakdown,
    rateLabel,
    showSuccess,
    earnedPoints,
    pending,
  } = state;

  const beneficiaryId = search.get('beneficiaryId') ?? '';
  const organizationId = appUser?.organization_id;
  const card = useBeneficiaryCard(beneficiaryId, organizationId, t);

  // Volver desde la venta es volver a la ficha del cliente. Antes era un
  // router.back() pelado, que no hacia nada si la pantalla se abria sin
  // historial propio (link directo, PWA, pestana nueva).
  const backToClient = () =>
    router.replace(`/scanned-user?beneficiaryId=${beneficiaryId}`);

  const beneficiaryEmail = card?.email ?? '';
  const availablePointsParam = String(card?.availablePoints ?? 0);
  const beneficiaryName = card?.name || t('common.client');

  useRateLabel(organizationId, dispatch, t);

  usePointsQuote(amount, organizationId, appUser?.branch_id, dispatch);

  // Registrar la venta: cotizar, confirmar y guardar. Va en un hook para que
  // NewSaleScreen no acumule el flujo entero ademas del render.
  const { handleSubmit, handleConfirm } = useSaleSubmission({
    amount,
    beneficiaryId,
    appUser,
    dispatch,
    t,
  });

  if (showSuccess) {
    return (
      <SaleSuccess
        beneficiaryName={beneficiaryName}
        earnedPoints={earnedPoints}
        amount={amount}
        t={t}
      />
    );
  }

  if (!card) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col">
        <ScreenHeader width="form" title={t('sale.header')} onBack={backToClient} />
        <FullScreenSpinner color={colors.green} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <ScreenHeader
        width="form"
        title={t('sale.header')}
        onBack={backToClient}
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
      <div className="page-column page-form no-scrollbar flex-1 overflow-y-auto bg-bg p-4">
        <CustomerCard
          name={beneficiaryName}
          email={beneficiaryEmail}
          availablePoints={availablePointsParam}
          t={t}
        />

        <AmountField
          amount={amount}
          onChange={(next) => dispatch({ type: 'amount/set', amount: next })}
          t={t}
        />

        <PointsPreview
          breakdown={breakdown}
          calculating={calculating}
          rateLabel={rateLabel}
          t={t}
        />

        <button
          type="button"
          className={cn(
            'pressable mb-3 flex h-[66px] w-full items-center justify-center rounded-2xl',
            !amount || loading ? 'bg-subtle' : 'bg-green-card',
          )}
          onClick={handleSubmit}
          disabled={!amount || loading}
        >
          {loading ? (
            <Spinner size={20} color="#FFFFFF" />
          ) : (
            <>
              <IoCheckmarkCircle size={28} color="#FFFFFF" />
              <span className="ml-3 text-[18px] font-bold text-white">
                {t('sale.submit')}
              </span>
            </>
          )}
        </button>

        <button
          type="button"
          className="pressable w-full p-4 text-[16px] font-semibold text-green-ink"
          onClick={backToClient}
        >
          {t('common.cancel')}
        </button>
      </div>

      {pending ? (
        <ConfirmModal
          pending={pending}
          beneficiaryName={beneficiaryName}
          loading={loading}
          onConfirm={() => handleConfirm(pending)}
          onClose={() => dispatch({ type: 'confirm/close' })}
          t={t}
        />
      ) : null}
    </div>
  );
}

export default function NewSalePage() {
  return (
    <Suspense fallback={<FullScreenSpinner color={colors.green} />}>
      <NewSaleScreen />
    </Suspense>
  );
}
