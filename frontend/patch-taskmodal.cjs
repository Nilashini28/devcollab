const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectBoard.jsx', 'utf8');

code = code.replace(
  /const \[breakdown, setBreakdown\] = useState\(null\);/,
  `const [breakdown, setBreakdown] = useState(null);
  const [generatingCommit, setGeneratingCommit] = useState(false);`
);

code = code.replace(
  /async function generateBreakdown\(\) \{/,
  `async function generateCommit() {
    setGeneratingCommit(true);
    try {
      const r = await api.post('/ai/commit-message', { task: { title: form.title, description: form.description } });
      await navigator.clipboard.writeText(r.data.message);
      toast.success('Commit message copied!');
    } catch { toast.error('Failed to generate commit'); }
    finally { setGeneratingCommit(false); }
  }

  async function generateBreakdown() {`
);

code = code.replace(
  /              <button onClick=\{generateBreakdown\} className="btn btn-secondary btn-sm" disabled=\{breakdownLoading\}>\n                \{breakdownLoading \? '🤖 Analyzing\.\.\.' : '🤖 AI Breakdown'\}\n              <\/button>\n            <\/div>\n          <\/div>\n\n          <div style=\{\{ display: 'flex', gap: 20 \}\}>/,
  `              <button onClick={generateBreakdown} className="btn btn-secondary btn-sm" disabled={breakdownLoading}>
                {breakdownLoading ? '🤖 Analyzing...' : '🤖 AI Breakdown'}
              </button>
              <button onClick={generateCommit} className="btn btn-secondary btn-sm" disabled={generatingCommit}>
                {generatingCommit ? '...' : '💻 Gen Commit'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20 }}>`
);

fs.writeFileSync('src/pages/ProjectBoard.jsx', code);
console.log('Patched ProjectBoard.jsx for Commit Generator');
