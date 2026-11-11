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
    this.radius = 22;
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
    this.actionTimer = 0;
    this.action = 'idle';
    this.shieldTimer = 0;
    this.shielding = false;
    this.hitstun = 0;
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
    defender.percent += dmg * 0.35; // stun meter soft, plus de KO Smash
    // Fighting game: HP is the real life bar
    const hpDmg = dmg * (opts.hpMul || 1.15);
    defender.hp = Math.max(0, defender.hp - hpDmg);
    defender.hitstun = Math.max(defender.hitstun, opts.hitstun || 0.18);
    defender.combo += 1;
    attacker.combo += 1;
    attacker.ki = clamp(attacker.ki + 8 * (opts.kiGain || 1) * attacker.stats.kiRegen, 0, attacker.maxKi);

    // Tekken/SF style: pushback + light lift, walls catch you (no ring-out)
    const kb = ((opts.knock || 1) * (10 + dmg * 0.55) * (opts.kbMul || 1)) / defender.stats.weight;
    const dir = opts.dirX != null ? opts.dirX : Math.sign(defender.x - attacker.x) || attacker.facing;
    const lift = opts.upAir || opts.angle != null ? 1 : 0.35;
    defender.vx = dir * kb * 22;
    defender.vy = -kb * 10 * lift * (opts.up || 1);
    if (defender.vy > -40 && !opts.upAir) defender.vy = Math.min(defender.vy, -30);
    defender.onGround = false;
    defender.fastFall = false;
    defender.jabStep = 0;
    defender.shielding = false;

    attacker.comboCount = (attacker.comboCount || 0) + 1;
    if (attacker.comboCount > 1) {
      this.fx.floatText(attacker.x, attacker.y - 60, `${attacker.comboCount} HIT!`, '#67e8f9');
    }

    const heavy = dmg > 16 || !!opts.heavy;
    this.fx.onHit(defender.x, defender.y - 10, dmg, heavy);
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
    const range = hit.range || 58;
    const ox = f.x + f.facing * (hit.reach || 28);
    const oy = f.y + (hit.yOff || -6);
    this.fx.burst(ox, oy, {
      count: hit.heavy ? 18 : 10,
      speed: hit.heavy ? 220 : 150,
      paletteName: hit.fx || 'hit',
      spread: 1.1,
      angle: f.facing >= 0 ? 0 : Math.PI,
      spark: true
    });
    this.fx.ring(ox, oy, { maxR: hit.heavy ? 55 : 34, paletteName: hit.fx || 'hit', life: 0.2 });
    if (hit.move) {
      f.vx += f.facing * hit.move;
    }
    let connected = false;
    for (const e of this.enemiesOf(f)) {
      if (Math.hypot(e.x - ox, e.y - oy) <= range + e.radius * 0.4) {
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
          range: 62,
          reach: 18,
          yOff: -28,
          hitstun: 0.28,
          action: 'attack'
        });
        this.pushLog(`${f.name} — aerial haut !`);
      } else if (heavy) {
        this.queueHit(f, {
          startup: 0.1,
          power: 1.45,
          knock: 1.4,
          heavy: true,
          angle: -0.55,
          range: 70,
          reach: 34,
          move: 80,
          hitstun: 0.32,
          action: 'attack'
        });
        f.vy = Math.min(f.vy, -40);
        this.pushLog(`${f.name} — smash aérien !`);
      } else {
        this.queueHit(f, {
          startup: 0.05,
          power: 0.85,
          knock: 0.75,
          angle: -0.9,
          range: 56,
          reach: 26,
          hitstun: 0.22,
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
        power: 1.7,
        knock: 1.65,
        heavy: true,
        angle: -0.5,
        range: 78,
        reach: 40,
        move: 160,
        hitstun: 0.38,
        kbMul: 1.15,
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
        power: 1.2,
        knock: 1.1,
        angle: -1.35,
        up: 1.4,
        range: 64,
        reach: 16,
        yOff: -30,
        hitstun: 0.3,
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
        power: 0.7,
        knock: 0.45,
        angle: -0.3,
        range: 54,
        reach: 30,
        hitstun: 0.18,
        action: 'attack'
      });
    } else if (step === 1) {
      f.attackCd = 0.2;
      this.queueHit(f, {
        startup: 0.05,
        power: 0.85,
        knock: 0.55,
        angle: -0.45,
        range: 58,
        reach: 32,
        move: 40,
        hitstun: 0.2,
        action: 'attack'
      });
    } else {
      f.attackCd = 0.38;
      f.jabStep = 0;
      this.queueHit(f, {
        startup: 0.07,
        power: 1.25,
        knock: 1.25,
        heavy: true,
        angle: -0.85,
        range: 68,
        reach: 36,
        move: 120,
        hitstun: 0.3,
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
    const techId = f.specials[index] || f.specials[0];
    const extra = f.bonusTechs[0];
    const tech = getTechnique(index === 1 && extra ? extra : techId);
    if (!tech) return;
    if (f.ki < tech.kiCost) {
      this.fx.floatText(f.x, f.y - 40, 'KI?', '#94a3b8');
      return;
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

    if (input.dash) this.tryDash(f, input.moveX || f.facing);
    if (input.attack) this.tryAttack(f, input);
    if (input.blast || input.regen) {
      // regen button becomes ki blast in fighter kit; still allow regen via input.heal
      if (input.heal) this.tryRegen(f);
      else this.tryKiBlast(f);
    }
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
      f.jabWindow = Math.max(0, f.jabWindow - sdt);
      f.actionTimer = Math.max(0, f.actionTimer - sdt);
      f.invuln = Math.max(0, f.invuln - sdt);
      f.shieldTimer = Math.max(0, f.shieldTimer - sdt);
      f.hitstun = Math.max(0, f.hitstun - sdt);
      if (f.hitstun <= 0 && f.jabWindow <= 0) f.comboCount = 0;

      if (f.chargeTimer > 0) {
        f.chargeTimer -= sdt;
        if (Math.random() < 0.4) this.fx.chargeUp(f, 0.35);
        if (f.chargeTimer <= 0) this.releaseUltra(f);
        this.resolvePhysics(f, sdt * 0.3);
        continue;
      }

      this.resolvePendingHit(f, sdt);

      if (f.actionTimer <= 0 && f.action !== 'idle' && !f.shielding) f.action = 'idle';
      f.ki = clamp(f.ki + sdt * 4.2 * f.stats.kiRegen, 0, f.maxKi);

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
        shieldTimer: f.shieldTimer
      })),
      log: this.log.slice(0, 12)
    };
  }
}
