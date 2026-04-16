import type { Metadata } from 'next';
import { DM_Sans, DM_Mono, Playfair_Display } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
});

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://followthesun.vercel.app'),
  title: 'FollowTheSun — Hitta sol i Stockholm',
  description: 'Se vilka uteserveringar i Stockholm som har sol just nu, baserat på realtidsberäknade byggnadsskuggor.',
  openGraph: {
    title: 'FollowTheSun — Hitta sol i Stockholm',
    description: 'Hitta uteserveringar med sol i Stockholm — just nu. 723 ställen, realtid skuggberäkning.',
    siteName: 'FollowTheSun',
    locale: 'sv_SE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FollowTheSun — Hitta sol i Stockholm',
    description: 'Hitta uteserveringar med sol i Stockholm — just nu.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${dmSans.variable} ${dmMono.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
