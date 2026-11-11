/** Roster 2026 — combattants humains réalistes (ids stables pour techniques / saves) */
export const CHARACTERS = [
  {
    id: 'lumo',
    name: 'Aria Vale',
    role: 'striker',
    species: 'humain',
    tagline: 'Sprinteuse urbaine, combos nets et ki solaire',
    colors: { body: '#c68642', accent: '#38bdf8', outline: '#3b2314', hair: '#1c1917', cloth: '#0f172a' },
    appearance: { sex: 'f', hair: 'short', build: 'athletic', height: 1.0 },
    stats: { hp: 100, atk: 13, def: 8, speed: 6.6, weight: 0.92, jump: 14.2, kiRegen: 1.15 },
    free: true,
    specials: ['solar_hug', 'glide_kick'],
    ultra: 'aurora_burst',
    transform: {
      name: 'Aube Vivante',
      colors: { body: '#e0b080', accent: '#fde047', outline: '#3b2314', hair: '#f8fafc', cloth: '#082f49' },
      atkMul: 1.35,
      speedMul: 1.2,
      jumpMul: 1.12,
      duration: 14
    }
  },
  {
    id: 'pebble',
    name: 'Kenzo Park',
    role: 'tank',
    species: 'humain',
    tagline: 'Garde lourde, smash qui casse le rythme',
    colors: { body: '#8d5524', accent: '#f97316', outline: '#2a160a', hair: '#111827', cloth: '#1f2937' },
    appearance: { sex: 'm', hair: 'buzz', build: 'heavy', height: 1.08 },
    stats: { hp: 120, atk: 11, def: 14, speed: 4.6, weight: 1.35, jump: 11.2, kiRegen: 0.9 },
    free: true,
    specials: ['boulder_roll', 'moss_guard'],
    ultra: 'tectonic_clap',
    transform: {
      name: 'Armure Titan',
      colors: { body: '#a16207', accent: '#fb923c', outline: '#1c1917', hair: '#0f172a', cloth: '#334155' },
      atkMul: 1.4,
      speedMul: 1.1,
      jumpMul: 1.05,
      duration: 12
    }
  },
  {
    id: 'nori',
    name: 'Maya Cruz',
    role: 'rushdown',
    species: 'humain',
    tagline: 'Pression constante, kicks acrobatiques',
    colors: { body: '#d4a574', accent: '#fb7185', outline: '#4a2c1a', hair: '#7c2d12', cloth: '#881337' },
    appearance: { sex: 'f', hair: 'ponytail', build: 'slim', height: 0.96 },
    stats: { hp: 95, atk: 14, def: 7, speed: 7.0, weight: 0.84, jump: 15.2, kiRegen: 1.2 },
    free: true,
    specials: ['spice_dash', 'wok_spin'],
    ultra: 'banquet_boom',
    transform: {
      name: 'Rouge Absolute',
      colors: { body: '#e8c4a0', accent: '#fda4af', outline: '#4a2c1a', hair: '#450a0a', cloth: '#9f1239' },
      atkMul: 1.32,
      speedMul: 1.24,
      jumpMul: 1.12,
      duration: 13
    }
  },
  {
    id: 'capra',
    name: 'Omar Diallo',
    role: 'power',
    species: 'humain',
    tagline: 'Coups lourds, présence de ring',
    colors: { body: '#5c3317', accent: '#a78bfa', outline: '#1c0f08', hair: '#0a0a0a', cloth: '#312e81' },
    appearance: { sex: 'm', hair: 'fade', build: 'athletic', height: 1.06 },
    stats: { hp: 108, atk: 15, def: 10, speed: 5.5, weight: 1.12, jump: 12.8, kiRegen: 1.0 },
    free: true,
    specials: ['horn_dive', 'loot_kick'],
    ultra: 'cannon_bleat',
    transform: {
      name: 'Roi du Ring',
      colors: { body: '#6b3a1a', accent: '#c4b5fd', outline: '#1c0f08', hair: '#000', cloth: '#1e1b4b' },
      atkMul: 1.38,
      speedMul: 1.14,
      jumpMul: 1.08,
      duration: 13
    }
  },
  {
    id: 'mossy',
    name: 'Soren Blake',
    role: 'balanced',
    species: 'humain',
    tagline: 'Lecture de jeu, contre-attaques propres',
    colors: { body: '#e0ac69', accent: '#4ade80', outline: '#5c4033', hair: '#365314', cloth: '#14532d' },
    appearance: { sex: 'm', hair: 'medium', build: 'athletic', height: 1.02 },
    stats: { hp: 110, atk: 12, def: 12, speed: 5.4, weight: 1.1, jump: 12.5, kiRegen: 1.12 },
    free: true,
    specials: ['vine_lasso', 'leaf_pulse'],
    ultra: 'grove_quake',
    transform: {
      name: 'Focus Vert',
      colors: { body: '#ebc48a', accent: '#86efac', outline: '#5c4033', hair: '#166534', cloth: '#052e16' },
      atkMul: 1.28,
      speedMul: 1.14,
      jumpMul: 1.08,
      duration: 14
    }
  },
  {
    id: 'zib',
    name: 'Jin Reyes',
    role: 'chaos',
    species: 'humain',
    tagline: 'Mix-ups électriques, rythme imprévisible',
    colors: { body: '#f1c27d', accent: '#f472b6', outline: '#6b4423', hair: '#831843', cloth: '#500724' },
    appearance: { sex: 'm', hair: 'spiky', build: 'slim', height: 0.98 },
    stats: { hp: 92, atk: 15, def: 6, speed: 7.5, weight: 0.78, jump: 16, kiRegen: 1.3 },
    free: true,
    specials: ['spark_prank', 'bounce_bomb'],
    ultra: 'giggle_storm',
    transform: {
      name: 'Overdrive',
      colors: { body: '#f5d0a0', accent: '#22d3ee', outline: '#6b4423', hair: '#fce7f3', cloth: '#9d174d' },
      atkMul: 1.42,
      speedMul: 1.3,
      jumpMul: 1.16,
      duration: 11
    }
  },
  {
    id: 'kira',
    name: 'Elena Rossi',
    role: 'technical',
    species: 'humain',
    tagline: 'Footsies précis, anti-airs chirurgicaux',
    colors: { body: '#c68642', accent: '#facc15', outline: '#3f2a14', hair: '#78350f', cloth: '#422006' },
    appearance: { sex: 'f', hair: 'bob', build: 'athletic', height: 0.99 },
    stats: { hp: 100, atk: 13, def: 9, speed: 6.4, weight: 0.94, jump: 14.4, kiRegen: 1.08 },
    free: true,
    specials: ['sun_jab', 'rail_flip'],
    ultra: 'daybreak_drive',
    transform: {
      name: 'Zénith',
      colors: { body: '#d4a574', accent: '#fde047', outline: '#3f2a14', hair: '#fef3c7', cloth: '#78350f' },
      atkMul: 1.36,
      speedMul: 1.18,
      jumpMul: 1.12,
      duration: 13
    }
  },
  {
    id: 'bolt',
    name: 'Ray Nakamura',
    role: 'speed',
    species: 'humain',
    tagline: 'Dash cancels, pression latérale pure',
    colors: { body: '#ffe0bd', accent: '#38bdf8', outline: '#8b5e3c', hair: '#111827', cloth: '#0c4a6e' },
    appearance: { sex: 'm', hair: 'messy', build: 'slim', height: 0.97 },
    stats: { hp: 94, atk: 12, def: 7, speed: 7.9, weight: 0.72, jump: 16.2, kiRegen: 1.25 },
    free: true,
    specials: ['nut_missile', 'zip_line'],
    ultra: 'thunder_acorn',
    transform: {
      name: 'Flash Step',
      colors: { body: '#fff1e0', accent: '#facc15', outline: '#8b5e3c', hair: '#f8fafc', cloth: '#075985' },
      atkMul: 1.33,
      speedMul: 1.36,
      jumpMul: 1.2,
      duration: 12
    }
  },
  {
    id: 'quillox',
    name: 'Nova Chen',
    role: 'support',
    species: 'humain',
    tagline: 'Régénération, zoning et reset de round',
    colors: { body: '#f2d2a9', accent: '#2dd4bf', outline: '#7a4e2d', hair: '#134e4a', cloth: '#115e59' },
    appearance: { sex: 'f', hair: 'long', build: 'slim', height: 1.0 },
    stats: { hp: 108, atk: 11, def: 10, speed: 5.9, weight: 0.95, jump: 13.6, kiRegen: 1.4 },
    free: false,
    specials: ['plume_spiral', 'soft_regen'],
    ultra: 'feather_nova',
    transform: {
      name: 'Nébuleuse',
      colors: { body: '#f8e4c8', accent: '#a5b4fc', outline: '#7a4e2d', hair: '#ecfeff', cloth: '#0f766e' },
      atkMul: 1.3,
      speedMul: 1.16,
      jumpMul: 1.1,
      duration: 14
    }
  },
  {
    id: 'ironpaw',
    name: 'Viktor Hale',
    role: 'grappler',
    species: 'humain',
    tagline: 'Command grabs, smash au sol',
    colors: { body: '#9a6b3f', accent: '#fb923c', outline: '#3b2412', hair: '#1e293b', cloth: '#334155' },
    appearance: { sex: 'm', hair: 'buzz', build: 'heavy', height: 1.12 },
    stats: { hp: 125, atk: 16, def: 13, speed: 4.7, weight: 1.45, jump: 11.4, kiRegen: 0.85 },
    free: false,
    specials: ['steel_pounce', 'ki_shield'],
    ultra: 'meteor_claw',
    transform: {
      name: 'Météore',
      colors: { body: '#b45309', accent: '#fdba74', outline: '#1c1917', hair: '#0f172a', cloth: '#0f172a' },
      atkMul: 1.45,
      speedMul: 1.1,
      jumpMul: 1.05,
      duration: 12
    }
  },
  {
    id: 'velvet',
    name: 'Nyx Moreau',
    role: 'assassin',
    species: 'humain',
    tagline: 'Téléports, drain de ki, finishers froids',
    colors: { body: '#c68642', accent: '#e879f9', outline: '#3b2314', hair: '#1e1b4b', cloth: '#4a044e' },
    appearance: { sex: 'f', hair: 'long', build: 'athletic', height: 1.01 },
    stats: { hp: 98, atk: 14, def: 8, speed: 6.9, weight: 0.88, jump: 15, kiRegen: 1.18 },
    free: false,
    specials: ['velvet_warp', 'ki_drain'],
    ultra: 'midnight_bloom',
    transform: {
      name: 'Void Bloom',
      colors: { body: '#d4a574', accent: '#c084fc', outline: '#3b2314', hair: '#f5d0fe', cloth: '#2e1065' },
      atkMul: 1.4,
      speedMul: 1.24,
      jumpMul: 1.12,
      duration: 12
    }
  }
];

export const SKINS = {
  lumo: {
    aurora: { body: '#e8be9a', accent: '#86efac', outline: '#3b2314', hair: '#312e81', cloth: '#1e3a5f', label: 'Aurore' }
  },
  pebble: {
    magma: { body: '#a16207', accent: '#fef08a', outline: '#1c1917', hair: '#0f172a', cloth: '#7c2d12', label: 'Magma' }
  }
};

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}
