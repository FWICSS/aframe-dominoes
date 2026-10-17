# Déploiement sur Coolify

Deux ressources sur le même VPS : le jeu (application, Dockerfile) et le relais TURN
(coturn, Docker Compose). Le jeu a besoin de HTTPS, sinon le navigateur du casque refuse
la VR ; le relais TURN n'a besoin que de l'IP publique.

Dans la suite, `dominos.mondomaine.fr` et `turn.mondomaine.fr` sont à remplacer par le
sous-domaine retenu.

## Variables

Aucune variable n'est lue au build : tout se règle à l'exécution.

| Variable | Ressource | Rôle | Secret |
|---|---|---|---|
| `PORT` | jeu | Port d'écoute, 3000 par défaut | non |
| `TURN_URLS` | jeu | Adresses du relais, séparées par des virgules | non |
| `TURN_SECRET` | jeu et coturn | Secret partagé qui signe les identifiants TURN (24 h) | **oui** |
| `ICE_SERVERS` | jeu | Liste STUN/TURN complète en JSON, prioritaire sur `TURN_URLS` | selon contenu |
| `EXTERNAL_IP` | coturn | IP publique du VPS | non |
| `TURN_REALM` | coturn | Nom du relais, par exemple `turn.mondomaine.fr` | non |

Générer le secret une fois et le poser dans les deux ressources :

```bash
openssl rand -hex 32
```

## 1. DNS

Chez le registrar, deux enregistrements vers l'IP du VPS :

```
dominos    A    <IP du VPS>
turn       A    <IP du VPS>
```

`turn` est facultatif (l'IP suffit dans `TURN_URLS`), mais le changement de VPS ne
demandera alors qu'une mise à jour DNS.

## 2. Pare-feu du VPS

```bash
ufw allow 3478/udp
ufw allow 3478/tcp
ufw allow 49160:49200/udp
```

Si l'hébergeur a aussi un pare-feu dans sa console, y ouvrir les mêmes ports.

## 3. Relais TURN

Coolify, **New Resource → Docker Compose** depuis ce dépôt, fichier
`deploy/coturn/docker-compose.yml`. Variables : `TURN_SECRET`, `EXTERNAL_IP`,
`TURN_REALM`. Aucun domaine à poser : coturn est en réseau hôte et n'est pas routé par
le proxy.

Le relais refuse de relayer vers les plages privées (réseau Docker, loopback,
métadonnées) : il ne peut pas servir de porte d'entrée vers les autres services du VPS.

## 4. Le jeu

Coolify, **New Resource → Application** depuis ce dépôt, branche `master`, build pack
**Dockerfile**.

- Domaine : `https://dominos.mondomaine.fr`, port exposé `3000`.
- Variables d'exécution :
  ```
  TURN_URLS=turn:turn.mondomaine.fr:3478,turn:turn.mondomaine.fr:3478?transport=tcp
  TURN_SECRET=<le même secret que coturn>
  ```
- Le WebSocket `/ws` passe par le proxy de Coolify sans réglage.
- L'image définit un `HEALTHCHECK` sur `/config.json`.

## 5. Vérifier

```bash
curl -sI https://dominos.mondomaine.fr | head -1          # HTTP/2 200
curl -s https://dominos.mondomaine.fr/config.json          # doit contenir une entrée turn: avec username
```

Puis une partie réelle à deux, l'un des joueurs en 4G, micro activé : la voix doit
passer. Ouvrir ensuite le lien dans le navigateur d'un casque et entrer en VR.

## Revenir en arrière

Coolify garde les déploiements précédents : **Deployments → Redeploy** sur le commit
antérieur. Le jeu ne stocke rien sur disque (les salles vivent en mémoire), un retour
arrière ne perd donc que les parties en cours.
