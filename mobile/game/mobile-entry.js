/**
 * Entrée combat pour WebView Expo — menus gérés par React Native.
 */
import { CombatEngine } from '../../src/js/game/engine.js';
import { Renderer } from '../../src/js/game/renderer.js';
import { audio } from '../../src/js/game/audio.js';
import { drawPortrait } from '../../src/js/game/sprites.js';

const held = {};
const prevHeld = {};
let engine = null;
let renderer = null;
let raf = 0;
let lastTs = 0;

function post(msg) {
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }
}

function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  engine = null;
}

function edgeInputs() {
  const clean = {};
  for (const slot of Object.keys(held)) {
    const cur = held[slot] || {};
    const prev = prevHeld[slot] || {};
    const press = (k) => !!(cur[k] && !prev[k]);
    clean[slot] = {
      moveX: cur.moveX || 0,
      jump: press('jump'),
      attack: press('attack'),
      special: press('special'),
      ultra: press('ultra'),
      regen: press('regen'),
      fusion: press('fusion')
    };
    prevHeld[slot] = { ...cur };
  }
  return clean;
}

function frame(ts) {
  if (!engine || !renderer) return;
  const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  engine.update(dt, edgeInputs());
  renderer.render(engine);

  if (Math.floor(engine.time * 4) !== Math.floor((engine.time - dt) * 4)) {
    post({ type: 'log', log: engine.log.slice(0, 8) });
  }

  if (engine.ended) {
    post({
      type: 'ended',
      winnerTeams: engine.winnerTeams,
      fighters: engine.fighters.map((f) => ({
        name: f.name,
        team: f.team,
        stocks: f.stocks
      }))
    });
    stop();
    return;
  }
  raf = requestAnimationFrame(frame);
}

function startCombat(config) {
  stop();
  try {
    audio.ensure();
  } catch {
    /* ignore */
  }
  const canvas = document.getElementById('game');
  const wrap = document.getElementById('wrap');
  engine = new CombatEngine({
    mode: config.mode || '1v1',
    fighters: config.fighters,
    stocks: config.stocks ?? 3,
    fusionReady: !!config.fusionReady
  });
  renderer = new Renderer(canvas);
  const fit = () => {
    const w = wrap.clientWidth || window.innerWidth;
    const h = wrap.clientHeight || window.innerHeight;
    const scale = Math.min(w / 1280, h / 720);
    canvas.style.width = `${1280 * scale}px`;
    canvas.style.height = `${720 * scale}px`;
  };
  fit();
  window.addEventListener('resize', fit);
  engine.fighters.forEach((f) => {
    held[f.slot] = { moveX: 0 };
    prevHeld[f.slot] = {};
  });
  lastTs = performance.now();
  post({ type: 'ready', stage: engine.stage.name });
  raf = requestAnimationFrame(frame);
}

function onMessage(raw) {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
  }
  if (!data || !data.type) return;
  if (data.type === 'start') startCombat(data.config);
  if (data.type === 'input') {
    const slot = data.slot ?? 0;
    held[slot] = { ...(held[slot] || {}), ...data.input };
  }
  if (data.type === 'forfeit') {
    if (engine) {
      engine.ended = true;
      engine.winnerTeams = [];
      post({ type: 'ended', winnerTeams: [], fighters: [] });
      stop();
    }
  }
}

document.addEventListener('message', (e) => onMessage(e.data));
window.addEventListener('message', (e) => onMessage(e.data));
window.AKI = { startCombat, onMessage, drawPortrait };
post({ type: 'boot' });
