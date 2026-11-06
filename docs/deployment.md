# Hébergement The Choice sur IONOS

- Dépôt : https://github.com/bmlaghui/thechoice
- Branche déployée : `main`.
- URL : https://thechoice.mlaghuibrahim.fr
- VPS : `217.154.15.174`, Caddy existant conservé.
- Racine dédiée : `/opt/thechoice`.
- Passerelle : `127.0.0.1:8084`. Les ports 8080 à 8083 appartiennent aux autres projets.
- PostgreSQL, API et SSR ne publient aucun port externe.

## Pipeline GitHub Actions

Chaque pull request et push sur `main` déclenche TypeScript, les tests API et web, les builds puis la construction des images Docker. Une base jetable vérifie les migrations, le démarrage, la création initiale de l’administrateur et les routes HTTP. Aucun seed de démonstration n’est exécuté.

Après réussite sur `main`, les images testées sont transférées par SSH puis chargées sur le VPS. Le workflow utilise `git archive` pour envoyer seulement les fichiers suivis du commit : ni fichiers `.env`, ni dépendances locales, ni sauvegardes ne sont transférés. Les images sont identifiées par le SHA Git.

Secrets à définir dans **Settings → Secrets and variables → Actions** :

| Secret | Valeur |
| --- | --- |
| `VPS_HOST` | `217.154.15.174` |
| `VPS_USER` | compte autorisé à utiliser Docker et `/opt/thechoice` |
| `VPS_SSH_KEY` | clé privée dédiée au déploiement, clé publique autorisée sur le VPS |
| `VPS_THECHOICE_APP_DIR` | `/opt/thechoice` |

La connexion SSH n’est pas un secret : utiliser une clé dédiée. Ne jamais ajouter sa clé privée au dépôt ou à une commande de log.

## Configuration du VPS

`/opt/thechoice/shared/.env.prod` contient les secrets et doit avoir le mode `0600`. Partir de `.env.prod.example`, remplacer les valeurs `change_me`, conserver `APP_PORT=8084`, `APP_BIND_HOST=127.0.0.1`, et utiliser un vrai SMTP. Les mots de passe PostgreSQL et `DATABASE_URL` doivent correspondre. Les secrets JWT doivent être distincts et aléatoires.

`ADMIN_EMAIL` et `ADMIN_PASSWORD` servent uniquement à créer le premier compte si aucun utilisateur n’existe. Le mot de passe doit avoir au moins 16 caractères. Aucun compte connu de développement n’est créé en production. Une base existante n’est pas modifiée par ce bootstrap.

Turnstile peut être configuré avec les clés d’un widget autorisant `thechoice.mlaghuibrahim.fr`. Les clés vides désactivent le widget ; ne pas utiliser des valeurs factices.

## DNS, Caddy et HTTPS

Créer une entrée DNS A `thechoice` vers `217.154.15.174`. N’ajouter une entrée AAAA que si le routage IPv6 du VPS est vérifié.

Ajouter le bloc de `docker/caddy/thechoice.caddy` au Caddyfile existant, puis valider et recharger Caddy. Conserver les autres domaines. Caddy gère automatiquement le certificat lorsque le DNS et les ports 80/443 sont accessibles. Aucun Nginx supplémentaire n’est à installer sur l’hôte.

## Releases et sauvegardes

Les sources résident dans `/opt/thechoice/releases/<sha>-<run>-<attempt>`. `scripts/deploy-release.sh` verrouille les déploiements, valide la configuration, sauvegarde une base existante, applique les migrations puis démarre les images déjà construites avec les health checks Compose. Le lien `/opt/thechoice/current` est activé après les contrôles HTTP.

Les sauvegardes sont dans `/opt/thechoice/backups`. Sauvegarder aussi le volume des uploads et exporter régulièrement les sauvegardes hors du VPS. Les volumes persistent d’une release à l’autre. Les contenus éditoriaux et comptes ne sont pas réinitialisés à chaque push.

Pour diagnostiquer :

```bash
cd /opt/thechoice/current
export PROD_ENV_FILE=/opt/thechoice/shared/.env.prod
export IMAGE_TAG=<sha-de-la-release>
docker compose --env-file "$PROD_ENV_FILE" -f docker-compose.prod.yml ps
docker compose --env-file "$PROD_ENV_FILE" -f docker-compose.prod.yml logs --tail=100
curl -fsS https://thechoice.mlaghuibrahim.fr/api/v1/health
```

Pour revenir à une version antérieure, réactiver ses images et sources après vérification de la compatibilité de son schéma. Une migration destructive nécessite une procédure de restauration de base ; changer uniquement le lien `current` ne restaure pas l’application.

## Recette finale

Vérifier HTTPS, le contenu CMS, les horaires, les images et le compte administrateur. Faire une demande de réservation, un contact et un devis réels après configuration SMTP ; vérifier les deux destinataires et SPF/DKIM/DMARC. Le déploiement technique ne prouve pas la délivrabilité des e-mails.
