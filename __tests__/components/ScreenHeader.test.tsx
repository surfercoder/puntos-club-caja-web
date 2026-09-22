import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const replace = jest.fn();
const back = jest.fn();
const router = { replace, back, push: jest.fn(), prefetch: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => router,
}));

import ScreenHeader from '@/components/ScreenHeader';
import { translate } from '@/i18n';

beforeEach(() => jest.clearAllMocks());

describe('ScreenHeader', () => {
  it('muestra el titulo', () => {
    render(<ScreenHeader title="Nueva Venta" />);
    expect(screen.getByRole('heading', { name: 'Nueva Venta' })).toBeInTheDocument();
  });

  it('llama al onBack de la pantalla', async () => {
    const onBack = jest.fn();
    render(<ScreenHeader title="x" onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: translate('es', 'common.back') }));
    expect(onBack).toHaveBeenCalled();
  });

  it('sin onBack vuelve a la home, nunca con router.back()', async () => {
    render(<ScreenHeader title="x" />);
    await userEvent.click(screen.getByRole('button', { name: translate('es', 'common.back') }));
    expect(replace).toHaveBeenCalledWith('/');
    // back() dejaria el boton muerto si la pantalla se abrio sin historial.
    expect(back).not.toHaveBeenCalled();
  });

  it('con backIcon null no dibuja boton de volver', () => {
    render(<ScreenHeader title="x" backIcon={null} />);
    expect(
      screen.queryByRole('button', { name: translate('es', 'common.back') }),
    ).not.toBeInTheDocument();
  });

  it('renderiza el slot de la derecha', () => {
    render(<ScreenHeader title="x" right={<button>perfil</button>} />);
    expect(screen.getByRole('button', { name: 'perfil' })).toBeInTheDocument();
  });

  it.each(['arrow-back', 'close', 'home'] as const)('acepta el icono %s', (backIcon) => {
    render(<ScreenHeader title="x" backIcon={backIcon} />);
    expect(
      screen.getByRole('button', { name: translate('es', 'common.back') }),
    ).toBeInTheDocument();
  });

  it('pinta la barra naranja en canjes', () => {
    const { container } = render(<ScreenHeader title="x" tone="orange" />);
    expect(container.querySelector('.bg-orange')).toBeInTheDocument();
  });

  it('acompania el ancho de formulario', () => {
    const { container } = render(<ScreenHeader title="x" width="form" />);
    expect(container.querySelector('.page-form')).toBeInTheDocument();
  });
});
