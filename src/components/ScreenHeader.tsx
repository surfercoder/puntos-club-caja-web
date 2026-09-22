'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { IoArrowBack, IoClose, IoHome } from 'react-icons/io5';

import { useT } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';

/** Ancho de la columna de contenido; tiene que coincidir con el de la pantalla
 *  o el titulo queda desalineado con lo que hay abajo. */
export type PageWidth = 'wide' | 'form';

// Barra superior del mockup: bloque de color a sangre (verde en casi toda la
// app, naranja en canjes), flecha de volver y titulo. `right` es el slot del
// icono de la derecha (el circulito de perfil en "Mi Perfil").
export default function ScreenHeader({
  title,
  tone = 'green',
  right,
  onBack,
  backIcon = 'arrow-back',
  width = 'wide',
}: {
  title: string;
  tone?: 'green' | 'orange';
  right?: React.ReactNode;
  // Sin onBack se vuelve a la home. No usa router.back(): si la pantalla se
  // abrio sin historial propio (link directo, PWA, pestana nueva) el boton no
  // haria nada y el cajero queda encerrado.
  onBack?: () => void;
  // null deja la barra sin boton de volver (pantallas de resultado, donde
  // retroceder volveria a un formulario ya enviado).
  backIcon?: 'arrow-back' | 'close' | 'home' | null;
  width?: PageWidth;
}) {
  const router = useRouter();
  const t = useT();
  const Icon =
    backIcon === 'close' ? IoClose : backIcon === 'home' ? IoHome : IoArrowBack;

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden pt-[env(safe-area-inset-top)]',
        tone === 'orange' ? 'bg-orange' : 'bg-green',
      )}
    >
      {/* El bloque de color va a sangre; la fila se centra con el resto del
          contenido de la pantalla. */}
      <div className={cn('page-column', width === 'form' && 'page-form')}>
        <div className="flex h-[46px] items-center">
          {backIcon ? (
            <button
              type="button"
              className="pressable -my-2 px-[18px] py-2 text-white"
              aria-label={t('common.back')}
              onClick={() => (onBack ? onBack() : router.replace('/'))}
            >
              <Icon size={24} />
            </button>
          ) : (
            <div className="px-[18px]" />
          )}
          <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold text-white">
            {title}
          </h1>
          {right ? <div className="px-[18px]">{right}</div> : null}
        </div>
      </div>
    </div>
  );
}
