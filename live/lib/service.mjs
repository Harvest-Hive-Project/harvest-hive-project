import { createLead, SOURCES, STATUSES, OWNERS, REWARDS, VOLUMES } from '../public/hive/model.mjs';

// Authorize stable numeric GitHub identities, never a submitted email or display name.
export const ADMIN_IDS = Object.freeze({ '336628095': 'Bryce', '92264048': 'Will', '341621187': 'Matthew' });
const SESSION = '__Host-hive-session', FLOW = '__Host-hive-flow', OAUTH = '__Host-hive-oauth';
const now = () => Date.now();
const random = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
export const digest = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(b => b.toString(16).padStart(2, '0')).join('');
const cookie = (key, value, seconds) => `${key}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${seconds}`;
const cookies = request => Object.fromEntries((request.headers.get('cookie') || '').split(';').map(p => p.trim().split('=')).filter(p => p.length === 2));
const json = (data, status = 200, extras = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extras } });
class Failure extends Error { constructor(status, message, errors) { super(message); this.status = status; this.errors = errors; } }
const reject = (status, message, errors) => { throw new Failure(status, message, errors); };
const origin = (request, env) => { if (!env.PUBLIC_ORIGIN || request.headers.get('Origin') !== env.PUBLIC_ORIGIN) reject(403, 'Request origin is not allowed.'); };
const text = (value, max = 1000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const source = value => SOURCES.filter(s => s !== 'Google import').includes(value) ? value : 'Organic';

async function body(request) {
  if (!request.headers.get('content-type')?.includes('application/json')) reject(415, 'Send JSON.');
  const reader = request.body?.getReader(); if (!reader) reject(400, 'Missing request body.');
  let size = 0, chunks = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 16384) { await reader.cancel(); reject(413, 'Request is too large.'); } chunks.push(value); }
  const all = new Uint8Array(size); let offset = 0; for (const c of chunks) { all.set(c, offset); offset += c.byteLength; }
  let value; try { value = JSON.parse(new TextDecoder().decode(all)); } catch { reject(400, 'Invalid JSON.'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') reject(400, 'Invalid request.');
  return value;
}

async function limit(request, env, group, maximum) {
  if (!env.RATE_LIMIT_SECRET) reject(503, 'The service is being configured. Please try again shortly.');
  // Cloudflare supplies this trusted header; no raw IP addresses are stored.
  const address = request.headers.get('CF-Connecting-IP') || cookies(request)[FLOW] || 'unknown';
  const key = await digest(`${env.RATE_LIMIT_SECRET}:${group}:${address}:${Math.floor(now() / 3600000)}`);
  const row = await env.DB.prepare('INSERT INTO rate_limits (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(key, now() + 3600000).first();
  if (row.count > maximum) reject(429, 'Too many attempts. Please try again later.');
  // Bounded privacy housekeeping, independent of registration records.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM rate_limits WHERE id IN (SELECT id FROM rate_limits WHERE expires < ? LIMIT 100)').bind(now()),
    env.DB.prepare('DELETE FROM sessions WHERE digest IN (SELECT digest FROM sessions WHERE expires < ? LIMIT 100)').bind(now()),
    env.DB.prepare('DELETE FROM oauth_states WHERE digest IN (SELECT digest FROM oauth_states WHERE expires < ? LIMIT 100)').bind(now()),
  ]);
}

async function member(request, env) {
  const token = cookies(request)[SESSION]; if (!/^[a-f0-9]{64}$/.test(token || '')) reject(401, 'Sign in with GitHub to view analytics.');
  const session = await env.DB.prepare('SELECT github_id,login FROM sessions WHERE digest=? AND expires>?').bind(await digest(token), now()).first();
  const name = session && ADMIN_IDS[session.github_id];
  if (!name) reject(401, 'Sign in with an approved GitHub account.');
  return { name, login: session.login, githubId: session.github_id };
}

const profileChoices = { volume: VOLUMES, rewards: REWARDS, approval: ['Yes', 'No', 'Not sure'], currentInsurance: ['Existing referral partner', 'Clients find their own', 'Lender or dealer handles it', 'Not sure'], priority: ['Fast quotes', 'Competitive options', 'Responsive agents', 'Easy proof of insurance'] };
function profileInput(input) {
  const profile = { barrier: text(input.barrier) };
  for (const [key, choices] of Object.entries(profileChoices)) {
    if (key === 'rewards') { const values = input.rewards ?? []; if (!Array.isArray(values) || values.length > 2 || values.some(v => !choices.includes(v))) reject(400, 'Choose up to two rewards.'); profile.rewards = [...new Set(values)]; }
    else { const value = input[key] || ''; if (value && !choices.includes(value)) reject(400, 'Choose a valid preference.'); profile[key] = value; }
  }
  return Object.values(profile).some(v => Array.isArray(v) ? v.length : v) ? profile : null;
}

async function githubPost(path, data, fetcher) {
  const response = await fetcher(`https://github.com/${path}`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data), signal: AbortSignal.timeout(15000) });
  if (!response.ok) reject(503, 'GitHub sign-in is temporarily unavailable.');
  return response.json();
}

export async function handleRequest(request, env, fetcher = fetch) {
  try {
    if (!env.DB) reject(503, 'The database is being configured.');
    const path = new URL(request.url).pathname, method = request.method;
    if (method === 'POST') origin(request, env);

    if (path === '/api/waitlist/start' && method === 'POST') {
      await limit(request, env, 'start', 300); const input = await body(request);
      const existing = cookies(request)[FLOW];
      if (existing) { const start = await env.DB.prepare('SELECT id,source FROM signup_starts WHERE id=? AND created_at>?').bind(existing, new Date(now() - 3600000).toISOString()).first(); if (start && start.source === source(input.source)) return json({ started: true }); }
      const id = random(); await env.DB.prepare('INSERT INTO signup_starts(id,source,created_at) VALUES (?,?,?)').bind(id, source(input.source), new Date().toISOString()).run();
      return json({ started: true }, 201, { 'Set-Cookie': cookie(FLOW, id, 3600) });
    }

    if (path === '/api/waitlist' && method === 'POST') {
      await limit(request, env, 'signup', 60); const input = await body(request);
      if (input.website) return json({ received: true });
      const flow = cookies(request)[FLOW];
      const start = flow && await env.DB.prepare('SELECT source,created_at FROM signup_starts WHERE id=?').bind(flow).first();
      if (!start || now() - Date.parse(start.created_at) < 1500 || now() - Date.parse(start.created_at) > 3600000) reject(400, 'Please reopen the signup form and try again.');
      const safe = {};
      for (const key of ['name', 'email', 'role', 'company', 'phone']) safe[key] = typeof input[key] === 'string' ? input[key] : '';
      safe.counties = Array.isArray(input.counties) && input.counties.length <= 67 ? input.counties : [];
      safe.source = start.source;
      const result = createLead(safe, []); if (result.errors) reject(400, 'Check the highlighted details.', result.errors);
      const capability = random(), lead = result.lead;
      const created = await env.DB.prepare('INSERT INTO partners(id,email,data,created_at,profile_digest,profile_expires) VALUES (?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING RETURNING id').bind(lead.id, lead.email, JSON.stringify(lead), lead.createdAt, await digest(capability), now() + 86400000).first();
      // A duplicate never discloses existing contact details or grants edit access.
      return created ? json({ received: true, id: lead.id, createdAt: lead.createdAt, profileToken: capability }, 201) : json({ received: true });
    }

    if (path === '/api/waitlist/profile' && method === 'POST') {
      const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
      if (!/^[a-f0-9]{64}$/.test(token || '')) reject(401, 'This signup link is no longer available.');
      const hash = await digest(token), input = await body(request);
      const record = await env.DB.prepare('SELECT id,data FROM partners WHERE profile_digest=? AND profile_expires>?').bind(hash, now()).first();
      if (!record) reject(401, 'This signup link is no longer available.');
      const lead = JSON.parse(record.data); lead.profile = profileInput(input);
      const updated = await env.DB.prepare("UPDATE partners SET data=json_set(data,'$.profile',json(?)),profile_digest=NULL,profile_expires=NULL WHERE id=? AND profile_digest=? AND profile_expires>? RETURNING id").bind(JSON.stringify(lead.profile), record.id, hash, now()).first();
      if (!updated) reject(401, 'Preferences have already been saved.');
      return json({ saved: true });
    }

    if (path === '/auth/github/start' && method === 'POST') {
      await limit(request, env, 'auth', 15);
      if (!env.GITHUB_CLIENT_ID) reject(503, 'GitHub sign-in is being connected.');
      const data = await githubPost('login/device/code', { client_id: env.GITHUB_CLIENT_ID, scope: '' }, fetcher);
      if (!data.device_code || !data.user_code || data.verification_uri !== 'https://github.com/login/device') reject(503, 'GitHub sign-in is temporarily unavailable.');
      const token = random(), interval = Math.max(5, Number(data.interval) || 5), expires = now() + Math.min(900, Number(data.expires_in) || 900) * 1000;
      await env.DB.prepare('INSERT INTO oauth_states(digest,device_code,expires,interval,next_poll) VALUES (?,?,?,?,?)').bind(await digest(token), data.device_code, expires, interval, now() + interval * 1000).run();
      return json({ userCode: data.user_code, verificationUri: data.verification_uri, interval, expires }, 201, { 'Set-Cookie': cookie(OAUTH, token, 900) });
    }

    if (path === '/auth/github/poll' && method === 'POST') {
      const token = cookies(request)[OAUTH]; if (!/^[a-f0-9]{64}$/.test(token || '')) reject(401, 'Start GitHub sign-in again.');
      const hash = await digest(token);
      const record = await env.DB.prepare('SELECT device_code,interval,next_poll FROM oauth_states WHERE digest=? AND expires>?').bind(hash, now()).first();
      if (!record) reject(401, 'Sign-in expired. Please start again.');
      if (record.next_poll > now()) return json({ pending: true, interval: Math.max(record.interval, Math.ceil((record.next_poll - now()) / 1000)) });
      const locked = await env.DB.prepare('UPDATE oauth_states SET next_poll=? WHERE digest=? AND next_poll<=? RETURNING digest').bind(now() + record.interval * 1000, hash, now()).first();
      if (!locked) return json({ pending: true, interval: record.interval });
      const data = await githubPost('login/oauth/access_token', { client_id: env.GITHUB_CLIENT_ID, device_code: record.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }, fetcher);
      if (data.error === 'authorization_pending') return json({ pending: true, interval: record.interval });
      if (data.error === 'slow_down') { const interval = record.interval + 5; await env.DB.prepare('UPDATE oauth_states SET interval=?,next_poll=? WHERE digest=?').bind(interval, now() + interval * 1000, hash).run(); return json({ pending: true, interval }); }
      if (!data.access_token) { await env.DB.prepare('DELETE FROM oauth_states WHERE digest=?').bind(hash).run(); reject(401, 'GitHub sign-in was declined or expired. Please start again.'); }
      const identityResponse = await fetcher('https://api.github.com/user', { headers: { Authorization: `Bearer ${data.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Harvest-Hive-Analytics' }, signal: AbortSignal.timeout(15000) });
      if (!identityResponse.ok) reject(503, 'Could not verify your GitHub identity. Please start again.');
      const identity = await identityResponse.json();
      const consumed = await env.DB.prepare('DELETE FROM oauth_states WHERE digest=? AND expires>? RETURNING digest').bind(hash, now()).first();
      if (!consumed) reject(401, 'Sign-in already completed or expired.');
      if (!ADMIN_IDS[String(identity.id)]) reject(403, 'Analytics is available only to Bryce, Will and Matthew’s approved GitHub accounts.');
      // GitHub access tokens are used for identity verification only and are never persisted.
      const session = random(); await env.DB.prepare('INSERT INTO sessions(digest,github_id,login,expires) VALUES (?,?,?,?)').bind(await digest(session), String(identity.id), String(identity.login), now() + 8 * 3600000).run();
      const response = json({ signedIn: true }); response.headers.append('Set-Cookie', cookie(SESSION, session, 8 * 3600)); response.headers.append('Set-Cookie', cookie(OAUTH, '', 0)); return response;
    }

    if (path === '/auth/signout' && method === 'POST') {
      const token = cookies(request)[SESSION]; if (token) await env.DB.prepare('DELETE FROM sessions WHERE digest=?').bind(await digest(token)).run();
      return json({ signedOut: true }, 200, { 'Set-Cookie': cookie(SESSION, '', 0) });
    }

    if (path === '/api/me' && method === 'GET') return json({ user: await member(request, env) });
    if (path === '/api/admin/state' && method === 'GET') {
      const user = await member(request, env);
      const [partners, starts] = await Promise.all([env.DB.prepare('SELECT data FROM partners ORDER BY created_at DESC').all(), env.DB.prepare('SELECT source,created_at FROM signup_starts ORDER BY created_at DESC').all()]);
      return json({ user, leads: partners.results.map(r => JSON.parse(r.data)), starts: starts.results.map(r => ({ source: r.source, createdAt: r.created_at })), updatedAt: new Date().toISOString() });
    }

    const edit = path.match(/^\/api\/admin\/partners\/([a-f0-9-]{36})$/);
    if (edit && method === 'PATCH') {
      origin(request, env); const user = await member(request, env), input = await body(request);
      const validDate = typeof input.followUp === 'string' && (!input.followUp || (/^\d{4}-\d{2}-\d{2}$/.test(input.followUp) && !Number.isNaN(Date.parse(input.followUp)) && new Date(input.followUp).toISOString().slice(0,10) === input.followUp));
      if (!STATUSES.includes(input.status) || !OWNERS.includes(input.owner) || typeof input.notes !== 'string' || input.notes.length > 3000 || !validDate) reject(400, 'Invalid follow-up details.');
      const record = await env.DB.prepare('SELECT data FROM partners WHERE id=?').bind(edit[1]).first(); if (!record) reject(404, 'Partner not found.');
      const changes = { status: input.status, owner: input.owner, notes: input.notes, followUp: input.followUp || '' };
      // json_set updates only team fields, preserving concurrently submitted preferences.
      await env.DB.batch([
        env.DB.prepare("UPDATE partners SET data=json_set(data,'$.status',?,'$.owner',?,'$.notes',?,'$.followUp',?) WHERE id=?").bind(changes.status, changes.owner, changes.notes, changes.followUp, edit[1]),
        env.DB.prepare('INSERT INTO audit_log(id,actor,partner_id,action,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), user.githubId, edit[1], 'update-follow-up', new Date().toISOString()),
      ]);
      const updated = await env.DB.prepare('SELECT data FROM partners WHERE id=?').bind(edit[1]).first();
      return json({ lead: JSON.parse(updated.data) });
    }
    return json({ error: 'Not found.' }, 404);
  } catch (error) {
    if (error instanceof Failure) return json({ error: error.message, ...(error.errors ? { errors: error.errors } : {}) }, error.status);
    return json({ error: 'The service is temporarily unavailable. Your form has not been cleared; please try again.' }, 503);
  }
}
