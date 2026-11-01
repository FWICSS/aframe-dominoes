# Checklist qualité - Dominos VR (aframe-dominoes)

> Rôle : contrôles adaptés à la stack (Node.js sans build, `ws`, A-Frame 1.8, WebRTC, Docker, Coolify). Mis à jour : 2026-10-18. Prochain identifiant libre : QC-016.
> Voir aussi : roadmap.md · todo.md · done.md · work-log.md · pending-decision.md · decisions.md · bugs.md · quality-checklist.md

Légende : `[vérifié]` constaté dans le code, git ou une sortie de commande ; `[à confirmer]` repris d'un document sans preuve ; `[hypothèse]` déduction de l'agent ; `[reco]` recommandation de l'agent.
Statuts : `À faire`, `Réussi`, `Échec`, `Non applicable`, `Non vérifié`. `Réussi` exige une commande et son résultat daté.

## Contrôles permanents
| ID | Contrôle | Commande ou méthode | Statut | Dernier résultat |
|---|---|---|---|---|
| QC-001 | Tests (règles, disposition de la chaîne, serveur multijoueur) | `npm test` | Réussi | 2026-10-18, 25/25, commit `dbcca15` |
| QC-002 | Syntaxe des scripts | `for f in server/*.js public/js/*.js; do node --check "$f"; done` | Réussi | 2026-10-18, aucune erreur, commit `dbcca15` |
| QC-003 | Lint et format | - | Non applicable | aucun outil de lint configuré dans le dépôt |
| QC-004 | Types | - | Non applicable | JavaScript sans TypeScript ni JSDoc vérifié |
| QC-005 | Dépendances et vulnérabilités | `npm audit` | Non vérifié | Renovate actif, PR ouvertes (TASK-003) |
| QC-006 | Secrets hors git | `.env` et `*.pem` ignorés [vérifié dans `.gitignore`] ; scan skill `security-audit` | Non vérifié | - |
| QC-007 | Accessibilité au lecteur d'écran et au clavier | VoiceOver ou NVDA, une manche au clavier | À faire | TASK-007 |
| QC-008 | Rendu et interactions en VR | casque Quest, manettes puis mains | À faire | TASK-006 |
| QC-009 | Mobile | téléphone réel, Wi-Fi et 4G | À faire | TASK-005 |
| QC-010 | Migrations de données | - | Non applicable | aucune base, état des salles en mémoire |
| QC-011 | CI | `.github/workflows/ci.yml` (`npm ci`, `node --check`, `npm test`) | Réussi | 2026-10-31, `master` verte sur `3abba93` (`gh run list`) |
| QC-012 | Cohérence de version | `package.json`, tête de `CHANGELOG.md`, `git tag` | Réussi | 2026-10-18, `1.3.0` partout, tag `v1.3.0` sur `b3b00cf` |

## Avant livraison
| ID | Contrôle | Commande ou méthode | Statut | Dernier résultat |
|---|---|---|---|---|
| QC-013 | Disponibilité du site | `curl -sI https://dominos.tafrap.fr` | Réussi | 2026-11-01, 200 |
| QC-014 | Relais TURN publié | `curl -s https://dominos.tafrap.fr/config.json` contient `turn:` avec `username` | Échec | 2026-11-01, aucune entrée `turn:` (TASK-001) |
| QC-015 | Build, déploiement et retour arrière | image `Dockerfile` en build pack Dockerfile, conteneur « healthy », section « Revenir en arrière » de `DEPLOY.md` | Non vérifié | TASK-002 |

Aucun déploiement en production n'a été lancé pour cocher une case.
