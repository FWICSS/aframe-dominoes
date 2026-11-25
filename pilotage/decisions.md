# Décisions - Dominos VR (aframe-dominoes)

> Rôle : décisions prises, avec leur justification. Mis à jour : 2026-11-25. Prochain identifiant libre : DEC-006 (numérotation commune avec pending-decision.md).
> Voir aussi : roadmap.md · todo.md · done.md · work-log.md · pending-decision.md · decisions.md · bugs.md · quality-checklist.md

Légende : `[vérifié]` constaté dans le code, git ou une sortie de commande ; `[à confirmer]` repris d'un document sans preuve ; `[hypothèse]` déduction de l'agent ; `[reco]` recommandation de l'agent.

Décisions reconstituées depuis le code et la documentation, consignées le 2026-10-18.

## DEC-005 · TAFRAP Studio édite le jeu tant que DEC-001 n'est pas tranchée · 2026-11-24 · `acceptée`
- Décidé par : Dimitri Aigle, session vitrines du 2026-11-24.
- Contexte : le site demande un prénom et l'accès au micro sans mentions légales ; la reprise par GIGA Games (DEC-001) attend le président, et le post PRJ-2612-08 sort le 29/12.
- Décision : mentions légales au nom de TAFRAP Studio (éditeur et hébergeur) et URL `dominos.tafrap.fr` dans le post. Si GIGA Games reprend le jeu, éditeur et URL changent à ce moment-là.
- Conséquences : TASK-013 réalisable ; DEC-001 reste ouverte.

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
