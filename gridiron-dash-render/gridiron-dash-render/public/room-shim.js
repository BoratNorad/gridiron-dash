/* Connects the game's online play to this site's own server instead of Claude's.
   The game asks for a "room"; this provides one backed by a WebSocket to /ws. */
(function () {
  window.GD_SELFHOST = true;
  let ws = null, room = null, closed = false, retry = 0, mine = {}, peers = new Map(), cbs = [];
  const url = () => (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  const emit = () => { for (const cb of cbs.slice()) { try { cb(); } catch (e) {} } };
  const send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  function connect() {
    return new Promise((resolve, reject) => {
      let opened = false;
      ws = new WebSocket(url());
      ws.onopen = () => {
        opened = true; retry = 0;
        if (room) { send({ t: 'join', room }); if (Object.keys(mine).length) send({ t: 'p', patch: mine }); }
        resolve();
      };
      ws.onmessage = e => {
        let m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.t === 'hello') { peers = new Map((m.peers || []).map(p => [p.id, p.presence || {}])); emit(); }
        else if (m.t === 'p') { const cur = peers.get(m.id) || {}; peers.set(m.id, Object.assign(cur, m.patch)); emit(); }
        else if (m.t === 'l') { peers.delete(m.id); emit(); }
      };
      ws.onclose = () => {
        if (!opened) reject(new Error('Could not reach the game server.'));
        peers.clear(); emit();
        if (!closed && room) setTimeout(() => connect().catch(() => {}), Math.min(8000, 500 * Math.pow(2, retry++)));
      };
      ws.onerror = () => {};
    });
  }
  const handle = {
    presence(patch) { Object.assign(mine, patch); send({ t: 'p', patch }); return Promise.resolve(); },
    peers() { return [...peers.entries()].map(([id, presence]) => ({ id, presence, sameTab: false })); },
    onPeers(cb) { cbs.push(cb); return () => { cbs = cbs.filter(x => x !== cb); }; },
    leave() { closed = true; send({ t: 'leave' }); room = null; mine = {}; peers.clear(); cbs = []; try { ws && ws.close(); } catch (e) {} ws = null; }
  };
  const api = {
    async join(name) {
      closed = false; room = String(name); mine = {}; peers = new Map(); cbs = [];
      if (ws && ws.readyState === 1) send({ t: 'join', room });
      else await connect();
      return handle;
    }
  };
  window.claude = { use: async cap => (cap === 'room' ? api : null) };
})();
