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
    ultra: 'aurora_burst'
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
    ultra: 'tectonic_clap'
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
    ultra: 'banquet_boom'
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
    ultra: 'cannon_bleat'
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
    ultra: 'grove_quake'
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
    ultra: 'giggle_storm'
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
    ultra: 'daybreak_drive'
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
    ultra: 'thunder_acorn'
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
    ultra: 'feather_nova'
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
    ultra: 'meteor_claw'
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
    ultra: 'midnight_bloom'
  },
  {
    id: 'grok',
    name: 'Grok',
    role: 'super',
    species: 'alien',
    tagline: 'Esprit cosmique — partenaire de Fusion',
    colors: { body: '#111827', accent: '#f5d657', outline: '#f8fafc' },
    stats: { hp: 110, atk: 15, def: 10, speed: 6.6, weight: 1.0, jump: 14.5, kiRegen: 1.35 },
    free: true,
    fusionPartner: true,
    specials: ['wit_slash', 'orbit_dash'],
    ultra: 'cosmic_punchline'
  }
];

/** Forme fusionnée héros × Grok — stats boost + ultra dédiée */
export const FUSION_GROK = {
  id: 'fusion_grok',
  name: 'Fusion Grok',
  tagline: 'Deux âmes, un smash cosmique',
  colors: { body: '#1e293b', accent: '#f5d657', outline: '#7dd3fc' },
  statsMul: { hp: 1.25, atk: 1.45, def: 1.2, speed: 1.25, jump: 1.15, kiRegen: 1.4, weight: 1.1 },
  specials: ['wit_slash', 'orbit_dash'],
  ultra: 'fusion_nova',
  duration: 14
};

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
