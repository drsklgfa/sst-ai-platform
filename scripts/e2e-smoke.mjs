const baseUrl = String(process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const email = process.env.E2E_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD;
const failures = [];

async function request(path, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try { return await fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal, redirect: 'manual' }); }
  finally { clearTimeout(timer); }
}

const health = await request('/api/health');
if (health.status !== 200) failures.push(`health retornou ${health.status}`);
else {
  const body = await health.json();
  if (body.ok !== true || body.database !== 'ok') failures.push('health não confirmou banco');
}

const loginPage = await request('/login');
if (loginPage.status !== 200) failures.push(`login retornou ${loginPage.status}`);
for (const [header, expected] of [['x-content-type-options', 'nosniff'], ['x-frame-options', 'DENY']]) {
  if (loginPage.headers.get(header) !== expected) failures.push(`header ${header} ausente ou inválido`);
}

const badForm = new URLSearchParams({ email: 'invalid@example.com', password: 'invalid-password' });
const badLogin = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: baseUrl }, body: badForm });
if (badLogin.status !== 303 || !String(badLogin.headers.get('location') ?? '').includes('error=1')) failures.push('login inválido não foi rejeitado corretamente');

if (email && password) {
  const form = new URLSearchParams({ email, password });
  const login = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: baseUrl }, body: form });
  const cookie = login.headers.get('set-cookie');
  if (login.status !== 303 || !cookie?.includes('sst_session=')) failures.push('login de homologação não criou sessão');
  else {
    const dashboard = await request('/dashboard', { headers: { cookie: cookie.split(';')[0] } });
    if (![200, 307, 308].includes(dashboard.status)) failures.push(`dashboard autenticado retornou ${dashboard.status}`);
  }
}

const crossSite = await request('/api/auth/logout', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site', origin: 'https://attacker.invalid' } });
if (crossSite.status !== 403) failures.push('middleware não bloqueou mutação cross-site');

const result = { ok: failures.length === 0, baseUrl, failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
