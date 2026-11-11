import { drawCharacterSprite } from './sprites.js';

/** Rendu canvas arène + fighters + FX */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = canvas.width;
    this.h = canvas.height;
    this.stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * 1280,
      y: Math.random() * 520,
      r: Math.random() * 1.8 + 0.4,
      a: Math.random()
    }));
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    this.canvas.style.width = `${1280 * scale}px`;
    this.canvas.style.height = `${720 * scale}px`;
  }

  drawBackground(stage, t) {
    const ctx = this.ctx;
    const sky = stage.sky;
    const grd = ctx.createLinearGradient(0, 0, 0, 720);
    grd.addColorStop(0, sky[0]);
    grd.addColorStop(0.55, sky[1]);
    grd.addColorStop(1, sky[2]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 1280, 720);

    // Nebula wash
    ctx.save();
    ctx.globalAlpha = 0.28;
    const neb = ctx.createRadialGradient(900, 160, 20, 900, 160, 320);
    neb.addColorStop(0, stage.accent || '#f9a8d4');
    neb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, 1280, 500);
    const neb2 = ctx.createRadialGradient(220, 420, 10, 220, 420, 260);
    neb2.addColorStop(0, 'rgba(56,189,248,0.35)');
    neb2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb2;
    ctx.fillRect(0, 200, 600, 400);
    ctx.restore();

    for (const s of this.stars) {
      ctx.globalAlpha = 0.4 + Math.sin(t * 2 + s.a * 10) * 0.3;
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Soft planet + rings
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = stage.accent || '#67e8f9';
    ctx.beginPath();
    ctx.arc(1100, 120, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(1100, 120, 100, 28, -0.3, 0, Math.PI * 2);
    ctx.stroke();
    // distant mountains / skyline
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#0b1220';
    ctx.beginPath();
    ctx.moveTo(0, 480);
    ctx.lineTo(120, 400);
    ctx.lineTo(260, 450);
    ctx.lineTo(400, 360);
    ctx.lineTo(560, 430);
    ctx.lineTo(720, 340);
    ctx.lineTo(900, 420);
    ctx.lineTo(1100, 350);
    ctx.lineTo(1280, 400);
    ctx.lineTo(1280, 520);
    ctx.lineTo(0, 520);
    ctx.fill();
    ctx.restore();
  }

  drawStage(stage) {
    const ctx = this.ctx;
    const top = stage.platformTop || '#fef3c7';
    const bot = stage.platformBot || '#f59e0b';
    const plats = [stage.ground, ...stage.platforms];
    for (const p of plats) {
      ctx.save();
      const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      g.addColorStop(0, top);
      g.addColorStop(1, bot);
      ctx.fillStyle = g;
      ctx.strokeStyle = 'rgba(15,23,42,0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowColor = top;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.stroke();
      ctx.restore();
    }
  }

  drawFighter(f, t) {
    if (!f.alive || f.hp <= 0) return;
    const ctx = this.ctx;
    const scale = f.drawScale || 1.85;
    const r = f.radius || 38;
    ctx.save();
    ctx.translate(f.x, f.y);
    if (f.invuln > 0 && Math.floor(t * 20) % 2 === 0) ctx.globalAlpha = 0.45;

    // Shield bubble
    if (f.shieldTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Transform / high-ki aura
    if (f.transformed || f.ki > 70 || f.action === 'charge' || f.action === 'ultra') {
      const boost = f.transformed ? 2.1 : f.action === 'charge' || f.action === 'ultra' ? 1.6 : 1;
      const pulse = (34 + Math.sin(t * 14) * 8) * boost;
      const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, pulse);
      aura.addColorStop(
        0,
        f.transformed
          ? 'rgba(253,224,71,0.65)'
          : f.action === 'ultra'
            ? 'rgba(251,113,133,0.55)'
            : 'rgba(254,240,138,0.5)'
      );
      aura.addColorStop(0.5, f.transformed ? 'rgba(251,146,60,0.3)' : 'rgba(56,189,248,0.25)');
      aura.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Charge / transform lightning arcs
    if (f.action === 'charge' || f.transformed) {
      ctx.save();
      ctx.strokeStyle = f.colors?.accent || '#fef08a';
      ctx.lineWidth = f.transformed ? 3 : 2;
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < (f.transformed ? 7 : 5); i++) {
        const a = t * 12 + i * 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22);
        ctx.lineTo(Math.cos(a + 0.4) * 52, Math.sin(a + 0.5) * 52);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Impact squash / stretch for weighty hits
    const squash = f.impactSquash || 0;
    const sx = 1 + squash * 0.35;
    const sy = 1 - squash * 0.28;
    ctx.scale((f.facing || 1) * scale * sx, scale * sy);

    if (f.hurtFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.85, f.hurtFlash * 3);
      drawCharacterSprite(ctx, f.characterId || 'lumo', { body: '#fff', accent: '#fff', outline: '#fecaca' }, t, 'hurt');
      ctx.restore();
    }

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
    const nameY = f.y - r - 18;
    ctx.save();
    ctx.font = '800 14px "Exo 2", "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(7,17,31,0.75)';
    const label = f.transformed ? `${f.name} ★` : f.name;
    ctx.strokeText(label, f.x, nameY);
    ctx.fillStyle = f.transformed ? '#fde047' : '#f8fafc';
    ctx.fillText(label, f.x, nameY);
    if (f.transformed && f.transformName) {
      ctx.font = '700 11px "Exo 2", "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#fdba74';
      ctx.strokeText(f.transformName, f.x, nameY + 14);
      ctx.fillText(f.transformName, f.x, nameY + 14);
    }
    if (f.comboCount > 1) {
      ctx.fillStyle = '#67e8f9';
      ctx.font = '800 14px "Exo 2", "Trebuchet MS", sans-serif';
      ctx.strokeText(`${f.comboCount} HITS`, f.x, nameY + (f.transformed ? 28 : 16));
      ctx.fillText(`${f.comboCount} HITS`, f.x, nameY + (f.transformed ? 28 : 16));
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
    ctx.fillStyle = 'rgba(226,232,240,0.75)';
    ctx.textAlign = 'center';
    ctx.fillText(`${mode.toUpperCase()} — ${stageName}`, 640, 18);
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

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillText(`${Math.max(0, Math.round(f.hp))} PV`, x + 210, y + 40);
    ctx.restore();
  }

  render(engine) {
    const ctx = this.ctx;
    const shake = engine.fx.shake;
    ctx.save();
    ctx.clearRect(0, 0, 1280, 720);
    ctx.translate(shake.x, shake.y);

    this.drawBackground(engine.stage, engine.time);
    this.drawStage(engine.stage);

    // Walls (Tekken/SF cage)
    const walls = engine.stage.walls;
    if (walls) {
      ctx.save();
      ctx.fillStyle = 'rgba(15,23,42,0.45)';
      ctx.fillRect(0, 0, walls.left - 10, 720);
      ctx.fillRect(walls.right + 10, 0, 1280 - walls.right - 10, 720);
      ctx.strokeStyle = 'rgba(125,211,252,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(walls.left - 8, 120);
      ctx.lineTo(walls.left - 8, engine.stage.ground.y);
      ctx.moveTo(walls.right + 8, 120);
      ctx.lineTo(walls.right + 8, engine.stage.ground.y);
      ctx.stroke();
      ctx.restore();
    }

    engine.fx.draw(ctx);
    for (const f of engine.fighters) this.drawFighter(f, engine.time);
    this.drawHUD(engine.fighters, engine.mode, engine.stage?.name || 'Arène');

    ctx.restore();
  }
}
