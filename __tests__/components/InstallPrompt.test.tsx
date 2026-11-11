import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import InstallPrompt from '@/components/InstallPrompt';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
const IPAD =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/140.0';

/** Celular (pointer coarse) en el navegador, salvo que se pida otra cosa. */
function setup({
  ua = ANDROID,
  touch = true,
  standalone = false,
  touchPoints = 5,
}: {
  ua?: string;
  touch?: boolean;
  standalone?: boolean;
  touchPoints?: number;
} = {}) {
  jest.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query.includes('standalone') ? standalone : touch,
      }) as MediaQueryList,
  );
  jest.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
  Object.defineProperty(navigator, 'maxTouchPoints', {
    configurable: true,
    value: touchPoints,
  });
}

const dialogOpen = () => screen.queryByRole('dialog', { hidden: true });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  delete (navigator as { standalone?: boolean }).standalone;
});

describe('InstallPrompt', () => {
  it('no aparece en una compu', () => {
    setup({ touch: false });
    render(<InstallPrompt />);
    expect(dialogOpen()).toBeNull();
  });

  it('no aparece si ya se abrio como app instalada', () => {
    setup({ standalone: true });
    render(<InstallPrompt />);
    expect(dialogOpen()).toBeNull();
  });

  it('no aparece en el Safari ya instalado (navigator.standalone)', () => {
    setup({ ua: IPHONE });
    (navigator as { standalone?: boolean }).standalone = true;
    render(<InstallPrompt />);
    expect(dialogOpen()).toBeNull();
  });

  it('no vuelve a aparecer una vez descartada', () => {
    setup();
    localStorage.setItem('install-prompt-dismissed', '1');
    render(<InstallPrompt />);
    expect(dialogOpen()).toBeNull();
  });

  it('en iPhone muestra los pasos de Safari y "Entendido" la descarta', async () => {
    setup({ ua: IPHONE });
    render(<InstallPrompt />);
    expect(screen.getByText('Compartir')).toBeInTheDocument();
    expect(screen.getByText('“Agregar a inicio”')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Entendido/ }));
    expect(dialogOpen()).toBeNull();
    expect(localStorage.getItem('install-prompt-dismissed')).toBe('1');
  });

  it('el iPad que se anuncia como Mac cuenta como iOS', () => {
    setup({ ua: IPAD });
    render(<InstallPrompt />);
    expect(screen.getByText('Compartir')).toBeInTheDocument();
  });

  it('una Mac sin pantalla tactil no es iOS', () => {
    setup({ ua: IPAD, touchPoints: 0 });
    render(<InstallPrompt />);
    expect(screen.getByText('del navegador ⋮')).toBeInTheDocument();
  });

  it('en Android sin el evento de Chrome quedan los pasos del menu', () => {
    setup();
    render(<InstallPrompt />);
    expect(screen.getByText('“Instalar app”')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entendido/ })).toBeInTheDocument();
  });

  it('con beforeinstallprompt el boton instala de verdad', async () => {
    setup();
    render(<InstallPrompt />);
    const prompt = jest.fn().mockResolvedValue({ outcome: 'accepted' });
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
    });
    act(() => {
      window.dispatchEvent(event);
    });
    // Se corta la mini barra de Chrome: la tarjeta la reemplaza.
    expect(event.defaultPrevented).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: /Instalar app/ }));
    expect(prompt).toHaveBeenCalled();
    expect(dialogOpen()).toBeNull();
  });

  it('sin la tarjeta (compu o ya descartada) no le corta la oferta al navegador', async () => {
    const fire = () => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      act(() => {
        window.dispatchEvent(event);
      });
      return event.defaultPrevented;
    };

    setup({ touch: false });
    const { unmount } = render(<InstallPrompt />);
    expect(fire()).toBe(false);
    unmount();

    setup();
    render(<InstallPrompt />);
    await userEvent.click(screen.getByRole('button', { name: /Entendido/ }));
    expect(fire()).toBe(false);
  });

  it('la X, Escape y el backdrop la cierran; un click adentro no', async () => {
    setup();
    const { unmount } = render(<InstallPrompt />);
    fireEvent.click(screen.getByText('Es muy fácil'));
    expect(dialogOpen()).not.toBeNull();
    fireEvent.click(dialogOpen()!);
    expect(dialogOpen()).toBeNull();
    unmount();

    localStorage.clear();
    const second = render(<InstallPrompt />);
    await userEvent.keyboard('{Escape}');
    expect(dialogOpen()).toBeNull();
    second.unmount();

    localStorage.clear();
    render(<InstallPrompt />);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(dialogOpen()).toBeNull();
  });

  it('sin localStorage se ofrece igual y se cierra igual', async () => {
    setup();
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    render(<InstallPrompt />);
    await userEvent.click(screen.getByRole('button', { name: /Entendido/ }));
    expect(dialogOpen()).toBeNull();
  });
});
