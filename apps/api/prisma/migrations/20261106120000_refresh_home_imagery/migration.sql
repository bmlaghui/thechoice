-- Refresh only the original default imagery; keep custom CMS images intact.
UPDATE "PageBlock" AS block
SET "content" = block."content"::jsonb || '{"imageUrl":"/images/events/noodles-lifestyle.jpg","imageAlt":"Cuisine et partage autour des plats The Choice"}'::jsonb
FROM "Page" AS page
WHERE block."pageId" = page."id" AND page."slug" = 'home'
  AND block."type" = 'philosophy'
  AND block."content"->>'imageUrl' = '/images/restaurant/unnamed.webp';

UPDATE "PageBlock" AS block
SET "content" = block."content"::jsonb || '{"imageUrl":"/images/restaurant/unnamed (2).webp","imageAlt":"Salle principale du restaurant","imageUrl2":"/images/restaurant/unnamed (3).webp","imageAlt2":"Cocktails et bouchées à partager"}'::jsonb
FROM "Page" AS page
WHERE block."pageId" = page."id" AND page."slug" = 'home'
  AND block."type" = 'ambiance'
  AND block."content"->>'imageUrl' = '/images/restaurant/unnamed.webp'
  AND block."content"->>'imageUrl2' = '/images/restaurant/unnamed (2).webp';
