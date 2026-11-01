# Journal des modifications

## 1.3.1 (2026-11-01)

- Construire les dominos de la main sans `innerHTML`, sans changement visible.

## 1.3.0 (2026-10-17)

- Jouer sans souris : la main s'affiche en boutons, utilisables au clavier, au lecteur d'écran et au doigt.
- Entendre la partie avec un lecteur d'écran : coups des autres joueurs, bouts de la chaîne, début de tour et blocage sont annoncés.
- Pouvoir zoomer la page sur mobile.
- Repérer les dominos jouables à leur position relevée, et plus seulement à leur couleur.
- Sur mobile, regrouper actions, bandeau et main en bas de l'écran pour dégager la table ; agrandir les petits textes.

## 1.2.0 (2026-10-17)

- Passer automatiquement le tour d'un joueur bloqué après 2 secondes, en le prévenant par un son et un bandeau orange.
- Réorganiser l'écran hors VR : classement trié en haut à gauche, salle et micro en haut à droite, bandeau de tour en bas au centre, réactions en bas à gauche.
- Agrandir les boutons (44 px minimum) et rendre l'interface lisible au clavier et par les lecteurs d'écran.

## 1.1.0 (2026-10-17)

- Fournir un relais TURN au chat vocal avec des identifiants temporaires, pour que la voix passe aussi en 4G et sur les réseaux d'entreprise.
- Durcir l'image Docker (utilisateur non privilégié, contrôle de santé) et documenter la mise en ligne sur Coolify dans DEPLOY.md.

## 1.0.1 (2026-10-17)

- Passer à A-Frame 1.8.0, qui retire une dépendance vulnérable (alerte de sécurité modérée).
- Corriger le service du moteur 3D, qui aurait cessé de se charger à la prochaine montée de version d'A-Frame.

## 1.0.0 (2026-10-12)

Première version publiée : une partie de dominos complète, jouable à plusieurs en réalité virtuelle dans le navigateur.

- Jouer à 2, 3 ou 4 autour d'une même table, avec un casque VR, un ordinateur ou un mobile, en rejoignant une salle par lien d'invitation.
- Prendre et poser les dominos à la manette, à la main (pincement) ou à la souris ; réorganiser sa main sur le chevalet.
- Choisir la variante (avec pioche ou bloqué) et le format : course aux points (50 à 200) ou compétition en 12 manches où la pose tourne.
- Voir le détail du calcul des points à la fin de chaque manche.
- Parler avec les autres joueurs en chat vocal spatialisé, avec relais TURN configurable pour les réseaux restrictifs.
- Compléter la table avec des bots ; un bot remplace un joueur déconnecté, qui retrouve sa place à son retour.
- Envoyer des réactions rapides visibles au-dessus de son avatar.
- Règles arbitrées par le serveur : chaque joueur ne reçoit que sa propre main.
