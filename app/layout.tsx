import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PharmaHub AI — Pharmacy learning, organized.',
  description:
    'PharmaHub organizes your pharmacy lecture notes, PDFs, images, and study materials into one connected learning environment.',
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    apple: '/icons/pharmahub-light.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'PharmaHub',
    statusBarStyle: 'default',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <PwaInstallPrompt />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
