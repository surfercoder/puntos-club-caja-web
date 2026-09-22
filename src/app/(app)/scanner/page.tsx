'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { IoCameraOutline, IoClose } from 'react-icons/io5';

import { useQrCamera } from '@/components/QrCameraView';
import { notify } from '@/lib/notify';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/contexts/I18nContext';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

// Esquina del marco de escaneo: cuatro de estas, rotadas por posicion.
const CORNER = 'absolute h-[30px] w-[30px] border-[4px] border-green-card';

export default function ScannerPage() {
  const router = useRouter();
  const t = useT();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  const fail = (message: string) => {
    setLoading(false);
    setScanned(false);
    notify.error(t('common.error'), { description: message });
  };

  const handleScan = async (data: string) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);

    try {
      const qrData = JSON.parse(data);

      if (qrData.type !== 'beneficiary' || !qrData.id) {
        fail(t('scanner.invalidQr'));
        return;
      }

      const beneficiaryIdInt =
        typeof qrData.id === 'number' ? qrData.id : parseInt(qrData.id, 10);

      if (isNaN(beneficiaryIdInt)) {
        fail(t('scanner.invalidId'));
        return;
      }

      const { data: beneficiary, error: beneficiaryError } = await supabase
        .from('beneficiary')
        .select('id')
        .eq('id', beneficiaryIdInt)
        .single();

      if (beneficiaryError || !beneficiary) {
        // Sin el id en el mensaje: es un dato interno y no le sirve al cajero.
        fail(t('scanner.userNotFound'));
        return;
      }

      // Solo el id: la ficha (nombre, email, puntos) la carga /scanned-user.
      // replace y no push: volver atras desde la ficha tiene que llevar a la
      // home, no a la camara que acaba de leer ese mismo QR.
      router.replace(`/scanned-user?beneficiaryId=${beneficiary.id}`);
    } catch (error) {
      // Un JSON invalido no es un error de servidor: el QR no es el que toca.
      fail(
        error instanceof SyntaxError
          ? t('scanner.readFailed')
          : errorMessage(t, error),
      );
    }
  };

  const { videoRef, permission, request } = useQrCamera({
    onScan: handleScan,
    paused: scanned,
  });

  if (permission === 'denied') {
    return (
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-bg p-6 text-center">
        <div className="mb-[18px] flex h-[68px] w-[68px] items-center justify-center rounded-full bg-green-soft">
          <IoCameraOutline size={34} color={colors.greenInk} />
        </div>
        <h1 className="mb-[10px] text-[23px] font-extrabold text-ink">
          {t('scanner.permissionTitle')}
        </h1>
        <p className="mb-6 text-[15.5px] leading-[22px] text-muted">
          {t('scanner.permissionBody')}
        </p>
        <button
          type="button"
          className="pressable mb-2 flex h-[52px] items-center justify-center rounded-xl bg-green-card px-8 text-[16.5px] font-bold text-white"
          onClick={request}
        >
          {t('scanner.permissionAction')}
        </button>
        <button
          type="button"
          className="pressable px-8 py-[14px] text-[16px] font-semibold text-muted"
          onClick={() => router.replace('/')}
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh flex-1 bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
      />

      {permission === 'pending' ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size={36} color={colors.greenCard} />
        </div>
      ) : null}

      <div className="absolute inset-0 flex flex-col">
        <div className="flex justify-end px-[18px] pt-[calc(10px+env(safe-area-inset-top))]">
          <button
            type="button"
            className="pressable flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white"
            aria-label={t('common.close')}
            onClick={() => router.replace('/')}
          >
            <IoClose size={24} />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="relative h-[250px] w-[250px]">
            <span className={cn(CORNER, 'left-0 top-0 rounded-tl-xl border-b-0 border-r-0')} />
            <span className={cn(CORNER, 'right-0 top-0 rounded-tr-xl border-b-0 border-l-0')} />
            <span className={cn(CORNER, 'bottom-0 left-0 rounded-bl-xl border-r-0 border-t-0')} />
            <span className={cn(CORNER, 'bottom-0 right-0 rounded-br-xl border-l-0 border-t-0')} />
          </div>
        </div>

        <div className="flex flex-col items-center pb-[100px]">
          <p className="rounded-[22px] bg-black/55 px-5 py-[11px] text-center text-[15.5px] font-semibold text-white">
            {t('scanner.instruction')}
          </p>
          {loading ? <Spinner size={20} color="#FFFFFF" className="mt-4" /> : null}
        </div>
      </div>
    </div>
  );
}
