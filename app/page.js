import ResearchForm from '@/components/ResearchForm';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Market Intelligence Agent
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter a company name to generate a structured market intelligence report.
        </p>
      </div>

      <ResearchForm />

    </main>
  );
}
