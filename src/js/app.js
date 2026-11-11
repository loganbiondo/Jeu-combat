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

function normalizeSave(save) {
  const freeIds = CHARACTERS.filter((c) => c.free).map((c) => c.id);
  const unlocked = new Set([...(save?.unlockedCharacters || []), ...freeIds]);
  return {
    unlockedSkins: {},
    unlockedTechniques: {},
    ownedProducts: [],
    adFree: false,
    promptHistory: [],
    wins: 0,
    matchesPlayed: 0,
    settings: { showAds: true },
    ...save,
    unlockedCharacters: [...unlocked]
  };
}

async function loadSave() {
  if (window.aki?.getSave) {
    state.save = normalizeSave(await window.aki.getSave());
  } else {
    const raw = localStorage.getItem('aki-save');
    state.save = normalizeSave(
      raw
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
          }
    );
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
  ul.replaceChildren();
  for (const l of state.engine.log.slice(0, 20)) {
    const li = document.createElement('li');
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = `${l.t}s`;
    li.appendChild(t);
    li.appendChild(document.createTextNode(String(l.msg ?? '')));
    ul.appendChild(li);
  }
}

function stopLoop() {
  if (state.raf) cancelAnimationFrame(state.raf);
  state.raf = 0;
  state.engine = null;
}

function startCombat(fighters, { online = false, host = true, fusionReady = false } = {}) {
  stopLoop();
  showScreen('combat');
  const canvas = document.getElementById('game-canvas');
  state.engine = new CombatEngine({
    mode: state.setup.mode,
    online,
    fighters,
    host,
    stocks: 3,
    fusionReady: fusionReady || !!state.setup?.fusionReady
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
      if (online && host && Math.floor(state.engine.time * 20) % 2 === 0) {
        state.net.sendState(state.engine.snapshot());
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
        state.net.sendEnd({ winnerTeams: state.engine.winnerTeams });
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
  const fighters = engine?.fighters || [];
  const names = fighters
    .filter((f) => winners.includes(f.team))
    .map((f) => f.name)
    .join(' & ');
  const localTeam =
    fighters.find((f) => f.slot === (state.localSeat ?? 0))?.team ?? 0;
  const didWin = winners.includes(localTeam);

  stopLoop();

  const reward = pickRewardPrompt(state.save.promptHistory || []);
  const history = [...(state.save.promptHistory || []), reward.index].slice(-100);
  await patchSave({
    promptHistory: history,
    wins: (state.save.wins || 0) + (didWin ? 1 : 0),
    matchesPlayed: (state.save.matchesPlayed || 0) + 1
  });

  const goVictory = () => {
    document.getElementById('victory-title').textContent = names || 'Match terminé';
    document.getElementById('victory-sub').textContent = didWin
      ? 'Effets spéciaux déployés. Prompt débloqué !'
      : 'Match terminé. Réessaie pour débloquer un prompt.';
    document.getElementById('reward-prompt').textContent = didWin
      ? reward.text
      : 'Victoire requise pour la récompense.';
    showScreen('victory');
  };

  if (didWin && shouldShowAds(state.save)) showInterstitial(goVictory);
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
      stocks: 3
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
    const clamp = (n, lo, hi, fallback) => {
      const v = Number(n);
      if (!Number.isFinite(v)) return fallback;
      return Math.max(lo, Math.min(hi, v));
    };
    // Soft sync positions + Fusion Grok for non-host (bornes anti-abus)
    snap.fighters?.forEach((sf) => {
      const f = state.engine.fighters.find((x) => x.slot === sf.slot);
      if (!f) return;
      f.x = clamp(sf.x, -500, 1800, f.x);
      f.y = clamp(sf.y, -500, 1200, f.y);
      f.vx = clamp(sf.vx, -2000, 2000, f.vx);
      f.vy = clamp(sf.vy, -2000, 2000, f.vy);
      f.percent = clamp(sf.percent, 0, 999, f.percent);
      f.hp = clamp(sf.hp, 0, 500, f.hp);
      f.maxHp = clamp(sf.maxHp ?? f.maxHp, 1, 500, f.maxHp);
      f.ki = clamp(sf.ki, 0, 100, f.ki);
      f.stocks = clamp(sf.stocks, 0, 5, f.stocks);
      f.alive = !!sf.alive;
      f.action = typeof sf.action === 'string' ? sf.action.slice(0, 24) : f.action;
      f.facing = sf.facing === -1 ? -1 : 1;
      if (typeof sf.characterId === 'string') f.characterId = sf.characterId.slice(0, 32);
      if (typeof sf.name === 'string') f.name = sf.name.slice(0, 40);
      if (sf.colors && typeof sf.colors === 'object') f.colors = sf.colors;
      f.fused = !!sf.fused;
      f.fusionMeter = clamp(sf.fusionMeter ?? f.fusionMeter, 0, 100, f.fusionMeter);
      f.maxFusionMeter = clamp(sf.maxFusionMeter ?? f.maxFusionMeter, 1, 100, f.maxFusionMeter);
      f.fusionTimer = clamp(sf.fusionTimer ?? f.fusionTimer, 0, 30, f.fusionTimer);
      f.canFusion = sf.canFusion ?? f.canFusion;
    });
    if (Array.isArray(snap.log)) {
      state.engine.log = snap.log.slice(0, 40).map((l) => ({
        t: String(l?.t ?? '').slice(0, 12),
        msg: String(l?.msg ?? '').slice(0, 160)
      }));
    }
    state.engine.fusionBanner = clamp(snap.fusionBanner ?? 0, 0, 10, 0);
    state.engine.fusionBannerText = String(snap.fusionBannerText || '').slice(0, 48);
    if (snap.ended) {
      state.engine.ended = true;
      state.engine.winnerTeams = Array.isArray(snap.winnerTeams)
        ? snap.winnerTeams.filter((t) => t === 0 || t === 1).slice(0, 2)
        : [];
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
      const fusionMode = mode === 'fusion';
      state.setup = {
        online: net === 'online',
        mode: fusionMode ? '1v1' : mode,
        fusionReady: fusionMode
      };
      initSelections();
      renderSelect();
      showScreen('select');
    });
  });

  document.getElementById('btn-fusion-demo')?.addEventListener('click', () => {
    audio.ui();
    state.setup = { online: false, mode: '1v1', fusionReady: true };
    initSelections();
    // Prefer a free non-Grok hero so Fusion Grok is visible
    const hero = CHARACTERS.find((c) => c.free && c.id !== 'grok') || CHARACTERS[0];
    const foe = CHARACTERS.find((c) => c.id === 'grok') || CHARACTERS[1];
    state.selections[0].characterId = hero.id;
    state.selections[1].characterId = foe.id;
    startCombat(fighterConfigsFromSelections(), { online: false, fusionReady: true });
  });

  document.getElementById('btn-start-match').addEventListener('click', () => {
    if (state.setup.online) startOnlineFlow();
    else startCombat(fighterConfigsFromSelections(), { online: false, fusionReady: !!state.setup.fusionReady });
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
