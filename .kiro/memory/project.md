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
- **Stats joueurs** : parties jouées, victoires, meilleur score, score moyen
- **Export/Import** : sauvegarde JSON pour backup et transfert entre appareils
- **Rappel export** : proposé automatiquement après chaque partie terminée

## Hébergement
- **GitHub Pages** : https://USERNAME.github.io/foot-golf/
- Les chemins dans `manifest.json` et `sw.js` sont configurés pour `/foot-golf/`

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

## Installation sur iPhone
1. Ouvrir Safari (obligatoire, pas Chrome)
2. Aller sur l'URL GitHub Pages
3. Bouton Partager → "Sur l'écran d'accueil"
