# Décisions en attente - Dominos VR (aframe-dominoes)

> Rôle : arbitrages ouverts, l'agent recommande, il ne tranche pas. Mis à jour : 2026-10-18. Prochain identifiant libre : DEC-005 (numérotation commune avec decisions.md).
> Voir aussi : roadmap.md · todo.md · done.md · work-log.md · pending-decision.md · decisions.md · bugs.md · quality-checklist.md

Légende : `[vérifié]` constaté dans le code, git ou une sortie de commande ; `[à confirmer]` repris d'un document sans preuve ; `[hypothèse]` déduction de l'agent ; `[reco]` recommandation de l'agent.

## DEC-001 · Reprise du jeu par GIGA Games · Statut : `À arbitrer`
- Contexte : le jeu vit dans `~/Desktop/Dev/SAS/` sous le nom `aframe-dominoes`, servi sur un sous-domaine `tafrap.fr`.
- Pourquoi décider : la décision conditionne la marque, le nom du dépôt (`giga-dominos-vr`), l'emplacement (`Dev/Giga/`) et l'URL à mettre dans la vidéo.
- Options :
  - A. Reprise par GIGA Games : + cohérent avec la segmentation `Giga/` et le préfixe `giga-` / - renommage du dépôt, déplacement du dossier, suivi Coolify à vérifier
  - B. Le projet reste hors GIGA Games : + rien à déplacer / - le jeu reste rangé sous `SAS/` sans marque de jeu
- [reco] pas de recommandation : décision d'entreprise qui revient au président de GIGA Games.
- Impacts : marque, opérationnel (dépôt, chemin, déploiement)
- Sans décision : TASK-010 et TASK-012 bloquées, aucune promotion durable possible.
- Arbitre : président de GIGA Games
- Liens : TASK-010, TASK-012, JAL-003 · Origine : todo.md ligne 37

## DEC-002 · Cible de déploiement de référence : Coolify ou Render · Statut : `À arbitrer`
- Contexte : `render.yaml` et le README proposent Render en un clic, `DEPLOY.md` décrit Coolify (jeu et coturn), et l'ancien todo traite Coolify comme la production.
- Pourquoi décider : un contributeur ne sait pas quelle cible fait foi.
- Options :
  - A. Coolify fait foi, Render reste une option pour un fork, écrit comme tel dans le README
  - B. Retirer `render.yaml`
- [reco] A : le dépôt est public sous MIT, Render en un clic sert ceux qui le reprennent, la production reste sur Coolify.
- Impacts : documentation
- Sans décision : ambiguïté documentaire, sans effet sur la production.
- Arbitre : Dimitri Aigle

## Décisions closes
- DEC-003, DEC-004 · reprises le 2026-10-18 · voir decisions.md
