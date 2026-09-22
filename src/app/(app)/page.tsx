'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect, useRef, useState } from 'react';
import { MdHistory } from 'react-icons/md';
import {
  IoChevronForward,
  IoCloseCircle,
  IoHeadsetOutline,
  IoLogOutOutline,
  IoMailOutline,
  IoNotificationsOutline,
  IoPricetagOutline,
  IoQrCode,
  IoSearch,
  IoTime,
} from 'react-icons/io5';

import { confirm } from '@/lib/confirm';
import { notify } from '@/lib/notify';
import { useAuth, type AppUserWithOrg } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import type { MessageKey, Translate } from '@/i18n';
import { campaignStatus, fetchActiveRules, isCampaign } from '@/lib/points-rules';
import { supabase } from '@/lib/supabase/client';
import { colors, initials } from '@/lib/theme';
import { cn } from '@/lib/utils';

// El mail del owner no viaja en el appUser: RLS solo deja al cajero leer su
// propia fila, asi que sale de una RPC. Se pide al montar y no al hacer click:
// despues de un `await` el navegador ya no toma el click como gesto del usuario
// y se traga la apertura del cliente de mail. Con la direccion en mano, la
// tarjeta es un <a href="mailto:"> comun — igual que la del login.
function useOwnerEmail(organizationId: string | null | undefined) {
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_my_owner_email');
      // El corte por desmontaje va solo y primero: mezclado con las otras
      // condiciones no se lee que este setState esta protegido.
      if (cancelled) return;
      if (error || typeof data !== 'string' || !data) return;
      setOwnerEmail(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return ownerEmail;
}

async function fetchPendingCount(
  organizationId: string | null | undefined,
): Promise<number> {
  if (!organizationId) return 0;
  const { count } = await supabase
    .from('redemption')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', parseInt(organizationId))
    .eq('status', 'pending');
  return count ?? 0;
}

// El mockup separa "campanas" (reglas con vigencia) de "reglas generales" (las
// permanentes); la clasificacion vive en lib/points-rules para que la cuenta de
// esta tarjeta y la pantalla de detalle no se separen.
type RuleCounts = { campaigns: number; general: number };

// Plural via diccionario: en ingles el sufijo no es el mismo y la posicion del
// numero tampoco tiene por que serlo.
const plural = (t: Translate, n: number, one: MessageKey, many: MessageKey) =>
  n === 1 ? t(one) : t(many, { count: n });

const CARD_SHADOW = 'shadow-[0px_1px_3px_rgba(16,24,40,0.06)]';

// Fila de "Mas opciones". El margen inferior desaparece en pantalla ancha,
// donde las dos filas conviven en una grilla que ya pone su propio hueco.
// Interior de la tarjeta de ayuda: lo comparten el <a> y el boton de respaldo.
function HelpCardFace({ t }: { t: Translate }) {
  return (
    <>
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-green-soft">
        <IoHeadsetOutline size={20} color={colors.greenInk} />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold text-ink">
          {t('home.helpTitle')}
        </span>
        <span className="text-[13px] text-muted">{t('home.helpSub')}</span>
      </span>
      <IoChevronForward size={20} color={colors.subtle} className="shrink-0" />
    </>
  );
}

const ROW_CARD =
  'pressable mb-3 flex w-full items-center gap-3 rounded-[14px] border border-line bg-card p-3 text-left md:mb-0';

// Tarjeta grande de accion: cuadrado de color, titulo, bajada y chevron. Las
// tres del mockup (escanear / pendientes / buscar) solo cambian de color.
function ActionCard({
  icon,
  iconBg,
  iconColor,
  border,
  title,
  titleColor,
  subtitle,
  chevronColor,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  border: string;
  title: string;
  titleColor?: string;
  subtitle: string;
  chevronColor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'pressable mb-3 flex w-full items-center gap-[14px] rounded-[14px] border-[1.5px] bg-card p-3 text-left md:mb-0',
        CARD_SHADOW,
      )}
      style={{ borderColor: border }}
    >
      <span
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </span>
      <span className="flex flex-1 flex-col gap-[3px]">
        <span
          className="text-[18px] font-bold text-ink"
          style={titleColor ? { color: titleColor } : undefined}
        >
          {title}
        </span>
        <span className="text-[13px] leading-[18px] text-muted">{subtitle}</span>
      </span>
      <IoChevronForward size={22} color={chevronColor} className="shrink-0" />
    </button>
  );
}

// Campanita del header: con canjes pendientes muestra el badge y lleva a la
// pantalla de entregas; sin pendientes solo avisa que no hay nada que entregar.
function NotificationBell({ count, t }: { count: number; t: Translate }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="pressable relative text-white"
      aria-label={
        count > 0
          ? t('home.notificationsWithCount', {
              count: plural(
                t,
                count,
                'plural.pendingRedemptionOne',
                'plural.pendingRedemptionMany',
              ),
            })
          : t('home.notifications')
      }
      onClick={() =>
        count > 0
          ? router.push('/pending-deliveries')
          : notify.info(t('home.notifications'), {
              description: t('home.noPendingDeliveries'),
            })
      }
    >
      <IoNotificationsOutline size={24} />
      {count > 0 ? (
        <span className="absolute -right-[5px] -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-green bg-orange px-1 text-[10.5px] font-extrabold text-white">
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </button>
  );
}

// QR de la organizacion en grande: el beneficiario lo escanea desde su app.
function OrganizationQrModal({
  onClose,
  organizationName,
  qrData,
  t,
}: {
  onClose: () => void;
  organizationName: string;
  qrData: string;
  t: Translate;
}) {
  // <dialog> nativo: Escape, foco atrapado y backdrop vienen del navegador, en
  // vez de un listener de teclado propio. El componente se monta solo mientras
  // esta abierto, asi que showModal va una sola vez.
  //
  // El listener de `close` va a mano y no como prop de React: `close` no
  // burbujea, asi que la delegacion de eventos de React no lo entrega y el
  // modal quedaba cerrado pero montado — sin volver a abrirse nunca.
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
    // Solo el click en el ::backdrop, que llega al propio <dialog>: tocar el QR
    // no puede cerrarlo justo cuando el beneficiario lo esta escaneando.
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) onCloseRef.current();
    };
    dialog.addEventListener('close', close);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('close', close);
      dialog.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={t('home.qrModalTitle', { name: organizationName })}
      className="m-auto max-w-[400px] bg-transparent p-5 backdrop:bg-black/70"
    >
      <div className="relative w-full rounded-[20px] bg-card p-6 text-center">
        <button
          type="button"
          className="pressable absolute right-3 top-3 z-10"
          aria-label={t('common.close')}
          onClick={onClose}
        >
          <IoCloseCircle size={32} color={colors.subtle} />
        </button>

        <h2 className="mb-2 text-[21px] font-extrabold text-green-ink">
          {t('home.qrModalTitle', { name: organizationName })}
        </h2>
        <p className="mb-[22px] text-[14px] text-muted">
          {t('home.qrModalSubtitle')}
        </p>

        <div className="mx-auto mb-4 w-fit rounded-2xl border-[3px] border-green-card bg-card p-[18px]">
          <QRCodeSVG value={qrData} size={260} bgColor="#FFFFFF" fgColor={colors.green} />
        </div>

        <p className="text-[12px] text-subtle">{t('home.qrModalHint')}</p>
      </div>
    </dialog>
  );
}

// Tarjeta del cajero al pie de la home. Afuera de HomePage para que el cuerpo
// de la pantalla se lea de un saque.
function CashierCard({
  appUser,
  fullName,
  t,
}: {
  appUser: AppUserWithOrg | null;
  fullName: string;
  t: Translate;
}) {
  const router = useRouter();
  return (
        <div
          className={cn(
            'mb-4 flex items-center gap-3 rounded-[14px] border border-line bg-card p-3',
            CARD_SHADOW,
          )}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-soft text-[15px] font-extrabold text-green-ink">
            {initials(appUser?.first_name, appUser?.last_name, appUser?.email)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-[15px] font-bold text-ink">{fullName}</p>
            <div className="flex items-center gap-1.5">
              <IoMailOutline size={14} color={colors.subtle} className="shrink-0" />
              <span className="min-w-0 shrink truncate text-[12.5px] text-subtle">
                {appUser?.email}
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-lg px-2 py-[3px] text-[11.5px] font-bold',
                  appUser?.active
                    ? 'bg-green-soft text-green-ink'
                    : 'bg-danger-soft text-danger',
                )}
              >
                {t(appUser?.active ? 'common.active' : 'common.inactive')}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="pressable flex shrink-0 items-center gap-px"
            onClick={() => router.push('/profile')}
          >
            <span className="text-[14px] font-bold text-green-ink">
              {t('home.edit')}
            </span>
            <IoChevronForward size={15} color={colors.greenInk} />
          </button>
        </div>
  );
}

// Hero verde de la home: mascota, saludo y la tarjeta de la organizacion con
// su QR. Afuera de HomePage para que el cuerpo de la pantalla se lea de un saque.
function HomeHero({
  appUser,
  organizationName,
  onShowQr,
  t,
}: {
  appUser: AppUserWithOrg | null;
  organizationName: string;
  onShowQr: () => void;
  t: Translate;
}) {
  // El hueco solo a partir de lg: al centrar la fila a lo alto el saludo
  // sube justo hasta la mano levantada de la mascota. En el telefono el
  // texto arranca mas abajo y va pegado, como en la app.
  return (
        <div className="mb-[14px] flex items-end overflow-hidden rounded-2xl bg-green-card pb-[14px] pr-4 lg:gap-7">
          {/* El fondo del PNG esta pintado con greenCard exacto, asi que la
              mascota se funde con la tarjeta: se apoya en el borde, sin margen. */}
          <Image
            src="/images/home/mascot.png"
            alt=""
            width={118}
            height={152}
            className="mt-2 h-[152px] w-[118px] shrink-0 object-contain"
          />
          {/* En el telefono el saludo y la organizacion van uno debajo del
              otro, como en la app. A partir de lg entran lado a lado y la fila
              se centra a lo alto contra la mascota, que sigue apoyada abajo
              (por eso `self-center` aca y no `items-center` en el padre). */}
          <div className="min-w-0 flex-1 pt-[18px] lg:flex lg:items-center lg:gap-6 lg:self-center lg:pb-[18px] lg:pt-[18px]">
            <div className="min-w-0 lg:flex-1">
              <p className="text-[25px] font-extrabold text-white">
                {t('home.greeting', {
                  name: appUser?.first_name || t('common.cashier'),
                })}
              </p>
              <p className="mt-1 text-[14.5px] text-[#EAF7F1]">
                {t('home.greetingSub')}
              </p>
            </div>
            <div
              className="mt-[14px] flex items-center gap-[10px] rounded-xl p-3 md:max-w-[420px] lg:mt-0 lg:w-[420px] lg:shrink-0"
              style={{ backgroundColor: colors.onGreen }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold tracking-[1.1px] text-[#D6EEE4]">
                  {t('home.organizationLabel')}
                </p>
                <p className="mt-0.5 truncate text-[21px] font-extrabold text-white">
                  {organizationName}
                </p>
              </div>
              {appUser?.organization_id ? (
                <button
                  type="button"
                  className="pressable p-1 text-white"
                  aria-label={t('home.orgQrLabel')}
                  onClick={onShowQr}
                >
                  <IoQrCode size={26} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { appUser, signOut } = useAuth();
  const t = useT();
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [rules, setRules] = useState<RuleCounts>({ campaigns: 0, general: 0 });

  const organizationId = appUser?.organization_id;
  const ownerEmail = useOwnerEmail(organizationId);

  useEffect(() => {
    fetchPendingCount(organizationId).then(setPendingCount);
  }, [organizationId]);

  useEffect(() => {
    fetchActiveRules(organizationId).then((rows) => {
      // is_active no alcanza: una campana puede estar activa y ya haber
      // terminado (o no haber arrancado). La home dice "aplicandose ahora",
      // asi que solo cuentan las vigentes hoy. /points-rules si las lista
      // todas, con su chip de "Terminada" / "Programada".
      const campaigns = rows.filter(isCampaign);
      setRules({
        campaigns: campaigns.filter((rule) => campaignStatus(rule) === 'active')
          .length,
        general: rows.length - campaigns.length,
      });
    });
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    const orgId = parseInt(organizationId);
    // ponytail: topic unico por montaje para no reusar un canal que todavia no
    // se removio (removeChannel es async) — reusarlo tira "cannot add
    // postgres_changes callbacks after subscribe()".
    const channel: RealtimeChannel = supabase.channel(
      `home-pending-${orgId}-${Date.now()}`,
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
        fetchPendingCount(organizationId).then(setPendingCount);
      },
    );
    bound.subscribe();
    return () => {
      bound.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const organizationName =
    (appUser?.organization as { name?: string } | null | undefined)?.name ||
    t('common.noOrganization');
  const fullName =
    `${appUser?.first_name || ''} ${appUser?.last_name || ''}`.trim() ||
    t('common.cashier');
  const qrData = JSON.stringify({
    type: 'organization',
    id: appUser?.organization_id,
    name: organizationName,
  });

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

  const helpMailto = ownerEmail
    ? `mailto:${ownerEmail}?subject=${encodeURIComponent(
        t('help.subject', { name: fullName, organization: organizationName }),
      )}`
    : null;

  const rulesSubtitle =
    rules.campaigns + rules.general === 0
      ? t('home.rulesEmpty')
      : t('home.rulesSummary', {
          campaigns: plural(
            t,
            rules.campaigns,
            'plural.campaignOne',
            'plural.campaignMany',
          ),
          general: plural(
            t,
            rules.general,
            'plural.generalRuleOne',
            'plural.generalRuleMany',
          ),
        });

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <div className="shrink-0 bg-green pt-[env(safe-area-inset-top)]">
        {/* Barra a sangre, titulo alineado con el contenido de abajo. */}
        <div className="page-column">
          <div className="flex h-[46px] items-center justify-between px-[18px]">
            <h1 className="text-[20px] font-bold text-white">
              {t('home.title')}
            </h1>
            <NotificationBell count={pendingCount} t={t} />
          </div>
        </div>
      </div>

      <div className="page-column no-scrollbar flex-1 overflow-y-auto p-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <HomeHero
          appUser={appUser ?? null}
          organizationName={organizationName}
          onShowQr={() => setQrModalVisible(true)}
          t={t}
        />

        {/* Las tres acciones principales van en fila en una ventana ancha: en
            columna dejarian media pantalla vacia. */}
        <div className="md:mb-3 md:grid md:grid-cols-3 md:gap-3">
        <ActionCard
          icon={<IoQrCode size={28} />}
          iconBg={colors.greenCard}
          iconColor="#FFFFFF"
          border={colors.greenCard}
          title={t('home.scanClient')}
          subtitle={t('home.scanClientSub')}
          chevronColor={colors.greenCard}
          onClick={() => router.push('/scanner')}
        />

        <ActionCard
          icon={<IoTime size={28} />}
          iconBg={colors.orange}
          iconColor="#FFFFFF"
          border={colors.orange}
          title={t('home.pendingDeliveries')}
          titleColor={colors.orange}
          subtitle={t('home.pendingWaiting', {
            count: plural(
              t,
              pendingCount,
              'plural.redemptionOne',
              'plural.redemptionMany',
            ),
          })}
          chevronColor={colors.orange}
          onClick={() => router.push('/pending-deliveries')}
        />

        <ActionCard
          icon={<IoSearch size={28} />}
          iconBg={colors.greenSoft}
          iconColor={colors.greenInk}
          border={colors.line}
          title={t('home.searchClient')}
          subtitle={t('home.searchClientSub')}
          chevronColor={colors.muted}
          onClick={() => router.push('/search-beneficiary')}
        />
        </div>

        <div className="mb-5 mt-1 flex items-center gap-3 rounded-[14px] border border-green-line bg-green-tint p-3">
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-green-soft">
            <IoPricetagOutline size={20} color={colors.greenInk} />
          </span>
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-[15px] font-bold text-green-ink">
              {t('home.rulesTitle')}
            </p>
            <p className="text-[13px] leading-[18px] text-muted">{rulesSubtitle}</p>
          </div>
          <button
            type="button"
            className="pressable flex shrink-0 items-center gap-[2px] rounded-[10px] border border-green-line bg-card px-3 py-[9px]"
            onClick={() => router.push('/points-rules')}
          >
            <span className="text-[14px] font-bold text-green-ink">
              {t('home.rulesView')}
            </span>
            <IoChevronForward size={15} color={colors.greenInk} />
          </button>
        </div>

        <h2 className="mb-[10px] text-[15px] font-bold text-ink-soft">
          {t('home.moreOptions')}
        </h2>

        <div className="md:mb-3 md:grid md:grid-cols-2 md:gap-3">
        <button
          type="button"
          className={cn(ROW_CARD, CARD_SHADOW)}
          onClick={() => router.push('/pending-deliveries?tab=delivered')}
        >
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-green-soft">
            <MdHistory size={22} color={colors.greenInk} />
          </span>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-bold text-ink">
              {t('home.redemptionHistory')}
            </span>
            <span className="text-[13px] text-muted">
              {t('home.redemptionHistorySub')}
            </span>
          </span>
          <IoChevronForward size={20} color={colors.subtle} className="shrink-0" />
        </button>

        {/* Sin direccion la tarjeta sigue existiendo pero avisa por que no
            puede abrir el mail, en vez de ser un link muerto. */}
        {helpMailto ? (
          <a href={helpMailto} className={cn(ROW_CARD, CARD_SHADOW)}>
            <HelpCardFace t={t} />
          </a>
        ) : (
          <button
            type="button"
            className={cn(ROW_CARD, CARD_SHADOW)}
            onClick={() =>
              notify.error(t('help.title'), {
                description: t('help.noOwnerEmail'),
              })
            }
          >
            <HelpCardFace t={t} />
          </button>
        )}
        </div>

        <CashierCard appUser={appUser ?? null} fullName={fullName} t={t} />

        <button
          type="button"
          className="pressable flex h-[52px] w-full items-center justify-center gap-[10px] rounded-xl bg-danger-soft md:mx-auto md:max-w-[320px]"
          onClick={handleSignOut}
        >
          <IoLogOutOutline size={22} color={colors.danger} />
          <span className="text-[16px] font-bold text-danger">
            {t('signOut.action')}
          </span>
        </button>
      </div>

      {qrModalVisible ? (
        <OrganizationQrModal
          onClose={() => setQrModalVisible(false)}
          organizationName={organizationName}
          qrData={qrData}
          t={t}
        />
      ) : null}
    </div>
  );
}
