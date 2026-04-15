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
  title: 'FollowTheSun — Hitta sol i Stockholm',
  description: 'Se vilka uteserveringar i Stockholm som har sol just nu, baserat på realtidsberäknade byggnadsskuggor.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${dmSans.variable} ${dmMono.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
