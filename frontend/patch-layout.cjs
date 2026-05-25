const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.jsx', 'utf8');

// 1. Imports
code = code.replace(
  /import toast from 'react-hot-toast';/,
  "import toast from 'react-hot-toast';\nimport { Command } from 'cmdk';\nimport './cmdk.css';"
);

// 2. States
code = code.replace(
  /const \[activeProjectId, setActiveProjectId\] = useState\(null\);/,
  `const [activeProjectId, setActiveProjectId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);`
);

// 3. Effects for cmd+k and search query
code = code.replace(
  /loadDevMind\(match\[1\]\);\n    \}\n  \}, \[location\.pathname\]\);/,
  `loadDevMind(match[1]);
    }
  }, [location.pathname]);

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (!searchQuery || !activeWorkspace) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const r = await api.get(\`/search?q=\${encodeURIComponent(searchQuery)}&workspaceId=\${activeWorkspace._id}\`);
        setSearchResults(r.data);
      } catch (e) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeWorkspace]);`
);

// 4. Search bar button
code = code.replace(
  /<div style=\{\{ position: 'relative' \}\}>/,
  `<button onClick={() => setSearchOpen(true)} style={{ flex: 1, maxWidth: 300, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-3)', cursor: 'text', marginRight: 'auto' }}>
    <span style={{ fontSize: 13 }}>Search...</span>
    <kbd style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontFamily: 'monospace', border: '1px solid var(--border)', color: 'var(--text-2)' }}>⌘K</kbd>
  </button>
  <div style={{ position: 'relative' }}>`
);

// 5. CMD+K Modal
code = code.replace(
  /<\/div>\n    <\/div>\n  \);\n\}/,
  `      <Command.Dialog open={searchOpen} onOpenChange={setSearchOpen} label="Global Search">
        <Command.Input value={searchQuery} onValueChange={setSearchQuery} placeholder="Search tasks, snippets, wiki..." />
        <Command.List>
          {searchQuery && searchResults.length === 0 && <Command.Empty>No results found.</Command.Empty>}
          {searchResults.map((res) => (
            <Command.Item key={res.type + res.id} value={res.title} onSelect={() => {
              setSearchOpen(false);
              setSearchQuery('');
              if (res.type === 'task') { navigate(\`/project/\${res.projectId}\`); /* you could open modal here if we had global state */ }
              else if (res.type === 'snippet') navigate(\`/project/\${res.projectId}/snippets\`);
              else if (res.type === 'wiki') navigate(\`/project/\${res.projectId}/wiki\`);
            }}>
              <span style={{ fontSize: 18 }}>{res.type === 'task' ? '📝' : res.type === 'snippet' ? '💻' : '📚'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{res.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{res.type} {res.badge ? \`· \${res.badge}\` : ''}</div>
              </div>
            </Command.Item>
          ))}
        </Command.List>
      </Command.Dialog>
      </div>
    </div>
  );
}`
);

fs.writeFileSync('src/components/Layout.jsx', code);
console.log('Patched Layout.jsx');
