# Décisions - Dominos VR (aframe-dominoes)

> Rôle : décisions prises, avec leur justification. Mis à jour : 2026-10-18. Prochain identifiant libre : DEC-005 (numérotation commune avec pending-decision.md).
> Voir aussi : roadmap.md · todo.md · done.md · work-log.md · pending-decision.md · decisions.md · bugs.md · quality-checklist.md

Légende : `[vérifié]` constaté dans le code, git ou une sortie de commande ; `[à confirmer]` repris d'un document sans preuve ; `[hypothèse]` déduction de l'agent ; `[reco]` recommandation de l'agent.

Décisions reconstituées depuis le code et la documentation, consignées le 2026-10-18.

## DEC-003 · Règles arbitrées par le serveur, chaque joueur ne reçoit que sa main · 2026-10-12 · `acceptée`
- Décidé par : Dimitri Aigle [à confirmer]
- Contexte : jeu multijoueur entre amis dans le navigateur
- Choix : `DominoGame` (`server/game.js`) indépendant du réseau, `Room` diffuse des états filtrés par joueur
- Justification : impossible de tricher en lisant l'état côté client
- Conséquences : + tests des règles sans réseau (`test/game.test.js`) / - toute logique de jeu passe par le serveur
- Origine : README, sections présentation et Développement

## DEC-004 · Identifiants TURN temporaires signés côté serveur · 2026-10-17 · `acceptée`
- Décidé par : Dimitri Aigle [à confirmer]
- Contexte : la voix pair-à-pair échoue derrière la 4G et les réseaux d'entreprise sans relais TURN
- Options étudiées : identifiants TURN statiques dans le client ; coturn en `use-auth-secret`
- Choix : coturn en `use-auth-secret`, le serveur signe des identifiants valables 24 h
- Justification : le secret ne quitte jamais le serveur
- Conséquences : + aucun secret dans le navigateur / - coturn à déployer et à maintenir (TASK-001)
- Origine : README, Développement ; commit `5165554`
