import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

async function withServer(port, auth, check) {
  const env = { ...process.env, ACCESS_AUTH_USERNAME: '', ACCESS_AUTH_PASSWORD: '', ...auth };
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], { env, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { await fetch(base); ready = true; break; } catch { await delay(100); }
    }
    assert.ok(ready, 'production server starts');
    await check(base);
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
  }
}
await withServer(3197, {}, async base => {
  assert.equal((await fetch(base)).status, 503, 'missing credentials deny access');
});
const password = randomBytes(32).toString('hex');
await withServer(3198, { ACCESS_AUTH_USERNAME: 'analyst', ACCESS_AUTH_PASSWORD: password }, async base => {
  for (const headers of [{}, { authorization: 'Basic ' + btoa('analyst:wrong') }, { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' }]) {
    const response = await fetch(base, { headers });
    assert.equal(response.status, 401);
    assert.match(response.headers.get('www-authenticate'), /^Basic /);
    assert.match(response.headers.get('cache-control'), /no-store/);
  }
  const post = await fetch(base, { method: 'POST', headers: { 'Next-Action': 'invalid', 'Content-Type': 'text/plain' }, body: '[]' });
  assert.equal(post.status, 401, 'unauthenticated action request denied');
  const response = await fetch(base, { headers: { authorization: 'Basic ' + btoa(`analyst:${password}`) } });
  assert.equal(response.status, 200, 'authenticated page renders');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('cache-control'), /no-store/);
  const html = await response.text();
  assert.ok(html.includes('Search') || html.includes('search'));
  assert.ok(!html.includes(password));
  assert.ok(!html.includes('security-build-canary-not-a-real-key'));
});
console.log('Production smoke passed: missing config, wrong credentials, bypass header, action denial, authorized rendering, security headers, no credential leakage.');
