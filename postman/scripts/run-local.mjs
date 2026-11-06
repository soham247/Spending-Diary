import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import ts from 'typescript';
import { createSmtpFixture } from './smtp-fixture.mjs';

const root = process.cwd();
const local = resolve(root, '.postman/local');
const databaseUrl = process.env.POSTMAN_TEST_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:55432/spending_diary_postman_test';
const parsed = new URL(databaseUrl);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) || !parsed.pathname.endsWith('_test')) {
  throw new Error('Postman runner requires a loopback database whose name ends in _test.');
}
const secret = randomBytes(32).toString('hex');
const port = Number(process.env.POSTMAN_TEST_PORT ?? 3100);
const baseUrl = `http://127.0.0.1:${port}`;
const pool = new Pool({ connectionString: databaseUrl, max: 2 });
let server;
let smtp;
await mkdir(local, { recursive: true });

function command(file, args, options = {}) {
  return new Promise((accept, reject) => {
    const { logPath, ...spawnOptions } = options;
    const child = spawn(file, args, { cwd: root, stdio: logPath ? ['ignore', 'pipe', 'pipe'] : 'inherit', ...spawnOptions });
    const output = [];
    if (logPath) {
      for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { process.stdout.write(chunk); output.push(chunk); });
    }
    child.once('error', reject);
    child.once('close', async code => {
      if (logPath) await writeFile(logPath, Buffer.concat(output));
      accept(code ?? 1);
    });
  });
}

async function auth(path, body) {
  const response = await fetch(`${baseUrl}/api/auth/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Fixture auth ${path} failed with HTTP ${response.status}; body withheld.`);
  return response;
}

try {
  const { rows } = await pool.query('SELECT current_database() AS name');
  if (rows[0]?.name !== parsed.pathname.slice(1)) throw new Error('Scratch database identity mismatch.');
  await migrate(drizzle(pool), { migrationsFolder: resolve(root, 'drizzle') });
  const schemaFile = resolve(local, 'schema.cjs');
  await writeFile(schemaFile, ts.transpileModule(await readFile(resolve(root, 'src/lib/db/schema.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText);
  const schema = createRequire(import.meta.url)(schemaFile);
  const db = drizzle(pool, { schema });
  smtp = await createSmtpFixture();
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: root, stdio: ['ignore', 'ignore', 'ignore'],
    env: { ...process.env, NODE_ENV: 'development', DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl,
      BETTER_AUTH_SECRET: secret, NEXT_PUBLIC_APP_URL: baseUrl,
      GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.port), SMTP_USER: '', SMTP_PASS: '' },
  });
  server.once('error', error => { console.error(error.message); });
  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (server.exitCode !== null) throw new Error(`Next.js stopped before becoming ready (exit ${server.exitCode}).`);
    try {
      if ((await fetch(`${baseUrl}/api/auth/get-session`, { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; }
    } catch { /* Wait for the local server to start. */ }
    await delay(1000);
  }
  if (!ready) throw new Error('Next.js did not become ready within 90 seconds.');
  console.log(`Isolated app ready at ${baseUrl}; migrations applied to ${rows[0].name}.`);
  const runId = randomBytes(8).toString('hex');
  const values = { base_url: baseUrl, run_id: runId, date: '2026-10-29', anon_cookie: 'better-auth.session_token=invalid' };
  console.log('Creating disposable users and signing in through the real application APIs; SMTP is local-only.');
  for (const role of ['owner', 'friend', 'outsider']) {
    const email = `${role}-${runId}@example.test`;
    const password = randomBytes(24).toString('base64url');
    const { user } = await (await auth('sign-up/email', { email, password, name: `Postman ${role} ${runId}` })).json();
    values[`${role}_id`] = user.id;
    await db.update(schema.users).set({ emailVerified: true }).where(eq(schema.users.id, user.id));
    const login = await auth('sign-in/email', { email, password });
    const cookie = login.headers.getSetCookie().find(value => value.startsWith('better-auth.session_token='));
    if (!cookie) throw new Error('Better Auth sign-in did not return a session cookie.');
    values[`${role}_cookie`] = cookie.split(';')[0];
  }
  const sessionCheck = await fetch(baseUrl + '/api/auth/get-session', { headers: { Cookie: values.owner_cookie } });
  const sessionBody = await sessionCheck.json();
  console.log('Direct fixture session check:', sessionCheck.status, sessionBody?.user?.id === values.owner_id);
  if (sessionBody?.user?.id !== values.owner_id) throw new Error('Seeded session did not resolve.');
  const [lowId, highId] = [values.owner_id, values.friend_id].sort();
  await db.insert(schema.friendships).values({ userLowId: lowId, userHighId: highId });
  values.group_id = `pm-group-${runId}`;
  await db.insert(schema.groups).values({ id: values.group_id, name: `Postman ${runId}`, currency: 'INR', createdById: values.owner_id });
  await db.insert(schema.groupMembers).values([
    { groupId: values.group_id, userId: values.owner_id, role: 'ADMIN' }, { groupId: values.group_id, userId: values.friend_id },
  ]);
  values.settlement_group_id = 'pm-settlement-' + runId;
  await db.insert(schema.groups).values({ id: values.settlement_group_id, name: 'Postman accounting ' + runId, currency: 'INR', createdById: values.owner_id });
  await db.insert(schema.groupMembers).values([{ groupId: values.settlement_group_id, userId: values.owner_id, role: 'ADMIN' }, { groupId: values.settlement_group_id, userId: values.friend_id }]);
  const environment = resolve(local, 'local.environment.yaml');
  await writeFile(environment, JSON.stringify({ name: 'Spending Diary isolated fixtures', values: Object.entries(values).map(([key, value]) => ({ key, value, enabled: true, type: key.endsWith('_cookie') ? 'secret' : 'default' })) }, null, 2));
  console.log('Waiting for the sign-in rate-limit window used by fixture setup to expire.');
  await delay(11000);
  const args = ['collection', 'run', 'postman/collections/Spending Diary', '-e', environment,
    '--no-report-events', '--ignore-redirects', '--timeout-request', '45000'];
  process.exitCode = await command(process.platform === 'win32' ? 'postman.exe' : 'postman', args, { shell: false, logPath: resolve(local, 'latest-run.txt') });
  console.log(`Postman exit code: ${process.exitCode}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    if (process.platform === 'win32') await command('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
    else server.kill('SIGTERM');
  }
  if (smtp) await smtp.close();
  await pool.end();
}
