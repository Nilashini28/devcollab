async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@devcollab.app', password: 'Demo1234' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(loginData.error);
    console.log('Login success:', loginData.user.email);
    
    const token = loginData.token;
    
    const wsRes = await fetch('http://localhost:5000/api/workspaces', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const wsData = await wsRes.json();
    if (!wsRes.ok) throw new Error(wsData.error || 'Failed workspaces');
    console.log('Workspaces length:', wsData.length);
    console.log('Workspaces:', wsData.map(w => w.name));
    
    if (wsData.length > 0) {
      const pRes = await fetch(`http://localhost:5000/api/projects?workspaceId=${wsData[0]._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const pData = await pRes.json();
      console.log('Projects length:', pData.length);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
