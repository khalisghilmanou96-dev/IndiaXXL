# AURORA° — Boutique démo premium en français

Version pensée pour les présentations à de potentiels clients.

## Fonctionnalités

- Interface 100 % en français
- Design premium responsive
- Mise en page renforcée contre les chevauchements
- Six produits de démonstration à 0,01 €
- Filtres par catégorie
- Fiches produit en modal
- Panier fonctionnel
- Checkout complet
- Paiement démo simulé sans débit bancaire
- Confirmation de commande
- Suivi de commande côté client
- Administration privée
- Recherche de commandes
- Passage Payée → Préparée → Expédiée → Terminée
- Numéro de suivi
- Historique de commande
- Réinitialisation des commandes de démo

## Démarrage

```bash
cd demo-shop
cp .env.example .env
npm install
npm start
```

Boutique :
`http://localhost:3000/`

Administration :
`http://localhost:3000/gestion.html`

Mot de passe de démo par défaut :
`demo-admin-2026`

## Parcours conseillé en rendez-vous

1. Ouvrir la boutique.
2. Ajouter un ou deux produits.
3. Montrer la fiche produit et le panier.
4. Passer au checkout.
5. Valider le paiement démo.
6. Montrer la confirmation et le suivi.
7. Ouvrir l’administration dans un second onglet.
8. Passer la commande en Préparée puis Expédiée.
9. Ajouter un numéro de suivi.
10. Revenir côté client et actualiser le statut.

Le paiement à 0,01 € est simulé localement pour la démonstration. Aucune carte réelle n’est débitée.


## Identité visuelle AURORA

La démo utilise désormais un système couleur cohérent sur tout le parcours :

- **Bleu nuit — `#08111F`** : fond principal, sérieux et premium.
- **Violet électrique — `#6C5CE7`** : couleur de marque et appels à l’action.
- **Corail — `#FF6B6B`** : accent commercial, panier et éléments d’attention.
- **Menthe — `#4ED6A0`** : validation, paiement confirmé et livraison.
- **Ambre — `#F5B942`** : informations et avertissements.
- **Blanc cassé — `#F7F9FC`** : texte principal.
- **Gris bleuté — `#9AA7BA`** : texte secondaire.

Le violet reste dominant afin que la marque soit immédiatement reconnaissable, tandis que le corail est réservé aux accents commerciaux et le vert aux états positifs.
