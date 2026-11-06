# Architecture
Le frontend Angular SSR est découpé entre `public`, `admin`, `core` et composants partagés. L’API NestJS expose `/api/v1`, encapsule Prisma dans un service et conserve des DTO séparés. PostgreSQL est la source de vérité.
