/** Clavier + Gamepad (deux manettes) pour local 1v1 / 2v2 */
const KEY_MAPS = [
  // P1
  {
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    attack: ['KeyJ', 'KeyZ'],
    special: ['KeyK', 'KeyX'],
    ultra: ['KeyL', 'KeyC'],
    regen: ['KeyI', 'KeyV'],
    jump: ['Space', 'KeyW', 'ArrowUp']
  },
  // P2
  {
    left: ['Digit4', 'Numpad4'],
    right: ['Digit6', 'Numpad6'],
    up: ['Digit8', 'Numpad8'],
    down: ['Digit5', 'Numpad5'],
    attack: ['KeyO'],
    special: ['KeyP'],
    ultra: ['BracketLeft'],
    regen: ['BracketRight'],
    jump: ['Digit8', 'Numpad8', 'Numpad0']
  }
];

export class InputManager {
  constructor() {
    this.keys = new Set();
    this.prevKeys = new Set();
    this.padPrev = [{}, {}, {}, {}];
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  endFrame() {
    this.prevKeys = new Set(this.keys);
  }

  pressed(code) {
    return this.keys.has(code) && !this.prevKeys.has(code);
  }

  down(code) {
    return this.keys.has(code);
  }

  anyDown(codes) {
    return codes.some((c) => this.down(c));
  }

  anyPressed(codes) {
    return codes.some((c) => this.pressed(c));
  }

  readPlayer(slot, onlineOverride = null) {
    if (onlineOverride) return { ...onlineOverride };

    const map = KEY_MAPS[Math.min(slot, KEY_MAPS.length - 1)];
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[slot];

    let left = this.anyDown(map.left);
    let right = this.anyDown(map.right);
    let up = this.anyDown(map.up);
    let down = this.anyDown(map.down);
    let jump = this.anyPressed(map.jump);
    let attack = this.anyPressed(map.attack);
    let special = this.anyPressed(map.special);
    let ultra = this.anyPressed(map.ultra);
    let regen = this.anyPressed(map.regen);

    if (pad) {
      const ax = pad.axes[0] || 0;
      const ay = pad.axes[1] || 0;
      left = left || ax < -0.35;
      right = right || ax > 0.35;
      up = up || ay < -0.45;
      down = down || ay > 0.45;
      const prev = this.padPrev[slot] || {};
      const btn = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
      const edge = (i) => btn(i) && !prev[i];
      jump = jump || edge(0) || edge(12);
      attack = attack || edge(2);
      special = special || edge(1);
      ultra = ultra || edge(3);
      regen = regen || edge(5) || edge(7);
      this.padPrev[slot] = {
        0: btn(0),
        1: btn(1),
        2: btn(2),
        3: btn(3),
        5: btn(5),
        7: btn(7),
        12: btn(12)
      };
    }

    // P3/P4 keyboard fallback shares P1/P2 with modifiers via gamepad primarily
    if (slot >= 2 && !pad) {
      return {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false,
        attack: false,
        special: false,
        ultra: false,
        regen: false,
        moveX: 0
      };
    }

    const moveX = (right ? 1 : 0) - (left ? 1 : 0);
    return { left, right, up, down, jump, attack, special, ultra, regen, moveX };
  }
}
