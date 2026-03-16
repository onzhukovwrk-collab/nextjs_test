import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pushwoosh Next.js Demo',
  description: 'Pushwoosh Web SDK integration example for Next.js + TypeScript',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Required: serve manifest.json from public/ so it's available at the root */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}
