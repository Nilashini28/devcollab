import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function SeedButton({ projectId, onSeeded }) {
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    if (!confirm('This will wipe all tasks, snippets, and wiki pages for this project and insert demo data. Are you sure?')) {
      return;
    }
    
    setSeeding(true);
    const loadToast = toast.loading('Seeding demo data...');
    try {
      await api.post(`/seed/${projectId}`);
      toast.success('Project seeded successfully!', { id: loadToast });
      if (onSeeded) onSeeded();
    } catch (e) {
      console.error(e);
      toast.error('Failed to seed project', { id: loadToast });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <button
      onClick={handleSeed}
      disabled={seeding}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50"
      title="Fill project with demo tasks, wiki, and snippets"
    >
      <span>🌱</span>
      <span>{seeding ? 'Seeding...' : 'Seed Data'}</span>
    </button>
  );
}
