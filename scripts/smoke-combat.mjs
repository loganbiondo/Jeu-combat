/**
 * Smoke test headless du moteur de combat (sans Electron).
 * Simule un 1v1 jusqu'à KO / timeout.
 */
import { CombatEngine } from '../src/js/game/engine.js';

// Stub Web Audio in Node
globalThis.window = globalThis;
globalThis.AudioContext = class {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.sampleRate = 44100;
    this.destination = {};
  }
  createGain() {
    return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
      start() {},
      stop() {}
    };
  }
  createBuffer() {
    return { getChannelData: () => new Float32Array(8) };
  }
  createBufferSource() {
    return { buffer: null, connect() {}, start() {} };
  }
  createBiquadFilter() {
    return { type: '', frequency: { value: 0 }, connect() {} };
  }
  resume() {}
};

const engine = new CombatEngine({
  mode: '1v1',
  fighters: [
    { id: 'a', slot: 0, team: 0, characterId: 'lumo', name: 'Lumo', stocks: 2 },
    { id: 'b', slot: 1, team: 1, characterId: 'zib', name: 'Zib', stocks: 2 }
  ]
});

// Force high ki for ultras
engine.fighters[0].ki = 100;
engine.fighters[1].ki = 100;

let frames = 0;
const maxFrames = 60 * 45; // 45s
while (!engine.ended && frames < maxFrames) {
  const inputs = {
    0: {
      moveX: frames % 40 < 20 ? 1 : -1,
      jump: frames % 55 === 0,
      attack: frames % 18 === 0,
      special: frames % 90 === 10,
      ultra: frames === 120 || frames === 600,
      regen: frames % 200 === 50
    },
    1: {
      moveX: frames % 35 < 18 ? -1 : 1,
      jump: frames % 70 === 5,
      attack: frames % 22 === 0,
      special: frames % 100 === 20,
      ultra: frames === 200,
      regen: false
    }
  };
  engine.update(1 / 60, inputs);
  frames += 1;
}

const snap = engine.snapshot();
const ok = snap.log.length > 0 && (snap.ended || frames >= maxFrames);
console.log(
  JSON.stringify(
    {
      ok,
      ended: snap.ended,
      frames,
      winners: snap.winnerTeams,
      stocks: snap.fighters.map((f) => ({ name: f.name, stocks: f.stocks, percent: Math.round(f.percent) })),
      logHead: snap.log.slice(0, 5).map((l) => l.msg)
    },
    null,
    2
  )
);
if (!ok) process.exit(1);
