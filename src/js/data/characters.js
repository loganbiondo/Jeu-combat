/** Personnages 100% originaux — humains, animaux, supers, gentils, méchants, aliens doux */
export const CHARACTERS = [
  {
    id: 'lumo',
    name: 'Lumo',
    role: 'gentil',
    species: 'alien',
    tagline: 'Voyageur tout doux aux ailes de lumière',
    colors: { body: '#7dd3fc', accent: '#fef08a', outline: '#0c4a6e' },
    stats: { hp: 100, atk: 12, def: 8, speed: 6.2, weight: 0.9, jump: 14, kiRegen: 1.1 },
    free: true,
    specials: ['solar_hug', 'glide_kick'],
    ultra: 'aurora_burst',
    transform: {
      name: 'Aile Solaire',
      colors: { body: '#e0f2fe', accent: '#fde047', outline: '#0369a1' },
      atkMul: 1.35,
      speedMul: 1.18,
      jumpMul: 1.12,
      duration: 14
    }
  },
  {
    id: 'pebble',
    name: 'Pebble',
    role: 'gentil',
    species: 'animal',
    tagline: 'Roc ronronnant, bouclier vivant',
    colors: { body: '#a8a29e', accent: '#84cc16', outline: '#292524' },
    stats: { hp: 120, atk: 10, def: 14, speed: 4.4, weight: 1.35, jump: 11, kiRegen: 0.9 },
    free: true,
    specials: ['boulder_roll', 'moss_guard'],
    ultra: 'tectonic_clap',
    transform: {
      name: 'Golem Magma',
      colors: { body: '#fb923c', accent: '#fef08a', outline: '#7c2d12' },
      atkMul: 1.4,
      speedMul: 1.1,
      jumpMul: 1.05,
      duration: 12
    }
  },
  {
    id: 'nori',
    name: 'Nori',
    role: 'gentil',
    species: 'humain',
    tagline: 'Cuisinière acrobatique au wok de ki',
    colors: { body: '#fb7185', accent: '#fdba74', outline: '#7f1d1d' },
    stats: { hp: 95, atk: 13, def: 7, speed: 6.8, weight: 0.85, jump: 15, kiRegen: 1.2 },
    free: true,
    specials: ['spice_dash', 'wok_spin'],
    ultra: 'banquet_boom',
    transform: {
      name: 'Chef Inferno',
      colors: { body: '#fecdd3', accent: '#fb923c', outline: '#9f1239' },
      atkMul: 1.32,
      speedMul: 1.22,
      jumpMul: 1.1,
      duration: 13
    }
  },
  {
    id: 'capra',
    name: 'Capra',
    role: 'méchant',
    species: 'animal',
    tagline: 'Chèvre pirate au rire farceur',
    colors: { body: '#c4b5fd', accent: '#f472b6', outline: '#4c1d95' },
    stats: { hp: 105, atk: 14, def: 9, speed: 5.6, weight: 1.05, jump: 13, kiRegen: 1.0 },
    free: true,
    specials: ['horn_dive', 'loot_kick'],
    ultra: 'cannon_bleat',
    transform: {
      name: 'Corsaire Tempête',
      colors: { body: '#ddd6fe', accent: '#f9a8d4', outline: '#5b21b6' },
      atkMul: 1.38,
      speedMul: 1.15,
      jumpMul: 1.1,
      duration: 13
    }
  },
  {
    id: 'mossy',
    name: 'Mossy',
    role: 'gentil',
    species: 'super',
    tagline: 'Gardien forestier qui pousse des boucliers vivants',
    colors: { body: '#4ade80', accent: '#a3e635', outline: '#14532d' },
    stats: { hp: 110, atk: 11, def: 12, speed: 5.0, weight: 1.2, jump: 12, kiRegen: 1.15 },
    free: true,
    specials: ['vine_lasso', 'leaf_pulse'],
    ultra: 'grove_quake',
    transform: {
      name: 'Forêt Sacrée',
      colors: { body: '#86efac', accent: '#fde047', outline: '#166534' },
      atkMul: 1.28,
      speedMul: 1.12,
      jumpMul: 1.08,
      duration: 14
    }
  },
  {
    id: 'zib',
    name: 'Zib',
    role: 'méchant',
    species: 'alien',
    tagline: 'Petit chaos rose, farces électriques',
    colors: { body: '#f9a8d4', accent: '#67e8f9', outline: '#9d174d' },
    stats: { hp: 90, atk: 15, def: 6, speed: 7.4, weight: 0.75, jump: 16, kiRegen: 1.3 },
    free: true,
    specials: ['spark_prank', 'bounce_bomb'],
    ultra: 'giggle_storm',
    transform: {
      name: 'Chaos Neon',
      colors: { body: '#fce7f3', accent: '#22d3ee', outline: '#be185d' },
      atkMul: 1.42,
      speedMul: 1.28,
      jumpMul: 1.15,
      duration: 11
    }
  },
  {
    id: 'kira',
    name: 'Kira',
    role: 'gentil',
    species: 'humain',
    tagline: 'Championne de parkour au poing solaire',
    colors: { body: '#fde047', accent: '#38bdf8', outline: '#854d0e' },
    stats: { hp: 100, atk: 13, def: 8, speed: 6.5, weight: 0.95, jump: 14.5, kiRegen: 1.05 },
    free: true,
    specials: ['sun_jab', 'rail_flip'],
    ultra: 'daybreak_drive',
    transform: {
      name: 'Poing Zénith',
      colors: { body: '#fef9c3', accent: '#38bdf8', outline: '#a16207' },
      atkMul: 1.36,
      speedMul: 1.2,
      jumpMul: 1.14,
      duration: 13
    }
  },
  {
    id: 'bolt',
    name: 'Bolt',
    role: 'super',
    species: 'animal',
    tagline: 'Écureuil survolté, trails d’étincelles',
    colors: { body: '#fdba74', accent: '#facc15', outline: '#9a3412' },
    stats: { hp: 92, atk: 12, def: 7, speed: 7.8, weight: 0.7, jump: 16.5, kiRegen: 1.25 },
    free: true,
    specials: ['nut_missile', 'zip_line'],
    ultra: 'thunder_acorn',
    transform: {
      name: 'Super Bolt',
      colors: { body: '#ffedd5', accent: '#facc15', outline: '#c2410c' },
      atkMul: 1.33,
      speedMul: 1.35,
      jumpMul: 1.2,
      duration: 12
    }
  },
  {
    id: 'quillox',
    name: 'Quillox',
    role: 'gentil',
    species: 'alien',
    tagline: 'Plumes tourbillonnantes, régénération douce',
    colors: { body: '#99f6e4', accent: '#e9d5ff', outline: '#115e59' },
    stats: { hp: 108, atk: 11, def: 10, speed: 5.8, weight: 0.95, jump: 13.5, kiRegen: 1.4 },
    free: false,
    specials: ['plume_spiral', 'soft_regen'],
    ultra: 'feather_nova',
    transform: {
      name: 'Plume Cosmique',
      colors: { body: '#ccfbf1', accent: '#c4b5fd', outline: '#0f766e' },
      atkMul: 1.3,
      speedMul: 1.16,
      jumpMul: 1.12,
      duration: 14
    }
  },
  {
    id: 'ironpaw',
    name: 'Ironpaw',
    role: 'super',
    species: 'animal',
    tagline: 'Félin blindé au smash écrasant',
    colors: { body: '#94a3b8', accent: '#f97316', outline: '#1e293b' },
    stats: { hp: 125, atk: 16, def: 13, speed: 4.8, weight: 1.45, jump: 11.5, kiRegen: 0.85 },
    free: false,
    specials: ['steel_pounce', 'ki_shield'],
    ultra: 'meteor_claw',
    transform: {
      name: 'Armure Météore',
      colors: { body: '#cbd5e1', accent: '#fb923c', outline: '#0f172a' },
      atkMul: 1.45,
      speedMul: 1.12,
      jumpMul: 1.06,
      duration: 12
    }
  },
  {
    id: 'velvet',
    name: 'Velvet Nyx',
    role: 'méchant',
    species: 'humain',
    tagline: 'Anti-héroïne au téléport velours',
    colors: { body: '#e879f9', accent: '#1e1b4b', outline: '#4a044e' },
    stats: { hp: 98, atk: 14, def: 8, speed: 6.9, weight: 0.88, jump: 15, kiRegen: 1.18 },
    free: false,
    specials: ['velvet_warp', 'ki_drain'],
    ultra: 'midnight_bloom',
    transform: {
      name: 'Nyx Absolue',
      colors: { body: '#f5d0fe', accent: '#818cf8', outline: '#701a75' },
      atkMul: 1.4,
      speedMul: 1.24,
      jumpMul: 1.12,
      duration: 12
    }
  }
];

export const SKINS = {
  lumo: {
    aurora: { body: '#a5b4fc', accent: '#86efac', outline: '#312e81', label: 'Aurore' }
  },
  pebble: {
    magma: { body: '#fb923c', accent: '#fef08a', outline: '#7c2d12', label: 'Magma' }
  }
};

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}
