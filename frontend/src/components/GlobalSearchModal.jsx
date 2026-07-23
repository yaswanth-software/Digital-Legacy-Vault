import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchVault } from '../services/searchService';

export default function GlobalSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await searchVault(query);
        if (res.success) setResults(res.data.results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (url) => {
    onClose();
    navigate(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-scale-up">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <span className="text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your LegacyOS (Assets, Contacts, Rules, Releases)..."
            className="w-full text-sm text-slate-800 focus:outline-none placeholder-slate-400 font-medium"
          />
          {loading && (
            <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs font-bold shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[380px] overflow-y-auto p-4 space-y-4 divide-y divide-slate-100">
          {!query.trim() && (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              Type to search assets, trusted people, release rules, or active releases.
            </div>
          )}

          {query.trim().length >= 2 && results && results.totalCount === 0 && !loading && (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              No authorized resources found matching "{query}".
            </div>
          )}

          {results && results.totalCount > 0 && (
            <>
              {/* Assets Results */}
              {results.assets?.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Assets ({results.assets.length})</span>
                  {results.assets.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">{item.title}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{item.subtitle}</div>
                      </div>
                      <span className="text-xs text-indigo-600 font-bold">View →</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Trusted People Results */}
              {results.trustedPeople?.length > 0 && (
                <div className="space-y-2 pt-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Trusted People ({results.trustedPeople.length})</span>
                  {results.trustedPeople.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">{item.title}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{item.subtitle}</div>
                      </div>
                      <span className="text-xs text-emerald-600 font-bold">View →</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Legacy Rules Results */}
              {results.legacyRules?.length > 0 && (
                <div className="space-y-2 pt-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">Legacy Rules ({results.legacyRules.length})</span>
                  {results.legacyRules.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">{item.title}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{item.subtitle}</div>
                      </div>
                      <span className="text-xs text-purple-600 font-bold">View →</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Releases Results */}
              {results.releases?.length > 0 && (
                <div className="space-y-2 pt-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Releases ({results.releases.length})</span>
                  {results.releases.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">{item.title}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{item.subtitle}</div>
                      </div>
                      <span className="text-xs text-amber-600 font-bold">View →</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
