# Done - Dominos VR (aframe-dominoes)

> Rôle : réalisations vérifiées, chacune avec sa preuve. Mis à jour : 2026-10-18. Prochain identifiant libre : TASK-013 (numérotation commune avec todo.md).
> Voir aussi : roadmap.md · todo.md · done.md · work-log.md · pending-decision.md · decisions.md · bugs.md · quality-checklist.md

Légende : `[vérifié]` constaté dans le code, git ou une sortie de commande ; `[à confirmer]` repris d'un document sans preuve ; `[hypothèse]` déduction de l'agent ; `[reco]` recommandation de l'agent.

Entrées reconstituées depuis l'historique git le 2026-10-18. Détail public : `CHANGELOG.md`.

## 2026-10

### Protocole WebSocket documenté · 2026-10-18
- Réalisé : `docs/PROTOCOLE.md` décrit les messages entre client et serveur.
- Preuve : commit `708199e`, PR #27 (`944acce`) [vérifié] · Validation : relecture non retrouvée

### Main construite sans `innerHTML` · 2026-10-17
- Composants : `public/js/game.js`
- Validation : `npm test` 25/25 le 2026-10-18 au commit `dbcca15`
- Preuve : commit `6511ee3` [vérifié]

### v1.3.0 · Jouable au clavier et au lecteur d'écran · 2026-10-17
- Réalisé : main en boutons, annonces des coups, du tour et du blocage, zoom autorisé sur mobile, dominos jouables repérés par leur position.
- Validation : `npm test` 25/25 le 2026-10-18 ; test au lecteur d'écran non fait (TASK-007)
- Preuve : commit `a34dde4`, tag `v1.3.0` (`b3b00cf`) [vérifié]

### v1.2.0 · Passage automatique d'un joueur bloqué, interface réorganisée · 2026-10-17
- Composants : `Room` (`server/room.js`)
- Validation : test « un joueur bloqué passe automatiquement après le délai » vert le 2026-10-18
- Preuve : commit `17a8b88`, tag `v1.2.0` (`38851f6`) [vérifié]

### v1.1.0 · Identifiants TURN temporaires et image Docker durcie · 2026-10-17
- Composants : `server/index.js`, `Dockerfile`, `DEPLOY.md`, `deploy/coturn/`
- Validation : test « identifiants TURN temporaires signés avec TURN_SECRET » vert le 2026-10-18 ; coturn non déployé (TASK-001)
- Preuve : commits `5165554`, `4dcfed7`, tag `v1.1.0` (`7e30581`) [vérifié]

### v1.0.1 · A-Frame 1.8.0 · 2026-10-17
- Preuve : commit `3c2774a`, tag `v1.0.1` (`873874b`) [vérifié] · Validation : non retrouvée

### v1.0.0 · Première version publiée · 2026-10-12
- Réalisé : partie complète de 2 à 4 joueurs, VR, ordinateur et mobile, bots, chat vocal, réactions, modes points et compétition.
- Composants : `DominoGame` (`server/game.js`), `Room`, `chooseAction()` (`server/bot.js`), `VoiceChat()`, `Avatar()`
- Preuve : tag `v1.0.0` (`998a1ce`) [vérifié] · Validation : non retrouvée

### Site en ligne · constat du 2026-10-18
- Validation : `curl -sI https://dominos.tafrap.fr` renvoie `HTTP/2 200` le 2026-10-18
- Preuve : URL vérifiée ; version servie non déterminée
