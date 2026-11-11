const fs = require('fs');

const FREE_CHARACTERS = [
  'lumo', 'pebble', 'nori', 'capra', 'mossy', 'zib', 'kira', 'bolt', 'grok'
];

const DEFAULT_SAVE = {
  unlockedCharacters: [...FREE_CHARACTERS],
  unlockedSkins: {},
  unlockedTechniques: {},
  ownedProducts: [],
  adFree: false,
  promptHistory: [],
  wins: 0,
  matchesPlayed: 0,
  settings: {
    masterVolume: 0.7,
    showAds: true
  }
};

class Store {
  constructor(filePath) {
    this.filePath = filePath;
    this.ensure();
  }

  ensure() {
    try {
      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, JSON.stringify(DEFAULT_SAVE, null, 2));
      }
    } catch (err) {
      console.error('Store ensure failed', err);
    }
  }

  normalize(data) {
    const merged = { ...DEFAULT_SAVE, ...data };
    const unlocked = new Set([...(merged.unlockedCharacters || []), ...FREE_CHARACTERS]);
    merged.unlockedCharacters = [...unlocked];
    return merged;
  }

  read() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return this.normalize(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_SAVE };
    }
  }

  write(data) {
    const merged = this.normalize(data);
    fs.writeFileSync(this.filePath, JSON.stringify(merged, null, 2));
    return merged;
  }

  patch(partial) {
    const current = this.read();
    const next = { ...current, ...partial };
    return this.write(next);
  }
}

module.exports = Store;
module.exports.DEFAULT_SAVE = DEFAULT_SAVE;
