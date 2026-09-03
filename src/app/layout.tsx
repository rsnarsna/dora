import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Personal Management Dashboard (Next.js)',
  description: 'Jira hierarchy tracker with personal discipline overlays & productivity widgets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen w-screen overflow-hidden bg-muted flex flex-col">
        {children}
      </body>
    </html>
  );
}
