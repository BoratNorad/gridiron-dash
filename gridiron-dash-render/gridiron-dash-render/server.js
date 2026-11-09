/* Gridiron Dash: game server for Render (or any Node host).
   Serves the game page and relays online multiplayer between players' devices over WebSockets. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const cache = new Map();

function serveFile(req, res, file) {
  let entry = cache.get(file);
  if (!entry) {
    try {
      const raw = fs.readFileSync(file);
      entry = { raw, gz: zlib.gzipSync(raw, { level: 9 }), type: TYPES[path.extname(file)] || 'application/octet-stream' };
      cache.set(file, entry);
    } catch (e) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
  }
  const gz = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  const body = gz ? entry.gz : entry.raw;
  res.writeHead(200, { 'Content-Type': entry.type, 'Content-Length': body.length, 'Cache-Control': 'no-cache', ...(gz ? { 'Content-Encoding': 'gzip', 'Vary': 'Accept-Encoding' } : {}) });
  res.end(req.method === 'HEAD' ? undefined : body);
}

const server = http.createServer((req, res) => {
  let p = '/';
  try { p = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) {}
  if (p === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  serveFile(req, res, file);
});

/* Rooms: each player has a "presence" object. A player sends patches to it; the server merges
   each patch and forwards it to everyone else in the room. New arrivals get everyone's full presence. */
const rooms = new Map();
const MAX_IN_ROOM = 8;
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 512 * 1024 });

function sendTo(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function leaveRoom(c) {
  if (!c.room) return;
  const r = rooms.get(c.room);
  if (r) {
    r.delete(c.id);
    for (const o of r.values()) sendTo(o.ws, { t: 'l', id: c.id });
    if (!r.size) rooms.delete(c.room);
  }
  c.room = null;
}

wss.on('connection', ws => {
  const c = { id: crypto.randomBytes(6).toString('hex'), ws, room: null, presence: {} };
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', data => {
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'join') {
      const name = String(m.room || '').toLowerCase().slice(0, 64);
      if (!/^[a-z0-9-]+$/.test(name)) return sendTo(ws, { t: 'err', code: 'bad_room' });
      if (c.room !== name) {
        leaveRoom(c);
        let r = rooms.get(name);
        if (!r) { r = new Map(); rooms.set(name, r); }
        if (r.size >= MAX_IN_ROOM) return sendTo(ws, { t: 'err', code: 'full' });
        c.room = name; c.presence = {};
        r.set(c.id, c);
        for (const o of r.values()) if (o !== c) sendTo(o.ws, { t: 'p', id: c.id, patch: {} });
      }
      const r = rooms.get(name);
      sendTo(ws, { t: 'hello', id: c.id, peers: [...r.values()].filter(o => o !== c).map(o => ({ id: o.id, presence: o.presence })) });
    } else if (m.t === 'p' && c.room && m.patch && typeof m.patch === 'object') {
      Object.assign(c.presence, m.patch);
      const r = rooms.get(c.room);
      if (r) for (const o of r.values()) if (o !== c) sendTo(o.ws, { t: 'p', id: c.id, patch: m.patch });
    } else if (m.t === 'leave') {
      leaveRoom(c);
    }
  });
  ws.on('close', () => leaveRoom(c));
  ws.on('error', () => {});
});

/* Keep connections alive through proxies and drop dead ones. */
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  }
}, 25000);

server.listen(PORT, () => console.log(`Gridiron Dash running on port ${PORT}`));
