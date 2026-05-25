const fs = require('fs');
let code = fs.readFileSync('src/pages/Wiki.jsx', 'utf8');

code = code.replace(
  /const \[search, setSearch\] = useState\(''\);/,
  `const [search, setSearch] = useState('');
  const [prLoading, setPrLoading] = useState(false);`
);

code = code.replace(
  /async function generateSummary\(\) \{/,
  `async function generatePrTemplate() {
    setPrLoading(true);
    try {
      const tr = await api.get(\`/tasks?projectId=\${projectId}\`);
      const tasks = tr.data.filter(t => t.status === 'done' || t.status === 'inprogress');
      const taskTitles = tasks.map(t => t.title).join(', ');
      
      const r = await api.post('/ai/pr-description', { taskTitle: taskTitles });
      const prTitle = r.data.title || 'Draft PR';
      
      const w = await api.post('/wiki', { projectId, title: prTitle, content: r.data.markdownBody });
      setPages(prev => [...prev, w.data]);
      loadPage(w.data._id);
      toast.success('PR template created!');
    } catch { toast.error('Failed to generate PR template'); }
    finally { setPrLoading(false); }
  }

  async function generateSummary() {`
);

code = code.replace(
  /<button onClick=\{\(\) => setShowHistory\(!showHistory\)\} className="btn btn-secondary btn-sm">/,
  `<button onClick={generatePrTemplate} className="btn btn-secondary btn-sm" disabled={prLoading}>
                  {prLoading ? '...' : '🚀 Gen PR Template'}
                </button>
                <button onClick={() => setShowHistory(!showHistory)} className="btn btn-secondary btn-sm">`
);

fs.writeFileSync('src/pages/Wiki.jsx', code);
console.log('Patched Wiki.jsx for PR Generator');
