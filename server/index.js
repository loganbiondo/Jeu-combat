/**
 * Serveur matchmaking Internet pour Arena Ki Fighters (Socket.io).
 * Modes: 1v1 et 2v2.
 */
const http = require('http');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const { randomUUID } = require('crypto');

const PORT = Number(process.env.AKI_PORT || 3847);
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use('/serpent', express.static(path.join(__dirname, '..', 'serpent')));

app.get('/health', (_req, res) => {
  res.json({ ok: true, queues: Object.fromEntries([...queues.entries()].map(([k, v]) => [k, v.length])) });
});

/** @type {Map<string, Array<{id:string, socket:any, name:string, characterId:string}>>} */
const queues = new Map([
  ['1v1', []],
  ['2v2', []]
]);

/** @type {Map<string, object>} */
const rooms = new Map();

/** @type {Map<string, Set<string>>} */
const serpentRooms = new Map();
const SERPENT_MAX_ROOMS = 48;
const SERPENT_JOIN_LIMIT = 6;
const SERPENT_JOIN_WINDOW_MS = 10000;

function dropSerpent(socket, notify) {
  const code = socket.data.serpentRoom;
  if (!code) return;
  socket.leave(`serpent:${code}`);
  const set = serpentRooms.get(code);
  if (set) {
    set.delete(socket.id);
    if (set.size === 0) serpentRooms.delete(code);
  }
  if (notify) socket.to(`serpent:${code}`).emit('serpent:left', { id: socket.id });
  socket.data.serpentRoom = null;
}

function serpentCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function finite(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function sanitizeSnap(payload) {
  const x = finite(payload.x, -4000, 4000);
  const y = finite(payload.y, -4000, 4000);
  const angle = finite(payload.a, -20, 20);
  if (x == null || y == null || angle == null) return null;
  const raw = Array.isArray(payload.pts) ? payload.pts : [];
  const pts = [];
  for (let i = 0; i + 1 < raw.length && pts.length < 48; i += 2) {
    const px = finite(raw[i], -4000, 4000);
    const py = finite(raw[i + 1], -4000, 4000);
    if (px == null || py == null) continue;
    pts.push(Math.round(px), Math.round(py));
  }
  return {
    x: Math.round(x),
    y: Math.round(y),
    a: angle,
    alive: payload.alive !== false,
    score: finite(payload.score, 0, 999999) || 0,
    kills: finite(payload.kills, 0, 9999) || 0,
    length: finite(payload.length, 1, 400) || 12,
    shields: finite(payload.shields, 0, 3) || 0,
    width: finite(payload.width, 4, 80) || 16,
    boost: !!payload.boost,
    skin: String(payload.skin || 'ion').replace(/[^\w-]/g, '').slice(0, 16) || 'ion',
    pts
  };
}

function seatCount(mode) {
  return mode === '2v2' ? 4 : 2;
}

function teamForSeat(mode, seat) {
  if (mode === '1v1') return seat;
  return seat < 2 ? 0 : 1;
}

function tryMatch(mode) {
  const q = queues.get(mode);
  const need = seatCount(mode);
  while (q.length >= need) {
    const players = q.splice(0, need).map((p, seat) => ({
      id: p.id,
      name: p.name,
      characterId: p.characterId,
      seat,
      team: teamForSeat(mode, seat),
      socketId: p.socket.id
    }));
    const roomId = randomUUID().slice(0, 8);
    const room = {
      id: roomId,
      mode,
      players,
      inputs: {},
      started: false,
      seed: Math.floor(Math.random() * 1e9)
    };
    rooms.set(roomId, room);
    players.forEach((pl) => {
      const sock = io.sockets.sockets.get(pl.socketId);
      if (sock) {
        sock.join(roomId);
        sock.data.roomId = roomId;
        sock.data.playerId = pl.id;
        sock.emit('match:found', {
          roomId,
          mode,
          seed: room.seed,
          youAre: pl.id,
          yourSeat: pl.seat,
          players: players.map(({ id, name, characterId, seat, team }) => ({
            id, name, characterId, seat, team
          }))
        });
      }
    });
    setTimeout(() => {
      const r = rooms.get(roomId);
      if (r && !r.started) {
        r.started = true;
        io.to(roomId).emit('match:start', { roomId, seed: r.seed });
      }
    }, 1200);
  }
}

io.on('connection', (socket) => {
  socket.emit('server:hello', { ok: true, modes: ['1v1', '2v2'] });

  socket.on('queue:join', (payload = {}) => {
    const mode = payload.mode === '2v2' ? '2v2' : '1v1';
    const name = String(payload.name || 'Combattant')
      .replace(/[<>&"'`]/g, '')
      .slice(0, 24) || 'Combattant';
    const characterId = String(payload.characterId || 'lumo').replace(/[^\w-]/g, '').slice(0, 32) || 'lumo';
    // Remove from any queue first
    for (const q of queues.values()) {
      const idx = q.findIndex((p) => p.socket.id === socket.id);
      if (idx >= 0) q.splice(idx, 1);
    }
    const entry = { id: randomUUID().slice(0, 8), socket, name, characterId };
    queues.get(mode).push(entry);
    socket.data.queuedMode = mode;
    socket.emit('queue:joined', { mode, position: queues.get(mode).length });
    tryMatch(mode);
  });

  socket.on('queue:leave', () => {
    for (const q of queues.values()) {
      const idx = q.findIndex((p) => p.socket.id === socket.id);
      if (idx >= 0) q.splice(idx, 1);
    }
    socket.emit('queue:left');
  });

  socket.on('match:input', (payload = {}) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;
    room.inputs[socket.data.playerId] = {
      ...payload,
      t: Date.now()
    };
    socket.to(roomId).emit('match:input', {
      playerId: socket.data.playerId,
      input: payload
    });
  });

  socket.on('match:state', (payload = {}) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!roomId || !room) return;
    // Only seat 0 (host) may broadcast state snapshots
    const me = room.players.find((p) => p.id === socket.data.playerId);
    if (!me || me.seat !== 0) return;
    if (payload && Array.isArray(payload.log)) {
      payload = {
        ...payload,
        log: payload.log.slice(0, 40).map((l) => ({
          t: String(l?.t ?? '').slice(0, 12),
          msg: String(l?.msg ?? '').slice(0, 160)
        }))
      };
    }
    socket.to(roomId).emit('match:state', payload);
  });

  socket.on('match:event', (payload = {}) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('match:event', payload);
  });

  socket.on('match:end', (payload = {}) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    io.to(roomId).emit('match:end', payload);
    rooms.delete(roomId);
  });

  socket.on('serpent:join', (payload = {}) => {
    const now = Date.now();
    const stamps = socket.data.serpentJoins || (socket.data.serpentJoins = []);
    while (stamps.length && now - stamps[0] > SERPENT_JOIN_WINDOW_MS) stamps.shift();
    if (stamps.length >= SERPENT_JOIN_LIMIT) {
      socket.emit('serpent:full');
      return;
    }
    const code = serpentCode(payload.room) || 'WORLD';
    let set = serpentRooms.get(code);
    if (!set && code !== 'WORLD' && serpentRooms.size >= SERPENT_MAX_ROOMS) {
      socket.emit('serpent:full');
      return;
    }
    if (set && set.size >= 8 && !set.has(socket.id)) {
      socket.emit('serpent:full');
      return;
    }
    stamps.push(now);
    if (socket.data.serpentRoom && socket.data.serpentRoom !== code) dropSerpent(socket, true);
    if (!set) serpentRooms.set(code, (set = new Set()));
    socket.join(`serpent:${code}`);
    socket.data.serpentRoom = code;
    socket.data.serpentName = String(payload.name || 'Joueur').replace(/[<>&"'`]/g, '').slice(0, 16) || 'Joueur';
    set.add(socket.id);
    socket.emit('serpent:joined', { room: code, id: socket.id, players: set.size });
  });

  socket.on('serpent:snap', (payload = {}) => {
    const code = socket.data.serpentRoom;
    if (!code) return;
    const now = Date.now();
    if (now - (socket.data.serpentSnapAt || 0) < 70) return;
    socket.data.serpentSnapAt = now;
    const snap = sanitizeSnap(payload);
    if (!snap) return;
    snap.id = socket.id;
    snap.name = socket.data.serpentName;
    socket.to(`serpent:${code}`).emit('serpent:peer', snap);
  });

  socket.on('serpent:died', (payload = {}) => {
    const code = socket.data.serpentRoom;
    if (!code) return;
    const killer = String(payload.killer || '').replace(/[^\w-]/g, '').slice(0, 32);
    socket.to(`serpent:${code}`).emit('serpent:died', { id: socket.id, killer });
  });

  socket.on('serpent:leave', () => {
    dropSerpent(socket, true);
  });

  socket.on('disconnect', () => {
    for (const q of queues.values()) {
      const idx = q.findIndex((p) => p.socket.id === socket.id);
      if (idx >= 0) q.splice(idx, 1);
    }
    dropSerpent(socket, true);
    const roomId = socket.data.roomId;
    if (roomId && rooms.has(roomId)) {
      io.to(roomId).emit('match:peer-left', { playerId: socket.data.playerId });
      rooms.delete(roomId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[AKI] Matchmaking listening on http://localhost:${PORT}`);
});
