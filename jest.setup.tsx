import '@testing-library/jest-dom';

// next/image en jsdom: se rinde como <img> plano. Las props que solo entiende
// el optimizador de Next no existen en el DOM y React avisa por cada una.
const NEXT_ONLY_IMAGE_PROPS = [
  'priority',
  'fill',
  'quality',
  'placeholder',
  'blurDataURL',
  'unoptimized',
  'loader',
  'sizes',
];

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...rest }: Record<string, unknown>) => {
    const props = { ...rest };
    for (const key of NEXT_ONLY_IMAGE_PROPS) delete props[key];
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={typeof src === 'string' ? src : (src as { src: string }).src}
        alt={String(alt ?? '')}
        {...props}
      />
    );
  },
}));

// El QR se dibuja con <canvas>/SVG y no aporta nada a las assertions: lo unico
// que importa en los tests es que se le pase el value correcto.
jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid='qr-code' data-value={value} />
  ),
}));

// Las suites con @jest-environment node no tienen DOM: todo lo de abajo es
// para jsdom y ahi no hace falta (ni existe) nada de esto.
const hasDom = typeof globalThis.window !== 'undefined';

// jsdom no trae las APIs de camara que usa @zxing.
if (hasDom) {
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    writable: true,
    configurable: true,
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      }),
    },
  });

  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  }

  if (typeof globalThis.matchMedia === 'undefined') {
    Object.defineProperty(globalThis, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  }

  // HTMLMediaElement.play no esta implementado en jsdom (lo usa el <video> del
  // scanner) y sin este stub tira 'Not implemented'.
  Object.defineProperty(globalThis.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: jest.fn().mockResolvedValue(undefined),
  });
}

// jsdom no implementa <dialog>: showModal/close existen pero tiran
// "not implemented". Se emula lo justo que usan los modales — el atributo
// `open`, el evento close, y Escape disparando `cancel` (cancelable, como en el
// navegador) para poder testear que la venta en curso no se cierra sola.
if (hasDom) {
  const proto = globalThis.HTMLDialogElement.prototype;
  const openDialogs = new Set<HTMLDialogElement>();

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    for (const dialog of openDialogs) {
      if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) {
        dialog.close();
      }
    }
  });

  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
    openDialogs.add(this);
  };

  proto.close = function close(this: HTMLDialogElement) {
    openDialogs.delete(this);
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
