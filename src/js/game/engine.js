import { getCharacter, SKINS } from '../data/characters.js';
import { getTechnique } from '../data/techniques.js';
import { getStage } from './stages.js';
import { FXSystem } from './fx.js';
import { audio } from './audio.js';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function randRange(a, b) {
  return a + Math.random() * (b - a);
}

export class Fighter {
  constructor(opts) {
    const ch = getCharacter(opts.characterId);
    const skin = opts.skinId && SKINS[ch.id]?.[opts.skinId];
    this.id = opts.id;
    this.slot = opts.slot;
    this.team = opts.team;
    this.characterId = ch.id;
    this.name = opts.name || ch.name;
    this.colors = skin ? { ...ch.colors, ...skin } : { ...ch.colors };
    this.stats = { ...ch.stats };
    this.specials = [...ch.specials];
    this.ultraId = opts.ultraId || ch.ultra;
    this.bonusTechs = opts.bonusTechs || [];

    this.x = opts.x;
    this.y = opts.y;
    this.vx = 0;
    this.vy = 0;
    this.facing = opts.facing || 1;
    this.baseRadius = 38;
    this.radius = 38;
    this.drawScale = 1.85;
    this.onGround = false;
    this.jumps = 2;
    this.percent = 0;
    this.hp = this.stats.hp;
    this.maxHp = this.stats.hp;
    this.ki = 30;
    this.maxKi = 100;
    this.stocks = opts.stocks ?? 1; // 1 = un round (HP)
    this.roundsWon = 0;
    this.alive = true;
    this.invuln = 0;
    this.attackCd = 0;
    this.specialCd = 0;
    this.ultraCd = 0;
    this.blastCd = 0;
    this.dashCd = 0;
    this.transformCd = 0;
    this.actionTimer = 0;
    this.action = 'idle';
    this.shieldTimer = 0;
    this.shielding = false;
    this.hitstun = 0;
    this.hurtFlash = 0;
    this.impactSquash = 0;
    this.respawnTimer = 0;
    this.combo = 0;
    this.jabStep = 0;
    this.jabWindow = 0;
    this.chargeTimer = 0;
    this.pendingUltra = null;
    this.spectacleTimer = 0;
    this.spectacleHits = 0;
    this.pendingHit = null;
    this.fastFall = false;
    this.jumpHeld = false;
    this.comboCount = 0;
    this.baseColors = { ...this.colors };
    this.baseStats = { ...this.stats };
    this.transformData = ch.transform || null;
    this.transformed = false;
    this.transformTimer = 0;
    this.transformName = '';
  }

  get dead() {
    return this.stocks <= 0;
  }
}

export class CombatEngine {
  constructor(config) {
    this.mode = config.mode || '1v1';
    this.online = !!config.online;
    this.stage = getStage(config.stageId);
    this.fx = new FXSystem();
    this.log = [];
    this.time = 0;
    this.ended = false;
    this.winnerTeams = null;
    this.fighters = (config.fighters || []).map((f, i) => {
      const spawn = this.stage.spawns[i] || this.stage.spawns[0];
      return new Fighter({
        ...f,
        x: spawn.x,
        y: spawn.y,
        facing: i % 2 === 0 ? 1 : -1,
        stocks: config.stocks ?? 1
      });
    });
    this.host = config.host !== false;
    this.round = 1;
    this.pushLog('Round 1 — Combat style DBZ / Tekken / SF !');
  }

  pushLog(msg) {
    const stamp = this.time.toFixed(1);
    this.log.unshift({ t: stamp, msg });
    if (this.log.length > 40) this.log.pop();
  }

  damageRoll(attacker, baseMul, tech = null) {
    const atk = attacker.stats.atk;
    const variance = randRange(0.85, 1.15);
    const techMul = tech?.power || 1;
    return Math.max(1, atk * baseMul * techMul * variance);
  }

  applyDamage(attacker, defender, raw, opts = {}) {
    if (!defender.alive || defender.invuln > 0) return 0;
    const def = defender.stats.def;
    const shield = defender.shieldTimer > 0 ? 0.45 : 1;
    const mitigated = (raw * shield) / (1 + def * 0.04);
    const dmg = mitigated * randRange(0.92, 1.08);
    defender.percent += dmg * 0.35; // stun meter soft
    const hpDmg = dmg * (opts.hpMul || 1.15);
    defender.hp = Math.max(0, defender.hp - hpDmg);
    const stun = (opts.hitstun || 0.18) * (opts.heavy ? 1.15 : 1);
    defender.hitstun = Math.max(defender.hitstun, stun);
    defender.hurtFlash = Math.max(defender.hurtFlash, opts.heavy ? 0.28 : 0.16);
    defender.impactSquash = opts.heavy ? 0.55 : 0.32;
    defender.action = 'hurt';
    defender.actionTimer = Math.max(defender.actionTimer, stun * 0.85);
    defender.combo += 1;
    attacker.combo += 1;
    attacker.ki = clamp(attacker.ki + 8 * (opts.kiGain || 1) * attacker.stats.kiRegen, 0, attacker.maxKi);

    // Capture grounded state before launch clears it (dust VFX)
    const wasGrounded = !!defender.onGround || !!opts.grounded;

    // Realistic fighting-game knockback: angled launch + attacker recoil
    const kb = ((opts.knock || 1) * (11 + dmg * 0.62) * (opts.kbMul || 1)) / defender.stats.weight;
    const dir = opts.dirX != null ? opts.dirX : Math.sign(defender.x - attacker.x) || attacker.facing;
    const angle = opts.angle != null ? opts.angle : opts.heavy ? -0.55 : -0.32;
    const speed = kb * 26;
    defender.vx = dir * Math.cos(Math.abs(angle)) * speed;
    defender.vy = Math.sin(angle) * speed * (opts.up || 1) - (opts.heavy ? 40 : 18);
    if (!opts.heavy && wasGrounded) defender.vy = Math.min(defender.vy, -55);
    defender.onGround = false;
    defender.fastFall = false;
    defender.jabStep = 0;
    defender.shielding = false;

    // Attacker punch recoil / follow-through
    attacker.vx += dir * (opts.heavy ? 55 : 28);
    attacker.impactSquash = Math.max(attacker.impactSquash, opts.heavy ? 0.22 : 0.12);

    attacker.comboCount = (attacker.comboCount || 0) + 1;
    if (attacker.comboCount > 1) {
      this.fx.floatText(attacker.x, attacker.y - 70, `${attacker.comboCount} HIT!`, '#67e8f9');
    }

    const heavy = dmg > 16 || !!opts.heavy;
    const impactX = (attacker.x + defender.x) / 2 + dir * 8;
    const impactY = defender.y - defender.radius * 0.35;
    this.fx.onHit(impactX, impactY, hpDmg, heavy);
    if (wasGrounded) {
      this.fx.burst(defender.x, this.stage.ground.y - 4, {
        count: heavy ? 16 : 8,
        speed: 110,
        paletteName: 'jump',
        angle: -Math.PI / 2,
        spread: 1.4,
        gravity: 180,
        life: 0.35
      });
    }
    audio.hit(heavy);
    this.pushLog(`${attacker.name} → ${defender.name}  -${hpDmg.toFixed(0)} PV`);

    if (defender.hp <= 0) {
      this.ko(defender);
    }
    return dmg;
  }

  platforms() {
    return [this.stage.ground, ...this.stage.platforms];
  }

  resolvePhysics(f, dt) {
    const g = f.fastFall ? 2400 : 1750;
    if (!f.shielding) f.vy += g * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vx *= f.onGround ? (f.shielding ? 0.55 : 0.8) : 0.98;

    f.onGround = false;
    const floor = this.stage.ground;
    const feet = f.y + f.radius;
    if (f.vy >= 0 && feet >= floor.y && feet <= floor.y + floor.h + 24) {
      f.y = floor.y - f.radius;
      f.vy = 0;
      f.onGround = true;
      f.jumps = 2;
      f.fastFall = false;
    }
    if (f.y < 90) {
      f.y = 90;
      f.vy = Math.max(0, f.vy);
    }

    const walls = this.stage.walls || { left: 80, right: 1200 };
    if (f.x < walls.left) {
      f.x = walls.left;
      if (f.vx < 0) {
        f.vx *= -0.35;
        this.fx.burst(f.x, f.y, { count: 8, speed: 120, paletteName: 'hit', spark: true });
      }
    }
    if (f.x > walls.right) {
      f.x = walls.right;
      if (f.vx > 0) {
        f.vx *= -0.35;
        this.fx.burst(f.x, f.y, { count: 8, speed: 120, paletteName: 'hit', spark: true });
      }
    }
  }

  ko(f) {
    if (!f.alive) return;
    this.fx.onKO(f.x, f.y);
    audio.ko();
    this.pushLog(`K.O. ! ${f.name} est a terre !`);
    f.alive = false;
    f.stocks = 0;
    f.vx = 0;
    f.vy = 0;
    f.action = 'idle';
    f.hitstun = 2;
    this.checkWinner();
  }

  respawn() {
    /* arena fighter: no respawn mid-round */
  }

  checkWinner() {
    const livingTeams = new Set(
      this.fighters.filter((f) => f.alive && f.hp > 0).map((f) => f.team)
    );
    if (livingTeams.size <= 1) {
      this.ended = true;
      this.winnerTeams = livingTeams.size ? [...livingTeams] : [this.fighters[0].team];
      const names = this.fighters
        .filter((f) => this.winnerTeams.includes(f.team))
        .map((f) => f.name)
        .join(' & ');
      this.pushLog(`Victoire : ${names} !`);
      this.fx.burst(640, 300, { count: 60, speed: 300, paletteName: 'aurora', gravity: 40, life: 0.9 });
      this.fx.screenShake(10, 0.4);
      audio.win();
    }
  }

  enemiesOf(f) {
    return this.fighters.filter((o) => o.alive && o.team !== f.team);
  }

  queueHit(f, spec) {
    // Active frames after startup — feels like a real fighter
    f.pendingHit = {
      ...spec,
      delay: spec.startup || 0.06
    };
    f.action = spec.action || 'attack';
    f.actionTimer = (spec.startup || 0.06) + (spec.active || 0.12) + (spec.recovery || 0.1);
  }

  resolvePendingHit(f, dt) {
    if (!f.pendingHit) return;
    f.pendingHit.delay -= dt;
    if (f.pendingHit.delay > 0) return;
    const hit = f.pendingHit;
    f.pendingHit = null;
    const range = (hit.range || 72) * (f.transformed ? 1.12 : 1);
    const ox = f.x + f.facing * (hit.reach || 42);
    const oy = f.y + (hit.yOff || -12);
    this.fx.burst(ox, oy, {
      count: hit.heavy ? 22 : 12,
      speed: hit.heavy ? 260 : 170,
      paletteName: hit.fx || 'hit',
      spread: 1.1,
      angle: f.facing >= 0 ? 0 : Math.PI,
      spark: true
    });
    this.fx.ring(ox, oy, { maxR: hit.heavy ? 70 : 42, paletteName: hit.fx || 'hit', life: 0.22 });
    if (hit.move) {
      f.vx += f.facing * hit.move;
    }
    let connected = false;
    for (const e of this.enemiesOf(f)) {
      if (Math.hypot(e.x - ox, e.y - oy) <= range + e.radius * 0.55) {
        if (e.shielding) {
          e.ki = Math.max(0, e.ki - 4);
          this.fx.floatText(e.x, e.y - 40, 'GUARD', '#67e8f9');
          this.fx.ring(e.x, e.y, { maxR: 40, paletteName: 'shield' });
          audio.hit(false);
          continue;
        }
        this.applyDamage(f, e, this.damageRoll(f, hit.power || 1), {
          knock: hit.knock || 1,
          heavy: !!hit.heavy,
          up: hit.up || 1,
          angle: hit.angle,
          kiGain: hit.kiGain || 1,
          hitstun: hit.hitstun || 0.2,
          kbMul: hit.kbMul || 1
        });
        connected = true;
      }
    }
    if (connected) audio.hit(!!hit.heavy);
  }

  tryAttack(f, input = {}) {
    if (f.attackCd > 0 || f.hitstun > 0 || f.actionTimer > 0 || f.chargeTimer > 0 || f.shielding) return;

    const aerial = !f.onGround;
    const heavy = !!(input.heavy || input.down);
    const up = !!(input.up && !heavy);

    // Reset jab if window expired
    if (f.jabWindow <= 0) f.jabStep = 0;

    if (aerial) {
      f.attackCd = 0.34;
      if (up) {
        // up-air launcher
        this.queueHit(f, {
          startup: 0.08,
          power: 1.15,
          knock: 1.15,
          up: 1.35,
          angle: -1.2,
          range: 86,
          reach: 28,
          yOff: -36,
          hitstun: 0.3,
          action: 'attack'
        });
        this.pushLog(`${f.name} — aerial haut !`);
      } else if (heavy) {
        this.queueHit(f, {
          startup: 0.1,
          power: 1.5,
          knock: 1.45,
          heavy: true,
          angle: -0.55,
          range: 94,
          reach: 48,
          move: 100,
          hitstun: 0.34,
          action: 'attack'
        });
        f.vy = Math.min(f.vy, -40);
        this.pushLog(`${f.name} — smash aérien !`);
      } else {
        this.queueHit(f, {
          startup: 0.05,
          power: 0.9,
          knock: 0.8,
          angle: -0.9,
          range: 78,
          reach: 38,
          hitstun: 0.24,
          action: 'attack'
        });
      }
      return;
    }

    if (heavy) {
      // Forward smash
      f.attackCd = 0.55;
      f.jabStep = 0;
      this.queueHit(f, {
        startup: 0.14,
        power: 1.75,
        knock: 1.7,
        heavy: true,
        angle: -0.5,
        range: 102,
        reach: 56,
        move: 180,
        hitstun: 0.4,
        kbMul: 1.2,
        action: 'attack',
        fx: 'solar'
      });
      this.fx.chargeUp(f, 0.5);
      this.pushLog(`${f.name} — SMASH !`);
      return;
    }

    if (up) {
      f.attackCd = 0.4;
      f.jabStep = 0;
      this.queueHit(f, {
        startup: 0.09,
        power: 1.25,
        knock: 1.15,
        angle: -1.35,
        up: 1.4,
        range: 88,
        reach: 24,
        yOff: -40,
        hitstun: 0.32,
        action: 'attack'
      });
      this.pushLog(`${f.name} — anti-air !`);
      return;
    }

    // Ground jab combo 1-2-3
    const step = f.jabStep;
    f.jabStep = (step + 1) % 3;
    f.jabWindow = 0.55;
    if (step === 0) {
      f.attackCd = 0.18;
      this.queueHit(f, {
        startup: 0.04,
        power: 0.75,
        knock: 0.5,
        angle: -0.3,
        range: 76,
        reach: 44,
        hitstun: 0.2,
        action: 'attack'
      });
    } else if (step === 1) {
      f.attackCd = 0.2;
      this.queueHit(f, {
        startup: 0.05,
        power: 0.9,
        knock: 0.6,
        angle: -0.45,
        range: 80,
        reach: 46,
        move: 50,
        hitstun: 0.22,
        action: 'attack'
      });
    } else {
      f.attackCd = 0.38;
      f.jabStep = 0;
      this.queueHit(f, {
        startup: 0.07,
        power: 1.3,
        knock: 1.3,
        heavy: true,
        angle: -0.85,
        range: 92,
        reach: 50,
        move: 140,
        hitstun: 0.32,
        action: 'attack',
        fx: 'spark'
      });
      this.pushLog(`${f.name} — finisher combo !`);
    }
  }

  tryKiBlast(f) {
    if (f.blastCd > 0 || f.hitstun > 0 || f.chargeTimer > 0 || f.shielding) return;
    if (f.ki < 12) {
      this.fx.floatText(f.x, f.y - 40, 'KI?', '#94a3b8');
      return;
    }
    f.ki -= 12;
    f.blastCd = 0.38;
    f.action = 'attack';
    f.actionTimer = 0.22;
    const speed = 520;
    this.fx.projectile({
      x: f.x + f.facing * 28,
      y: f.y - 8,
      vx: f.facing * speed,
      vy: -20,
      paletteName: 'beam',
      life: 1.1,
      ownerId: f.id,
      damage: 10 + f.stats.atk * 0.35,
      knock: 1.05,
      radius: 11
    });
    this.fx.burst(f.x + f.facing * 24, f.y - 8, {
      count: 10,
      speed: 140,
      paletteName: 'beam',
      spread: 0.6,
      angle: f.facing >= 0 ? 0 : Math.PI,
      spark: true
    });
    audio.special();
    this.pushLog(`${f.name} — KI BLAST !`);
  }

  tryDash(f, dir) {
    if (f.dashCd > 0 || f.hitstun > 0 || f.chargeTimer > 0) return;
    const d = dir || f.facing;
    f.dashCd = 0.55;
    f.facing = Math.sign(d) || f.facing;
    f.vx = f.facing * 620;
    f.vy = Math.min(f.vy, -40);
    f.action = 'special';
    f.actionTimer = 0.2;
    f.invuln = Math.max(f.invuln, 0.12);
    for (let i = 0; i < 5; i++) this.fx.afterImage(f);
    this.fx.burst(f.x, f.y, { count: 14, speed: 180, paletteName: 'trail', spark: true });
    audio.jump();
    this.pushLog(`${f.name} — dash !`);
  }

  tryGuard(f, hold) {
    if (f.hitstun > 0 || f.chargeTimer > 0 || !f.onGround) {
      f.shielding = false;
      return;
    }
    if (hold) {
      f.shielding = true;
      f.shieldTimer = 0.2;
      f.vx *= 0.5;
      f.action = 'idle';
      f.jabStep = 0;
      if (Math.random() < 0.15) {
        this.fx.aura(f.id, f.x, f.y, 'shield', 0.2);
      }
    } else {
      f.shielding = false;
    }
  }

  resolveTechHits(f, tech, rangeBonus = 0) {
    const hit = [];
    for (const e of this.enemiesOf(f)) {
      if (dist(f, e) <= tech.range + 10 + rangeBonus) {
        hit.push(e);
        this.applyDamage(f, e, this.damageRoll(f, tech.kind === 'ultra' ? 1.15 : 1.0, tech), {
          knock: tech.knock,
          heavy: tech.kind === 'ultra' || tech.power > 1.4,
          up: tech.kind === 'ultra' ? 1.1 : 0.85,
          kiGain: tech.kind === 'ultra' ? 0.5 : 1.2,
          hitstun: tech.kind === 'ultra' ? 0.4 : 0.28
        });
        if (tech.fx === 'drain') {
          const steal = 12;
          e.ki = Math.max(0, e.ki - steal);
          f.ki = clamp(f.ki + steal, 0, f.maxKi);
        }
        if (tech.fx === 'vine') {
          e.x += Math.sign(f.x - e.x) * 40;
        }
      }
    }
    return hit;
  }

  trySpecial(f, index = 0) {
    if (f.specialCd > 0 || f.hitstun > 0 || f.chargeTimer > 0) return;
    // Alternate base specials; inject shop bonus as an extra slot after the kit
    const kit = [...(f.specials || [])];
    (f.bonusTechs || []).forEach((id) => {
      if (id && !kit.includes(id)) kit.push(id);
    });
    if (!kit.length) return;
    const cursor = (f._specialCursor || 0) % kit.length;
    const pick = index > 0 && kit[index] ? kit[index] : kit[cursor];
    const tech = getTechnique(pick);
    if (!tech) return;
    if (f.ki < tech.kiCost) {
      this.fx.floatText(f.x, f.y - 40, 'KI?', '#94a3b8');
      return;
    }
    // Advance kit only after a successful cast
    if (!(index > 0 && kit[index])) {
      f._specialCursor = (cursor + 1) % kit.length;
    }
    f.ki -= tech.kiCost;
    f.specialCd = tech.cooldown;
    f.action = 'special';
    f.actionTimer = 0.4;

    // Mini charge flash for heavy specials
    if (tech.power >= 1.3) this.fx.chargeUp(f, 0.7);

    if (tech.fx === 'trail' || tech.fx === 'dive' || tech.fx === 'ember' || tech.fx === 'metal') {
      f.vx = f.facing * (tech.fx === 'metal' ? 420 : 560);
      f.vy = tech.fx === 'dive' ? 280 : -100;
      for (let i = 0; i < 5; i++) this.fx.afterImage(f);
      f.spectacleTimer = 0.28;
      f.spectacleHits = 3;
    }
    if (tech.fx === 'spin') {
      f.spectacleTimer = 0.45;
      f.spectacleHits = 4;
      f.vx = f.facing * 200;
    }
    if (tech.fx === 'warp') {
      this.fx.castTechnique(tech, f, []);
      f.x += f.facing * Math.min(tech.range, 150);
      this.fx.burst(f.x, f.y, { count: 24, speed: 200, paletteName: 'warp', spark: true });
    }

    if (tech.heal) {
      f.hp = clamp(f.hp + tech.heal, 0, f.maxHp);
      f.percent = Math.max(0, f.percent - tech.heal * 0.4);
    }
    if (tech.fx === 'shield') f.shieldTimer = 1.4;

    const hit = this.resolveTechHits(f, tech);
    this.fx.castTechnique(tech, f, hit);
    audio.special();
    this.pushLog(`${f.name} utilise ${tech.name} !`);
  }

  tryUltra(f) {
    if (f.ultraCd > 0 || f.hitstun > 0 || f.chargeTimer > 0) return;
    const tech = getTechnique(f.ultraId);
    if (!tech) return;
    if (f.ki < tech.kiCost) {
      this.fx.floatText(f.x, f.y - 40, 'KI INSUFFISANT', '#94a3b8');
      return;
    }
    // Phase 1: charge spectaculaire
    f.ki -= tech.kiCost;
    f.ultraCd = tech.cooldown;
    f.action = 'charge';
    f.chargeTimer = 0.55;
    f.pendingUltra = tech;
    f.vx *= 0.2;
    f.vy = Math.min(f.vy, 0);
    this.fx.chargeUp(f, 1.5);
    this.fx.cutIn(f, tech.name);
    audio.charge();
    this.pushLog(`${f.name} charge l'ULTRA ${tech.name}…`);
  }

  releaseUltra(f) {
    const tech = f.pendingUltra;
    if (!tech) return;
    f.pendingUltra = null;
    f.action = 'ultra';
    f.actionTimer = 0.7;
    f.spectacleTimer = 0.55;
    f.spectacleHits = 4;

    // Phase 2: rush / beam / meteor according to FX family
    if (tech.fx === 'beam' || tech.fx === 'dive' || tech.fx === 'trail' || tech.fx === 'daybreak') {
      f.vx = f.facing * 420;
      for (let i = 0; i < 6; i++) this.fx.afterImage(f);
    }
    if (tech.fx === 'meteor' || tech.fx === 'quake') {
      f.vy = -200;
      f.vx = f.facing * 120;
    }

    // Bonus power if any foe is already high %
    const juicy = this.enemiesOf(f).some((e) => e.percent >= 80);
    const rangeBonus = juicy ? 50 : 30;
    const hit = this.resolveTechHits(f, tech, rangeBonus);
    if (juicy && hit.length) {
      hit.forEach((e) => {
        this.applyDamage(f, e, this.damageRoll(f, 0.55, tech), {
          knock: tech.knock * 1.15,
          heavy: true,
          up: 1.25,
          hitstun: 0.45
        });
      });
      this.fx.floatText(f.x, f.y - 90, 'SUPER FINISHER', '#fde047');
      this.fx.shockwave(f.x, f.y, { maxR: 200, color: '#fde047', width: 14 });
    }

    this.fx.castTechnique(tech, f, hit);
    audio.ultra();
    this.pushLog(`${f.name} déclenche l'ULTRA ${tech.name} !!`);
  }

  tryRegen(f) {
    if (f.ki < 35 || f.hitstun > 0) return;
    const heal = 14 + f.stats.kiRegen * 4;
    f.ki -= 35;
    f.hp = clamp(f.hp + heal, 0, f.maxHp);
    f.percent = Math.max(0, f.percent - heal * 0.5);
    this.fx.onKiRegen(f);
    audio.regen();
    this.pushLog(`${f.name} se régénère (+${heal.toFixed(0)} PV).`);
  }

  tryTransform(f) {
    if (!f.transformData || f.transformed || f.transformCd > 0 || f.hitstun > 0 || f.chargeTimer > 0) return;
    if (f.ki < 45) {
      this.fx.floatText(f.x, f.y - 50, 'KI?', '#94a3b8');
      return;
    }
    const t = f.transformData;
    f.ki -= 45;
    f.transformed = true;
    f.transformTimer = t.duration || 12;
    f.transformName = t.name || 'Transformation';
    f.colors = { ...f.baseColors, ...(t.colors || {}) };
    f.stats = {
      ...f.baseStats,
      atk: f.baseStats.atk * (t.atkMul || 1.3),
      speed: f.baseStats.speed * (t.speedMul || 1.15),
      jump: f.baseStats.jump * (t.jumpMul || 1.1),
      def: f.baseStats.def * 1.08
    };
    f.radius = f.baseRadius * 1.12;
    f.drawScale = 2.15;
    f.invuln = Math.max(f.invuln, 0.35);
    f.action = 'charge';
    f.actionTimer = 0.45;
    f.transformCd = 2;
    this.fx.shockwave(f.x, f.y - 20, { maxR: 180, color: f.colors.accent || '#fde047', width: 16 });
    this.fx.burst(f.x, f.y - 10, {
      count: 40,
      speed: 280,
      paletteName: 'aurora',
      spark: true,
      size: 8
    });
    this.fx.orbital(f.x, f.y, { count: 8, radius: 50, paletteName: 'solar', life: 0.8 });
    this.fx.floatText(f.x, f.y - 90, f.transformName.toUpperCase(), '#fde047');
    this.fx.screenShake(16, 0.4);
    this.fx.addHitstop(8);
    this.fx.flashAlpha = 0.45;
    this.fx.flashColor = f.colors.accent || '#fef08a';
    audio.ultra();
    this.pushLog(`${f.name} se transforme — ${f.transformName} !`);
  }

  endTransform(f, reason = 'fin') {
    if (!f.transformed) return;
    f.transformed = false;
    f.transformTimer = 0;
    f.colors = { ...f.baseColors };
    f.stats = { ...f.baseStats };
    f.radius = f.baseRadius;
    f.drawScale = 1.85;
    f.transformCd = 8;
    this.fx.burst(f.x, f.y, { count: 18, speed: 140, paletteName: 'trail', spark: true });
    this.fx.floatText(f.x, f.y - 60, reason === 'ki' ? 'KI ÉPUISÉ' : 'FORME OFF', '#94a3b8');
    this.pushLog(`${f.name} quitte ${f.transformName || 'sa forme'}.`);
    f.transformName = '';
  }

  updateTransform(f, dt) {
    if (!f.transformed) return;
    f.transformTimer -= dt;
    f.ki = Math.max(0, f.ki - dt * 4.5);
    if (Math.random() < 0.25) {
      this.fx.burst(f.x + randRange(-20, 20), f.y + randRange(-30, 10), {
        count: 3,
        speed: 60,
        paletteName: 'solar',
        gravity: -40,
        life: 0.35,
        size: 3
      });
    }
    if (f.ki <= 0 || f.transformTimer <= 0) {
      this.endTransform(f, f.ki <= 0 ? 'ki' : 'fin');
    }
  }

  applyInput(f, input, dt) {
    if (!f.alive || f.dead) return;
    if (f.hitstun > 0 || f.chargeTimer > 0) {
      f.shielding = false;
      return;
    }

    this.tryGuard(f, !!input.guard);
    if (f.shielding) return;

    // Face nearest foe when idle (SF/Tekken habit)
    if (!input.moveX && f.onGround && f.actionTimer <= 0) {
      const foe = this.enemiesOf(f).sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0];
      if (foe) f.facing = Math.sign(foe.x - f.x) || f.facing;
    }

    // Grounded footsies movement
    if (input.moveX) {
      const spd = f.stats.speed * (f.onGround ? 72 : 48);
      const accel = f.onGround ? 16 : 7;
      f.vx += input.moveX * spd * dt * accel;
      f.vx = clamp(f.vx, -spd, spd);
      f.facing = Math.sign(input.moveX) || f.facing;
      if (Math.abs(f.vx) > 220 && Math.random() < 0.2) this.fx.afterImage(f);
    }

    // Jump (SF-style, less floaty than Smash)
    if (input.jump && f.jumps > 0 && !f.jumpHeld) {
      const short = !!input.shortHop;
      f.vy = -f.stats.jump * (short ? 26 : 36);
      f.jumps -= 1;
      f.onGround = false;
      f.fastFall = false;
      f.jumpHeld = true;
      this.fx.onJump(f.x, f.y);
      audio.jump();
    }
    if (!input.jump) f.jumpHeld = false;
    // Fast fall
    if (input.down && !f.onGround && f.vy > 0) f.fastFall = true;

    // 2026: dash-cancel window after connected attacks / specials
    const canCancel = f.actionTimer > 0 && f.actionTimer < 0.16 && (f.action === 'attack' || f.action === 'special');
    if (input.dash) {
      if (canCancel || f.actionTimer <= 0) this.tryDash(f, input.moveX || f.facing);
    }
    if (input.attack) this.tryAttack(f, input);
    if (input.blast) this.tryKiBlast(f);
    if (input.regen || input.heal) this.tryRegen(f);
    if (input.transform) this.tryTransform(f);
    if (input.special) this.trySpecial(f, 0);
    if (input.ultra) this.tryUltra(f);
  }

  updateSpectacle(f, dt) {
    if (f.spectacleTimer <= 0) return;
    f.spectacleTimer -= dt;
    if (f.spectacleHits > 0 && Math.random() < 0.35) {
      f.spectacleHits -= 1;
      this.fx.afterImage(f);
      this.fx.burst(f.x + f.facing * 20, f.y, {
        count: 8,
        speed: 160,
        paletteName: 'hit',
        spark: true,
        life: 0.3
      });
      for (const e of this.enemiesOf(f)) {
        if (dist(f, e) < 70) {
          this.applyDamage(f, e, this.damageRoll(f, 0.45), {
            knock: 0.55,
            kiGain: 0.4,
            hitstun: 0.12
          });
        }
      }
    }
  }

  update(dt, inputsBySlot) {
    if (this.ended) {
      this.fx.update(dt);
      return;
    }

    const fxState = this.fx.update(dt);
    if (fxState.frozen) return;
    const sdt = dt * (fxState.dtScale || 1);

    this.time += sdt;

    // Projectiles vs fighters
    this.fx.collideProjectiles(this.fighters, (proj, target) => {
      const owner = this.fighters.find((x) => x.id === proj.ownerId);
      if (!owner || owner.team === target.team) return false;
      this.applyDamage(owner, target, proj.damage * randRange(0.9, 1.1), {
        knock: proj.knock,
        heavy: proj.damage >= 15,
        kiGain: 0.6
      });
      this.pushLog(`Projectile de ${owner.name} touche ${target.name} !`);
      return true;
    });

    for (const f of this.fighters) {
      if (!f.alive || f.hp <= 0) continue;

      f.attackCd = Math.max(0, f.attackCd - sdt);
      f.specialCd = Math.max(0, f.specialCd - sdt);
      f.ultraCd = Math.max(0, f.ultraCd - sdt);
      f.blastCd = Math.max(0, f.blastCd - sdt);
      f.dashCd = Math.max(0, f.dashCd - sdt);
      f.transformCd = Math.max(0, f.transformCd - sdt);
      f.jabWindow = Math.max(0, f.jabWindow - sdt);
      f.actionTimer = Math.max(0, f.actionTimer - sdt);
      f.invuln = Math.max(0, f.invuln - sdt);
      f.shieldTimer = Math.max(0, f.shieldTimer - sdt);
      f.hitstun = Math.max(0, f.hitstun - sdt);
      f.hurtFlash = Math.max(0, f.hurtFlash - sdt);
      f.impactSquash = Math.max(0, f.impactSquash - sdt * 2.8);
      if (f.hitstun <= 0 && f.jabWindow <= 0) f.comboCount = 0;

      if (f.chargeTimer > 0) {
        f.chargeTimer -= sdt;
        if (Math.random() < 0.4) this.fx.chargeUp(f, 0.35);
        if (f.chargeTimer <= 0) this.releaseUltra(f);
        this.resolvePhysics(f, sdt * 0.3);
        continue;
      }

      this.resolvePendingHit(f, sdt);
      this.updateTransform(f, sdt);

      if (f.actionTimer <= 0 && f.action !== 'idle' && !f.shielding) f.action = 'idle';
      if (!f.transformed) {
        f.ki = clamp(f.ki + sdt * 4.2 * f.stats.kiRegen, 0, f.maxKi);
      }

      this.updateSpectacle(f, sdt);

      const wasGround = f.onGround;
      const input = inputsBySlot[f.slot] || { moveX: 0 };
      this.applyInput(f, input, sdt);
      this.resolvePhysics(f, sdt);
      if (!wasGround && f.onGround) this.fx.onLand(f.x, f.y);
    }
  }

  snapshot() {
    return {
      time: this.time,
      ended: this.ended,
      winnerTeams: this.winnerTeams,
      fighters: this.fighters.map((f) => ({
        id: f.id,
        slot: f.slot,
        team: f.team,
        characterId: f.characterId,
        name: f.name,
        x: f.x,
        y: f.y,
        vx: f.vx,
        vy: f.vy,
        facing: f.facing,
        percent: f.percent,
        hp: f.hp,
        maxHp: f.maxHp,
        ki: f.ki,
        stocks: f.stocks,
        alive: f.alive,
        action: f.action,
        colors: f.colors,
        invuln: f.invuln,
        shieldTimer: f.shieldTimer,
        transformed: f.transformed,
        transformName: f.transformName,
        drawScale: f.drawScale,
        hurtFlash: f.hurtFlash,
        impactSquash: f.impactSquash,
        radius: f.radius
      })),
      log: this.log.slice(0, 12)
    };
  }
}
