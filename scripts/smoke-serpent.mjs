import assert from 'node:assert/strict';
import { ARENA_R, createMatch, levelOf } from '../serpent/js/engine.js';
import { challengeFor, starsForRun } from '../serpent/js/content.js';

const step = (match, seconds, input) => {
  const frames = Math.max(1, Math.round(seconds / 0.05));
  for (let i = 0; i < frames; i++) match.step(0.05, input);
};

const move = createMatch({ seed: 42, mode: 'solo', countdown: false, name: 'Test', skin: 'ion' });
const x0 = move.player.x;
step(move, 0.35, { angle: 0, boost: false, nova: false });
assert.ok(move.player.x > x0 + 10, 'le serpent avance');
assert.equal(move.player.alive, true);

const eat = createMatch({ seed: 3, countdown: false, noOrbs: true });
eat.orbs.push({ id: 1, x: eat.player.x + 8, y: eat.player.y, kind: 'bit', r: 18, value: 4, ttl: null, owner: null, ph: 0 });
const before = eat.player.eats;
step(eat, 0.05, { angle: 0, boost: false, nova: false });
assert.ok(eat.player.eats > before, 'manger un orbe');
assert.ok(eat.player.length > 16, 'le corps grandit');
assert.ok(eat.player.score > 0, 'le score monte');

const wall = createMatch({ seed: 4, countdown: false, noOrbs: true });
wall.snakes = [wall.player];
wall.player.shields = 1;
wall.player.x = ARENA_R;
wall.player.y = 0;
wall.step(0.016, { angle: 0, boost: false, nova: false });
assert.equal(wall.player.alive, true, 'le bouclier encaisse le mur');
assert.equal(wall.player.shields, 0);
wall.player.ghostT = 0;
wall.player.perks.clear();
wall.player.x = ARENA_R;
wall.player.y = 0;
wall.step(0.016, { angle: 0, boost: false, nova: false });
assert.equal(wall.player.alive, false, 'le mur tue sans bouclier');
assert.equal(wall.phase, 'dying');

const body = createMatch({ seed: 8, countdown: false, noOrbs: true });
const bot = body.snakes.find((s) => !s.isPlayer);
assert.ok(bot.pts.length > 10);
const target = bot.pts[10];
assert.ok(Math.hypot(target.x, target.y) < ARENA_R - 80);
body.player.x = target.x;
body.player.y = target.y;
body.player.shields = 0;
body.player.perks.clear();
body.player.ghostT = 0;
body.step(0, { angle: body.player.angle, boost: false, nova: false });
assert.equal(body.player.alive, false, 'toucher un corps est fatal');
assert.ok(bot.kills >= 1, 'le tueur est crédité');

const nova = createMatch({ seed: 9, countdown: false, noOrbs: true });
const victim = nova.snakes[1];
victim.x = nova.player.x + 48;
victim.y = nova.player.y;
nova.player.nova = 3;
nova.step(0.016, { angle: 0, boost: false, nova: true });
assert.equal(nova.player.nova, 0, 'la nova se consomme');
assert.equal(victim.alive, false, 'la nova élimine au contact');
assert.ok(nova.player.kills >= 1);

const boost = createMatch({ seed: 11, countdown: false, noOrbs: true });
boost.snakes = [boost.player];
boost.player.length = 30;
boost.resize(boost.player);
const len0 = boost.player.length;
step(boost, 1, { angle: 0, boost: true, nova: false });
assert.ok(boost.player.length < len0, 'le boost dépense des anneaux');
assert.equal(boost.player.alive, true);

const mutate = createMatch({ seed: 12, countdown: false, noOrbs: true });
mutate.player.eats = 15;
mutate.player._lv = levelOf(mutate.player);
mutate.orbs.push({ id: 2, x: mutate.player.x, y: mutate.player.y, kind: 'bit', r: 20, value: 1, ttl: null, owner: null, ph: 1 });
mutate.step(0.016, { angle: mutate.player.angle, boost: false, nova: false });
assert.equal(mutate.phase, 'mutate', 'une mutation s’ouvre au niveau 3');
assert.equal(mutate.offer.length, 3);
const pick = mutate.offer[0];
mutate.choosePerk(pick);
assert.equal(mutate.phase, 'playing');
assert.ok(mutate.player.perks.has(pick));

const boss = createMatch({ seed: 13, countdown: false, noOrbs: true });
boss.player.eats = 31;
boss.player._lv = 4;
boss.orbs.push({ id: 3, x: boss.player.x, y: boss.player.y, kind: 'bit', r: 20, value: 1, ttl: null, owner: null, ph: 1 });
boss.step(0.016, { angle: 0, boost: false, nova: false });
assert.ok(boss.snakes.some((s) => s.isBoss), 'Léviathan apparaît au niveau 5');

const phase = createMatch({ seed: 14, countdown: false, noOrbs: true });
phase.snakes = [phase.player];
phase.player.perks.add('phase');
phase.player.shields = 0;
phase.player.phaseCd = 0;
phase.player.x = ARENA_R;
phase.player.y = 0;
phase.step(0.016, { angle: 0, boost: false, nova: false });
assert.equal(phase.player.alive, true, 'phase évite la mort');
assert.ok(phase.player.ghostT > 0);

const a = createMatch({ seed: 99, countdown: false });
const b = createMatch({ seed: 99, countdown: false });
const c = createMatch({ seed: 100, countdown: false });
assert.equal(a.orbs[0].x, b.orbs[0].x);
assert.notEqual(a.orbs[0].x, c.orbs[0].x);

const ch = challengeFor('2026-11-11');
assert.deepEqual(ch, challengeFor('2026-11-11'));
assert.ok(ch.target > 0);
assert.equal(starsForRun(60, 1, false), 4);
assert.equal(starsForRun(60, 1, true), 8);

let over = wall;
for (let i = 0; i < 40 && over.phase !== 'over'; i++) over.step(0.05, { angle: 0, boost: false, nova: false });
assert.equal(over.phase, 'over');
assert.ok(over.final);

console.log('smoke serpent ok', { eats: eat.player.eats, boost: boost.player.length, boss: true, challenge: ch.kind });
