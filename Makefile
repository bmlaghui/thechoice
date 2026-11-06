.PHONY: help dev dev-docker build test lint db-generate db-migrate db-seed prod-check prod-build prod prod-stop prod-status prod-logs prod-migrate prod-backup

DOCKER_COMPOSE ?= docker compose
PROD_ENV ?= .env.prod
PROD = $(DOCKER_COMPOSE) --env-file $(PROD_ENV) -f docker-compose.prod.yml
DEV = $(DOCKER_COMPOSE) --env-file .env.development -f docker-compose.yml
PNPM = env -u XDG_DATA_HOME pnpm

help:
	@echo "The Choice — commandes"
	@echo "  make dev           Dépendances Docker + API/Web locaux"
	@echo "  make dev-docker    Stack de développement complète"
	@echo "  make build         Build de tous les workspaces"
	@echo "  make prod-check    Validation stricte de .env.prod et du compose"
	@echo "  make prod-build    Construction des images"
	@echo "  make prod          Migration + démarrage de la production"
	@echo "  make prod-status   État des conteneurs"
	@echo "  make prod-logs     Logs (SERVICE=api|web|gateway|postgres)"
	@echo "  make prod-backup   Sauvegarde PostgreSQL horodatée dans ./backups"

dev:
	$(DEV) up -d --wait postgres mailpit
	set -a; . ./.env.development; set +a; $(PNPM) db:generate
	set -a; . ./.env.development; set +a; $(PNPM) --filter @the-choice/api exec prisma db push
	set -a; . ./.env.development; set +a; $(PNPM) db:seed
	set -a; . ./.env.development; set +a; $(PNPM) --parallel --filter @the-choice/api --filter @the-choice/web start:dev

dev-docker:
	$(DEV) up --build
build:
	$(PNPM) build
test:
	$(PNPM) test
lint:
	$(PNPM) lint
db-generate:
	$(PNPM) db:generate
db-migrate:
	$(PNPM) --filter @the-choice/api prisma:migrate
db-seed:
	$(PNPM) db:seed

prod-check:
	@test -f $(PROD_ENV) || (echo "Fichier $(PROD_ENV) absent. Copiez .env.prod.example." && exit 1)
	@bad=$$(awk -F= 'BEGIN { IGNORECASE=1 } /^[[:space:]]*($$|#)/ { next } $$2 ~ /(change_me|placeholder|example\.com)/ { gsub(/[[:space:]]/, "", $$1); print $$1 }' $(PROD_ENV) | sort -u | tr '\n' ' '); \
	if [ -n "$$bad" ]; then echo "Valeurs de production à remplacer : $$bad"; exit 1; fi
	$(PROD) config >/dev/null
	@echo "Configuration production valide"

prod-build: prod-check
	$(PROD) build api web
prod: prod-check
	$(PROD) up -d --build --remove-orphans
	@echo "The Choice démarré sur le port configuré APP_PORT"
prod-migrate: prod-check
	$(PROD) run --rm migrate
prod-stop:
	$(PROD) down
prod-status:
	$(PROD) ps
prod-logs:
	$(PROD) logs -f $(SERVICE)
prod-backup: prod-check
	@mkdir -p backups
	@$(PROD) exec -T postgres pg_dump -U $$(grep '^POSTGRES_USER=' $(PROD_ENV) | cut -d= -f2-) -d $$(grep '^POSTGRES_DB=' $(PROD_ENV) | cut -d= -f2-) -Fc > backups/thechoice-$$(date +%Y%m%d-%H%M%S).dump
	@echo "Sauvegarde créée dans ./backups"
