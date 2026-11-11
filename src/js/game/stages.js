/** Stages Smash-like avec plateformes — rendu 4D (profondeur + temps) */
export const STAGES = {
  hypercube_rift: {
    id: 'hypercube_rift',
    name: 'Faille Hypercube',
    mode4d: true,
    width: 1280,
    height: 720,
    blast: { left: -90, right: 1370, top: -140, bottom: 840 },
    ground: { x: 200, y: 530, w: 880, h: 38 },
    platforms: [
      { x: 300, y: 390, w: 170, h: 16 },
      { x: 810, y: 390, w: 170, h: 16 },
      { x: 470, y: 270, w: 340, h: 16 },
      { x: 560, y: 170, w: 160, h: 14 }
    ],
    spawns: [
      { x: 340, y: 470 },
      { x: 940, y: 470 },
      { x: 520, y: 240 },
      { x: 760, y: 240 }
    ],
    sky: ['#050816', '#141e2a', '#2a1850'],
    accent: '#67e8f9',
    accent2: '#e879f9',
    platformTop: '#e0f2fe',
    platformBot: '#6366f1',
    horizon: 420,
    vanishingY: 210
  },
  soft_orbit: {
    id: 'soft_orbit',
    name: 'Orbite Douce',
    mode4d: true,
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
    accent2: '#67e8f9',
    platformTop: '#fef3c7',
    platformBot: '#f59e0b',
    horizon: 440,
    vanishingY: 230
  },
  jelly_rails: {
    id: 'jelly_rails',
    name: 'Rails de Gelée',
    mode4d: true,
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
    accent2: '#f472b6',
    platformTop: '#f5d0fe',
    platformBot: '#c026d3',
    horizon: 450,
    vanishingY: 220
  }
};

export const STAGE_IDS = Object.keys(STAGES);

export function getStage(id) {
  if (id && STAGES[id]) return STAGES[id];
  // Bias toward the flagship 4D arena
  if (Math.random() < 0.55) return STAGES.hypercube_rift;
  const pick = STAGE_IDS[Math.floor(Math.random() * STAGE_IDS.length)];
  return STAGES[pick];
}

export function listStages() {
  return Object.values(STAGES).map((s) => ({ id: s.id, name: s.name, mode4d: !!s.mode4d }));
}
