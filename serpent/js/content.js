/** Neon Serpent 3.0 — skins, boutique, biomes, défis. */

export const SKINS = [
  { id: 'ion', name: 'Ion', head: '#00F0FF', tail: '#7DF9FF', stars: 0 },
  { id: 'pulse', name: 'Pulse', head: '#FF2D8A', tail: '#FF9EC4', stars: 0 },
  { id: 'venom', name: 'Venom', head: '#7CF25A', tail: '#D8FFB0', stars: 20 },
  { id: 'solar', name: 'Solar', head: '#FFD60A', tail: '#FF8A00', stars: 35 },
  { id: 'void', name: 'Void', head: '#A78BFA', tail: '#E9D5FF', stars: 50 },
  { id: 'ember', name: 'Ember', head: '#FF4D6D', tail: '#FFB020', stars: 70 },
  { id: 'pearl', name: 'Pearl', head: '#F8FAFC', tail: '#7DF9FF', stars: 110 },
  { id: 'prism', name: 'Prism', head: '#FFFFFF', tail: '#FF00C8', stars: 180, prism: true }
];

export const TRAILS = [
  { id: 'none', stars: 0 },
  { id: 'ion', stars: 15 },
  { id: 'ribbon', stars: 30 },
  { id: 'pixel', stars: 45 },
  { id: 'fire', stars: 60 }
];

export const HATS = [
  { id: 'none', stars: 0 },
  { id: 'crown', stars: 40 },
  { id: 'halo', stars: 55 },
  { id: 'horns', stars: 75 }
];

export const DEATHS = [
  { id: 'shatter', stars: 0 },
  { id: 'supernova', stars: 50 },
  { id: 'blackhole', stars: 80 },
  { id: 'glitch', stars: 90 }
];

export const PERKS = ['venom', 'phase', 'magnet', 'razor', 'glutton', 'battery'];

export const BIOMES = [
  {
    id: 'city',
    grid: '#00F0FF',
    core: 'rgba(0, 240, 255, 0.28)',
    ring: '#00F0FF',
    void: '#03060d',
    nebula: ['#071428', '#1a0820', '#042033'],
    accent: '#FF2D8A'
  },
  {
    id: 'reef',
    grid: '#3DFFC8',
    core: 'rgba(61, 255, 200, 0.22)',
    ring: '#7CF25A',
    void: '#020a08',
    nebula: ['#021810', '#042028', '#063018'],
    accent: '#7DF9FF'
  },
  {
    id: 'solar',
    grid: '#FFB020',
    core: 'rgba(255, 140, 32, 0.26)',
    ring: '#FF4D6D',
    void: '#0c0604',
    nebula: ['#1a0c08', '#240818', '#1a1206'],
    accent: '#FFD60A'
  }
];

export const ORB_COLORS = {
  bit: '#7DF9FF',
  cluster: '#7CF25A',
  shield: '#FFD60A',
  magnet: '#FF4FD8',
  slowmo: '#A78BFA',
  turbo: '#FF8A00',
  core: '#FFFFFF',
  razor: '#FF4D6D'
};

const BY_ID = new Map(SKINS.map((s) => [s.id, s]));

export function skinById(id) {
  return BY_ID.get(id) || SKINS[0];
}

export function biomeIndex(level) {
  return Math.floor((Math.max(1, level) - 1) / 4) % BIOMES.length;
}

export function starsForRun(score, kills, x2) {
  const n = Math.floor(Math.max(0, score) / 60) + Math.max(0, kills) * 3;
  return x2 ? n * 2 : n;
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

const CHALLENGES = [
  { kind: 'eats', base: 18, span: 16 },
  { kind: 'kills', base: 2, span: 4 },
  { kind: 'level', base: 3, span: 4 },
  { kind: 'score', base: 80, span: 12, step: 20 },
  { kind: 'shields', base: 1, span: 2 },
  { kind: 'powers', base: 2, span: 3 }
];

export function challengeFor(dateStr) {
  const n = hashString(String(dateStr));
  const spec = CHALLENGES[n % CHALLENGES.length];
  const roll = (n >>> 8) % spec.span;
  const target = spec.step ? spec.base + roll * spec.step : spec.base + roll;
  return { kind: spec.kind, target };
}

export function challengeText(lang, t, challenge) {
  return t(lang, `ch_${challenge.kind}`).replace('{n}', String(challenge.target));
}

export function shopSections() {
  return [
    { id: 'skin', items: SKINS },
    { id: 'trail', items: TRAILS },
    { id: 'hat', items: HATS },
    { id: 'death', items: DEATHS },
    { id: 'boost', items: [{ id: 'x2', stars: 120 }] }
  ];
}

export function ownKey(slot, id) {
  return `${slot}:${id}`;
}

const LEGACY_SLOT = {
  ion: 'skin',
  pulse: 'skin',
  venom: 'skin',
  solar: 'skin',
  void: 'skin',
  ember: 'skin',
  pearl: 'skin',
  prism: 'skin',
  ribbon: 'trail',
  pixel: 'trail',
  fire: 'trail',
  crown: 'hat',
  halo: 'hat',
  horns: 'hat',
  shatter: 'death',
  supernova: 'death',
  blackhole: 'death',
  glitch: 'death'
};

export function normalizeOwned(list) {
  const out = [];
  for (const raw of list || []) {
    const id = String(raw);
    if (id.includes(':')) {
      if (!out.includes(id)) out.push(id);
      continue;
    }
    const slot = LEGACY_SLOT[id];
    if (!slot) continue;
    const key = ownKey(slot, id);
    if (!out.includes(key)) out.push(key);
  }
  return out;
}
