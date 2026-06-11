import './globals.css';

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || 'Market Intelligence Agent',
  description:
    'AI-powered market intelligence — structured company, market, and competitor reports for marketing strategists.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
