import type { Metadata } from 'next';
import './globals.css';
import { SkipLink } from '@/components/ui';
export const metadata: Metadata = {
  title: 'Sham Clinic | Hospital workspace',
  description: 'Sham Clinic bilingual hospital information system',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
