# FARØN — PROJECT 001 — VEIL

Site e-commerce immersif de FARØN : accueil cinématique en espace profond, T-shirt 3D animé par le vent,
récit au défilement, fiche produit, panier et paiement Stripe Checkout.

**Stack** : Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 ·
Three.js + React Three Fiber + Drei · GSAP ScrollTrigger · Lenis · Motion · Zustand · Stripe.

## Démarrer

```bash
npm install
cp .env.example .env.local   # facultatif : clés Stripe
npm run dev                  # http://localhost:3000
```

`?lite=1` dans l'URL force le mode 3D allégé (mobile) pour le tester sur ordinateur.

## Où modifier quoi

| Besoin | Fichier |
| --- | --- |
| Prix, stock, statut, textes produit, mesures | `src/config/product.ts` |
| Livraison, retours, pays Stripe | `src/config/commerce.ts` |
| Coordonnées, mentions légales, modèle GLB, placeholders | `src/config/site.ts` |
| Chorégraphie caméra de l'accueil | `src/components/home/rig.ts` |
| Cotes et sources du T-shirt 3D | `scripts/garment/spec.ts` |
| Points de vue caméra sur le T-shirt | `src/components/three/shirt/dimensions.ts` |
| Galerie de la fiche produit (ordre, visuels) | `src/config/product.ts → media`, `galleryOf()` |
| Éclairage de la visionneuse 3D | `src/components/three/ShirtViewer.tsx` (`CameraLightRig`) |

## Modèle 3D (GLB) et boucle vidéo

```bash
npm run build:garment            # ~5 min la première fois (simulation), quelques secondes ensuite (cache)
npm run build:garment -- --resim # force une nouvelle simulation
```

Le générateur (`scripts/garment/`) coud le patron (proportions du prototype boxy, `PROTOTYPE_3D`) sur un mannequin invisible par simulation
de tissu, enregistre une brise en boucle de 6 s, la compresse en morph targets et exporte deux GLB
(Meshopt). Il régénère aussi les cadrages caméra (`src/components/three/shirt/viewpoints.json`).
Paramètres : `scripts/garment/spec.ts` (patron, mannequin, raideurs, vent).

La boucle héro WebM de `public/media/` est rendue depuis le GLB ; elle sert de repli sans WebGL.

Ressources à produire pour le rendu final : voir [ASSETS.md](./ASSETS.md).

## Ouvrir la vente

1. Renseigner `priceCents` et `stock`, puis passer `status: "available"` dans `src/config/product.ts`.
2. Définir `STRIPE_SECRET_KEY` (au moment du build : la disponibilité du paiement est calculée côté serveur).
3. Créer un endpoint webhook Stripe vers `/api/stripe/webhook` (événements `checkout.session.*`)
   et définir `STRIPE_WEBHOOK_SECRET`. Le traitement des commandes payées (stock, e-mail, atelier)
   est à brancher à l'endroit marqué `À BRANCHER`.
4. Compléter toutes les valeurs « À DÉFINIR », faire valider les pages légales, puis
   `showPlaceholders: false`.

Sans clé Stripe ou tant que le produit est en `prelaunch`, le panier fonctionne mais COMMANDER reste
désactivé et l'API répond 503. Aucun paiement n'est jamais simulé. La page de confirmation interroge
Stripe et n'affiche « commande confirmée » que pour une session réellement payée.

Le stock est lu depuis la configuration : pour un suivi automatique des quantités, brancher le webhook
sur une base de données ou un back-office e-commerce.

## Accessibilité et performance

- Trois niveaux graphiques détectés automatiquement : complet, allégé (géométrie, particules et
  résolution réduites, sans ombres) et sans WebGL (visuels statiques).
- `prefers-reduced-motion` : ni vent, ni dérive de caméra, ni défilement amorti ; seule la rotation du
  vêtement suit le défilement.
- 3D chargée à la demande avec indicateur de progression ; résolution abaissée si le framerate chute.
- Navigation clavier, dialogues accessibles (panier, guide des tailles, visionneuse), lien d'évitement.
