# API

Swagger documente les routes sous `/api/docs`. Les entrées utilisent `class-validator` et les champs inconnus sont rejetés.

## Public

L'API publique sous `/api/v1` expose les paramètres du site (réglages indexés par clé, horaires et réseaux sociaux), les pages publiées, catégories actives, plats disponibles, galerie, événements et formulaires.

## Administration

L'authentification se fait avec `POST /api/v1/auth/login`. Le jeton d'accès court est envoyé avec `Authorization: Bearer …`; le refresh token est rotatif via `/auth/refresh` et révocable via `/auth/logout`.

Les routes `/api/v1/admin` permettent de gérer :

- pages, blocs et SEO ;
- catégories, plats, images et allergènes ;
- galerie et événements ;
- réservations, messages et demandes événement ;
- horaires, réseaux sociaux et tous les paramètres du site ;
- utilisateurs et rôles (droits `ADMIN`/`SUPER_ADMIN`) ;
- tableau de bord et journal d'audit.

Les listes utilisent `page`, `limit` et `search`, avec une réponse `{ data, meta }`. Les suppressions des pages et plats sont logiques. Toutes les mutations importantes alimentent `AuditLog`.
