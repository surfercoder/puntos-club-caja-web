import { translate, type MessageKey } from '@/i18n';
import {
  campaignStatus,
  formatRuleDate,
  isCampaign,
  ruleBadge,
  ruleConditions,
  ruleParts,
  rulePeriod,
  totalPoints,
  type PointsRule,
} from '@/lib/points-rules';

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translate('es', key, params);

const rule = (over: Partial<PointsRule> = {}): PointsRule => ({
  id: 1,
  name: 'regla',
  display_name: null,
  description: null,
  rule_type: 'fixed_amount',
  config: { points_per_dollar: 1 },
  is_default: true,
  display_icon: null,
  display_color: null,
  start_date: null,
  end_date: null,
  days_of_week: null,
  time_start: null,
  time_end: null,
  ...over,
});

describe('isCampaign', () => {
  it('es campana si tiene alguna fecha de vigencia', () => {
    expect(isCampaign(rule({ start_date: '2026-01-01' }))).toBe(true);
    expect(isCampaign(rule({ end_date: '2026-01-01' }))).toBe(true);
  });

  it('sin fechas es regla general', () => {
    expect(isCampaign(rule())).toBe(false);
  });
});

describe('campaignStatus', () => {
  const hoy = '2026-09-22';

  it('programada si todavia no arranco', () => {
    expect(campaignStatus(rule({ start_date: '2026-10-01' }), hoy)).toBe('scheduled');
  });

  it('terminada si ya vencio', () => {
    expect(campaignStatus(rule({ end_date: '2026-09-21' }), hoy)).toBe('ended');
  });

  it('activa el mismo dia que arranca y el mismo dia que termina', () => {
    expect(campaignStatus(rule({ start_date: hoy }), hoy)).toBe('active');
    expect(campaignStatus(rule({ end_date: hoy }), hoy)).toBe('active');
  });

  it('una regla sin fechas siempre esta activa', () => {
    expect(campaignStatus(rule(), hoy)).toBe('active');
  });

  it('usa el dia de hoy si no le pasan uno', () => {
    expect(campaignStatus(rule({ end_date: '1999-01-01' }))).toBe('ended');
    expect(campaignStatus(rule({ start_date: '2999-01-01' }))).toBe('scheduled');
  });
});

describe('formatRuleDate', () => {
  it('parte el string en vez de usar new Date, que correria un dia en AR', () => {
    expect(formatRuleDate('2026-08-01')).toBe('1/8/2026');
  });

  it('tolera un timestamp completo', () => {
    expect(formatRuleDate('2026-08-01T00:00:00Z')).toBe('1/8/2026');
  });
});

describe('ruleParts', () => {
  it('fixed_per_sale', () => {
    expect(ruleParts(rule({ rule_type: 'fixed_per_sale', config: { points_per_sale: 50 } }), t))
      .toEqual({ value: t('rule.pointsValueMany', { points: '50' }), unit: t('rule.perSale') });
  });

  it('fixed_amount', () => {
    expect(ruleParts(rule({ rule_type: 'fixed_amount', config: { points_per_dollar: 1 } }), t))
      .toEqual({ value: t('rule.pointsValueOne', { points: '1' }), unit: t('rule.perDollar') });
  });

  it('percentage', () => {
    expect(ruleParts(rule({ rule_type: 'percentage', config: { percentage: 10 } }), t))
      .toEqual({ value: '10%', unit: t('rule.percentOfAmount') });
  });

  it('fixed_per_item', () => {
    expect(ruleParts(rule({ rule_type: 'fixed_per_item', config: { points_per_item: 5 } }), t).unit)
      .toBe(t('rule.perItem'));
  });

  it('tiered no tiene un valor unico', () => {
    expect(ruleParts(rule({ rule_type: 'tiered' }), t))
      .toEqual({ value: t('rule.unknownValue'), unit: t('rule.tieredUnit') });
  });

  it('config con basura no produce "NaN puntos"', () => {
    for (const config of [null, {}, { points_per_dollar: 'mucho' }]) {
      const { value } = ruleParts(rule({ config: config as PointsRule['config'] }), t);
      expect(value).toBe(t('rule.unknownValue'));
      expect(value).not.toContain('NaN');
    }
  });

  it('un rule_type desconocido cae en el generico', () => {
    expect(ruleParts(rule({ rule_type: 'lo_que_sea' as PointsRule['rule_type'] }), t).value)
      .toBe(t('rule.unknownValue'));
  });

  it('percentage con basura tampoco rompe', () => {
    expect(ruleParts(rule({ rule_type: 'percentage', config: {} }), t).value)
      .toBe(t('rule.unknownValue'));
  });
});

describe('ruleBadge', () => {
  it.each([
    ['percentage', { percentage: 10 }, '10%'],
    ['fixed_per_item', { points_per_item: 5 }, '+5'],
    ['fixed_per_sale', { points_per_sale: 50 }, '+50'],
    ['fixed_amount', { points_per_dollar: 1 }, '+1'],
  ])('%s -> %s', (type, config, expected) => {
    expect(ruleBadge(rule({ rule_type: type as PointsRule['rule_type'], config }), t))
      .toBe(expected);
  });

  it('muestra un guion si el numero no esta', () => {
    expect(ruleBadge(rule({ rule_type: 'percentage', config: {} }), t)).toBe('—');
  });

  it('tiered tiene su propio badge', () => {
    expect(ruleBadge(rule({ rule_type: 'tiered' }), t)).toBe(t('rule.tieredBadge'));
  });
});

describe('rulePeriod', () => {
  it('entre dos fechas', () => {
    expect(rulePeriod(rule({ start_date: '2026-06-21', end_date: '2026-09-21' }), t))
      .toBe(t('rule.periodBetween', { from: '21/6/2026', to: '21/9/2026' }));
  });

  it('solo desde', () => {
    expect(rulePeriod(rule({ start_date: '2026-06-21' }), t))
      .toBe(t('rule.periodFrom', { from: '21/6/2026' }));
  });

  it('solo hasta', () => {
    expect(rulePeriod(rule({ end_date: '2026-09-21' }), t))
      .toBe(t('rule.periodUntil', { to: '21/9/2026' }));
  });

  it('sin fechas es "siempre"', () => {
    expect(rulePeriod(rule(), t)).toBe(t('rule.periodAlways'));
  });
});

describe('ruleConditions', () => {
  it('lista los dias de la semana', () => {
    expect(ruleConditions(rule({ days_of_week: [1, 5] }), t))
      .toEqual([`${t('day.1')}, ${t('day.5')}`]);
  });

  it('arma el rango horario recortando los segundos', () => {
    expect(ruleConditions(rule({ time_start: '09:00:00', time_end: '18:00:00' }), t))
      .toEqual([t('rule.timeRange', { from: '09:00', to: '18:00' })]);
  });

  it('completa el extremo que falta', () => {
    expect(ruleConditions(rule({ time_start: '09:00:00' }), t))
      .toEqual([t('rule.timeRange', { from: '09:00', to: '23:59' })]);
    expect(ruleConditions(rule({ time_end: '18:00:00' }), t))
      .toEqual([t('rule.timeRange', { from: '00:00', to: '18:00' })]);
  });

  it('una regla sin restricciones no devuelve ninguna', () => {
    expect(ruleConditions(rule(), t)).toEqual([]);
    expect(ruleConditions(rule({ days_of_week: [] }), t)).toEqual([]);
  });
});

describe('totalPoints', () => {
  it('suma el aporte de cada regla, porque desde el 26/08/2026 suman todas', () => {
    expect(totalPoints([
      { rule_id: 1, name: 'a', rule_type: 'fixed_amount', config: null, is_default: true, points: 100 },
      { rule_id: 2, name: 'b', rule_type: 'percentage', config: null, is_default: false, points: 10 },
    ])).toBe(110);
  });

  it('sin reglas el total es 0', () => {
    expect(totalPoints([])).toBe(0);
  });
});
