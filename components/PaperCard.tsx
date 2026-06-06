'use client';

import { useState } from 'react';
import type { PubMedPaper } from '@/lib/types';

interface PaperCardProps {
  paper: PubMedPaper;
}

export default function PaperCard({ paper }: PaperCardProps) {
  const [expanded, setExpanded] = useState(false);

  const authorText =
    paper.authors.length === 0
      ? 'Unknown authors'
      : paper.authors.length <= 3
        ? paper.authors.join(', ')
        : `${paper.authors.slice(0, 3).join(', ')} et al.`;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <a
        href={paper.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <h2 className="text-base font-semibold leading-snug text-gray-900 group-hover:text-teal-700 transition-colors">
          {paper.title}
        </h2>
      </a>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
        <span>{authorText}</span>
        {(paper.journal || paper.year) && <span aria-hidden>·</span>}
        {paper.journal && <span className="italic">{paper.journal}</span>}
        {paper.year && <span>{paper.year}</span>}
      </div>

      {paper.abstract ? (
        <div className="mt-3">
          <p
            className={`text-sm leading-relaxed text-gray-700 ${!expanded ? 'line-clamp-3' : ''}`}
          >
            {paper.abstract}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs font-medium text-teal-600 hover:text-teal-800 transition-colors"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm italic text-gray-400">No abstract available.</p>
      )}

      <div className="mt-4">
        <a
          href={paper.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 transition-colors"
        >
          View on PubMed
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3 w-3"
          >
            <path
              fillRule="evenodd"
              d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
              clipRule="evenodd"
            />
            <path
              fillRule="evenodd"
              d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
              clipRule="evenodd"
            />
          </svg>
        </a>
      </div>
    </article>
  );
}
