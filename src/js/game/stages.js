/** Stages Smash-like avec plateformes */
export const STAGES = {
  soft_orbit: {
    id: 'soft_orbit',
    name: 'Orbite Douce',
    width: 1280,
    height: 720,
    blast: { left: -80, right: 1360, top: -120, bottom: 820 },
    ground: { x: 240, y: 520, w: 800, h: 40 },
    platforms: [
      { x: 360, y: 380, w: 180, h: 18 },
      { x: 740, y: 380, w: 180, h: 18 },
      { x: 550, y: 260, w: 180, h: 18 }
    ],
    spawns: [
      { x: 380, y: 460 },
      { x: 900, y: 460 },
      { x: 480, y: 340 },
      { x: 800, y: 340 }
    ],
    sky: ['#0b1d3a', '#1e3a5f', '#3b82c4'],
    accent: '#f9a8d4',
    platformTop: '#fef3c7',
    platformBot: '#f59e0b'
  },
  jelly_rails: {
    id: 'jelly_rails',
    name: 'Rails de Gelée',
    width: 1280,
    height: 720,
    blast: { left: -100, right: 1380, top: -140, bottom: 840 },
    ground: { x: 180, y: 540, w: 920, h: 36 },
    platforms: [
      { x: 220, y: 400, w: 160, h: 16 },
      { x: 900, y: 400, w: 160, h: 16 },
      { x: 480, y: 320, w: 320, h: 16 },
      { x: 560, y: 200, w: 160, h: 16 }
    ],
    spawns: [
      { x: 300, y: 480 },
      { x: 980, y: 480 },
      { x: 420, y: 280 },
      { x: 860, y: 280 }
    ],
    sky: ['#1a0b2e', '#3b1d5c', '#7c3aed'],
    accent: '#67e8f9',
    platformTop: '#f5d0fe',
    platformBot: '#c026d3'
  }
};

export const STAGE_IDS = Object.keys(STAGES);

export function getStage(id) {
  if (id && STAGES[id]) return STAGES[id];
  // Pick random stage when none specified
  const pick = STAGE_IDS[Math.floor(Math.random() * STAGE_IDS.length)];
  return STAGES[pick];
}

export function listStages() {
  return Object.values(STAGES).map((s) => ({ id: s.id, name: s.name }));
}
