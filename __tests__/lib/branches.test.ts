import { translate, type MessageKey } from '@/i18n';
import { ruleBadge, ruleParts, type PointsRule } from '@/lib/points-rules';

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translate('es', key, params);

describe('translate: claves faltantes', () => {
  it('una clave que no esta en ningun diccionario se devuelve tal cual', () => {
    const inventada = 'no.existe.en.ningun.lado' as MessageKey;
    expect(translate('en', inventada)).toBe(inventada);
    expect(translate('es', inventada)).toBe(inventada);
  });
});

describe('reglas con config nula', () => {
  const base: Pick<PointsRule, 'rule_type' | 'config'> = {
    rule_type: 'fixed_amount',
    config: null,
  };

  it('ruleBadge no explota y muestra un guion', () => {
    expect(ruleBadge(base, t)).toBe('—');
  });

  it('ruleParts cae en el valor desconocido', () => {
    expect(ruleParts(base, t).value).toBe(t('rule.unknownValue'));
  });
});
