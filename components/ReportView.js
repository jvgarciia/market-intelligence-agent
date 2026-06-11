'use client';

import { useState } from 'react';

/**
 * ReportView renders the raw markdown report from the AI as styled sections.
 *
 * Why hand-parse instead of a markdown package: the report format is ours
 * (we control it via the system prompt), so a ~40-line parser keeps the
 * dependency count at zero — and shows exactly why structured JSON output
 * (a later phase) beats parsing free text.
 */
export default function ReportView({ report }) {
  const [copied, setCopied] = useState(false);

  async function copyReport() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const sections = parseSections(report);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={copyReport}
          className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition"
        >
          {copied ? 'Copied ✓' : 'Copy report'}
        </button>
      </div>

      <div className="space-y-5">
        {sections.map((section, i) => (
          <section key={i}>
            {section.title && (
              <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-1.5 mb-2">
                {section.title}
              </h3>
            )}
            {renderBlocks(section.lines)}
          </section>
        ))}
      </div>
    </div>
  );
}

function parseSections(text) {
  const sections = [];
  let current = { title: null, lines: [] };

  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      if (current.title || current.lines.some((l) => l.trim())) sections.push(current);
      current = { title: line.slice(3).trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections;
}

function renderBlocks(lines) {
  const blocks = [];
  let bullets = [];

  function flushBullets() {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={blocks.length} className="list-disc pl-5 space-y-1 text-sm text-gray-700">
        {bullets.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    bullets = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('- ')) {
      bullets.push(trimmed.slice(2));
    } else if (trimmed.startsWith('Confidence note:')) {
      flushBullets();
      blocks.push(
        <p key={blocks.length} className="text-xs italic text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          {renderInline(trimmed)}
        </p>
      );
    } else {
      flushBullets();
      blocks.push(
        <p key={blocks.length} className="text-sm text-gray-700 leading-relaxed">
          {renderInline(trimmed)}
        </p>
      );
    }
  }
  flushBullets();

  return <div className="space-y-2">{blocks}</div>;
}

function renderInline(text) {
  // One pass over both markdown patterns we emit: [label](url) links and **bold**
  return text.split(/(\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*)/g).map((part, i) => {
    const link = part.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-900 underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700 transition"
        >
          {link[1]}
        </a>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
