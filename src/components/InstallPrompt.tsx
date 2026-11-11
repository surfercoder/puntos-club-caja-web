'use client';

import Image from 'next/image';
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  FiArrowRight,
  FiChevronRight,
  FiMoreVertical,
  FiPlusSquare,
  FiShare,
  FiX,
} from 'react-icons/fi';

import { useT } from '@/contexts/I18nContext';
import type { Translate } from '@/i18n';

// Tarjeta "Instalá la app en tu celular" (mockup del ticket de acceso directo,
// 11/11/2026). Solo en celulares, solo en el navegador (ya instalada no tiene
// sentido) y una sola vez: cerrarla de cualquier forma la descarta.
const DISMISSED_KEY = 'install-prompt-dismissed';

// Clubi con el celular y la capa, recortado del mockup con su fondo: la
// izquierda se funde con un mask para que no se vea el borde del rectangulo.
const MASCOT = '/images/install/clubi-celular.png';
const ICON = '/icons/icon-192.png';

// Muestreados del mockup (la variante verde). El "Club" del logo sigue rosa.
const ACCENT = '#03A151';
const ACCENT_SOFT = '#E3F7EB';
const CARD_BG = '#EFFDF4';
const BRAND_PINK = '#FE2A74';

type Platform = 'ios' | 'android';

// Solo Chromium dispara `beforeinstallprompt`, por eso no esta en lib.dom.
type InstallEvent = Event & { prompt: () => Promise<unknown> };

function detectPlatform(): Platform | null {
  try {
    if (localStorage.getItem(DISMISSED_KEY)) return null;
  } catch {
    // Sin storage (modo privado estricto) se ofrece igual.
  }
  const standalone =
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  if (standalone || !matchMedia('(pointer: coarse)').matches) return null;
  // El iPad con iPadOS se anuncia como Mac: lo delata la pantalla tactil.
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return ios ? 'ios' : 'android';
}

const noSubscribe = () => () => {};

export default function InstallPrompt() {
  // En el servidor no hay navegador que mirar: el HTML sale sin la tarjeta y
  // aparece al hidratar, sin mismatch.
  const platform = useSyncExternalStore(noSubscribe, detectPlatform, () => null);
  const [closed, setClosed] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  // Chrome en Android deja instalar con un click: se guarda el evento y se
  // dispara desde el boton. Sin el (iOS, Firefox, Samsung) quedan los pasos.
  // Solo se escucha con la tarjeta visible: cancelar el evento en la compu o
  // ya descartada le borraria al navegador su propia oferta de instalar.
  const visible = platform !== null && !closed;
  useEffect(() => {
    if (!visible) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    addEventListener('beforeinstallprompt', onPrompt);
    return () => removeEventListener('beforeinstallprompt', onPrompt);
  }, [visible]);

  if (!platform || closed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Sin storage vuelve a aparecer en la proxima visita: no es grave.
    }
    setClosed(true);
  };

  const install = async () => {
    if (installEvent) await installEvent.prompt();
    dismiss();
  };

  return (
    <InstallDialog
      platform={platform}
      canInstall={installEvent !== null}
      onInstall={install}
      onClose={dismiss}
    />
  );
}

function Step({
  n,
  icon,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex w-[30%] flex-col items-center text-center">
      <span
        className="relative z-10 -mb-2 flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px] font-bold text-white"
        style={{ background: ACCENT }}
      >
        {n}
      </span>
      {icon}
      <span className="mt-2 text-[11.5px] leading-[15px] text-ink-soft">
        {children}
      </span>
    </li>
  );
}

const Chevron = () => (
  <FiChevronRight
    aria-hidden
    size={16}
    className="mt-[42px] shrink-0 text-subtle"
  />
);

const Wordmark = ({ className }: { className?: string }) => (
  <span className={className}>
    Puntos <span style={{ color: BRAND_PINK }}>Club</span>
  </span>
);

function InstallDialog({
  platform,
  canInstall,
  onInstall,
  onClose,
}: {
  platform: Platform;
  canInstall: boolean;
  onInstall: () => void;
  onClose: () => void;
}) {
  const t: Translate = useT();
  // <dialog> nativo, mismo patron que los modales de la caja: Escape, foco atrapado
  // y backdrop vienen del navegador. `close` no burbujea, por eso el listener
  // va a mano y el handler vive en un ref.
  const ref = useRef<HTMLDialogElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    // El <dialog> esta en el JSX de este mismo componente: el guardia existe
    // solo por el tipo.
    /* v8 ignore next */
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const close = () => onCloseRef.current();
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

  const circle = 'flex h-[52px] w-[52px] items-center justify-center rounded-full';

  return (
    <dialog
      ref={ref}
      aria-label={t('install.titleA11y')}
      className="m-auto max-h-[calc(100dvh-24px)] w-[calc(100%-32px)] max-w-[380px] overflow-y-auto rounded-[28px] bg-transparent p-0 backdrop:bg-black/50"
    >
      <div
        className="relative overflow-hidden rounded-[28px] pb-5"
        style={{ background: CARD_BG }}
      >
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="pressable absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-ink"
        >
          <FiX size={18} />
        </button>

        <div className="relative px-5 pb-6 pt-5">
          <Image
            src={MASCOT}
            alt=""
            width={382}
            height={435}
            priority
            className="pointer-events-none absolute bottom-0 right-0 h-auto w-[54%]"
            style={{
              maskImage: 'linear-gradient(to right, transparent, #000 22%)',
            }}
          />
          <div className="relative flex items-center gap-2.5">
            <Image src={ICON} alt="" width={44} height={44} />
            <div className="flex flex-col items-start">
              <Wordmark className="text-[22px] font-extrabold leading-none text-ink" />
              <span
                className="mt-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ background: ACCENT_SOFT, color: ACCENT }}
              >
                {t('install.badge')}
              </span>
            </div>
          </div>
          <h2 className="relative mt-5 max-w-[58%] whitespace-pre-line text-[28px] font-extrabold leading-[1.08] text-ink">
            {t('install.title')}
            <br />
            <span style={{ color: ACCENT }}>{t('install.titleAccent')}</span>
          </h2>
          <p className="relative mt-2 max-w-[50%] text-[13px] leading-[18px] text-ink-soft">
            {t('install.subtitle')}
          </p>
        </div>

        <div className="relative mx-4 rounded-[22px] bg-white px-3 pb-4 pt-4 shadow-[0px_6px_20px_rgba(23,10,60,0.06)]">
          <h3 className="px-1 text-[17px] font-bold text-ink">
            {t('install.easy')}
          </h3>
          <ol className="mt-3 flex items-start justify-between">
            <Step
              n={1}
              icon={
                <span className={circle} style={{ background: ACCENT_SOFT }}>
                  {platform === 'ios' ? (
                    <FiShare size={22} className="text-ink" />
                  ) : (
                    <FiMoreVertical size={22} className="text-ink" />
                  )}
                </span>
              }
            >
              {t(`install.${platform}.step1Lead`)}
              <b className="block text-ink">{t(`install.${platform}.step1`)}</b>
            </Step>
            <Chevron />
            <Step
              n={2}
              icon={
                <span className={circle} style={{ background: ACCENT_SOFT }}>
                  <FiPlusSquare size={22} className="text-ink" />
                </span>
              }
            >
              {t(`install.${platform}.step2Lead`)}
              <b className="block text-ink">{t(`install.${platform}.step2`)}</b>
            </Step>
            <Chevron />
            <Step
              n={3}
              icon={<Image src={ICON} alt="" width={52} height={52} />}
            >
              <b className="block text-ink">{t('install.step3Lead')}</b>
              {t('install.step3')} <Wordmark className="font-bold" />
            </Step>
          </ol>
        </div>

        <button
          type="button"
          onClick={onInstall}
          className="pressable mx-4 mt-5 flex h-14 w-[calc(100%-32px)] items-center justify-center gap-3 rounded-full text-[18px] font-bold text-white"
          style={{ background: ACCENT }}
        >
          {canInstall ? t('install.cta') : t('install.gotIt')}
          <FiArrowRight size={22} />
        </button>
        <p className="mt-3 text-center text-[13px] text-ink-soft">
          {t('install.footer')} 💚
        </p>
      </div>
    </dialog>
  );
}
