/** Rendu néon : tube lumineux, bloom, chocs, biomes. */

import { ARENA_R } from './engine.js';
import { BIOMES, ORB_COLORS, biomeIndex, skinById } from './content.js';

const HEX = 58;

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function rgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function prismColor(t, time) {
  const h = (time * 80 + t * 220) % 360;
  const s = 1;
  const l = 0.62;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(c * 255);
  };
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function createRenderer(canvas) {
  const scene = document.createElement('canvas');
  const glow = document.createElement('canvas');
  const blurA = document.createElement('canvas');
  const blurB = document.createElement('canvas');
  const grain = document.createElement('canvas');
  grain.width = 128;
  grain.height = 128;
  const gctx = grain.getContext('2d');
  const img = gctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 200 + Math.random() * 55;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 28;
  }
  gctx.putImageData(img, 0, 0);

  const view = canvas.getContext('2d', { alpha: false });
  const sctx = scene.getContext('2d', { alpha: false });
  const bctx = glow.getContext('2d', { alpha: true });
  const actx = blurA.getContext('2d', { alpha: true });
  const b2 = blurB.getContext('2d', { alpha: true });

  const sprites = new Map();
  const parts = [];
  const stars = Array.from({ length: 160 }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    z: (i % 3) + 1,
    r: Math.random() * 1.3 + 0.25,
    p: Math.random() * Math.PI * 2
  }));

  const cam = { x: 0, y: 0, zoom: 1.05 };
  let shake = 0;
  let shakeX = 0;
  let shakeY = 0;
  let kick = 0;
  let flash = 0;
  let glitch = 0;
  let bossPulse = 0;
  let time = 0;
  let allowShake = true;
  let allowFlash = true;
  let showcase = false;
  let W = 1;
  let H = 1;
  let dpr = 1;

  const demo = [makeDemo('ion', 0), makeDemo('pulse', 2.1), makeDemo('solar', 4.2)];
  const demoOrbs = Array.from({ length: 22 }, (_, i) => ({
    kind: ['bit', 'cluster', 'shield', 'magnet', 'slowmo', 'turbo', 'core'][i % 7],
    ph: i
  }));

  function makeDemo(skin, shift) {
    return {
      skin,
      shift,
      pts: Array.from({ length: 54 }, () => ({ x: 0, y: 0 })),
      width: 18,
      alive: true,
      ghostT: 0,
      shields: skin === 'solar' ? 1 : 0,
      hat: skin === 'pulse' ? 'crown' : skin === 'solar' ? 'halo' : 'none',
      trail: skin === 'ion' ? 'ribbon' : 'ion',
      boosting: false,
      isBoss: false,
      name: '',
      angle: 0,
      x: 0,
      y: 0
    };
  }

  function disc(color) {
    const key = color;
    if (sprites.has(key)) return sprites.get(key);
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    r.addColorStop(0, '#ffffff');
    r.addColorStop(0.12, color);
    r.addColorStop(0.38, rgba(color, 0.55));
    r.addColorStop(1, rgba(color, 0));
    g.fillStyle = r;
    g.fillRect(0, 0, size, size);
    sprites.set(key, c);
    return c;
  }

  function resize() {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(canvas.clientWidth * dpr));
    H = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
      scene.width = W;
      scene.height = H;
      const bw = Math.max(2, Math.round(W / 2));
      const bh = Math.max(2, Math.round(H / 2));
      glow.width = bw;
      glow.height = bh;
      blurA.width = bw;
      blurA.height = bh;
      blurB.width = bw;
      blurB.height = bh;
    }
  }

  function spawn(p) {
    if (parts.length > 640) parts.splice(0, parts.length - 500);
    parts.push(p);
  }

  function burst(kind, x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (0.35 + Math.random()) * speed;
      spawn({
        type: kind,
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.35 + Math.random() * 0.55,
        max: 0.9,
        color,
        size: 2 + Math.random() * 3.4,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 8,
        drag: 1.6,
        delay: 0,
        g: kind === 'shard' ? 40 : 0
      });
    }
  }

  function ring(x, y, color, r, vr, life) {
    spawn({ type: 'ring', x, y, r, vr, life, max: life, color, size: 2, delay: 0, vx: 0, vy: 0 });
  }

  function floatText(text, x, y, color) {
    spawn({
      type: 'text',
      text,
      x,
      y,
      vx: 0,
      vy: -42,
      life: 0.8,
      max: 0.8,
      color,
      size: 16,
      delay: 0
    });
  }

  function onEvents(match) {
    let floated = 0;
    for (const e of match.events || []) {
      const skin = skinById(e.skin || 'ion');
      if (e.type === 'eat') {
        burst('spark', e.x, e.y, e.kind === 'cluster' ? '#7CF25A' : '#7DF9FF', 8, 90);
        ring(e.x, e.y, '#7DF9FF', 8, 90, 0.28);
        if (e.player && floated < 4) {
          floated += 1;
          floatText(e.text, e.x, e.y - 16, e.combo > 3 ? '#FFD60A' : '#E8F7FF');
        }
        if (e.player && allowShake) shake = Math.max(shake, 1.5);
        kick = Math.max(kick, 0.02);
      } else if (e.type === 'kill') {
        burst('spark', e.x, e.y, '#FF2D8A', 22, 220);
        ring(e.x, e.y, '#FF2D8A', 12, 260, 0.45);
        if (allowShake) shake = Math.max(shake, e.player ? 14 : 6);
        kick = Math.max(kick, 0.07);
      } else if (e.type === 'death') {
        const style = e.player ? e.style || 'shatter' : e.boss ? 'supernova' : 'shatter';
        const col = skin.head;
        if (style === 'supernova') {
          burst('spark', e.x, e.y, '#FFFFFF', 40, 360);
          burst('spark', e.x, e.y, col, 30, 220);
          ring(e.x, e.y, '#FFFFFF', 20, 420, 0.7);
          ring(e.x, e.y, col, 10, 260, 0.5);
          if (allowFlash) flash = Math.max(flash, e.player ? 0.75 : 0.35);
        } else if (style === 'blackhole') {
          for (let i = 0; i < 36; i++) {
            const a = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 180;
            spawn({
              type: 'spark',
              x: e.x + Math.cos(a) * dist,
              y: e.y + Math.sin(a) * dist,
              vx: -Math.cos(a) * 160,
              vy: -Math.sin(a) * 160,
              life: 0.45,
              max: 0.45,
              color: col,
              size: 3,
              delay: 0,
              drag: 0.2,
              g: 0
            });
          }
          ring(e.x, e.y, '#FFFFFF', 120, -180, 0.5);
          burst('spark', e.x, e.y, col, 24, 280);
          spawn({ type: 'spark', x: e.x, y: e.y, vx: 0, vy: 0, life: 0.45, max: 0.45, color: '#000000', size: 1, delay: 0.42, drag: 0, g: 0, boom: true, boomColor: col });
        } else if (style === 'glitch') {
          burst('shard', e.x, e.y, col, 26, 240);
          glitch = Math.max(glitch, 0.55);
          if (allowFlash) flash = Math.max(flash, 0.25);
        } else {
          const pts = e.pts || [];
          const n = Math.min(pts.length, 28);
          for (let i = 0; i < n; i++) {
            const p = pts[i];
            spawn({
              type: 'shard',
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 180,
              vy: (Math.random() - 0.5) * 180,
              life: 0.7,
              max: 0.7,
              color: i % 2 ? skin.head : skin.tail,
              size: 4 + Math.random() * 6,
              rot: Math.random() * 6,
              vr: (Math.random() - 0.5) * 10,
              delay: 0,
              g: 0,
              drag: 1.2
            });
          }
          ring(e.x, e.y, col, 16, 200, 0.4);
        }
        if (e.player && allowShake) shake = Math.max(shake, 20);
      } else if (e.type === 'nova') {
        ring(e.x, e.y, '#FFFFFF', 20, 640, 0.72);
        ring(e.x, e.y, '#00F0FF', 8, 420, 0.55);
        ring(e.x, e.y, '#FF2D8A', 4, 280, 0.4);
        burst('spark', e.x, e.y, '#E8F7FF', 48, 420);
        if (allowFlash) flash = Math.max(flash, 0.62);
        if (allowShake) shake = Math.max(shake, 16);
      } else if (e.type === 'shield' || e.type === 'shieldPop' || e.type === 'phase') {
        ring(e.x, e.y, e.type === 'phase' ? '#A78BFA' : '#FFD60A', 18, 160, 0.4);
        if (allowShake && e.type !== 'shield') shake = Math.max(shake, 5);
      } else if (e.type === 'power') {
        const map = { magnet: '#FF4FD8', slowmo: '#A78BFA', turbo: '#FF8A00', core: '#FFFFFF' };
        burst('spark', e.x, e.y, map[e.kind] || '#fff', 12, 120);
      } else if (e.type === 'level') {
        kick = Math.max(kick, 0.06);
        if (allowFlash) flash = Math.max(flash, 0.18);
      } else if (e.type === 'boss') {
        bossPulse = 1;
        if (allowShake) shake = Math.max(shake, 10);
      } else if (e.type === 'venom') {
        burst('spark', e.x, e.y, '#7CF25A', 6, 70);
      }
    }
  }

  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.delay > 0) {
        p.delay -= dt;
        if (p.delay > 0) continue;
        if (p.boom) {
          burst('spark', p.x, p.y, p.boomColor || '#fff', 30, 260);
          ring(p.x, p.y, '#FFFFFF', 10, 300, 0.4);
        }
      }
      p.life -= dt;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      if (p.drag) {
        const d = Math.exp(-p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      if (p.g) p.vy += p.g * dt;
      if (p.vr) p.rot += p.vr * dt;
      if (p.type === 'ring') p.r += p.vr * dt;
    }
    shake *= Math.exp(-dt * 6.5);
    kick *= Math.exp(-dt * 7);
    flash = Math.max(0, flash - dt * 1.4);
    glitch = Math.max(0, glitch - dt);
    bossPulse = Math.max(0, bossPulse - dt * 0.35);
  }

  function applyCam(ctx, scale) {
    const z = cam.zoom * scale;
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    ctx.setTransform(z, 0, 0, z, cw / 2 + shakeX * scale, ch / 2 + shakeY * scale);
    ctx.translate(-cam.x, -cam.y);
  }

  function trace(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length < 3) {
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      return;
    }
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  function pointsOf(snake) {
    const out = [{ x: snake.x, y: snake.y }];
    const pts = snake.pts || [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const last = out[out.length - 1];
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      if (dx * dx + dy * dy > 9) out.push(p);
    }
    return out;
  }

  function colorsOf(snake) {
    const skin = skinById(snake.skin);
    if (skin.prism) {
      return { head: prismColor(0, time), tail: prismColor(1, time), prism: true, skin };
    }
    return { head: skin.head, tail: skin.tail, prism: false, skin };
  }

  function drawSnake(ctx, snake, pass) {
    if (!snake) return;
    const fading = !snake.alive;
    if (fading && snake.fade <= 0) return;
    const pts = pointsOf(snake);
    if (pts.length < 2) return;
    const col = colorsOf(snake);
    const w = snake.width || 16;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = (snake.ghostT > 0 ? 0.55 : 1) * (fading ? snake.fade : 1);
    if (pass === 'bloom') {
      ctx.globalCompositeOperation = 'lighter';
      trace(ctx, pts);
      ctx.strokeStyle = col.head;
      ctx.lineWidth = w * 1.15;
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (snake.trail === 'ribbon' || snake.boosting) {
      trace(ctx, pts);
      ctx.strokeStyle = rgba(col.head, snake.boosting ? 0.28 : 0.14);
      ctx.lineWidth = w * (snake.boosting ? 2.8 : 2.3);
      ctx.stroke();
    }
    if (snake.trail === 'pixel') {
      ctx.fillStyle = col.head;
      for (let i = 0; i < pts.length; i += 3) {
        ctx.fillRect(pts[i].x - 2, pts[i].y - 2, 4, 4);
      }
    }
    trace(ctx, pts);
    ctx.strokeStyle = col.tail;
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = col.head;
    ctx.lineWidth = w * 0.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.lineWidth = Math.max(1.2, w * 0.1);
    ctx.setLineDash([3, 18]);
    ctx.lineDashOffset = -time * (snake.boosting ? 220 : 110);
    ctx.stroke();
    ctx.setLineDash([]);
    if (snake.isBoss) {
      ctx.strokeStyle = rgba('#FFD60A', 0.9);
      ctx.lineWidth = 2;
      for (let i = 3; i < pts.length; i += 4) {
        const prev = pts[i - 1];
        const a = Math.atan2(prev.y - pts[i].y, prev.x - pts[i].x) + Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(pts[i].x - Math.cos(a) * w * 0.2, pts[i].y - Math.sin(a) * w * 0.2);
        ctx.lineTo(pts[i].x + Math.cos(a) * w * 1.15, pts[i].y + Math.sin(a) * w * 1.15);
        ctx.stroke();
      }
    }
    drawHead(ctx, snake, col, w);
    ctx.restore();
  }

  function drawHead(ctx, snake, col, w) {
    const x = snake.x;
    const y = snake.y;
    const a = snake.angle || 0;
    ctx.fillStyle = col.head;
    ctx.beginPath();
    ctx.arc(x, y, w * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    const fx = Math.cos(a);
    const fy = Math.sin(a);
    const sx = Math.cos(a + Math.PI / 2);
    const sy = Math.sin(a + Math.PI / 2);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + fx * w * 0.22 + sx * w * 0.28 * side, y + fy * w * 0.22 + sy * w * 0.28 * side, w * 0.2, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = '#050b14';
    const look = snake.boosting ? 0.4 : 0.26;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + fx * w * look + sx * w * 0.28 * side, y + fy * w * look + sy * w * 0.28 * side, w * 0.1, 0, 7);
      ctx.fill();
    }
    drawHat(ctx, snake, w, a);
    if (snake.shields > 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 1.6);
      ctx.strokeStyle = '#FFD60A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const px = Math.cos(ang) * w * 1.35;
        const py = Math.sin(ang) * w * 1.35;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    if (snake.name && !snake.hideName) {
      ctx.font = '700 13px Exo2, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(3,6,13,0.55)';
      const label = snake.name;
      const tw = ctx.measureText(label).width;
      ctx.fillRect(x - tw / 2 - 6, y - w - 22, tw + 12, 16);
      ctx.fillStyle = snake.isPlayer ? '#00F0FF' : snake.isBoss ? '#FFD60A' : '#D5E4F5';
      ctx.fillText(label, x, y - w - 10);
    }
  }

  function drawHat(ctx, snake, w, a) {
    const x = snake.x;
    const y = snake.y;
    if (snake.hat === 'crown') {
      ctx.fillStyle = '#FFD60A';
      ctx.beginPath();
      ctx.moveTo(x - w * 0.45, y - w * 0.7);
      ctx.lineTo(x - w * 0.2, y - w * 1.25);
      ctx.lineTo(x, y - w * 0.8);
      ctx.lineTo(x + w * 0.2, y - w * 1.35);
      ctx.lineTo(x + w * 0.45, y - w * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (snake.hat === 'halo') {
      ctx.strokeStyle = 'rgba(255,214,10,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y - w * 1.15, w * 0.55, w * 0.18, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (snake.hat === 'horns') {
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a + Math.PI / 2) * w * 0.3 * side, y + Math.sin(a + Math.PI / 2) * w * 0.3 * side);
        ctx.quadraticCurveTo(
          x - Math.cos(a) * w * 0.2 + Math.cos(a + Math.PI / 2) * w * 0.8 * side,
          y - Math.sin(a) * w * 0.2 + Math.sin(a + Math.PI / 2) * w * 0.8 * side,
          x - Math.cos(a) * w * 0.9 + Math.cos(a + Math.PI / 2) * w * 0.35 * side,
          y - Math.sin(a) * w * 0.9 + Math.sin(a + Math.PI / 2) * w * 0.35 * side
        );
        ctx.stroke();
      }
    }
  }

  function drawOrb(ctx, orb, pass) {
    const color = ORB_COLORS[orb.kind] || '#7DF9FF';
    const pulse = 1 + Math.sin(time * 3.2 + (orb.ph || 0)) * 0.12;
    const r = (orb.r || 8) * pulse;
    const sprite = disc(color);
    ctx.save();
    ctx.translate(orb.x, orb.y);
    if (pass === 'bloom') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(sprite, -r * 3.2, -r * 3.2, r * 6.4, r * 6.4);
      ctx.restore();
      return;
    }
    ctx.drawImage(sprite, -r * 2.6, -r * 2.6, r * 5.2, r * 5.2);
    ctx.rotate(time * 0.7 + (orb.ph || 0));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (orb.kind === 'shield') ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    else if (orb.kind === 'core') {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const rr = i % 2 === 0 ? r : r * 0.45;
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
    } else if (orb.kind === 'magnet') {
      ctx.arc(-r * 0.15, 0, r * 0.55, Math.PI * 0.15, Math.PI * 1.5);
    } else if (orb.kind === 'slowmo') {
      ctx.moveTo(-r * 0.45, -r * 0.7);
      ctx.lineTo(r * 0.45, -r * 0.7);
      ctx.lineTo(0, 0);
      ctx.lineTo(r * 0.45, r * 0.7);
      ctx.lineTo(-r * 0.45, r * 0.7);
      ctx.closePath();
    } else if (orb.kind === 'turbo' || orb.kind === 'razor') {
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.45, 0);
      ctx.lineTo(0, r * 0.15);
      ctx.lineTo(-r * 0.2, r);
    } else ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawArena(ctx, biome, match) {
    ctx.save();
    const floor = ctx.createRadialGradient(0, 0, 40, 0, 0, ARENA_R);
    floor.addColorStop(0, 'rgba(10, 20, 40, 0.72)');
    floor.addColorStop(0.75, 'rgba(4, 8, 16, 0.3)');
    floor.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = floor;
    ctx.beginPath();
    ctx.arc(0, 0, ARENA_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    const view = Math.max(W, H) / cam.zoom;
    const minX = cam.x - view;
    const maxX = cam.x + view;
    const minY = cam.y - view;
    const maxY = cam.y + view;
    const horiz = Math.sqrt(3) * HEX;
    const vert = 1.5 * HEX;
    const r0 = Math.floor(minY / vert) - 2;
    const r1 = Math.ceil(maxY / vert) + 2;
    const c0 = Math.floor(minX / horiz) - 2;
    const c1 = Math.ceil(maxX / horiz) + 2;
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const x = horiz * (col + (row & 1) * 0.5);
        const y = vert * row;
        if (x * x + y * y > (ARENA_R - 24) * (ARENA_R - 24)) continue;
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const px = x + Math.cos(a) * HEX;
          const py = y + Math.sin(a) * HEX;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      }
    }
    ctx.strokeStyle = rgba(biome.grid, 0.16);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    ctx.rotate(time * 0.15);
    for (let i = 0; i < 7; i++) {
      ctx.rotate((Math.PI * 2) / 7);
      const g = ctx.createLinearGradient(0, 0, ARENA_R * 0.85, 0);
      g.addColorStop(0, biome.core);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ARENA_R * 0.9, -70);
      ctx.lineTo(ARENA_R * 0.9, 70);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(0, 0, ARENA_R, 0, Math.PI * 2);
    ctx.strokeStyle = biome.ring;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.setLineDash([16, 18]);
    ctx.lineDashOffset = -time * 90;
    ctx.stroke();
    ctx.setLineDash([]);

    if (match && match.danger > 0.25) {
      const bolts = 2 + Math.floor(match.danger * 4);
      ctx.strokeStyle = biome.ring;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = match.danger;
      for (let i = 0; i < bolts; i++) {
        const a = time * 2 + i * 1.7;
        const inner = ARENA_R - 10;
        const outer = ARENA_R - 80 - match.danger * 40;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        for (let s = 1; s <= 4; s++) {
          const t = s / 4;
          const ang = a + Math.sin(time * 8 + i + s) * 0.12;
          const rad = inner + (outer - inner) * t;
          ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    const core = ctx.createRadialGradient(0, 0, 10, 0, 0, 280);
    core.addColorStop(0, biome.core);
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 280, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBackdrop(ctx, biome) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, biome.nebula[0]);
    bg.addColorStop(0.5, biome.void);
    bg.addColorStop(1, biome.nebula[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const nx = W * (0.5 + Math.sin(time * 0.07 + i * 2) * 0.28);
      const ny = H * (0.45 + Math.cos(time * 0.05 + i) * 0.22);
      const rad = Math.max(W, H) * 0.45;
      const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
      g.addColorStop(0, rgba(i === 1 ? biome.accent : biome.grid, 0.16));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const s of stars) {
      const px = ((s.x + cam.x * 0.00008 * s.z + 8) % 1) * W;
      const py = ((s.y + cam.y * 0.00008 * s.z + 8) % 1) * H;
      const tw = 0.45 + Math.sin(time * 2 + s.p) * 0.35;
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#EAF7FF';
      ctx.fillRect(px, py, s.r * s.z * 0.7, s.r * s.z * 0.7);
    }
    ctx.globalAlpha = 1;
  }

  function drawParts(ctx) {
    for (const p of parts) {
      if (p.delay > 0 || p.life <= 0) continue;
      const a = clamp(p.life / (p.max || 1), 0, 1);
      ctx.globalAlpha = a;
      if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.r), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'text') {
        ctx.font = '800 15px Orbitron, Inter, sans-serif';
        ctx.fillStyle = p.color;
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      } else if (p.type === 'shard') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -2, p.size, 4);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawTrails(snakes) {
    for (const s of snakes) {
      if (!s.alive) continue;
      const tail = s.pts && s.pts[s.pts.length - 1];
      if (!tail) continue;
      if (s.trail === 'fire' || s.boosting) {
        burst('spark', tail.x, tail.y, s.boosting ? '#FF8A00' : '#FF4D6D', 1, 40);
      } else if (s.trail === 'ion' && Math.random() < 0.7) {
        burst('spark', tail.x, tail.y, skinById(s.skin).head, 1, 30);
      }
    }
  }

  function blurGlow() {
    const w = glow.width;
    const h = glow.height;
    actx.setTransform(1, 0, 0, 1, 0, 0);
    actx.clearRect(0, 0, w, h);
    actx.globalCompositeOperation = 'lighter';
    actx.globalAlpha = 0.34;
    for (let i = -2; i <= 2; i++) actx.drawImage(glow, i * 4, 0);
    b2.setTransform(1, 0, 0, 1, 0, 0);
    b2.clearRect(0, 0, w, h);
    b2.globalCompositeOperation = 'lighter';
    b2.globalAlpha = 0.34;
    for (let i = -2; i <= 2; i++) b2.drawImage(blurA, 0, i * 4);
    b2.globalAlpha = 1;
    b2.globalCompositeOperation = 'source-over';
  }

  function post(ctx, match, menu) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    if (menu) {
      const dim = ctx.createRadialGradient(W / 2, H * 0.42, 30, W / 2, H * 0.42, Math.min(W, H) * 0.48);
      dim.addColorStop(0, 'rgba(3,6,13,0.78)');
      dim.addColorStop(0.55, 'rgba(3,6,13,0.35)');
      dim.addColorStop(1, 'rgba(3,6,13,0)');
      ctx.fillStyle = dim;
      ctx.fillRect(0, 0, W, H);
    }
    if (match && match.player && match.player.slowT > 0) {
      ctx.fillStyle = 'rgba(90, 50, 160, 0.08)';
      ctx.fillRect(0, 0, W, H);
    }
    const danger = match?.danger || 0;
    if (danger > 0.05 || bossPulse > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255, 40, 70, ${Math.max(danger * 0.28, bossPulse * 0.22)})`;
      ctx.fillRect(0, 0, W, 28);
      ctx.fillRect(0, H - 28, W, 28);
      ctx.fillRect(0, 0, 28, H);
      ctx.fillRect(W - 28, 0, 28, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (match?.player?.boosting && match.player.alive) {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.28)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const a = time * 0.8 + (i / 14) * Math.PI * 2;
        const x1 = W / 2 + Math.cos(a) * 80;
        const y1 = H / 2 + Math.sin(a) * 80;
        const x2 = W / 2 + Math.cos(a) * (220 + (i % 3) * 40);
        const y2 = H / 2 + Math.sin(a) * (220 + (i % 3) * 40);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    if (flash > 0 && allowFlash) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.55})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 0.045;
    const tile = 180 * dpr;
    for (let y = 0; y < H; y += tile) {
      for (let x = 0; x < W; x += tile) ctx.drawImage(grain, x, y, tile, tile);
    }
    ctx.globalAlpha = 1;
  }

  function drawMinimap(ctx, match) {
    const size = Math.max(92, Math.min(136, Math.round(Math.min(W, H) * 0.16)));
    const x = 16 * dpr;
    const y = H - size - 16 * dpr;
    const cx = x + size / 2;
    const cy = y + size / 2;
    const scale = (size * 0.46) / ARENA_R;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(3,6,13,0.72)';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = 'rgba(0,240,255,0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, ARENA_R * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < match.orbs.length; i += 3) {
      const o = match.orbs[i];
      ctx.fillStyle = ORB_COLORS[o.kind] || '#7DF9FF';
      ctx.fillRect(cx + o.x * scale, cy + o.y * scale, 2, 2);
    }
    ctx.globalAlpha = 1;
    const all = [...match.snakes, ...(match.remotes || [])];
    for (const s of all) {
      if (!s.alive && s !== match.player) continue;
      ctx.fillStyle = s.isPlayer ? '#00F0FF' : s.isBoss ? '#FFD60A' : skinById(s.skin).head;
      ctx.beginPath();
      ctx.arc(cx + s.x * scale, cy + s.y * scale, s.isPlayer ? 3.5 : s.isBoss ? 4.5 : 2.2, 0, 7);
      ctx.fill();
    }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,240,255,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function present(split) {
    view.setTransform(1, 0, 0, 1, 0, 0);
    view.clearRect(0, 0, W, H);
    view.drawImage(scene, 0, 0);
    if (split > 0.6 && allowFlash) {
      view.globalCompositeOperation = 'screen';
      view.globalAlpha = 0.45;
      view.drawImage(scene, split, 0);
      view.drawImage(scene, -split, 0);
      view.globalAlpha = 1;
      view.globalCompositeOperation = 'source-over';
    }
    if (glitch > 0.02) {
      view.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const y = Math.random() * H;
        const sh = 6 + Math.random() * 18;
        const dx = (Math.random() - 0.5) * 28 * glitch;
        view.drawImage(scene, 0, y, W, sh, dx, y, W, sh);
      }
      view.globalCompositeOperation = 'source-over';
    }
  }

  function focusOf(match) {
    const p = match.player;
    if (!p) return { x: 0, y: 0 };
    if (!p.alive && match.deathX != null) return { x: match.deathX, y: match.deathY };
    const look = 78;
    return {
      x: p.x + Math.cos(p.angle || 0) * look,
      y: p.y + Math.sin(p.angle || 0) * look
    };
  }

  function updateCam(match, dt) {
    const focus = focusOf(match);
    const k = 1 - Math.exp(-dt * 4.2);
    cam.x += (focus.x - cam.x) * k;
    cam.y += (focus.y - cam.y) * k;
    const len = match.player?.length || 16;
    let target = clamp(1.2 - len * 0.0032, 0.74, 1.18);
    if (match.phase === 'countdown') target *= 1 + (match.countdown / 3) * 0.5;
    if (match.phase === 'dying' || match.phase === 'over') target *= 0.86;
    if (showcase) target *= 0.82;
    target *= 1 + kick;
    cam.zoom += (target - cam.zoom) * (1 - Math.exp(-dt * 3));
  }

  function paintWorld(match, biome, pass) {
    const ctx = pass === 'bloom' ? bctx : sctx;
    if (pass === 'bloom') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, glow.width, glow.height);
      ctx.globalCompositeOperation = 'lighter';
    }
    applyCam(ctx, pass === 'bloom' ? glow.width / W : 1);
    if (pass === 'scene') drawArena(ctx, biome, match);
    const snakes = [...match.snakes, ...(match.remotes || [])].filter((s) => s && (s.alive || s === match.player));
    if (pass === 'scene') {
      for (const orb of match.orbs) drawOrb(ctx, orb, 'scene');
      drawParts(ctx);
      snakes.sort((a, b) => a.y - b.y);
      for (const s of snakes) {
        if (s === match.player) continue;
        s.fade = s.alive ? 1 : 0;
        drawSnake(ctx, s, 'scene');
      }
      if (match.player) {
        match.player.fade = match.player.alive ? 1 : clamp((match.dyingT || 0) / 1.15, 0, 1);
        drawSnake(ctx, match.player, 'scene');
      }
    } else {
      for (let i = 0; i < match.orbs.length; i += 1) drawOrb(ctx, match.orbs[i], 'bloom');
      for (const s of snakes) drawSnake(ctx, s, 'bloom');
    }
  }

  function frameMatch(match, dt) {
    resize();
    time += dt;
    shakeX = (Math.random() - 0.5) * shake;
    shakeY = (Math.random() - 0.5) * shake;
    onEvents(match);
    updateParts(dt);
    updateCam(match, dt);
    const biome = BIOMES[biomeIndex(match.player ? (match.hud ? match.hud().level : 1) : 1)];
    const level = match.player ? 1 + Math.floor((match.player.eats || 0) / 8) : 1;
    const biomeUse = BIOMES[biomeIndex(level)];
    drawBackdrop(sctx, biomeUse);
    paintWorld(match, biomeUse, 'scene');
    paintWorld(match, biomeUse, 'bloom');
    blurGlow();
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = 'lighter';
    sctx.globalAlpha = 0.78;
    sctx.drawImage(blurB, 0, 0, W, H);
    sctx.globalAlpha = 1;
    sctx.globalCompositeOperation = 'source-over';
    drawTrails(match.snakes.filter((s) => s && (s.trail === 'ion' || s.trail === 'fire' || s.boosting || s.isBoss)));
    post(sctx, match, false);
    drawMinimap(sctx, match);
    present((flash + glitch) * 8);
    void biome;
  }

  function updateDemo() {
    for (const snake of demo) {
      for (let i = 0; i < snake.pts.length; i++) {
        const a = time * 0.52 - i * 0.15 + snake.shift;
        const rad = 320 + Math.sin(time * 0.8 + i * 0.22 + snake.shift) * 64;
        snake.pts[i].x = Math.cos(a) * rad;
        snake.pts[i].y = Math.sin(a) * rad * 0.7;
      }
      snake.x = snake.pts[0].x;
      snake.y = snake.pts[0].y;
      const n = snake.pts[1];
      snake.angle = Math.atan2(snake.y - n.y, snake.x - n.x);
      snake.alive = true;
      snake.fade = 1;
      snake.hideName = true;
    }
    for (let i = 0; i < demoOrbs.length; i++) {
      const a = time * 0.35 + (i / demoOrbs.length) * Math.PI * 2;
      const rad = 180 + (i % 5) * 70;
      demoOrbs[i].x = Math.cos(a) * rad;
      demoOrbs[i].y = Math.sin(a) * rad * 0.72;
      demoOrbs[i].r = 9;
    }
  }

  function frameMenu(dt) {
    resize();
    time += dt;
    shakeX = 0;
    shakeY = 0;
    updateParts(dt);
    const k = 1 - Math.exp(-dt * 1.4);
    const tx = Math.cos(time * 0.18) * 30;
    const ty = Math.sin(time * 0.14) * 20;
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
    cam.zoom += (1.02 - cam.zoom) * k;
    updateDemo();
    const biome = BIOMES[0];
    drawBackdrop(sctx, biome);
    sctx.save();
    applyCam(sctx, 1);
    drawArena(sctx, biome, { danger: 0.15 + Math.sin(time) * 0.1 });
    for (const orb of demoOrbs) drawOrb(sctx, orb, 'scene');
    for (const snake of demo) drawSnake(sctx, snake, 'scene');
    drawParts(sctx);
    sctx.restore();
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, glow.width, glow.height);
    applyCam(bctx, glow.width / W);
    bctx.globalCompositeOperation = 'lighter';
    for (const orb of demoOrbs) drawOrb(bctx, orb, 'bloom');
    for (const snake of demo) drawSnake(bctx, snake, 'bloom');
    blurGlow();
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = 'lighter';
    sctx.globalAlpha = 0.8;
    sctx.drawImage(blurB, 0, 0, W, H);
    sctx.globalAlpha = 1;
    sctx.globalCompositeOperation = 'source-over';
    post(sctx, null, true);
    present(0);
  }

  return {
    resize,
    drawMenu: frameMenu,
    drawMatch: frameMatch,
    setFx(shakeOn, flashOn) {
      allowShake = shakeOn;
      allowFlash = flashOn;
    },
    setShowcase(on) {
      showcase = !!on;
    },
    getCamera() {
      return cam;
    }
  };
}
