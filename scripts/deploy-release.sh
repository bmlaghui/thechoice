#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
: "${THECHOICE_ROOT:?Missing THECHOICE_ROOT}"
: "${RELEASE_SHA:?Missing RELEASE_SHA}"
[[ "$THECHOICE_ROOT" =~ ^/[a-zA-Z0-9/_-]+$ ]] || exit 1
[[ "$RELEASE_SHA" =~ ^[a-f0-9]{40}$ ]] || exit 1
release=$(pwd -P)
test -f "$THECHOICE_ROOT/shared/.env.prod"
mkdir -p "$THECHOICE_ROOT/backups"
exec 9>"$THECHOICE_ROOT/deploy.lock"
flock -w 600 9
export IMAGE_TAG="$RELEASE_SHA"
export PROD_ENV_FILE="$THECHOICE_ROOT/shared/.env.prod"
make prod-check PROD_ENV="$PROD_ENV_FILE"
compose=(docker compose --env-file "$PROD_ENV_FILE" -f "$release/docker-compose.prod.yml")
# Build artifacts must have been transferred and loaded before this step.
docker image inspect "thechoice/api:$IMAGE_TAG" >/dev/null
docker image inspect "thechoice/web:$IMAGE_TAG" >/dev/null
if docker ps --format '{{.Names}}' | grep -qx thechoice-db-prod; then
    backup="$THECHOICE_ROOT/backups/before-$RELEASE_SHA-$(date -u +%Y%m%dT%H%M%SZ).dump"
    docker exec thechoice-db-prod sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup"
    test -s "$backup"
fi
"${compose[@]}" up -d --no-build --wait --wait-timeout 240
"${compose[@]}" run --rm --no-deps api node dist/src/bootstrap-admin.js
# Compose health checks exercise services. Also exercise the public gateway routes.
set -a
. "$PROD_ENV_FILE"
set +a
for path in / /menu /reservation /api/v1/health; do
    curl --fail --silent --show-error --max-time 30 -H "Host: $APP_DOMAIN" "http://127.0.0.1:$APP_PORT$path" >/dev/null
done
# Activate only after successful health checks. Sources remain available for rollback.
ln -s "$release" "$THECHOICE_ROOT/current.next"
mv -Tf "$THECHOICE_ROOT/current.next" "$THECHOICE_ROOT/current"
printf 'Release %s active on http://127.0.0.1:%s\n' "$RELEASE_SHA" "$APP_PORT"
