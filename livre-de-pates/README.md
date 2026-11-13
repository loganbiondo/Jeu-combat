# Mes premières pâtes

Livre illustré de 18 pâtes et gâteaux, écrit pour être fait par un enfant avec un adulte. Noisette, personnage de dessin animé, accompagne des assiettes peintes.

86 pages, format 8 × 10 pouces (20,32 × 25,4 cm), sans fond perdu. Intérieur couleur. Les fichiers à envoyer sont dans `dist/`.

| Fichier | Usage |
| --- | --- |
| `dist/mes-premieres-pates-interieur.pdf` | Intérieur broché (Amazon KDP) |
| `dist/mes-premieres-pates-couverture.pdf` | Couverture complète : dos, tranche, plat |
| `dist/mes-premieres-pates.epub` | Kindle, Kobo, Apple Books, Google Play |
| `dist/mes-premieres-pates-couverture-ebook.png` | Couverture numérique, 1600 × 2560 |

La vérification des recettes, et tout ce qui a été précisé par rapport aux formules de départ, est dans `CORRECTIONS.md`.

## Avant de mettre en vente

1. Ouvrez `src/recettes.mjs` et remplacez `Édition indépendante` par votre nom, si vous voulez qu’il apparaisse.
2. Relancez la fabrication : `node src/build.mjs` (depuis ce dossier).
3. Relisez l’intérieur, surtout les pages d’allergènes (amandes, chocolat) et la page de friture.
4. Commandez une épreuve papier avant de publier. Le four de vos lecteurs ne sera pas le vôtre, mais la mise en page, elle, se juge sur papier.

## Amazon KDP — livre broché

Dans le formulaire :

- Langue : français
- Format : 8 × 10 po (20,32 × 25,4 cm)
- Fond perdu : non
- Intérieur : couleur premium, papier blanc
- Couverture : le PDF `mes-premieres-pates-couverture.pdf`
- Nombre de pages de cette fabrication : 86

Mesures de la couverture, calculées pour 86 pages en papier couleur (0,002347 po par page) :

- Tranche : 0,2018 po
- Fichier : 16,4518 × 10,25 po, fond perdu de 0,125 po compris
- Pas de texte sur la tranche : elle est trop fine pour un caractère de 7 pt avec la marge de sécurité KDP (0,0625 po de chaque côté). Si vous ajoutez des pages, recalculez et relancez `node src/build.mjs`.
- Le rectangle blanc en bas du dos, près de la tranche, est l’emplacement du code-barres. Ne le remplissez pas : KDP pose le sien.

Le prix doit couvrir le coût d’impression, que KDP affiche dans son calculateur. La couleur premium coûte plus cher que le noir et blanc. La distribution élargie (hors Amazon) n’est pas garantie pour ce format couleur : vérifiez la case au moment du formulaire.

Catégories utiles : cuisine, pâtisserie, livres pour enfants / activités. Public indiqué dans le livre : dès 6 ou 7 ans, toujours avec un adulte.

## Autres plateformes

- **Kindle** : envoyez l’EPUB et la couverture PNG. La langue est le français.
- **Kobo Writing Life, Apple Books, Google Play Livres** : le même EPUB et la même couverture.
- **PDF à part** (boutique ou Etsy) : l’intérieur seul n’est pas une couverture. Pour un fichier à télécharger, l’EPUB ou un PDF que vous exportez pour l’écran suffisent ; le PDF d’intérieur est calibré pour l’impression.

## Refaire le livre

Depuis `livre-de-pates` :

```bash
node src/build.mjs
```

Il faut Node, Google Chrome et Poppler (`pdfinfo`). Les images déjà préparées sont dans `illustrations/` : le script les réutilise, il ne les régénère pas. Pillow ne sert que si une image de ce dossier manque. Les polices Noto Serif Display et Inter sont dans `fonts/`, sous SIL Open Font License, non modifiées.
