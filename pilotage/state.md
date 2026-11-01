# État - Dominos VR (aframe-dominoes)

> Rôle : photo courte de l'état du projet. Constat du 2026-11-01. Détail : roadmap.md, todo.md, work-log.md.

- **Version et tag** : 1.3.0, tag `v1.3.0` présent sur le dépôt distant (`git ls-remote`).
- **Branche** : `master`. Dépôt public, licence MIT.
- **Non poussé** : le commit de pilotage du 2026-11-01. `master` distant (`3abba93`) a un commit de plus que le local (`5686a81`), #29, `ws` 8.22.1 : `git status` ne le montre pas, aucun `git fetch` lancé. Fusion nécessaire avant push.
- **En ligne** : `https://dominos.tafrap.fr` 200 (`curl`, 2026-11-01). `config.json` sans entrée `turn:` : pas de relais, voix non garantie hors Wi-Fi (TASK-001).
- **CI** : `master` verte sur `3abba93` (2026-10-31).
- **PR ouvertes** : 7 PR Renovate, #11, #12, #13, #17, #21, #23, #28, toutes vertes, la plus ancienne (#11) depuis le 2026-05-22 (TASK-003).
- **En attente de Dimitri** : push ; sort des PR Renovate ; retours téléphone, casque et lecteur d'écran (TASK-005 à TASK-007) ; DEC-002. DEC-001 revient au président de GIGA Games.

## Prochaine étape
Sur validation :
```bash
git pull --no-rebase origin master && git push origin master
```
Puis déployer coturn et vérifier la voix en 4G (TASK-001).

Version au 2026-11-01 : `v1.3.1`, tag local non poussé. Toute mention antérieure de version dans ce fichier est dépassée.
