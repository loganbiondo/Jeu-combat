/**
 * Portraits UI — silhouettes humaines (le combat est en 3D).
 */
import { getCharacter } from '../data/characters.js';
import { drawHumanPortrait } from './humanoid3d.js';

export function drawCharacterSprite(ctx, id, colors, t, action = 'idle') {
  // Legacy 2D fallback silhouette for any leftover callers
  const ch = getCharacter(id);
  drawHumanPortrait(ctx, { ...ch, colors: colors || ch.colors }, 90);
  void t;
  void action;
}

export function drawPortrait(ctx, id, colors, size = 120) {
  const ch = getCharacter(id);
  drawHumanPortrait(ctx, { ...ch, colors: colors || ch.colors }, size);
}
