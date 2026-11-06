# Revue UX/UI et préparation au déploiement — 6 novembre 2026

## Corrections

- Accueil : images distinctes pour la philosophie et la mosaïque d’ambiance ; contenu de secours lorsque le CMS est indisponible ; sections plats et avis masquées si elles sont vides.
- Galerie : légendes et catégories corrigées pour correspondre aux photographies.
- Images CSS : URLs entre guillemets pour prendre en charge les noms avec espaces et parenthèses.
- Accessibilité : bouton du menu mobile nommé, liens sociaux du contact nommés, groupe anti-robot correctement identifié, contrastes du pied de page, des catégories et du filtre actif renforcés.
- Diaporama : bouton de pause et respect de la préférence de réduction des animations. Avis sans rotation automatique.
- Restaurant : suppression de la promesse « tous les jours » indépendante des horaires configurés ; affiche vidéo distincte du hero.
- Migration `20261106120000_refresh_home_imagery` : remplace uniquement les anciennes images par défaut de l’accueil dans le CMS ; les autres images personnalisées sont conservées. Le seed utilise les mêmes nouveaux visuels.

## Vérifications

- Build de production NestJS réussi.
- Build de production Angular SSR réussi ; dix routes pré-rendues.
- Tests API : huit réussis ; tests web : deux réussis. L’ancienne assertion du logo a été alignée sur l’identité déjà affichée.
- Contrôle axe après corrections : aucune violation WCAG A/AA détectée sur les seize rendus contrôlés, avec le contenu de secours. Les données et widgets de production restent à vérifier.
- Aucune référence locale à une image manquante dans les sources publiques et le seed.
- Contrôle Chrome des routes `/`, `/restaurant`, `/menu`, `/gallery`, `/reservation`, `/events`, `/quote`, `/contact`, en 1440 et 390 pixels : HTTP 200, aucun débordement horizontal et aucune exception JavaScript. API absente pendant ce contrôle : rendu de secours vérifié, pas les parcours serveur.

## Conditions avant mise en production

- `.env.prod` absent dans cet environnement : `make prod-check` échoue pour cette raison. Configurer les vrais secrets, le SMTP et les domaines sur le VPS puis relancer ce contrôle.
- Vérifier et publier les contenus CMS, la carte, les horaires et les liens sociaux. Une base vide ne fournit pas de créneaux ni de plats.
- Compléter les mentions légales et la confidentialité : le texte de secours des mentions légales est encore provisoire.
- Confirmer le domaine public : les URL SEO désignent `thechoicerestaurant.fr`, tandis que le guide VPS cible `thechoice.mlaghuibrahim.fr`.
- Appliquer et vérifier les migrations sur une base de validation avant production, y compris la migration d’images ajoutée ici ; aucune base disponible n’a permis de l’exécuter pendant cette revue.
- Effectuer un test réel de réservation, contact, devis et réception des e-mails avec la stack complète. Les images Docker, le TLS et le SMTP du VPS n’ont pas été validés ici.

Le code a passé ses builds et tests. La mise en production nécessite encore les vérifications de configuration et de données ci-dessus ; aucun déploiement n’a été exécuté pendant cette revue.
