import { createMatch } from './engine.js';
import { createRenderer } from './renderer.js';
import { sound } from './audio.js';
import { cleanName, loadSave, pushBoard, todayKey, writeSave, yesterdayKey } from './store.js';
import { challengeFor, challengeText, ownKey, shopSections, skinById, starsForRun } from './content.js';
import { t } from './i18n.js';

const $ = (id) => document.getElementById(id);
const save = loadSave();
const canvas = $('view');
const renderer = createRenderer(canvas);
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const input = {
  angle: null,
  boost: false,
  boostKey: false,
  boostHold: false,
  nova: false,
  pointer: 0,
  auto: shot === 'game'
};

let screen = 'menu';
let match = null;
let mode = 'solo';
let room = '';
let settled = false;
let bannerUntil = 0;
let socket = null;
let netStatus = 'offline';
let mySocketId = '';
const peers = new Map();
let lastSend = 0;

const ui = {
  score: $('hud-score').querySelector('b'),
  levelLabel: $('hud-level').querySelector('span'),
  level: $('hud-level').querySelector('b'),
  shields: $('hud-shields').querySelector('b')
};

window.addEventListener('error', (event) => {
  if (!event.message) return;
  const node = document.createElement('pre');
  node.id = 'boot-error';
  node.textContent = `${event.message}\n${event.error?.stack || ''}`;
  document.body.appendChild(node);
});

function applyLang() {
  document.documentElement.lang = save.lang;
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(save.lang, el.dataset.i18n);
  }
  $('lang-fr').classList.toggle('on', save.lang === 'fr');
  $('lang-en').classList.toggle('on', save.lang === 'en');
  refreshMenu();
  renderShop();
  renderBoard();
  renderSettings();
}

function refreshMenu() {
  const ch = challengeFor(todayKey());
  $('best-score-value').textContent = String(save.bestScore | 0);
  $('best-level-value').textContent = String(save.bestLevel || 1);
  $('stars-count').textContent = `★ ${save.stars | 0}`;
  const streak = $('streak-count');
  streak.hidden = !(save.streak > 0);
  streak.textContent = `🔥 ${save.streak}`;
  $('daily-text').textContent = challengeText(save.lang, t, ch);
  const pct = Math.max(0, Math.min(100, Math.round(((save.today.progress || 0) / ch.target) * 100)));
  $('daily-fill').style.width = `${pct}%`;
  $('daily-progress').textContent = save.today.done ? t(save.lang, 'dailyComplete') : `${save.today.progress | 0} / ${ch.target}`;
  $('daily-card').style.borderColor = save.today.done ? '#ffd60a' : '';
  $('player-name').textContent = save.name;
  $('toggle-sfx').classList.toggle('on-sfx', save.sfx);
  $('toggle-music').classList.toggle('on-music', save.music);
  renderSkins();
}

function renderSkins() {
  const row = $('skin-picker');
  row.textContent = '';
  for (const skin of ['ion', 'pulse', 'venom', 'solar', 'void', 'ember', 'pearl', 'prism'].map((id) => skinById(id))) {
    const locked = !!skin.stars && !save.owned.includes(ownKey('skin', skin.id));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `skin${locked ? ' locked' : ''}`;
    btn.id = `skin-${skin.id}`;
    btn.style.borderColor = save.skin === skin.id ? skin.head : 'rgba(125,249,255,0.28)';
    btn.style.boxShadow = save.skin === skin.id ? `0 0 16px ${skin.head}` : 'none';
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = `linear-gradient(135deg, ${skin.head}, ${skin.tail})`;
    sw.innerHTML = '<div class="eyes"><i class="eye"><i></i></i><i class="eye"><i></i></i></div>';
    btn.appendChild(sw);
    if (locked) {
      const lock = document.createElement('div');
      lock.className = 'lock';
      lock.id = `skin-${skin.id}-locked`;
      lock.textContent = `★ ${skin.stars}`;
      btn.appendChild(lock);
    }
    btn.addEventListener('click', () => {
      sound.unlock();
      sound.play('click');
      if (locked) {
        show('shop');
        return;
      }
      save.skin = skin.id;
      writeSave(save);
      renderSkins();
    });
    row.appendChild(btn);
  }
}

function renderShop() {
  $('shop-stars').textContent = `★ ${save.stars | 0}`;
  const root = $('shop-list');
  if (!root) return;
  root.textContent = '';
  for (const section of shopSections()) {
    const block = document.createElement('div');
    block.className = 'card shop-block';
    const title = document.createElement('div');
    title.className = 'section';
    title.textContent = t(save.lang, section.id === 'boost' ? 'boostShop' : section.id);
    block.appendChild(title);
    for (const item of section.items) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      const name = document.createElement('div');
      name.className = 'shop-name';
      const labelKey = item.id === 'x2' ? 'x2' : item.name ? null : item.id;
      name.textContent = item.name || t(save.lang, labelKey || item.id);
      const actions = document.createElement('div');
      actions.className = 'shop-actions';
      const key = ownKey(section.id, item.id);
      const owned = item.stars === 0 || save.owned.includes(key) || (item.id === 'x2' && save.x2);
      const price = document.createElement('span');
      price.className = 'price';
      price.textContent = owned ? '' : `★ ${item.stars}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mini';
      const equipped =
        (section.id === 'skin' && save.skin === item.id) ||
        (section.id === 'trail' && save.trail === item.id) ||
        (section.id === 'hat' && save.hat === item.id) ||
        (section.id === 'death' && save.death === item.id) ||
        (item.id === 'x2' && save.x2);
      button.textContent = !owned ? t(save.lang, 'buy') : item.id === 'x2' ? t(save.lang, 'active') : equipped ? t(save.lang, 'equipped') : t(save.lang, 'equip');
      button.disabled = item.id === 'x2' && save.x2;
      button.addEventListener('click', () => {
        sound.unlock();
        if (!owned) {
          if (save.stars < item.stars) {
            sound.play('error');
            price.textContent = t(save.lang, 'notEnough');
            return;
          }
          save.stars -= item.stars;
          if (item.id !== 'x2' && !save.owned.includes(key)) save.owned.push(key);
          if (item.id === 'x2') save.x2 = true;
          sound.play('power');
        } else sound.play('click');
        equip(section.id, item.id);
        writeSave(save);
        renderShop();
        refreshMenu();
      });
      actions.append(price, button);
      row.append(name, actions);
      block.appendChild(row);
    }
    root.appendChild(block);
  }
}

function equip(slot, id) {
  if (slot === 'skin') save.skin = id;
  else if (slot === 'trail') save.trail = id;
  else if (slot === 'hat') save.hat = id;
  else if (slot === 'death') save.death = id;
  else if (slot === 'boost') save.x2 = true;
}

function renderBoard() {
  const root = $('board-list');
  root.textContent = '';
  if (!save.board.length) {
    root.textContent = t(save.lang, 'emptyBoard');
    return;
  }
  save.board.forEach((row, index) => {
    const line = document.createElement('div');
    line.className = 'rank-row';
    const left = document.createElement('div');
    left.textContent = `${index + 1}. ${row.name}`;
    const right = document.createElement('div');
    right.className = 'price';
    right.textContent = `${row.score}  ·  ${t(save.lang, 'level')} ${row.level}`;
    line.append(left, right);
    root.appendChild(line);
  });
}

function renderSettings() {
  $('name-input').value = save.name;
  $('set-sfx').textContent = `${t(save.lang, 'sfx')}  ${save.sfx ? t(save.lang, 'on') : t(save.lang, 'off')}`;
  $('set-music').textContent = `${t(save.lang, 'music')}  ${save.music ? t(save.lang, 'on') : t(save.lang, 'off')}`;
  $('set-shake').textContent = `${t(save.lang, 'shake')}  ${save.shake ? t(save.lang, 'on') : t(save.lang, 'off')}`;
  $('set-flash').textContent = `${t(save.lang, 'flash')}  ${save.flash ? t(save.lang, 'on') : t(save.lang, 'off')}`;
  sound.setSfx(save.sfx);
  sound.setMusic(save.music);
  renderer.setFx(save.shake && !reduced, save.flash && !reduced);
}

function show(name) {
  screen = name;
  for (const id of ['menu', 'shop', 'board', 'settings', 'game']) {
    $(`screen-${id}`).hidden = id !== name;
  }
  if (name === 'menu') refreshMenu();
  if (name === 'shop') renderShop();
  if (name === 'board') renderBoard();
  if (name === 'settings') renderSettings();
}

function start(nextMode, nextRoom) {
  sound.unlock();
  mode = nextMode;
  room = (nextRoom || '').toUpperCase();
  settled = false;
  peers.clear();
  const seed = shot === 'game' ? 7 : nextMode === 'solo' ? (Date.now() >>> 0) || 1 : hashRoom(room || 'WORLD');
  match = createMatch({
    seed,
    mode: nextMode,
    room,
    name: save.name,
    skin: save.skin,
    trail: save.trail,
    hat: save.hat,
    death: save.death,
    countdown: shot !== 'game' && shot !== 'fx'
  });
  if (shot === 'game') {
    match.player.length = 42;
    match.resize(match.player);
    match.fillBody(match.player);
    renderer.setShowcase(true);
  }
  show('game');
  hideOverlays();
  connectNet();
}

function hashRoom(code) {
  let h = 2166136261;
  const str = String(code || 'WORLD');
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) || 1;
}

function hideOverlays() {
  $('pause-overlay').hidden = true;
  $('gameover-overlay').hidden = true;
  $('mutate-overlay').hidden = true;
  $('banner').hidden = true;
  $('countdown').hidden = true;
}

function leaveMatch() {
  socket?.emit('serpent:leave');
  peers.clear();
  match = null;
  show('menu');
}

function loadScript(src) {
  return new Promise((resolve) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve(true);
    el.onerror = () => resolve(false);
    document.head.appendChild(el);
  });
}

async function connectNet() {
  netStatus = mode === 'solo' ? 'local' : 'connecting';
  if (mode === 'solo') return;
  if (!window.io) {
    const ok = await loadScript('/socket.io/socket.io.js');
    if (!ok || !window.io) {
      netStatus = 'offline';
      return;
    }
  }
  try {
    socket = window.io({ transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      mySocketId = socket.id;
      netStatus = 'online';
      socket.emit('serpent:join', { room: room || 'WORLD', name: save.name, skin: save.skin });
    });
    socket.on('serpent:joined', () => {
      netStatus = 'online';
    });
    socket.on('serpent:full', () => {
      netStatus = 'full';
    });
    socket.on('serpent:peer', (snap) => {
      if (!snap || snap.id === mySocketId) return;
      peers.set(snap.id, { ...snap, seen: performance.now() });
    });
    socket.on('serpent:left', ({ id }) => peers.delete(id));
    socket.on('serpent:died', ({ id, killer }) => {
      const peer = peers.get(id);
      if (peer) peer.alive = false;
      if (killer && killer === mySocketId && match?.player) {
        match.player.kills += 1;
        match.player.score += 60;
        sound.play('kill');
        showBanner(t(save.lang, 'killBanner'), '#ff2d8a', '');
      }
    });
    socket.on('disconnect', () => {
      netStatus = 'reconnecting';
    });
    socket.on('connect_error', () => {
      netStatus = 'offline';
    });
  } catch {
    netStatus = 'offline';
  }
}

function syncRemotes() {
  if (!match) return;
  const now = performance.now();
  for (const [id, peer] of peers) {
    if (now - peer.seen > 1600) peers.delete(id);
  }
  match.remotes = [...peers.values()].map((peer) => {
    const pts = [];
    const raw = Array.isArray(peer.pts) ? peer.pts : [];
    for (let i = 0; i + 1 < raw.length; i += 2) pts.push({ x: Number(raw[i]) || 0, y: Number(raw[i + 1]) || 0 });
    const skin = skinById(peer.skin || 'ion');
    return {
      id: peer.id,
      name: cleanName(peer.name || '???'),
      skin: skin.id,
      isRemote: true,
      isPlayer: false,
      isBoss: false,
      alive: peer.alive !== false,
      x: Number(peer.x) || 0,
      y: Number(peer.y) || 0,
      angle: Number(peer.a) || 0,
      pts,
      length: Number(peer.length) || pts.length || 12,
      score: Number(peer.score) || 0,
      kills: Number(peer.kills) || 0,
      width: Number(peer.width) || 16,
      hitR: 8,
      bodyR: 8,
      shields: Number(peer.shields) || 0,
      boosting: !!peer.boost,
      ghostT: 0,
      trail: 'ion',
      hat: 'none',
      perks: new Set()
    };
  });
}

function sendSnap(now) {
  if (!socket || socket.disconnected || !match?.player || now - lastSend < 90) return;
  lastSend = now;
  const p = match.player;
  const pts = [];
  for (let i = 0; i < p.pts.length && pts.length < 48; i += i < 16 ? 1 : 3) {
    pts.push(Math.round(p.pts[i].x), Math.round(p.pts[i].y));
  }
  socket.emit('serpent:snap', {
    x: Math.round(p.x),
    y: Math.round(p.y),
    a: p.angle,
    alive: p.alive,
    score: p.score,
    kills: p.kills,
    length: p.length,
    skin: p.skin,
    shields: p.shields,
    boost: !!p.boosting,
    width: p.width,
    pts
  });
}

function showBanner(text, color, sub) {
  const el = $('banner');
  el.hidden = false;
  el.style.color = color;
  $('banner-text').textContent = text;
  $('banner-sub').textContent = sub || '';
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  bannerUntil = performance.now() + 1400;
}

function handleEvents() {
  if (!match) return;
  for (const e of match.events) {
    if (e.type === 'count') {
      const node = $('countdown');
      node.hidden = false;
      node.textContent = e.value > 0 ? String(e.value) : t(save.lang, 'go');
      node.classList.remove('pop');
      void node.offsetWidth;
      node.classList.add('pop');
      if (e.value === 0) setTimeout(() => (node.hidden = true), 500);
    } else if (e.type === 'eat' && e.player) sound.play('eat');
    else if (e.type === 'kill' && e.player) {
      sound.play('kill');
      showBanner(t(save.lang, 'killBanner'), '#ff2d8a', e.boss ? t(save.lang, 'bossDown') : e.name || '');
      if (save.shake && navigator.vibrate) navigator.vibrate(12);
    } else if (e.type === 'level') {
      sound.play('level');
      showBanner(`${t(save.lang, 'levelUp')} ${e.value}`, '#ffd60a', t(save.lang, 'speedUp'));
    } else if (e.type === 'shield' && e.player) {
      sound.play('shield');
      showBanner(t(save.lang, 'shieldBanner'), '#ffd60a', '');
    } else if (e.type === 'shieldPop' && e.player) sound.play('shield');
    else if (e.type === 'phase' && e.player) showBanner(t(save.lang, 'perk_phase'), '#a78bfa', '');
    else if (e.type === 'power' && e.player) sound.play('power');
    else if (e.type === 'nova' && e.player) {
      sound.play('nova');
      showBanner(t(save.lang, 'nova'), '#00f0ff', '');
    } else if (e.type === 'boss') {
      sound.play('boss');
      showBanner(t(save.lang, 'boss'), '#ff4d6d', '');
    } else if (e.type === 'death' && e.player) {
      sound.play('death');
      if (save.shake && navigator.vibrate) navigator.vibrate([24, 40, 24]);
      if (socket && e.remoteId) socket.emit('serpent:died', { killer: e.remoteId });
    } else if (e.type === 'mutate') openMutations(e.offer);
    else if (e.type === 'perk') showBanner(t(save.lang, `perk_${e.id}`), '#7cf25a', '');
  }
}

function openMutations(offer) {
  const grid = $('perk-grid');
  grid.textContent = '';
  (offer || []).forEach((id, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'perk';
    const title = document.createElement('b');
    title.textContent = `${index + 1}  ${t(save.lang, `perk_${id}`)}`;
    const desc = document.createElement('span');
    desc.textContent = t(save.lang, `perk_${id}_d`);
    btn.append(title, desc);
    btn.addEventListener('click', () => {
      sound.play('power');
      match?.choosePerk(id);
      $('mutate-overlay').hidden = true;
    });
    grid.appendChild(btn);
  });
  $('mutate-overlay').hidden = false;
}

function updateHud() {
  if (!match) return;
  const hud = match.hud();
  ui.score.textContent = String(hud.score);
  ui.levelLabel.textContent = `${t(save.lang, 'level')} ${hud.level}`;
  ui.level.textContent = `×${hud.speed.toFixed(2)}`;
  ui.shields.textContent = String(hud.shields);
  const powers = $('hud-powers');
  powers.textContent = '';
  const specs = [
    ['magnet', hud.magnet, '#FF4FD8'],
    ['slowmo', hud.slowmo, '#A78BFA'],
    ['turbo', hud.turbo, '#FFD60A']
  ];
  for (const [key, secs, color] of specs) {
    if (secs <= 0) continue;
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.style.borderColor = color;
    chip.style.color = color;
    chip.textContent = `${t(save.lang, key)} ${secs}s`;
    powers.appendChild(chip);
  }
  if (hud.combo > 1) {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.style.color = '#ffd60a';
    chip.textContent = `${t(save.lang, 'combo')} x${hud.combo}`;
    powers.appendChild(chip);
  }
  $('nova-button').classList.toggle('ready', hud.nova >= 3);
  $('steer-hint').hidden = !(match.phase === 'playing' && hud.score < 20);
  renderRank(hud);
  $('pause-overlay').hidden = match.phase !== 'paused';
  $('gameover-overlay').hidden = match.phase !== 'over';
  if (match.phase !== 'mutate') $('mutate-overlay').hidden = true;
  if (performance.now() > bannerUntil) $('banner').hidden = true;
  sound.intensity(hud.level);
}

function renderRank() {
  const box = $('online-status');
  const snakes = [...(match?.snakes || []), ...(match?.remotes || [])].filter((s) => s.alive || s.isPlayer);
  snakes.sort((a, b) => b.score - a.score);
  box.textContent = '';
  const head = document.createElement('div');
  const dot = document.createElement('i');
  dot.className = 'dotlive';
  const online = netStatus === 'online';
  dot.style.color = online ? '#7CF25A' : netStatus === 'connecting' || netStatus === 'reconnecting' ? '#FFD60A' : '#FF4D6D';
  dot.style.background = dot.style.color;
  const count = Math.max(1, snakes.length);
  let label = t(save.lang, 'localArena');
  if (mode !== 'solo') {
    if (netStatus === 'online') label = `${t(save.lang, 'online')} · ${count} ${count > 1 ? t(save.lang, 'players') : t(save.lang, 'player')}`;
    else if (netStatus === 'connecting') label = t(save.lang, 'connecting');
    else if (netStatus === 'reconnecting') label = t(save.lang, 'reconnecting');
    else if (netStatus === 'full') label = t(save.lang, 'arenaFull');
    else label = t(save.lang, 'netError');
  }
  head.append(dot, document.createTextNode(label));
  box.appendChild(head);
  if (room && room !== 'WORLD') {
    const code = document.createElement('div');
    code.style.color = '#ffd60a';
    code.textContent = `${t(save.lang, 'room')} ${room}`;
    box.appendChild(code);
  }
  snakes.slice(0, 4).forEach((s, i) => {
    const line = document.createElement('div');
    if (s.isPlayer) line.className = 'me';
    line.textContent = `${i + 1}. ${s.name} — ${s.score | 0}`;
    box.appendChild(line);
  });
  if (mode !== 'solo' && netStatus === 'online' && peers.size === 0) {
    const wait = document.createElement('div');
    wait.className = 'wait';
    wait.textContent = room ? t(save.lang, 'shareCode').replace('{c}', room) : t(save.lang, 'waiting');
    box.appendChild(wait);
  }
}

function settle() {
  if (settled || !match?.final) return;
  settled = true;
  const stats = match.final;
  save.bestScore = Math.max(save.bestScore | 0, stats.score | 0);
  save.bestLevel = Math.max(save.bestLevel || 1, stats.level || 1);
  const earned = starsForRun(stats.score, stats.kills, save.x2);
  save.stars += earned;
  pushBoard(save, { name: save.name, score: stats.score, kills: stats.kills, level: stats.level });
  const ch = challengeFor(todayKey());
  const value = stats[ch.kind] || 0;
  if (!save.today.done) {
    if (ch.kind === 'level' || ch.kind === 'score') save.today.progress = Math.max(save.today.progress | 0, value);
    else save.today.progress = Math.min(ch.target, (save.today.progress | 0) + value);
    if (save.today.progress >= ch.target) {
      save.today.done = true;
      save.stars += 20;
      if (save.lastDaily === yesterdayKey()) save.streak += 1;
      else if (save.lastDaily !== todayKey()) save.streak = 1;
      save.lastDaily = todayKey();
    }
  }
  writeSave(save);
  const grid = $('final-stats');
  grid.textContent = '';
  const rows = [
    ['score', stats.score, '#00f0ff'],
    ['kills', stats.kills, '#ff2d8a'],
    ['length', stats.length, '#7cf25a'],
    ['level', stats.level, '#ffd60a']
  ];
  for (const [key, valueStat, color] of rows) {
    const box = document.createElement('div');
    box.className = 'stat';
    box.style.borderColor = color;
    const label = document.createElement('div');
    label.className = 'sub';
    label.textContent = t(save.lang, key);
    const num = document.createElement('b');
    num.style.color = color;
    num.textContent = String(valueStat);
    box.append(label, num);
    grid.appendChild(box);
  }
  $('gameover-earned').textContent = earned > 0 ? t(save.lang, 'earned').replace('{n}', String(earned)) : '';
  const daily = $('gameover-daily');
  daily.textContent = '';
  const dTitle = document.createElement('div');
  dTitle.className = 'daily-title';
  dTitle.textContent = save.today.done ? t(save.lang, 'dailyDone').replace('{n}', '20') : t(save.lang, 'daily');
  const dText = document.createElement('div');
  dText.className = 'sub';
  dText.textContent = `${challengeText(save.lang, t, ch)} — ${save.today.progress}/${ch.target}`;
  daily.append(dTitle, dText);
  $('gameover-save-state').textContent = t(save.lang, 'saved');
}

function autoAim() {
  if (!match?.player?.alive) return;
  let best = null;
  let bestD = Infinity;
  for (const orb of match.orbs) {
    if (orb.kind === 'razor') continue;
    const d = (orb.x - match.player.x) ** 2 + (orb.y - match.player.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = orb;
    }
  }
  if (!best) return;
  input.angle = Math.atan2(best.y - match.player.y, best.x - match.player.x);
  input.boost = match.player.length > 28 && Math.sin(match.time * 1.7) > 0.2;
}

function loop(now) {
  const dt = Math.min(0.05, (now - (loop.last || now)) / 1000);
  loop.last = now;
  if (screen === 'game' && match) {
    if (input.auto) autoAim();
    else input.boost = input.boostKey || input.boostHold;
    syncRemotes();
    const world = pointerWorld();
    if (!input.auto && world && now - input.pointer < 2500) {
      input.angle = Math.atan2(world.y - match.player.y, world.x - match.player.x);
    }
    match.step(dt, { angle: input.angle, boost: input.auto ? input.boost : input.boostKey || input.boostHold, nova: input.nova });
    input.nova = false;
    handleEvents();
    if (match.phase === 'over') settle();
    updateHud();
    sendSnap(now);
    renderer.drawMatch(match, dt);
  } else {
    renderer.drawMenu(dt);
  }
  sound.tick();
  if (shot && !loop.ready && now - (loop.started || now) > (shot === 'game' ? 2800 : 700)) {
    document.body.dataset.ready = '1';
    loop.ready = true;
  }
  requestAnimationFrame(loop);
}
loop.started = performance.now();

let pointer = null;
function pointerWorld() {
  if (!pointer || !match || screen !== 'game') return null;
  const cam = renderer.getCamera();
  const rect = canvas.getBoundingClientRect();
  const sx = ((pointer.x - rect.left) / Math.max(rect.width, 1)) * canvas.width;
  const sy = ((pointer.y - rect.top) / Math.max(rect.height, 1)) * canvas.height;
  const zoom = cam.zoom || 1;
  return {
    x: (sx - canvas.width / 2) / zoom + cam.x,
    y: (sy - canvas.height / 2) / zoom + cam.y
  };
}

const boostPointers = new Set();
function holdBoost(id, held) {
  if (held) boostPointers.add(id);
  else boostPointers.delete(id);
  input.boostHold = boostPointers.size > 0;
}

canvas.addEventListener('pointerdown', (event) => {
  if (screen !== 'game') return;
  try { canvas.setPointerCapture(event.pointerId); } catch { /* pointeur déjà relâché */ }
  pointer = { x: event.clientX, y: event.clientY };
  input.pointer = performance.now();
  if (event.pointerType === 'mouse') holdBoost(`c:${event.pointerId}`, true);
  sound.unlock();
});
canvas.addEventListener('pointermove', (event) => {
  pointer = { x: event.clientX, y: event.clientY };
  input.pointer = performance.now();
});
function releaseCanvasBoost(event) {
  if (event.pointerType === 'mouse') holdBoost(`c:${event.pointerId}`, false);
}
canvas.addEventListener('pointerup', releaseCanvasBoost);
canvas.addEventListener('pointercancel', releaseCanvasBoost);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    input.boostKey = true;
    event.preventDefault();
  }
  if (event.key === 'f' || event.key === 'F') input.nova = true;
  if (event.key === 'Escape' && match) {
    if (match.phase === 'playing') match.pause();
    else if (match.phase === 'paused') match.resume();
  }
  if (match?.phase === 'mutate' && ['1', '2', '3'].includes(event.key)) {
    const id = match.offer?.[Number(event.key) - 1];
    if (id) {
      match.choosePerk(id);
      $('mutate-overlay').hidden = true;
    }
  }
  if (event.key === 'a' || event.key === 'ArrowLeft') input.angle = (match?.player?.angle || 0) - 0.7;
  if (event.key === 'd' || event.key === 'ArrowRight') input.angle = (match?.player?.angle || 0) + 0.7;
});
window.addEventListener('keyup', (event) => {
  if (event.code === 'Space') input.boostKey = false;
});

function press(id, fn) {
  $(id).addEventListener('click', () => {
    sound.unlock();
    sound.play('click');
    fn();
  });
}

press('lang-fr', () => { save.lang = 'fr'; writeSave(save); applyLang(); });
press('lang-en', () => { save.lang = 'en'; writeSave(save); applyLang(); });
press('toggle-sfx', () => { save.sfx = !save.sfx; writeSave(save); renderSettings(); refreshMenu(); });
press('toggle-music', () => { save.music = !save.music; writeSave(save); renderSettings(); refreshMenu(); });
press('play-button', () => start('solo', ''));
press('play-online-button', () => start('arena', 'WORLD'));
press('private-room-button', () => { $('room-sheet').hidden = false; });
press('room-close', () => { $('room-sheet').hidden = true; });
press('room-create', () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  $('room-sheet').hidden = true;
  start('room', code);
});
press('room-join', () => {
  const code = $('room-input').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (code.length < 4) return;
  $('room-sheet').hidden = true;
  start('room', code);
});
press('leaderboard-button', () => show('board'));
press('shop-button', () => show('shop'));
press('settings-button', () => show('settings'));
press('shop-back', () => show('menu'));
press('board-back', () => show('menu'));
press('settings-back', () => {
  save.name = cleanName($('name-input').value);
  writeSave(save);
  show('menu');
});
press('set-sfx', () => { save.sfx = !save.sfx; writeSave(save); renderSettings(); });
press('set-music', () => { save.music = !save.music; writeSave(save); renderSettings(); });
press('set-shake', () => { save.shake = !save.shake; writeSave(save); renderSettings(); });
press('set-flash', () => { save.flash = !save.flash; writeSave(save); renderSettings(); });
press('pause-button', () => { if (match?.phase === 'playing') match.pause(); });
press('resume-button', () => match?.resume());
press('pause-restart-button', () => start(mode, room));
press('pause-quit-button', () => leaveMatch());
press('play-again-button', () => start(mode, room));
press('gameover-menu-button', () => leaveMatch());

const boostBtn = $('boost-button');
const holdOn = (event) => {
  event.preventDefault();
  holdBoost(`b:${event.pointerId}`, true);
  sound.unlock();
};
const releaseBtn = (event) => holdBoost(`b:${event.pointerId}`, false);
boostBtn.addEventListener('pointerdown', holdOn);
boostBtn.addEventListener('pointerup', releaseBtn);
boostBtn.addEventListener('pointercancel', releaseBtn);
boostBtn.addEventListener('pointerleave', releaseBtn);
$('nova-button').addEventListener('click', () => {
  input.nova = true;
  sound.unlock();
  sound.play('click');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && match?.phase === 'playing') match.pause();
});

window.__serpent = { save, get match() { return match; } };

applyLang();
renderSettings();
if (shot === 'game' || shot === 'fx') start(shot === 'fx' ? 'solo' : 'arena', shot === 'fx' ? '' : 'WORLD');
if (shot === 'fx') {
  setTimeout(() => {
    if (!match) return;
    const bot = match.snakes.find((s) => !s.isPlayer);
    if (bot) {
      bot.x = match.player.x + 70;
      bot.y = match.player.y + 10;
      bot.ghostT = 0;
    }
    match.player.nova = 3;
    input.nova = true;
  }, 450);
}
requestAnimationFrame(loop);
