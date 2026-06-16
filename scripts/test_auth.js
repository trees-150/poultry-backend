const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function run() {
  const base = 'http://localhost:5000';
  try {
    const health = await fetch(base + '/api/health');
    console.log('health', await health.json());

    const register = await fetch(base + '/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'CI Test', email: 'Test@Example.com', password: 'Passw0rd!' })
    });
    const regBody = await register.text();
    console.log('register status', register.status, regBody);

    const login = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'Test@Example.com', password: 'Passw0rd!' })
    });
    const loginBody = await login.text();
    console.log('login status', login.status, loginBody);
  } catch (err) {
    console.error('test error', err.message || err);
    process.exit(2);
  }
}

run();
