import './globals.css';

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || 'AI Starter App',
  description: 'Built with the AI Starter Template',
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
