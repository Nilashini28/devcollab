import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function ScoreBar({ score }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(score * 10);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  let color = 'bg-red-500';
  let label = 'Needs Work';
  if (score >= 8) {
    color = 'bg-green-500';
    label = 'Excellent';
  } else if (score >= 6) {
    color = 'bg-yellow-500';
    label = 'Good';
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-900">Overall Score</span>
        <span className={`text-sm font-bold ${color.replace('bg-', 'text-')}`}>
          {score}/10 — {label}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full ${color}`} 
          style={{ width: `${width}%`, transition: 'width 1000ms ease-out' }}
        />
      </div>
    </div>
  );
}

export default function CodeReviewPanel({ snippet, onClose }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runReview() {
      try {
        const res = await api.post('/ai/code-review', {
          snippetId: snippet._id,
          code: snippet.code,
          language: snippet.language,
          taskDescription: snippet.title
        });
        setResult(res.data);
      } catch (e) {
        setResult({ score: 0, bugs: [], performance: [], security: [], readability: ['Failed to load review'] });
      } finally {
        setLoading(false);
      }
    }
    runReview();
  }, [snippet]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-gray-900/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div 
        className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col"
        style={{ animation: 'slideInRight 0.3s ease forwards' }}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">🤖 AI Code Review</h2>
            <p className="text-xs text-gray-500 mt-1 font-mono">{snippet.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 -mr-2 rounded-lg transition-colors">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-6">
              <div className="skeleton h-12 w-full rounded-xl" />
              <div className="skeleton h-32 w-full rounded-xl" />
              <div className="skeleton h-32 w-full rounded-xl" />
            </div>
          ) : result ? (
            <div>
              <ScoreBar score={result.score || 0} />
              
              <div className="space-y-4">
                {result.bugs && result.bugs.length > 0 && (
                  <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">🐛 Bugs ({result.bugs.length})</h3>
                    <ul className="space-y-2">
                      {result.bugs.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.performance && result.performance.length > 0 && (
                  <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">⚡ Performance ({result.performance.length})</h3>
                    <ul className="space-y-2">
                      {result.performance.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-yellow-500 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.security && result.security.length > 0 && (
                  <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">🔒 Security ({result.security.length})</h3>
                    <ul className="space-y-2">
                      {result.security.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.readability && result.readability.length > 0 && (
                  <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">📖 Readability ({result.readability.length})</h3>
                    <ul className="space-y-2">
                      {result.readability.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-10">No review available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
