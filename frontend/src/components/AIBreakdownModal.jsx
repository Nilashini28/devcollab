import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function AIBreakdownModal({ projectId, onTasksCreated, onClose }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [adding, setAdding] = useState(false);

  const generate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/ai/task-breakdown', { projectId, description: input });
      setPreview(res.data.tasks);
    } catch (e) {
      toast.error('Failed to generate breakdown');
    } finally {
      setLoading(false);
    }
  };

  const addAll = async () => {
    if (!preview || preview.length === 0) return;
    setAdding(true);
    try {
      await api.post('/ai/breakdown/create', { projectId, tasks: preview });
      toast.success(`✅ Added ${preview.length} tasks to the board!`);
      onTasksCreated();
      onClose();
    } catch (e) {
      toast.error('Failed to add tasks');
    } finally {
      setAdding(false);
    }
  };

  const priorityStyles = {
    P0: 'bg-red-50 text-red-600 border-red-200',
    P1: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    P2: 'bg-blue-50 text-blue-600 border-blue-200'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">⚡ AI Task Breakdown</h2>
            <p className="text-sm text-gray-500 mt-0.5">Describe a feature, and AI will split it into tasks</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 -mr-2 rounded-lg transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="relative">
            <textarea
              autoFocus
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-4 min-h-[120px] resize-none"
              placeholder="e.g., Implement OAuth login with Google and Github, including database schema updates..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  generate();
                }
              }}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-3">
              <span className="text-xs text-gray-400 font-medium">⌘+Enter to generate</span>
              <button
                onClick={generate}
                disabled={loading || !input.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>

          {preview && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                Preview ({preview.length} tasks)
              </h3>
              <div className="space-y-2">
                {preview.map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm"
                    style={{ animation: `slideDown 0.3s ease ${idx * 0.05}s both` }}
                  >
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border mt-0.5 whitespace-nowrap ${priorityStyles[task.priority] || priorityStyles.P2}`}>
                      {task.priority || 'P2'}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 leading-tight">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {preview && preview.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button
              onClick={addAll}
              disabled={adding}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              {adding ? 'Adding...' : `Add all ${preview.length} tasks`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
