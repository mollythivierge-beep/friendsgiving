// Vercel serverless function: GET / POST / DELETE the shared Friendsgiving list.
// Stored in Upstash Redis (add it from the Vercel Marketplace; it sets the env vars below).
const crypto = require('crypto');

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'friendsgiving:entries';
const MAX_ENTRIES = 400;

const COURSES = ['apps', 'mains', 'sides', 'sweets', 'drinks', 'supplies'];
const TAGS = ['veg', 'vegan', 'gf', 'df', 'alc', 'nonalc'];

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

function clean(s, max) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) {
    return res.status(500).json({ error: 'Storage is not connected yet. Add Upstash Redis to this Vercel project.' });
  }
  try {
    if (req.method === 'GET') {
      const flat = (await redis(['HGETALL', KEY])) || [];
      const entries = [];
      for (let i = 1; i < flat.length; i += 2) {
        try {
          const e = JSON.parse(flat[i]);
          entries.push({ id: e.id, course: e.course, name: e.name, who: e.who, tags: e.tags, at: e.at });
        } catch (err) { /* skip bad row */ }
      }
      entries.sort((a, b) => a.at - b.at);
      return res.status(200).json({ entries });
    }

    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const name = clean(b.name, 80);
      const who = clean(b.who, 40);
      const ownerKey = clean(b.ownerKey, 80);
      if (!name || !who || !ownerKey) return res.status(400).json({ error: 'Name and dish are required.' });
      if (COURSES.indexOf(b.course) === -1) return res.status(400).json({ error: 'Unknown section.' });
      const tags = (Array.isArray(b.tags) ? b.tags : []).filter(function (t, i, a) { return TAGS.indexOf(t) > -1 && a.indexOf(t) === i; });
      const count = await redis(['HLEN', KEY]);
      if (count >= MAX_ENTRIES) return res.status(429).json({ error: 'The list is full.' });
      const entry = { id: crypto.randomUUID(), course: b.course, name, who, tags, at: Date.now(), ownerKey };
      await redis(['HSET', KEY, entry.id, JSON.stringify(entry)]);
      return res.status(201).json({ entry: { id: entry.id, course: entry.course, name, who, tags, at: entry.at } });
    }

    if (req.method === 'DELETE') {
      const id = clean(req.query && req.query.id, 80);
      const ownerKey = clean(req.headers['x-owner-key'], 80);
      const adminKey = clean(req.headers['x-admin-key'], 200);
      const isAdmin = !!process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY;
      const raw = await redis(['HGET', KEY, id]);
      if (!raw) return res.status(200).json({ ok: true });
      const e = JSON.parse(raw);
      if (!isAdmin && (!ownerKey || e.ownerKey !== ownerKey)) return res.status(403).json({ error: 'You can only remove your own dishes.' });
      await redis(['HDEL', KEY, id]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
};
