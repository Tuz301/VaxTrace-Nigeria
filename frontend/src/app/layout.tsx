import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { VaxTraceProviders } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VaxTrace Nigeria - Vaccine Supply Chain Analytics',
  description:
    'Real-time vaccine supply chain analytics dashboard for Nigeria. Monitor stock levels, track cold chain equipment, and optimize distribution across the national health system.',
  keywords: [
    'vaccine',
    'supply chain',
    'Nigeria',
    'health',
    'analytics',
    'cold chain',
    'immunization',
    'PHC',
    'OpenLMIS',
  ],
  authors: [{ name: 'VaxTrace Nigeria', url: 'https://vaxtrace.gov.ng' }],
  creator: 'VaxTrace Nigeria',
  publisher: 'Federal Ministry of Health - Nigeria',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://vaxtrace.gov.ng',
    title: 'VaxTrace Nigeria - Vaccine Supply Chain Analytics',
    description:
      'Real-time vaccine supply chain analytics dashboard for Nigeria. Monitor stock levels, track cold chain equipment, and optimize distribution.',
    siteName: 'VaxTrace Nigeria',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VaxTrace Nigeria Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VaxTrace Nigeria - Vaccine Supply Chain Analytics',
    description:
      'Real-time vaccine supply chain analytics dashboard for Nigeria. Monitor stock levels, track cold chain equipment, and optimize distribution.',
    images: ['/og-image.png'],
    creator: '@VaxTraceNG',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  themeColor: '#10b981',
  colorScheme: 'dark',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#10b981',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NG" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="dns-prefetch" href="//api.mapbox.com" />
        <link rel="dns-prefetch" href="//a.tiles.mapbox.com" />
        <link rel="dns-prefetch" href="//b.tiles.mapbox.com" />
      </head>
      <body className={inter.className}>
        <VaxTraceProviders>
          <div className="min-h-screen bg-slate-950">{children}</div>
        </VaxTraceProviders>
      </body>
    </html>
  );
}
