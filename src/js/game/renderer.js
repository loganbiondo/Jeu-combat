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
    ctx.globalAlpha = 0.25;
    const neb = ctx.createRadialGradient(900, 160, 20, 900, 160, 320);
    neb.addColorStop(0, '#f9a8d4');
    neb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, 1280, 500);
    ctx.restore();

    for (const s of this.stars) {
      ctx.globalAlpha = 0.4 + Math.sin(t * 2 + s.a * 10) * 0.3;
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Soft planet
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(1100, 120, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawStage(stage) {
    const ctx = this.ctx;
    const plats = [stage.ground, ...stage.platforms];
    for (const p of plats) {
      ctx.save();
      const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      g.addColorStop(0, '#fef3c7');
      g.addColorStop(1, '#f59e0b');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 8);
      ctx.fill();
      ctx.stroke();
      // glow edge
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(253,224,71,0.5)';
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

    // Body
    ctx.fillStyle = f.colors.body;
    ctx.strokeStyle = f.colors.outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Accent belly / core
    ctx.fillStyle = f.colors.accent;
    ctx.beginPath();
    ctx.ellipse(2, 4, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (cute)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(6, -8, 3.2, 0, Math.PI * 2);
    ctx.arc(13, -8, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(7, -9, 1.1, 0, Math.PI * 2);
    ctx.arc(14, -9, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Action pose flash / slash
    if (f.action === 'attack' || f.action === 'special' || f.action === 'ultra') {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = f.action === 'ultra' ? '#fef08a' : '#ffffff';
      ctx.shadowColor = f.action === 'ultra' ? '#fb7185' : '#7dd3fc';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(18, -10);
      ctx.lineTo(f.action === 'ultra' ? 52 : 38, 0);
      ctx.lineTo(18, 10);
      ctx.closePath();
      ctx.fill();
      if (f.action === 'ultra') {
        ctx.beginPath();
        ctx.moveTo(12, -18);
        ctx.lineTo(44, -6);
        ctx.lineTo(12, 0);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();

    // Name + percent
    ctx.save();
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(f.name, f.x, f.y - 40);
    ctx.fillStyle = f.percent > 100 ? '#fb7185' : '#fde047';
    ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    ctx.fillText(`${f.percent.toFixed(0)}%`, f.x, f.y - 24);
    ctx.restore();
  }

  drawHUD(fighters, mode) {
    const ctx = this.ctx;
    const slots = fighters.slice().sort((a, b) => a.slot - b.slot);
    slots.forEach((f, i) => {
      const x = 40 + (i % 2) * 640;
      const y = i < 2 ? 24 : 100;
      this.drawFighterHUD(ctx, f, x, y);
    });
    ctx.save();
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(226,232,240,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText(mode.toUpperCase() + ' — Orbite Douce', 640, 18);
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
    this.drawHUD(engine.fighters, engine.mode);

    ctx.restore();
  }
}
