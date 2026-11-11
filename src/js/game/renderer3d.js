/**
 * Rendu combat 3D style fighting game 2026 (caméra side-view cinéma).
 */
import * as THREE from 'three';
import { getCharacter } from '../data/characters.js';
import { createHumanoid, poseHumanoid, applyHumanoidColors, drawHumanPortrait } from './humanoid3d.js';

const FLOOR_Y = 560;

function toWorld(f) {
  return {
    x: (f.x - 640) / 48,
    y: Math.max(0, (FLOOR_Y - (f.radius || 38) - f.y) / 48),
    z: ((f.slot || 0) % 2 === 0 ? -0.15 : 0.15)
  };
}

export class Renderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.w = 1280;
    this.h = 720;
    this.clock = 0;
    this.shake = 0;
    this.zoomPunch = 0;
    this.fighterMeshes = new Map();
    this.fxMeshes = [];
    this.hud = { mode: '1v1', stage: 'Arène' };

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(1280, 720, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x071018, 0.028);

    this.camera = new THREE.PerspectiveCamera(42, 1280 / 720, 0.1, 200);
    this.camera.position.set(0, 3.2, 11.5);

    this.camTarget = new THREE.Vector3(0, 1.6, 0);
    this.camPos = this.camera.position.clone();

    this.buildLights();
    this.buildArena();
    this.buildCrowd();
  }

  buildLights() {
    const hemi = new THREE.HemisphereLight(0xbcd7ff, 0x1a1020, 1.1);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff1d6, 2.2);
    key.position.set(6, 12, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    key.shadow.camera.left = -14;
    key.shadow.camera.right = 14;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -4;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rim.position.set(-8, 4, -6);
    this.scene.add(rim);
    const fill = new THREE.PointLight(0xf472b6, 40, 30, 2);
    fill.position.set(0, 3, 4);
    this.scene.add(fill);
    this.spotL = new THREE.SpotLight(0xfde047, 80, 40, 0.35, 0.4, 1);
    this.spotL.position.set(-4, 8, 2);
    this.scene.add(this.spotL);
    this.spotR = new THREE.SpotLight(0x67e8f9, 80, 40, 0.35, 0.4, 1);
    this.spotR.position.set(4, 8, 2);
    this.scene.add(this.spotR);
  }

  buildArena() {
    // Sky dome
    const skyGeo = new THREE.SphereGeometry(80, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color('#07131f') },
        mid: { value: new THREE.Color('#12304a') },
        bot: { value: new THREE.Color('#1d4d63') }
      },
      vertexShader: `
        varying vec3 vPos;
        void main(){
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
        varying vec3 vPos;
        void main(){
          float h = normalize(vPos).y * 0.5 + 0.5;
          vec3 c = mix(bot, mid, smoothstep(0.0, 0.55, h));
          c = mix(c, top, smoothstep(0.55, 1.0, h));
          gl_FragColor = vec4(c, 1.0);
        }
      `
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(18, 64),
      new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.35,
        metalness: 0.45
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(7.2, 7.6, 64),
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0ea5e9',
        emissiveIntensity: 0.7,
        roughness: 0.3,
        metalness: 0.6,
        side: THREE.DoubleSide
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this.scene.add(ring);

    // Center neon lanes
    for (let i = -3; i <= 3; i++) {
      const lane = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 0.08),
        new THREE.MeshBasicMaterial({ color: i === 0 ? '#fde047' : '#334155', transparent: true, opacity: 0.7 })
      );
      lane.rotation.x = -Math.PI / 2;
      lane.position.set(0, 0.03, i * 1.1);
      this.scene.add(lane);
    }

    // Back LED wall
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(28, 10, 0.4),
      new THREE.MeshStandardMaterial({
        color: '#0b1220',
        emissive: '#12304a',
        emissiveIntensity: 0.35,
        roughness: 0.5,
        metalness: 0.4
      })
    );
    wall.position.set(0, 4.5, -8);
    this.scene.add(wall);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 4.5),
      new THREE.MeshStandardMaterial({
        color: '#082f49',
        emissive: '#0ea5e9',
        emissiveIntensity: 0.55,
        roughness: 0.25
      })
    );
    screen.position.set(0, 5.2, -7.75);
    this.scene.add(screen);

    // Side pylons
    for (const x of [-9, 9]) {
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 6, 0.8),
        new THREE.MeshStandardMaterial({ color: '#111827', metalness: 0.7, roughness: 0.3 })
      );
      pylon.position.set(x, 3, -2);
      pylon.castShadow = true;
      this.scene.add(pylon);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 12),
        new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#facc15', emissiveIntensity: 1.2 })
      );
      lamp.position.set(x, 6.2, -2);
      this.scene.add(lamp);
    }
  }

  buildCrowd() {
    const geo = new THREE.CapsuleGeometry(0.15, 0.35, 2, 6);
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(Math.random(), 0.35, 0.25 + Math.random() * 0.2)
        })
      );
      const side = i % 2 === 0 ? -1 : 1;
      m.position.set((Math.random() - 0.5) * 16, 1.2 + Math.random() * 1.5, side * (6 + Math.random() * 3));
      m.scale.y = 0.8 + Math.random() * 0.5;
      this.scene.add(m);
    }
  }

  resize() {
    // Prefer dedicated stage column (not the whole combat grid with sidebar)
    const layout =
      this._layoutParent ||
      document.getElementById('game-stage') ||
      document.getElementById('wrap') ||
      this._hudHost?.parentElement ||
      this.canvas.parentElement;
    if (!layout) return;
    // If hudHost is nested in layout, measure layout (stage/wrap), never hudHost itself
    const rect = layout.getBoundingClientRect();
    const availW = Math.max(1, rect.width || layout.clientWidth || 1280);
    const availH = Math.max(1, rect.height || layout.clientHeight || 720);
    const scale = Math.min(availW / 1280, availH / 720);
    const w = `${1280 * scale}px`;
    const h = `${720 * scale}px`;
    this.canvas.style.width = w;
    this.canvas.style.height = h;
    if (this._overlay) {
      this._overlay.style.width = '100%';
      this._overlay.style.height = '100%';
    }
    if (this._hudHost) {
      this._hudHost.style.width = w;
      this._hudHost.style.height = h;
      this._hudHost.style.maxWidth = '100%';
      this._hudHost.style.maxHeight = '100%';
    }
  }

  dispose() {
    if (this._overlay?.parentElement) this._overlay.parentElement.removeChild(this._overlay);
    if (this._hudHost) {
      const parent = this._hudHost.parentElement;
      if (parent && this.canvas.parentElement === this._hudHost) {
        parent.insertBefore(this.canvas, this._hudHost);
        parent.removeChild(this._hudHost);
      }
      this._hudHost = null;
    }
    this._overlay = null;
    this._layoutParent = null;
    this.fighterMeshes.clear();
    this.fxMeshes.length = 0;
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
        else obj.material.dispose?.();
      }
    });
    // Dispose GPU resources but keep the canvas WebGL-capable for rematch
    this.renderer.dispose();
  }

  ensureFighter(f) {
    let mesh = this.fighterMeshes.get(f.id);
    if (mesh) return mesh;
    const ch = getCharacter(f.characterId);
    const colored = { ...ch, colors: f.colors || ch.colors };
    mesh = createHumanoid(colored);
    this.scene.add(mesh);
    this.fighterMeshes.set(f.id, mesh);
    return mesh;
  }

  syncFighters(fighters, t) {
    const alive = new Set(fighters.map((f) => f.id));
    for (const [id, mesh] of this.fighterMeshes) {
      if (!alive.has(id)) {
        this.scene.remove(mesh);
        this.fighterMeshes.delete(id);
      }
    }
    for (const f of fighters) {
      if (!f.alive || f.hp <= 0) {
        const m = this.fighterMeshes.get(f.id);
        if (m) m.visible = false;
        continue;
      }
      const mesh = this.ensureFighter(f);
      mesh.visible = true;
      if (f.invuln > 0 && Math.floor(t * 20) % 2 === 0) mesh.visible = Math.floor(t * 30) % 2 === 0;
      applyHumanoidColors(mesh, f.colors || getCharacter(f.characterId).colors);
      const w = toWorld(f);
      mesh.userData.baseY = w.y;
      mesh.position.x = w.x;
      mesh.position.z = w.z;
      poseHumanoid(mesh, f, t);

      if (f.hurtFlash > 0) {
        mesh.traverse((obj) => {
          if (obj.isMesh && obj.material && obj.material.emissive) {
            obj.material.emissiveIntensity = 0.8;
          }
        });
      }
    }
  }

  updateCamera(fighters, dt) {
    const live = fighters.filter((f) => f.alive && f.hp > 0);
    if (!live.length) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let midY = 0;
    for (const f of live) {
      const w = toWorld(f);
      minX = Math.min(minX, w.x);
      maxX = Math.max(maxX, w.x);
      midY += w.y;
    }
    midY /= live.length;
    const midX = (minX + maxX) / 2;
    const span = Math.max(3.5, maxX - minX + 3.2);
    const dist = THREE.MathUtils.clamp(span * 1.35, 8, 16);
    const desired = new THREE.Vector3(midX, 2.4 + midY * 0.35, dist);
    const look = new THREE.Vector3(midX, 1.35 + midY * 0.45, 0);

    this.camPos.lerp(desired, 1 - Math.pow(0.001, dt));
    this.camTarget.lerp(look, 1 - Math.pow(0.001, dt));

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      this.camPos.x += (Math.random() - 0.5) * this.shake * 0.35;
      this.camPos.y += (Math.random() - 0.5) * this.shake * 0.2;
    }
    if (this.zoomPunch > 0) {
      this.zoomPunch = Math.max(0, this.zoomPunch - dt);
      this.camPos.z -= this.zoomPunch * 1.8;
    }

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
    this.spotL.target.position.copy(this.camTarget);
    this.spotR.target.position.copy(this.camTarget);
    this.spotL.target.updateMatrixWorld();
    this.spotR.target.updateMatrixWorld();
  }

  spawnHitFX(x, y, heavy) {
    const w = { x: (x - 640) / 48, y: Math.max(0.4, (FLOOR_Y - y) / 48), z: 0 };
    const geo = new THREE.SphereGeometry(heavy ? 0.35 : 0.18, 10, 8);
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: heavy ? '#fde047' : '#67e8f9', transparent: true, opacity: 0.9 })
    );
    mesh.position.set(w.x, w.y, w.z);
    mesh.userData.life = 0.25;
    this.scene.add(mesh);
    this.fxMeshes.push(mesh);
    if (heavy) this.shake = Math.max(this.shake, 0.35);
    else this.shake = Math.max(this.shake, 0.12);
    this.zoomPunch = Math.max(this.zoomPunch, heavy ? 0.22 : 0.08);
  }

  updateFx(dt) {
    for (let i = this.fxMeshes.length - 1; i >= 0; i--) {
      const m = this.fxMeshes[i];
      m.userData.life -= dt;
      m.scale.multiplyScalar(1 + dt * 6);
      if (m.material) m.material.opacity = Math.max(0, m.userData.life * 3);
      if (m.userData.life <= 0) {
        this.scene.remove(m);
        this.fxMeshes.splice(i, 1);
      }
    }
  }

  drawHUD(ctx, fighters, mode, stageName) {
    // 2D overlay HUD on same canvas after WebGL? Can't easily mix.
    // Use CSS/DOM for play; for Electron we draw via second pass with css? 
    // Store for external HUD or use CSS2D - simplest: draw with 2d context on a sibling.
    // Here we keep WebGL only; Electron app.js has combat-log aside.
    this.hud = { mode, stage: stageName, fighters };
  }

  render(engine) {
    const dt = Math.min(0.05, 1 / 60);
    this.clock = engine.time || this.clock + dt;

    if (engine.fx?.shake?.mag) {
      this.shake = Math.max(this.shake, engine.fx.shake.mag / 40);
    }
    if (engine.fx?.hitstop > 0) {
      this.zoomPunch = Math.max(this.zoomPunch, 0.12);
      this.shake = Math.max(this.shake, 0.18);
    }

    this.syncFighters(engine.fighters, this.clock);
    this.updateCamera(engine.fighters, dt);
    this.updateFx(dt);

    if (!this._flashSeen) this._flashSeen = new Map();
    for (const f of engine.fighters) {
      const prev = this._flashSeen.get(f.id) || 0;
      if ((f.hurtFlash || 0) > 0.12 && prev <= 0.12) {
        this.spawnHitFX(f.x, f.y - 20, f.hurtFlash > 0.22);
      }
      this._flashSeen.set(f.id, f.hurtFlash || 0);
    }

    this.renderer.render(this.scene, this.camera);

    // Overlay bars with 2D context on top via UI canvas if present
    this.paintOverlay(engine);
  }

  paintOverlay(engine) {
    if (!this._hudHost && this.canvas.parentElement) {
      // Stage/wrap is the size source; hudHost nests inside it
      const stage =
        this.canvas.closest('#game-stage, #wrap, .game-stage') || this.canvas.parentElement;
      this._layoutParent = stage;
      const parent = this.canvas.parentElement;
      const host = document.createElement('div');
      host.className = 'hud3d-host';
      host.style.cssText = 'position:relative;display:inline-block;line-height:0;max-width:100%;max-height:100%';
      parent.insertBefore(host, this.canvas);
      host.appendChild(this.canvas);
      const overlay = document.createElement('canvas');
      overlay.className = 'hud3d';
      overlay.width = 1280;
      overlay.height = 720;
      overlay.style.cssText =
        'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:2';
      host.appendChild(overlay);
      this._hudHost = host;
      this._overlay = overlay;
      this.resize();
    }
    const overlay = this._overlay;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, 1280, 720);
    const slots = engine.fighters.slice().sort((a, b) => a.slot - b.slot);
    slots.forEach((f, i) => {
      const x = 40 + (i % 2) * 640;
      const y = i < 2 ? 24 : 100;
      this.drawBar(ctx, f, x, y);
    });
    ctx.font = '800 14px "Exo 2", "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(226,232,240,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(`${(engine.mode || '1v1').toUpperCase()} · 3D ARENA · ${engine.stage?.name || 'Ring'}`, 640, 18);
  }

  drawBar(ctx, f, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(7,17,31,0.72)';
    ctx.strokeStyle = f.transformed ? '#fde047' : f.colors?.accent || '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, 300, 70, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 16px "Exo 2", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(f.transformed ? `${f.name} ★` : f.name, x + 14, y + 24);
    // HP
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 14, y + 34, 200, 10);
    const hpPct = Math.max(0, f.hp / (f.maxHp || 100));
    const hg = ctx.createLinearGradient(x + 14, 0, x + 214, 0);
    hg.addColorStop(0, '#22c55e');
    hg.addColorStop(1, '#fde047');
    ctx.fillStyle = hg;
    ctx.fillRect(x + 14, y + 34, 200 * hpPct, 10);
    // Ki
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 14, y + 50, 200, 8);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x + 14, y + 50, 200 * Math.max(0, (f.ki || 0) / 100), 8);
    if (f.comboCount > 1) {
      ctx.fillStyle = '#67e8f9';
      ctx.font = '800 15px "Exo 2", sans-serif';
      ctx.fillText(`${f.comboCount} HITS`, x + 230, y + 42);
    }
    ctx.restore();
  }
}

export { drawHumanPortrait };
