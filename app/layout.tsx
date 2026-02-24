import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Group Gamble',
    template: '%s | Group Gamble',
  },
  description: 'Make predictions with your friends. Play-money points only.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Group Gamble',
  },
  openGraph: {
    title: 'Group Gamble',
    description: 'Make predictions with your friends. Play-money points only.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevent pinch zoom (keeps app-like feel)
  userScalable: false,
  themeColor: '#09090b', // zinc-950
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-lg min-h-screen relative">
          {children}
        </div>
      </body>
    </html>
  );
}
