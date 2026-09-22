import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';

import { ConfirmHost } from '@/components/ui/confirm';
import { NotifyHost } from '@/components/ui/notify';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { LANG_COOKIE, readLangCookie } from '@/i18n/cookie';

import './globals.css';

export const metadata: Metadata = {
  title: 'PuntosClub Caja',
  description: 'Caja de PuntosClub: ventas, entregas y reglas de puntos.',
};

export const viewport: Viewport = {
  // La barra superior del mockup llega a sangre hasta el borde: en un celular
  // la del navegador tiene que quedar del mismo verde.
  themeColor: '#02875B',
  width: 'device-width',
  initialScale: 1,
  // El zoom queda habilitado a proposito: bloquearlo es una barrera de
  // accesibilidad y el layout ya escala bien.
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = readLangCookie((await cookies()).get(LANG_COOKIE)?.value);

  return (
    <html lang={lang}>
      <body>
        <I18nProvider initialLang={lang}>
          <AuthProvider>
            {/* La pantalla ocupa todo el ancho: las barras superiores van a
                sangre y cada pantalla centra su propio contenido con
                `page-column` (ver globals.css). En un celular eso es el ancho
                completo y queda identico a la app movil. */}
            <div className="flex min-h-dvh w-full flex-col bg-bg">
              {children}
            </div>
            <NotifyHost />
            <ConfirmHost />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
