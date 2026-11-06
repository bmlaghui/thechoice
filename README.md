# The Choice Restaurant

Monorepo de la V0 du site premium The Choice : Angular 22 SSR, NestJS 11, Prisma 7, PostgreSQL 18 et Mailpit.

## Démarrage rapide

Prérequis : Node 24, pnpm 10+ et Docker.

```bash
pnpm install
cp .env.example .env.development
make dev
```

`make dev` ne construit aucune image applicative : PostgreSQL et Mailpit tournent
dans Docker, tandis qu’Angular et NestJS utilisent le hot reload local. Le premier
lancement initialise automatiquement Prisma et les données de démonstration.

- Copier `.env.example` vers `.env.development` pour la configuration locale (fichier ignoré par Git).
- `.env.prod.example` est le modèle de production : le copier vers `.env.prod`
  puis remplacer impérativement toutes les valeurs `change_me`.

Pour tester les images de production, utiliser séparément `make prod`.

### Développement entièrement dans Docker

```bash
make dev-docker
```

Le code source est monté dans les conteneurs. Angular et NestJS fonctionnent en
mode watch : les changements HTML, SCSS et TypeScript apparaissent immédiatement,
sans reconstruire les images. Utiliser `docker compose build` uniquement après
une modification des dépendances ou du `Dockerfile.dev`.

- Site : http://localhost:4201
- CMS : http://localhost:4201/admin
- API : http://localhost:3000/api/v1
- Swagger : http://localhost:3000/api/docs
- Mailpit : http://localhost:18025 (SMTP local : `11025`). Les ports peuvent être modifiés via `MAILPIT_UI_PORT` et `SMTP_PORT` dans `.env.development`.

Compte de démonstration : `admin@thechoice.local` / `ChoiceDev2026!` (développement uniquement).

Routes publiques : `/`, `/restaurant`, `/menu`, `/reservation`, `/events`, `/contact`. Le back-office se trouve sous `/admin`.

## Production

La stack de production comprend PostgreSQL, les migrations Prisma, l'API Nest,
Angular SSR et un gateway Nginx. Elle est isolée du développement et prévue pour
être publiée sur `thechoice.mlaghuibrahim.fr` via le reverse proxy du VPS.

```bash
cp .env.prod.example .env.prod
make prod-check
make prod
```

Consulter [le guide de déploiement](docs/deployment.md) pour les secrets GitHub,
le SMTP, le TLS, les sauvegardes et la procédure IONOS.

## Commandes

`make dev`, `make build`, `make test`, `make lint`, `make db-migrate`, `make db-seed`, `make prod`.

## Architecture

- `apps/web` : Angular SSR, pages publiques et CMS paresseux.
- `apps/api` : API REST versionnée, validation, Prisma et Swagger.
- `packages/shared-types` : contrats TypeScript partagés.
- `docker` : reverse proxy et configuration de déploiement.

La V0 enregistre des demandes de réservation ; elle ne gère volontairement ni plan de salle ni commande en ligne.
