'use client';

import { Toaster } from 'sonner';

import { colors } from '@/lib/theme';

/** Host de los toasts. La API imperativa vive en `@/lib/notify`. */
export function NotifyHost() {
  return (
    <Toaster
      position="top-center"
      richColors={false}
      toastOptions={{
        style: {
          borderRadius: 12,
          border: `1px solid ${colors.line}`,
          background: colors.card,
          color: colors.ink,
          boxShadow: '0px 6px 20px rgba(16, 24, 40, 0.12)',
          fontFamily: 'inherit',
        },
      }}
    />
  );
}
