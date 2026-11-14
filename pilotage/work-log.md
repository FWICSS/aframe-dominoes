# Work-log - Dominos VR (aframe-dominoes)

> Rôle : chronologie des interventions, la plus récente en tête. Mis à jour : 2026-11-14. Prochain identifiant libre : sans objet (entrées datées).
> Voir aussi : roadmap.md · todo.md · done.md · work-log.md · pending-decision.md · decisions.md · bugs.md · quality-checklist.md

Légende : `[vérifié]` constaté dans le code, git ou une sortie de commande ; `[à confirmer]` repris d'un document sans preuve ; `[hypothèse]` déduction de l'agent ; `[reco]` recommandation de l'agent.

## 2026-11-14 · Dépendances vulnérables (veille de sécurité)
- Agent : Claude Code · Branche : `fix/deps-securite-2026-11` (depuis `origin/master`) · Commit : `fix(deps): corrige les dépendances vulnérables (veille de sécurité)`
- Objectif : demande de Dimitri, corriger les alertes de la veille de sécurité de l'admin TAFRAP.
- Travaux : `follow-redirects` 1.16.1 → 1.16.3 (transitif d'aframe, GHSA-mrwp-f3q8-3g9p, `npm audit fix`) ; `ws` 8.22.2 → 8.23.0 ; image `node:24.15.0-alpine` → `node:24.22.3-alpine` (Dockerfile) et Node 24.22.3 en CI ; `coturn/coturn` 4.7.0 → 4.19.0.
- Tests : `npm audit` 0 vulnérabilité `[vérifié]` ; `node --check` sur `server/*.js` et `public/js/*.js` sans erreur ; `npm test` 25/25 ; `docker build` réussi, `node --version` dans l'image v24.22.3 ; options coturn présentes dans `--help` de 4.19.0. Relais TURN non redéployé.
- Reprise : push et PR sur validation de Dimitri ; vérifier le relais TURN après redéploiement Coolify.

## 2026-11-01 · Renovate économe en CI
- Objectif : consigne de Dimitri, limiter le quota GitHub Actions.
- Travaux : PR mensuelle unique pour mineures et correctifs, majeures sur validation dans le tableau de bord, 3 PR ouvertes au plus, rebase seulement en cas de conflit. Alertes de sécurité à tout moment.
- Tests : `renovate-config-validator` local. Non poussé, en attente du push unique.

## 2026-11-01 · Version v1.3.1
- Objectif : demande de Dimitri, « tag les versions ».
- Travaux : manifeste, CHANGELOG et tag annoté `v1.3.1` alignés, en local.
- Tests : aucun, lot de versionnage. Push en attente de validation.

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
