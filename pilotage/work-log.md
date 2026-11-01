# Work-log - Dominos VR (aframe-dominoes)

> Rôle : chronologie des interventions, la plus récente en tête. Mis à jour : 2026-11-01. Prochain identifiant libre : sans objet (entrées datées).
> Voir aussi : roadmap.md · todo.md · done.md · work-log.md · pending-decision.md · decisions.md · bugs.md · quality-checklist.md

Légende : `[vérifié]` constaté dans le code, git ou une sortie de commande ; `[à confirmer]` repris d'un document sans preuve ; `[hypothèse]` déduction de l'agent ; `[reco]` recommandation de l'agent.

## 2026-11-01 · État au 2026-11-01
- Agent : assistant de pilotage · Branche : `master` · Commits : `docs(pilotage): etat au 2026-11-01`
- Travaux : `pilotage/state.md` et `docs/CONTEXT.md` créés ; roadmap, TASK-003 et contrôles QC-011, QC-013, QC-014 mis à jour.
- Fichiers : `pilotage/*`, `docs/CONTEXT.md`. Aucun code applicatif.
- Composants impactés : aucun composant de code. `graphify update .` lancé.
- Décisions : aucune
- Tests : `curl` et `gh` du 2026-11-01 (voir `state.md`) ; `npm test` non relancé.
- Blocages : aucun. Le `master` local est derrière le distant d'un commit, aucun `git fetch` lancé sur ce dépôt.
- Reprise : fusion et push sur validation, TASK-003, puis TASK-001.

## 2026-10-18 · Retrait des renvois de suivi en doublon
- Agent : Claude Code · Décision de Dimitri Aigle du 2026-10-18 : `pilotage/` fait foi, les doublons sont supprimés.
- Travaux : suppression de `todo.md` , qui ne contenaient plus qu'un renvoi vers `pilotage/` (contenu d'origine dans l'historique git).
- Fichiers : `todo.md` 
- Composants impactés : aucun (documentation)
- Décisions : aucune nouvelle
- Tests : aucun requis
- Blocages : aucun
- Reprise : inchangée, voir l'entrée précédente.

## 2026-10-18 · Mise en place du pilotage projet
- Agent : Claude Code · Branche : `master` · Commits : base `dbcca15`, puis le commit `docs(pilotage): mise en place du pilotage projet`
- Travaux : analyse du dépôt (manifeste, 30 derniers commits, tags, branches) ; graphe créé par `graphify extract . --code-only` (243 nœuds, 414 arêtes) ; hook graphify installé, attribut de fusion placé dans `.git/info/attributes` ; `graphify-out/` ajouté au `.gitignore` ; reprise intégrale de `todo.md` racine dans `pilotage/`, son corps remplacé par un renvoi d'une ligne (original dans l'historique git) ; écriture des huit fichiers.
- Fichiers : `pilotage/*.md` (8), `todo.md` (renvoi), `.gitignore` (1 ligne)
- Composants impactés : aucun composant de code. Composants nommés depuis le graphe : `Room`, `DominoGame`, `VoiceChat()`, `Avatar()`, `Connection()`, `chooseAction()`, `createServer()`.
- Décisions : aucune tranchée ; DEC-001 et DEC-002 ouvertes
- Tests : `npm test` 25/25 ; `node --check` sur `server/*.js` et `public/js/*.js` sans erreur ; `curl -sI https://dominos.tafrap.fr` 200 ; `config.json` servi sans entrée `turn:`
- Blocages : aucun
- Reprise : TASK-001 (coturn), puis TASK-005 (retour du test sur téléphone)
