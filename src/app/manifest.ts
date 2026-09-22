import type { MetadataRoute } from 'next';

// Permite "agregar a la pantalla de inicio": el comercio que no quiere instalar
// el APK igual termina con un icono y una ventana sin barra de navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PuntosClub Caja',
    short_name: 'Caja',
    description: 'Caja de PuntosClub: ventas, entregas y reglas de puntos.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBFBFC',
    theme_color: '#02875B',
    icons: [{ src: '/images/icon.png', sizes: '512x512', type: 'image/png' }],
  };
}
