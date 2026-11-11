import { drawCharacterSprite } from './sprites.js';

/** Projection d’un hypercube 4D → 2D (rotation dans le plan XW / YZ) */
function projectTesseract(t, cx, cy, size) {
  const verts4 = [];
  for (let i = 0; i < 16; i++) {
    verts4.push([
      (i & 1 ? 1 : -1),
      (i & 2 ? 1 : -1),
      (i & 4 ? 1 : -1),
      (i & 8 ? 1 : -1)
    ]);
  }
  const a = t * 0.55;
  const b = t * 0.37;
  const cosA = Math.cos(a);
  const sinA = Math.sin(a);
  const cosB = Math.cos(b);
  const sinB = Math.sin(b);
  const points = verts4.map(([x, y, z, w]) => {
    // rotate XW
    const x1 = x * cosA - w * sinA;
    const w1 = x * sinA + w * cosA;
    // rotate YZ
    const y1 = y * cosB - z * sinB;
    const z1 = y * sinB + z * cosB;
    const persp = 2.2 / (3.2 + w1);
    return {
      x: cx + x1 * size * persp,
      y: cy + y1 * size * persp,
      z: z1,
      w: w1
    };
  });
  const edges = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      let diff = 0;
      for (let bit = 0; bit < 4; bit++) {
        if (((i >> bit) & 1) !== ((j >> bit) & 1)) diff++;
      }
      if (diff === 1) edges.push([i, j]);
    }
  }
  return { points, edges };
}

/** Rendu canvas arène 4D + fighters + FX */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = canvas.width;
    this.h = canvas.height;
    this.depthLayers = [
      Array.from({ length: 40 }, () => ({
        x: Math.random() * 1280,
        y: Math.random() * 420,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random(),
        z: 0.25 + Math.random() * 0.25,
        drift: 8 + Math.random() * 14
      })),
      Array.from({ length: 50 }, () => ({
        x: Math.random() * 1280,
        y: Math.random() * 480,
        r: Math.random() * 1.8 + 0.4,
        a: Math.random(),
        z: 0.55 + Math.random() * 0.3,
        drift: 18 + Math.random() * 28
      })),
      Array.from({ length: 28 }, () => ({
        x: Math.random() * 1280,
        y: Math.random() * 520,
        r: Math.random() * 2.4 + 0.6,
        a: Math.random(),
        z: 0.9 + Math.random() * 0.35,
        drift: 36 + Math.random() * 40
      }))
    ];
    this.rifts = [
      { x: 160, y: 180, rx: 34, ry: 70, phase: 0, hue: 190 },
      { x: 1120, y: 210, rx: 40, ry: 78, phase: 1.7, hue: 300 },
      { x: 640, y: 120, rx: 48, ry: 36, phase: 3.2, hue: 250 }
    ];
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    this.canvas.style.width = `${1280 * scale}px`;
    this.canvas.style.height = `${720 * scale}px`;
  }

  drawPerspectiveGrid(stage, t) {
    const ctx = this.ctx;
    const horizon = stage.vanishingY || 220;
    const floorY = (stage.ground?.y || 520) + 8;
    const vpX = 640 + Math.sin(t * 0.15) * 18;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizon, 1280, 720 - horizon);
    ctx.clip();

    // Floor wash
    const floor = ctx.createLinearGradient(0, horizon, 0, 720);
    floor.addColorStop(0, 'rgba(8,12,28,0)');
    floor.addColorStop(0.25, 'rgba(30,58,110,0.28)');
    floor.addColorStop(1, 'rgba(8,16,40,0.72)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon, 1280, 720 - horizon);

    ctx.strokeStyle = stage.accent || '#67e8f9';
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1;
    const rows = 14;
    for (let i = 0; i <= rows; i++) {
      const p = i / rows;
      const y = horizon + Math.pow(p, 1.55) * (floorY + 80 - horizon);
      const alpha = 0.08 + p * 0.28;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1280, y);
      ctx.stroke();
    }
    const cols = 18;
    for (let i = 0; i <= cols; i++) {
      const x = (i / cols) * 1280;
      ctx.globalAlpha = 0.12 + (i % 3 === 0 ? 0.1 : 0);
      ctx.beginPath();
      ctx.moveTo(vpX, horizon);
      ctx.lineTo(x, 720);
      ctx.stroke();
    }

    // Neon runway under main ground
    if (stage.ground) {
      const g = stage.ground;
      ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.08;
      const neon = ctx.createLinearGradient(g.x, g.y, g.x + g.w, g.y);
      neon.addColorStop(0, 'rgba(0,0,0,0)');
      neon.addColorStop(0.2, stage.accent2 || '#e879f9');
      neon.addColorStop(0.5, stage.accent || '#67e8f9');
      neon.addColorStop(0.8, stage.accent2 || '#e879f9');
      neon.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = neon;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.x + 20, g.y + g.h + 6);
      ctx.lineTo(g.x + g.w - 20, g.y + g.h + 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTesseract(stage, t) {
    const ctx = this.ctx;
    const { points, edges } = projectTesseract(t, 640, 200, 110);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.6;
    for (const [i, j] of edges) {
      const a = points[i];
      const b = points[j];
      const depth = ((a.w + b.w) * 0.5 + 2) / 4;
      const grd = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grd.addColorStop(0, stage.accent || '#67e8f9');
      grd.addColorStop(1, stage.accent2 || '#e879f9');
      ctx.strokeStyle = grd;
      ctx.globalAlpha = 0.25 + depth * 0.45;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const p of points) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = p.w > 0 ? (stage.accent || '#67e8f9') : (stage.accent2 || '#e879f9');
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.4 + Math.max(0, p.w) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawRifts(stage, t) {
    const ctx = this.ctx;
    for (const rift of this.rifts) {
      const pulse = 1 + Math.sin(t * 2.4 + rift.phase) * 0.12;
      ctx.save();
      ctx.translate(rift.x, rift.y + Math.sin(t + rift.phase) * 6);
      ctx.rotate(Math.sin(t * 0.4 + rift.phase) * 0.15);
      const rx = rift.rx * pulse;
      const ry = rift.ry * pulse;
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.max(rx, ry));
      g.addColorStop(0, `hsla(${rift.hue}, 90%, 75%, 0.55)`);
      g.addColorStop(0.45, `hsla(${rift.hue + 40}, 80%, 55%, 0.22)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `hsla(${rift.hue}, 90%, 70%, 0.75)`;
      ctx.lineWidth = 2;
      ctx.shadowColor = `hsla(${rift.hue}, 90%, 60%, 0.8)`;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Inner chrono slices
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.45;
      for (let i = 0; i < 5; i++) {
        const yy = -ry * 0.7 + (i / 4) * ry * 1.4;
        ctx.strokeStyle = i % 2 ? (stage.accent || '#67e8f9') : (stage.accent2 || '#e879f9');
        ctx.beginPath();
        ctx.ellipse(0, yy * 0.15, rx * (0.55 + i * 0.06), 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawBackground(stage, t) {
    const ctx = this.ctx;
    const sky = stage.sky;
    const grd = ctx.createLinearGradient(0, 0, 0, 720);
    grd.addColorStop(0, sky[0]);
    grd.addColorStop(0.5, sky[1]);
    grd.addColorStop(1, sky[2]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 1280, 720);

    // Far nebula volumes
    ctx.save();
    ctx.globalAlpha = 0.32;
    const neb = ctx.createRadialGradient(980, 140, 10, 980, 140, 340);
    neb.addColorStop(0, stage.accent2 || '#e879f9');
    neb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, 1280, 500);
    const neb2 = ctx.createRadialGradient(220, 380, 10, 220, 380, 280);
    neb2.addColorStop(0, stage.accent || 'rgba(56,189,248,0.4)');
    neb2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb2;
    ctx.fillRect(0, 160, 620, 420);
    ctx.restore();

    // Parallax starfields (depth = 4th spatial feel)
    for (const layer of this.depthLayers) {
      for (const s of layer) {
        const x = (s.x + t * s.drift) % 1280;
        const twinkle = 0.35 + Math.sin(t * (1.5 + s.z) + s.a * 10) * 0.3;
        ctx.globalAlpha = twinkle * (0.35 + s.z * 0.45);
        ctx.fillStyle = s.z > 0.8 ? '#fef9c3' : '#e0f2fe';
        ctx.beginPath();
        ctx.arc(x, s.y, s.r * s.z, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    this.drawPerspectiveGrid(stage, t);
    this.drawTesseract(stage, t);
    this.drawRifts(stage, t);

    // Soft distant mountains / dimensional silhouettes
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#070b18';
    ctx.beginPath();
    ctx.moveTo(0, 460);
    ctx.lineTo(140, 390);
    ctx.lineTo(280, 440);
    ctx.lineTo(420, 350);
    ctx.lineTo(580, 420);
    ctx.lineTo(760, 330);
    ctx.lineTo(940, 410);
    ctx.lineTo(1120, 340);
    ctx.lineTo(1280, 390);
    ctx.lineTo(1280, 520);
    ctx.lineTo(0, 520);
    ctx.fill();
    ctx.restore();
  }

  drawPlatform3D(p, top, bot, accent, t) {
    const ctx = this.ctx;
    const depth = Math.max(10, Math.min(22, p.h + 8));
    ctx.save();
    // Side extrusion
    ctx.fillStyle = bot;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + p.h);
    ctx.lineTo(p.x + depth * 0.55, p.y + p.h + depth);
    ctx.lineTo(p.x + p.w + depth * 0.55, p.y + p.h + depth);
    ctx.lineTo(p.x + p.w, p.y + p.h);
    ctx.closePath();
    ctx.fill();
    // Right face
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = accent || bot;
    ctx.beginPath();
    ctx.moveTo(p.x + p.w, p.y);
    ctx.lineTo(p.x + p.w + depth * 0.55, p.y + depth * 0.45);
    ctx.lineTo(p.x + p.w + depth * 0.55, p.y + p.h + depth);
    ctx.lineTo(p.x + p.w, p.y + p.h);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    g.addColorStop(0, top);
    g.addColorStop(1, bot);
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(15,23,42,0.65)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 7);
    ctx.fill();
    ctx.stroke();

    // Edge glow (chrono rim)
    ctx.shadowColor = accent || top;
    ctx.shadowBlur = 12 + Math.sin(t * 4 + p.x * 0.01) * 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Top highlight strip
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(p.x + 8, p.y + 2, p.w - 16, 3);
    ctx.restore();
  }

  drawStage(stage, t) {
    const top = stage.platformTop || '#fef3c7';
    const bot = stage.platformBot || '#f59e0b';
    const accent = stage.accent || '#67e8f9';
    const plats = [stage.ground, ...stage.platforms];
    for (const p of plats) this.drawPlatform3D(p, top, bot, accent, t);
  }

  drawFighterShadow(f, groundY) {
    const ctx = this.ctx;
    const dy = Math.max(0, groundY - f.y);
    const scale = Math.max(0.35, 1 - dy / 420);
    ctx.save();
    ctx.globalAlpha = 0.28 * scale;
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.ellipse(f.x, groundY + 18, 26 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawChronoTrail(f, t) {
    if (!(f.action === 'attack' || f.action === 'special' || f.action === 'ultra' || Math.abs(f.vx) > 220)) {
      return;
    }
    const ctx = this.ctx;
    const slices = 4;
    for (let i = slices; i >= 1; i--) {
      const o = i * 7 * (f.facing || 1);
      ctx.save();
      ctx.globalAlpha = 0.12 * (1 - i / (slices + 1));
      ctx.translate(f.x - o, f.y);
      // RGB time-slice split
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = i % 2 ? 'rgba(103,232,249,0.55)' : 'rgba(232,121,249,0.5)';
      ctx.beginPath();
      ctx.ellipse(-2, 0, 16, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(254,240,138,0.35)';
      ctx.beginPath();
      ctx.ellipse(2, 0, 14, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawFighter(f, t, groundY = 530) {
    if (!f.alive && f.stocks > 0) return;
    if (f.stocks <= 0) return;
    const ctx = this.ctx;
    this.drawFighterShadow(f, groundY);
    this.drawChronoTrail(f, t);

    ctx.save();
    ctx.translate(f.x, f.y);
    if (f.invuln > 0 && Math.floor(t * 20) % 2 === 0) ctx.globalAlpha = 0.45;

    // Shield bubble
    if (f.shieldTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Ki aura when high ki or charging ultra
    if (f.ki > 70 || f.action === 'charge' || f.action === 'ultra') {
      const boost = f.action === 'charge' || f.action === 'ultra' ? 1.6 : 1;
      const pulse = (28 + Math.sin(t * 14) * 6) * boost;
      const aura = ctx.createRadialGradient(0, 0, 8, 0, 0, pulse);
      aura.addColorStop(0, f.action === 'ultra' ? 'rgba(251,113,133,0.55)' : 'rgba(254,240,138,0.5)');
      aura.addColorStop(0.5, 'rgba(56,189,248,0.25)');
      aura.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Charge lightning arcs
    if (f.action === 'charge') {
      ctx.save();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < 5; i++) {
        const a = t * 12 + i * 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
        ctx.lineTo(Math.cos(a + 0.4) * 40, Math.sin(a + 0.5) * 40);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.scale(f.facing || 1, 1);
    drawCharacterSprite(ctx, f.characterId || 'lumo', f.colors, t, f.action || 'idle');

    // Action pose slash overlay
    if (f.action === 'attack' || f.action === 'special' || f.action === 'ultra') {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = f.action === 'ultra' ? '#fef08a' : '#ffffff';
      ctx.shadowColor = f.action === 'ultra' ? '#fb7185' : '#7dd3fc';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(22, -14);
      ctx.lineTo(f.action === 'ultra' ? 58 : 42, 0);
      ctx.lineTo(22, 14);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // Name plate
    ctx.save();
    ctx.font = '800 13px "Exo 2", "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(7,17,31,0.75)';
    ctx.strokeText(f.name, f.x, f.y - 48);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(f.name, f.x, f.y - 48);
    ctx.fillStyle = f.percent > 100 ? '#fb7185' : '#fde047';
    ctx.font = '800 18px "Exo 2", "Trebuchet MS", sans-serif';
    ctx.strokeText(`${f.percent.toFixed(0)}%`, f.x, f.y - 30);
    ctx.fillText(`${f.percent.toFixed(0)}%`, f.x, f.y - 30);
    if (f.combo > 1 && (f.action === 'attack' || f.action === 'special' || f.action === 'ultra' || f.spectacleTimer > 0)) {
      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
      ctx.fillText(`x${f.combo}`, f.x, f.y - 52);
    }
    ctx.restore();
  }

  drawHUD(fighters, mode, stageName = 'Arène') {
    const ctx = this.ctx;
    const slots = fighters.slice().sort((a, b) => a.slot - b.slot);
    slots.forEach((f, i) => {
      const x = 40 + (i % 2) * 640;
      const y = i < 2 ? 24 : 100;
      this.drawFighterHUD(ctx, f, x, y);
    });
    ctx.save();
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(226,232,240,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(`${mode.toUpperCase()} — ${stageName}`, 640, 18);
    // 4D badge
    ctx.font = '800 11px "Exo 2", "Trebuchet MS", sans-serif';
    const badge = 'MODE 4D';
    const tw = ctx.measureText(badge).width;
    ctx.fillStyle = 'rgba(15,23,42,0.65)';
    ctx.beginPath();
    ctx.roundRect(640 - tw / 2 - 10, 26, tw + 20, 18, 8);
    ctx.fill();
    const g = ctx.createLinearGradient(640 - tw / 2, 0, 640 + tw / 2, 0);
    g.addColorStop(0, '#67e8f9');
    g.addColorStop(1, '#e879f9');
    ctx.fillStyle = g;
    ctx.fillText(badge, 640, 39);
    ctx.restore();
  }

  drawFighterHUD(ctx, f, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(15,23,42,0.55)';
    ctx.strokeStyle = f.colors?.accent || '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, 280, 64, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.fillText(f.name, x + 14, y + 20);

    // HP
    ctx.fillStyle = '#334155';
    ctx.fillRect(x + 14, y + 28, 180, 10);
    const hpPct = Math.max(0, f.hp / f.maxHp);
    const hpG = ctx.createLinearGradient(x + 14, 0, x + 194, 0);
    hpG.addColorStop(0, '#4ade80');
    hpG.addColorStop(1, '#fde047');
    ctx.fillStyle = hpG;
    ctx.fillRect(x + 14, y + 28, 180 * hpPct, 10);

    // Ki
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 14, y + 44, 180, 8);
    const kiG = ctx.createLinearGradient(x + 14, 0, x + 194, 0);
    kiG.addColorStop(0, '#38bdf8');
    kiG.addColorStop(1, '#fef08a');
    ctx.fillStyle = kiG;
    ctx.fillRect(x + 14, y + 44, 180 * (f.ki / 100), 8);

    // Stocks
    for (let s = 0; s < f.stocks; s++) {
      ctx.fillStyle = f.colors?.body || '#fff';
      ctx.beginPath();
      ctx.arc(x + 220 + s * 16, y + 36, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
    ctx.fillText(`${f.percent?.toFixed?.(0) ?? 0}%`, x + 210, y + 22);
    ctx.restore();
  }

  drawChronoOverlay(engine) {
    const ctx = this.ctx;
    const warp = engine.fx.chronoWarp || 0;
    if (warp <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(0.55, warp);
    ctx.globalCompositeOperation = 'screen';
    // RGB channel split bands
    for (let i = 0; i < 8; i++) {
      const y = ((i * 97 + engine.time * 140 * warp) % 720);
      ctx.fillStyle = i % 2 ? 'rgba(103,232,249,0.18)' : 'rgba(232,121,249,0.16)';
      ctx.fillRect(0, y, 1280, 10 + warp * 18);
    }
    ctx.restore();
  }

  render(engine) {
    const ctx = this.ctx;
    const shake = engine.fx.shake;
    ctx.save();
    ctx.clearRect(0, 0, 1280, 720);
    ctx.translate(shake.x, shake.y);

    this.drawBackground(engine.stage, engine.time);
    this.drawStage(engine.stage, engine.time);

    // Soft blast zone hint
    ctx.save();
    ctx.strokeStyle = 'rgba(251,113,133,0.25)';
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(20, 20, 1240, 680);
    ctx.restore();

    engine.fx.draw(ctx);
    const groundY = engine.stage?.ground?.y || 520;
    for (const f of engine.fighters) this.drawFighter(f, engine.time, groundY);
    this.drawChronoOverlay(engine);
    this.drawHUD(engine.fighters, engine.mode, engine.stage?.name || 'Arène 4D');

    ctx.restore();
  }
}
