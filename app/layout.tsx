import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bill Review Assistant',
  description: 'AI-powered bill review for small businesses',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen text-gray-900 font-sans antialiased">
        <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-6">
          <a href="/" className="font-bold text-lg text-blue-700 tracking-tight">
            BillReview AI
          </a>
          <a href="/" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</a>
          <a href="/upload" className="text-sm text-gray-600 hover:text-gray-900">Upload Bill</a>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
