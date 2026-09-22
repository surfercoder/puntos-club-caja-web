'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  IoCalendarClearOutline,
  IoChatbubblesOutline,
  IoGiftOutline,
  IoPricetagsOutline,
  IoShieldCheckmark,
  IoTimeOutline,
} from 'react-icons/io5';

import ScreenHeader from '@/components/ScreenHeader';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import type { MessageKey, Translate } from '@/i18n';
import {
  campaignStatus,
  fetchActiveRules,
  formatRuleDate,
  isCampaign,
  ruleBadge,
  ruleConditions,
  ruleParts,
  rulePeriod,
  type CampaignStatus,
  type PointsRule,
} from '@/lib/points-rules';
import { colors } from '@/lib/theme';

// Color de acento de la campana: el que cargo el admin, o el azul del mockup.
// Los fondos suaves salen del mismo hex con alfa, asi no hace falta una paleta
// por cada color que elija el administrador.
const CAMPAIGN_BLUE = '#2563EB';
// tint/soft pegan el alfa al final del hex, asi que solo sirve con #RRGGBB: si
// el admin guardo "red" o "rgb(...)" se cae al azul en vez de pintar basura.
const HEX6 = /^#[0-9a-fA-F]{6}$/;
const accentOf = (color: string | null) =>
  color && HEX6.test(color) ? color : CAMPAIGN_BLUE;
const tint = (hex: string) => `${hex}14`;
const soft = (hex: string) => `${hex}1F`;

const STATUS: Record<CampaignStatus, MessageKey> = {
  active: 'rules.statusActive',
  scheduled: 'rules.statusScheduled',
  ended: 'rules.statusEnded',
};

const CARD =
  'mb-5 flex flex-col gap-3 rounded-[14px] border border-line bg-card p-[14px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]';

function DateCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <IoCalendarClearOutline size={22} color={color} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[12.5px] text-muted">{label}</p>
        <p className="text-[13px] font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}

// Regla madre: la predeterminada, que suma siempre; las campanas vigentes suman
// arriba de ella. Va en verde y sin fechas de inicio/fin.
function MotherRuleCard({ rule, t }: { rule: PointsRule; t: Translate }) {
  const { value, unit } = ruleParts(rule, t);
  const conditions = ruleConditions(rule, t);

  return (
    <div className={CARD}>
      <div className="flex items-start gap-3">
        <span className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[14px] bg-green-soft">
          <IoShieldCheckmark size={28} color={colors.greenInk} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[17.5px] font-bold text-green-ink">
            {rule.display_name || rule.name}
          </p>
          {rule.description ? (
            <p className="text-[13.5px] leading-[19px] text-muted">
              {rule.description.trim()}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-lg bg-green-soft px-[10px] py-[5px] text-[12px] font-bold text-green-ink">
          {t('rules.alwaysActive')}
        </span>
      </div>

      <div className="h-px bg-line" />

      <div className="flex items-center gap-[10px]">
        <div className="flex flex-1 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-green-ink text-[15px] font-bold text-green-ink">
            P
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[13.5px] font-bold text-ink">{value}</p>
            <p className="text-[12.5px] leading-[17px] text-muted">{unit}</p>
          </div>
        </div>
        <DateCell
          label={t('rules.validity')}
          value={rulePeriod(rule, t)}
          color={colors.greenInk}
        />
        <div className="flex flex-1 flex-col gap-0.5 rounded-[10px] bg-green-tint p-[10px]">
          <p className="text-[12.5px] text-green-ink">{t('rules.appliesTo')}</p>
          <p className="text-[13px] font-bold text-green-ink">
            {conditions.length ? conditions.join(' · ') : t('rules.allTransactions')}
          </p>
        </div>
      </div>
    </div>
  );
}

function CampaignCard({ rule, t }: { rule: PointsRule; t: Translate }) {
  const accent = accentOf(rule.display_color);
  const { value, unit } = ruleParts(rule, t);
  const conditions = ruleConditions(rule, t);

  return (
    <div className={CARD}>
      <div className="flex items-start gap-3">
        <span
          className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[14px]"
          style={{ backgroundColor: tint(accent) }}
        >
          {rule.display_icon ? (
            <span className="text-[26px] leading-none">{rule.display_icon}</span>
          ) : (
            <IoGiftOutline size={28} color={accent} />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[17.5px] font-bold text-ink">
            {rule.display_name || rule.name}
          </p>
          {rule.description ? (
            <p className="text-[13.5px] leading-[19px] text-muted">
              {rule.description.trim()}
            </p>
          ) : null}
        </div>
        <span
          className="shrink-0 rounded-lg px-[10px] py-[5px] text-[12px] font-bold"
          style={{ backgroundColor: soft(accent), color: accent }}
        >
          {t(STATUS[campaignStatus(rule)])}
        </span>
      </div>

      <div className="h-px bg-line" />

      <div className="flex items-center gap-[10px]">
        <DateCell
          label={t('rules.start')}
          value={
            rule.start_date ? formatRuleDate(rule.start_date) : t('common.noDate')
          }
          color={accent}
        />
        <DateCell
          label={t('rules.end')}
          value={rule.end_date ? formatRuleDate(rule.end_date) : t('common.noDate')}
          color={accent}
        />
        <div className="flex flex-1 items-center gap-2">
          <span
            className="flex h-[34px] min-w-[34px] shrink-0 items-center justify-center rounded-[17px] px-2 text-[13px] font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            {ruleBadge(rule, t)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[13.5px] font-bold text-ink">{value}</p>
            <p className="text-[12.5px] leading-[17px] text-muted">{unit}</p>
          </div>
        </div>
      </div>

      {conditions.length ? (
        <div
          className="flex items-center gap-[10px] rounded-[10px] p-3"
          style={{ backgroundColor: tint(accent) }}
        >
          <IoTimeOutline size={22} color={accent} className="shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[12.5px] text-muted">{t('rules.whenApplies')}</p>
            <p className="text-[13px] font-bold text-ink">
              {conditions.join(' · ')}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PointsRulesPage() {
  const router = useRouter();
  const { appUser } = useAuth();
  const t = useT();
  // null = todavia cargando; [] = la organizacion no tiene reglas activas.
  const [rules, setRules] = useState<PointsRule[] | null>(null);
  const organizationId = appUser?.organization_id;

  useEffect(() => {
    fetchActiveRules(organizationId).then(setRules);
  }, [organizationId]);

  if (!rules) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col bg-bg">
        <ScreenHeader title={t('rules.header')} onBack={() => router.replace('/')} />
        <div className="flex flex-1 items-center justify-center">
          <Spinner size={36} color={colors.green} />
        </div>
      </div>
    );
  }

  const mother = rules.find((rule) => rule.is_default);
  const campaigns = rules.filter((rule) => !rule.is_default && isCampaign(rule));
  // Reglas que no son la predeterminada ni tienen vigencia: el mockup no las
  // contempla, pero existen en la base y el cajero tiene que verlas.
  const others = rules.filter((rule) => !rule.is_default && !isCampaign(rule));
  const allActive = campaigns.every((rule) => campaignStatus(rule) === 'active');

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader title={t('rules.header')} onBack={() => router.replace('/')} />

      <div className="page-column no-scrollbar flex-1 overflow-y-auto p-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <div className="mb-6 flex items-center gap-[14px] rounded-[14px] bg-line-soft p-[14px]">
          <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-green-card">
            <IoShieldCheckmark size={26} color="#FFFFFF" />
          </span>
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-[14.5px] font-bold leading-5 text-ink">
              {t('rules.bannerTitle')}
            </p>
            <p className="text-[13.5px] leading-[19px] text-muted">
              {t('rules.bannerSubtitle')}
            </p>
          </div>
        </div>

        {mother ? (
          <>
            <h2 className="mb-3 text-[19px] font-bold text-ink">
              {t('rules.motherSection')}
            </h2>
            <MotherRuleCard rule={mother} t={t} />
          </>
        ) : null}

        {campaigns.length ? (
          <>
            <h2 className="mb-3 text-[19px] font-bold text-ink">
              {t(allActive ? 'rules.activeCampaigns' : 'rules.campaigns')} (
              {campaigns.length})
            </h2>
            {campaigns.map((rule) => (
              <CampaignCard key={rule.id} rule={rule} t={t} />
            ))}
          </>
        ) : null}

        {others.length ? (
          <>
            <h2 className="mb-3 text-[19px] font-bold text-ink">
              {t('rules.otherRules')} ({others.length})
            </h2>
            {others.map((rule) => (
              <CampaignCard key={rule.id} rule={rule} t={t} />
            ))}
          </>
        ) : null}

        {rules.length ? null : (
          <div className="flex flex-col items-center gap-[10px] pb-5 pt-10">
            <IoPricetagsOutline size={60} color={colors.greenCard} />
            <p className="text-[17px] font-bold text-ink">{t('rules.emptyTitle')}</p>
            <p className="px-5 text-center text-[14px] leading-5 text-muted">
              {t('rules.emptyBody')}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-[14px] bg-green-tint p-[14px]">
          <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-green-card text-[24px] font-bold text-white">
            ?
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[15.5px] font-bold text-green-ink">
              {t('rules.helpTitle')}
            </p>
            <p className="text-[13.5px] leading-[19px] text-ink-soft">
              {t('rules.helpBody')}
            </p>
          </div>
          <IoChatbubblesOutline size={40} color={colors.greenLine} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}
