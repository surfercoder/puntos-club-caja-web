import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { toast } from 'sonner';

import { ConfirmHost } from '@/components/ui/confirm';
import { confirm } from '@/lib/confirm';
import { NotifyHost } from '@/components/ui/notify';
import { notify } from '@/lib/notify';
import { FullScreenSpinner, Spinner } from '@/components/ui/spinner';

jest.mock('sonner', () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('Spinner', () => {
  it('se anuncia como progressbar', () => {
    render(<Spinner />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('respeta el tamano y el color que le pasan', () => {
    render(<Spinner size={36} color="#02875B" className="mx-auto" />);
    const el = screen.getByRole('progressbar');
    expect(el).toHaveStyle({ width: '36px', height: '36px' });
    expect(el).toHaveClass('mx-auto');
  });

  it('FullScreenSpinner centra uno solo', () => {
    render(<FullScreenSpinner color="#02875B" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('notify', () => {
  it('monta el host de toasts', () => {
    render(<NotifyHost />);
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });

  it('exito, error e info van por el canal que corresponde', () => {
    notify.success('ok', { description: 'listo' });
    notify.error('mal');
    notify.info('dato');
    expect(toast.success).toHaveBeenCalledWith('ok', expect.objectContaining({ description: 'listo' }));
    expect(toast.error).toHaveBeenCalledWith('mal', expect.any(Object));
    expect(toast).toHaveBeenCalledWith('dato', undefined);
  });
});

describe('confirm', () => {
  const opciones = {
    title: 'Cancelar compra',
    confirmText: 'Si',
    cancelText: 'No',
  };

  it('resuelve true cuando el cajero confirma', async () => {
    render(<ConfirmHost />);
    const answer = confirm(opciones);
    await userEvent.click(await screen.findByRole('button', { name: 'Si' }));
    await expect(answer).resolves.toBe(true);
  });

  it('resuelve false cuando cancela', async () => {
    render(<ConfirmHost />);
    const answer = confirm(opciones);
    await userEvent.click(await screen.findByRole('button', { name: 'No' }));
    await expect(answer).resolves.toBe(false);
  });

  it('muestra el mensaje cuando lo hay', async () => {
    render(<ConfirmHost />);
    void confirm({ ...opciones, message: 'Se devuelven los puntos' });
    expect(await screen.findByText('Se devuelven los puntos')).toBeInTheDocument();
  });

  it('pinta el confirmar en rojo si es destructivo', async () => {
    render(<ConfirmHost />);
    void confirm({ ...opciones, destructive: true });
    expect(await screen.findByRole('button', { name: 'Si' })).toHaveClass('bg-danger');
  });

  it('sin host montado responde que no, que es el lado seguro', async () => {
    const { unmount } = render(<ConfirmHost />);
    unmount();
    await expect(confirm(opciones)).resolves.toBe(false);
  });

  it('cerrar el dialogo con Escape equivale a cancelar', async () => {
    render(<ConfirmHost />);
    const answer = confirm(opciones);
    await screen.findByRole('button', { name: 'Si' });
    await userEvent.keyboard('{Escape}');
    await expect(answer).resolves.toBe(false);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Si' })).not.toBeInTheDocument(),
    );
  });
});
