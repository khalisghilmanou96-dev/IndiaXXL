# Configuration Stripe — Gau Mata

## Où mettre les clés

À la racine du projet, le fichier `.env` est lu par le serveur. En local, copiez `.env.example` vers `.env` puis remplissez :

```env
PORT=3000
BASE_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE
STRIPE_WEBHOOK_SECRET=whsec_VOTRE_SECRET_WEBHOOK
```

En production, ne mettez pas les secrets directement dans le code ni dans Git. Dans le tableau de bord de votre hébergeur, ouvrez la section **Environment Variables / Secrets** et créez exactement :

- `BASE_URL` = l'URL publique HTTPS du site, sans slash final (ex. `https://votre-domaine.com`)
- `STRIPE_SECRET_KEY` = votre clé Stripe secrète (`sk_test_...` pour les tests, puis `sk_live_...` en production)
- `STRIPE_WEBHOOK_SECRET` = le secret de signature du webhook Stripe (`whsec_...`)

Cette version utilise Stripe Checkout hébergé : aucune clé publique `pk_...` n'est nécessaire dans le navigateur.

## Webhook Stripe

Dans Stripe, créez un endpoint webhook vers :

`https://VOTRE-DOMAINE/api/stripe-webhook`

Événement requis : `checkout.session.completed`.

Copiez ensuite le secret de signature `whsec_...` dans `STRIPE_WEBHOOK_SECRET` chez l'hébergeur.

## Redirection après paiement

Le serveur crée Stripe Checkout avec :

- succès : `/merci.html?session_id={CHECKOUT_SESSION_ID}`
- annulation : `/?payment=cancelled#give`

La page `merci.html` ne se contente pas d'afficher un message : elle appelle `/api/donation-status` et affiche le remerciement final uniquement lorsque Stripe indique que le paiement est `paid`.

## Passage en production

1. Tester d'abord avec `sk_test_...`.
2. Configurer et tester le webhook.
3. Remplacer `STRIPE_SECRET_KEY` par `sk_live_...` dans les secrets de l'hébergeur.
4. Créer/mettre à jour le webhook en mode Live et remplacer `STRIPE_WEBHOOK_SECRET` par le `whsec_...` Live correspondant.
5. Vérifier que `BASE_URL` correspond exactement au domaine HTTPS final.
