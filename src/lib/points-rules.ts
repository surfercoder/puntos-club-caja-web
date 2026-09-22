import { supabase } from '@/lib/supabase/client';
import { formatDMY, formatPoints } from '@/lib/theme';
import type { MessageKey, Translate } from '@/i18n';

// En la base no hay dos tablas: "campanas" y "reglas generales" son filas de
// points_rule. Lo unico que las distingue es tener vigencia (start/end date).
export type PointsRule = {
  id: number;
  name: string;
  display_name: string | null;
  description: string | null;
  rule_type: 'fixed_amount' | 'percentage' | 'fixed_per_item' | 'tiered' | 'fixed_per_sale';
  config: Record<string, unknown> | null;
  is_default: boolean;
  display_icon: string | null;
  display_color: string | null;
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[] | null;
  time_start: string | null;
  time_end: string | null;
};

const SELECT =
  'id, name, display_name, description, rule_type, config, is_default, display_icon, display_color, start_date, end_date, days_of_week, time_start, time_end';

export const isCampaign = (rule: Pick<PointsRule, 'start_date' | 'end_date'>) =>
  !!(rule.start_date || rule.end_date);

// Desde el 26/08/2026 no hay una regla "que gana": todas las vigentes suman,
// asi que el orden es solo de presentacion (la mas nueva primero).
export async function fetchActiveRules(
  organizationId: string | null | undefined
): Promise<PointsRule[]> {
  if (!organizationId) return [];
  const { data } = await supabase
    .from('points_rule')
    .select(SELECT)
    .eq('organization_id', parseInt(organizationId))
    .eq('is_active', true)
    .order('id', { ascending: false });
  return (data ?? []) as PointsRule[];
}

// start_date/end_date son `date` (sin hora). new Date('2026-08-01') se parsea en
// UTC y en Argentina (UTC-3) mostraria el dia anterior, asi que se parte el
// string. En ingles el orden es mes/dia.
export const formatRuleDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return formatDMY(Number(d), Number(m), Number(y));
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

export type CampaignStatus = 'active' | 'scheduled' | 'ended';

// Una campana puede estar is_active y todavia no haber arrancado (o ya haber
// terminado): la fecha manda, no el flag.
export function campaignStatus(
  rule: Pick<PointsRule, 'start_date' | 'end_date'>,
  today = todayISO()
): CampaignStatus {
  if (rule.start_date && rule.start_date > today) return 'scheduled';
  if (rule.end_date && rule.end_date < today) return 'ended';
  return 'active';
}

// El mockup parte el valor en dos renglones ("1 punto" / "por cada $10"), asi
// que se arma en dos piezas y ruleValue las junta para los textos de una linea.
// config es jsonb: el admin puede haber guardado la regla sin el numero o con
// basura. Sin este chequeo el cajero lee "NaN puntos" y no sabe que esta roto.
const num = (config: Record<string, unknown>, key: string): number | null => {
  const n = Number(config[key]);
  return Number.isFinite(n) ? n : null;
};

export function ruleParts(
  rule: Pick<PointsRule, 'rule_type' | 'config'>,
  t: Translate,
): { value: string; unit: string } {
  const unknown = { value: t('rule.unknownValue'), unit: t('rule.unknownUnit') };
  const config = rule.config ?? {};
  const points = (key: string, unit: MessageKey) => {
    const n = num(config, key);
    if (n === null) return unknown;
    return {
      value: t(n === 1 ? 'rule.pointsValueOne' : 'rule.pointsValueMany', {
        points: formatPoints(n),
      }),
      unit: t(unit),
    };
  };
  switch (rule.rule_type) {
    case 'fixed_per_sale':
      return points('points_per_sale', 'rule.perSale');
    case 'fixed_amount':
      return points('points_per_dollar', 'rule.perDollar');
    case 'percentage': {
      const pct = num(config, 'percentage');
      return pct === null
        ? unknown
        : { value: `${pct}%`, unit: t('rule.percentOfAmount') };
    }
    case 'fixed_per_item':
      return points('points_per_item', 'rule.perItem');
    case 'tiered':
      return { value: t('rule.unknownValue'), unit: t('rule.tieredUnit') };
    default:
      return unknown;
  }
}

// Texto corto del circulo de color de la campana ("+50", "5%").
export function ruleBadge(
  rule: Pick<PointsRule, 'rule_type' | 'config'>,
  t: Translate,
): string {
  const config = rule.config ?? {};
  const badge = (key: string, prefix: string, suffix: string) => {
    const n = num(config, key);
    return n === null ? '—' : `${prefix}${formatPoints(n)}${suffix}`;
  };
  switch (rule.rule_type) {
    case 'percentage':
      return badge('percentage', '', '%');
    case 'fixed_per_item':
      return badge('points_per_item', '+', '');
    case 'fixed_per_sale':
      return badge('points_per_sale', '+', '');
    case 'fixed_amount':
      return badge('points_per_dollar', '+', '');
    default:
      return t('rule.tieredBadge');
  }
}

// Vigencia en una linea, para la regla madre (las campanas muestran inicio y
// fin en celdas separadas).
export function rulePeriod(
  rule: Pick<PointsRule, 'start_date' | 'end_date'>,
  t: Translate,
): string {
  if (rule.start_date && rule.end_date) {
    return t('rule.periodBetween', {
      from: formatRuleDate(rule.start_date),
      to: formatRuleDate(rule.end_date),
    });
  }
  if (rule.start_date)
    return t('rule.periodFrom', { from: formatRuleDate(rule.start_date) });
  if (rule.end_date)
    return t('rule.periodUntil', { to: formatRuleDate(rule.end_date) });
  return t('rule.periodAlways');
}

const DAY_KEYS: MessageKey[] = [
  'day.0',
  'day.1',
  'day.2',
  'day.3',
  'day.4',
  'day.5',
  'day.6',
];

// Restricciones de "cuando aplica" que no son la vigencia: dias y horario. Una
// regla sin restricciones no devuelve ninguna.
export function ruleConditions(rule: PointsRule, t: Translate): string[] {
  const conditions: string[] = [];
  if (rule.days_of_week?.length) {
    conditions.push(rule.days_of_week.map((d) => t(DAY_KEYS[d])).join(', '));
  }
  if (rule.time_start || rule.time_end) {
    conditions.push(
      t('rule.timeRange', {
        from: (rule.time_start ?? '00:00').slice(0, 5),
        to: (rule.time_end ?? '23:59').slice(0, 5),
      })
    );
  }
  return conditions;
}

// Desglose de una venta: la base devuelve el aporte de CADA regla que aplica
// (las reglas suman entre si desde el 26/08/2026) y el total es la suma. Sale de
// explain_points_for_amount, la misma funcion sobre la que corre
// calculate_points_for_amount, para que el desglose no pueda contradecir al total.
export type PointsBreakdownRow = {
  rule_id: number;
  name: string;
  rule_type: PointsRule['rule_type'];
  config: Record<string, unknown> | null;
  is_default: boolean;
  points: number;
};

export async function explainPoints(
  amount: number,
  organizationId: string | null | undefined,
  branchId: number | null
): Promise<PointsBreakdownRow[] | null> {
  const { data, error } = await supabase.rpc('explain_points_for_amount', {
    p_amount: amount,
    p_organization_id: organizationId ? parseInt(organizationId) : null,
    p_branch_id: branchId,
    p_category_id: null,
    p_purchase_time: new Date().toISOString(),
  });
  if (error) return null;
  return (data ?? []) as PointsBreakdownRow[];
}

export const totalPoints = (rows: PointsBreakdownRow[]) =>
  rows.reduce((sum, row) => sum + row.points, 0);
