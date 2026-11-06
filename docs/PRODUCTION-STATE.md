# État d’hébergement — 6 novembre 2026

## Installation effectuée

- Dépôt distant configuré : `https://github.com/bmlaghui/thechoice.git` ; branche locale `main`. Le push sera effectué par l’utilisateur depuis son terminal authentifié.
- VPS IONOS : `217.154.15.174`.
- Racine dédiée : `/opt/thechoice`.
- Première release activée : `2ee2ed3585d44a920b32b19daec940fb0477dfb5`, via `/opt/thechoice/current`.
- Images API et web construites et testées localement puis transférées par SSH ; aucune compilation lourde sur le VPS.
- Passerelle dédiée : `127.0.0.1:8084`. Base, API et SSR restent sur le réseau privé Docker.
- Secrets générés sur le VPS dans `/opt/thechoice/shared/.env.prod`, mode `0600`.
- Premier administrateur créé avec un mot de passe aléatoire propre à la production. Aucun compte de développement n’a été importé.
- 10 pages CMS, 9 plats, contenus éditoriaux et six médias locaux repris. Aucune réservation, aucun message ni aucune session locale importés.
- Caddy existant complété avec le seul bloc The Choice ; sauvegarde préalable dans `/opt/thechoice/backups/`.
- Portfolio, Tijarati, Passeport Civique et Ibtissem répondent toujours normalement.

## Vérifications effectuées

- TypeScript API, huit tests API et deux tests web réussis.
- Builds de production API et Angular SSR réussis.
- Configuration Compose stricte, migrations sur base vide, bootstrap administrateur et health checks validés avec les vraies images Docker.
- Les quatre services de production du VPS sont sains ; migration terminée avec succès.
- Vérification Chrome du vrai site via un tunnel SSH temporaire : huit pages en 1440 et 390 pixels, HTTP 200, aucune image HTML cassée, aucun débordement horizontal ni exception JavaScript.
- Redéploiement du même commit validé : sauvegarde PostgreSQL créée avant migration, administrateur existant préservé, services sains.
- Certificat Let’s Encrypt valide pour `thechoice.mlaghuibrahim.fr`, accueil HTTP 200 en HTTPS vérifié depuis l’extérieur en résolvant directement vers le VPS.
- Stack de test locale arrêtée après validation ; services de développement conservés.

## CI/CD

Le workflow `.github/workflows/ci.yml` est prêt : tests, builds, smoke test Docker, transfert des images testées, sauvegarde de la base et activation d’une release au push sur `main`. Aucun seed automatique en production.

L’utilisateur a confirmé avoir configuré les quatre secrets Actions : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_THECHOICE_APP_DIR`. Leur utilisation effective doit encore être validée par le premier run GitHub après le push. Aucune nouvelle clé root n’a été autorisée sur le VPS.

## Points en attente

- L’entrée DNS A `thechoice → 217.154.15.174` est confirmée directement auprès des serveurs IONOS faisant autorité. Le certificat HTTPS est délivré. Certains résolveurs conservent encore la réponse négative antérieure ; leur cache doit expirer pour un accès normal depuis tous les réseaux.
- SMTP non fourni : aucune réutilisation des identifiants des autres projets. Les e-mails ne sont pas opérationnels ; configurer le vrai serveur SMTP dans le fichier privé du VPS et recréer l’API. Les rappels sont désactivés en attendant.
- Turnstile non configuré : clés vides, widget désactivé. Ajouter les vraies clés si souhaité.
- Compléter les informations légales et valider les contenus avant présentation publique définitive.
