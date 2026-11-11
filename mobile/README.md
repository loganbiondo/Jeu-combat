# Arena Ki Fighters — Expo (téléphone)

Version **Android / iOS** testable avec **Expo Go**, prête pour un build **Play Store** via EAS.

## Tester sur ton téléphone (Expo Go)

1. Installe **Expo Go** sur le Play Store / App Store  
2. Sur un PC (même Wi‑Fi que le tel) :

```bash
cd mobile
npm install
npm run build:game   # régénère le bundle combat si besoin
npx expo start
```

3. Scanne le **QR code** avec Expo Go (Android) ou l’appareil photo (iPhone)

Si tu n’es pas sur le même Wi‑Fi :

```bash
npx expo start --tunnel
```

## Jouer

- **1v1** : toi (boutons tactiles) vs IA  
- **2v2** : toi + IA vs 2 IA  
- Boutons : ◀ ▶ · Jump · Atk · Spé · **ULTRA** · Regen  

## Play Store (plus tard)

1. Compte [Google Play Console](https://play.google.com/console) (~25 $)  
2. Compte Expo : `npm i -g eas-cli && eas login`  
3. Dans `mobile/` :

```bash
eas init
eas build -p android --profile preview   # APK de test
eas build -p android --profile production # AAB Play Store
eas submit -p android
```

Les achats sandbox dans Expo Go seront remplacés par **Google Play Billing** à cette étape.

## Notes

- Le combat tourne dans une **WebView** (même moteur Smash + ki + FX que la version desktop).  
- Les menus / boutique / pubs / récompenses sont en **React Native**.  
