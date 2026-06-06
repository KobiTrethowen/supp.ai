'use client';

import { useState, useRef } from 'react';
import type { PubMedPaper, SupplementCount } from '@/lib/types';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function Home() {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<PubMedPaper[]>([]);
  const [topSupplements, setTopSupplements] = useState<SupplementCount[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [keyword, setKeyword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setStatus('loading');
    setErrorMsg('');
    setPapers([]);
    setKeyword('');
    setTopSupplements([]);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Unknown error');
      }

      setPapers(data.papers);
      setLastQuery(data.query);
      setKeyword(data.keyword);
      setTopSupplements(data.topSupplements ?? []);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900">
              supp<span className="text-teal-600">.ai</span>
            </span>
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
              beta
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Science-backed supplement research powered by PubMed
          </p>
        </div>
      </header>

      {/* Search */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are your goals? e.g. I want to lose weight, I struggle to sleep"
            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
          <button
            type="submit"
            disabled={status === 'loading' || !query.trim()}
            className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'loading' ? 'Searching…' : 'Search'}
          </button>
        </form>

        {/* Loading */}
        {status === 'loading' && (
          <div className="mt-10 flex flex-col items-center gap-3 text-gray-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-teal-600" />
            <p className="text-sm">Searching PubMed…</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Results */}
        {status === 'success' && (
          <div className="mt-6">
            {/* Extracted keyword banner */}
            {keyword && (
              <div className="mb-5 rounded-xl border border-teal-100 bg-teal-50 px-5 py-4">
                <p className="text-sm text-teal-800">
                  Searching PubMed for:{' '}
                  <span className="font-semibold">"{keyword}"</span>
                </p>
                <p className="mt-0.5 text-xs text-teal-600">
                  Based on your goal: "{lastQuery}"
                </p>
              </div>
            )}

            {/* Top supplement card */}
            {topSupplements.length > 0 && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
                  Top evidence-backed supplement
                </p>
                <p className="mt-2 text-3xl font-bold text-amber-900">
                  {topSupplements.map((s) => s.name).join(' · ')}
                </p>
                <p className="mt-2 text-sm text-amber-700">
                  {topSupplements.length === 1
                    ? `Effective in ${topSupplements[0].paperCount} of ${papers.length} papers analyzed`
                    : `Tied — each effective in ${topSupplements[0].paperCount} of ${papers.length} papers analyzed`}
                </p>
              </div>
            )}

            {topSupplements.length === 0 && papers.length > 0 && (
              <div className="mt-2 rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-500">
                No supplements with clear evidence of effectiveness were found in these{' '}
                {papers.length} papers.
              </div>
            )}
          </div>
        )}

        {/* Idle hint */}
        {status === 'idle' && (
          <div className="mt-12 text-center text-sm text-gray-400">
            Tell us your health goal and we&apos;ll find the peer-reviewed research
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-10 text-center text-xs text-gray-400">
          Results are from the PubMed database. This is not medical advice.
        </p>
      </main>
    </div>
  );
}
