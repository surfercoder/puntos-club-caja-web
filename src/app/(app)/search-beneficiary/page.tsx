'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import {
  IoArrowForward,
  IoCard,
  IoCardOutline,
  IoChevronForward,
  IoMail,
  IoMailOutline,
  IoScanOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';

import ScreenHeader from '@/components/ScreenHeader';
import { notify } from '@/lib/notify';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/contexts/I18nContext';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

type SearchMode = 'email' | 'dni';

export default function SearchBeneficiaryPage() {
  const router = useRouter();
  const t = useT();
  const [searchMode, setSearchMode] = useState<SearchMode>('email');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed) {
      notify.info(t('search.requiredTitle'), {
        description: t(
          searchMode === 'email' ? 'search.requiredEmail' : 'search.requiredDni',
        ),
      });
      return;
    }

    setLoading(true);
    await (async () => {
      const query = supabase.from('beneficiary').select('id');

      const { data: beneficiary, error: beneficiaryError } =
        searchMode === 'email'
          ? await query.ilike('email', trimmed).single()
          : await query.eq('document_id', trimmed).single();

      if (beneficiaryError || !beneficiary) {
        notify.error(t('search.notFoundTitle'), {
          description: t(
            searchMode === 'email' ? 'search.notFoundEmail' : 'search.notFoundDni',
          ),
        });
        return;
      }

      // Solo el id: la ficha (nombre, email, puntos) la carga /scanned-user, asi
      // el email del cliente no queda en la URL ni en el historial del browser.
      router.replace(`/scanned-user?beneficiaryId=${beneficiary.id}`);
    })()
      .catch((err) =>
        notify.error(t('common.error'), { description: errorMessage(t, err) }),
      )
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader
        width="form"
        title={t('search.header')}
        onBack={() => router.replace('/')}
      />

      <form
        onSubmit={handleSearch}
        className="page-column page-form no-scrollbar flex-1 overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-2"
      >
        <Image
          src="/images/search/mascot.png"
          alt=""
          width={390}
          height={236}
          priority
          className="h-[236px] w-full object-contain"
        />

        <h1 className="mt-0.5 text-center text-[27px] font-extrabold text-ink">
          {t('search.title')}
        </h1>
        <p className="mb-[22px] mt-2 whitespace-pre-line text-center text-[15.5px] leading-[23px] text-muted">
          {t('search.subtitle', { br: '\n' })}
        </p>

        <div className="mb-4 flex rounded-xl bg-[#E4E6EA] p-1">
          {(['email', 'dni'] as const).map((mode) => {
            const active = searchMode === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                className={cn(
                  'pressable flex h-11 flex-1 items-center justify-center gap-2 rounded-[9px]',
                  active ? 'bg-green' : 'bg-transparent',
                )}
                onClick={() => {
                  setSearchMode(mode);
                  setSearchValue('');
                }}
              >
                {mode === 'email' ? (
                  <IoMail size={17} color={active ? '#FFFFFF' : colors.muted} />
                ) : (
                  <IoCard size={17} color={active ? '#FFFFFF' : colors.muted} />
                )}
                <span
                  className={cn(
                    'text-[16px] font-bold',
                    active ? 'text-white' : 'text-muted',
                  )}
                >
                  {t(mode === 'email' ? 'search.modeEmail' : 'search.modeDni')}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mb-4 flex h-[54px] items-center gap-[10px] rounded-xl border-[1.5px] border-green-card bg-card px-[14px]">
          {searchMode === 'email' ? (
            <IoMailOutline size={20} color={colors.muted} className="shrink-0" />
          ) : (
            <IoCardOutline size={20} color={colors.muted} className="shrink-0" />
          )}
          <input
            type={searchMode === 'email' ? 'email' : 'text'}
            inputMode={searchMode === 'email' ? 'email' : 'numeric'}
            enterKeyHint="search"
            disabled={loading}
            className="h-full min-w-0 flex-1 bg-transparent text-[15.5px] text-ink outline-none placeholder:text-subtle"
            placeholder={t(
              searchMode === 'email'
                ? 'search.emailPlaceholder'
                : 'search.dniPlaceholder',
            )}
            value={searchValue}
            onChange={(e) =>
              setSearchValue(
                searchMode === 'email'
                  ? e.target.value.trim().toLowerCase()
                  : e.target.value,
              )
            }
          />
          {/* El mockup no dibuja boton de enviar: el campo se manda con Enter.
              Aparece solo cuando hay algo escrito, para que el estado vacio
              quede igual al mockup y siga habiendo un blanco de toque para
              quien no use el teclado. */}
          {searchValue.length > 0 && (
            <button
              type="submit"
              className="pressable flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-green-card"
              aria-label={t('search.submitLabel')}
              disabled={loading}
            >
              {loading ? (
                <Spinner size={17} color="#FFFFFF" />
              ) : (
                <IoArrowForward size={17} color="#FFFFFF" />
              )}
            </button>
          )}
        </div>

        <button
          type="button"
          className="pressable mb-[18px] flex w-full items-center gap-4 rounded-[14px] bg-green px-[18px] py-4 text-left"
          onClick={() => router.push('/scanner')}
        >
          <IoScanOutline size={34} color="#FFFFFF" className="shrink-0" />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[19px] font-extrabold text-white">
              {t('search.scanTitle')}
            </span>
            <span className="text-[14px] text-[#D9EFE5]">
              {t('search.scanSubtitle')}
            </span>
          </span>
          <IoChevronForward size={24} color="#FFFFFF" className="shrink-0" />
        </button>

        <div className="flex items-center gap-[10px] rounded-[14px] border border-green-line bg-green-tint p-3">
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-green-soft">
            <IoShieldCheckmarkOutline size={22} color={colors.greenInk} />
          </span>
          <div className="flex flex-1 flex-col gap-[3px]">
            <p className="text-[15.5px] font-bold text-green-ink">
              {t('search.hintTitle')}
            </p>
            <p className="text-[13px] leading-[18px] text-muted">
              {t('search.hintSubtitle')}
            </p>
          </div>
          <Image
            src="/images/search/phone-qr.png"
            alt=""
            width={60}
            height={78}
            className="h-[78px] w-[60px] shrink-0 object-contain"
          />
        </div>

        <button
          type="button"
          className="pressable mx-auto block px-6 py-4 text-[16px] font-bold text-ink-soft"
          onClick={() => router.replace('/')}
        >
          {t('common.back')}
        </button>
      </form>
    </div>
  );
}
