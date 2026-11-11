export type Character = {
  id: string;
  name: string;
  role: string;
  species: string;
  tagline: string;
  colors: { body: string; accent: string; outline: string };
  free: boolean;
};

export const CHARACTERS: Character[] = [
  { id: 'lumo', name: 'Lumo', role: 'gentil', species: 'alien', tagline: 'Voyageur tout doux', colors: { body: '#7dd3fc', accent: '#fef08a', outline: '#0c4a6e' }, free: true },
  { id: 'pebble', name: 'Pebble', role: 'gentil', species: 'animal', tagline: 'Roc ronronnant', colors: { body: '#a8a29e', accent: '#84cc16', outline: '#292524' }, free: true },
  { id: 'nori', name: 'Nori', role: 'gentil', species: 'humain', tagline: 'Wok de ki', colors: { body: '#fb7185', accent: '#fdba74', outline: '#7f1d1d' }, free: true },
  { id: 'capra', name: 'Capra', role: 'méchant', species: 'animal', tagline: 'Chèvre pirate', colors: { body: '#c4b5fd', accent: '#f472b6', outline: '#4c1d95' }, free: true },
  { id: 'mossy', name: 'Mossy', role: 'gentil', species: 'super', tagline: 'Gardien forestier', colors: { body: '#4ade80', accent: '#a3e635', outline: '#14532d' }, free: true },
  { id: 'zib', name: 'Zib', role: 'méchant', species: 'alien', tagline: 'Chaos rose', colors: { body: '#f9a8d4', accent: '#67e8f9', outline: '#9d174d' }, free: true },
  { id: 'kira', name: 'Kira', role: 'gentil', species: 'humain', tagline: 'Poing solaire', colors: { body: '#fde047', accent: '#38bdf8', outline: '#854d0e' }, free: true },
  { id: 'bolt', name: 'Bolt', role: 'super', species: 'animal', tagline: 'Écureuil survolté', colors: { body: '#fdba74', accent: '#facc15', outline: '#9a3412' }, free: true },
  { id: 'quillox', name: 'Quillox', role: 'gentil', species: 'alien', tagline: 'Plumes tourbillons', colors: { body: '#99f6e4', accent: '#e9d5ff', outline: '#115e59' }, free: false },
  { id: 'ironpaw', name: 'Ironpaw', role: 'super', species: 'animal', tagline: 'Félin blindé', colors: { body: '#94a3b8', accent: '#f97316', outline: '#1e293b' }, free: false },
  { id: 'velvet', name: 'Velvet Nyx', role: 'méchant', species: 'humain', tagline: 'Téléport velours', colors: { body: '#e879f9', accent: '#1e1b4b', outline: '#4a044e' }, free: false }
];

export const SHOP = [
  { id: 'adfree', type: 'adfree', name: 'Mode Sans Pub', description: 'Supprime les pubs.', price: '4,99 €', icon: '✦' },
  { id: 'char_quillox', type: 'character', characterId: 'quillox', name: 'Quillox', description: 'Alien plumeux.', price: '2,99 €', icon: '✧' },
  { id: 'char_ironpaw', type: 'character', characterId: 'ironpaw', name: 'Ironpaw', description: 'Super-félin.', price: '2,99 €', icon: '✧' },
  { id: 'char_velvet', type: 'character', characterId: 'velvet', name: 'Velvet Nyx', description: 'Anti-héroïne.', price: '3,49 €', icon: '✧' },
  { id: 'tech_spiral_nova', type: 'technique', techniqueId: 'spiral_nova', name: 'Nova Spirale', description: 'Ultra bonus.', price: '1,99 €', icon: '✸' }
];

export const PROMPTS = [
  'Invente un snack qui recharge le ki en trois bouchées.',
  'Décris une arène flottante faite de nuages caramel.',
  'Écris le slogan d’un tournoi amical d’aliens tout doux.',
  'Imagine un animal de compagnie qui parle en étincelles.',
  'Crée une danse de victoire ridicule mais magnifique.',
  'Propose un nom de technique spéciale jamais vue.',
  'Raconte une rivalité amicale entre un roc et une plume.',
  'Design un costume de combat inspiré d’un dessert.',
  'Écris un haiku sur un smash qui rate comiquement.',
  'Invente une règle maison pour un match 2v2 farceur.',
  'Décris le bruit d’un laser… mais tout mignon.',
  'Crée un mentor âgé qui enseigne le parkour de ki.',
  'Imagine une planète où les combats se gagnent en souriant.',
  'Propose trois objets power-up totalement absurdes.',
  'Écris le journal intime d’un méchant trop gentil.',
  'Design un stage avec des trampolines de gelée.',
  'Invente un cri de combat en onomatopées douces.',
  'Décris une médaille de tournoi qui change de couleur.',
  'Crée une amitié entre un pirate-chèvre et un chef wok.',
  'Propose un mode entraînement “coussin géant”.',
  'Écris une légende urbaine sur un gland tonnerre perdu.',
  'Imagine un podcast animé par deux aliens pelucheux.',
  'Design un emote de taunt qui fait rire l’adversaire.',
  'Invente une potion qui transforme les coups en confettis.',
  'Décris une tempête rose qui soigne au lieu de blesser.',
  'Crée un duo 2v2 nommé “Sucre & Foudre”.',
  'Propose un challenge : gagner sans utiliser le sol.',
  'Écris une carte postale depuis une arène orbitale.',
  'Imagine un juge de combat qui note le style.',
  'Design un skin “aurore boréale” pour un rocher.',
  'Invente un mini-boss qui n’attaque qu’avec des câlins.',
  'Décris le goût du ki : sucré, pétillant, ou épicé ?',
  'Crée une chanson de lobby de 8 mesures.',
  'Propose un nom d’équipe pour quatre softies.',
  'Écris une excuse créative après une chute du stage.',
  'Imagine un magasin de techniques d’occasion.',
  'Design un projectile qui rebondit en musique.',
  'Invente une fête annuelle “Jour du Smash Doux”.',
  'Décris une transformation qui rend plus… rond.',
  'Crée un tutorial narré par un écureuil survolté.',
  'Propose un puzzle d’entraînement avec des plateformes.',
  'Écris un dialogue entre deux jauges de ki jalouses.',
  'Imagine une arène dans une bibliothèque flottante.',
  'Design un chapeau qui augmente le charisme du taunt.',
  'Invente une technique qui échange les positions.',
  'Décris un knockback tellement beau qu’on applaudit.',
  'Crée un rival mystérieux qui laisse des biscuits.',
  'Propose un badge “Fair-play cosmique”.',
  'Écris une recette de smoothie post-combat.',
  'Imagine un stage qui change selon le volume sonore.',
  'Design une aura de ki en forme d’animaux origami.',
  'Invente un mode “miroir farceur” pour 1v1.',
  'Décris une défaite glorieuse digne d’un générique.',
  'Crée un pet de combat qui ramasse le loot.',
  'Propose un surnom pour un combo à trois hits.',
  'Écris un message d’accueil pour nouveaux joueurs.',
  'Imagine une collab entre un wok et un bouclier mousse.',
  'Design un effet de victoire en pluie de pétales.',
  'Invente une monnaie du jeu : les “étincelles douces”.',
  'Décris un entraînement matinal sur une comète.',
  'Crée un personnage guest : toast vivant héroïque.',
  'Propose une rumeur sur le “vrai” secret du ki.',
  'Écris un haiku sur une régénération sous la lune.',
  'Imagine un festival de taunts avec jury.',
  'Design un stage sous-marin en bulles colorées.',
  'Invente une ultra qui peint le ciel en spirales.',
  'Décris un coach robot qui encourage trop fort.',
  'Crée une rivalité sportive autour d’un trophée flan.',
  'Propose un défi hebdo : 10 smashs sans tomber.',
  'Écris le mode d’emploi d’un cape anti-pub magique.',
  'Imagine une carte de collection holographique.',
  'Design un effet d’entrée en scène théâtral.',
  'Invente un duo “ombre & aurore” pour 2v2.',
  'Décris une arène construite dans une tasse géante.',
  'Crée un sort qui transforme les dégâts en notes de musique.',
  'Propose un titre honorifique après 50 victoires.',
  'Écris une anecdote de LAN party cosmique.',
  'Imagine un chat blindé qui adore les câlins.',
  'Design un projectile en forme de croissant de lune.',
  'Invente une technique de parade qui fait des étincelles.',
  'Décris un stage nocturne avec lucioles de ki.',
  'Crée un quiz “Quel alien tout doux es-tu ?”.',
  'Propose un nom pour un serveur matchmaking amical.',
  'Écris une promesse de rematch en rimes.',
  'Imagine une boutique de skins peints à la main.',
  'Design un effet de téléport en velours violet.',
  'Invente un buff “sourire critique” (+style).',
  'Décris une cérémonie de remise de prompts récompense.',
  'Crée un flashback comique d’un premier combat.',
  'Propose une alliance improbable humain + rocher.',
  'Écris un manuel de farces électriques responsables.',
  'Imagine un stage sur un train de nuages.',
  'Design une barre de vie en forme de ruban festif.',
  'Invente une danse 2v2 synchronisée obligatoire.',
  'Décris un trophée qui raconte des blagues.',
  'Crée un mode spectateur avec confettis interactifs.',
  'Propose un surnom pour un joueur qui spam le jump.',
  'Écris une légende sur le premier Smash Ki de l’univers.',
  'Imagine une fin de journée : thé, ki, et rematch.',
  'Design le générique de fin d’Arena Ki Fighters.'
].map((t) => t.replace(/\u0435/g, 'e'));

export function pickPrompt(history: number[] = []) {
  const unused = PROMPTS.map((_, i) => i).filter((i) => !history.includes(i));
  const pool = unused.length ? unused : PROMPTS.map((_, i) => i);
  const index = pool[Math.floor(Math.random() * pool.length)];
  return { index, text: PROMPTS[index] };
}

export type SaveData = {
  unlockedCharacters: string[];
  ownedProducts: string[];
  adFree: boolean;
  promptHistory: number[];
  wins: number;
};

export const DEFAULT_SAVE: SaveData = {
  unlockedCharacters: CHARACTERS.filter((c) => c.free).map((c) => c.id),
  ownedProducts: [],
  adFree: false,
  promptHistory: [],
  wins: 0
};
