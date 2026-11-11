/**
 * Sprites canvas originaux — chaque perso a une silhouette et des détails uniques.
 */
function shade(hex, amt) {
  const n = hex.replace('#', '');
  const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

function limb(ctx, x1, y1, x2, y2, w, color, outline) {
  ctx.strokeStyle = outline;
  ctx.lineWidth = w + 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function eyes(ctx, x, y, gap = 7, r = 3.2, happy = true) {
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + gap, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + 1, y - 1, r * 0.35, 0, Math.PI * 2);
  ctx.arc(x + gap + 1, y - 1, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  if (happy) {
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + gap / 2, y + 6, 4, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }
}

function bob(t, amp = 2) {
  return Math.sin(t * 6) * amp;
}

/** Dessine le perso centré en (0,0), face vers +x (scale facing à l'extérieur) */
export function drawCharacterSprite(ctx, id, colors, t, action = 'idle') {
  const c = colors;
  const o = c.outline;
  const body = c.body;
  const accent = c.accent;
  const dark = shade(body, -40);
  const light = shade(body, 35);
  const hop = action === 'idle' ? bob(t) : action === 'attack' ? -2 : 0;
  ctx.save();
  ctx.translate(0, hop);

  const drawers = {
    lumo: drawLumo,
    pebble: drawPebble,
    nori: drawNori,
    capra: drawCapra,
    mossy: drawMossy,
    zib: drawZib,
    kira: drawKira,
    bolt: drawBolt,
    quillox: drawQuillox,
    ironpaw: drawIronpaw,
    velvet: drawVelvet
  };
  (drawers[id] || drawLumo)(ctx, { body, accent, o, dark, light, t, action });
  ctx.restore();
}

function drawLumo(ctx, p) {
  // Soft alien with light wings
  ctx.fillStyle = 'rgba(254,240,138,0.35)';
  ctx.beginPath();
  ctx.ellipse(-18, -6, 14, 22, -0.5, 0, Math.PI * 2);
  ctx.ellipse(-8, -16, 12, 18, -0.2, 0, Math.PI * 2);
  ctx.fill();
  limb(ctx, -6, 10, -14, 26, 7, p.body, p.o);
  limb(ctx, 6, 10, 12, 26, 7, p.body, p.o);
  limb(ctx, -10, 0, -22, -8, 6, p.accent, p.o);
  limb(ctx, 10, 0, 20, 6, 6, p.accent, p.o);
  // torso
  const g = ctx.createLinearGradient(-16, -20, 16, 24);
  g.addColorStop(0, p.light);
  g.addColorStop(1, p.dark);
  ctx.fillStyle = g;
  ctx.strokeStyle = p.o;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, 8);
  ctx.quadraticCurveTo(-20, -10, -6, -22);
  ctx.quadraticCurveTo(0, -28, 8, -20);
  ctx.quadraticCurveTo(20, -6, 14, 10);
  ctx.quadraticCurveTo(0, 22, -14, 8);
  ctx.fill();
  ctx.stroke();
  // antennae
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-4, -22);
  ctx.quadraticCurveTo(-10, -36, -2, -40);
  ctx.moveTo(6, -20);
  ctx.quadraticCurveTo(14, -34, 10, -42);
  ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.arc(-2, -40, 4, 0, Math.PI * 2);
  ctx.arc(10, -42, 4, 0, Math.PI * 2);
  ctx.fill();
  eyes(ctx, 0, -10, 9, 3.4);
  // chest star
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const r = i % 2 ? 4 : 9;
    const x = Math.cos(a) * r;
    const y = 4 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawPebble(ctx, p) {
  // Rock turtle-cat
  ctx.fillStyle = p.dark;
  ctx.strokeStyle = p.o;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 6, 26, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // moss patches
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.ellipse(-10, 0, 8, 5, -0.4, 0, Math.PI * 2);
  ctx.ellipse(8, 4, 7, 4, 0.3, 0, Math.PI * 2);
  ctx.ellipse(0, -4, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // head
  const g = ctx.createRadialGradient(-2, -14, 2, 0, -10, 18);
  g.addColorStop(0, p.light);
  g.addColorStop(1, p.body);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(4, -12, 16, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // ears rocks
  ctx.fillStyle = p.dark;
  ctx.beginPath();
  ctx.moveTo(-8, -22);
  ctx.lineTo(-14, -34);
  ctx.lineTo(-2, -26);
  ctx.moveTo(10, -22);
  ctx.lineTo(18, -34);
  ctx.lineTo(14, -20);
  ctx.fill();
  eyes(ctx, 0, -14, 8, 3);
  // smile
  ctx.strokeStyle = p.o;
  ctx.beginPath();
  ctx.arc(4, -8, 5, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // feet
  ctx.fillStyle = p.body;
  ctx.beginPath();
  ctx.ellipse(-12, 22, 8, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(12, 22, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawNori(ctx, p) {
  // Human cook acrobat
  limb(ctx, -6, 12, -10, 28, 6, '#f5c6a5', p.o);
  limb(ctx, 6, 12, 12, 28, 6, '#f5c6a5', p.o);
  // scarf flowing
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.moveTo(10, -4);
  ctx.quadraticCurveTo(28, 0, 34, 12 + Math.sin(p.t * 8) * 3);
  ctx.quadraticCurveTo(22, 8, 10, 4);
  ctx.fill();
  // body gi
  ctx.fillStyle = p.body;
  ctx.strokeStyle = p.o;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 14);
  ctx.lineTo(-14, -6);
  ctx.lineTo(-8, -14);
  ctx.lineTo(10, -14);
  ctx.lineTo(14, -4);
  ctx.lineTo(12, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // sash
  ctx.fillStyle = p.accent;
  ctx.fillRect(-12, 2, 24, 5);
  // head
  ctx.fillStyle = '#f5c6a5';
  ctx.beginPath();
  ctx.arc(0, -22, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // hair bun
  ctx.fillStyle = '#3f1d0f';
  ctx.beginPath();
  ctx.ellipse(0, -30, 10, 6, 0, 0, Math.PI * 2);
  ctx.arc(8, -34, 6, 0, Math.PI * 2);
  ctx.fill();
  eyes(ctx, -4, -23, 8, 2.8);
  // wok
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(22, 2, 10, 5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, 2);
  ctx.lineTo(22, 2);
  ctx.stroke();
  // sparkles in wok
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.arc(20, -2, 2, 0, Math.PI * 2);
  ctx.arc(25, 0, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCapra(ctx, p) {
  // Pirate goat
  limb(ctx, -8, 10, -12, 26, 7, p.body, p.o);
  limb(ctx, 8, 10, 14, 26, 7, p.body, p.o);
  ctx.fillStyle = p.body;
  ctx.strokeStyle = p.o;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 4, 16, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // coat
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.moveTo(-14, -2);
  ctx.lineTo(-18, 16);
  ctx.lineTo(18, 16);
  ctx.lineTo(14, -2);
  ctx.closePath();
  ctx.fill();
  // head
  ctx.fillStyle = p.light;
  ctx.beginPath();
  ctx.ellipse(2, -16, 13, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // horns
  ctx.strokeStyle = p.o;
  ctx.fillStyle = '#e7e5e4';
  ctx.beginPath();
  ctx.moveTo(-6, -24);
  ctx.quadraticCurveTo(-18, -38, -8, -42);
  ctx.quadraticCurveTo(-4, -34, -2, -26);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -24);
  ctx.quadraticCurveTo(22, -40, 14, -44);
  ctx.quadraticCurveTo(10, -34, 10, -24);
  ctx.fill();
  // eyepatch
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-2, -16, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -20);
  ctx.lineTo(10, -12);
  ctx.stroke();
  eyes(ctx, 4, -16, 0, 3.2, false);
  // bandana
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.ellipse(2, -24, 12, 5, 0, Math.PI, Math.PI * 2);
  ctx.fill();
}

function drawMossy(ctx, p) {
  // Forest guardian golem-soft
  limb(ctx, -10, 8, -16, 24, 9, p.dark, p.o);
  limb(ctx, 10, 8, 16, 24, 9, p.dark, p.o);
  ctx.fillStyle = p.body;
  ctx.strokeStyle = p.o;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-16, -8, 32, 28, 10);
  ctx.fill();
  ctx.stroke();
  // leaf cape
  ctx.fillStyle = p.accent;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(-20 + i * 4, -4 + (i % 2) * 4, 6, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // head mask
  ctx.fillStyle = p.light;
  ctx.beginPath();
  ctx.arc(0, -18, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // vine crown
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -18, 16, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.fillStyle = '#86efac';
  ctx.beginPath();
  ctx.ellipse(-10, -32, 5, 8, -0.3, 0, Math.PI * 2);
  ctx.ellipse(8, -34, 5, 9, 0.2, 0, Math.PI * 2);
  ctx.fill();
  eyes(ctx, -5, -18, 10, 3.5);
  // rune chest
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(-6, 2, 12, 12);
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, 14);
  ctx.moveTo(-6, 8);
  ctx.lineTo(6, 8);
  ctx.stroke();
}

function drawZib(ctx, p) {
  // Chaotic pink alien blob with sparks
  const wiggle = Math.sin(p.t * 10) * 2;
  ctx.fillStyle = p.body;
  ctx.strokeStyle = p.o;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-16, 8);
  ctx.quadraticCurveTo(-22 + wiggle, -10, -4, -24);
  ctx.quadraticCurveTo(4, -30, 14, -18);
  ctx.quadraticCurveTo(24 - wiggle, 0, 16, 14);
  ctx.quadraticCurveTo(0, 24, -16, 8);
  ctx.fill();
  ctx.stroke();
  // big smile
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(2, -2, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.o;
  ctx.beginPath();
  ctx.ellipse(2, 0, 8, 4, 0, 0, Math.PI);
  ctx.fill();
  eyes(ctx, -4, -14, 12, 4.2);
  // antenna ball
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(0, -38);
  ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.arc(0, -40, 5, 0, Math.PI * 2);
  ctx.fill();
  // spark orbits
  for (let i = 0; i < 3; i++) {
    const a = p.t * 8 + i * 2.1;
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 26, Math.sin(a) * 16, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawKira(ctx, p) {
  // Parkour champion
  limb(ctx, -7, 12, -8, 28, 6, '#f5c6a5', p.o);
  limb(ctx, 5, 12, 14, 26, 6, '#f5c6a5', p.o);
  // jacket
  ctx.fillStyle = p.body;
  ctx.strokeStyle = p.o;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-13, 14);
  ctx.lineTo(-12, -8);
  ctx.lineTo(12, -8);
  ctx.lineTo(13, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.fillRect(-12, 0, 24, 4);
  // head
  ctx.fillStyle = '#f5c6a5';
  ctx.beginPath();
  ctx.arc(0, -18, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // spiky hair
  ctx.fillStyle = '#854d0e';
  ctx.beginPath();
  ctx.moveTo(-10, -22);
  ctx.lineTo(-6, -36);
  ctx.lineTo(-2, -24);
  ctx.lineTo(2, -38);
  ctx.lineTo(6, -24);
  ctx.lineTo(12, -34);
  ctx.lineTo(10, -20);
  ctx.closePath();
  ctx.fill();
  eyes(ctx, -4, -18, 8, 2.8);
  // solar fist glow
  const glow = ctx.createRadialGradient(20, 0, 2, 20, 0, 14);
  glow.addColorStop(0, '#fff');
  glow.addColorStop(0.4, p.body);
  glow.addColorStop(1, 'rgba(253,224,71,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(18, 2, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.arc(18, 2, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawBolt(ctx, p) {
  // Electric squirrel
  // tail
  ctx.fillStyle = p.accent;
  ctx.strokeStyle = p.o;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.quadraticCurveTo(-28, -10, -18, -28);
  ctx.quadraticCurveTo(-6, -16, -4, 4);
  ctx.fill();
  ctx.stroke();
  // sparks on tail
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-20, -20, 2, 0, Math.PI * 2);
  ctx.arc(-14, -12, 1.5, 0, Math.PI * 2);
  ctx.fill();
  limb(ctx, -6, 12, -10, 26, 5, p.body, p.o);
  limb(ctx, 6, 12, 12, 26, 5, p.body, p.o);
  ctx.fillStyle = p.body;
  ctx.beginPath();
  ctx.ellipse(0, 4, 13, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // head
  ctx.beginPath();
  ctx.ellipse(2, -14, 12, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // ears
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.lineTo(-10, -34);
  ctx.lineTo(0, -24);
  ctx.moveTo(8, -20);
  ctx.lineTo(14, -34);
  ctx.lineTo(12, -18);
  ctx.fill();
  ctx.stroke();
  eyes(ctx, -2, -14, 8, 3);
  // cheek fluff
  ctx.fillStyle = p.light;
  ctx.beginPath();
  ctx.ellipse(-8, -8, 4, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(10, -8, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // bolt emblem
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(6, 4);
  ctx.lineTo(1, 4);
  ctx.lineTo(4, 12);
  ctx.lineTo(-4, 4);
  ctx.lineTo(1, 4);
  ctx.closePath();
  ctx.fill();
}

function drawQuillox(ctx, p) {
  // Feather alien
  for (let i = 0; i < 7; i++) {
    const a = -1.2 + i * 0.35;
    ctx.fillStyle = i % 2 ? p.accent : p.body;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 8 - 16, Math.sin(a) * 10 - 4, 5, 14, a, 0, Math.PI * 2);
    ctx.fill();
  }
  limb(ctx, -6, 12, -12, 26, 6, p.body, p.o);
  limb(ctx, 6, 12, 12, 26, 6, p.body, p.o);
  ctx.fillStyle = p.body;
  ctx.strokeStyle = p.o;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 2, 15, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.light;
  ctx.beginPath();
  ctx.ellipse(2, -16, 13, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  eyes(ctx, -2, -16, 9, 3.2);
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.ellipse(0, 6, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawIronpaw(ctx, p) {
  // Armored feline
  limb(ctx, -10, 10, -14, 26, 8, p.dark, p.o);
  limb(ctx, 10, 10, 16, 26, 8, p.dark, p.o);
  // armor torso
  const g = ctx.createLinearGradient(-16, -10, 16, 20);
  g.addColorStop(0, p.light);
  g.addColorStop(1, p.dark);
  ctx.fillStyle = g;
  ctx.strokeStyle = p.o;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-16, -6, 32, 26, 6);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(-10, 0, 20, 12);
  // head
  ctx.fillStyle = p.body;
  ctx.beginPath();
  ctx.ellipse(2, -18, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.o;
  ctx.lineWidth = 3;
  ctx.stroke();
  // cat ears armor
  ctx.fillStyle = p.dark;
  ctx.beginPath();
  ctx.moveTo(-8, -26);
  ctx.lineTo(-12, -40);
  ctx.lineTo(0, -28);
  ctx.moveTo(8, -24);
  ctx.lineTo(16, -40);
  ctx.lineTo(14, -22);
  ctx.fill();
  eyes(ctx, -4, -18, 10, 3);
  // claw glow
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.moveTo(18, 4);
  ctx.lineTo(30, -2);
  ctx.lineTo(30, 10);
  ctx.closePath();
  ctx.fill();
}

function drawVelvet(ctx, p) {
  // Elegant anti-hero
  // cape
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.moveTo(-8, -8);
  ctx.quadraticCurveTo(-30, 10, -20, 28);
  ctx.quadraticCurveTo(-4, 18, 0, 8);
  ctx.fill();
  limb(ctx, -6, 12, -8, 28, 5, '#e8b4c8', p.o);
  limb(ctx, 6, 12, 12, 28, 5, '#e8b4c8', p.o);
  ctx.fillStyle = p.body;
  ctx.strokeStyle = p.o;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 14);
  ctx.lineTo(-11, -8);
  ctx.lineTo(11, -8);
  ctx.lineTo(12, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // head
  ctx.fillStyle = '#e8b4c8';
  ctx.beginPath();
  ctx.arc(0, -18, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // long hair
  ctx.fillStyle = '#4a044e';
  ctx.beginPath();
  ctx.moveTo(-10, -20);
  ctx.quadraticCurveTo(-18, 0, -8, 16);
  ctx.lineTo(-4, -8);
  ctx.quadraticCurveTo(-8, -24, 0, -28);
  ctx.quadraticCurveTo(12, -24, 10, -8);
  ctx.lineTo(14, 14);
  ctx.quadraticCurveTo(20, 0, 10, -20);
  ctx.closePath();
  ctx.fill();
  eyes(ctx, -4, -18, 8, 2.6, false);
  // smirk
  ctx.strokeStyle = p.o;
  ctx.beginPath();
  ctx.arc(2, -12, 4, 0.1, Math.PI * 0.7);
  ctx.stroke();
  // void orb
  const orb = ctx.createRadialGradient(18, 0, 1, 18, 0, 10);
  orb.addColorStop(0, '#f5d0fe');
  orb.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(18, 0, 9, 0, Math.PI * 2);
  ctx.fill();
}

/** Portrait carré pour UI (sélection) */
export function drawPortrait(ctx, id, colors, size = 120) {
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, shade(colors.body, 20));
  bg.addColorStop(1, shade(colors.outline, 10));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  // vignette rings
  ctx.strokeStyle = colors.accent;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.translate(size / 2, size * 0.58);
  ctx.scale(size / 90, size / 90);
  drawCharacterSprite(ctx, id, colors, 0.5, 'idle');
  ctx.restore();
}
