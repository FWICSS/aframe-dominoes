# Protocole client et serveur

Tout passe par un seul WebSocket sur `/ws`, avec des messages JSON portant un champ `t`
(type). Le serveur est l'arbitre : il applique les règles, tient les mains secrètes et
n'envoie à chaque joueur que sa propre main. Le client ne fait qu'afficher l'état reçu
et envoyer des intentions.

Fichiers concernés : `server/index.js` (connexion, `join`), `server/room.js` (salle,
relais, tours automatiques), `server/game.js` (règles, vue par siège),
`public/js/net.js` (connexion et reconnexion côté client).

## En dehors du WebSocket

| Route | Rôle |
|---|---|
| `GET /config.json` | Serveurs STUN/TURN pour le chat vocal : `{ "iceServers": [...] }`. Les identifiants TURN y sont signés pour 24 h (voir `DEPLOY.md`). |
| `GET /vendor/aframe.min.js` | Moteur A-Frame, servi depuis `node_modules`. |

## Cycle de vie d'une connexion

1. Le client ouvre `/ws` et envoie `join`.
2. Le serveur répond `welcome`, puis diffuse un `state` à toute la salle.
3. À chaque changement (coup, réglage, arrivée, départ), chaque membre reçoit un `state` complet, calculé pour lui.
4. Si la connexion tombe, le client se reconnecte seul (attente de 0,5 s doublée à chaque essai, plafonnée à 10 s) et renvoie `join` avec le même `clientId` : il retrouve sa place.

Côté serveur :
- Un ping toutes les 30 s ferme les connexions mortes.
- Un joueur déconnecté pendant la salle d'attente perd sa place au bout de 30 s. En pleine partie, il la garde, et un bot joue ses tours à partir de 20 s après sa déconnexion.
- Une salle sans humain connecté est supprimée après 10 min.
- Taille maximale d'un message : 64 Ko. Un message qui n'est pas du JSON, ou sans champ `t`, est ignoré.

## Messages du client vers le serveur

### Entrer dans une salle

```json
{ "t": "join", "room": "KQ7P", "name": "Camille", "clientId": "3f2c9a1e-..." }
```

- `room` : 3 à 8 lettres majuscules ou chiffres, sinon le serveur répond `error`.
- `name` : nettoyé (caractères de contrôle, `<` et `>` retirés), 16 caractères maximum, `Joueur` par défaut.
- `clientId` : 8 à 64 caractères `[a-zA-Z0-9-]`, gardé dans le `sessionStorage` du navigateur. Il sert à retrouver sa place après une reconnexion. Invalide ou absent, le serveur en génère un.
- Un seul `join` par connexion. Un second `join` avec le même `clientId` depuis un autre onglet ferme l'ancienne connexion avec le code `4000`, et le client ne tente pas de s'y reconnecter.

### Salle d'attente

| Message | Qui | Effet |
|---|---|---|
| `{ "t": "settings", "mode": "draw" }` | hôte | Variante : `draw` (avec pioche) ou `block` (bloqué). |
| `{ "t": "settings", "format": "points" }` | hôte | Format : `points` ou `competition` (12 manches). |
| `{ "t": "settings", "targetScore": 100 }` | hôte | Objectif en points : `50`, `100`, `150` ou `200`. |
| `{ "t": "addBot" }` / `{ "t": "removeBot" }` | hôte | Ajoute ou retire un bot (4 places au total). |
| `{ "t": "sit" }` / `{ "t": "stand" }` | tous | Prendre ou libérer une place à la table. |
| `{ "t": "start" }` | hôte | Lance la partie (2 joueurs assis minimum). |

Les champs de `settings` sont indépendants : on peut en envoyer un seul. Une valeur hors liste est ignorée.

### Pendant une manche

| Message | Effet |
|---|---|
| `{ "t": "play", "tileId": "6-4", "side": "left" }` | Pose un domino. `side` vaut `left` ou `right` ; il est ignoré pour le premier domino de la manche. |
| `{ "t": "draw" }` | Pioche (mode avec pioche, quand aucun domino ne se pose). |
| `{ "t": "pass" }` | Passe (aucun domino ne se pose et la pioche est vide). |
| `{ "t": "nextRound" }` | Lance la manche suivante, en fin de manche. Réservé aux joueurs assis. |
| `{ "t": "newGame" }` | Retour en salle d'attente, en fin de partie. Réservé aux joueurs assis. |

Un joueur bloqué n'a pas besoin d'envoyer `pass` : le serveur passe son tour seul après 2 s
(`AUTO_PASS_MS`). Le bouton « Passer » permet seulement d'aller plus vite.

Les identifiants de dominos s'écrivent `a-b` avec `a ≤ b`, de `0-0` à `6-6`.

### Présence, réactions et voix

Ces trois messages sont relayés aux autres membres de la salle sans modifier l'état de la partie.

**Pose d'avatar**, envoyée environ 15 fois par seconde :

```json
{ "t": "pose", "h": [x, y, z, qx, qy, qz, qw], "l": null, "r": null, "g": [false, false] }
```

`h` est la tête, `l` et `r` les mains gauche et droite (`null` hors VR), et `g` indique si chaque main tient un domino. Chaque pose est un tableau de 7 nombres finis (position puis quaternion), sinon le serveur la remplace par `null`.

**Réaction rapide** :

```json
{ "t": "emote", "e": 2 }
```

`e` est l'index dans la liste du client (`👍`, `😂`, `Bien joué !`, `Oups !`, `À toi !`, `Hmm…`), de 0 à 5. Une réaction moins de 0,7 s après la précédente est ignorée.

**Signalisation WebRTC** du chat vocal :

```json
{ "t": "rtc", "to": "<id du destinataire>", "data": { "type": "offer", "sdp": { } } }
```

`data.type` vaut `offer`, `answer` ou `ice` (avec `candidate`). Le serveur transmet `data` tel quel au seul destinataire. La voix elle-même circule ensuite de pair à pair, ou par le relais TURN.

## Messages du serveur vers le client

### `welcome`

```json
{ "t": "welcome", "id": "3f2c9a1e-...", "room": "KQ7P" }
```

Envoyé une fois après `join`. `id` est l'identifiant du membre dans la salle.

### `state`

Envoyé à chaque changement, différent pour chaque membre :

```json
{
  "t": "state",
  "room": "KQ7P",
  "you": "3f2c9a1e-...",
  "hostId": "3f2c9a1e-...",
  "phase": "playing",
  "settings": { "mode": "draw", "format": "points", "targetScore": 100 },
  "mySeat": 0,
  "members": [
    { "id": "3f2c9a1e-...", "name": "Camille", "isBot": false, "connected": true, "seat": 0, "tablePos": 0 }
  ],
  "game": { }
}
```

- `phase` : `lobby`, `playing`, `roundOver` ou `gameOver`.
- `seat` : place à la table, `-1` pour un spectateur.
- `tablePos` : côté de la table (0 sud, 1 est, 2 nord, 3 ouest), `null` si pas assis.
- `game` : `null` en salle d'attente, sinon la vue de la partie décrite ci-dessous.

**Vue de la partie (`game`)**. Les champs `hand`, `legal`, `canDraw` et `canPass` ne concernent que le destinataire. Ils sont vides pour les spectateurs, et la main des autres n'est jamais envoyée avant la fin de la manche.

| Champ | Contenu |
|---|---|
| `phase`, `mode`, `format`, `round`, `totalRounds`, `targetScore` | Déroulement de la partie. |
| `turn` | Siège dont c'est le tour. |
| `chain` | Dominos posés, de gauche à droite : `{ id, a, b, seat }`, orientés pour que les valeurs se touchent. |
| `ends` | Bouts libres `{ left, right }`, `null` si la chaîne est vide. |
| `center` | Index du premier domino posé dans `chain`, qui sert à la disposition. |
| `boneyardCount` | Dominos restant dans la pioche. |
| `openingTile` | Domino imposé pour ouvrir (le plus gros double), sinon `null`. |
| `seats` | Pour chaque siège : `{ name, score, handCount }`. |
| `hand` | Identifiants des dominos du destinataire. |
| `legal` | Coups possibles : `[{ tileId, side }]`. |
| `canDraw`, `canPass` | Si le destinataire peut piocher ou passer. |
| `lastEvent` | Dernier événement : `round`, `play`, `draw`, `pass` ou `roundEnd`, avec `seat`, `tileId` et `side` selon le cas. Le client s'en sert pour les sons, les animations et les annonces. |
| `roundResult` | En fin de manche : `{ reason, winner, points, totals, hands }`. `reason` vaut `domino` ou `blocked`, `winner` vaut `null` en cas d'égalité, et `hands` révèle toutes les mains. |
| `winner`, `winners` | En fin de partie : vainqueur, et tous les ex aequo. |

### `pose` et `emote`

Les messages des autres membres, relayés avec leur identifiant :

```json
{ "t": "pose", "id": "<membre>", "h": [...], "l": null, "r": null, "g": [false, false] }
{ "t": "emote", "id": "<membre>", "e": 2 }
```

Une réaction est aussi renvoyée à son auteur. Une pose ne l'est pas.

### `rtc`

```json
{ "t": "rtc", "from": "<membre>", "data": { } }
```

### `error`

```json
{ "t": "error", "message": "réservé à l'hôte" }
```

Le serveur l'envoie quand une action est refusée : coup illégal, action réservée à l'hôte,
partie déjà commencée, code de salle invalide. L'état n'est alors pas modifié. Le client
affiche le message en notification.

## Ajouter un message

1. Traiter le nouveau type dans `Room.handle` (`server/room.js`). Valider chaque champ reçu : le client n'est pas digne de confiance.
2. Pour une action de jeu, mettre la règle dans `server/game.js`, sans dépendance au réseau, et la couvrir dans `test/game.test.js`.
3. Envoyer le message depuis `public/js/game.js` (`onButton` ou une méthode dédiée).
4. Ajouter un test de bout en bout dans `test/server.test.js`, puis mettre ce document à jour.
