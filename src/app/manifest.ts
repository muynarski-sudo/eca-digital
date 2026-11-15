import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Falando Francês Prática',
    short_name: 'Francês Prática',
    description: 'Pratique o francês das suas aulas.',
    start_url: '/inicio',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0055a4',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
