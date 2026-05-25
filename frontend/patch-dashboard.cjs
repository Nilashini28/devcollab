const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

code = code.replace(
  /const \[activeWs, setActiveWs\] = useState\(null\);/,
  `const [activeWs, setActiveWs] = useState(null);
  const [activities, setActivities] = useState([]);`
);

code = code.replace(
  /const pRes = await api\.get\(\`\/projects\?workspaceId=\$\{wsRes\.data\[0\]\._id\}\`\);\n        setProjects\(pRes\.data\);\n      \}/,
  `const pRes = await api.get(\`/projects?workspaceId=\${wsRes.data[0]._id}\`);
        setProjects(pRes.data);
      }
      
      try {
        const aRes = await api.get('/activity');
        setActivities(aRes.data);
      } catch (e) {}`
);

code = code.replace(
  /        <>\n          \{workspaces\.length > 1 && \(/,
  `        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
          {workspaces.length > 1 && (`
);

code = code.replace(
  /            <\/div>\n          \)\}\n        <\/>/,
  `            </div>
          )}
          </div>
          
          {/* Activity Feed */}
          <div style={{ width: 320, flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Recent Activity</h3>
            {activities.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {activities.slice(0, 8).map(act => (
                  <div key={act._id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', marginTop: 6 }} />
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-1)' }}>
                        <span style={{ fontWeight: 600 }}>{act.actorId?.name}</span> {act.type.replace(':', ' ')} {act.payload?.title || act.payload?.pageId || ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{new Date(act.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>`
);

fs.writeFileSync('src/pages/Dashboard.jsx', code);
console.log('Patched Dashboard.jsx for Activity Feed');
