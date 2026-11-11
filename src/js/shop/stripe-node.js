/**
 * Stripe Checkout for desktop IAP.
 * Without STRIPE_SECRET_KEY, runs in mock/sandbox mode (instant unlock for local testing).
 */
const PRODUCTS = require('../data/shop-catalog.json');

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  // eslint-disable-next-line global-require
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

async function createCheckoutSession(productId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    return { ok: false, error: 'Produit inconnu' };
  }

  if (!stripe) {
    return {
      ok: true,
      mock: true,
      productId,
      sessionId: `mock_${productId}_${Date.now()}`,
      message: 'Mode sandbox : achat simulé (définis STRIPE_SECRET_KEY pour le vrai Checkout).'
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: product.currency || 'eur',
          unit_amount: product.priceCents,
          product_data: {
            name: product.name,
            description: product.description
          }
        },
        quantity: 1
      }
    ],
    success_url: process.env.STRIPE_SUCCESS_URL || 'https://checkout.stripe.com/success',
    cancel_url: process.env.STRIPE_CANCEL_URL || 'https://checkout.stripe.com/cancel',
    metadata: { productId }
  });

  return { ok: true, mock: false, url: session.url, sessionId: session.id, productId };
}

async function verifySession(sessionId) {
  if (!sessionId) return { ok: false, error: 'session manquante' };

  if (String(sessionId).startsWith('mock_')) {
    const productId = sessionId.split('_')[1];
    return { ok: true, mock: true, paid: true, productId };
  }

  if (!stripe) {
    return { ok: false, error: 'Stripe non configuré' };
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    ok: true,
    mock: false,
    paid: session.payment_status === 'paid',
    productId: session.metadata?.productId || null
  };
}

module.exports = { createCheckoutSession, verifySession, PRODUCTS };
