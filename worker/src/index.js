const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

function defaultWeek() {
  const week = {};
  DAYS.forEach(d => {
    week[d] = Array(10).fill(null).map(() => ({ cat: null, note: '' }));
  });
  return week;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function err(msg, status = 400) {
  return new Response(msg, { status, headers: CORS });
}

function isAuthed(request, env) {
  const header = request.headers.get('Authorization') || '';
  return header === `Bearer ${env.BEARER_TOKEN}`;
}

// GET /api/week/:weekKey
async function getWeek(env, weekKey) {
  const row = await env.DB
    .prepare('SELECT payload FROM weeks WHERE week_key = ?')
    .bind(weekKey)
    .first();
  const week = row ? JSON.parse(row.payload) : defaultWeek();
  return json({ weekKey, week });
}

// PUT /api/week/:weekKey  body: { week: { mon: [...], ... } }
async function putWeek(env, weekKey, request) {
  let body;
  try { body = await request.json(); } catch { return err('Invalid JSON'); }
  if (!body.week) return err('Missing week payload');

  await env.DB
    .prepare(`
      INSERT INTO weeks (week_key, payload, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(week_key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
    `)
    .bind(weekKey, JSON.stringify(body.week), Date.now())
    .run();

  return json({ ok: true });
}

// GET /api/templates
async function getTemplates(env) {
  const { results } = await env.DB
    .prepare('SELECT id, name, payload FROM templates ORDER BY created_at DESC')
    .all();
  const templates = results.map(r => ({ id: r.id, name: r.name, week: JSON.parse(r.payload) }));
  return json(templates);
}

// POST /api/templates  body: { name: string, week: {...} }
async function postTemplate(env, request) {
  let body;
  try { body = await request.json(); } catch { return err('Invalid JSON'); }
  if (!body.name || !body.week) return err('Missing name or week');

  const id = crypto.randomUUID();
  await env.DB
    .prepare('INSERT INTO templates (id, name, payload, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, body.name, JSON.stringify(body.week), Date.now())
    .run();

  return json({ id, name: body.name }, 201);
}

// DELETE /api/templates/:id
async function deleteTemplate(env, id) {
  await env.DB
    .prepare('DELETE FROM templates WHERE id = ?')
    .bind(id)
    .run();
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const { method } = request;
    const { pathname } = new URL(request.url);

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (!isAuthed(request, env)) {
      return err('Unauthorized', 401);
    }

    // /api/week/:weekKey
    const weekMatch = pathname.match(/^\/api\/week\/([^/]+)$/);
    if (weekMatch) {
      const weekKey = weekMatch[1];
      if (method === 'GET') return getWeek(env, weekKey);
      if (method === 'PUT') return putWeek(env, weekKey, request);
      return err('Method Not Allowed', 405);
    }

    // /api/templates
    if (pathname === '/api/templates') {
      if (method === 'GET') return getTemplates(env);
      if (method === 'POST') return postTemplate(env, request);
      return err('Method Not Allowed', 405);
    }

    // /api/templates/:id
    const tmplMatch = pathname.match(/^\/api\/templates\/([^/]+)$/);
    if (tmplMatch) {
      if (method === 'DELETE') return deleteTemplate(env, tmplMatch[1]);
      return err('Method Not Allowed', 405);
    }

    return err('Not Found', 404);
  },
};
