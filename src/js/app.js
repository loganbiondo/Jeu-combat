import { CHARACTERS, getCharacter } from './data/characters.js';
import { pickRewardPrompt } from './data/prompts.js';
import { CombatEngine } from './game/engine.js';
import { Renderer } from './game/renderer.js';
import { InputManager } from './game/input.js';
import { NetClient } from './net/client.js';
import { pickAd, shouldShowAds } from './shop/ads.js';
import { audio } from './game/audio.js';

const DEFAULT_SERVER = 'http://localhost:3847';

const state = {
  save: null,
  screen: 'home',
  setup: null, // { online, mode }
  activeSlot: 0,
  selections: [],
  engine: null,
  renderer: null,
  input: new InputManager(),
  net: new NetClient(),
  raf: 0,
  lastTs: 0,
  remoteInputs: {},
  localPlayerId: null,
  pendingAfterAd: null,
  shopCatalog: []
};

async function loadSave() {
  if (window.aki?.getSave) {
    state.save = await window.aki.getSave();
  } else {
    const raw = localStorage.getItem('aki-save');
    state.save = raw
      ? JSON.parse(raw)
      : {
          unlockedCharacters: CHARACTERS.filter((c) => c.free).map((c) => c.id),
          unlockedSkins: {},
          unlockedTechniques: {},
          ownedProducts: [],
          adFree: false,
          promptHistory: [],
          wins: 0,
          matchesPlayed: 0,
          settings: { showAds: true }
        };
  }
}

async function patchSave(partial) {
  state.save = { ...state.save, ...partial };
  if (window.aki?.patchSave) await window.aki.patchSave(partial);
  else localStorage.setItem('aki-save', JSON.stringify(state.save));
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
  const screen = document.getElementById(`screen-${id}`);
  if (screen) screen.classList.add('active');
  state.screen = id;
  if (id === 'home') refreshHomeAd();
  if (id === 'shop') renderShop();
}

function refreshHomeAd() {
  const banner = document.getElementById('home-ad');
  if (!shouldShowAds(state.save)) {
    banner.classList.add('hidden');
    return;
  }
  const ad = pickAd();
  document.getElementById('home-ad-title').textContent = ad.title;
  document.getElementById('home-ad-text').textContent = ad.body;
  banner.classList.remove('hidden');
}

function isUnlocked(charId) {
  return state.save.unlockedCharacters.includes(charId);
}

function slotCount() {
  return state.setup?.mode === '2v2' ? 4 : 2;
}

function initSelections() {
  const n = slotCount();
  const free = CHARACTERS.filter((c) => isUnlocked(c.id));
  state.selections = Array.from({ length: n }, (_, i) => ({
    slot: i,
    team: state.setup.mode === '2v2' ? (i < 2 ? 0 : 1) : i,
    characterId: free[i % free.length].id,
    name: `J${i + 1}`
  }));
  state.activeSlot = 0;
}

function renderSelect() {
  const tabs = document.getElementById('slot-tabs');
  const grid = document.getElementById('char-grid');
  const hint = document.getElementById('select-hint');
  hint.textContent = state.setup.online
    ? 'En ligne : choisis ton personnage, puis lance la file.'
    : 'Local : assigne un perso à chaque slot (clavier / manettes).';

  tabs.innerHTML = '';
  state.selections.forEach((sel, i) => {
    const b = document.createElement('button');
    b.className = `slot-tab${i === state.activeSlot ? ' active' : ''}`;
    const ch = getCharacter(sel.characterId);
    b.textContent = `Slot ${i + 1} · ${ch.name} (Éq.${sel.team + 1})`;
    b.addEventListener('click', () => {
      state.activeSlot = i;
      renderSelect();
    });
    tabs.appendChild(b);
  });

  grid.innerHTML = '';
  CHARACTERS.forEach((ch) => {
    const unlocked = isUnlocked(ch.id);
    const selected = state.selections[state.activeSlot]?.characterId === ch.id;
    const card = document.createElement('button');
    card.className = `char-card${selected ? ' selected' : ''}${unlocked ? '' : ' locked'}`;
    card.innerHTML = `
      <div class="char-swatch" style="background: linear-gradient(135deg, ${ch.colors.body}, ${ch.colors.accent})"></div>
      <strong>${ch.name}</strong>
      <small>${ch.species} · ${ch.role}</small>
      <small>${ch.tagline}</small>
      ${unlocked ? '' : '<small>Boutique</small>'}
    `;
    card.addEventListener('click', () => {
      if (!unlocked) {
        showScreen('shop');
        return;
      }
      state.selections[state.activeSlot].characterId = ch.id;
      renderSelect();
    });
    grid.appendChild(card);
  });
}

function fighterConfigsFromSelections() {
  return state.selections.map((sel) => {
    const bonus = Object.keys(state.save.unlockedTechniques || {}).filter(
      (id) => state.save.unlockedTechniques[id]
    );
    const skinMap = state.save.unlockedSkins?.[sel.characterId];
    const skinId = skinMap ? Object.keys(skinMap)[0] : null;
    return {
      id: `local-${sel.slot}`,
      slot: sel.slot,
      team: sel.team,
      characterId: sel.characterId,
      name: `${getCharacter(sel.characterId).name}`,
      skinId,
      bonusTechs: bonus,
      stocks: 3
    };
  });
}

function updateCombatLog() {
  const ul = document.getElementById('combat-log');
  if (!state.engine) return;
  ul.innerHTML = state.engine.log
    .slice(0, 20)
    .map((l) => `<li><span class="t">${l.t}s</span>${l.msg}</li>`)
    .join('');
}

function stopLoop() {
  if (state.raf) cancelAnimationFrame(state.raf);
  state.raf = 0;
  state.engine = null;
}

function startCombat(fighters, { online = false, host = true } = {}) {
  stopLoop();
  showScreen('combat');
  const canvas = document.getElementById('game-canvas');
  state.engine = new CombatEngine({
    mode: state.setup.mode,
    online,
    fighters,
    host,
    stocks: 1
  });
  state.renderer = new Renderer(canvas);
  state.renderer.resize();
  state.lastTs = performance.now();
  state.remoteInputs = {};

  const loop = (ts) => {
    const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    const inputs = {};
    for (const f of state.engine.fighters) {
      if (online) {
        const isLocal =
          state.localPlayerId == null
            ? f.slot === 0 && host
            : f.id === state.localPlayerId || (host && f.slot === 0 && !state.remoteInputs[f.id]);
        // Prefer mapping by slot for host sim: each client sends their seat input
        if (host) {
          if (f.slot === state.localSeat) {
            const local = state.input.readPlayer(0);
            inputs[f.slot] = local;
            state.net.sendInput({ ...local, seat: f.slot });
          } else if (state.remoteInputs[f.slot]) {
            inputs[f.slot] = state.remoteInputs[f.slot];
          } else {
            inputs[f.slot] = { moveX: 0 };
          }
        } else {
          // Client: render from state snapshots; still send input
          if (f.slot === state.localSeat) {
            const local = state.input.readPlayer(0);
            state.net.sendInput({ ...local, seat: f.slot });
          }
        }
      } else {
        inputs[f.slot] = state.input.readPlayer(f.slot);
      }
    }

    if (!online || host) {
      state.engine.update(dt, inputs);
      if (online && host) {
        if (Math.floor(state.engine.time * 20) % 2 === 0 || state.engine.ended) {
          state.net.sendState(state.engine.snapshot());
        }
      }
    } else {
      state.engine.fx.update(dt);
    }

    state.renderer.render(state.engine);
    if (Math.floor(state.engine.time * 4) !== Math.floor((state.engine.time - dt) * 4)) {
      updateCombatLog();
    }

    state.input.endFrame();

    if (state.engine.ended) {
      updateCombatLog();
      if (online && host) {
        state.net.sendEnd({
          winnerTeams: state.engine.winnerTeams,
          fighters: state.engine.snapshot().fighters
        });
      }
      finishMatch();
      return;
    }
    state.raf = requestAnimationFrame(loop);
  };
  state.raf = requestAnimationFrame(loop);
  updateCombatLog();
}

async function finishMatch() {
  const engine = state.engine;
  const winners = engine?.winnerTeams || [];
  const names = (engine?.fighters || [])
    .filter((f) => winners.includes(f.team))
    .map((f) => f.name)
    .join(' & ');
  stopLoop();

  if (!winners.length) {
    await patchSave({ matchesPlayed: (state.save.matchesPlayed || 0) + 1 });
    showScreen('home');
    return;
  }

  const reward = pickRewardPrompt(state.save.promptHistory || []);
  const history = [...(state.save.promptHistory || []), reward.index].slice(-100);
  await patchSave({
    promptHistory: history,
    wins: (state.save.wins || 0) + 1,
    matchesPlayed: (state.save.matchesPlayed || 0) + 1
  });

  const goVictory = () => {
    document.getElementById('victory-title').textContent = names || 'Match terminé';
    document.getElementById('victory-sub').textContent = 'Match gagné — idée créative débloquée !';
    document.getElementById('reward-prompt').textContent = reward.text;
    showScreen('victory');
  };

  if (shouldShowAds(state.save)) showInterstitial(goVictory);
  else goVictory();
}

function showInterstitial(next) {
  state.pendingAfterAd = next;
  const ad = pickAd();
  document.getElementById('ad-title').textContent = ad.title;
  document.getElementById('ad-body').textContent = ad.body;
  const btn = document.getElementById('btn-skip-ad');
  let left = 3;
  btn.disabled = true;
  btn.textContent = `Passer (${left})`;
  showScreen('ad');
  const timer = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      clearInterval(timer);
      btn.disabled = false;
      btn.textContent = 'Continuer';
    } else btn.textContent = `Passer (${left})`;
  }, 1000);
}

async function startOnlineFlow() {
  showScreen('queue');
  const status = document.getElementById('queue-status');
  status.textContent = 'Connexion au serveur de matchmaking…';
  try {
    if (!state.net.connected) {
      await state.net.connect(localStorage.getItem('aki-server') || DEFAULT_SERVER);
    }
    const me = state.selections[0];
    state.net.joinQueue({
      mode: state.setup.mode,
      name: getCharacter(me.characterId).name,
      characterId: me.characterId
    });
    status.textContent = `En file ${state.setup.mode}…`;
  } catch (err) {
    status.textContent = `Serveur inaccessible (${err.message}). Lance npm run server.`;
  }
}

function bindNet() {
  state.net.on('queue:joined', (d) => {
    document.getElementById('queue-status').textContent = `File ${d.mode} — position ${d.position}`;
  });
  state.net.on('match:found', (d) => {
    document.getElementById('queue-status').textContent = `Match trouvé (${d.roomId}) — préparation…`;
    state.matchMeta = d;
    state.localPlayerId = d.youAre || d.players?.[0]?.id;
    state.localSeat = d.yourSeat ?? d.players?.find((p) => p.id === state.localPlayerId)?.seat ?? 0;
  });
  state.net.on('match:start', () => {
    const fighters = (state.matchMeta?.players || []).map((p) => ({
      id: p.id,
      slot: p.seat,
      team: p.team,
      characterId: p.characterId,
      name: p.name,
      stocks: 1
    }));
    // Host = seat 0 simulates
    const host = state.localSeat === 0;
    startCombat(fighters, { online: true, host });
  });
  state.net.on('match:input', (d) => {
    const seat = d.input?.seat;
    if (seat == null) return;
    state.remoteInputs[seat] = d.input;
  });
  state.net.on('match:state', (snap) => {
    if (!state.engine || state.localSeat === 0) return;
    // Soft sync positions for non-host
    snap.fighters?.forEach((sf) => {
      const f = state.engine.fighters.find((x) => x.slot === sf.slot);
      if (!f) return;
      f.x = sf.x;
      f.y = sf.y;
      f.vx = sf.vx;
      f.vy = sf.vy;
      f.percent = sf.percent;
      f.hp = sf.hp;
      f.ki = sf.ki;
      f.stocks = sf.stocks;
      f.alive = sf.alive;
      f.action = sf.action;
      f.facing = sf.facing;
      f.transformed = !!sf.transformed;
      f.transformName = sf.transformName || '';
      f.drawScale = sf.drawScale || f.drawScale;
      f.hurtFlash = sf.hurtFlash || 0;
      f.impactSquash = sf.impactSquash || 0;
      if (sf.radius) f.radius = sf.radius;
      if (sf.colors) f.colors = sf.colors;
    });
    if (snap.log) state.engine.log = snap.log;
    if (snap.ended) {
      state.engine.ended = true;
      state.engine.winnerTeams = snap.winnerTeams;
    }
  });
  state.net.on('match:end', (payload = {}) => {
    if (!state.engine) return;
    state.engine.ended = true;
    state.engine.winnerTeams = payload.winnerTeams || [];
    if (Array.isArray(payload.fighters)) {
      payload.fighters.forEach((sf) => {
        const f = state.engine.fighters.find((x) => x.slot === sf.slot);
        if (!f) return;
        Object.assign(f, {
          hp: sf.hp,
          alive: sf.alive,
          stocks: sf.stocks,
          name: sf.name,
          team: sf.team
        });
      });
    }
  });
  state.net.on('match:peer-left', () => {
    if (state.engine && !state.engine.ended) {
      state.engine.pushLog('Un joueur a quitté — match annulé.');
      state.engine.ended = true;
      state.engine.winnerTeams = [];
    }
  });
}

async function loadShopCatalog() {
  const res = await fetch('./js/data/shop-catalog.json');
  state.shopCatalog = await res.json();
}

function applyProduct(productId) {
  const product = state.shopCatalog.find((p) => p.id === productId);
  if (!product) return;

  const owned = new Set(state.save.ownedProducts || []);
  const unlockChars = new Set(state.save.unlockedCharacters || []);
  const skins = { ...(state.save.unlockedSkins || {}) };
  const techs = { ...(state.save.unlockedTechniques || {}) };
  let adFree = !!state.save.adFree;

  const applyOne = (p) => {
    owned.add(p.id);
    if (p.type === 'adfree') adFree = true;
    if (p.type === 'character' && p.characterId) unlockChars.add(p.characterId);
    if (p.type === 'skin' && p.characterId && p.skinId) {
      skins[p.characterId] = { ...(skins[p.characterId] || {}), [p.skinId]: true };
    }
    if (p.type === 'technique' && p.techniqueId) techs[p.techniqueId] = true;
    if (p.type === 'bundle' && Array.isArray(p.grants)) {
      p.grants.forEach((gid) => {
        const g = state.shopCatalog.find((x) => x.id === gid);
        if (g) applyOne(g);
      });
    }
  };
  applyOne(product);

  return patchSave({
    ownedProducts: [...owned],
    unlockedCharacters: [...unlockChars],
    unlockedSkins: skins,
    unlockedTechniques: techs,
    adFree
  });
}

function renderShop() {
  const grid = document.getElementById('shop-grid');
  const status = document.getElementById('shop-status');
  status.textContent = state.save.adFree ? 'Mode sans pub actif.' : 'Les pubs s’affichent entre les combats.';
  grid.innerHTML = '';
  state.shopCatalog.forEach((p) => {
    const owned = (state.save.ownedProducts || []).includes(p.id);
    const card = document.createElement('div');
    card.className = `shop-card${owned ? ' owned' : ''}`;
    card.innerHTML = `
      <div class="icon">${p.icon || '★'}</div>
      <strong>${p.name}</strong>
      <p>${p.description}</p>
      <div class="price">${(p.priceCents / 100).toFixed(2)} ${((p.currency || 'eur') + '').toUpperCase()}</div>
      <button class="btn primary tiny" ${owned ? 'disabled' : ''}>${owned ? 'Possédé' : 'Acheter'}</button>
    `;
    const btn = card.querySelector('button');
    btn.addEventListener('click', async () => {
      status.textContent = 'Ouverture du paiement…';
      try {
        if (!window.aki?.checkout) {
          // Browser fallback: mock purchase
          await applyProduct(p.id);
          status.textContent = `Achat sandbox : ${p.name}`;
          renderShop();
          return;
        }
        const result = await window.aki.checkout(p.id);
        if (!result.ok) {
          status.textContent = result.error || 'Échec paiement';
          return;
        }
        if (result.mock) {
          await applyProduct(result.productId || p.id);
          status.textContent = result.message || 'Achat sandbox OK';
          renderShop();
          return;
        }
        status.textContent = 'Checkout Stripe ouvert dans le navigateur. Vérification…';
        // Poll verify a few times (user completes payment externally)
        let paid = false;
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => setTimeout(r, 2500));
          const ver = await window.aki.verifySession(result.sessionId);
          if (ver.paid) {
            await applyProduct(ver.productId || p.id);
            paid = true;
            break;
          }
        }
        status.textContent = paid ? 'Achat confirmé !' : 'En attente de paiement Stripe…';
        renderShop();
      } catch (err) {
        status.textContent = err.message;
      }
    });
    grid.appendChild(card);
  });
}

function bindUI() {
  document.body.addEventListener(
    'pointerdown',
    () => {
      audio.ensure();
    },
    { once: true }
  );

  document.querySelectorAll('[data-go]').forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.ui();
      showScreen(btn.getAttribute('data-go'));
    });
  });

  document.querySelectorAll('[data-setup]').forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.ui();
      const key = btn.getAttribute('data-setup');
      const [net, mode] = key.split('-');
      state.setup = { online: net === 'online', mode };
      initSelections();
      renderSelect();
      showScreen('select');
    });
  });

  document.getElementById('btn-start-match').addEventListener('click', () => {
    if (state.setup.online) startOnlineFlow();
    else startCombat(fighterConfigsFromSelections(), { online: false });
  });

  document.getElementById('btn-cancel-queue').addEventListener('click', () => {
    state.net.leaveQueue();
    showScreen('select');
  });

  document.getElementById('btn-forfeit').addEventListener('click', () => {
    if (state.engine) {
      state.engine.ended = true;
      state.engine.winnerTeams = [];
      state.engine.pushLog('Abandon.');
    }
    stopLoop();
    showScreen('home');
  });

  document.getElementById('btn-skip-ad').addEventListener('click', () => {
    const next = state.pendingAfterAd;
    state.pendingAfterAd = null;
    if (next) next();
    else showScreen('home');
  });

  document.getElementById('btn-rematch').addEventListener('click', () => showScreen('home'));

  window.addEventListener('resize', () => state.renderer?.resize());
}

async function boot() {
  await loadSave();
  await loadShopCatalog();
  bindUI();
  bindNet();
  showScreen('home');
}

boot();
