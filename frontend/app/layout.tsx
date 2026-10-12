import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Nexora — WhatsApp infrastructure for modern teams',
    template: '%s | Nexora',
  },
  description:
    'Nexora connects WhatsApp, messaging workflows, and team operations in one reliable workspace.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
