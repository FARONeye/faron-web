# Ressources externes à fournir

Le site fonctionne aujourd'hui avec ce qui existe : le logo, l'emblème Ø, le lookbook de concept et le
tech pack v0.5. Pour atteindre le rendu photoréaliste final, voici ce qu'il manque, par ordre d'impact.

## 1. Modèle 3D du T-shirt

**En place** — `npm run build:garment` (`scripts/garment/`) produit :

| Fichier | Contenu |
| --- | --- |
| `public/models/faron-veil.glb` | ≈ 3,4 Mo, 54 k triangles, 7 morph targets, animation « Airflow » 6 s en boucle |
| `public/models/faron-veil-lite.glb` | ≈ 2,9 Mo, 29 k triangles (mobile), même animation |
| `public/media/faron-veil-loop(.webm, -portrait.webm, -back.webm, -poster.jpg)` | boucles héro 6 s rendues depuis le GLB (face 1280×720 et 720×1280, dos 1280×720) — `npm run build:hero` |
| `public/models/faron-veil.report.json` | patron, journal de simulation, qualité de compression, cotes portées |

Méthode : le **patron** (devant, dos, manches, panneaux latéraux en coin de la planche lookbook, bord-côte à 88 % de l'encolure) suit
la construction du tech pack v0.5, avec des **proportions de prototype boxy** (`PROTOTYPE_3D` dans `spec.ts` :
poitrine 64 cm à plat, longueur 59 cm, épaules 50 cm) — valeurs visuelles à valider sur un prototype physique,
différentes des cotes du tech pack affichées dans le guide des tailles (58 / 65 cm). Il est **cousu et drapé par
simulation de tissu** (XPBD) sur un **mannequin invisible** homme taille M (poitrine ~92 cm ; dos en courbe
continue, omoplates à peine marquées, creux lombaire léger ; trapèzes, cou presque droit, deltoïdes, bras relâchés
légèrement asymétriques). Porté, le buste mesure ~47 cm de large pour ~57 cm de haut, flancs droits sans
cintrage (avant : ~42 cm pour ~63 cm, rétréci vers l'ourlet).
La gravité, le frottement et la raideur en flexion d'un jersey 280 g/m² (flexion dièdre, ourlets et bord-côte
plus raides) donnent le tombé : buste droit de la poitrine à l'ourlet, plis larges. Le bord-côte est posé
d'emblée sur la forme de l'encolure pour être cousu sans se replier. Une brise périodique (traînée
aérodynamique sur chaque face, amortie par la vitesse relative du tissu) est ensuite simulée et enregistrée
sur une boucle parfaite (brise douce de 2,6 m/s, fortement amortie, comme un jersey lourd) : crête à crête
médiane ~2,7 cm à l'ourlet, ~1,9 cm sur les panneaux, ~0,5 cm aux ouvertures de manche ; épaules et encolure
immobiles. Le mouvement est compressé par ACP (7 composantes, 99,9 % du mouvement, erreur < 2,2 mm). Coutures, surpiqûres, broderie Ø, étiquettes et
ourlets roulottés sont attachés au tissu en coordonnées patron et bougent avec lui ; l'envers du tissu
est une surface réelle (épaisseur ~1 mm, ourlets double couche, bord-côte plié).

**Pour aller plus loin** (le modèle est une simulation fidèle au patron, pas un scan du prototype) :

| Ressource | Pourquoi |
| --- | --- |
| Patron DXF validé (après échantillon A) | Remplacer les courbes d'emmanchure, de tête de manche et d'encolure estimées (`scripts/garment/pattern.ts`) |
| Photos à plat du prototype FARØN (face, dos, profil) avec mètre visible | Contrôler la silhouette simulée face au vêtement réel |
| Cotes validées de la coupe boxy (poitrine, longueur, épaules) | Remplacer `PROTOTYPE_3D` dans `spec.ts` puis relancer `build:garment` et `build:hero` ; mettre à jour le guide des tailles |
| Mesures d'un essayage (porté, debout) | Ajuster le mannequin (`BODY` dans `spec.ts`) au porteur cible et la remontée de l'ourlet (≈ 2 cm actuellement) |
| MP4 H.264 de la boucle héro | Le build ne produit que du WebM (VP8) ; un MP4 couvre les anciens Safari (`siteConfig.assets.heroVideo.mp4`) |
| Export CLO3D / Marvelous Designer (optionnel) | Simulation de production avec propriétés textiles mesurées ; peut remplacer les GLB à l'identique |

Contraintes d'un GLB de remplacement : 1 unité = 1 m, devant vers +Z, HPS à y = 0,23, Meshopt (pas de
Draco), ≈ 3 Mo, animation nommée `Airflow` en boucle. Relancer ensuite le build ou mettre à jour
`src/components/three/shirt/viewpoints.json` (cadrages des gros plans).

## 2. Panneaux latéraux, motifs et logo de dos

**En place** :

- **Panneaux** en coin (pointe sous le bras → ~17 cm à l'ourlet, ouverture rapide), avancés de 4 cm vers le
  devant pour être lisibles de face ; devant et dos s'ajustent pour garder un tour constant. Micro-mesh
  légèrement plus claire que le jersey.
- **Dragon d'inspiration Sak Yant** (`scripts/garment/motif.ts`) : il s'enroule une fois et demie autour de la
  taille en spirale descendante ; son corps passe sous le devant et le dos (restés nets) et n'apparaît que dans
  les panneaux, coupé net aux coutures. Panneau gauche porté : tête de dragon-naga tournée vers l'avant face à
  une perle enflammée, nuque vers le dos, passage bas avec la patte avant qui tient la perle. Panneau droit
  porté : passage haut avec la patte arrière, queue effilée qui remonte en crosse. Langage Sak Yant : doubles
  contours ponctués, écailles en demi-lunes pointées, crêtes de flammes kranok, spirales, colonnes d'ornements
  symétriques sous les bras (comme sur la planche lookbook), lignes pointillées le long des coutures. Aucune
  écriture ni pseudo-écriture sacrée. Encre argent sourd légèrement bronzée, faiblement métallisée
  (métallique 0,4, rugosité 0,5). Composition originale, remplaçable par le fichier officiel : PNG transparent
  1904 × 1848 px (deux panneaux côte à côte, gauche porté puis droit porté, chacun 17 × 33 cm : u de −8,5 à
  +8,5 cm, v de l'aisselle à l'ourlet, bord gauche = côté devant), à brancher à la place de `bakePanelPrint()`.
- **Dos** : emblème Ø officiel de 26 cm de large (cible visuelle 25–28 cm en M, proportions d'origine, à valider
  sur la surface imprimable réelle) centré à un tiers de la hauteur depuis l'encolure dos (au-dessus du milieu),
  sans toucher les panneaux ; mot-symbole FARØN ~5,5 cm sous le col ; métal brossé satiné (métallique ~0,88,
  rugosité ~0,42), finition inchangée.

> Écarts avec le tech pack v0.5 (panneaux de 3 cm, « aucun grand motif dorsal ») : choix de direction
> artistique à confirmer avec l'atelier (procédés : impression sur mesh, transfert métallisé au dos).

## 3. Photos produit réelles

Les visuels actuels sont des **visuels de concept** (lookbook), marqués « non contractuels » sur le site.
La galerie de la fiche produit (`ProductGallery`, à côté de la vue 3D) les affiche au format natif, sans
les agrandir au-delà de 2 à 2,5 fois leur taille réelle : les recadrages du lookbook (≈ 200 à 450 px de
large) y restent petits. Ils montrent aussi l'ancien décor des panneaux, antérieur au dragon.
Les photos de T-shirt uni fournies comme références de coupe (sans Ø, panneaux ni dragon) ne sont pas
publiées : elles ne représentent pas la pièce. Ordre de la galerie : `galleryOf()` ; dimensions natives
dans chaque entrée (`width`, `height`).
Remplacer dans `src/config/product.ts → media` :

- face et dos en studio, fond noir, 3000 px minimum ;
- macros : maille, col, broderie, étiquettes, panneau ;
- portés : 2 à 4 silhouettes.

## 4. Vidéo d'espace (optionnelle)

Le fond spatial est une scène WebGL temps réel (nébuleuses, galaxies, trois couches d'étoiles avec
parallaxe, poussière). Pour une version vidéo : boucle sans couture de 20–30 s, 1920 × 1080, H.264 + WebM,
≤ 6 Mo, avec une image de poster. Le champ `siteConfig.assets.heroVideo` est réservé à cet usage, mais
le lecteur vidéo n'est pas encore branché : il faut l'ajouter dans `HomeExperience.tsx` en même temps
que la vidéo.

## 5. Informations commerciales et légales

Toutes affichées en placeholders « À DÉFINIR » (bordure violette pointillée) :

- `src/config/product.ts` : prix, stock par taille, composition mesurée, entretien, pays de fabrication, statut ;
- `src/config/commerce.ts` : pays, transporteurs, délais, frais, politique de retour ;
- `src/config/site.ts` : e-mail, Instagram, mentions légales (raison sociale, SIRET, hébergeur, médiateur…).

Passer `siteConfig.showPlaceholders` à `false` seulement quand tout est renseigné et validé juridiquement.
