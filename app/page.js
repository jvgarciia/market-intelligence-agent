import ResearchForm from '@/components/ResearchForm';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16">

      <div className="mb-10 text-center max-w-xl">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">
          AI-powered market research
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
          Market Intelligence Agent
        </h1>
        <p className="mt-3 text-sm sm:text-base text-gray-500 leading-relaxed">
          Structured competitive and market intelligence for marketing strategists.
          Enter a company, pick a focus, get a seven-section report you can work from.
        </p>
      </div>

      <ResearchForm />

      <p className="mt-8 text-xs text-gray-400 text-center max-w-md leading-relaxed">
        Reports are generated from the AI model&apos;s training knowledge — no live web
        data. Marked inferences should be verified before publishing.
      </p>
    </main>
  );
}
