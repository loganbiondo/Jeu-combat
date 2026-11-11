/** Sauvegarde locale de Neon Serpent 3.0. */

import { normalizeOwned } from './content.js';

const KEY = 'neon-serpent-3';

export function todayKey(date = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${z(date.getMonth() + 1)}-${z(date.getDate())}`;
}

export function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

export function cleanName(value) {
  const name = String(value || '').replace(/[<>&"'`]/g, '').trim().slice(0, 16);
  return name || 'Joueur';
}

export function defaultSave() {
  return {
    lang: 'fr',
    sfx: true,
    music: true,
    shake: true,
    flash: true,
    name: 'Joueur',
    skin: 'ion',
    trail: 'none',
    hat: 'none',
    death: 'shatter',
    x2: false,
    stars: 0,
    bestScore: 0,
    bestLevel: 1,
    streak: 0,
    lastDaily: '',
    owned: ['skin:ion', 'skin:pulse', 'death:shatter'],
    today: { date: todayKey(), progress: 0, done: false },
    board: []
  };
}

export function loadSave() {
  const base = defaultSave();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    const save = { ...base, ...parsed, today: { ...base.today, ...(parsed.today || {}) } };
    save.name = cleanName(save.name);
    save.owned = normalizeOwned(Array.isArray(save.owned) ? save.owned : base.owned);
    save.board = Array.isArray(save.board) ? save.board.slice(0, 10) : [];
    if (save.today.date !== todayKey()) {
      save.today = { date: todayKey(), progress: 0, done: false };
    }
    return save;
  } catch {
    return base;
  }
}

export function writeSave(save) {
  localStorage.setItem(KEY, JSON.stringify(save));
}

export function pushBoard(save, row) {
  save.board.push({
    name: cleanName(row.name),
    score: row.score | 0,
    kills: row.kills | 0,
    level: row.level | 0,
    at: Date.now()
  });
  save.board.sort((a, b) => b.score - a.score || b.kills - a.kills);
  save.board = save.board.slice(0, 10);
}
