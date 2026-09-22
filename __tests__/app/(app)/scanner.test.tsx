import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { es, renderApp } from '../../_helpers/render';
import { createSupabaseMock } from '../../_helpers/supabase';

const replace = jest.fn();
const router = { replace, push: jest.fn(), back: jest.fn(), prefetch: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => router,
}));

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

jest.mock('@/lib/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// La camara real es @zxing: el test controla el permiso y dispara los escaneos.
const camera = { permission: 'granted' as 'pending' | 'granted' | 'denied' };
let emitScan: (text: string) => void = () => {};
const request = jest.fn();
jest.mock('@/components/QrCameraView', () => ({
  useQrCamera: ({ onScan }: { onScan: (t: string) => void }) => {
    emitScan = onScan;
    return { videoRef: { current: null }, permission: camera.permission, request };
  },
}));

import ScannerPage from '@/app/(app)/scanner/page';
import { notify as notifyModule } from '@/lib/notify';

const notify = jest.mocked(notifyModule);

const scan = (payload: unknown) =>
  act(async () => {
    emitScan(typeof payload === 'string' ? payload : JSON.stringify(payload));
  });

beforeEach(() => {
  jest.clearAllMocks();
  db.reset();
  camera.permission = 'granted';
});

describe('escaneo', () => {
  it('con un QR valido va a la ficha pasando solo el id', async () => {
    db.queue({ data: { id: 42 }, error: null });
    renderApp(<ScannerPage />);

    await scan({ type: 'beneficiary', id: 42 });

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/scanned-user?beneficiaryId=42'),
    );
    // El email del cliente no puede viajar en la URL.
    expect(replace.mock.calls[0][0]).not.toContain('@');
  });

  it('acepta el id como string', async () => {
    db.queue({ data: { id: 42 }, error: null });
    renderApp(<ScannerPage />);
    await scan({ type: 'beneficiary', id: '42' });
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/scanned-user?beneficiaryId=42'),
    );
  });

  it.each([
    ['un QR de otra cosa', { type: 'organization', id: 1 }, 'scanner.invalidQr'],
    ['un QR sin id', { type: 'beneficiary' }, 'scanner.invalidQr'],
    ['un id que no es numero', { type: 'beneficiary', id: 'abc' }, 'scanner.invalidId'],
  ] as const)('%s avisa y no navega', async (_label, payload, key) => {
    renderApp(<ScannerPage />);
    await scan(payload);

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('common.error'),
        expect.objectContaining({ description: es(key) }),
      ),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('un texto que no es JSON es "QR ilegible", no un error de servidor', async () => {
    renderApp(<ScannerPage />);
    await scan('no soy json');
    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('common.error'),
        expect.objectContaining({ description: es('scanner.readFailed') }),
      ),
    );
  });

  it('si el cliente no existe avisa sin filtrar el id interno', async () => {
    db.queue({ data: null, error: { code: 'PGRST116' } });
    renderApp(<ScannerPage />);
    await scan({ type: 'beneficiary', id: 999 });

    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    const { description } = notify.error.mock.calls[0][1] as { description: string };
    expect(description).toBe(es('scanner.userNotFound'));
    expect(description).not.toContain('999');
  });
});

describe('permiso de camara', () => {
  it('denegado ofrece reintentar', async () => {
    camera.permission = 'denied';
    renderApp(<ScannerPage />);

    await userEvent.click(
      screen.getByRole('button', { name: es('scanner.permissionAction') }),
    );
    expect(request).toHaveBeenCalled();
  });

  it('denegado, "Volver" lleva a la home y no usa router.back()', async () => {
    camera.permission = 'denied';
    renderApp(<ScannerPage />);
    await userEvent.click(screen.getByRole('button', { name: es('common.back') }));
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('mientras pide permiso muestra el spinner', () => {
    camera.permission = 'pending';
    renderApp(<ScannerPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('cerrar', () => {
  it('la X lleva a la home: es la unica salida de una camara a pantalla completa', async () => {
    renderApp(<ScannerPage />);
    await userEvent.click(screen.getByRole('button', { name: es('common.close') }));
    expect(replace).toHaveBeenCalledWith('/');
  });
});

describe('errores de servidor al buscar el cliente', () => {
  it('un fallo de red sale como problema de conexion, no como "QR ilegible"', async () => {
    db.client.from.mockImplementationOnce(() => {
      throw new TypeError('Failed to fetch');
    });
    renderApp(<ScannerPage />);
    await scan({ type: 'beneficiary', id: 42 });

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        es('common.error'),
        expect.objectContaining({ description: es('error.network') }),
      ),
    );
  });
});

describe('doble lectura', () => {
  it('el segundo escaneo se ignora mientras el primero esta en curso', async () => {
    db.queueTable('beneficiary', { data: { id: 42 }, error: null });
    renderApp(<ScannerPage />);

    await scan({ type: 'beneficiary', id: 42 });
    await scan({ type: 'beneficiary', id: 99 });

    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith('/scanned-user?beneficiaryId=42');
  });
});
