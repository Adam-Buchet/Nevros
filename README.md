# Atrocement Autiste

Le site privé du groupe : archives, défis, fil d'actualité, coffre-fort et jeux. Accessible uniquement avec le mot de passe du groupe.

Site **100 % statique** (HTML/CSS/JS), sans serveur, prêt pour **GitHub Pages**. Toutes les données vivent dans le navigateur : petites données en `localStorage`, fichiers (photos, vidéos, documents) en IndexedDB.

## Fonctionnalités

- **Archives & Nostalgie** — galerie de photos/vidéos du groupe
- **Défis & Vie de groupe** — défis à se lancer, chacun son tour
- **Fil d'actualité** — posts avec likes
- **Coffre-fort** — notes secrètes, liens, fichiers (verrouillage par mot de passe à chaque visite)
- **Ludique & Divertissement** — roulette de prénoms, dé, pile ou face, balle magique, nombre aléatoire, liste de courses, votes, playlist commune
- **Pseudo** — réglé une fois dans le panneau d'apparence, signe automatiquement tes posts, défis, etc.
- **Intro d'ouverture** — après connexion, animation « NÉVROS » façon Mentalist (~6 s), puis entrée sur le site
- **Thèmes** — 8 palettes de couleurs + mode clair/sombre
- **PWA** — installable sur mobile/ordi, coquille du site accessible hors connexion
- **Responsive** — mobile, tablette, ordinateur

## Déployer sur GitHub Pages

1. Pousse ce dossier à la racine d'un dépôt GitHub.
2. GitHub → **Settings** → **Pages** → **Build and deployment** → source **Deploy from a branch** → choisis `main` et le dossier racine (`/`).
3. Le site est en ligne sur `https://<utilisateur>.github.io/<dépôt>/`.

## Tester en local

```bash
python -m http.server 8080
# ou : npx serve .
```

Puis ouvre `http://localhost:8080/`.

## Mot de passe

- Mot de passe initial : `Bird0505`
- Il est stocké haché (SHA-256) dans le `localStorage` du navigateur à la première visite.
- Pour le changer : modifie `DEFAULT_PASSWORD` dans `js/store.js`, puis **vide le `localStorage` du site** (ou supprime la clé `aa_site_password`) dans le navigateur de chaque membre.

## Données

Tout est stocké **par navigateur** :

- `localStorage` — posts, défis, votes, playlist, coffre (notes/liens), liste de courses, prénoms, thème, pseudo, session
- `IndexedDB` (`aa-files`) — fichiers des archives et du coffre
- Session valable 7 jours ; le coffre se reverrouille à chaque nouvelle visite

Il n'y a **pas** de base de données centrale : chaque appareil a sa propre copie.

## Structure

```
├── index.html           ← accueil (héro, cartes, intro d'ouverture)
├── login.html           ← écran de mot de passe
├── archives.html        ← galerie de souvenirs
├── defis.html           ← défis du groupe
├── actualites.html      ← fil d'actualité
├── coffre.html          ← coffre-fort
├── ludique.html         ← jeux + playlist + votes
├── css/                 ← styles + thèmes
├── js/
│   ├── store.js         ← couche de données locale (remplace l'ancien backend)
│   ├── app.js           ← init commun (thèmes, menu, transitions, intro, PWA)
│   └── *.js             ← logique de chaque page
├── fonts/               ← polices
├── icons/               ← icônes PWA
├── manifest.json        ← manifest PWA
└── sw.js                ← service worker (chemins relatifs)
```
