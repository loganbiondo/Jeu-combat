# Arena Ki Fighters

Jeu de combat — arène type **Smash** + jauge de **ki**, rendu **4D** (hypercube, failles, chrono-warp).

## Téléphone (Expo Go → Play Store)

```bash
cd mobile
npm install
npx expo start          # scanne le QR avec Expo Go
# ou : npx expo start --tunnel
```

Détails : [mobile/README.md](mobile/README.md)

## Desktop (Electron)

## Fonctionnalités

- Personnages **100 % originaux** (humains, animaux, supers, gentils, méchants, aliens tout doux)
- Techniques spéciales & ultras avec FX distincts + **attaques spectaculaires** (cut-in, charge, beams, météores, projectiles, slow-mo)
- **Super Finisher** quand l’adversaire est déjà haut %
- Audio synthétisé (hits, ki, ultra, KO, victoire)
- Stages 4D : Faille Hypercube, Orbite Douce, Rails de Gelée
- Combats **1v1 / 2v2**, **local** (clavier + manettes) ou **en ligne** (Socket.io)
- Dégâts = stats + aléatoire, barres de vie + % Smash, stocks
- Ki : se remplit en frappant → regen PV ou coups puissants
- Journal des coups, écran de victoire, panneau **Récompense** (100 prompts)
- Pubs entre combats / accueil + **mode sans pub**
- Boutique IAP (personnages, skins, techniques) via **Stripe Checkout** (sandbox sans clé)

## Lancer

```bash
npm install
npm run smoke    # test moteur headless
npm run server   # terminal 1 — matchmaking :3847
npm start        # terminal 2 — appli Electron
```

Ou les deux : `npm run dev`

### Stripe (optionnel)

```bash
export STRIPE_SECRET_KEY=sk_test_...
npm start
```

Sans clé : achats **sandbox** instantanés dans la boutique.

### Serveur distant

Dans la console DevTools du jeu : `localStorage.setItem('aki-server', 'http://IP:3847')`

## Commandes (local)

| Action | P1 | P2 |
|--------|----|----|
| Bouger | WASD / flèches | 4/8/6/5 (pavé) |
| Attaque | J | O |
| Spécial | K | P |
| Ultra | L | [ |
| Regen | I | ] |
| Saut | Espace / Haut | 8 / 0 |

Manettes : stick + A (saut) · X (attaque) · B (spécial) · Y (ultra) · RB (regen)

## Build

```bash
npm run dist
```

## Stack

Electron · HTML/CSS/JS (canvas) · Express + Socket.io · Stripe
