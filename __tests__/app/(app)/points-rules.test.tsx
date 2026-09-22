import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { es, renderApp } from '../../_helpers/render';

const replace = jest.fn();
const router = { replace, push: jest.fn(), back: jest.fn(), prefetch: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => router }));

const fetchActiveRules = jest.fn();
jest.mock('@/lib/points-rules', () => ({
  ...jest.requireActual('@/lib/points-rules'),
  fetchActiveRules: (...a: unknown[]) => fetchActiveRules(...a),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ appUser: { organization_id: '7' } }),
}));

import PointsRulesPage from '@/app/(app)/points-rules/page';
import type { PointsRule } from '@/lib/points-rules';

const rule = (over: Partial<PointsRule> = {}): PointsRule => ({
  id: 1,
  name: 'regla',
  display_name: null,
  description: null,
  rule_type: 'fixed_amount',
  config: { points_per_dollar: 1 },
  is_default: false,
  display_icon: null,
  display_color: null,
  start_date: null,
  end_date: null,
  days_of_week: null,
  time_start: null,
  time_end: null,
  ...over,
});

const madre = rule({ id: 1, is_default: true, display_name: '1 punto por $1' });

const futuro = () => String(new Date().getFullYear() + 2);
const pasado = () => String(new Date().getFullYear() - 2);

beforeEach(() => {
  jest.clearAllMocks();
  fetchActiveRules.mockResolvedValue([]);
});

describe('carga', () => {
  it('muestra el spinner antes de tener las reglas', () => {
    fetchActiveRules.mockReturnValue(new Promise(() => {}));
    renderApp(<PointsRulesPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sin reglas muestra el estado vacio', async () => {
    renderApp(<PointsRulesPage />);
    expect(await screen.findByText(es('rules.emptyTitle'))).toBeInTheDocument();
  });
});

describe('regla madre', () => {
  it('se muestra como "siempre activa"', async () => {
    fetchActiveRules.mockResolvedValue([madre]);
    renderApp(<PointsRulesPage />);

    expect(await screen.findByText(es('rules.motherSection'))).toBeInTheDocument();
    expect(screen.getByText('1 punto por $1')).toBeInTheDocument();
    expect(screen.getByText(es('rules.alwaysActive'))).toBeInTheDocument();
  });

  it('cae al nombre interno si no tiene display_name', async () => {
    fetchActiveRules.mockResolvedValue([rule({ is_default: true, name: 'base_rule' })]);
    renderApp(<PointsRulesPage />);
    expect(await screen.findByText('base_rule')).toBeInTheDocument();
  });
});

describe('campanas', () => {
  it('una campana vigente se ve como campana', async () => {
    fetchActiveRules.mockResolvedValue([
      madre,
      rule({ id: 2, display_name: 'Especial Invierno', start_date: `${pasado()}-06-21`, end_date: `${futuro()}-09-21` }),
    ]);
    renderApp(<PointsRulesPage />);

    expect(await screen.findByText('Especial Invierno')).toBeInTheDocument();
    expect(screen.getByText(es('rules.statusActive'))).toBeInTheDocument();
  });

  it('una campana vencida se marca como terminada, no se esconde', async () => {
    fetchActiveRules.mockResolvedValue([
      rule({ id: 2, display_name: 'Vieja', start_date: `${pasado()}-01-01`, end_date: `${pasado()}-12-31` }),
    ]);
    renderApp(<PointsRulesPage />);

    expect(await screen.findByText('Vieja')).toBeInTheDocument();
    expect(screen.getByText(es('rules.statusEnded'))).toBeInTheDocument();
  });

  it('una campana que todavia no arranco se marca como programada', async () => {
    fetchActiveRules.mockResolvedValue([
      rule({ id: 2, display_name: 'Verano', start_date: `${futuro()}-01-01` }),
    ]);
    renderApp(<PointsRulesPage />);

    expect(await screen.findByText(es('rules.statusScheduled'))).toBeInTheDocument();
  });

  it('muestra las condiciones de dias y horario', async () => {
    fetchActiveRules.mockResolvedValue([
      rule({ id: 2, display_name: 'Finde', start_date: `${pasado()}-01-01`, days_of_week: [6], time_start: '09:00:00', time_end: '18:00:00' }),
    ]);
    renderApp(<PointsRulesPage />);

    expect(await screen.findByText(es('rules.whenApplies'))).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(es('rule.timeRange', { from: '09:00', to: '18:00' }))),
    ).toBeInTheDocument();
  });
});

describe('otras reglas', () => {
  it('una regla sin vigencia que no es la madre igual se lista', async () => {
    fetchActiveRules.mockResolvedValue([madre, rule({ id: 3, display_name: 'Extra' })]);
    renderApp(<PointsRulesPage />);

    expect(
      await screen.findByText(`${es('rules.otherRules')} (1)`),
    ).toBeInTheDocument();
    expect(screen.getByText('Extra')).toBeInTheDocument();
  });
});

describe('navegacion', () => {
  it('la flecha vuelve a la home, tambien mientras carga', async () => {
    fetchActiveRules.mockReturnValue(new Promise(() => {}));
    renderApp(<PointsRulesPage />);
    await userEvent.click(screen.getByRole('button', { name: es('common.back') }));
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('y con las reglas cargadas', async () => {
    fetchActiveRules.mockResolvedValue([madre]);
    renderApp(<PointsRulesPage />);
    await screen.findByText(es('rules.motherSection'));
    await userEvent.click(screen.getByRole('button', { name: es('common.back') }));
    expect(replace).toHaveBeenCalledWith('/');
  });
});

describe('detalles de presentacion', () => {
  it('muestra la descripcion de la regla madre y el icono de la campana', async () => {
    fetchActiveRules.mockResolvedValue([
      rule({ id: 1, is_default: true, display_name: 'Base', description: 'Suma siempre' }),
      rule({
        id: 2,
        display_name: 'Invierno',
        description: 'Solo en julio',
        display_icon: '⭐',
        start_date: `${pasado()}-01-01`,
        end_date: `${futuro()}-12-31`,
      }),
    ]);
    renderApp(<PointsRulesPage />);

    expect(await screen.findByText('Suma siempre')).toBeInTheDocument();
    expect(screen.getByText('Solo en julio')).toBeInTheDocument();
    expect(screen.getByText('⭐')).toBeInTheDocument();
  });
});

describe('color e identidad de la campana', () => {
  it('usa el color de la campana si es un hex valido', async () => {
    fetchActiveRules.mockResolvedValue([
      rule({ id: 2, display_name: 'Roja', display_color: '#FF0000', start_date: `${pasado()}-01-01` }),
    ]);
    const { container } = renderApp(<PointsRulesPage />);
    await screen.findByText('Roja');
    expect(container.innerHTML).toContain('#FF0000');
  });

  it('un color invalido cae al azul, en vez de romper el estilo', async () => {
    fetchActiveRules.mockResolvedValue([
      rule({ id: 2, display_name: 'Rara', display_color: 'javascript:alert(1)', start_date: `${pasado()}-01-01` }),
    ]);
    const { container } = renderApp(<PointsRulesPage />);
    await screen.findByText('Rara');
    expect(container.innerHTML).not.toContain('javascript:');
  });

  it('una campana sin display_name usa el nombre interno', async () => {
    fetchActiveRules.mockResolvedValue([
      rule({ id: 2, name: 'winter_2026', display_name: null, start_date: `${pasado()}-01-01` }),
    ]);
    renderApp(<PointsRulesPage />);
    expect(await screen.findByText('winter_2026')).toBeInTheDocument();
  });

  it('la regla madre sin condiciones dice que aplica a todo', async () => {
    fetchActiveRules.mockResolvedValue([rule({ is_default: true, days_of_week: [3] })]);
    renderApp(<PointsRulesPage />);
    expect(await screen.findByText(es('day.3'))).toBeInTheDocument();
  });
});
