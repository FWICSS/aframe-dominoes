# Todo - Dominos VR (aframe-dominoes)

> Rôle : travail restant, une tâche par identifiant. Mis à jour : 2026-11-01. Prochain identifiant libre : TASK-013.
> Voir aussi : roadmap.md · todo.md · done.md · work-log.md · pending-decision.md · decisions.md · bugs.md · quality-checklist.md

Légende : `[vérifié]` constaté dans le code, git ou une sortie de commande ; `[à confirmer]` repris d'un document sans preuve ; `[hypothèse]` déduction de l'agent ; `[reco]` recommandation de l'agent.
Priorités : `P0` bloquant, `P1` nécessaire au prochain jalon, `P2` utile, `P3` un jour. Statuts : `À faire`, `En cours`, `Bloquée`, `À vérifier`.
Les numéros de ligne d'origine renvoient à `todo.md` racine au commit `dbcca15`.

## Fonctionnalités

### TASK-009 · Ajouter une image de partage et un favicon
- Priorité : P2 · Statut : `À faire` · Jalon : JAL-002
- Description : l'aperçu d'un lien partagé sur LinkedIn ou WhatsApp est vide. `public/index.html` ne contient ni `og:image` ni icône [vérifié le 2026-10-18].
- Critères d'acceptation :
  - [ ] `og:image` et favicon présents dans le HTML servi
  - [ ] Aperçu non vide dans un partage WhatsApp ou LinkedIn
- Origine : todo.md ligne 23

### TASK-012 · Réaliser la vidéo en motion design
- Priorité : P2 · Statut : `Bloquée` (DEC-001) · Jalon : JAL-003
- Description : Remotion, 30 à 40 s, en 16:9 et 9:16 : accroche, salon VR, prise en main, multijoueur, appel à l'action vers le site.
- Origine : todo.md ligne 38

## Bugs
- TASK-008 · Corriger BUG-001 (avatars des voisins qui débordent en vue ordinateur) · P2 · `À faire` · Origine : todo.md ligne 22

## Sécurité
Rien d'identifié au 2026-10-18.

## Dette technique
Rien d'identifié au 2026-10-18.

## Tests

### TASK-005 · Consigner le retour du test sur téléphone
- Priorité : P1 · Statut : `En cours` · Jalon : JAL-002
- Description : premier essai fait le 2026-10-18 [à confirmer], retour à noter : modèle, navigateur, ce qui gêne ; barre « Ma main », disposition, regard au glisser, passage automatique, voix en Wi-Fi et en 4G.
- Critères d'acceptation : [ ] retour consigné dans `work-log.md`, anomalies ouvertes dans `bugs.md`
- Origine : todo.md ligne 16

### TASK-006 · Tester sur casque VR (Quest)
- Priorité : P1 · Statut : `À faire` · Jalon : JAL-002
- Description : ouvrir le site dans le navigateur du casque, entrer en VR, jouer aux manettes puis aux mains. Premier essai d'A-Frame 1.8 en VR.
- Origine : todo.md ligne 17

### TASK-007 · Tester au lecteur d'écran
- Priorité : P2 · Statut : `À faire` · Jalon : JAL-002
- Description : VoiceOver ou NVDA ; annonces des coups, du tour et du blocage ; une manche au clavier avec la barre « Ma main ».
- Origine : todo.md ligne 18

## Documentation
Rien d'identifié au 2026-10-18.

## Accessibilité
Couverte par TASK-007.

## Infrastructure et déploiement

### TASK-001 · Déployer coturn
- Priorité : P1 · Statut : `À faire` · Jalon : JAL-001
- Description : procédure complète dans `DEPLOY.md` (pare-feu du VPS et du panneau Hostinger, ressource Docker Compose `deploy/coturn/docker-compose.yml`, variables `TURN_SECRET`, `EXTERNAL_IP`, `TURN_REALM` ; côté jeu `TURN_URLS` et le même `TURN_SECRET`). Au 2026-10-18, `config.json` servi ne contient aucune entrée `turn:` [vérifié].
- Critères d'acceptation :
  - [ ] `curl -s https://dominos.tafrap.fr/config.json` contient une entrée `turn:` avec `username`
  - [ ] Partie à deux dont un joueur en 4G, voix entendue des deux côtés
- Origine : todo.md lignes 7 à 11

### TASK-002 · Confirmer le build pack Dockerfile dans Coolify
- Priorité : P2 · Statut : `À vérifier` · Jalon : JAL-001
- Critères d'acceptation : [ ] log de déploiement sans « Railpack », conteneur « healthy »
- Origine : todo.md ligne 12

### TASK-003 · Traiter les PR Renovate ouvertes
- Priorité : P2 · Statut : `À faire`
- Description : 7 PR ouvertes le 2026-11-01, toutes vertes [vérifié par `gh pr list`] : #11 Node 24.22.0 (2026-05-22), #12 `actions/checkout` v7 (2026-06-18), #13 `actions/setup-node` v7 (2026-07-14), #17 Node 24 (2026-10-12), #21 Node `>=20.20.2` (2026-10-17), #23 coturn 4.18.0 (2026-10-17), #28 Node 26 (2026-10-28). #29 (`ws`) est déjà fusionnée. [reco] #11, #17, #21 et #28 portent toutes sur Node : choisir la cible avant de fusionner.
- Origine : todo.md ligne 33

### TASK-004 · Nettoyer les branches locales déjà fusionnées
- Priorité : P3 · Statut : `À faire`
- Description : huit branches locales fusionnées dans `master` [vérifié par `git branch --merged master`]. Suppression à faire par Dimitri, l'agent ne supprime pas. Les branches distantes `test-jeu` et `claude/friendly-curie-xu6s09` sont à examiner aussi [hypothèse : obsolètes].
- Origine : todo.md ligne 32

### TASK-010 · Passer le projet chez GIGA Games
- Priorité : P2 · Statut : `Bloquée` (DEC-001)
- Description : plan à valider avant tout déplacement : renommer le dépôt en `giga-dominos-vr`, déplacer le dossier de `~/Desktop/Dev/SAS/` vers `~/Desktop/Dev/Giga/`, vérifier que Coolify suit le renommage.
- Origine : todo.md lignes 27 à 30

### TASK-011 · Ranger les captures du sas sur OneDrive
- Priorité : P3 · Statut : `À faire`
- Description : `~/Desktop/_sas/aframe-dominoes-captures/` vers OneDrive, après vérification d'existence côté OneDrive (doublons possibles).
- Origine : todo.md ligne 31
