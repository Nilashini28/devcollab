import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function CommandPalette({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        const { tasks = [], snippets = [], wiki = [] } = res.data || {};
        const all = [
          ...tasks.map(t => ({ ...t, type: 'task' })),
          ...snippets.map(s => ({ ...s, type: 'snippet' })),
          ...wiki.map(w => ({ ...w, type: 'wiki' }))
        ];
        setResults(all);
        setSelectedIndex(0);
      } catch (e) {
        console.error('Search failed', e);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = results[selectedIndex];
        if (item) {
          const pId = item.projectId || item.project;
          if (item.type === 'task') navigate(`/project/${pId}`);
          else if (item.type === 'snippet') navigate(`/project/${pId}/snippets`);
          else if (item.type === 'wiki') navigate(`/project/${pId}/wiki`);
          else navigate(`/project/${pId}`);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, navigate, onClose]);

  const getIcon = (type) => {
    if (type === 'task') return '📝';
    if (type === 'snippet') return '💻';
    if (type === 'wiki') return '📚';
    return '📄';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center pt-[15vh] bg-gray-900/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideDown 0.2s ease-out' }}
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <span className="text-xl mr-3 text-gray-400">🔍</span>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent border-none text-gray-900 text-lg focus:ring-0 outline-none placeholder-gray-400"
            placeholder="Type to search tasks, docs, and snippets..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd className="hidden sm:inline-block text-xs text-gray-400 font-mono bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              Type to search tasks, docs, and snippets...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No results for "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {['task', 'snippet', 'wiki'].map(group => {
                const groupItems = results.filter(r => r.type === group);
                if (groupItems.length === 0) return null;
                return (
                  <div key={group} className="mb-4">
                    <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      {group}s
                    </div>
                    {results.map((item, index) => {
                      if (item.type !== group) return null;
                      const isSelected = index === selectedIndex;
                      return (
                        <div
                          key={`${item.type}-${item._id}`}
                          className={`flex items-center px-3 py-2 rounded-xl cursor-pointer ${
                            isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                          onMouseEnter={() => setSelectedIndex(index)}
                          onClick={() => {
                            const pId = item.projectId || item.project;
                            if (item.type === 'task') navigate(`/project/${pId}`);
                            else if (item.type === 'snippet') navigate(`/project/${pId}/snippets`);
                            else if (item.type === 'wiki') navigate(`/project/${pId}/wiki`);
                            else navigate(`/project/${pId}`);
                            onClose();
                          }}
                        >
                          <span className="mr-3 text-lg opacity-80">{getIcon(item.type)}</span>
                          <span className="flex-1 font-medium truncate">{item.title}</span>
                          {item.type === 'task' && item.priority && (
                            <span className={`ml-3 text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide
                              ${item.priority === 'P0' ? 'bg-red-50 text-red-600 border-red-200' : 
                                item.priority === 'P1' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                                'bg-blue-50 text-blue-600 border-blue-200'}`}
                            >
                              {item.priority}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
