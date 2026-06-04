import ChatBox from '@/components/ChatBox';

export default function HomePage() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'AI Starter App';
  const provider = process.env.AI_PROVIDER || 'anthropic';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {appName}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Powered by{' '}
          <span className="font-medium capitalize text-gray-700">{provider}</span>
          {' '}· AI Starter Template
        </p>
      </div>

      {/* Chat component */}
      <ChatBox />

      {/* Footer hint */}
      <p className="mt-6 text-xs text-gray-400 text-center max-w-md">
        This is your starter template. Edit{' '}
        <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600">app/page.js</code>{' '}
        to customize this page, and{' '}
        <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600">lib/ai.js</code>{' '}
        to change the AI behavior.
      </p>
    </main>
  );
}
