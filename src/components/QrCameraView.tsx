'use client';

import { BrowserQRCodeReader } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';

export type CameraPermission = 'pending' | 'granted' | 'denied';

// En movil esto lo resuelve expo-camera; en web hay que pedir la camara a mano
// y decodificar el QR con ZXing. Se usa decodeFromConstraints en vez de
// BarcodeDetector nativo porque Safari y Firefox todavia no lo tienen, y la caja
// puede estar corriendo en cualquier navegador del comercio.
//
// Requiere HTTPS: getUserMedia no existe en http salvo en localhost. En Vercel
// ya viene dado; en una prueba por IP de red local, no.
export function useQrCamera({
  onScan,
  paused,
}: {
  onScan: (text: string) => void;
  paused: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [permission, setPermission] = useState<CameraPermission>('pending');
  const [attempt, setAttempt] = useState(0);

  // El callback y el flag se guardan en refs para que reiniciar el scanner no
  // dependa de su identidad (cambian en cada render de la pantalla) — si no, el
  // efecto de abajo soltaria y volveria a pedir la camara en cada tecla.
  const onScanRef = useRef(onScan);
  const pausedRef = useRef(paused);
  useEffect(() => {
    onScanRef.current = onScan;
    pausedRef.current = paused;
  });

  useEffect(() => {
    let stopped = false;
    let controls: { stop: () => void } | undefined;

    (async () => {
      try {
        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current ?? undefined,
          (result) => {
            // ZXing dispara el callback en cada cuadro, tambien sin resultado.
            if (!result || pausedRef.current) return;
            onScanRef.current(result.getText());
          },
        );
        if (stopped) {
          controls.stop();
          return;
        }
        setPermission('granted');
      } catch {
        // NotAllowedError (el usuario dijo que no), NotFoundError (no hay
        // camara) o contexto inseguro: para el cajero es el mismo callejon, y
        // la pantalla ya le ofrece reintentar y buscar por email.
        if (!stopped) setPermission('denied');
      }
    })();

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [attempt]);

  return {
    videoRef,
    permission,
    /** Vuelve a pedir la camara (el boton "Permitir acceso"). */
    request: () => {
      setPermission('pending');
      setAttempt((n) => n + 1);
    },
  };
}
