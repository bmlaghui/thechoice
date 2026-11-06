import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, PublishStatus, ReservationStatus } from '../src/generated/prisma/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const passwordHash = await argon2.hash(process.env.ADMIN_PASSWORD ?? 'ChoiceDev2026!');
  await prisma.user.upsert({
    where: { email: 'admin@thechoice.local' },
    update: {},
    create: { email: 'admin@thechoice.local', passwordHash, role: Role.SUPER_ADMIN },
  });
  const rolePolicies=[
    {role:Role.SUPER_ADMIN,label:'Admin',description:'Accès complet à la configuration et à la sécurité.',permissions:['VIEW_CONTENT','MANAGE_CONTENT','MANAGE_PLANNING','MANAGE_MESSAGES','MANAGE_HOURS','MANAGE_USERS','MANAGE_ROLES']},
    {role:Role.ADMIN,label:'Content manager',description:'Gestion éditoriale du menu et de la galerie.',permissions:['VIEW_CONTENT','MANAGE_CONTENT','MANAGE_MESSAGES']},
    {role:Role.EDITOR,label:'Planning planner',description:'Gestion des réservations, événements et horaires.',permissions:['MANAGE_PLANNING','MANAGE_HOURS']},
  ];
  for(const policy of rolePolicies)await prisma.rolePolicy.upsert({where:{role:policy.role},update:{},create:policy});

  const categoryData = [
    { name: 'À partager', slug: 'a-partager', eyebrow: 'Convivialité & découverte', description: 'Des assiettes généreuses à poser au centre de la table.', imageUrl: '/images/dishes/truffle-gol-gappa.jpg', imageAlt: 'Assiettes The Choice à partager', order: 1 },
    { name: 'Signatures', slug: 'signatures', eyebrow: 'Créations de la maison', description: 'Les créations emblématiques de la maison.', imageUrl: '/images/dishes/truffle-rice.jpg', imageAlt: 'Plat signature The Choice', order: 2 },
    { name: 'Grillades', slug: 'grillades', eyebrow: 'Cuissons & caractère', description: 'Viandes sélectionnées et cuisson maîtrisée.', imageUrl: '/images/dishes/grill-selection.jpg', imageAlt: 'Sélection de grillades', order: 3 },
    { name: 'Desserts', slug: 'desserts', eyebrow: 'Douceurs spectaculaires', description: 'La touche finale, gourmande et spectaculaire.', imageUrl: '/images/dishes/cotton-blast.jpg', imageAlt: 'Dessert Cotton Blast', order: 4 },
  ];
  const categories = new Map<string, string>();
  for (const data of categoryData) {
    const category = await prisma.menuCategory.upsert({ where: { slug: data.slug }, update: {}, create: data });
    categories.set(data.slug, category.id);
  }

  const allergens = new Map<string, string>();
  for (const data of [{ name: 'Gluten', slug: 'gluten' }, { name: 'Lait', slug: 'lait' }, { name: 'Crustacés', slug: 'crustaces' }, { name: 'Fruits à coque', slug: 'fruits-a-coque' }]) {
    const allergen = await prisma.allergen.upsert({ where: { slug: data.slug }, update: {}, create: data });
    allergens.set(data.slug, allergen.id);
  }

  const dishes = [
    { name: 'Truffle Gol Gappa', slug: 'truffle-gol-gappa', description: 'Sphères croustillantes, crème de truffe et herbes fraîches.', eyebrow: "L’assiette du chef", chefQuote: 'Une entrée tout en douceur, réveillée par la profondeur aromatique de la truffe.', badges: ['Signature','Frais'], imageAlt: 'Truffle Gol Gappa dressés sur une assiette', price: 14, category: 'a-partager', imageUrl: '/images/dishes/truffle-gol-gappa.jpg', featured: true, vegetarian: true, allergens: ['gluten', 'lait'] },
    { name: 'Nems de crevette', slug: 'nems-crevette', description: 'Crevettes marinées, feuille croustillante et sauce maison.', price: 15, category: 'a-partager', imageUrl: '/images/dishes/nems-crevette.jpg', featured: true, allergens: ['crustaces', 'gluten'] },
    { name: 'Truffle Rice', slug: 'truffle-rice', description: 'Riz crémeux, truffe, parmesan et jus corsé.', price: 24, category: 'signatures', imageUrl: '/images/dishes/truffle-rice.jpg', featured: true, vegetarian: true, allergens: ['lait'] },
    { name: 'Black Truffle Burger', slug: 'black-truffle-burger', description: 'Bœuf maturé, cheddar, truffe noire et pain brioché.', price: 27, category: 'signatures', imageUrl: '/images/dishes/black-truffle-burger.jpg', featured: true, allergens: ['gluten', 'lait'] },
    { name: 'The Choice Grill', slug: 'the-choice-grill', description: 'Sélection du boucher, légumes braisés et sauces maison.', price: 32, category: 'grillades', imageUrl: '/images/dishes/grill-selection.jpg', featured: false, allergens: ['lait'] },
    { name: 'Cotton Blast', slug: 'cotton-blast', description: 'Nuage de barbe à papa, chocolat et surprise glacée.', price: 13, category: 'desserts', imageUrl: '/images/dishes/cotton-blast.jpg', featured: true, allergens: ['lait', 'fruits-a-coque'] },
  ];
  for (const [order, dish] of dishes.entries()) {
    const { category, allergens: dishAllergens, ...data } = dish;
    await prisma.dish.upsert({
      where: { slug: data.slug },
      update: {},
      create: { ...data, order: order + 1, categoryId: categories.get(category)!, ingredients: ['Produits frais', 'Épices maison'], allergens: { create: dishAllergens.map((slug) => ({ allergenId: allergens.get(slug)! })) } },
    });
  }

  const pages = [
    { title: 'Accueil', slug: 'home', seo: ['The Choice — Fusion Food à Pierrelaye', 'Une expérience culinaire généreuse et spectaculaire.'], blocks: [
      { type: 'hero', content: { title: 'More than food, a feeling', primaryCta: 'Réserver une table', secondaryCta: 'Découvrir la carte', imageUrl: '/images/hero/the-choice-table-user.jpeg', imageAlt: 'Table généreuse chez The Choice', imageUrl2: '/images/hero/sharing-table-01.jpg', imageUrl3: '/images/hero/sharing-table-02.jpg' } },
      { type: 'philosophy', content: { eyebrow: 'Notre philosophie', title: 'Une cuisine sans frontières', text: 'Des inspirations du monde réunies autour du plaisir et du partage.', linkLabel: 'Notre histoire', imageUrl: '/images/events/noodles-lifestyle.jpg', imageAlt: 'Cuisine et partage autour des plats The Choice' } },
      { type: 'chef', content: { eyebrow: 'Notre chef', title: 'La passion dans chaque détail.', text: 'Notre chef sélectionne les meilleurs produits et imagine des recettes uniques où se rencontrent tradition et modernité.', signature: 'Chef Exécutif', linkLabel: 'Voir le menu complet', imageUrl: '/images/chef.png', imageAlt: 'Le chef dresse un plat avec précision' } },
      { type: 'bestSellers', content: { eyebrow: 'Nos incontournables', title: 'Nos best sellers', linkLabel: 'Voir le menu complet' } },
      { type: 'ambiance', content: { eyebrow: "L’ambiance", title: 'Un lieu élégant et chaleureux.', text: 'Une atmosphère feutrée, une lumière chaleureuse et des espaces pensés pour partager un moment à part.', linkLabel: 'Découvrir le restaurant', imageUrl: '/images/restaurant/unnamed (2).webp', imageAlt: 'Salle principale du restaurant', imageUrl2: '/images/restaurant/unnamed (3).webp', imageAlt2: 'Cocktails et bouchées à partager' } },
      { type: 'testimonialsHeader', content: { eyebrow: 'Ils parlent de nous', title: 'Une expérience qui se raconte.' } },
      { type: 'booking', content: { eyebrow: 'Réservation', title: 'Réservez votre table.', text: "Choisissez votre date, votre heure et profitez d’une expérience pensée dans les moindres détails.", submitLabel: 'Continuer la réservation' } },
      { type: 'features', content: { seatsLabel: 'Places assises', parkingLabel: 'Places de parking', openValue: 'Ouvert', openLabel: 'Selon les horaires', eventsValue: 'Événements', eventsLabel: 'Privatisations' } },
    ] },
    { title: 'Le Restaurant', slug: 'restaurant', seo: ['Le Restaurant — The Choice', 'Découvrez notre histoire, notre chef et notre univers.'], blocks: [{ type: 'intro', content: { title: 'L’expérience The Choice', text: 'Un lieu vivant pensé pour les grandes tablées et les moments qui comptent.', imageUrl: '/images/interior.png', imageAlt: 'Intérieur du restaurant The Choice' } }] },
    { title: 'Le Menu', slug: 'menu', seo: ['Le Menu — The Choice', 'Découvrez la carte fusion du restaurant The Choice.'], blocks: [{ type: 'hero', content: { eyebrow: 'L’expérience The Choice', title: 'Le goût sans compromis.', text: 'Une carte fusion audacieuse, pensée comme un voyage entre textures, parfums et émotions.', imageUrl: '/images/menu-dishes.png', imageAlt: 'Sélection de plats The Choice' } }] },
    { title: 'Réservation', slug: 'reservation', seo: ['Réserver une table — The Choice', 'Choisissez votre date, votre heure et réservez votre table.'], blocks: [{ type: 'hero', content: { eyebrow: 'Réservation', title: 'Réservez votre table', text: 'Que ce soit pour un dîner en tête-à-tête, un repas entre amis ou un événement spécial, nous avons la table idéale pour vous.', imageUrl: '/images/hero/sharing-table-01.jpg', imageAlt: 'Table dressée chez The Choice' } }] },
    { title: 'Événements', slug: 'events', seo: ['Événements & privatisation — The Choice', 'Organisez votre événement privé ou professionnel chez The Choice.'], blocks: [{ type: 'hero', content: { eyebrow: 'Événements & privatisation', title: 'Vos événements sur mesure.', text: 'Anniversaires, repas d’affaires, soirées privées et groupes : notre équipe crée un moment à votre image.', imageUrl: '/images/events/champagne.png', imageAlt: 'Événement privé chez The Choice' } }] },
    { title: 'Demande de devis', slug: 'quote', seo: ['Demande de devis — The Choice', 'Décrivez votre événement et recevez une proposition personnalisée.'], blocks: [{ type: 'hero', content: { eyebrow: 'Événements & privatisation', title: 'Imaginons votre événement.', text: 'Parlez-nous de votre projet. Notre équipe construit une expérience sur mesure, du menu à la mise en scène.', imageUrl: '/images/events/server-dishes.jpg', imageAlt: 'Préparation d’un événement The Choice' } }] },
    { title: 'Galerie', slug: 'gallery', seo: ['Galerie — The Choice', 'Découvrez le restaurant, ses plats et son ambiance en images.'], blocks: [{ type: 'hero', content: { eyebrow: 'Galerie', title: 'Plongez dans notre univers.', text: 'Le restaurant, les assiettes et les moments qui font The Choice.', imageUrl: '/images/restaurant/unnamed (2).webp', imageAlt: 'Ambiance du restaurant The Choice' } }] },
    { title: 'Contact', slug: 'contact', seo: ['Contact — The Choice', 'Contactez le restaurant The Choice à Pierrelaye.'], blocks: [{ type: 'hero', content: { eyebrow: 'Nous sommes à votre écoute', title: 'Une question ? Une réservation ?', text: 'Notre équipe est disponible pour répondre à toutes vos demandes. Contactez-nous ou venez nous rendre visite.', imageUrl: '/images/restaurant/unnamed.webp', imageAlt: 'Salle du restaurant The Choice' } }] },
    { title: 'Mentions légales', slug: 'legal', seo: ['Mentions légales — The Choice', 'Informations légales du restaurant The Choice.'], blocks: [{ type: 'rich-text', content: { body: 'Éditeur : The Choice Restaurant, 264 boulevard du Havre, 95480 Pierrelaye.' } }] },
    { title: 'Confidentialité', slug: 'privacy', seo: ['Confidentialité — The Choice', 'Politique de confidentialité et traitement des données.'], blocks: [{ type: 'rich-text', content: { body: 'Les données transmises sont utilisées uniquement pour traiter vos demandes.' } }] },
  ];
  for (const page of pages) {
    const savedPage = await prisma.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: { title: page.title, slug: page.slug, status: PublishStatus.PUBLISHED, seo: { create: { title: page.seo[0], description: page.seo[1] } }, blocks: { create: page.blocks.map((block, order) => ({ ...block, order })) } },
    });
    const existingBlocks = await prisma.pageBlock.findMany({ where: { pageId: savedPage.id } });
    for (const [order, block] of page.blocks.entries()) {
      const existing = existingBlocks.find(item => item.type === block.type);
      if (!existing) await prisma.pageBlock.create({ data: { pageId: savedPage.id, type: block.type, content: block.content, order } });
      else if (block.content && typeof block.content === 'object' && !Array.isArray(block.content)) {
        await prisma.pageBlock.update({ where: { id: existing.id }, data: { content: { ...block.content, ...(existing.content && typeof existing.content === 'object' && !Array.isArray(existing.content) ? existing.content as object : {}) } } });
      }
    }
  }

  const settings: Record<string, object> = {
    identity: { name: 'The Choice', baseline: 'More than food, a feeling', logo: '/images/logo/logo-official.png' },
    contact: { phone: '01 60 17 56 68', email: 'hello@thechoicerestaurant.fr', address: '264 boulevard du Havre, 95480 Pierrelaye', latitude: 49.0023, longitude: 2.18 },
    reservation: { enabled: true, minGuests: 1, maxGuests: 30, slotMinutes: 30, maxCoversPerSlot: 40, advanceDays: 60, confirmationMode: 'manual' },
    seo: { titleSuffix: '— The Choice', defaultDescription: 'Restaurant fusion food à Émerainville', locale: 'fr_FR' },
    appearance: { primaryColor: '#3a8a4a', darkColor: '#030504', animations: true },
    restaurantStats: { seats: 180, parking: 400, certification: '100%', certificationLabel: 'Halal' },
  };
  for (const [key, value] of Object.entries(settings)) await prisma.siteSetting.upsert({ where: { key }, update: {}, create: { key, value } });

  for (let day = 0; day < 7; day++) {
    const closed = day === 1;
    await prisma.openingHour.upsert({ where: { day }, update: {}, create: { day, label: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][day], opensAt: closed ? null : '12:00', closesAt: closed ? null : '23:30', closed } });
  }
  for (const link of [{ platform: 'Instagram', url: 'https://instagram.com/thechoice', active: true }, { platform: 'TikTok', url: 'https://tiktok.com/@thechoice', active: true }, { platform: 'Facebook', url: 'https://facebook.com/thechoice', active: true }]) await prisma.socialLink.upsert({ where: { platform: link.platform }, update: {}, create: link });

  const gallery = [{ title: 'La salle', category: 'Restaurant', imageUrl: '/images/restaurant/unnamed.webp', alt: 'Salle du restaurant The Choice', order: 1 }, { title: 'À table', category: 'Ambiance', imageUrl: '/images/hero/sharing-table-01.jpg', alt: 'Table dressée et plats à partager', order: 2 }, { title: 'Service', category: 'Ambiance', imageUrl: '/images/events/server-dishes.jpg', alt: 'Service des plats en salle', order: 3 }];
  if (await prisma.galleryItem.count() === 0) await prisma.galleryItem.createMany({ data: gallery });
  if(await prisma.testimonial.count()===0)await prisma.testimonial.createMany({data:[
    {author:'Sofia M.',context:'Dîner en famille',quote:'Une expérience incroyable du début à la fin. La cuisine est généreuse, le lieu magnifique et le service vraiment attentionné.',rating:5,avatarUrl:'/images/events/server-dishes.jpg',avatarAlt:'Salle et service The Choice',featured:true,order:1},
    {author:'Yanis A.',context:'Client régulier',quote:'Chaque assiette est une surprise. Le saumon teriyaki et le burger truffé sont devenus nos incontournables.',rating:5,avatarUrl:'/images/events/noodles-lifestyle.jpg',avatarAlt:'Plat servi chez The Choice',order:2},
    {author:'Leïla N.',context:'Événement privé',quote:'Organisation parfaite, ambiance élégante et équipe aux petits soins pour notre anniversaire.',rating:5,avatarUrl:'/images/hero/sharing-table-02.jpg',avatarAlt:'Événement privé au restaurant',order:3},
  ]});
  await prisma.eventOffer.upsert({ where: { slug: 'privatisation' }, update: {}, create: { title: 'Privatisation', slug: 'privatisation', description: 'Un espace et un menu sur mesure pour vos événements.', imageUrl: '/images/events/champagne.png' } });

  if (await prisma.reservation.count() === 0) {
    const date = new Date(); date.setDate(date.getDate() + 1); date.setHours(20, 0, 0, 0);
    await prisma.reservation.createMany({ data: [
      { date, time: '20:00', guests: 4, name: 'Sarah Martin', email: 'sarah@example.com', phone: '0612345678', consent: true, status: ReservationStatus.CONFIRMED },
      { date, time: '21:00', guests: 2, name: 'Yanis B.', email: 'yanis@example.com', phone: '0623456789', consent: true, status: ReservationStatus.PENDING },
    ] });
    await prisma.contactMessage.create({ data: { name: 'Nora Benali', email: 'nora@example.com', message: 'Bonjour, proposez-vous des menus pour les groupes ?' } });
    await prisma.eventInquiry.create({ data: { name: 'Maison Stella', email: 'events@stella.example', phone: '0140000000', eventType: 'Dîner entreprise', guests: 30, message: 'Nous souhaitons privatiser une partie du restaurant.' } });
  }
  console.log('Seed terminé — données manquantes créées, données administrées préservées.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
