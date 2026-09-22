import { act, renderHook, waitFor } from '@testing-library/react';

type Callback = (result: { getText: () => string } | undefined) => void;

const stop = jest.fn();
const decodeFromConstraints = jest.fn();
jest.mock('@zxing/browser', () => ({
  BrowserQRCodeReader: jest.fn().mockImplementation(() => ({
    decodeFromConstraints,
  })),
}));

import { useQrCamera } from '@/components/QrCameraView';

/** Guarda el callback que la pantalla le pasa a ZXing para dispararlo a mano. */
let emit: Callback = () => {};
const cameraWorks = () =>
  decodeFromConstraints.mockImplementation(async (_c, _v, cb: Callback) => {
    emit = cb;
    return { stop };
  });

beforeEach(() => {
  jest.clearAllMocks();
  cameraWorks();
});

describe('useQrCamera', () => {
  it('pide la camara trasera y queda en granted', async () => {
    const { result } = renderHook(() => useQrCamera({ onScan: jest.fn(), paused: false }));

    await waitFor(() => expect(result.current.permission).toBe('granted'));
    expect(decodeFromConstraints).toHaveBeenCalledWith(
      { video: { facingMode: 'environment' } },
      undefined,
      expect.any(Function),
    );
  });

  it('avisa cada lectura', async () => {
    const onScan = jest.fn();
    renderHook(() => useQrCamera({ onScan, paused: false }));
    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled());

    act(() => emit({ getText: () => 'hola' }));
    expect(onScan).toHaveBeenCalledWith('hola');
  });

  it('ZXing dispara el callback en cada cuadro: sin resultado no avisa', async () => {
    const onScan = jest.fn();
    renderHook(() => useQrCamera({ onScan, paused: false }));
    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled());

    act(() => emit(undefined));
    expect(onScan).not.toHaveBeenCalled();
  });

  it('en pausa ignora las lecturas', async () => {
    const onScan = jest.fn();
    const { rerender } = renderHook(
      ({ paused }) => useQrCamera({ onScan, paused }),
      { initialProps: { paused: false } },
    );
    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled());

    rerender({ paused: true });
    act(() => emit({ getText: () => 'hola' }));
    expect(onScan).not.toHaveBeenCalled();
  });

  it('cambiar de callback no reinicia la camara', async () => {
    const { rerender } = renderHook<
      ReturnType<typeof useQrCamera>,
      { onScan: (t: string) => void }
    >(({ onScan }) => useQrCamera({ onScan, paused: false }), {
      initialProps: { onScan: jest.fn() },
    });
    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalledTimes(1));

    rerender({ onScan: jest.fn() });
    expect(decodeFromConstraints).toHaveBeenCalledTimes(1);
  });

  it('si el permiso se niega queda en denied', async () => {
    decodeFromConstraints.mockRejectedValue(new Error('NotAllowedError'));
    const { result } = renderHook(() => useQrCamera({ onScan: jest.fn(), paused: false }));
    await waitFor(() => expect(result.current.permission).toBe('denied'));
  });

  it('request vuelve a pedir la camara', async () => {
    decodeFromConstraints.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { result } = renderHook(() => useQrCamera({ onScan: jest.fn(), paused: false }));
    await waitFor(() => expect(result.current.permission).toBe('denied'));

    cameraWorks();
    act(() => result.current.request());
    await waitFor(() => expect(result.current.permission).toBe('granted'));
    expect(decodeFromConstraints).toHaveBeenCalledTimes(2);
  });

  it('al desmontar apaga la camara', async () => {
    const { unmount } = renderHook(() => useQrCamera({ onScan: jest.fn(), paused: false }));
    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled());

    unmount();
    await waitFor(() => expect(stop).toHaveBeenCalled());
  });

  it('si se desmonta antes de que la camara arranque, la apaga igual', async () => {
    let resolve!: (v: { stop: () => void }) => void;
    decodeFromConstraints.mockReturnValue(new Promise((r) => { resolve = r; }));

    const { result, unmount } = renderHook(() =>
      useQrCamera({ onScan: jest.fn(), paused: false }),
    );
    unmount();
    await act(async () => resolve({ stop }));

    expect(stop).toHaveBeenCalled();
    expect(result.current.permission).toBe('pending');
  });
});
