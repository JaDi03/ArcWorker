import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Web3Provider } from '@/components/Web3Provider';
import { GoogleAuthProvider } from '@/components/auth/GoogleAuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ArcWorker Protocol | Instant Digital Work',
  description: 'Micro-tasking infrastructure on Arc Network',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ArcWorker',
  },
};

export const viewport = {
  themeColor: '#005ddb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GoogleAuthProvider>
          <Web3Provider>
            {children}
          </Web3Provider>
        </GoogleAuthProvider>
      </body>
    </html>
  );
}
