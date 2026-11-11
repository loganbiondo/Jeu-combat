/**
 * Sons synthétisés (Web Audio) — hits, ki, ultra, KO, UI.
 * Pas de fichiers audio externes.
 */
export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.55;
  }

  ensure() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  tone({ freq = 440, dur = 0.12, type = 'square', gain = 0.12, slide = 0, delay = 0 }) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.1, gain = 0.08, filterFreq = 1200 }) {
    const ctx = this.ensure();
    if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start();
  }

  hit(heavy = false) {
    this.noise({ dur: heavy ? 0.18 : 0.08, gain: heavy ? 0.14 : 0.07, filterFreq: heavy ? 600 : 1400 });
    this.tone({
      freq: heavy ? 180 : 320,
      dur: heavy ? 0.16 : 0.08,
      type: 'sawtooth',
      gain: heavy ? 0.1 : 0.06,
      slide: heavy ? -120 : -60
    });
  }

  ki() {
    this.tone({ freq: 520, dur: 0.2, type: 'sine', gain: 0.07, slide: 280 });
    this.tone({ freq: 780, dur: 0.25, type: 'triangle', gain: 0.05, slide: 200, delay: 0.04 });
  }

  charge() {
    this.tone({ freq: 110, dur: 0.45, type: 'sawtooth', gain: 0.08, slide: 220 });
    this.tone({ freq: 220, dur: 0.5, type: 'sine', gain: 0.06, slide: 400, delay: 0.05 });
    this.noise({ dur: 0.35, gain: 0.05, filterFreq: 900 });
  }

  ultra() {
    this.charge();
    this.tone({ freq: 90, dur: 0.55, type: 'square', gain: 0.1, slide: 60, delay: 0.15 });
    this.noise({ dur: 0.4, gain: 0.12, filterFreq: 400 });
    this.tone({ freq: 660, dur: 0.3, type: 'triangle', gain: 0.08, slide: -200, delay: 0.35 });
  }

  special() {
    this.tone({ freq: 300, dur: 0.14, type: 'square', gain: 0.07, slide: 180 });
    this.noise({ dur: 0.12, gain: 0.06, filterFreq: 1100 });
  }

  regen() {
    this.tone({ freq: 400, dur: 0.25, type: 'sine', gain: 0.06, slide: 180 });
    this.tone({ freq: 600, dur: 0.3, type: 'sine', gain: 0.04, slide: 120, delay: 0.08 });
  }

  ko() {
    this.noise({ dur: 0.35, gain: 0.16, filterFreq: 350 });
    this.tone({ freq: 140, dur: 0.4, type: 'sawtooth', gain: 0.12, slide: -100 });
    this.tone({ freq: 80, dur: 0.5, type: 'square', gain: 0.08, slide: -40, delay: 0.1 });
  }

  jump() {
    this.tone({ freq: 280, dur: 0.1, type: 'triangle', gain: 0.05, slide: 160 });
  }

  ui() {
    this.tone({ freq: 520, dur: 0.07, type: 'sine', gain: 0.05 });
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.07, delay: i * 0.1 });
    });
  }
}

export const audio = new AudioBus();
