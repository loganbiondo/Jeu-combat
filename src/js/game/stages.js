/**
 * Stages 2D type Tekken / Street Fighter / DBZ :
 * sol unique + murs — pas de plateformes ni chute hors écran.
 */
export const STAGES = {
  soft_orbit: {
    id: 'soft_orbit',
    name: 'Orbite Douce',
    width: 1280,
    height: 720,
    floorY: 560,
    walls: { left: 80, right: 1200 },
    ground: { x: 60, y: 560, w: 1160, h: 48 },
    platforms: [],
    spawns: [
      { x: 300, y: 520 },
      { x: 980, y: 520 },
      { x: 380, y: 520 },
      { x: 900, y: 520 }
    ],
    sky: ['#0b1d3a', '#1e3a5f', '#3b82c4'],
    accent: '#f9a8d4',
    platformTop: '#fef3c7',
    platformBot: '#f59e0b'
  },
  jelly_dojo: {
    id: 'jelly_dojo',
    name: 'Dojo Gelée',
    width: 1280,
    height: 720,
    floorY: 560,
    walls: { left: 100, right: 1180 },
    ground: { x: 80, y: 560, w: 1120, h: 48 },
    platforms: [],
    spawns: [
      { x: 320, y: 520 },
      { x: 960, y: 520 },
      { x: 400, y: 520 },
      { x: 880, y: 520 }
    ],
    sky: ['#1a1028', '#3b1d4a', '#7c3a5c'],
    accent: '#67e8f9',
    platformTop: '#f5d0fe',
    platformBot: '#c026d3'
  }
};

export const STAGE_IDS = Object.keys(STAGES);

export function getStage(id) {
  if (id && STAGES[id]) return STAGES[id];
  const pick = STAGE_IDS[Math.floor(Math.random() * STAGE_IDS.length)];
  return STAGES[pick];
}

export function listStages() {
  return Object.values(STAGES).map((s) => ({ id: s.id, name: s.name }));
}
