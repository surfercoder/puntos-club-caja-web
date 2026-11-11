import type { MetadataRoute } from 'next';

// Permite "agregar a la pantalla de inicio" (ver InstallPrompt): el comercio
// que no quiere instalar el APK igual termina con un icono y una ventana sin
// barra de navegador. Chrome pide 192 y 512 para ofrecer la instalacion; los
// maskable traen el disco dentro de la zona segura para que Android lo recorte
// sin comerse el regalo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Puntos Club Caja',
    short_name: 'Caja',
    description: 'Caja de Puntos Club: ventas, entregas y reglas de puntos.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'es-AR',
    background_color: '#FBFBFC',
    theme_color: '#02875B',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
