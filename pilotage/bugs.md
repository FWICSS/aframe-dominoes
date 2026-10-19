# Bugs - Dominos VR (aframe-dominoes)

> Rôle : anomalies et leur cycle de vie. Mis à jour : 2026-10-18. Prochain identifiant libre : BUG-002.
> Voir aussi : roadmap.md · todo.md · done.md · work-log.md · pending-decision.md · decisions.md · bugs.md · quality-checklist.md

Légende : `[vérifié]` constaté dans le code, git ou une sortie de commande ; `[à confirmer]` repris d'un document sans preuve ; `[hypothèse]` déduction de l'agent ; `[reco]` recommandation de l'agent.
Statuts : `À analyser`, `À corriger`, `En cours`, `Corrigé` (commit exigé), `À vérifier`, `Fermé` (non-régression passée exigée).

## BUG-001 · Avatars des voisins qui débordent en vue ordinateur · Statut : `À analyser`
- Gravité : mineure · Priorité : P2
- Environnement : navigateur d'ordinateur, hors VR
- Reproduction : 1. ouvrir une partie à 3 ou 4 joueurs sur ordinateur 2. regarder les places de gauche et de droite
- Attendu : avatars dans le cadre, décor visible · Observé : les avatars des voisins de gauche et de droite débordent dans le cadre et masquent le décor, gênant aussi pour la vidéo [à confirmer]
- Cause : [hypothèse] champ de vision ou position de caméra de la vue ordinateur, à vérifier dans `Avatar()` (`public/js/avatars.js`) et le rendu de `public/js/game.js`
- Correction : TASK-008 · Non-régression : -
- Historique : 2026-10-18 ouvert (origine : todo.md ligne 22)
