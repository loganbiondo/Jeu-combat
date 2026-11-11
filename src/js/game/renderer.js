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
    if (!f.alive && f.stocks > 0) return;
    if (f.stocks <= 0) return;
    const ctx = this.ctx;
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

    // Fusion Grok aura
    if (f.fused) {
      const pulse = 40 + Math.sin(t * 16) * 10;
      const aura = ctx.createRadialGradient(0, 0, 6, 0, 0, pulse);
      aura.addColorStop(0, 'rgba(245,214,87,0.7)');
      aura.addColorStop(0.45, 'rgba(125,211,252,0.35)');
      aura.addColorStop(1, 'rgba(15,23,42,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245,214,87,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 34 + Math.sin(t * 10) * 3, 0, Math.PI * 2);
      ctx.stroke();
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
    ctx.fillStyle = f.fused ? '#f5d657' : '#f8fafc';
    ctx.fillText(f.name, f.x, f.y - 48);
    if (f.fused) {
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '800 11px "Exo 2", "Trebuchet MS", sans-serif';
      ctx.strokeText('FUSION GROK', f.x, f.y - 62);
      ctx.fillText('FUSION GROK', f.x, f.y - 62);
    }
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
      const y = i < 2 ? 24 : 108;
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
    ctx.strokeStyle = f.fused ? '#f5d657' : f.colors?.accent || '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, 280, 78, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = f.fused ? '#f5d657' : '#f8fafc';
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

    // Fusion Grok meter (héros seulement — pas sur Grok lui-même)
    if (f.canFusion || f.fused) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x + 14, y + 58, 180, 8);
      const fusePct = f.fused
        ? Math.max(0, f.fusionTimer / 14)
        : Math.max(0, (f.fusionMeter || 0) / (f.maxFusionMeter || 100));
      const fuseG = ctx.createLinearGradient(x + 14, 0, x + 194, 0);
      fuseG.addColorStop(0, '#f5d657');
      fuseG.addColorStop(1, '#7dd3fc');
      ctx.fillStyle = fuseG;
      ctx.fillRect(x + 14, y + 58, 180 * fusePct, 8);
      ctx.fillStyle = f.fused || fusePct >= 1 ? '#f5d657' : '#94a3b8';
      ctx.font = '800 10px "Exo 2", "Trebuchet MS", sans-serif';
      ctx.fillText(
        f.fused ? `FUSION GROK ${Math.ceil(f.fusionTimer || 0)}s` : fusePct >= 1 ? 'FUSION GROK PRÊTE (F)' : 'FUSION GROK',
        x + 14,
        y + 74
      );
    } else if (f.characterId === 'grok') {
      ctx.fillStyle = '#f5d657';
      ctx.font = '800 10px "Exo 2", "Trebuchet MS", sans-serif';
      ctx.fillText('PARTENAIRE FUSION', x + 14, y + 70);
    }

    // Stocks (cap HUD pour éviter un freeze si stocks abusifs)
    const stockDots = Math.max(0, Math.min(5, Number(f.stocks) || 0));
    for (let s = 0; s < stockDots; s++) {
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

  drawFusionBanner(engine) {
    if (!engine.fusionBanner || engine.fusionBanner <= 0) return;
    const ctx = this.ctx;
    const a = Math.min(1, engine.fusionBanner);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(7,17,31,0.72)';
    ctx.fillRect(0, 280, 1280, 120);
    ctx.strokeStyle = '#f5d657';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(80, 290);
    ctx.lineTo(1200, 290);
    ctx.moveTo(80, 390);
    ctx.lineTo(1200, 390);
    ctx.stroke();
    ctx.fillStyle = '#f5d657';
    ctx.font = '800 54px "Exo 2", "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(engine.fusionBannerText || 'FUSION GROK !', 640, 350);
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '800 18px "Exo 2", "Trebuchet MS", sans-serif';
    ctx.fillText('Deux âmes · un smash cosmique', 640, 378);
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

    // Soft blast zone hint
    ctx.save();
    ctx.strokeStyle = 'rgba(251,113,133,0.25)';
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(20, 20, 1240, 680);
    ctx.restore();

    engine.fx.draw(ctx);
    for (const f of engine.fighters) this.drawFighter(f, engine.time);
    this.drawHUD(engine.fighters, engine.mode, engine.stage?.name || 'Arène');
    this.drawFusionBanner(engine);

    ctx.restore();
  }
}
