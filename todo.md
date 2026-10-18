# À faire

État au 18 octobre 2026 : v1.3.0 en ligne sur https://dominos.tafrap.fr.

## Mise en production

- [ ] **Déployer coturn** pour que le chat vocal passe en 4G et sur les réseaux d'entreprise (procédure complète dans `DEPLOY.md`).
  - Ouvrir le pare-feu du VPS et celui du panneau Hostinger : `3478/udp`, `3478/tcp`, `49160:49200/udp`.
  - Coolify, ressource Docker Compose `deploy/coturn/docker-compose.yml` avec `TURN_SECRET`, `EXTERNAL_IP=82.25.92.161`, `TURN_REALM=turn.tafrap.fr`.
  - Sur l'application du jeu : `TURN_URLS=turn:turn.tafrap.fr:3478,turn:turn.tafrap.fr:3478?transport=tcp` et le même `TURN_SECRET`.
  - Vérifier : `curl -s https://dominos.tafrap.fr/config.json` contient une entrée `turn:` avec `username`, puis une partie à deux dont un joueur en 4G.
- [ ] **Confirmer le build pack Dockerfile dans Coolify** : le log de déploiement ne doit plus contenir « Railpack », et le conteneur doit être « healthy ».

## Tests à faire à la main

- [ ] **Téléphone** : premier essai fait le 18 octobre, retour à noter (modèle, navigateur, ce qui gêne) : barre « Ma main », disposition, regard au glisser, passage automatique, voix en Wi-Fi et en 4G.
- [ ] **Casque VR (Quest)** : ouvrir https://dominos.tafrap.fr dans le navigateur du casque, entrer en VR, jouer aux manettes puis aux mains. Premier essai d'A-Frame 1.8 en VR.
- [ ] **Lecteur d'écran** : VoiceOver (Cmd + F5 sur Mac) ou NVDA. Vérifier les annonces des coups, du tour et du blocage, et jouer une manche au clavier avec la barre « Ma main ».

## Interface

- [ ] En vue ordinateur, les avatars des voisins de gauche et de droite débordent dans le cadre et masquent le décor (gênant aussi pour la vidéo).
- [ ] Image de partage (`og:image`) et favicon : absentes, l'aperçu d'un lien partagé sur LinkedIn ou WhatsApp est vide.

## Organisation

- [ ] **Passer le projet chez GIGA Games**, si le président l'autorise (plan à valider avant tout déplacement) :
  - renommer le dépôt GitHub en `giga-dominos-vr` ;
  - déplacer le dossier de `~/Desktop/Dev/SAS/` vers `~/Desktop/Dev/Giga/` ;
  - vérifier que Coolify suit le renommage du dépôt.
- [ ] Ranger les captures de `~/Desktop/_sas/aframe-dominoes-captures/` sur OneDrive.
- [ ] Supprimer les branches locales déjà fusionnées (`git branch --merged master`).
- [ ] Traiter les PR Renovate encore ouvertes (Node 24, `actions/checkout` et `actions/setup-node` en v7).

## Promotion

- [ ] **En attente** : décision du président sur la reprise du jeu par GIGA Games. Elle conditionne la marque, le nom du dépôt et l'URL à mettre dans la vidéo.
- [ ] **Vidéo en motion design** (Remotion), 30 à 40 s, en 16:9 et 9:16 : accroche, salon VR, prise en main, multijoueur, appel à l'action vers le site.
