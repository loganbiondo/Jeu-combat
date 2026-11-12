/** Audio synthétisé : nappe, arpège doux, impacts. */

export const sound = {
  sfx: true,
  music: true,
  ctx: null,
  master: null,
  musicGain: null,
  sfxGain: null,
  filter: null,
  nextNote: 0,
  noteIndex: 0,
  lastEat: 0,
  started: false,

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let ctx;
    try {
      ctx = new AC();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 18;
    comp.ratio.value = 3.2;
    comp.attack.value = 0.01;
    comp.release.value = 0.2;
    master.connect(comp).connect(ctx.destination);
    this.master = master;

    const musicGain = ctx.createGain();
    musicGain.gain.value = this.music ? 0.22 : 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    filter.Q.value = 0.7;
    musicGain.connect(filter).connect(master);
    this.musicGain = musicGain;
    this.filter = filter;

    const sfxGain = ctx.createGain();
    sfxGain.gain.value = this.sfx ? 0.8 : 0;
    sfxGain.connect(master);
    this.sfxGain = sfxGain;

    const bedA = ctx.createOscillator();
    bedA.type = 'sawtooth';
    bedA.frequency.value = 55;
    const gA = ctx.createGain();
    gA.gain.value = 0.18;
    bedA.connect(gA).connect(musicGain);

    const bedB = ctx.createOscillator();
    bedB.type = 'triangle';
    bedB.frequency.value = 82.5;
    const gB = ctx.createGain();
    gB.gain.value = 0.12;
    bedB.connect(gB).connect(musicGain);

    const bedC = ctx.createOscillator();
    bedC.type = 'sine';
    bedC.frequency.value = 110;
    const gC = ctx.createGain();
    gC.gain.value = 0.06;
    bedC.connect(gC).connect(musicGain);

    bedA.start();
    bedB.start();
    bedC.start();
    this.started = true;
    this.nextNote = ctx.currentTime + 0.2;
    } catch {
      this.ctx = null;
      this.started = false;
    }
  },

  setSfx(on) {
    this.sfx = !!on;
    if (this.sfxGain) this.sfxGain.gain.value = on ? 0.8 : 0;
  },

  setMusic(on) {
    this.music = !!on;
    if (this.musicGain) this.musicGain.gain.value = on ? 0.22 : 0;
  },

  intensity(level) {
    if (!this.filter || !this.ctx) return;
    const f = 420 + Math.min(6, level) * 140;
    this.filter.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.4);
  },

  tick() {
    if (!this.ctx || !this.music) return;
    const scale = [220, 261.63, 329.63, 392, 493.88, 523.25];
    while (this.nextNote < this.ctx.currentTime + 0.12) {
      const t = this.nextNote;
      const freq = scale[this.noteIndex % scale.length];
      this.noteIndex += 1;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g).connect(this.musicGain);
      o.start(t);
      o.stop(t + 0.45);
      this.nextNote += this.noteIndex % 8 === 0 ? 0.62 : 0.34;
    }
  },

  tone(freq, dur, type, gain, slide) {
    if (!this.ctx || !this.sfx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(40, freq), t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  noise(dur, gain, freq) {
    if (!this.ctx || !this.sfx) return;
    const t = this.ctx.currentTime;
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq || 1200;
    filter.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(this.sfxGain);
    src.start(t);
  },

  play(name) {
    if (!this.ctx) return;
    if (name === 'eat') {
      const now = performance.now();
      if (now - this.lastEat < 42) return;
      this.lastEat = now;
      this.tone(620 + Math.random() * 180, 0.09, 'sine', 0.07, 1040);
      return;
    }
    if (name === 'click') this.tone(540, 0.045, 'square', 0.035, 720);
    else if (name === 'kill') {
      this.noise(0.18, 0.18, 400);
      this.tone(180, 0.28, 'sawtooth', 0.08, 48);
    } else if (name === 'death') {
      this.noise(0.35, 0.22, 240);
      this.tone(320, 0.55, 'sawtooth', 0.1, 42);
    } else if (name === 'nova') {
      this.tone(196, 0.4, 'sawtooth', 0.08, 784);
      this.tone(294, 0.45, 'triangle', 0.06, 880);
      this.noise(0.3, 0.16, 1800);
    } else if (name === 'level') this.tone(440, 0.22, 'square', 0.06, 880);
    else if (name === 'shield') this.tone(880, 0.12, 'sine', 0.07, 1320);
    else if (name === 'boss') {
      this.tone(55, 0.6, 'sawtooth', 0.1, 40);
      this.noise(0.4, 0.16, 180);
    } else if (name === 'power') this.tone(760, 0.14, 'triangle', 0.07, 1280);
    else if (name === 'error') this.tone(140, 0.12, 'square', 0.05, 90);
  }
};
