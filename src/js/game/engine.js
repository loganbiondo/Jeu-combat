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
    this.stocks = opts.stocks ?? 3;
    this.alive = true;
    this.invuln = 0;
    this.attackCd = 0;
    this.specialCd = 0;
    this.ultraCd = 0;
    this.actionTimer = 0;
    this.action = 'idle';
    this.shieldTimer = 0;
    this.hitstun = 0;
    this.respawnTimer = 0;
    this.combo = 0;
    this.chargeTimer = 0;
    this.pendingUltra = null;
    this.spectacleTimer = 0;
    this.spectacleHits = 0;
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
        stocks: config.stocks ?? 3
      });
    });
    this.host = config.host !== false;
    this.pushLog('Le combat commence ! Effets spéciaux prêts.');
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
    defender.percent += dmg;
    defender.hp = Math.max(0, defender.hp - dmg * 0.55);
    defender.hitstun = Math.max(defender.hitstun, opts.hitstun || 0.18);
    defender.combo += 1;
    attacker.combo += 1;
    attacker.ki = clamp(attacker.ki + 8 * (opts.kiGain || 1) * attacker.stats.kiRegen, 0, attacker.maxKi);

    const knockMul = (opts.knock || 1) * (0.7 + defender.percent / 80) / defender.stats.weight;
    const dir = Math.sign(defender.x - attacker.x) || attacker.facing;
    defender.vx += dir * 180 * knockMul;
    defender.vy -= 220 * knockMul * (opts.up || 0.85);
    defender.onGround = false;

    const heavy = dmg > 18 || !!opts.heavy;
    this.fx.onHit(defender.x, defender.y - 10, dmg, heavy);
    audio.hit(heavy);
    // Finisher spark when target is launched hard
    if (defender.percent > 100 && heavy) {
      this.fx.shockwave(defender.x, defender.y, { maxR: 130, color: '#fb7185', width: 10 });
      this.fx.floatText(defender.x, defender.y - 55, 'FINISHER!', '#fb7185');
      audio.special();
    }
    this.pushLog(
      `${attacker.name} frappe ${defender.name} — ${dmg.toFixed(1)} dmg (${defender.percent.toFixed(0)}%)`
    );
    return dmg;
  }

  platforms() {
    return [this.stage.ground, ...this.stage.platforms];
  }

  resolvePhysics(f, dt) {
    const g = 1500;
    f.vy += g * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vx *= f.onGround ? 0.75 : 0.98;

    f.onGround = false;
    for (const p of this.platforms()) {
      const withinX = f.x + f.radius * 0.5 > p.x && f.x - f.radius * 0.5 < p.x + p.w;
      const feet = f.y + f.radius;
      if (withinX && f.vy >= 0 && feet >= p.y && feet <= p.y + p.h + 18 && f.y < p.y + 10) {
        f.y = p.y - f.radius;
        f.vy = 0;
        f.onGround = true;
        f.jumps = 2;
      }
    }

    const b = this.stage.blast;
    if (f.x < b.left || f.x > b.right || f.y < b.top || f.y > b.bottom) {
      this.ko(f);
    }
  }

  ko(f) {
    if (!f.alive) return;
    this.fx.onKO(f.x, f.y);
    audio.ko();
    this.pushLog(`KO ! ${f.name} sort de l'arène !`);
    f.stocks -= 1;
    f.alive = false;
    f.percent = 0;
    f.hp = f.maxHp;
    f.ki = 25;
    f.vx = 0;
    f.vy = 0;
    f.respawnTimer = 1.6;
    f.invuln = 2.2;
    if (f.stocks <= 0) {
      this.pushLog(`${f.name} est éliminé.`);
      this.checkWinner();
    }
  }

  respawn(f) {
    const spawn = this.stage.spawns[f.slot % this.stage.spawns.length];
    f.x = spawn.x;
    f.y = spawn.y - 40;
    f.vx = 0;
    f.vy = 0;
    f.alive = true;
    f.action = 'idle';
    this.fx.burst(f.x, f.y, { count: 20, speed: 160, paletteName: 'aurora' });
    this.fx.ring(f.x, f.y, { maxR: 70, paletteName: 'aurora' });
    this.pushLog(`${f.name} réapparaît !`);
  }

  checkWinner() {
    const livingTeams = new Set(
      this.fighters.filter((f) => f.stocks > 0).map((f) => f.team)
    );
    if (livingTeams.size <= 1) {
      this.ended = true;
      this.winnerTeams = [...livingTeams];
      const names = this.fighters
        .filter((f) => livingTeams.has(f.team))
        .map((f) => f.name)
        .join(' & ');
      this.pushLog(`Victoire : ${names || 'personne'} !`);
      this.fx.burst(640, 300, { count: 60, speed: 300, paletteName: 'aurora', gravity: 40, size: 0.9 });
      this.fx.screenShake(10, 0.4);
      audio.win();
    }
  }

  enemiesOf(f) {
    return this.fighters.filter((o) => o.alive && o.team !== f.team);
  }

  tryAttack(f) {
    if (f.attackCd > 0 || f.hitstun > 0 || f.actionTimer > 0 || f.chargeTimer > 0) return;
    f.attackCd = 0.28;
    f.action = 'attack';
    f.actionTimer = 0.22;
    this.fx.burst(f.x + f.facing * 28, f.y - 8, {
      count: 12,
      speed: 160,
      paletteName: 'hit',
      spread: 1,
      angle: f.facing >= 0 ? 0 : Math.PI,
      spark: true
    });
    this.fx.ring(f.x + f.facing * 30, f.y - 6, { maxR: 36, paletteName: 'hit', life: 0.2 });
    audio.hit(false);
    for (const e of this.enemiesOf(f)) {
      if (dist(f, e) < 58) {
        this.applyDamage(f, e, this.damageRoll(f, 1.0), { knock: 1.0, kiGain: 1 });
      }
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
    if (f.hitstun > 0 || f.chargeTimer > 0) return;

    if (input.moveX) {
      const spd = f.stats.speed * 70;
      f.vx += input.moveX * spd * dt * 8;
      f.vx = clamp(f.vx, -spd, spd);
      f.facing = Math.sign(input.moveX) || f.facing;
      if (Math.abs(f.vx) > 180 && Math.random() < 0.2) this.fx.afterImage(f);
    }
    if (input.jump && f.jumps > 0) {
      f.vy = -f.stats.jump * 42;
      f.jumps -= 1;
      f.onGround = false;
      this.fx.onJump(f.x, f.y);
      audio.jump();
    }
    if (input.attack) this.tryAttack(f);
    if (input.special) this.trySpecial(f, 0);
    if (input.ultra) this.tryUltra(f);
    if (input.regen) this.tryRegen(f);
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
      if (f.stocks <= 0) continue;
      if (!f.alive) {
        f.respawnTimer -= sdt;
        if (f.respawnTimer <= 0) this.respawn(f);
        continue;
      }

      f.attackCd = Math.max(0, f.attackCd - sdt);
      f.specialCd = Math.max(0, f.specialCd - sdt);
      f.ultraCd = Math.max(0, f.ultraCd - sdt);
      f.actionTimer = Math.max(0, f.actionTimer - sdt);
      f.invuln = Math.max(0, f.invuln - sdt);
      f.shieldTimer = Math.max(0, f.shieldTimer - sdt);
      f.hitstun = Math.max(0, f.hitstun - sdt);

      if (f.chargeTimer > 0) {
        f.chargeTimer -= sdt;
        // Continuous charge VFX
        if (Math.random() < 0.4) this.fx.chargeUp(f, 0.35);
        if (f.chargeTimer <= 0) this.releaseUltra(f);
        this.resolvePhysics(f, sdt * 0.3);
        continue;
      }

      if (f.actionTimer <= 0 && f.action !== 'idle') f.action = 'idle';
      f.ki = clamp(f.ki + sdt * 3.5 * f.stats.kiRegen, 0, f.maxKi);

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
