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
    sky: ['#0b1d3a', '#1e3a5f', '#3b82c4']
  }
};

export function getStage(id = 'soft_orbit') {
  return STAGES[id] || STAGES.soft_orbit;
}
