/**
 * Serveur matchmaking Internet pour Arena Ki Fighters (Socket.io).
 * Modes: 1v1 et 2v2.
 */
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { randomUUID } = require('crypto');

const PORT = Number(process.env.AKI_PORT || 3847);
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

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
      }
    });
    io.to(roomId).emit('match:found', {
      roomId,
      mode,
      seed: room.seed,
      players: players.map(({ id, name, characterId, seat, team }) => ({
        id, name, characterId, seat, team
      }))
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
    const name = String(payload.name || 'Combattant').slice(0, 24);
    const characterId = String(payload.characterId || 'lumo');
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
    if (!roomId) return;
    // Host seat 0 broadcasts authoritative-ish snapshot for simplicity
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

  socket.on('disconnect', () => {
    for (const q of queues.values()) {
      const idx = q.findIndex((p) => p.socket.id === socket.id);
      if (idx >= 0) q.splice(idx, 1);
    }
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
