# Foot Golf PWA

## Description
Application PWA pour gérer des parties de foot golf entre amis. Fonctionne offline sur iPhone.

## Stack technique
- HTML/CSS/JavaScript vanilla (pas de framework)
- IndexedDB pour le stockage local
- Service Worker pour le mode offline
- PWA installable sur iPhone via Safari

## Structure du projet
```
foot-golf/
├── index.html          # Point d'entrée, tous les écrans
├── manifest.json       # Configuration PWA
├── sw.js               # Service Worker (cache offline)
├── update-cache.ps1    # Script pour mettre à jour la version du cache
├── css/
│   └── style.css       # Styles responsive mobile
├── js/
│   ├── storage.js      # Module IndexedDB (Courses, Games)
│   └── app.js          # Logique applicative
└── icons/
    ├── usp.jpg         # Logo source (US Puyricard)
    ├── usp-192.png     # Icône PWA 192x192
    └── usp-512.png     # Icône PWA 512x512
```

## Fonctionnalités
- **Parcours** : créer/éditer/supprimer des parcours avec nom et liste de trous (par)
- **Parties** : choisir un parcours, ajouter des joueurs, saisir les scores relatifs
- **Scores** : affichage en relatif (0, +1, -1...), navigation trou par trou
- **Historique** : liste des parties terminées avec date, vainqueur, joueurs
- **Modification date** : dans le détail d'une partie, cliquer sur ✏️ pour changer la date
- **Stats joueurs** : parties jouées, victoires, meilleur score, score moyen
- **Export/Import** : sauvegarde JSON pour backup et transfert entre appareils
- **Rappel export** : proposé automatiquement après chaque partie terminée

## Hébergement
- **GitHub** : https://github.com/raho71/foot-golf
- **GitHub Pages** : https://raho71.github.io/foot-golf/
- Les chemins dans `manifest.json` et `sw.js` sont configurés pour `/foot-golf/`

## Déploiement
Un alias Git est configuré pour simplifier le déploiement :

```bash
git pub
```

Cette commande :
1. Met à jour automatiquement `CACHE_VERSION` dans `sw.js` avec la date/heure
2. Ajoute tous les fichiers modifiés
3. Commit avec le message "Update"
4. Pousse sur GitHub

Le site est mis à jour sur GitHub Pages après 1-2 minutes.

## Gestion du cache (Service Worker)
- Le fichier `sw.js` contient une variable `CACHE_VERSION` avec un timestamp
- À chaque `git pub`, cette version est mise à jour automatiquement
- Cela force les iPhones à télécharger la nouvelle version de l'app
- Si l'app ne se met pas à jour sur iPhone : fermer l'app complètement et la relancer

## Modèle de données

### Course
```javascript
{
  id: "uuid",
  name: "Nom du parcours",
  holes: [
    { number: 1, par: 3 },
    { number: 2, par: 4 },
    // ...
  ]
}
```

### Game
```javascript
{
  id: "uuid",
  courseId: "uuid",
  courseName: "Nom du parcours",
  courseHoles: [...],           // Copie des trous au moment de la partie
  date: "2026-08-07T14:30:00",
  players: ["Alice", "Bob"],
  scores: {
    "Alice": [0, +1, -1, null, ...],  // null = pas encore joué
    "Bob": [+1, 0, 0, null, ...],
  },
  finished: false
}
```

## Notes importantes
- Les scores non joués sont `null`, affichés comme `-`
- Quand on clique "Suivant" sur un trou, les scores `null` passent à `0`
- Le bouton "Terminer la partie" est désactivé tant que tous les scores ne sont pas remplis
- Au dernier trou, le bouton "Suivant" devient "Valider ✓"
- Le thème couleur est vert (`#2e7d32`) pour coller au golf
- Les données sont stockées localement sur chaque appareil (pas de synchro entre téléphones)
- Un seul téléphone gère les scores pendant la partie

## Installation sur iPhone
1. Ouvrir **Safari** (obligatoire, pas Chrome)
2. Aller sur https://raho71.github.io/foot-golf/
3. Bouton Partager → "Sur l'écran d'accueil"
4. L'icône USP apparaît sur l'écran d'accueil

## Sauvegarde des données
- Les données sont stockées dans IndexedDB sur l'appareil
- **Export** : Paramètres → Exporter (génère un fichier JSON)
- **Import** : Paramètres → Importer (restaure depuis un fichier JSON)
- L'app propose automatiquement d'exporter après chaque partie terminée
- Penser à sauvegarder régulièrement pour ne pas perdre les données en cas de changement d'iPhone
