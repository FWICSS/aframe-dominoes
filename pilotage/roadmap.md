# Roadmap - Dominos VR (aframe-dominoes)

> Rôle : direction, jalons et risques du projet. Mis à jour : 2026-11-01. Prochain identifiant libre : JAL-004.
> Voir aussi : roadmap.md · todo.md · done.md · work-log.md · pending-decision.md · decisions.md · bugs.md · quality-checklist.md

Légende : `[vérifié]` constaté dans le code, git ou une sortie de commande ; `[à confirmer]` repris d'un document sans preuve ; `[hypothèse]` déduction de l'agent ; `[reco]` recommandation de l'agent.

Sources : `README.md`, `CHANGELOG.md`, `DEPLOY.md`, `docs/PROTOCOLE.md`, ancien `todo.md` racine (repris ici le 2026-10-18).

## Vision
Une vraie partie de dominos en réalité virtuelle, à jouer entre amis dans le navigateur : casque (Quest, Pico, PC VR), ordinateur ou mobile. Multijoueur de 2 à 4, chat vocal spatialisé, bots, règles arbitrées par le serveur. Logiciel libre sous licence MIT.

## État actuel
Constat du 2026-11-01 (état court : `state.md`) :
- `https://dominos.tafrap.fr` 200 et `config.json` sans entrée `turn:` [vérifié]. TASK-001 inchangée.
- `master` distant en avance d'un commit sur le local (#29, `ws` 8.22.1) [vérifié par `gh api`]. CI verte sur ce commit, version de projet inchangée (montée de dépendance).
- Sept PR Renovate ouvertes, toutes vertes, dont une depuis le 2026-05-22 (TASK-003).
- Aucun retour de test consigné depuis le 2026-10-18. DEC-001 et DEC-002 toujours ouvertes.

Constat du 2026-10-18 :
- Version `1.3.0` concordante entre `package.json`, `CHANGELOG.md` et le tag `v1.3.0` (`b3b00cf`) [vérifié].
- https://dominos.tafrap.fr répond 200 [vérifié par `curl -sI` le 2026-10-18] ; la version servie n'est pas lisible depuis l'extérieur.
- `config.json` servi ne contient aucune entrée `turn:` [vérifié le 2026-10-18] : le relais TURN n'est pas en place, la voix ne passe pas en 4G ni sur les réseaux d'entreprise.
- `npm test` 25/25 et `node --check` sans erreur au commit `dbcca15` le 2026-10-18 [vérifié].
- Tests manuels sur téléphone, casque et lecteur d'écran non consignés.
- Rattachement à GIGA Games en attente d'une décision du président (DEC-001).

## Jalons
| ID | Jalon | Statut | Critère de validation | Dépend de | Tâches |
|---|---|---|---|---|---|
| JAL-001 | Voix fonctionnelle hors Wi-Fi | En cours | `config.json` contient une entrée `turn:` avec `username`, partie à deux dont un joueur en 4G | - | TASK-001, TASK-002 |
| JAL-002 | Jeu validé sur les trois usages réels | Planifié | Retours consignés pour téléphone, casque Quest et lecteur d'écran | - | TASK-005, TASK-006, TASK-007, TASK-008, TASK-009 |
| JAL-003 | Promotion lancée | Bloqué | Vidéo publiée sous la marque arrêtée | DEC-001 | TASK-010, TASK-012 |

Tous les jalons sont non datés.

## Fonctionnalités prévues
| Fonctionnalité | Priorité | Jalon | Statut |
|---|---|---|---|
| Relais TURN coturn en production | P1 | JAL-001 | À faire |
| Image de partage et favicon | P2 | JAL-002 | À faire |
| Vidéo de présentation en motion design | P2 | JAL-003 | Bloqué |

## Risques et blocages
- Sans TURN, une partie sur deux réseaux mobiles peut rester muette : premier frein à l'usage entre amis (TASK-001).
- Marque, nom de dépôt et URL suspendus à DEC-001 : la vidéo et tout lien public durable en dépendent.
- Deux cibles de déploiement documentées (`render.yaml` et Coolify) : celle qui fait foi n'est pas écrite (DEC-002).

## Prochaines étapes stratégiques
1. Déployer coturn et vérifier la voix en 4G (JAL-001).
2. Consigner les retours téléphone, casque et lecteur d'écran (JAL-002).
3. Obtenir la décision GIGA Games, puis la vidéo (JAL-003).
