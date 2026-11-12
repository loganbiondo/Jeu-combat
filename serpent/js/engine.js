/** Moteur d'arène Neon Serpent 3.0. Aucune dépendance DOM. */

export const ARENA_R = 1680;
export const SPACING = 13;
export const BASE_SPEED = 176;
const MAX_LEN = 220;
const CELL = 90;

const NAMES = ['Nyx', 'Ion', 'Vesper', 'Lumen', 'Sable', 'Hexa', 'Mira', 'Quill', 'Astra', 'Volt', 'Nori', 'Pico', 'Zara', 'Opal', 'Rune', 'Lyra', 'Kite', 'Sora', 'Yuki', 'Orion'];
const BOT_SKINS = ['ion', 'pulse', 'venom', 'solar', 'void', 'ember', 'pearl', 'prism'];
const PERK_POOL = ['venom', 'phase', 'magnet', 'razor', 'glutton', 'battery'];

const ORB_TARGET = { bit: 52, cluster: 12, shield: 4, magnet: 3, slowmo: 3, turbo: 3, core: 2 };

export function levelOf(snake) {
  return 1 + Math.floor((snake?.eats || 0) / 8);
}

export function wrapAngle(a) {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function hypot(x, y) {
  return Math.hypot(x, y);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function currentSpeed(snake, match) {
  if (!snake.alive) return 0;
  let s = BASE_SPEED;
  if (snake.isBoss) s *= 0.92;
  else if (!snake.isPlayer) s *= match.botMul;
  const pace = levelOf(match.player);
  s *= 1 + (pace - 1) * 0.055;
  if (snake.turboT > 0) s *= 1.36;
  if (snake.boosting) s *= 1.62;
  if (!snake.isPlayer && match.player.slowT > 0) s *= 0.58;
  return Math.min(470, s);
}

export class Match {
  constructor(options) {
    this.init(options || {});
  }

  init(options) {
    this.opts = options;
    const seed = options.seed >>> 0 || 1;
    this.rng = mulberry32(seed);
    this.mode = options.mode === 'arena' ? 'arena' : options.mode === 'room' ? 'room' : 'solo';
    this.botMul = this.mode === 'arena' ? 1.14 : 0.98;
    this.botCount = this.mode === 'arena' ? 11 : 7;
    this.time = 0;
    this.noOrbs = !!options.noOrbs;
    this.phase = options.countdown === false ? 'playing' : 'countdown';
    this.countdown = this.phase === 'countdown' ? 3 : 0;
    this._countShown = 4;
    this.dyingT = 0;
    this.hitStop = 0;
    this.offer = null;
    this.events = [];
    this.orbs = [];
    this.remotes = [];
    this.uid = 1;
    this.final = null;
    this.danger = 0;
    this.room = options.room || '';

    const names = [...NAMES];
    for (let i = names.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [names[i], names[j]] = [names[j], names[i]];
    }
    this._names = names;

    this.player = this.makeSnake({
      name: String(options.name || 'Joueur').slice(0, 16),
      skin: options.skin || 'ion',
      isPlayer: true,
      x: 0,
      y: 0,
      angle: 0,
      length: 16,
      trail: options.trail || 'none',
      hat: options.hat || 'none',
      deathStyle: options.death || 'shatter'
    });
    this.snakes = [this.player];
    for (let i = 0; i < this.botCount; i++) this.snakes.push(this.makeBot(i));
    this.fillOrbs(true);
  }

  restart() {
    const remotes = this.remotes;
    this.init(this.opts);
    this.remotes = remotes;
  }

  makeSnake(spec) {
    const snake = {
      id: spec.id || `s${this.uid++}`,
      name: spec.name,
      skin: spec.skin || 'ion',
      isPlayer: !!spec.isPlayer,
      isBoss: !!spec.isBoss,
      isRemote: !!spec.isRemote,
      x: spec.x || 0,
      y: spec.y || 0,
      angle: spec.angle || 0,
      steer: spec.angle || 0,
      travel: 0,
      pts: [],
      length: spec.length || 14,
      alive: true,
      shields: 0,
      shieldsGot: 0,
      powers: 0,
      score: 0,
      kills: 0,
      eats: 0,
      combo: 0,
      comboT: 0,
      magnetT: 0,
      slowT: 0,
      turboT: 0,
      ghostT: spec.ghostT || 0,
      phaseCd: 0,
      nova: 0,
      venom: 0,
      boosting: false,
      boostAcc: 0,
      wait: 0,
      seed: Math.floor(this.rng() * 1000),
      perks: new Set(),
      trail: spec.trail || 'none',
      hat: spec.hat || (spec.isBoss ? 'horns' : 'none'),
      deathStyle: spec.deathStyle || (spec.isBoss ? 'supernova' : 'shatter'),
      _lv: 1,
      lunge: 0,
      orbit: 2 + this.rng() * 2,
      dir: this.rng() < 0.5 ? -1 : 1,
      width: 16,
      hitR: 8,
      bodyR: 7
    };
    this.resize(snake);
    this.fillBody(snake);
    snake._lv = levelOf(snake);
    return snake;
  }

  makeBot(index) {
    const ang = this.rng() * Math.PI * 2;
    const rad = 420 + this.rng() * 760;
    return this.makeSnake({
      name: this._names[index % this._names.length],
      skin: BOT_SKINS[Math.floor(this.rng() * BOT_SKINS.length)],
      x: Math.cos(ang) * rad,
      y: Math.sin(ang) * rad,
      angle: ang + Math.PI,
      length: 12 + Math.floor(this.rng() * 14),
      ghostT: 0.7,
      trail: this.rng() < 0.25 ? 'ion' : 'none'
    });
  }

  resize(snake) {
    const base = snake.isBoss ? 28 : 15;
    snake.width = base + Math.min(12, snake.length * 0.045);
    snake.hitR = snake.width * 0.46;
    snake.bodyR = snake.width * 0.42;
  }

  fillBody(snake) {
    snake.pts.length = 0;
    for (let i = 0; i < snake.length; i++) {
      snake.pts.push({
        x: snake.x - Math.cos(snake.angle) * SPACING * i,
        y: snake.y - Math.sin(snake.angle) * SPACING * i
      });
    }
    snake.travel = 0;
  }

  step(dt, input = {}) {
    this.events.length = 0;
    const frame = clamp(dt || 0, 0, 0.05);
    this.time += frame;
    if (this.phase === 'paused' || this.phase === 'mutate' || this.phase === 'over') return;
    if (this.phase === 'countdown') {
      this.countdown -= frame;
      const shown = Math.max(0, Math.ceil(this.countdown));
      if (shown !== this._countShown) {
        this._countShown = shown;
        this.events.push({ type: 'count', value: shown });
      }
      if (this.countdown <= 0) this.phase = 'playing';
      return;
    }

    let sim = frame;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - frame);
      sim *= 0.2;
    }

    if (this.phase === 'dying') {
      this.dyingT -= frame;
      this.simulate(sim, { angle: null, boost: false, nova: false });
      if (this.dyingT <= 0) this.phase = 'over';
      return;
    }

    this.simulate(sim, input);
  }

  simulate(dt, input) {
    const player = this.player;
    if (player.alive && player.isPlayer) {
      if (typeof input.angle === 'number' && Number.isFinite(input.angle)) player.steer = input.angle;
      player.boosting = !!input.boost && player.length > 10;
      if (input.nova) this.castNova(player);
    }

    for (const snake of this.snakes) {
      if (!snake.alive) {
        if (snake.isPlayer || snake.isBoss) continue;
        snake.wait -= dt;
        if (snake.wait <= 0) this.revive(snake);
        continue;
      }
      if (!snake.isPlayer) this.think(snake, dt);
      this.moveSnake(snake, dt);
      this.applyWall(snake);
    }

    this.collideHeads();
    this.eatOrbs();
    this.applyMagnet(dt);
    this.applyVenom(dt);
    this.decay(dt);
    this.fillOrbs();
    this.ageOrbs(dt);

    if (player.alive) {
      const dist = hypot(player.x, player.y);
      this.danger = clamp((dist - (ARENA_R - 240)) / 240, 0, 1);
      this.checkLevel(player);
    }
  }

  moveSnake(snake, dt) {
    const speed = currentSpeed(snake, this);
    let left = speed * dt;
    const turnRate = (snake.boosting ? 6.2 : 10.4) * (snake.isBoss ? 0.72 : 1);
    while (left > 0.01) {
      const slice = Math.min(left, 6);
      left -= slice;
      const diff = wrapAngle(snake.steer - snake.angle);
      const maxTurn = turnRate * (slice / Math.max(speed, 1));
      snake.angle += clamp(diff, -maxTurn, maxTurn);
      snake.x += Math.cos(snake.angle) * slice;
      snake.y += Math.sin(snake.angle) * slice;
      snake.travel += slice;
      if (snake.travel >= SPACING) {
        snake.travel -= SPACING;
        snake.pts.unshift({ x: snake.x, y: snake.y });
        if (snake.pts.length > snake.length) snake.pts.pop();
      }
    }
    while (snake.pts.length > snake.length) snake.pts.pop();
    if (snake.boosting && snake.length > 10) {
      snake.boostAcc += dt;
      if (snake.boostAcc >= 0.11) {
        snake.boostAcc = 0;
        snake.length -= 1;
        this.spawnPellet(snake);
        this.resize(snake);
      }
    } else snake.boostAcc = 0;
    this.resize(snake);
  }

  think(snake, dt) {
    const player = this.player;
    const dWall = hypot(snake.x, snake.y);
    if (dWall > ARENA_R - 230) {
      snake.steer = Math.atan2(-snake.y, -snake.x);
      snake.boosting = dWall > ARENA_R - 90 && snake.length > 12;
      return;
    }

    if (snake.isBoss && player.alive) {
      const to = Math.atan2(player.y - snake.y, player.x - snake.x);
      const dist = hypot(player.x - snake.x, player.y - snake.y);
      if (snake.orbit > 0) {
        snake.orbit -= dt;
        snake.steer = to + (Math.PI / 2) * snake.dir;
        if (dist < 220) snake.steer = to + Math.PI;
        snake.boosting = false;
        if (snake.orbit <= 0) snake.lunge = 1.15;
      } else {
        snake.steer = to;
        snake.boosting = true;
        snake.lunge -= dt;
        if (snake.lunge <= 0) {
          snake.orbit = 2.1 + this.rng() * 1.6;
          snake.boosting = false;
        }
      }
      return;
    }

    const reckless = snake.seed % 5 === 0;
    if (player.alive && !reckless) {
      const dx = snake.x - player.x;
      const dy = snake.y - player.y;
      const d = hypot(dx, dy);
      if (d < 150 && d > 1) {
        snake.steer = Math.atan2(dy, dx);
        snake.boosting = d < 90 && snake.length > 14;
        return;
      }
      if (snake.length > player.length + 12 && d < 460) {
        snake.steer = Math.atan2(player.y - snake.y, player.x - snake.x);
        snake.boosting = d > 160 && d < 380 && snake.length > 16;
        return;
      }
    }

    let best = null;
    let bestD = Infinity;
    for (const orb of this.orbs) {
      if (orb.kind === 'razor') continue;
      const dd = (orb.x - snake.x) ** 2 + (orb.y - snake.y) ** 2;
      if (dd < bestD) {
        bestD = dd;
        best = orb;
      }
    }
    if (best) snake.steer = Math.atan2(best.y - snake.y, best.x - snake.x);
    snake.steer += Math.sin(this.time * 3 + snake.seed) * 0.18;
    snake.boosting = bestD > 320 * 320 && snake.length > 20 && this.rng() < 0.02;
  }

  applyWall(snake) {
    if (!snake.alive || snake.ghostT > 0) return;
    const d = hypot(snake.x, snake.y);
    const edge = ARENA_R - 14;
    if (d <= edge) return;
    const nx = snake.x / d;
    const ny = snake.y / d;
    this.hit(snake, { type: 'wall' });
    if (snake.alive) {
      const back = edge - 56;
      snake.x = nx * back;
      snake.y = ny * back;
      const inward = Math.atan2(-ny, -nx);
      snake.angle = inward;
      snake.steer = inward;
    } else {
      snake.x = nx * edge;
      snake.y = ny * edge;
    }
  }

  buildHash() {
    const map = new Map();
    const pushBody = (snake, pts, skip) => {
      if (!pts) return;
      for (let i = skip; i < pts.length; i++) {
        const pt = pts[i];
        const key = `${Math.floor(pt.x / CELL)},${Math.floor(pt.y / CELL)}`;
        let list = map.get(key);
        if (!list) map.set(key, (list = []));
        list.push({ snake, x: pt.x, y: pt.y, r: snake.bodyR || 8 });
      }
    };
    for (const snake of this.snakes) {
      const corpse = !snake.alive && snake.isPlayer && this.phase === 'dying';
      if (!snake.alive && !corpse) continue;
      pushBody(snake, snake.pts, 8);
    }
    for (const remote of this.remotes) {
      if (!remote.alive) continue;
      pushBody(remote, remote.pts, 4);
    }
    this._hash = map;
  }

  query(x, y) {
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    const out = [];
    for (let yy = cy - 1; yy <= cy + 1; yy++) {
      for (let xx = cx - 1; xx <= cx + 1; xx++) {
        const list = this._hash.get(`${xx},${yy}`);
        if (list) out.push(...list);
      }
    }
    return out;
  }

  collideHeads() {
    this.buildHash();
    for (const snake of this.snakes) {
      if (!snake.alive || snake.ghostT > 0) continue;
      const near = this.query(snake.x, snake.y);
      for (const cell of near) {
        if (!cell || cell.snake === snake) continue;
        const d = hypot(cell.x - snake.x, cell.y - snake.y);
        if (d >= snake.hitR + cell.r) continue;
        const remoteId = cell.snake.isRemote ? cell.snake.id : null;
        this.hit(snake, {
          type: 'snake',
          killer: cell.snake.isRemote ? null : cell.snake,
          remoteId,
          name: cell.snake.name
        });
        break;
      }
    }

    const alive = this.snakes.filter((s) => s.alive && s.ghostT <= 0);
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        if (!a.alive || !b.alive) continue;
        const d = hypot(a.x - b.x, a.y - b.y);
        if (d > a.hitR + b.hitR) continue;
        const gap = Math.abs(a.length - b.length);
        if (gap < 8) {
          this.hit(a, { type: 'head', killer: b, name: b.name });
          this.hit(b, { type: 'head', killer: a, name: a.name });
        } else if (a.length < b.length) this.hit(a, { type: 'head', killer: b, name: b.name });
        else this.hit(b, { type: 'head', killer: a, name: a.name });
      }
    }
  }

  eatOrbs() {
    const order = [this.player, ...this.snakes.filter((s) => s !== this.player)];
    for (const snake of order) {
      if (!snake.alive || snake.ghostT > 0) continue;
      for (let i = this.orbs.length - 1; i >= 0; i--) {
        const orb = this.orbs[i];
        const d = hypot(orb.x - snake.x, orb.y - snake.y);
        if (d > snake.hitR + orb.r + 4) continue;
        if (orb.kind === 'razor') {
          if (orb.owner === snake.id) continue;
          this.orbs.splice(i, 1);
          const killer = this.snakes.find((s) => s.id === orb.owner) || null;
          this.hit(snake, { type: 'razor', killer, name: killer?.name });
          continue;
        }
        this.orbs.splice(i, 1);
        this.collect(snake, orb);
      }
    }
  }

  collect(snake, orb) {
    const food = orb.kind === 'bit' || orb.kind === 'cluster';
    if (food) {
      if (snake.comboT > 0) snake.combo += 1;
      else snake.combo = 1;
      snake.comboT = 1.55;
      let mult = 1 + Math.max(0, snake.combo - 1) * 0.22;
      let grow = orb.kind === 'cluster' ? 3 : 1;
      if (snake.perks.has('glutton')) {
        mult *= 2;
        grow *= 2;
      }
      const gain = Math.max(1, Math.round((orb.value || 1) * mult));
      snake.score += gain;
      snake.eats += 1;
      snake.length = Math.min(MAX_LEN, snake.length + grow);
      this.events.push({
        type: 'eat',
        x: orb.x,
        y: orb.y,
        kind: orb.kind,
        text: snake.combo > 1 ? `+${gain}  x${snake.combo}` : `+${gain}`,
        snakeId: snake.id,
        player: snake.isPlayer,
        combo: snake.combo
      });
    } else {
      snake.score += orb.value || 8;
      if (orb.kind === 'shield') {
        snake.shields = Math.min(3, snake.shields + 1);
        snake.shieldsGot += 1;
        this.events.push({ type: 'shield', x: orb.x, y: orb.y, player: snake.isPlayer });
      } else if (orb.kind === 'magnet') {
        snake.magnetT = Math.max(snake.magnetT, 8);
        snake.powers += 1;
        this.events.push({ type: 'power', kind: 'magnet', x: orb.x, y: orb.y, player: snake.isPlayer });
      } else if (orb.kind === 'slowmo') {
        snake.slowT = Math.max(snake.slowT, 6);
        snake.powers += 1;
        this.events.push({ type: 'power', kind: 'slowmo', x: orb.x, y: orb.y, player: snake.isPlayer });
      } else if (orb.kind === 'turbo') {
        snake.turboT = Math.max(snake.turboT, 5);
        snake.powers += 1;
        this.events.push({ type: 'power', kind: 'turbo', x: orb.x, y: orb.y, player: snake.isPlayer });
      } else if (orb.kind === 'core') {
        const add = snake.perks.has('battery') ? 2 : 1;
        snake.nova = Math.min(3, snake.nova + add);
        snake.powers += 1;
        this.events.push({ type: 'power', kind: 'core', x: orb.x, y: orb.y, player: snake.isPlayer, nova: snake.nova });
      }
    }
    this.resize(snake);
  }

  magnetRadius(snake) {
    return (snake.magnetT > 0 ? 250 : 0) + (snake.perks.has('magnet') ? 120 : 0);
  }

  applyMagnet(dt) {
    const pullers = this.snakes.filter((s) => s.alive && this.magnetRadius(s) > 0);
    if (!pullers.length) return;
    for (const orb of this.orbs) {
      if (orb.kind === 'razor') continue;
      let best = null;
      let bestD = Infinity;
      for (const snake of pullers) {
        const R = this.magnetRadius(snake);
        const d = hypot(orb.x - snake.x, orb.y - snake.y);
        if (d < R && d < bestD) {
          bestD = d;
          best = snake;
        }
      }
      if (!best || bestD < 8) continue;
      const pull = 280 * dt;
      orb.x += ((best.x - orb.x) / bestD) * pull;
      orb.y += ((best.y - orb.y) / bestD) * pull;
    }
  }

  applyVenom(dt) {
    const player = this.player;
    if (!player.alive || !player.perks.has('venom')) return;
    for (const snake of this.snakes) {
      if (!snake.alive || snake === player || snake.ghostT > 0) continue;
      let near = false;
      const reach = 34;
      for (let i = 0; i < player.pts.length; i += 2) {
        const p = player.pts[i];
        if (hypot(p.x - snake.x, p.y - snake.y) < reach + snake.hitR) {
          near = true;
          break;
        }
      }
      if (!near) {
        snake.venom = Math.max(0, snake.venom - dt);
        continue;
      }
      snake.venom += dt;
      if (snake.venom < 0.45) continue;
      snake.venom = 0;
      snake.length = Math.max(8, snake.length - 6);
      this.resize(snake);
      this.events.push({ type: 'venom', x: snake.x, y: snake.y });
      if (snake.length <= 8) this.hit(snake, { type: 'venom', killer: player, name: player.name });
    }
  }

  decay(dt) {
    for (const snake of this.snakes) {
      snake.magnetT = Math.max(0, snake.magnetT - dt);
      snake.slowT = Math.max(0, snake.slowT - dt);
      snake.turboT = Math.max(0, snake.turboT - dt);
      snake.ghostT = Math.max(0, snake.ghostT - dt);
      snake.phaseCd = Math.max(0, snake.phaseCd - dt);
      snake.comboT -= dt;
      if (snake.comboT <= 0) snake.combo = 0;
    }
  }

  checkLevel(snake) {
    const lv = levelOf(snake);
    while (snake._lv < lv) {
      snake._lv += 1;
      this.events.push({ type: 'level', value: snake._lv, player: true });
      if (snake._lv % 5 === 0) this.spawnBoss();
      if (snake._lv % 3 === 0 && this.phase === 'playing') this.openMutations();
      if (this.phase !== 'playing') break;
    }
  }

  openMutations() {
    if (this.phase !== 'playing') return;
    const pool = PERK_POOL.filter((id) => !this.player.perks.has(id));
    if (!pool.length) return;
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.offer = pool.slice(0, 3);
    this.phase = 'mutate';
    this.events.push({ type: 'mutate', offer: this.offer.slice() });
  }

  choosePerk(id) {
    if (this.phase !== 'mutate') return;
    if (!this.offer || !this.offer.includes(id)) return;
    this.player.perks.add(id);
    this.offer = null;
    this.phase = 'playing';
    this.events.push({ type: 'perk', id });
  }

  spawnBoss() {
    if (this.snakes.some((s) => s.isBoss && s.alive)) return;
    this.snakes = this.snakes.filter((s) => s.alive || s.isPlayer || !s.isBoss);
    const ang = this.rng() * Math.PI * 2;
    const rad = ARENA_R * 0.7;
    const boss = this.makeSnake({
      name: 'LEVIATHAN',
      skin: 'ember',
      isBoss: true,
      x: Math.cos(ang) * rad,
      y: Math.sin(ang) * rad,
      angle: ang + Math.PI,
      length: 72,
      trail: 'fire',
      hat: 'horns',
      deathStyle: 'supernova'
    });
    this.snakes.push(boss);
    this.events.push({ type: 'boss', x: boss.x, y: boss.y });
  }

  castNova(owner) {
    if (!owner.alive || owner.nova < 3 || owner.ghostT > 0) return;
    owner.nova = 0;
    this.events.push({ type: 'nova', x: owner.x, y: owner.y, player: owner.isPlayer });
    this.hitStop = Math.max(this.hitStop, 0.07);
    for (const snake of this.snakes) {
      if (snake === owner || !snake.alive) continue;
      if (hypot(snake.x - owner.x, snake.y - owner.y) < 360) {
        this.hit(snake, { type: 'nova', killer: owner, name: owner.name });
      }
    }
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      if (orb.kind === 'razor') continue;
      if (hypot(orb.x - owner.x, orb.y - owner.y) > 390) continue;
      this.orbs.splice(i, 1);
      if (owner.alive) this.collect(owner, orb);
    }
  }

  hit(snake, cause = {}) {
    if (!snake || !snake.alive) return;
    if (snake.ghostT > 0 && cause.type !== 'nova') return;
    if (snake.shields > 0 && cause.type !== 'venom') {
      snake.shields -= 1;
      snake.ghostT = 0.9;
      this.events.push({ type: 'shieldPop', x: snake.x, y: snake.y, player: snake.isPlayer });
      this.hitStop = Math.max(this.hitStop, snake.isPlayer ? 0.05 : 0.03);
      return;
    }
    if (snake.perks.has('phase') && snake.phaseCd <= 0) {
      snake.phaseCd = 16;
      snake.ghostT = 1.35;
      this.events.push({ type: 'phase', x: snake.x, y: snake.y, player: snake.isPlayer });
      this.hitStop = Math.max(this.hitStop, 0.05);
      return;
    }

    snake.alive = false;
    snake.boosting = false;
    const killer = cause.killer && cause.killer !== snake && cause.killer.alive !== false ? cause.killer : null;
    if (killer && !killer.isRemote) {
      killer.kills += 1;
      killer.score += 40 + Math.min(80, snake.length);
      if (snake.isBoss) killer.nova = Math.min(3, killer.nova + 1);
      this.events.push({
        type: 'kill',
        x: snake.x,
        y: snake.y,
        player: killer.isPlayer,
        name: snake.name,
        boss: snake.isBoss
      });
      this.hitStop = Math.max(this.hitStop, killer.isPlayer ? 0.08 : 0.04);
    }

    const pts = snake.pts.slice(0, 48).map((p) => ({ x: p.x, y: p.y }));
    this.events.push({
      type: 'death',
      x: snake.x,
      y: snake.y,
      skin: snake.skin,
      style: snake.deathStyle,
      pts,
      player: snake.isPlayer,
      boss: snake.isBoss,
      remoteId: cause.remoteId || null,
      name: cause.name || killer?.name || ''
    });

    this.scatter(snake);

    if (snake.isBoss) {
      this.events.push({ type: 'bossDown', x: snake.x, y: snake.y });
    }
    if (snake.isPlayer) {
      this.final = {
        score: snake.score,
        kills: snake.kills,
        length: snake.length,
        level: levelOf(snake),
        eats: snake.eats,
        shields: snake.shieldsGot,
        powers: snake.powers
      };
      this.phase = 'dying';
      this.dyingT = 1.15;
      this.offer = null;
      this.deathX = snake.x;
      this.deathY = snake.y;
    } else if (!snake.isBoss) {
      snake.wait = 2.8;
    }
  }

  scatter(snake) {
    const step = snake.isBoss ? 1 : 2;
    for (let i = 0; i < snake.pts.length; i += step) {
      const p = snake.pts[i];
      this.orbs.push({
        id: this.uid++,
        x: p.x + (this.rng() - 0.5) * 10,
        y: p.y + (this.rng() - 0.5) * 10,
        kind: i % 11 === 0 ? 'core' : 'bit',
        r: 7,
        value: snake.isBoss ? 4 : 2,
        ttl: null,
        owner: null,
        ph: this.rng() * 6
      });
    }
  }

  spawnPellet(snake) {
    const razor = snake.perks.has('razor');
    this.orbs.push({
      id: this.uid++,
      x: snake.x - Math.cos(snake.angle) * 28,
      y: snake.y - Math.sin(snake.angle) * 28,
      kind: razor ? 'razor' : 'bit',
      r: razor ? 8 : 6,
      value: 1,
      ttl: razor ? 2.3 : null,
      owner: snake.id,
      ph: this.rng() * 6
    });
  }

  revive(snake) {
    const ang = this.rng() * Math.PI * 2;
    const rad = ARENA_R * (0.35 + this.rng() * 0.4);
    snake.alive = true;
    snake.x = Math.cos(ang) * rad;
    snake.y = Math.sin(ang) * rad;
    snake.angle = ang + Math.PI;
    snake.steer = snake.angle;
    snake.length = 12 + Math.floor(this.rng() * 8);
    snake.shields = 0;
    snake.ghostT = 0.8;
    snake.magnetT = 0;
    snake.slowT = 0;
    snake.turboT = 0;
    snake.boosting = false;
    snake.wait = 0;
    this.resize(snake);
    this.fillBody(snake);
  }

  fillOrbs(initial = false) {
    if (this.noOrbs) return;
    const counts = Object.create(null);
    for (const orb of this.orbs) counts[orb.kind] = (counts[orb.kind] || 0) + 1;
    const target = { ...ORB_TARGET };
    if (this.mode === 'arena') target.bit = 68;
    const kinds = Object.keys(target);
    let attempts = initial ? 900 : 12;
    let placed = 0;
    const maxPlace = initial ? 200 : 2;
    let cursor = 0;
    while (attempts > 0 && placed < maxPlace) {
      attempts -= 1;
      const kind = kinds[cursor % kinds.length];
      cursor += 1;
      if ((counts[kind] || 0) >= target[kind]) {
        if (kinds.every((k) => (counts[k] || 0) >= target[k])) break;
        continue;
      }
      const p = this.randomPoint();
      let blocked = false;
      for (const snake of this.snakes) {
        if (!snake.alive) continue;
        if (hypot(p.x - snake.x, p.y - snake.y) < 150) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      this.orbs.push(this.makeOrb(kind, p.x, p.y));
      counts[kind] = (counts[kind] || 0) + 1;
      placed += 1;
    }
    if (this.orbs.length > 170) this.orbs.length = 170;
  }

  makeOrb(kind, x, y) {
    const food = kind === 'bit' || kind === 'cluster';
    return {
      id: this.uid++,
      x,
      y,
      kind,
      r: kind === 'cluster' ? 13 : kind === 'core' ? 14 : food ? 8 : 11,
      value: kind === 'cluster' ? 8 : kind === 'bit' ? 2 + Math.floor(this.rng() * 3) : kind === 'core' ? 15 : 8,
      ttl: null,
      owner: null,
      ph: this.rng() * 6.28
    };
  }

  randomPoint() {
    const a = this.rng() * Math.PI * 2;
    const d = Math.sqrt(this.rng()) * ARENA_R * 0.84;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d };
  }

  ageOrbs(dt) {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      if (orb.ttl == null) continue;
      orb.ttl -= dt;
      if (orb.ttl <= 0) this.orbs.splice(i, 1);
    }
  }

  pause() {
    if (this.phase === 'playing') this.phase = 'paused';
  }

  resume() {
    if (this.phase === 'paused') this.phase = 'playing';
  }

  hud() {
    const p = this.player;
    const speed = currentSpeed({ ...p, alive: true, boosting: p.boosting }, this);
    return {
      score: p.score | 0,
      level: levelOf(p),
      speed: speed / BASE_SPEED,
      shields: p.shields | 0,
      kills: p.kills | 0,
      magnet: Math.ceil(p.magnetT),
      slowmo: Math.ceil(p.slowT),
      turbo: Math.ceil(p.turboT),
      nova: p.nova | 0,
      combo: p.combo | 0,
      length: p.length | 0,
      danger: this.danger
    };
  }
}

export function createMatch(options) {
  return new Match(options);
}
