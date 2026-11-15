import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Falando Francês Prática', template: '%s · Falando Francês Prática' },
  description:
    'Pratique o francês das suas aulas: exercícios, flashcards, conjugação e tarefa de casa.',
  appleWebApp: { capable: true, title: 'Francês Prática', statusBarStyle: 'default' },
  icons: { apple: '/apple-touch-icon.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0055a4' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-3"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
