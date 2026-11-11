/**
 * Effets spéciaux spectaculaires :
 * particules, beams, novae, cut-ins, projectiles, shockwaves,
 * screen shake, hitstop, slow-mo, after-images, cratères.
 */
const FX_PALETTES = {
  solar: ['#fde047', '#fb923c', '#fff7ed', '#facc15'],
  aurora: ['#a5b4fc', '#67e8f9', '#86efac', '#e9d5ff'],
  rock: ['#a8a29e', '#78716c', '#fbbf24', '#d6d3d1'],
  heal: ['#86efac', '#4ade80', '#bbf7d0', '#ecfccb'],
  quake: ['#f59e0b', '#a16207', '#fef3c7', '#78716c'],
  ember: ['#fb7185', '#fdba74', '#fecdd3', '#f97316'],
  spin: ['#fb7185', '#fde047', '#fdba74', '#ffffff'],
  feast: ['#fb923c', '#f472b6', '#fde047', '#86efac'],
  dive: ['#c4b5fd', '#f472b6', '#e9d5ff', '#ffffff'],
  spark: ['#67e8f9', '#facc15', '#e0f2fe', '#ffffff'],
  beam: ['#fef08a', '#38bdf8', '#ffffff', '#a5f3fc'],
  vine: ['#4ade80', '#a3e635', '#166534', '#bbf7d0'],
  leaf: ['#86efac', '#bef264', '#ecfccb', '#22c55e'],
  grove: ['#15803d', '#84cc16', '#fde047', '#4ade80'],
  bomb: ['#f9a8d4', '#f472b6', '#67e8f9', '#ffffff'],
  storm: ['#f9a8d4', '#a78bfa', '#67e8f9', '#fde047'],
  trail: ['#7dd3fc', '#fef08a', '#bae6fd', '#ffffff'],
  missile: ['#fdba74', '#facc15', '#fb923c', '#fff7ed'],
  spiral: ['#99f6e4', '#e9d5ff', '#67e8f9', '#ffffff'],
  metal: ['#94a3b8', '#f97316', '#e2e8f0', '#64748b'],
  shield: ['#38bdf8', '#e0f2fe', '#7dd3fc', '#ffffff'],
  meteor: ['#f97316', '#ef4444', '#fde047', '#1e293b'],
  warp: ['#e879f9', '#1e1b4b', '#c084fc', '#f5d0fe'],
  drain: ['#c084fc', '#7e22ce', '#f0abfc', '#581c87'],
  bloom: ['#e879f9', '#f472b6', '#1e1b4b', '#fae8ff'],
  hit: ['#ffffff', '#fde047', '#fb923c', '#67e8f9'],
  ko: ['#fef08a', '#fb7185', '#a5b4fc', '#ffffff'],
  ki: ['#38bdf8', '#fef08a', '#67e8f9', '#ffffff'],
  regen: ['#86efac', '#fef08a', '#bbf7d0', '#ffffff'],
  jump: ['#bae6fd', '#e0f2fe', '#ffffff', '#7dd3fc'],
  land: ['#cbd5e1', '#94a3b8', '#e2e8f0', '#64748b'],
  charge: ['#fef08a', '#38bdf8', '#ffffff', '#f472b6'],
  chrono: ['#67e8f9', '#e879f9', '#fef08a', '#c4b5fd'],
  tesseract: ['#22d3ee', '#a78bfa', '#f0abfc', '#ffffff']
};

function palette(name) {
  return FX_PALETTES[name] || FX_PALETTES.spark;
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

export class FXSystem {
  constructor() {
    this.particles = [];
    this.rings = [];
    this.beams = [];
    this.flashes = [];
    this.afterImages = [];
    this.floatTexts = [];
    this.auras = [];
    this.projectiles = [];
    this.shockwaves = [];
    this.cutIns = [];
    this.craters = [];
    this.orbitals = [];
    this.tesseracts = [];
    this.chronoSlices = [];
    this.shake = { x: 0, y: 0, mag: 0, time: 0 };
    this.hitstop = 0;
    this.slowMo = 0;
    this.flashAlpha = 0;
    this.flashColor = '#ffffff';
    this.vignette = 0;
    this.timeScale = 1;
    this.chronoWarp = 0;
  }

  reset() {
    this.particles.length = 0;
    this.rings.length = 0;
    this.beams.length = 0;
    this.flashes.length = 0;
    this.afterImages.length = 0;
    this.floatTexts.length = 0;
    this.auras.length = 0;
    this.projectiles.length = 0;
    this.shockwaves.length = 0;
    this.cutIns.length = 0;
    this.craters.length = 0;
    this.orbitals.length = 0;
    this.tesseracts.length = 0;
    this.chronoSlices.length = 0;
    this.shake = { x: 0, y: 0, mag: 0, time: 0 };
    this.hitstop = 0;
    this.slowMo = 0;
    this.flashAlpha = 0;
    this.vignette = 0;
    this.timeScale = 1;
    this.chronoWarp = 0;
  }

  screenShake(mag = 8, time = 0.25) {
    this.shake.mag = Math.max(this.shake.mag, mag);
    this.shake.time = Math.max(this.shake.time, time);
  }

  addHitstop(frames = 4) {
    this.hitstop = Math.max(this.hitstop, frames);
  }

  addSlowMo(duration = 0.45, scale = 0.35) {
    this.slowMo = Math.max(this.slowMo, duration);
    this.timeScale = Math.min(this.timeScale, scale);
  }

  addChronoWarp(amount = 0.55) {
    this.chronoWarp = Math.min(1.2, this.chronoWarp + amount);
  }

  /** Mini hypercube explosif (signature 4D) */
  tesseractBurst(x, y, opts = {}) {
    const colors = palette(opts.paletteName || 'tesseract');
    this.tesseracts.push({
      x,
      y,
      life: opts.life || 0.7,
      maxLife: opts.life || 0.7,
      size: opts.size || 28,
      spin: opts.spin || 4,
      color: colors[0],
      color2: colors[1] || '#e879f9'
    });
    this.burst(x, y, {
      count: opts.count || 22,
      speed: opts.speed || 240,
      paletteName: opts.paletteName || 'chrono',
      spark: true,
      gravity: 40,
      size: 5
    });
  }

  chronoSlice(x, y, opts = {}) {
    this.chronoSlices.push({
      x,
      y,
      w: opts.w || 90,
      h: opts.h || 8,
      life: opts.life || 0.4,
      maxLife: opts.life || 0.4,
      angle: opts.angle || rand(-0.4, 0.4),
      color: opts.color || '#67e8f9'
    });
  }

  burst(x, y, opts = {}) {
    const {
      count = 18,
      speed = 220,
      life = 0.55,
      size = 5,
      gravity = 180,
      paletteName = 'spark',
      spread = Math.PI * 2,
      angle = 0,
      spark = false
    } = opts;
    const colors = palette(paletteName);
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const sp = speed * rand(0.35, 1.15);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life,
        maxLife: life,
        size: size * rand(0.5, 1.4),
        color: colors[(Math.random() * colors.length) | 0],
        gravity,
        spark,
        rot: rand(0, Math.PI * 2),
        spin: rand(-8, 8)
      });
    }
  }

  ring(x, y, opts = {}) {
    const colors = palette(opts.paletteName || 'hit');
    this.rings.push({
      x,
      y,
      r: opts.r || 8,
      maxR: opts.maxR || 70,
      life: opts.life || 0.45,
      maxLife: opts.life || 0.45,
      width: opts.width || 4,
      color: opts.color || colors[0]
    });
  }

  beam(x, y, angle, opts = {}) {
    const colors = palette(opts.paletteName || 'beam');
    this.beams.push({
      x,
      y,
      angle,
      length: 0,
      maxLength: opts.length || 220,
      life: opts.life || 0.45,
      maxLife: opts.life || 0.45,
      width: opts.width || 18,
      color: colors[0],
      core: colors[2] || '#ffffff',
      pulse: !!opts.pulse
    });
  }

  shockwave(x, y, opts = {}) {
    this.shockwaves.push({
      x,
      y,
      r: 10,
      maxR: opts.maxR || 200,
      life: opts.life || 0.55,
      maxLife: opts.life || 0.55,
      color: opts.color || '#fef08a',
      width: opts.width || 10
    });
  }

  crater(x, y, opts = {}) {
    this.craters.push({
      x,
      y,
      r: opts.r || 28,
      life: opts.life || 1.2,
      maxLife: opts.life || 1.2,
      color: opts.color || 'rgba(15,23,42,0.55)'
    });
  }

  projectile(opts) {
    const colors = palette(opts.paletteName || 'missile');
    this.projectiles.push({
      x: opts.x,
      y: opts.y,
      vx: opts.vx,
      vy: opts.vy || 0,
      life: opts.life || 1.2,
      maxLife: opts.life || 1.2,
      radius: opts.radius || 10,
      color: colors[0],
      core: colors[2] || '#fff',
      trail: opts.paletteName || 'missile',
      ownerId: opts.ownerId,
      damage: opts.damage || 12,
      knock: opts.knock || 1.2,
      homing: opts.homing || 0,
      bounce: opts.bounce || 0,
      gravity: opts.gravity || 0
    });
  }

  orbital(x, y, opts = {}) {
    const colors = palette(opts.paletteName || 'aurora');
    for (let i = 0; i < (opts.count || 6); i++) {
      this.orbitals.push({
        cx: x,
        cy: y,
        angle: (Math.PI * 2 * i) / (opts.count || 6),
        radius: opts.radius || 40,
        speed: opts.speed || 6,
        life: opts.life || 0.8,
        maxLife: opts.life || 0.8,
        size: opts.size || 6,
        color: colors[i % colors.length]
      });
    }
  }

  cutIn(fighter, techName) {
    this.cutIns.push({
      name: fighter.name,
      tech: techName,
      colors: fighter.colors,
      life: 0.85,
      maxLife: 0.85
    });
    this.vignette = 0.7;
    this.addSlowMo(0.55, 0.25);
    this.flashAlpha = 0.4;
    this.flashColor = fighter.colors?.accent || '#fef08a';
  }

  floatText(x, y, text, color = '#fef08a') {
    this.floatTexts.push({
      x,
      y,
      text,
      color,
      life: 0.9,
      maxLife: 0.9,
      vy: -55
    });
  }

  afterImage(fighter) {
    this.afterImages.push({
      x: fighter.x,
      y: fighter.y,
      facing: fighter.facing,
      colors: fighter.colors,
      life: 0.28,
      maxLife: 0.28,
      radius: fighter.radius
    });
  }

  aura(fighterId, x, y, paletteName = 'ki', duration = 0.4) {
    this.auras.push({
      fighterId,
      x,
      y,
      life: duration,
      maxLife: duration,
      colors: palette(paletteName)
    });
  }

  /** Charge de ki avant ultra / spécial lourd */
  chargeUp(fighter, intensity = 1) {
    this.aura(fighter.id, fighter.x, fighter.y, 'charge', 0.5 * intensity);
    this.orbital(fighter.x, fighter.y - 10, {
      count: 8,
      radius: 36,
      life: 0.45,
      paletteName: 'charge',
      speed: 10
    });
    this.burst(fighter.x, fighter.y, {
      count: 20,
      speed: 60,
      paletteName: 'ki',
      gravity: -40,
      life: 0.5
    });
    this.ring(fighter.x, fighter.y, { maxR: 60, paletteName: 'ki', life: 0.35 });
    this.screenShake(4 * intensity, 0.2);
  }

  /** FX pack selon technique — version spectaculaire */
  castTechnique(tech, caster, targetsHit = []) {
    const fx = tech.fx || 'spark';
    const dir = caster.facing >= 0 ? 0 : Math.PI;
    const cx = caster.x + caster.facing * 20;
    const cy = caster.y - 10;
    const ultra = tech.kind === 'ultra';

    if (ultra) {
      this.cutIn(caster, tech.name);
      this.chargeUp(caster, 1.4);
      this.tesseractBurst(caster.x, caster.y - 20, { size: 42, life: 0.85 });
      this.addChronoWarp(0.7);
      this.chronoSlice(caster.x, caster.y - 10, { w: 160, h: 10, color: '#e879f9' });
      this.chronoSlice(caster.x, caster.y + 12, { w: 120, h: 6, color: '#67e8f9', angle: 0.2 });
    }

    switch (fx) {
      case 'beam':
        this.beam(cx, cy, dir, {
          length: tech.range + 80,
          width: ultra ? 36 : 22,
          paletteName: 'beam',
          life: ultra ? 0.7 : 0.4,
          pulse: true
        });
        this.beam(cx, cy - 8, dir, {
          length: tech.range + 40,
          width: ultra ? 14 : 8,
          paletteName: 'solar',
          life: ultra ? 0.55 : 0.3
        });
        this.burst(cx, cy, { count: 36, speed: 320, paletteName: 'beam', spread: 0.7, angle: dir, spark: true });
        this.shockwave(cx + caster.facing * 40, cy, { maxR: 120, color: '#67e8f9' });
        this.screenShake(ultra ? 16 : 10, 0.35);
        this.flashAlpha = ultra ? 0.5 : 0.3;
        this.flashColor = '#e0f2fe';
        if (ultra) this.addHitstop(10);
        break;

      case 'aurora':
      case 'spiral':
      case 'bloom':
      case 'grove':
      case 'feast':
      case 'storm':
        this.shockwave(caster.x, caster.y - 20, { maxR: tech.range + 40, color: palette(fx)[0], width: 12 });
        this.ring(caster.x, caster.y - 20, { maxR: tech.range, paletteName: fx, width: 7, life: 0.6 });
        this.ring(caster.x, caster.y - 20, { maxR: tech.range * 0.55, paletteName: fx, width: 3, life: 0.4 });
        this.orbital(caster.x, caster.y - 20, { count: 10, radius: 50, life: 0.7, paletteName: fx, speed: 8 });
        this.burst(caster.x, caster.y - 20, {
          count: ultra ? 64 : 42,
          speed: 360,
          paletteName: fx,
          gravity: 30,
          size: 8,
          spark: true
        });
        // Projectiles satellites pour storm / feast
        if (fx === 'storm' || fx === 'feast' || fx === 'spiral') {
          for (let i = 0; i < (ultra ? 7 : 4); i++) {
            const a = dir + (i - 2) * 0.22;
            this.projectile({
              x: cx,
              y: cy,
              vx: Math.cos(a) * (380 + i * 20) * (caster.facing >= 0 ? 1 : -1),
              vy: Math.sin(a) * 80 - 40,
              paletteName: fx,
              life: 0.9,
              ownerId: caster.id,
              damage: ultra ? 16 : 10,
              knock: 1.3,
              radius: ultra ? 12 : 8
            });
          }
        }
        this.screenShake(ultra ? 18 : 12, 0.45);
        this.addHitstop(ultra ? 9 : 5);
        this.flashAlpha = ultra ? 0.55 : 0.35;
        this.flashColor = palette(fx)[0];
        break;

      case 'quake':
      case 'meteor':
        this.crater(caster.x, caster.y + 24, { r: ultra ? 56 : 36, life: 1.4 });
        this.shockwave(caster.x, caster.y + 24, { maxR: ultra ? 260 : 160, color: '#fb923c', width: 14 });
        this.burst(caster.x, caster.y + 20, {
          count: ultra ? 50 : 36,
          speed: 300,
          paletteName: fx,
          angle: -Math.PI / 2,
          spread: Math.PI,
          gravity: 320,
          size: 9,
          spark: true
        });
        if (fx === 'meteor') {
          for (let i = 0; i < 5; i++) {
            this.projectile({
              x: caster.x + rand(-80, 80),
              y: caster.y - 220 - i * 30,
              vx: rand(-40, 40),
              vy: 520,
              paletteName: 'meteor',
              life: 1.0,
              ownerId: caster.id,
              damage: 14,
              knock: 1.6,
              gravity: 200,
              radius: 14
            });
          }
        }
        this.screenShake(ultra ? 22 : 14, 0.5);
        this.addHitstop(ultra ? 11 : 7);
        break;

      case 'heal':
      case 'regen':
      case 'shield':
        this.aura(caster.id, caster.x, caster.y, fx === 'shield' ? 'shield' : 'heal', 0.85);
        this.orbital(caster.x, caster.y, {
          count: 6,
          radius: 42,
          life: 0.7,
          paletteName: fx === 'shield' ? 'shield' : 'heal'
        });
        this.burst(caster.x, caster.y - 30, {
          count: 28,
          speed: 100,
          paletteName: fx === 'shield' ? 'shield' : 'heal',
          gravity: -70,
          size: 6
        });
        this.floatText(caster.x, caster.y - 50, tech.heal ? `+${tech.heal}` : 'GUARD', '#86efac');
        break;

      case 'warp':
        this.burst(caster.x, caster.y, { count: 28, speed: 220, paletteName: 'warp', size: 6, spark: true });
        this.ring(caster.x, caster.y, { maxR: 70, paletteName: 'warp', life: 0.3 });
        this.shockwave(caster.x, caster.y, { maxR: 90, color: '#e879f9' });
        this.tesseractBurst(caster.x, caster.y, { size: 36, paletteName: 'warp' });
        this.addChronoWarp(0.55);
        for (let i = 0; i < 3; i++) {
          this.chronoSlice(caster.x + rand(-20, 20), caster.y + rand(-24, 24), {
            w: 70 + i * 20,
            color: palette('warp')[i % 3]
          });
        }
        for (let i = 0; i < 6; i++) this.afterImage(caster);
        break;

      case 'drain':
        targetsHit.forEach((t) => {
          this.beam(t.x, t.y - 10, Math.atan2(caster.y - t.y, caster.x - t.x), {
            length: Math.hypot(caster.x - t.x, caster.y - t.y),
            width: 12,
            paletteName: 'drain',
            life: 0.4,
            pulse: true
          });
          this.burst(t.x, t.y, { count: 14, speed: 120, paletteName: 'drain' });
        });
        this.burst(cx, cy, { count: 20, speed: 160, paletteName: 'drain' });
        break;

      case 'vine':
      case 'leaf':
        this.burst(cx, cy, { count: 34, speed: 220, paletteName: fx, gravity: 90, life: 0.75 });
        this.ring(cx, cy, { maxR: tech.range * 0.55, paletteName: fx });
        this.orbital(cx, cy, { count: 5, radius: 30, paletteName: fx, life: 0.5 });
        break;

      case 'bomb':
      case 'missile':
        for (let i = 0; i < (ultra ? 5 : 2); i++) {
          this.projectile({
            x: cx,
            y: cy - i * 6,
            vx: caster.facing * (420 + i * 40),
            vy: -60 - i * 30,
            paletteName: fx,
            life: 1.1,
            ownerId: caster.id,
            damage: ultra ? 18 : 12,
            knock: 1.4,
            bounce: fx === 'bomb' ? 2 : 0,
            gravity: fx === 'bomb' ? 420 : 180,
            radius: fx === 'bomb' ? 14 : 9,
            homing: fx === 'missile' ? 0.8 : 0
          });
        }
        this.burst(cx, cy, { count: 16, speed: 180, paletteName: fx, spread: 0.9, angle: dir });
        break;

      case 'dive':
      case 'trail':
      case 'spin':
      case 'ember':
      case 'metal':
      case 'rock':
      case 'solar':
      case 'spark':
      default:
        this.burst(cx, cy, {
          count: ultra ? 40 : 28,
          speed: 280,
          paletteName: fx,
          spread: 1.5,
          angle: dir,
          spark: true,
          size: ultra ? 8 : 5
        });
        this.ring(cx, cy, { maxR: ultra ? 90 : 55, paletteName: fx, life: 0.35 });
        this.shockwave(cx, cy, { maxR: ultra ? 140 : 70, color: palette(fx)[0], width: 6 });
        for (let i = 0; i < (ultra ? 5 : 2); i++) this.afterImage(caster);
        this.screenShake(ultra ? 12 : 6, ultra ? 0.3 : 0.18);
        if (ultra) this.addHitstop(7);
        break;
    }

    if (ultra) {
      this.floatText(caster.x, caster.y - 80, tech.name.toUpperCase(), '#fef08a');
      targetsHit.forEach((t) => {
        this.burst(t.x, t.y, { count: 24, speed: 260, paletteName: 'hit', spark: true, size: 7 });
        this.shockwave(t.x, t.y, { maxR: 100, color: '#fb7185' });
      });
    }
  }

  onHit(x, y, damage, heavy = false) {
    this.burst(x, y, {
      count: heavy ? 32 : 14,
      speed: heavy ? 320 : 180,
      paletteName: 'hit',
      spark: true,
      size: heavy ? 7 : 4,
      gravity: 120
    });
    this.ring(x, y, { maxR: heavy ? 90 : 40, paletteName: 'hit', width: heavy ? 5 : 3 });
    if (heavy) {
      this.shockwave(x, y, { maxR: 110, color: '#fde047', width: 8 });
      this.tesseractBurst(x, y, { size: 22, life: 0.4, count: 12 });
      this.chronoSlice(x, y, { w: 70, color: '#fef08a' });
      this.addChronoWarp(0.2);
    }
    this.floatText(x, y - 20, `${Math.round(damage)}%`, heavy ? '#fb7185' : '#fef08a');
    this.screenShake(heavy ? 14 : 5, heavy ? 0.3 : 0.12);
    this.addHitstop(heavy ? 7 : 3);
    if (heavy) {
      this.flashAlpha = 0.28;
      this.flashColor = '#ffffff';
    }
  }

  onKO(x, y) {
    this.burst(x, y, { count: 60, speed: 400, paletteName: 'ko', gravity: 50, life: 1.0, size: 9, spark: true });
    this.shockwave(x, y, { maxR: 220, color: '#fb7185', width: 16 });
    this.ring(x, y, { maxR: 160, paletteName: 'ko', width: 8, life: 0.65 });
    this.ring(x, y, { maxR: 100, paletteName: 'aurora', width: 4, life: 0.45 });
    this.tesseractBurst(x, y, { size: 56, life: 1.0, count: 36, speed: 320 });
    this.addChronoWarp(1.0);
    for (let i = 0; i < 5; i++) {
      this.chronoSlice(x, y - 40 + i * 18, {
        w: 100 + i * 20,
        color: palette('chrono')[i % 4],
        angle: (i - 2) * 0.12
      });
    }
    this.screenShake(24, 0.6);
    this.addHitstop(12);
    this.addSlowMo(0.6, 0.3);
    this.flashAlpha = 0.6;
    this.flashColor = '#fef08a';
    this.floatText(x, y - 40, 'KO 4D!', '#fb7185');
  }

  onKiRegen(fighter) {
    this.burst(fighter.x, fighter.y - 20, {
      count: 20,
      speed: 80,
      paletteName: 'regen',
      gravity: -90,
      life: 0.75
    });
    this.aura(fighter.id, fighter.x, fighter.y, 'regen', 0.6);
    this.orbital(fighter.x, fighter.y, { count: 5, radius: 34, paletteName: 'regen', life: 0.55 });
    this.floatText(fighter.x, fighter.y - 45, 'REGEN', '#86efac');
  }

  onJump(x, y) {
    this.burst(x, y + 18, {
      count: 8,
      speed: 90,
      paletteName: 'jump',
      angle: Math.PI / 2,
      spread: 1.2,
      gravity: 40,
      life: 0.3
    });
  }

  onLand(x, y) {
    this.burst(x, y + 20, {
      count: 10,
      speed: 120,
      paletteName: 'land',
      angle: -Math.PI / 2,
      spread: Math.PI,
      gravity: 200,
      life: 0.28
    });
  }

  /**
   * @returns {{ frozen: boolean, dtScale: number }}
   */
  update(dt) {
    if (this.hitstop > 0) {
      this.hitstop -= 1;
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.5);
      // Cut-ins still animate during hitstop
      for (let i = this.cutIns.length - 1; i >= 0; i--) {
        this.cutIns[i].life -= dt;
        if (this.cutIns[i].life <= 0) this.cutIns.splice(i, 1);
      }
      return { frozen: true, dtScale: 0 };
    }

    let dtScale = 1;
    if (this.slowMo > 0) {
      this.slowMo -= dt;
      dtScale = this.timeScale;
      if (this.slowMo <= 0) this.timeScale = 1;
    }
    const sdt = dt * dtScale;

    if (this.shake.time > 0) {
      this.shake.time -= sdt;
      const m = this.shake.mag * (this.shake.time > 0 ? 1 : 0);
      this.shake.x = (Math.random() - 0.5) * 2 * m;
      this.shake.y = (Math.random() - 0.5) * 2 * m;
      this.shake.mag *= 0.9;
    } else {
      this.shake.x = 0;
      this.shake.y = 0;
    }

    this.flashAlpha = Math.max(0, this.flashAlpha - sdt * 2.2);
    this.vignette = Math.max(0, this.vignette - sdt * 1.2);
    this.chronoWarp = Math.max(0, this.chronoWarp - sdt * 1.35);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= sdt;
      p.vy += p.gravity * sdt;
      p.x += p.vx * sdt;
      p.y += p.vy * sdt;
      p.rot += p.spin * sdt;
      p.vx *= 0.98;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= sdt;
      const t = 1 - r.life / r.maxLife;
      r.r = r.maxR * t;
      if (r.life <= 0) this.rings.splice(i, 1);
    }

    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life -= sdt;
      const t = 1 - b.life / b.maxLife;
      b.length = b.maxLength * Math.min(1, t * 2.4);
      if (b.life <= 0) this.beams.splice(i, 1);
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life -= sdt;
      const t = 1 - s.life / s.maxLife;
      s.r = s.maxR * t;
      if (s.life <= 0) this.shockwaves.splice(i, 1);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= sdt;
      p.vy += (p.gravity || 0) * sdt;
      p.x += p.vx * sdt;
      p.y += p.vy * sdt;
      // Trail sparks
      if (Math.random() < 0.7) {
        this.burst(p.x, p.y, {
          count: 2,
          speed: 40,
          paletteName: p.trail,
          life: 0.25,
          size: 3,
          gravity: 0
        });
      }
      if (p.bounce > 0 && p.y > 500) {
        p.y = 500;
        p.vy *= -0.7;
        p.bounce -= 1;
        this.burst(p.x, p.y, { count: 10, speed: 140, paletteName: p.trail, spark: true });
      }
      if (p.life <= 0 || p.x < -100 || p.x > 1400 || p.y > 900) {
        this.burst(p.x, p.y, { count: 16, speed: 180, paletteName: p.trail, spark: true });
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.orbitals.length - 1; i >= 0; i--) {
      const o = this.orbitals[i];
      o.life -= sdt;
      o.angle += o.speed * sdt;
      if (o.life <= 0) this.orbitals.splice(i, 1);
    }

    for (let i = this.tesseracts.length - 1; i >= 0; i--) {
      const te = this.tesseracts[i];
      te.life -= sdt;
      te.size *= 1 + sdt * 1.8;
      if (te.life <= 0) this.tesseracts.splice(i, 1);
    }

    for (let i = this.chronoSlices.length - 1; i >= 0; i--) {
      this.chronoSlices[i].life -= sdt;
      if (this.chronoSlices[i].life <= 0) this.chronoSlices.splice(i, 1);
    }

    for (let i = this.craters.length - 1; i >= 0; i--) {
      this.craters[i].life -= sdt;
      if (this.craters[i].life <= 0) this.craters.splice(i, 1);
    }

    for (let i = this.afterImages.length - 1; i >= 0; i--) {
      this.afterImages[i].life -= sdt;
      if (this.afterImages[i].life <= 0) this.afterImages.splice(i, 1);
    }

    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const f = this.floatTexts[i];
      f.life -= sdt;
      f.y += f.vy * sdt;
      if (f.life <= 0) this.floatTexts.splice(i, 1);
    }

    for (let i = this.auras.length - 1; i >= 0; i--) {
      this.auras[i].life -= sdt;
      if (this.auras[i].life <= 0) this.auras.splice(i, 1);
    }

    for (let i = this.cutIns.length - 1; i >= 0; i--) {
      this.cutIns[i].life -= sdt;
      if (this.cutIns[i].life <= 0) this.cutIns.splice(i, 1);
    }

    return { frozen: false, dtScale };
  }

  /** Resolve projectile hits against fighters; returns hit events */
  collideProjectiles(fighters, onHit) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      for (const f of fighters) {
        if (!f.alive || f.id === p.ownerId) continue;
        // team check left to caller via onHit return
        const d = Math.hypot(f.x - p.x, f.y - p.y);
        if (d < f.radius + p.radius) {
          const consumed = onHit(p, f);
          if (consumed !== false) {
            this.burst(p.x, p.y, { count: 22, speed: 240, paletteName: p.trail, spark: true, size: 6 });
            this.ring(p.x, p.y, { maxR: 50, paletteName: p.trail });
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  draw(ctx) {
    // Craters under fighters
    for (const c of this.craters) {
      const a = c.life / c.maxLife;
      ctx.save();
      ctx.globalAlpha = 0.45 * a;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.r, c.r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const a of this.afterImages) {
      const alpha = a.life / a.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha * 0.45;
      ctx.translate(a.x, a.y);
      ctx.scale(a.facing || 1, 1);
      ctx.fillStyle = a.colors?.accent || '#7dd3fc';
      ctx.beginPath();
      ctx.ellipse(0, 0, a.radius * 0.9, a.radius * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const te of this.tesseracts) {
      const alpha = Math.max(0, te.life / te.maxLife);
      const s = te.size;
      const rot = (1 - alpha) * te.spin;
      ctx.save();
      ctx.translate(te.x, te.y);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = te.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = te.color2;
      ctx.shadowBlur = 14;
      // Outer square
      ctx.strokeRect(-s * 0.5, -s * 0.5, s, s);
      // Inner rotated square (4D projection feel)
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = te.color2;
      ctx.strokeRect(-s * 0.32, -s * 0.32, s * 0.64, s * 0.64);
      ctx.rotate(-Math.PI / 4);
      // Connecting corners
      ctx.beginPath();
      const inset = s * 0.18;
      const corners = [
        [-s * 0.5, -s * 0.5],
        [s * 0.5, -s * 0.5],
        [s * 0.5, s * 0.5],
        [-s * 0.5, s * 0.5]
      ];
      const inner = corners.map(([x, y]) => [x * 0.45, y * 0.45]);
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(corners[i][0], corners[i][1]);
        ctx.lineTo(inner[i][0], inner[i][1]);
      }
      ctx.stroke();
      void inset;
      ctx.restore();
    }

    for (const sl of this.chronoSlices) {
      const alpha = Math.max(0, sl.life / sl.maxLife);
      ctx.save();
      ctx.translate(sl.x, sl.y);
      ctx.rotate(sl.angle);
      ctx.globalAlpha = alpha * 0.85;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(-sl.w / 2, 0, sl.w / 2, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, sl.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-sl.w / 2, -sl.h / 2, sl.w, sl.h);
      ctx.restore();
    }

    for (const b of this.beams) {
      const alpha = Math.max(0, b.life / b.maxLife);
      const pulse = b.pulse ? 1 + Math.sin(Date.now() / 40) * 0.12 : 1;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 24;
      const grd = ctx.createLinearGradient(0, 0, b.length, 0);
      grd.addColorStop(0, b.core);
      grd.addColorStop(0.25, b.color);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = grd;
      ctx.fillRect(0, (-b.width / 2) * pulse, b.length, b.width * pulse);
      ctx.globalAlpha = alpha * 0.95;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -b.width * 0.18 * pulse, b.length * 0.96, b.width * 0.36 * pulse);
      ctx.restore();
    }

    for (const s of this.shockwaves) {
      const alpha = s.life / s.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * alpha;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(1, s.r), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const r of this.rings) {
      const alpha = r.life / r.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * alpha;
      ctx.beginPath();
      ctx.arc(r.x, r.y, Math.max(1, r.r), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.core;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const o of this.orbitals) {
      const alpha = o.life / o.maxLife;
      const x = o.cx + Math.cos(o.angle) * o.radius;
      const y = o.cy + Math.sin(o.angle) * o.radius * 0.7;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = o.color;
      ctx.shadowColor = o.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, o.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const a of this.auras) {
      const t = a.life / a.maxLife;
      ctx.save();
      ctx.globalAlpha = 0.4 * t;
      const grd = ctx.createRadialGradient(a.x, a.y, 4, a.x, a.y, 56);
      grd.addColorStop(0, a.colors[0]);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 56 + (1 - t) * 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.spark) {
        ctx.fillRect(-p.size * 0.3, -p.size, p.size * 0.6, p.size * 2);
        ctx.fillRect(-p.size, -p.size * 0.3, p.size * 2, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const f of this.floatTexts) {
      const alpha = Math.max(0, f.life / f.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(10,20,40,0.8)';
      ctx.lineWidth = 4;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }

    if (this.vignette > 0) {
      ctx.save();
      ctx.globalAlpha = this.vignette * 0.65;
      const g = ctx.createRadialGradient(640, 360, 200, 640, 360, 520);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, '#000');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.restore();
    }

    // Cut-in banner (anime style)
    for (const c of this.cutIns) {
      const t = 1 - c.life / c.maxLife;
      const slide = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, slide);
      ctx.fillStyle = 'rgba(8,12,24,0.82)';
      ctx.fillRect(0, 250, 1280, 160);
      ctx.fillStyle = c.colors?.accent || '#fde047';
      ctx.fillRect(0, 250, 1280, 8);
      ctx.fillRect(0, 402, 1280, 8);
      ctx.fillStyle = c.colors?.body || '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(180, 330, 48, 56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 42px "Exo 2", "Trebuchet MS", sans-serif';
      ctx.fillText(c.name, 260, 320);
      ctx.fillStyle = '#fde047';
      ctx.font = '800 28px "Exo 2", "Trebuchet MS", sans-serif';
      ctx.fillText(c.tech.toUpperCase(), 260, 365);
      // Speed lines
      ctx.strokeStyle = 'rgba(253,224,71,0.35)';
      for (let i = 0; i < 12; i++) {
        const y = 260 + i * 12;
        ctx.beginPath();
        ctx.moveTo(700 + (i % 3) * 30, y);
        ctx.lineTo(1260, y + 4);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(-2000, -2000, 6000, 6000);
      ctx.restore();
    }
  }
}
