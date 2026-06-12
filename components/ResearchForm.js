'use client';

import { useState } from 'react';
import { FOCUS_OPTIONS, DEFAULT_FOCUS, MAX_INPUT_LENGTH } from '@/lib/focusOptions';
import ReportView from '@/components/ReportView';

export default function ResearchForm() {
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [focus, setFocus] = useState(DEFAULT_FOCUS);
  const [report, setReport] = useState(null);
  const [sourceCount, setSourceCount] = useState(0);
  const [toolCallCount, setToolCallCount] = useState(0);
  const [mode, setMode] = useState('full');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!company.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), industry: industry.trim(), focus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      setReport(data.reply);
      setSourceCount(typeof data.sourceCount === 'number' ? data.sourceCount : 0);
      setToolCallCount(typeof data.toolCallCount === 'number' ? data.toolCallCount : 0);
      setMode(typeof data.mode === 'string' ? data.mode : 'full');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Keep the inputs so the user can refine the query instead of retyping it
  function handleNewReport() {
    setReport(null);
    setError(null);
  }

  if (report) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-0.5">
              Market Intelligence Report
            </p>
            <h2 className="text-lg font-semibold text-gray-900">{company}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {focus}
              {industry ? ` · ${industry}` : ''}
            </p>
            <p className={`text-xs mt-1.5 ${sourceCount > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {sourceCount > 0
                ? `Grounded in ${sourceCount} live web sources · ${toolCallCount} ${toolCallCount === 1 ? 'search' : 'searches'} run by the agent`
                : 'Generated from model knowledge — live search unavailable'}
            </p>
            {mode !== 'full' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1 mt-1.5 inline-block">
                {mode === 'mock'
                  ? 'MOCK MODE — sample report, no API call was made'
                  : 'CHEAP MODE — smaller model, 1 search, short report'}
              </p>
            )}
          </div>
          <button
            onClick={handleNewReport}
            className="shrink-0 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition"
          >
            New report
          </button>
        </div>

        <ReportView report={report} />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-5"
    >
      <div>
        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
          Company name <span className="text-red-500">*</span>
        </label>
        <input
          id="company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. Nike, Notion, Oatly"
          maxLength={MAX_INPUT_LENGTH}
          disabled={isLoading}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50 transition"
        />
        <p className="mt-1 text-xs text-gray-400">
          The company or brand you want to research.
        </p>
      </div>

      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
          Industry / market <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="industry"
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g. Sportswear, B2B SaaS, DTC food & beverage"
          maxLength={MAX_INPUT_LENGTH}
          disabled={isLoading}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50 transition"
        />
        <p className="mt-1 text-xs text-gray-400">
          Helps the analysis when the company is small or has a common name.
        </p>
      </div>

      <div>
        <label htmlFor="focus" className="block text-sm font-medium text-gray-700 mb-1">
          Research focus
        </label>
        <select
          id="focus"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          disabled={isLoading}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50 transition bg-white"
        >
          {FOCUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">
          The report covers all seven sections but goes deeper on this one.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="font-medium mb-0.5">Report failed</p>
          <p>{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
          Searching the web for {company.trim()}, then writing the report — about 90 seconds.
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !company.trim()}
        className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {isLoading ? 'Generating report…' : error ? 'Try again' : 'Generate report'}
      </button>
    </form>
  );
}
