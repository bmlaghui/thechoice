# Agenda des réservations

Accès : `/admin/reservations`. Le rôle `EDITOR`, intitulé « Gestionnaire des réservations », y arrive après connexion et lorsqu’il ouvre `/admin`. Les administrateurs disposent d’une entrée « Agenda plein écran » dans le studio. Les API vérifient la permission `MANAGE_PLANNING`.

L’espace occupe la fenêtre entière sans barre latérale. Le bouton × revient au planning classique via une sortie explicite ; la connexion suivante du gestionnaire ouvre à nouveau le plein écran. Un mode plein écran du navigateur est également proposé lorsque celui-ci le permet. Sur téléphone, la vue jour est sélectionnée par défaut ; les vues semaine et mois deviennent des calendriers compacts qui pilotent la liste de la journée, sans défilement horizontal obligatoire. Sur tablette, les cartes d’accueil s’affichent sur deux colonnes quand la largeur le permet.

Un glissement vers la gauche sur une carte révèle le raccourci « Appeler ». Le geste ne compose aucun appel directement : il faut appuyer sur le raccourci. Un bouton « Appeler ↔ » propose la même action sans geste. Le défilement vertical reste disponible.

Les vues jour, semaine et mois chargent toute la période, avec pagination jusqu’à la dernière page. Les filtres de statut, service et recherche s’appliquent aux chiffres, aux cartes et à l’export CSV.

- Une demande est d’abord en attente ; l’équipe peut la confirmer ou l’annuler.
- « Clients présents » marque la réservation honorée (`COMPLETED`). « Absents » marque `NO_SHOW`, après confirmation. Ces deux indications restent corrigeables dans la fiche.
- Quinze minutes avant l’heure prévue, l’agenda signale l’arrivée imminente et permet d’enregistrer la présence. Après la période de grâce, « Présence à vérifier » signale le retard. **Aucune absence n’est enregistrée automatiquement** : l’équipe décide, même si le navigateur est resté fermé.
- L’heure de référence des alertes est celle du restaurant, `Europe/Paris`. L’horloge se met à jour chaque minute lorsque l’agenda est ouvert.
- « Déplacer » permet de choisir une date, une heure et un nombre de personnes. Les créneaux excluent la réservation elle-même du calcul d’occupation. Le serveur contrôle à nouveau les places avant enregistrement ; le statut est conservé.
- La fiche donne accès au téléphone, à l’e-mail, au message du client et aux notes internes.
- Les réservations téléphoniques peuvent être saisies avec les créneaux disponibles. Le consentement aux coordonnées doit être recueilli.
- Actualisation chaque minute lorsque l’écran est visible et qu’aucune fiche ou saisie n’est ouverte ; bouton d’actualisation manuelle disponible.

Les chiffres de couverts excluent les annulations et absences ; ils ne représentent pas un plan de salle ni un taux d’occupation simultané. La séparation midi/soir dans les filtres est indiquée dans l’interface (06 h–17 h / 17 h–06 h).

La confirmation et l’annulation utilisent le mécanisme e-mail existant. Un déplacement est enregistré et audité sans déclencher de notification e-mail supplémentaire. La délivrabilité SMTP de production reste à configurer.

Les comptes de démonstration figurent dans le README et sont exclusivement locaux. Les accès de production ne doivent jamais être committés. Le script de seed local conserve les mots de passe des comptes qui existent déjà.

## Service en cours

Le bouton « Service en cours » ouvre la journée actuelle et classe les accueils : présences à vérifier, arrivées en cours, demandes à confirmer, prochaines arrivées, puis réservations terminées. La recherche et les filtres restent actifs. La présence et le déplacement sont accessibles sur la carte ; une absence demande toujours confirmation.

Après une action de présence ou d’absence, « Annuler la dernière action » restaure le statut précédent. Le serveur refuse une annulation si le statut a changé entre-temps, et revérifie la capacité avant de réactiver une réservation. Cette correction ne renvoie pas de courriel de confirmation.

Sur mobile, les statistiques sont repliées dans un bouton récapitulatif. L’export CSV est dans « Options ». Les créneaux disponibles indiquent les places restantes, en excluant la réservation déplacée de son propre comptage.
