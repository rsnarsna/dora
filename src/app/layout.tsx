import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dora — Personal Management & Strategic Roadmap',
  description: 'Personal Jira Management Dashboard, Strategic Roadmap & Executive Command Center',
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
