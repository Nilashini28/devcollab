async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@devcollab.app', password: 'Demo1234' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    
    console.log('Testing code review...');
    const crRes = await fetch('http://localhost:5000/api/ai/code-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: 'const a = 1;', language: 'javascript' })
    });
    console.log('Code review status:', crRes.status);
    console.log('Code review response:', await crRes.text());

  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
