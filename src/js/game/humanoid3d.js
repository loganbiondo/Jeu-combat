/**
 * Combattants humains 3D procéduraux (proportions réalistes, skins, poses).
 */
import * as THREE from 'three';

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.55,
    metalness: opts.metalness ?? 0.08,
    emissive: opts.emissive || '#000000',
    emissiveIntensity: opts.emissiveIntensity || 0
  });
}

function limb(group, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

export function createHumanoid(ch) {
  const colors = ch.colors || {};
  const app = ch.appearance || { sex: 'm', hair: 'short', build: 'athletic', height: 1 };
  const root = new THREE.Group();
  root.userData.characterId = ch.id;

  const skin = mat(colors.body || '#c68642', { roughness: 0.62 });
  const cloth = mat(colors.cloth || colors.outline || '#1e293b', { roughness: 0.7 });
  const accent = mat(colors.accent || '#38bdf8', { roughness: 0.4, metalness: 0.25, emissive: colors.accent || '#38bdf8', emissiveIntensity: 0.15 });
  const hairMat = mat(colors.hair || '#1c1917', { roughness: 0.85 });
  const eyeWhite = mat('#f8fafc', { roughness: 0.3 });
  const eyeDark = mat('#0f172a', { roughness: 0.4 });

  const heavy = app.build === 'heavy';
  const slim = app.build === 'slim';
  const torsoW = heavy ? 0.42 : slim ? 0.3 : 0.34;
  const torsoD = heavy ? 0.24 : 0.2;
  const hipW = heavy ? 0.36 : slim ? 0.26 : 0.3;
  const scaleY = app.height || 1;

  const pelvis = limb(root, new THREE.BoxGeometry(hipW, 0.18, torsoD * 0.95), cloth, 0, 0.95, 0);
  const torso = limb(root, new THREE.BoxGeometry(torsoW, 0.55, torsoD), cloth, 0, 1.32, 0);
  const chestAccent = limb(root, new THREE.BoxGeometry(torsoW * 0.55, 0.12, torsoD * 1.05), accent, 0, 1.42, 0.02);

  const neck = limb(root, new THREE.CylinderGeometry(0.07, 0.08, 0.12, 10), skin, 0, 1.66, 0);
  const head = limb(root, new THREE.SphereGeometry(app.sex === 'f' ? 0.17 : 0.18, 18, 14), skin, 0, 1.88, 0);
  head.scale.set(1, 1.08, 0.95);

  // Face
  limb(head, new THREE.SphereGeometry(0.035, 10, 8), eyeWhite, -0.055, 0.02, 0.14);
  limb(head, new THREE.SphereGeometry(0.035, 10, 8), eyeWhite, 0.055, 0.02, 0.14);
  limb(head, new THREE.SphereGeometry(0.018, 8, 8), eyeDark, -0.055, 0.02, 0.17);
  limb(head, new THREE.SphereGeometry(0.018, 8, 8), eyeDark, 0.055, 0.02, 0.17);
  limb(head, new THREE.SphereGeometry(0.025, 8, 8), skin, 0, -0.02, 0.16);

  addHair(head, app.hair, hairMat, app.sex);

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.055, 0.28, 4, 8);
  const forearmGeo = new THREE.CapsuleGeometry(0.048, 0.26, 4, 8);
  const Larm = new THREE.Group();
  Larm.position.set(-(torsoW / 2 + 0.06), 1.48, 0);
  root.add(Larm);
  const Lupper = limb(Larm, armGeo, skin, 0, -0.18, 0);
  const Lfore = limb(Larm, forearmGeo, skin, 0, -0.48, 0);
  const Lhand = limb(Larm, new THREE.SphereGeometry(0.055, 10, 8), skin, 0, -0.68, 0);

  const Rarm = new THREE.Group();
  Rarm.position.set(torsoW / 2 + 0.06, 1.48, 0);
  root.add(Rarm);
  const Rupper = limb(Rarm, armGeo, skin, 0, -0.18, 0);
  const Rfore = limb(Rarm, forearmGeo, skin, 0, -0.48, 0);
  const Rhand = limb(Rarm, new THREE.SphereGeometry(0.055, 10, 8), skin, 0, -0.68, 0);

  // Legs
  const thighGeo = new THREE.CapsuleGeometry(heavy ? 0.09 : 0.07, 0.36, 4, 8);
  const shinGeo = new THREE.CapsuleGeometry(0.06, 0.34, 4, 8);
  const Lleg = new THREE.Group();
  Lleg.position.set(-0.11, 0.88, 0);
  root.add(Lleg);
  limb(Lleg, thighGeo, cloth, 0, -0.22, 0);
  limb(Lleg, shinGeo, skin, 0, -0.58, 0);
  limb(Lleg, new THREE.BoxGeometry(0.12, 0.07, 0.22), mat('#111827'), 0, -0.82, 0.04);

  const Rleg = new THREE.Group();
  Rleg.position.set(0.11, 0.88, 0);
  root.add(Rleg);
  limb(Rleg, thighGeo, cloth, 0, -0.22, 0);
  limb(Rleg, shinGeo, skin, 0, -0.58, 0);
  limb(Rleg, new THREE.BoxGeometry(0.12, 0.07, 0.22), mat('#111827'), 0, -0.82, 0.04);

  // Ki aura ring (hidden until transform)
  const aura = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.03, 8, 32),
    mat(colors.accent || '#fde047', { emissive: colors.accent || '#fde047', emissiveIntensity: 0.8, roughness: 0.2 })
  );
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 1.0;
  aura.visible = false;
  root.add(aura);

  const baseScale = 1.55 * scaleY;
  root.scale.setScalar(baseScale);
  root.userData.baseScale = baseScale;
  root.userData.parts = { Larm, Rarm, Lleg, Rleg, torso, pelvis, head, aura, skinMats: [skin], accent, cloth };
  root.userData.baseY = 0;
  return root;
}

function addHair(head, style, hairMat, sex) {
  if (style === 'buzz') {
    limb(head, new THREE.SphereGeometry(0.175, 12, 10), hairMat, 0, 0.04, -0.01).scale.set(1.02, 0.7, 1.02);
    return;
  }
  if (style === 'fade') {
    limb(head, new THREE.SphereGeometry(0.178, 12, 10), hairMat, 0, 0.05, -0.02).scale.set(1.05, 0.75, 1.05);
    return;
  }
  if (style === 'spiky' || style === 'messy') {
    for (let i = 0; i < 7; i++) {
      const spike = limb(head, new THREE.ConeGeometry(0.05, 0.18, 6), hairMat, (i - 3) * 0.04, 0.14, -0.02 + (i % 2) * 0.03);
      spike.rotation.z = (i - 3) * 0.15;
      spike.rotation.x = -0.4;
    }
    return;
  }
  if (style === 'ponytail') {
    limb(head, new THREE.SphereGeometry(0.18, 12, 10), hairMat, 0, 0.06, -0.02).scale.set(1.05, 0.85, 1.08);
    const tail = limb(head, new THREE.CapsuleGeometry(0.045, 0.28, 4, 8), hairMat, 0, -0.05, -0.18);
    tail.rotation.x = 0.6;
    return;
  }
  if (style === 'bob') {
    limb(head, new THREE.SphereGeometry(0.19, 14, 12), hairMat, 0, 0.02, -0.02).scale.set(1.12, 0.9, 1.15);
    return;
  }
  if (style === 'long') {
    limb(head, new THREE.SphereGeometry(0.185, 14, 12), hairMat, 0, 0.05, -0.02).scale.set(1.08, 0.9, 1.12);
    limb(head, new THREE.BoxGeometry(0.28, 0.35, 0.12), hairMat, 0, -0.12, -0.12);
    return;
  }
  // short / medium default
  const dome = limb(head, new THREE.SphereGeometry(0.185, 14, 12), hairMat, 0, 0.05, -0.02);
  dome.scale.set(1.08, sex === 'f' ? 0.88 : 0.8, 1.1);
}

export function applyHumanoidColors(root, colors) {
  if (!root?.userData?.parts) return;
  const { skinMats, accent, cloth, aura } = root.userData.parts;
  if (colors.body && skinMats?.[0]) skinMats[0].color.set(colors.body);
  if (colors.accent && accent) {
    accent.color.set(colors.accent);
    accent.emissive.set(colors.accent);
  }
  if (colors.cloth && cloth) cloth.color.set(colors.cloth);
  if (aura && colors.accent) {
    aura.material.color.set(colors.accent);
    aura.material.emissive.set(colors.accent);
  }
}

export function poseHumanoid(root, f, t) {
  if (!root?.userData?.parts) return;
  const { Larm, Rarm, Lleg, Rleg, torso, head, aura } = root.userData.parts;
  const action = f.action || 'idle';
  const facing = f.facing || 1;
  const bob = Math.sin(t * 6) * 0.02;
  root.rotation.y = facing >= 0 ? Math.PI / 2 : -Math.PI / 2;
  root.rotation.z = 0;
  root.rotation.x = 0;

  // reset
  Larm.rotation.set(0, 0, 0.12);
  Rarm.rotation.set(0, 0, -0.12);
  Lleg.rotation.set(0, 0, 0);
  Rleg.rotation.set(0, 0, 0);
  torso.rotation.set(0, 0, 0);
  head.rotation.set(0, 0, 0);
  root.position.y = root.userData.baseY + (action === 'idle' ? bob : 0);

  if (action === 'attack') {
    Rarm.rotation.x = -1.6;
    Rarm.rotation.z = -0.3;
    Larm.rotation.x = 0.4;
    torso.rotation.y = 0.35 * facing;
    root.position.z += 0.05;
  } else if (action === 'special' || action === 'ultra') {
    Larm.rotation.x = -1.8;
    Rarm.rotation.x = -1.8;
    torso.rotation.x = -0.2;
    head.rotation.x = -0.15;
  } else if (action === 'charge') {
    Larm.rotation.x = -0.8;
    Rarm.rotation.x = -0.8;
    Larm.rotation.z = 0.6;
    Rarm.rotation.z = -0.6;
    torso.rotation.x = 0.15;
  } else if (action === 'hurt') {
    torso.rotation.x = -0.25;
    head.rotation.x = 0.2;
    Larm.rotation.x = 0.5;
    Rarm.rotation.x = 0.5;
    root.rotation.z = facing * 0.12;
  } else if (!f.onGround) {
    Lleg.rotation.x = -0.5;
    Rleg.rotation.x = 0.35;
    Larm.rotation.z = 0.5;
    Rarm.rotation.z = -0.5;
  } else if (Math.abs(f.vx) > 40) {
    const swing = Math.sin(t * 12) * 0.55;
    Lleg.rotation.x = swing;
    Rleg.rotation.x = -swing;
    Larm.rotation.x = -swing * 0.7;
    Rarm.rotation.x = swing * 0.7;
  } else {
    Larm.rotation.x = Math.sin(t * 3) * 0.08;
    Rarm.rotation.x = Math.cos(t * 3) * 0.08;
  }

  if (f.shielding) {
    Larm.rotation.x = -1.1;
    Rarm.rotation.x = -1.1;
    Larm.rotation.z = 0.9;
    Rarm.rotation.z = -0.9;
  }

  aura.visible = !!f.transformed;
  if (f.transformed) {
    aura.rotation.z = t * 3;
    aura.scale.setScalar(1 + Math.sin(t * 8) * 0.08);
  }

  const squash = f.impactSquash || 0;
  const boost = f.transformed ? 1.1 : 1;
  const s = (root.userData.baseScale || 1.55) * boost;
  root.scale.set(s * (1 + squash * 0.2), s * (1 - squash * 0.28), s);
}

/** Portrait 2D stylisé humain pour menus */
export function drawHumanPortrait(ctx, ch, size = 120) {
  const c = ch.colors || {};
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#0b1220');
  bg.addColorStop(1, c.accent || '#38bdf8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size * 0.58;
  const s = size / 120;

  // shoulders
  ctx.fillStyle = c.cloth || '#1e293b';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 28 * s, 38 * s, 22 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // neck + head
  ctx.fillStyle = c.body || '#c68642';
  ctx.fillRect(cx - 6 * s, cy - 8 * s, 12 * s, 14 * s);
  ctx.beginPath();
  ctx.ellipse(cx, cy - 22 * s, 18 * s, 22 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // hair
  ctx.fillStyle = c.hair || '#1c1917';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 30 * s, 19 * s, 14 * s, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(cx - 6 * s, cy - 22 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.arc(cx + 6 * s, cy - 22 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // accent stripe
  ctx.strokeStyle = c.accent || '#38bdf8';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 20 * s, cy + 18 * s);
  ctx.lineTo(cx + 20 * s, cy + 18 * s);
  ctx.stroke();

  ctx.restore();
}
