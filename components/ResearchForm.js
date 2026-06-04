'use client';

import { useState } from 'react';

const FOCUS_OPTIONS = [
  'General Market Intelligence',
  'Brand Positioning',
  'Competitive Landscape',
  'Target Audience',
  'Content Strategy',
  'SEO Opportunities',
  'Go-to-Market Strategy',
];

export default function ResearchForm() {
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [focus, setFocus] = useState(FOCUS_OPTIONS[0]);
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!company.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), industry: industry.trim(), focus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      setReport(data.reply);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setReport(null);
    setError(null);
    setCompany('');
    setIndustry('');
    setFocus(FOCUS_OPTIONS[0]);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!report ? (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Hulo, Nike, Notion"
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Fitness, SaaS, DTC Apparel"
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Research focus
            </label>
            <select
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50 transition bg-white"
            >
              {FOCUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-red-500 text-sm px-4 py-2 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !company.trim()}
            className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Generating report…' : 'Generate Report'}
          </button>
        </form>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{company}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{focus}{industry ? ` · ${industry}` : ''}</p>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-gray-700 transition border border-gray-200 rounded-lg px-3 py-1.5"
            >
              New report
            </button>
          </div>

          <div className="prose prose-sm prose-gray max-w-none whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
            {report}
          </div>
        </div>
      )}
    </div>
  );
}
