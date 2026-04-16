import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'The Freedom Engine OS',
  description: 'A governed internal venture operating system for AI-native organizations.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
