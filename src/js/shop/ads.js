const AD_COPY = [
  {
    title: 'Ki Cola Cosmique',
    body: 'Pétillante, douce, 0 % peur — 100 % smash.',
    cta: 'Boire (fictif)'
  },
  {
    title: 'Trampolines Nuage™',
    body: 'Rebondis plus haut que ton ultra.',
    cta: 'Essayer'
  },
  {
    title: 'Académie Soft Punch',
    body: 'Cours en ligne pour combos mignons.',
    cta: 'S’inscrire'
  },
  {
    title: 'Cape Anti-Pub',
    body: 'Supprime les pubs… en achetant le mode sans pub.',
    cta: 'Boutique'
  },
  {
    title: 'Glands Tonnerre XL',
    body: 'Snack officiel des écureuils survoltés.',
    cta: 'Miam'
  }
];

export function pickAd() {
  return AD_COPY[Math.floor(Math.random() * AD_COPY.length)];
}

export function shouldShowAds(save) {
  return !save?.adFree && save?.settings?.showAds !== false;
}
