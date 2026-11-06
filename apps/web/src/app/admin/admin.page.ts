import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, NgOptimizedImage } from '@angular/common';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { AdminApiService, PageResult } from './admin-api.service';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type Row = Record<string, unknown>;
type Field = {
  key: string;
  label: string;
  type?:
    | 'text'
    | 'number'
    | 'date'
    | 'time'
    | 'email'
    | 'file'
    | 'tags'
    | 'category'
    | 'allergens'
    | 'checkbox'
    | 'textarea'
    | 'json'
    | 'select';
  options?: string[];
};
type ModuleConfig = {
  endpoint: string;
  singular: string;
  description: string;
  columns: Array<{ key: string; label: string }>;
  fields: Field[];
  add?: boolean;
};

@Component({
  selector: 'app-admin',
  imports: [DatePipe, NgOptimizedImage, ReactiveFormsModule],
  templateUrl: './admin.page.html',
  styleUrls: [
    './admin.page.scss',
    './admin-enhancements.scss',
    './admin-category.scss',
    './admin-preview.scss',
    './admin-dish.scss',
    './admin-input-fix.scss',
    './admin-allergens.scss',
    './admin-dish-layout.scss',
    './admin-product-preview.scss',
    './admin-gallery.scss',
    './admin-messages.scss',
    './admin-hours.scss',
    './admin-users.scss',
    './admin-cms-workspace.scss',
  ],
})
export class AdminPage implements OnInit {
  protected openReservationDesk(): void { void this.router.navigateByUrl('/admin/reservations'); }
  protected readonly Number = Number;
  protected readonly Math = Math;
  protected readonly api = inject(AdminApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly active = signal('Tableau de bord');
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly rows = signal<Row[]>([]);
  protected readonly total = signal(0);
  protected readonly dashboard = signal<Row>({});
  protected readonly page = signal(1);
  protected readonly limit = signal(10);
  protected readonly calendarCursor = signal(new Date());
  protected readonly planningView = signal<'month' | 'week' | 'day' | 'list'>('month');
  protected readonly kindFilter = signal('Tous');
  protected readonly statusFilter = signal('Tous');
  protected readonly selectedRow = signal<Row | null>(null);
  protected readonly toast = signal('');
  protected readonly sortKey = signal('rawDate');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly columnFilters = signal<Record<string, string>>({});
  protected readonly draggedRow = signal<Row | null>(null);
  protected readonly dragTarget = signal('');
  protected readonly uploadingImage = signal(false);
  protected readonly draggedCategory = signal<Row | null>(null);
  protected readonly categoryImagePreview = signal('');
  protected readonly categoryPreview = signal<Row | null>(null);
  protected readonly categoryOptions = signal<Row[]>([]);
  protected readonly allergenOptions = signal<Row[]>([]);
  protected readonly dishImagePreview = signal('');
  protected readonly draggedDish = signal<Row | null>(null);
  protected readonly dishPreview = signal<Row | null>(null);
  protected readonly galleryImagePreview = signal('');
  protected readonly draggedGallery = signal<Row | null>(null);
  protected readonly galleryPreview = signal<Row | null>(null);
  protected readonly testimonialImagePreview = signal('');
  protected readonly draggedTestimonial = signal<Row | null>(null);
  protected readonly messagePreview = signal<Row | null>(null);
  protected readonly messageReplyOpen = signal(false);
  protected readonly messageReplySending = signal(false);
  protected readonly messageReplySubject = new FormControl('Votre message à The Choice', {
    nonNullable: true,
  });
  protected readonly messageReplyHtml = signal('');
  protected readonly confirmation = signal<{
    title: string;
    message: string;
    danger: boolean;
    action: () => void;
  } | null>(null);
  protected readonly userPasswordTarget = signal<Row | null>(null);
  protected readonly userPasswordSaving = signal(false);
  protected readonly showUserPasswords = signal(false);
  protected readonly userPassword = new FormControl('', { nonNullable: true });
  protected readonly userPasswordConfirmation = new FormControl('', { nonNullable: true });
  protected readonly editorOpen = signal(false);
  protected readonly editing = signal<Row | null>(null);
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly planningCreate = signal(false);
  protected readonly reservationSlots = signal<string[]>([]);
  protected readonly reservationSchedule = signal<Row | null>(null);
  protected readonly form = new FormRecord<FormControl<string | number | boolean>>({});
  protected readonly navGroups = [
    { label: 'Activité', icon: '⌁', items: ['Tableau de bord', 'Planning', 'Messages'] },
    { label: 'Contenu', icon: '▤', items: ['Pages', 'Médiathèque', 'Catégories', 'Plats', 'Galerie', 'Témoignages', 'Offres événement'] },
    { label: 'Configuration', icon: '⚙', items: ['Configuration'] },
    { label: 'Équipe & sécurité', icon: '⌾', items: ['Utilisateurs', 'Rôles & accès'] },
  ];
  protected readonly navIcons: Record<string, string> = { 'Tableau de bord':'⌁',Planning:'◷',Messages:'◌',Pages:'▤',Médiathèque:'▧',Catégories:'⌘',Plats:'◇',Galerie:'▦',Témoignages:'✦','Offres événement':'♢',Configuration:'⚙','Identité publique':'◇',Coordonnées:'⌖',Horaires:'◴','Dates exceptionnelles':'◫','Réglages réservation':'◷','Chiffres du restaurant':'⌁','Réseaux sociaux':'◎',Paramètres:'⚙',Utilisateurs:'◎','Rôles & accès':'⌾' };
  protected readonly configurationModules = [
    { label: 'Identité publique', icon: '◇', description: 'Nom, signature et logo du restaurant.' },
    { label: 'Coordonnées', icon: '⌖', description: 'Adresse, téléphone, e-mail et position de la carte.' },
    { label: 'Horaires', icon: '◴', description: 'Semaine type affichée et utilisée pour réserver.' },
    { label: 'Dates exceptionnelles', icon: '◫', description: 'Fermetures, ouvertures et capacités ponctuelles.' },
    { label: 'Réglages réservation', icon: '◷', description: 'Créneaux, capacité, limites et confirmation.' },
    { label: 'Chiffres du restaurant', icon: '⌁', description: 'Places, parking et certification publique.' },
    { label: 'Réseaux sociaux', icon: '◎', description: 'Profils visibles dans le site et le footer.' },
    { label: 'Paramètres', icon: '⚙', description: 'Configuration JSON avancée.' },
  ];
  protected readonly cmsBlocks = signal<Array<{ type: string; content: Record<string, unknown>; order: number }>>([]);
  protected readonly cmsSeo = signal({ title: '', description: '' });
  protected readonly editorDirty = signal(false);
  protected readonly configurationOverview = signal<Record<string, { ready: boolean; detail: string }>>({});
  private readonly configs: Record<string, ModuleConfig> = {
    Configuration: { endpoint: '/admin/settings', singular: 'configuration', description: 'Tous les réglages au même endroit.', add: false, columns: [], fields: [] },
    Planning: {
      endpoint: '/admin/reservations',
      singular: 'entrée planning',
      description: 'Pilotez réservations et événements dans un planning unique.',
      columns: [
        { key: 'kind', label: 'Type' },
        { key: 'name', label: 'Client / contact' },
        { key: 'displayDate', label: 'Date' },
        { key: 'guests', label: 'Personnes' },
        { key: 'status', label: 'Statut' },
      ],
      fields: [
        {
          key: 'status',
          label: 'Statut',
          type: 'select',
          options: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
        },
        { key: 'internalNotes', label: 'Notes internes', type: 'textarea' },
      ],
    },
    Pages: {
      endpoint: '/admin/pages',
      singular: 'page',
      description: 'Composez les pages publiques, leur publication et leur référencement.',
      add: false,
      columns: [
        { key: 'title', label: 'Titre' },
        { key: 'slug', label: 'URL' },
        { key: 'status', label: 'Publication' },
        { key: 'updatedAt', label: 'Modification' },
      ],
      fields: [
        { key: 'title', label: 'Titre' },
        { key: 'slug', label: 'Slug' },
        { key: 'status', label: 'Statut', type: 'select', options: ['DRAFT', 'PUBLISHED'] },
        { key: 'blocks', label: 'Blocs JSON', type: 'json' },
        { key: 'seo', label: 'SEO JSON', type: 'json' },
      ],
    },
    Médiathèque: {
      endpoint: '/admin/media', singular: 'média',
      description: 'Retrouvez les images importées depuis le CMS, les plats et la galerie.', add: false,
      columns: [{ key: 'url', label: 'Aperçu' }, { key: 'filename', label: 'Fichier' }, { key: 'alt', label: 'Description' }, { key: 'size', label: 'Taille' }, { key: 'createdAt', label: 'Ajout' }],
      fields: [{ key: 'alt', label: 'Description accessible de l’image' }],
    },
    Catégories: {
      endpoint: '/admin/categories',
      singular: 'catégorie',
      description: 'Gérez les bannières et réordonnez les catégories par glisser-déposer.',
      columns: [
        { key: 'name', label: 'Nom' },
        { key: 'eyebrow', label: 'Surtitre' },
        { key: 'slug', label: 'Slug' },
        { key: 'active', label: 'Visible' },
      ],
      fields: [
        { key: 'name', label: 'Titre' },
        { key: 'eyebrow', label: 'Surtitre vert' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'imageUrl', label: 'Image de couverture', type: 'file' },
        { key: 'imageAlt', label: 'Texte alternatif de l’image' },
        { key: 'active', label: 'Visible sur le site', type: 'checkbox' },
      ],
    },
    Plats: {
      endpoint: '/admin/dishes',
      singular: 'plat',
      description: 'Gérez la carte, les prix et réordonnez les plats par glisser-déposer.',
      columns: [
        { key: 'name', label: 'Plat' },
        { key: 'category.name', label: 'Catégorie' },
        { key: 'price', label: 'Prix' },
        { key: 'available', label: 'Disponible' },
        { key: 'featured', label: 'À la une' },
      ],
      fields: [
        { key: 'name', label: 'Nom du plat' },
        { key: 'eyebrow', label: 'Surtitre' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'chefQuote', label: 'Citation du chef', type: 'textarea' },
        { key: 'price', label: 'Prix en euros', type: 'number' },
        { key: 'categoryId', label: 'Catégorie', type: 'category' },
        { key: 'imageUrl', label: 'Photo du plat', type: 'file' },
        { key: 'imageAlt', label: 'Texte alternatif de la photo' },
        { key: 'ingredients', label: 'Ingrédients', type: 'tags' },
        { key: 'badges', label: 'Badges', type: 'tags' },
        { key: 'allergenIds', label: 'Allergènes', type: 'allergens' },
        { key: 'available', label: 'Disponible', type: 'checkbox' },
        { key: 'featured', label: 'Mis en avant', type: 'checkbox' },
        { key: 'vegetarian', label: 'Végétarien', type: 'checkbox' },
        { key: 'halal', label: 'Halal', type: 'checkbox' },
        { key: 'spicy', label: 'Épicé', type: 'checkbox' },
      ],
    },
    Galerie: {
      endpoint: '/admin/gallery',
      singular: 'photo',
      description: 'Importez les visuels et réordonnez la galerie par glisser-déposer.',
      columns: [
        { key: 'imageUrl', label: 'Aperçu' },
        { key: 'title', label: 'Titre' },
        { key: 'category', label: 'Collection' },
        { key: 'published', label: 'Publié' },
      ],
      fields: [
        { key: 'title', label: 'Titre' },
        { key: 'category', label: 'Collection' },
        { key: 'imageUrl', label: 'Image', type: 'file' },
        { key: 'alt', label: 'Texte alternatif' },
        { key: 'published', label: 'Publié', type: 'checkbox' },
      ],
    },
    Témoignages: {
      endpoint: '/admin/testimonials',
      singular: 'témoignage',
      description: 'Publiez et ordonnez les avis affichés sur la page d’accueil.',
      columns: [
        { key: 'author', label: 'Auteur' },
        { key: 'context', label: 'Contexte' },
        { key: 'rating', label: 'Note' },
        { key: 'featured', label: 'Mis en avant' },
        { key: 'published', label: 'Publié' },
      ],
      fields: [
        { key: 'author', label: 'Nom affiché' },
        { key: 'context', label: 'Contexte' },
        { key: 'quote', label: 'Témoignage', type: 'textarea' },
        { key: 'rating', label: 'Note sur 5', type: 'number' },
        { key: 'avatarUrl', label: 'Photo', type: 'file' },
        { key: 'avatarAlt', label: 'Texte alternatif' },
        { key: 'featured', label: 'Mis en avant', type: 'checkbox' },
        { key: 'published', label: 'Publié', type: 'checkbox' },
      ],
    },
    'Offres événement': {
      endpoint: '/admin/events',
      singular: 'offre',
      description: 'Créez les offres groupes, célébrations et privatisations visibles sur le site.',
      columns: [
        { key: 'title', label: 'Offre' },
        { key: 'slug', label: 'Slug' },
        { key: 'published', label: 'Publié' },
        { key: 'updatedAt', label: 'Modification' },
      ],
      fields: [
        { key: 'title', label: 'Titre' },
        { key: 'slug', label: 'Slug' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'imageUrl', label: 'Image', type: 'file' },
        { key: 'published', label: 'Publié', type: 'checkbox' },
      ],
    },
    Messages: {
      endpoint: '/admin/messages',
      singular: 'message',
      description:
        'Consultez, triez et traitez les demandes reçues depuis le formulaire de contact.',
      add: false,
      columns: [
        { key: 'name', label: 'Expéditeur' },
        { key: 'email', label: 'E-mail' },
        { key: 'phone', label: 'Téléphone' },
        { key: 'message', label: 'Message' },
        { key: 'read', label: 'Statut' },
        { key: 'createdAt', label: 'Reçu le' },
      ],
      fields: [],
    },
    Horaires: {
      endpoint: '/admin/opening-hours',
      singular: 'horaire',
      description:
        'Configurez les heures d’ouverture affichées sur le site et utilisées par les réservations.',
      add: false,
      columns: [
        { key: 'label', label: 'Jour' },
        { key: 'opensAt', label: 'Ouverture' },
        { key: 'closesAt', label: 'Fermeture' },
        { key: 'closed', label: 'Fermé' },
      ],
      fields: [
        { key: 'label', label: 'Jour' },
        { key: 'opensAt', label: 'Ouverture', type: 'time' },
        { key: 'closesAt', label: 'Fermeture', type: 'time' },
        { key: 'closed', label: 'Fermé', type: 'checkbox' },
      ],
    },
    'Dates exceptionnelles': {
      endpoint: '/admin/special-opening-hours',
      singular: 'date exceptionnelle',
      description:
        'Fermez exceptionnellement une date ou appliquez-lui des horaires et une capacité spécifiques.',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'label', label: 'Motif' },
        { key: 'opensAt', label: 'Ouverture' },
        { key: 'closesAt', label: 'Fermeture' },
        { key: 'closed', label: 'Fermé' },
        { key: 'capacityOverride', label: 'Capacité' },
      ],
      fields: [
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'label', label: 'Motif ou libellé' },
        { key: 'closed', label: 'Restaurant fermé', type: 'checkbox' },
        { key: 'opensAt', label: 'Ouverture exceptionnelle', type: 'time' },
        { key: 'closesAt', label: 'Fermeture exceptionnelle', type: 'time' },
        { key: 'capacityOverride', label: 'Capacité du créneau', type: 'number' },
      ],
    },
    'Réseaux sociaux': {
      endpoint: '/admin/social-links',
      singular: 'réseau social',
      description: 'Configurez les liens sociaux affichés sur le site public.',
      add: false,
      columns: [
        { key: 'platform', label: 'Plateforme' },
        { key: 'url', label: 'Lien public' },
        { key: 'active', label: 'Visible' },
      ],
      fields: [
        { key: 'url', label: 'URL du profil' },
        { key: 'active', label: 'Afficher sur le site', type: 'checkbox' },
      ],
    },
    Coordonnées: {
      endpoint: '/admin/settings',
      singular: 'coordonnées',
      description: 'Configurez les informations de contact et le point GPS exact utilisé par les cartes.',
      add: false,
      columns: [
        { key: 'address', label: 'Adresse' },
        { key: 'phone', label: 'Téléphone' },
        { key: 'email', label: 'E-mail' },
      ],
      fields: [
        { key: 'address', label: 'Adresse complète' },
        { key: 'phone', label: 'Téléphone' },
        { key: 'email', label: 'E-mail', type: 'email' },
        { key: 'latitude', label: 'Latitude', type: 'number' },
        { key: 'longitude', label: 'Longitude', type: 'number' },
      ],
    },
    'Identité publique': {
      endpoint: '/admin/settings', singular: 'identité publique',
      description: 'Configurez le nom, la signature et le logo affichés sur le site.', add: false,
      columns: [{ key: 'name', label: 'Nom' }, { key: 'baseline', label: 'Signature' }, { key: 'logo', label: 'Logo' }],
      fields: [{ key: 'name', label: 'Nom du restaurant' }, { key: 'baseline', label: 'Signature' }, { key: 'logo', label: 'URL du logo' }],
    },
    'Chiffres du restaurant': {
      endpoint: '/admin/settings', singular: 'chiffres du restaurant',
      description: 'Configurez les indicateurs mis en avant sur les pages publiques.', add: false,
      columns: [{ key: 'seats', label: 'Places' }, { key: 'parking', label: 'Parking' }, { key: 'certification', label: 'Certification' }],
      fields: [{ key: 'seats', label: 'Places assises', type: 'number' }, { key: 'parking', label: 'Places de parking', type: 'number' }, { key: 'certification', label: 'Valeur de certification' }, { key: 'certificationLabel', label: 'Libellé de certification' }],
    },
    'Réglages réservation': {
      endpoint: '/admin/settings',
      singular: 'réglages de réservation',
      description: 'Configurez les limites et la capacité utilisées par les formulaires publics.',
      add: false,
      columns: [
        { key: 'enabled', label: 'Réservations' },
        { key: 'slotMinutes', label: 'Pas' },
        { key: 'maxCoversPerSlot', label: 'Capacité / créneau' },
        { key: 'advanceDays', label: 'Calendrier (jours)' },
      ],
      fields: [
        { key: 'enabled', label: 'Réservations activées', type: 'checkbox' },
        { key: 'minGuests', label: 'Minimum de personnes', type: 'number' },
        { key: 'maxGuests', label: 'Maximum de personnes', type: 'number' },
        { key: 'slotMinutes', label: 'Durée entre les créneaux (minutes)', type: 'number' },
        { key: 'maxCoversPerSlot', label: 'Capacité maximale par créneau', type: 'number' },
        { key: 'advanceDays', label: 'Réservation possible sur X jours', type: 'number' },
        { key: 'confirmationMode', label: 'Mode de confirmation', type: 'select', options: ['manual', 'automatic'] },
      ],
    },
    Paramètres: {
      endpoint: '/admin/settings',
      singular: 'paramètre',
      description: 'Gérez les coordonnées, l’identité, la réservation et les statistiques publiques.',
      add: false,
      columns: [
        { key: 'key', label: 'Groupe' },
        { key: 'value', label: 'Configuration' },
        { key: 'updatedAt', label: 'Modification' },
      ],
      fields: [
        { key: 'value', label: 'Valeur JSON', type: 'json' },
      ],
    },
    Utilisateurs: {
      endpoint: '/admin/users',
      singular: 'utilisateur',
      description: 'Gérez l’identité, les rôles, les blocages et les sessions de toute l’équipe.',
      columns: [
        { key: 'name', label: 'Utilisateur' },
        { key: 'email', label: 'E-mail' },
        { key: 'role', label: 'Rôle' },
        { key: 'accountStatus', label: 'État du compte' },
        { key: 'lastLoginAt', label: 'Dernière connexion' },
      ],
      fields: [
        { key: 'name', label: 'Nom affiché' },
        { key: 'email', label: 'E-mail', type: 'email' },
        { key: 'role', label: 'Rôle', type: 'select', options: ['EDITOR', 'ADMIN', 'SUPER_ADMIN'] },
      ],
    },
    'Rôles & accès': {
      endpoint: '/admin/role-policies',
      singular: 'rôle',
      description: 'Réglez précisément les actions autorisées pour chaque rôle prédéfini.',
      add: false,
      columns: [],
      fields: [],
    },
  };
  protected readonly permissions = [
    { key: 'VIEW_CONTENT', label: 'Voir les contenus' },
    { key: 'MANAGE_CONTENT', label: 'Modifier les contenus' },
    { key: 'MANAGE_PLANNING', label: 'Gérer le planning' },
    { key: 'MANAGE_MESSAGES', label: 'Traiter les messages' },
    { key: 'MANAGE_HOURS', label: 'Modifier les horaires' },
    { key: 'MANAGE_USERS', label: 'Gérer les utilisateurs' },
    { key: 'MANAGE_ROLES', label: 'Régler les rôles' },
  ];
  protected readonly config = computed(() => this.configs[this.active()]);
  protected readonly totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (this.active() === 'Planning' ? this.filteredRows().length : this.total()) / this.limit(),
      ),
    ),
  );
  protected readonly filteredRows = computed(() =>
    this.rows().filter(
      (row) =>
        (this.kindFilter() === 'Tous' || row['kind'] === this.kindFilter()) &&
        (this.statusFilter() === 'Tous' || row['status'] === this.statusFilter()),
    ),
  );
  protected readonly displayRows = computed(() => {
    const filters = this.columnFilters();
    const rows = (
      this.active() === 'Planning' ? [...this.filteredRows()] : [...this.rows()]
    ).filter((row) =>
      Object.entries(filters).every(
        ([key, query]) =>
          !query || this.value(row, key).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
    );
    const key = this.sortKey(),
      direction = this.sortDirection() === 'asc' ? 1 : -1;
    rows.sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * direction);
    return this.active() === 'Planning'
      ? rows.slice((this.page() - 1) * this.limit(), this.page() * this.limit())
      : rows;
  });
  protected readonly calendarTitle = computed(() =>
    new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
      this.calendarCursor(),
    ),
  );
  protected readonly dayTitle = computed(() =>
    new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(this.calendarCursor()),
  );
  protected readonly daySlots = computed(() =>
    Array.from({ length: 16 }, (_, index) => {
      const hour = index + 8;
      const key = this.dateKey(this.calendarCursor());
      return {
        hour,
        label: `${String(hour).padStart(2, '0')}:00`,
        items: this.filteredRows().filter(
          (row) =>
            this.dateKey(new Date(String(row['rawDate'] ?? ''))) === key &&
            Number(String(row['time'] ?? '12:00').split(':')[0]) === hour,
        ),
      };
    }),
  );
  protected readonly calendarDays = computed(() => {
    const cursor = this.calendarCursor(),
      year = cursor.getFullYear(),
      month = cursor.getMonth();
    const first = new Date(year, month, 1),
      offset = (first.getDay() + 6) % 7,
      days = new Date(year, month + 1, 0).getDate();
    if (this.planningView() === 'week') {
      const base = new Date(cursor),
        weekStart = new Date(base);
      weekStart.setDate(base.getDate() - ((base.getDay() + 6) % 7));
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        const key = this.dateKey(date);
        return {
          day: date.getDate(),
          key,
          items: this.filteredRows().filter(
            (row) => this.dateKey(new Date(String(row['rawDate'] ?? ''))) === key,
          ),
        };
      });
    }
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - offset + 1;
      if (day < 1 || day > days) return null;
      const date = new Date(year, month, day);
      const key = this.dateKey(date);
      return {
        day,
        key,
        items: this.filteredRows().filter(
          (row) => this.dateKey(new Date(String(row['rawDate'] ?? ''))) === key,
        ),
      };
    });
  });
  protected readonly planningStats = computed(() => {
    const today = this.dateKey(new Date()),
      todayRows = this.rows().filter(
        (row) => this.dateKey(new Date(String(row['rawDate'] ?? ''))) === today,
      );
    return {
      today: todayRows.length,
      covers: todayRows.reduce((sum, row) => sum + Number(row['guests'] ?? 0), 0),
      pending: this.rows().filter(
        (row) => row['status'] === 'PENDING' || row['status'] === 'DEMANDE',
      ).length,
      events: this.rows().filter((row) => row['kind'] === 'Événement').length,
    };
  });
  protected readonly daySummary = computed(() => {
    const key = this.dateKey(this.calendarCursor()),
      items = this.filteredRows().filter(
        (row) => this.dateKey(new Date(String(row['rawDate'] ?? ''))) === key,
      );
    return {
      entries: items.length,
      covers: items.reduce((sum, row) => sum + Number(row['guests'] ?? 0), 0),
    };
  });

  ngOnInit() {
    const requested = this.route.snapshot.queryParamMap.get('module');
    requested && this.configs[requested] ? this.select(requested) : this.loadDashboard();
  }
  protected select(label: string) {
    this.active.set(label);
    this.page.set(1);
    this.columnFilters.set({});
    this.search.setValue('');
    this.error.set('');
    if (label === 'Plats') this.loadCategoryOptions();
    if (label === 'Configuration') { this.rows.set([]); this.total.set(0); this.loadConfigurationOverview(); return; }
    label === 'Tableau de bord' ? this.loadDashboard() : this.load();
  }
  protected loadConfigurationOverview(): void {
    this.loading.set(true);
    forkJoin({
      settings: this.api.get<Row[]>('/admin/settings'),
      hours: this.api.get<Row[]>('/admin/opening-hours'),
      exceptions: this.api.get<PageResult | Row[]>('/admin/special-opening-hours', { page: 1, limit: 100 }),
      socials: this.api.get<Row[]>('/admin/social-links'),
    }).subscribe({
      next: ({ settings, hours, exceptions, socials }) => {
        const setting = (key: string) => settings.find(item => item['key'] === key)?.['value'] as Row | undefined;
        const contact = setting('contact'), identity = setting('identity');
        const reservation = setting('reservation'), stats = setting('restaurantStats');
        const exceptionalRows = Array.isArray(exceptions) ? exceptions : exceptions.data;
        const openDays = hours.filter(item => !item['closed']).length;
        const activeSocials = socials.filter(item => item['active'] && item['url']).length;
        this.configurationOverview.set({
          'Identité publique': { ready: Boolean(identity?.['name'] && identity?.['logo']), detail: identity?.['name'] ? String(identity['name']) : 'Nom ou logo à compléter' },
          'Coordonnées': { ready: Boolean(contact?.['address'] && contact?.['phone'] && contact?.['email'] && contact?.['latitude'] && contact?.['longitude']), detail: contact?.['address'] ? String(contact['address']) : 'Coordonnées à compléter' },
          'Horaires': { ready: openDays > 0, detail: `${openDays} jour${openDays > 1 ? 's' : ''} ouvert${openDays > 1 ? 's' : ''}` },
          'Dates exceptionnelles': { ready: true, detail: `${exceptionalRows.length} date${exceptionalRows.length > 1 ? 's' : ''} programmée${exceptionalRows.length > 1 ? 's' : ''}` },
          'Réglages réservation': { ready: Boolean(reservation?.['slotMinutes'] && reservation?.['maxCoversPerSlot']), detail: reservation?.['enabled'] === false ? 'Réservations désactivées' : `Créneaux de ${reservation?.['slotMinutes'] ?? '—'} min` },
          'Chiffres du restaurant': { ready: Boolean(stats?.['seats']), detail: stats?.['seats'] ? `${stats['seats']} places annoncées` : 'Chiffres à compléter' },
          'Réseaux sociaux': { ready: activeSocials > 0, detail: `${activeSocials} réseau${activeSocials > 1 ? 'x' : ''} visible${activeSocials > 1 ? 's' : ''}` },
          'Paramètres': { ready: true, detail: `${settings.length} groupes de réglages` },
        });
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.error.set('Impossible de vérifier la configuration du site.'); },
    });
  }
  protected configurationState(label: string) {
    return this.configurationOverview()[label] ?? { ready: false, detail: 'Vérification…' };
  }
  protected isConfigurationModule(label = this.active()): boolean {
    return label === 'Configuration' || this.configurationModules.some(module => module.label === label);
  }
  protected load() {
    const config = this.config();
    if (!config) return;
    this.loading.set(true);
    if (this.active() === 'Planning') {
      forkJoin({
        reservations: this.api.get<PageResult>('/admin/reservations', {
          page: 1,
          limit: 100,
          search: this.search.value,
        }),
        inquiries: this.api.get<PageResult>('/admin/event-inquiries', {
          page: 1,
          limit: 100,
          search: this.search.value,
        }),
      }).subscribe({
        next: ({ reservations, inquiries }) => {
          const reservationRows = reservations.data.map((row) => ({
            ...row,
            kind: 'Réservation',
            rawDate: row['date'],
            displayDate: `${new Date(String(row['date'])).toLocaleDateString('fr-FR')} · ${row['time'] ?? ''}`,
          }));
          const inquiryRows = inquiries.data.map((row) => ({
            ...row,
            kind: 'Événement',
            rawDate: row['eventDate'],
            displayDate: row['eventDate']
              ? new Date(String(row['eventDate'])).toLocaleDateString('fr-FR')
              : 'À définir',
            status: String(row['status'] ?? 'NEW'),
          }));
          const merged = [...reservationRows, ...inquiryRows].sort((a, b) =>
            String(a['rawDate'] ?? '').localeCompare(String(b['rawDate'] ?? '')),
          );
          this.rows.set(merged);
          this.total.set(merged.length);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger le planning.');
          this.loading.set(false);
        },
      });
      return;
    }
    if (['Coordonnées', 'Identité publique', 'Chiffres du restaurant', 'Réglages réservation'].includes(this.active())) {
      this.api.get<Row[]>('/admin/settings').subscribe({
        next: (items) => {
          const settingKey = ({ Coordonnées: 'contact', 'Identité publique': 'identity', 'Chiffres du restaurant': 'restaurantStats', 'Réglages réservation': 'reservation' } as Record<string, string>)[this.active()];
          const setting = items.find((item) => item['key'] === settingKey);
          const value = setting?.['value'];
          this.rows.set(value && typeof value === 'object' ? [{ ...(value as Row), id: setting?.['id'] }] : []);
          this.total.set(this.rows().length);
          this.loading.set(false);
        },
        error: () => { this.error.set('Impossible de charger les coordonnées.'); this.loading.set(false); },
      });
      return;
    }
    this.api
      .get<PageResult | Row[]>(config.endpoint, {
        page: this.page(),
        limit: this.limit(),
        search: this.search.value,
      })
      .subscribe({
        next: (result) => {
          if (Array.isArray(result)) {
            this.rows.set(result);
            this.total.set(result.length);
          } else {
            this.rows.set(result.data);
            this.total.set(result.meta.total);
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger ces données.');
          this.loading.set(false);
        },
      });
  }
  private loadDashboard() {
    this.loading.set(true);
    this.api.get<Row>('/admin/dashboard').subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Le tableau de bord est indisponible.');
        this.loading.set(false);
      },
    });
    this.api
      .get<PageResult>('/admin/reservations', { page: 1, limit: 6 })
      .subscribe({ next: (r) => this.rows.set(r.data) });
  }
  protected value(row: Row, key: string) {
    if (key === 'role') return this.roleLabel(String(row[key] ?? ''));
    if (key === 'accountStatus') {
      if (row['manuallyBlocked']) return 'Bloqué';
      if (row['lockedUntil'] && new Date(String(row['lockedUntil'])) > new Date())
        return 'Verrouillé';
      if (row['active'] === false) return 'Désactivé';
      return 'Actif';
    }
    const result = key
      .split('.')
      .reduce<unknown>(
        (current, part) =>
          current && typeof current === 'object' ? (current as Row)[part] : undefined,
        row,
      );
    if (typeof result === 'boolean') return result ? 'Oui' : 'Non';
    if (typeof result === 'object' && result !== null) return JSON.stringify(result);
    return result == null ? '—' : String(result);
  }
  protected exportData(resource: 'reservations' | 'messages' | 'events'): void {
    this.api.download(`/admin/exports/${resource}`).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${resource}-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error.set('L’export n’a pas pu être généré.'),
    });
  }
  protected roleLabel(role: string) {
    return role === 'SUPER_ADMIN'
      ? 'Administrateur'
      : role === 'ADMIN'
        ? 'Gestionnaire de contenu'
        : role === 'EDITOR'
          ? 'Gestionnaire des réservations'
          : role;
  }
  protected optionLabel(option: string) {
    return this.roleLabel(option);
  }
  protected hasPermission(role: Row, key: string) {
    return Array.isArray(role['permissions']) && role['permissions'].includes(key);
  }
  protected togglePermission(role: Row, key: string, enabled: boolean) {
    const permissions = Array.isArray(role['permissions']) ? role['permissions'].map(String) : [];
    role['permissions'] = enabled
      ? [...new Set([...permissions, key])]
      : permissions.filter((item) => item !== key);
    this.rows.update((items) => [...items]);
    this.api
      .put(`/admin/role-policies/${role['role']}`, {
        label: role['label'],
        description: role['description'] || '',
        permissions: role['permissions'],
      })
      .subscribe({
        next: () => this.notify('Matrice des permissions enregistrée'),
        error: (e) => {
          this.error.set(e.error?.message || 'Permission non enregistrée.');
          this.load();
        },
      });
  }
  protected badge(value: unknown) {
    return ['PUBLISHED', 'CONFIRMED', 'COMPLETED', 'Oui'].includes(String(value))
      ? 'good'
      : ['PENDING', 'DRAFT'].includes(String(value))
        ? 'waiting'
        : ['CANCELLED', 'NO_SHOW'].includes(String(value))
          ? 'danger'
          : '';
  }
  protected open(row?: Row) {
    const config = this.config();
    if (!config) return;
    this.editing.set(row ?? null);
    this.editorDirty.set(false);
    for (const field of config.fields) {
      const raw = field.type === 'allergens' ? row?.['allergens'] : row?.[field.key];
      const value =
        field.type === 'json'
          ? raw
            ? JSON.stringify(raw, null, 2)
            : '{}'
          : field.type === 'date' && raw
            ? new Date(String(raw)).toISOString().slice(0, 10)
          : field.type === 'tags'
            ? Array.isArray(raw)
              ? raw.join(', ')
              : ''
            : field.type === 'allergens' && Array.isArray(raw)
              ? raw
                  .map((item) => String((item as Row)['allergenId'] ?? ''))
                  .filter(Boolean)
                  .join(',')
              : field.type === 'checkbox'
                ? Boolean(raw)
                : field.type === 'number'
                  ? Number(raw ?? 0)
                  : String(raw ?? '');
      this.form.addControl(field.key, new FormControl(value, { nonNullable: true }));
    }
    if (this.active() === 'Pages') {
      const blocks = Array.isArray(row?.['blocks'])
        ? (row?.['blocks'] as Row[]).map((block, index) => ({ type: String(block['type'] ?? 'content'), content: (block['content'] && typeof block['content'] === 'object' ? block['content'] : {}) as Record<string, unknown>, order: Number(block['order'] ?? index) }))
        : [];
      const seo = row?.['seo'] && typeof row['seo'] === 'object' ? row['seo'] as Row : {};
      this.cmsBlocks.set(blocks);
      this.cmsSeo.set({ title: String(seo['title'] ?? ''), description: String(seo['description'] ?? '') });
      this.syncCmsJson();
    }
    if (this.active() === 'Catégories')
      this.categoryImagePreview.set(String(row?.['imageUrl'] ?? ''));
    if (this.active() === 'Plats') this.dishImagePreview.set(String(row?.['imageUrl'] ?? ''));
    if (this.active() === 'Galerie') this.galleryImagePreview.set(String(row?.['imageUrl'] ?? ''));
    if (this.active() === 'Témoignages')
      this.testimonialImagePreview.set(String(row?.['avatarUrl'] ?? ''));
    if (this.active() === 'Planning' && row) {
      const common = {
        name: String(row['name'] ?? ''),
        email: String(row['email'] ?? ''),
        phone: String(row['phone'] ?? ''),
        guests: Number(row['guests'] ?? 1),
        message: String(row['message'] ?? ''),
      };
      const specific =
        row['kind'] === 'Événement'
          ? {
              eventType: String(row['eventType'] ?? ''),
              status: String(row['status'] ?? 'NEW'),
              internalNotes: String(row['internalNotes'] ?? ''),
              eventDate: row['eventDate']
                ? new Date(String(row['eventDate'])).toISOString().slice(0, 10)
                : '',
            }
          : {
              date: row['date'] ? new Date(String(row['date'])).toISOString().slice(0, 10) : '',
              time: String(row['time'] ?? ''),
            };
      for (const [key, value] of Object.entries({ ...common, ...specific }))
        this.form.addControl(key, new FormControl(value, { nonNullable: true }));
      this.selectedRow.set(row);
      if (row['kind'] !== 'Événement')
        this.loadReservationSlots(
          row['date'] ? new Date(String(row['date'])).toISOString().slice(0, 10) : '',
          true,
        );
      return;
    }
    this.editorOpen.set(true);
  }
  protected openPlanning(date = this.calendarCursor(), hour?: number) {
    this.planningCreate.set(true);
    this.editing.set(null);
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const defaults: Record<string, string | number | boolean> = {
      kind: 'Réservation',
      name: '',
      email: '',
      phone: '',
      date: localDate,
      time: hour === undefined ? '19:30' : `${String(hour).padStart(2, '0')}:00`,
      guests: 2,
      eventType: 'Privatisation',
      message: '',
      consent: true,
    };
    for (const [key, value] of Object.entries(defaults))
      this.form.addControl(key, new FormControl(value, { nonNullable: true }));
    this.loadReservationSlots(localDate, true);
    this.editorOpen.set(true);
  }
  protected close(force = false) {
    if (!force && this.editorOpen() && (this.form.dirty || this.editorDirty())) {
      this.askConfirm(
        'Abandonner les modifications ?',
        'Les changements non enregistrés seront perdus.',
        () => this.close(true),
        true,
      );
      return;
    }
    this.editorOpen.set(false);
    this.planningCreate.set(false);
    this.selectedRow.set(null);
    this.categoryImagePreview.set('');
    this.dishImagePreview.set('');
    this.galleryImagePreview.set('');
    this.testimonialImagePreview.set('');
    this.cmsBlocks.set([]);
    this.editorDirty.set(false);
    for (const key of Object.keys(this.form.controls)) this.form.removeControl(key);
  }
  protected cmsKeys(content: Record<string, unknown>): string[] {
    return Object.keys(content).filter(key => !/^image(?:Url|Alt)\d*$/.test(key));
  }
  protected cmsImageKeys(content: Record<string, unknown>): string[] {
    return Object.keys(content).filter(key => /^imageUrl\d*$/.test(key));
  }
  protected cmsImageAltKey(imageKey: string): string {
    return imageKey.replace('imageUrl', 'imageAlt');
  }
  protected cmsValue(blockIndex: number, key: string): string {
    return String(this.cmsBlocks()[blockIndex]?.content[key] ?? '');
  }
  protected updateCmsValue(blockIndex: number, key: string, value: string): void {
    this.cmsBlocks.update(blocks => blocks.map((block, index) => index === blockIndex ? { ...block, content: { ...block.content, [key]: value } } : block));
    this.syncCmsJson();
    this.editorDirty.set(true);
  }
  protected updateCmsSeo(key: 'title' | 'description', value: string): void {
    this.cmsSeo.update(seo => ({ ...seo, [key]: value }));
    this.syncCmsJson();
    this.editorDirty.set(true);
  }
  protected uploadCmsImage(blockIndex: number, event: Event, imageKey = 'imageUrl'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingImage.set(true);
    this.api.upload<{url:string}>('/admin/media/upload', file).subscribe({ next: result => { this.updateCmsValue(blockIndex, imageKey, result.url); this.uploadingImage.set(false); }, error: () => { this.uploadingImage.set(false); this.error.set('L’image n’a pas pu être importée.'); } });
  }
  protected publicPagePath(): string {
    const slug = String(this.editing()?.['slug'] ?? '');
    return ({ home: '/', restaurant: '/restaurant', legal: '/legal', privacy: '/privacy' } as Record<string,string>)[slug] || `/${slug}`;
  }
  protected publicPagePreviewUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.publicPagePath());
  }
  private syncCmsJson(): void {
    this.form.controls['blocks']?.setValue(JSON.stringify(this.cmsBlocks(), null, 2));
    this.form.controls['seo']?.setValue(JSON.stringify(this.cmsSeo(), null, 2));
  }
  protected save() {
    const config = this.config();
    if (!config) return;
    const body: Row = {};
    for (const field of config.fields) {
      const raw = this.form.controls[field.key]?.value;
      if (field.type === 'json') {
        try {
          body[field.key] = JSON.parse(String(raw));
        } catch {
          this.error.set(`Le champ « ${field.label} » contient un JSON invalide.`);
          return;
        }
      } else if (field.type === 'tags' || field.type === 'allergens')
        body[field.key] = String(raw ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
      else body[field.key] = raw;
    }
    const row = this.editing();
    let request;
    if (this.planningCreate()) {
      const values = this.form.getRawValue();
      if (values['kind'] === 'Événement') {
        request = this.api.post('/admin/event-inquiries', {
          name: values['name'],
          email: values['email'],
          phone: values['phone'] || undefined,
          eventType: values['eventType'],
          eventDate: values['date'] || undefined,
          guests: Number(values['guests']),
          message: values['message'] || 'Demande créée depuis le back-office',
        });
      } else {
        request = this.api.post('/admin/reservations', {
          name: values['name'],
          email: values['email'],
          phone: values['phone'],
          date: values['date'],
          time: values['time'],
          guests: Number(values['guests']),
          message: values['message'] || undefined,
          consent: true,
        });
      }
      request.subscribe({
        next: () => {
          this.form.markAsPristine();
          this.close(true);
          this.load();
        },
        error: (response) =>
          this.error.set(
            response.error?.message ||
              'Création impossible. Vérifiez les informations obligatoires.',
          ),
      });
      return;
    }
    if (this.active() === 'Planning' && row?.['kind'] === 'Événement') {
      const values = this.form.getRawValue();
      request = this.api.put(`/admin/event-inquiries/${row['id']}`, {
        name: values['name'],
        email: values['email'],
        phone: values['phone'] || undefined,
        eventType: values['eventType'],
        eventDate: values['eventDate'] || undefined,
        guests: Number(values['guests']),
        message: values['message'],
        status: values['status'],
        internalNotes: values['internalNotes'] || undefined,
      });
    } else if (this.active() === 'Planning') {
      const values = this.form.getRawValue();
      request = this.api.patch(`${config.endpoint}/${row?.['id']}`, {
        status: values['status'],
        internalNotes: values['internalNotes'],
        name: values['name'],
        email: values['email'],
        phone: values['phone'],
        date: values['date'],
        time: values['time'],
        guests: Number(values['guests']),
        message: values['message'] || undefined,
      });
    } else if (this.active() === 'Horaires')
      request = this.api.put(`${config.endpoint}/${row?.['day']}`, body);
    else if (this.active() === 'Coordonnées') {
      request = this.api.put('/admin/settings/contact', { value: body });
    } else if (this.active() === 'Identité publique') {
      request = this.api.put('/admin/settings/identity', { value: body });
    } else if (this.active() === 'Chiffres du restaurant') {
      request = this.api.put('/admin/settings/restaurantStats', { value: body });
    } else if (this.active() === 'Réglages réservation') {
      request = this.api.put('/admin/settings/reservation', { value: body });
    } else if (this.active() === 'Paramètres') {
      const key = String(row?.['key']);
      request = this.api.put(`${config.endpoint}/${encodeURIComponent(key)}`, { value: body['value'] });
    } else if (this.active() === 'Réseaux sociaux') {
      const platform = String(row?.['platform']);
      request = this.api.put(`${config.endpoint}/${encodeURIComponent(platform)}`, {
        url: body['url'],
        active: body['active'],
      });
    } else
      request = row
        ? this.api.put(`${config.endpoint}/${row['id']}`, body)
        : this.api.post(config.endpoint, body);
    request.subscribe({
      next: (result: unknown) => {
        this.form.markAsPristine();
        this.editorDirty.set(false);
        this.close(true);
        const invitationFailed =
          this.active() === 'Utilisateurs' &&
          !row &&
          typeof result === 'object' &&
          result !== null &&
          'invitationEmailSent' in result &&
          result.invitationEmailSent === false;
        this.notify(
          this.active() === 'Utilisateurs' && !row
            ? invitationFailed
              ? 'Utilisateur créé · invitation à renvoyer (SMTP indisponible)'
              : 'Utilisateur créé · invitation envoyée'
            : 'Modifications enregistrées',
        );
        this.load();
      },
      error: (response) =>
        this.error.set(
          response.error?.message || 'Enregistrement impossible. Vérifiez les champs saisis.',
        ),
    });
  }
  protected quickToggle(row: Row): void {
    const config = this.config();
    const toggleKey = ({ Pages: 'status', Catégories: 'active', Plats: 'available', Galerie: 'published', Témoignages: 'published', 'Offres événement': 'published', 'Réseaux sociaux': 'active' } as Record<string, string>)[this.active()];
    if (!config || !toggleKey) return;
    const body: Row = {};
    for (const field of config.fields) {
      const raw = row[field.key];
      body[field.key] = field.type === 'allergens' && Array.isArray(raw)
        ? raw.map(item => String((item as Row)['allergenId'] ?? '')).filter(Boolean)
        : raw;
    }
    body[toggleKey] = toggleKey === 'status'
      ? (row[toggleKey] === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')
      : !row[toggleKey];
    const request = this.active() === 'Réseaux sociaux'
      ? this.api.put(`${config.endpoint}/${encodeURIComponent(String(row['platform']))}`, { url: body['url'], active: body['active'] })
      : this.api.put(`${config.endpoint}/${row['id']}`, body);
    request.subscribe({
      next: () => {
        this.notify(body[toggleKey] === false || body[toggleKey] === 'DRAFT' ? 'Contenu masqué' : 'Contenu publié');
        this.load();
      },
      error: response => this.error.set(response.error?.message || 'La visibilité n’a pas pu être modifiée.'),
    });
  }
  protected isPubliclyVisible(row: Row): boolean {
    const key = this.active() === 'Pages'
      ? 'status'
      : this.active() === 'Plats'
        ? 'available'
        : ['Catégories', 'Réseaux sociaux'].includes(this.active())
          ? 'active'
          : 'published';
    return row[key] === true || row[key] === 'PUBLISHED';
  }
  protected remove(row: Row) {
    const config = this.config();
    if (!config) return;
    this.askConfirm(
      'Confirmer la suppression',
      `Supprimer définitivement ce ${config.singular} ?`,
      () =>
        this.api.delete(`${config.endpoint}/${row['id']}`).subscribe({
          next: () => this.load(),
          error: () => this.error.set('Suppression impossible.'),
        }),
      true,
    );
  }
  protected markRead(row: Row) {
    this.api.patch(`/admin/messages/${row['id']}/read`, {}).subscribe({ next: () => this.load() });
  }
  protected openMessage(row: Row) {
    this.messageReplyOpen.set(false);
    this.messagePreview.set(row);
    if (!row['read'])
      this.api.patch(`/admin/messages/${row['id']}/read`, {}).subscribe({
        next: () => {
          row['read'] = true;
          this.rows.update((items) => [...items]);
        },
      });
  }
  protected toggleMessageRead(row: Row) {
    const endpoint = row['read'] ? 'unread' : 'read';
    this.api.patch(`/admin/messages/${row['id']}/${endpoint}`, {}).subscribe({
      next: () => {
        row['read'] = !row['read'];
        this.rows.update((items) => [...items]);
        this.notify(row['read'] ? 'Message marqué comme lu' : 'Message marqué comme non lu');
      },
      error: () => this.error.set('Le statut du message n’a pas pu être modifié.'),
    });
  }
  protected replyMessage(row: Row) {
    this.messagePreview.set(row);
    this.messageReplySubject.setValue('Votre message à The Choice');
    this.messageReplyHtml.set(
      `<p>Bonjour ${String(row['name'] ?? '')},</p><p><br></p><p>Cordialement,<br><strong>L’équipe The Choice</strong></p>`,
    );
    this.messageReplyOpen.set(true);
  }
  protected updateReply(event: Event) {
    this.messageReplyHtml.set((event.target as HTMLElement).innerHTML);
  }
  protected formatReply(command: string) {
    document.execCommand(command, false);
  }
  protected sendMessageReply() {
    const message = this.messagePreview(),
      html = this.messageReplyHtml().trim(),
      subject = this.messageReplySubject.value.trim();
    if (!message || !subject || !html) return;
    this.messageReplySending.set(true);
    this.api.post(`/admin/messages/${message['id']}/reply`, { subject, html }).subscribe({
      next: () => {
        message['read'] = true;
        this.messageReplySending.set(false);
        this.messageReplyOpen.set(false);
        this.notify('Réponse envoyée à ' + String(message['email']));
        this.rows.update((items) => [...items]);
      },
      error: () => {
        this.messageReplySending.set(false);
        this.error.set('La réponse n’a pas pu être envoyée. Vérifiez la configuration SMTP.');
      },
    });
  }
  protected deleteMessage(row: Row) {
    this.askConfirm(
      'Supprimer le message',
      'Cette suppression est définitive.',
      () =>
        this.api.delete(`/admin/messages/${row['id']}`).subscribe({
          next: () => {
            this.messagePreview.set(null);
            this.notify('Message supprimé');
            this.load();
          },
          error: () => this.error.set('Le message n’a pas pu être supprimé.'),
        }),
      true,
    );
  }
  protected toggleHour(row: Row) {
    const closed = !Boolean(row['closed']);
    this.api
      .put(`/admin/opening-hours/${row['day']}`, {
        day: row['day'],
        label: row['label'],
        opensAt: closed ? undefined : row['opensAt'] || '12:00',
        closesAt: closed ? undefined : row['closesAt'] || '23:30',
        closed,
      })
      .subscribe({
        next: () => {
          this.notify(closed ? `${row['label']} marqué fermé` : `${row['label']} marqué ouvert`);
          this.load();
        },
        error: () => this.error.set('La disponibilité du jour n’a pas pu être modifiée.'),
      });
  }
  protected copyHourToWeek(source: Row) {
    this.askConfirm(
      'Appliquer à toute la semaine',
      `Utiliser ${source['closed'] ? 'la fermeture' : `${source['opensAt']} – ${source['closesAt']}`} pour les sept jours ?`,
      () => {
        const requests = this.rows().map((row) =>
          this.api.put(`/admin/opening-hours/${row['day']}`, {
            day: row['day'],
            label: row['label'],
            opensAt: source['closed'] ? undefined : source['opensAt'],
            closesAt: source['closed'] ? undefined : source['closesAt'],
            closed: source['closed'],
          }),
        );
        forkJoin(requests).subscribe({
          next: () => {
            this.notify('Horaires appliqués à toute la semaine');
            this.load();
          },
          error: () => this.error.set('Les horaires n’ont pas tous pu être mis à jour.'),
        });
      },
    );
  }
  protected toggleUserBlock(row: Row) {
    const blocked = Boolean(row['manuallyBlocked']);
    const run = () =>
      this.api.patch(`/admin/users/${row['id']}/${blocked ? 'unblock' : 'block'}`, {}).subscribe({
        next: () => {
          this.notify(blocked ? 'Compte débloqué' : 'Compte bloqué');
          this.load();
        },
        error: (e) => this.error.set(e.error?.message || 'Action impossible.'),
      });
    blocked
      ? run()
      : this.askConfirm(
          'Bloquer ce compte',
          `Les sessions de ${row['email']} seront immédiatement révoquées.`,
          run,
          true,
        );
  }
  protected revokeUserSessions(row: Row) {
    this.askConfirm(
      'Déconnecter tous les appareils',
      `${row['email']} devra se reconnecter sur chaque appareil.`,
      () =>
        this.api.patch(`/admin/users/${row['id']}/revoke-sessions`, {}).subscribe({
          next: () => this.notify('Toutes les sessions ont été révoquées'),
          error: (e) => this.error.set(e.error?.message || 'Révocation impossible.'),
        }),
      true,
    );
  }
  protected deleteUser(row: Row) {
    this.askConfirm(
      'Supprimer cet utilisateur',
      `Le compte ${row['email']} et toutes ses sessions seront supprimés.`,
      () =>
        this.api.delete(`/admin/users/${row['id']}`).subscribe({
          next: () => {
            this.notify('Utilisateur supprimé');
            this.load();
          },
          error: (e) => this.error.set(e.error?.message || 'Suppression impossible.'),
        }),
      true,
    );
  }
  protected openUserPassword(row: Row) {
    this.userPasswordTarget.set(row);
    this.userPassword.setValue('');
    this.userPasswordConfirmation.setValue('');
    this.showUserPasswords.set(false);
  }
  protected closeUserPassword() {
    this.userPasswordTarget.set(null);
    this.userPassword.setValue('');
    this.userPasswordConfirmation.setValue('');
  }
  protected saveUserPassword() {
    const target = this.userPasswordTarget(),
      password = this.userPassword.value,
      confirmation = this.userPasswordConfirmation.value;
    if (!target) return;
    if (password.length < 15) {
      this.error.set('Le mot de passe doit contenir au moins 15 caractères.');
      return;
    }
    if (password !== confirmation) {
      this.error.set('La confirmation du mot de passe ne correspond pas.');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(password)) {
      this.error.set('Ajoutez une majuscule, une minuscule, un chiffre et un symbole.');
      return;
    }
    this.userPasswordSaving.set(true);
    this.api.patch(`/admin/users/${target['id']}/password`, { password, confirmation }).subscribe({
      next: () => {
        this.userPasswordSaving.set(false);
        this.closeUserPassword();
        this.notify('Mot de passe modifié et sessions révoquées');
        this.load();
      },
      error: (e) => {
        this.userPasswordSaving.set(false);
        this.error.set(e.error?.message || 'Le mot de passe n’a pas pu être modifié.');
      },
    });
  }
  protected logout() {
    this.api.logout();
  }
  protected goProfile() {
    void this.router.navigateByUrl('/admin/profile');
  }
  protected number(key: string) {
    return Number(this.dashboard()[key] ?? 0);
  }
  protected activity() {
    return (this.dashboard()['recentActivity'] as Row[] | undefined) ?? [];
  }
  protected dailyActivity() {
    return (this.dashboard()['dailyActivity'] as Row[] | undefined) ?? [];
  }
  protected reservationStatus() {
    return (this.dashboard()['reservationStatus'] as Row[] | undefined) ?? [];
  }
  protected popularTimes() {
    return (this.dashboard()['popularTimes'] as Row[] | undefined) ?? [];
  }
  protected chartMax() {
    return Math.max(
      1,
      ...this.dailyActivity().map(
        (item) => Number(item['reservations'] ?? 0) + Number(item['messages'] ?? 0),
      ),
    );
  }
  protected chartHeight(item: Row) {
    return Math.max(
      4,
      Math.round(
        ((Number(item['reservations'] ?? 0) + Number(item['messages'] ?? 0)) / this.chartMax()) *
          100,
      ),
    );
  }
  protected statusTotal() {
    return Math.max(
      1,
      this.reservationStatus().reduce((sum, item) => sum + Number(item['count'] ?? 0), 0),
    );
  }
  protected statusWidth(item: Row) {
    return Math.round((Number(item['count'] ?? 0) / this.statusTotal()) * 100);
  }
  protected mailReady() {
    const mail = this.dashboard()['mail'];
    return typeof mail === 'object' && mail !== null && Boolean((mail as Row)['reachable']);
  }
  protected changePage(next: number) {
    if (next < 1 || next > this.totalPages() || next === this.page()) return;
    this.page.set(next);
    if (this.active() !== 'Planning') this.load();
  }
  protected moveMonth(delta: number) {
    const date = new Date(this.calendarCursor());
    date.setMonth(date.getMonth() + delta);
    this.calendarCursor.set(date);
  }
  protected movePeriod(delta: number) {
    if (this.planningView() === 'day') {
      const date = new Date(this.calendarCursor());
      date.setDate(date.getDate() + delta);
      this.calendarCursor.set(date);
    } else if (this.planningView() === 'week') {
      const date = new Date(this.calendarCursor());
      date.setDate(date.getDate() + delta * 7);
      this.calendarCursor.set(date);
    } else this.moveMonth(delta);
  }
  protected today() {
    this.calendarCursor.set(new Date());
    this.planningView.set('day');
  }
  protected setKindFilter(value: string) {
    this.kindFilter.set(value);
    this.page.set(1);
  }
  protected setStatusFilter(value: string) {
    this.statusFilter.set(value);
    this.page.set(1);
  }
  protected setLimit(value: string) {
    this.limit.set(Number(value));
    this.page.set(1);
    if (this.active() !== 'Planning') this.load();
  }
  protected sort(key: string) {
    if (this.sortKey() === key)
      this.sortDirection.update((value) => (value === 'asc' ? 'desc' : 'asc'));
    else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
  }
  protected filterColumn(key: string, value: string) {
    this.columnFilters.update((filters) => ({ ...filters, [key]: value }));
    this.page.set(1);
  }
  protected slugPreview() {
    const value = String(this.form.controls['name']?.value ?? '');
    return (
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'slug-genere-automatiquement'
    );
  }
  protected formValue(key: string) {
    return String(this.form.controls[key]?.value ?? '');
  }
  protected reservationDateChanged(event: Event) {
    this.loadReservationSlots((event.target as HTMLInputElement).value, false);
  }
  protected loadReservationSlots(date: string, preserve: boolean) {
    if (!date) return;
    this.api.get<Row>('/reservations/slots', { date }).subscribe({
      next: (result) => {
        const slots = Array.isArray(result['slots'])
          ? result['slots'].map((slot) => typeof slot === 'object' && slot !== null ? String((slot as Row)['value']) : String(slot))
          : [];
        this.reservationSchedule.set(result);
        this.reservationSlots.set(slots);
        const time = this.form.controls['time'];
        if (time && (!preserve || !slots.includes(String(time.value))))
          time.setValue(slots[0] ?? '');
      },
      error: () => {
        this.reservationSchedule.set(null);
        this.reservationSlots.set([]);
        this.error.set('Impossible de charger les horaires de cette date.');
      },
    });
  }
  protected uploadCategoryImage(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    this.uploadingImage.set(true);
    this.api.upload<{ url: string }>('/admin/media/upload', file).subscribe({
      next: (result) => {
        this.form.controls['imageUrl']?.setValue(result.url);
        this.categoryImagePreview.set(`${result.url}?preview=${Date.now()}`);
        this.uploadingImage.set(false);
        this.notify('Image importée et aperçu actualisé');
      },
      error: () => {
        this.uploadingImage.set(false);
        this.error.set('L’image n’a pas pu être importée. Formats image uniquement, 8 Mo maximum.');
      },
    });
  }
  protected categoryDragStart(event: DragEvent, row: Row) {
    this.draggedCategory.set(row);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }
  protected categoryDrop(event: DragEvent, target: Row) {
    event.preventDefault();
    const source = this.draggedCategory();
    this.draggedCategory.set(null);
    if (!source || source['id'] === target['id']) return;
    const ordered = [...this.rows()],
      from = ordered.findIndex((row) => row['id'] === source['id']),
      to = ordered.findIndex((row) => row['id'] === target['id']);
    if (from < 0 || to < 0) return;
    ordered.splice(to, 0, ...ordered.splice(from, 1));
    this.rows.set(ordered);
    this.api
      .patch('/admin/categories/reorder/all', { ids: ordered.map((row) => row['id']) })
      .subscribe({
        next: () => this.notify('Ordre des catégories enregistré'),
        error: () => {
          this.error.set('Le nouvel ordre n’a pas pu être enregistré.');
          this.load();
        },
      });
  }
  protected previewCategory(row: Row) {
    this.categoryPreview.set(row);
  }
  protected loadCategoryOptions() {
    this.api
      .get<PageResult>('/admin/categories', { page: 1, limit: 100 })
      .subscribe({ next: (result) => this.categoryOptions.set(result.data) });
    this.api
      .get<Row[]>('/admin/allergens')
      .subscribe({ next: (result) => this.allergenOptions.set(result) });
  }
  protected toggleAllergen(id: string, checked: boolean) {
    const control = this.form.controls['allergenIds'];
    const values = String(control?.value ?? '')
      .split(',')
      .filter(Boolean);
    control?.setValue(
      (checked ? [...new Set([...values, id])] : values.filter((value) => value !== id)).join(','),
    );
  }
  protected allergenChecked(id: string) {
    return String(this.form.controls['allergenIds']?.value ?? '')
      .split(',')
      .includes(id);
  }
  protected dishBadges(row: Row) {
    return Array.isArray(row['badges']) ? row['badges'].map(String) : [];
  }
  protected dishAllergens(row: Row) {
    const values = row['allergens'];
    return Array.isArray(values)
      ? values
          .map((item) => String(((item as Row)['allergen'] as Row | undefined)?.['name'] ?? ''))
          .filter(Boolean)
      : [];
  }
  protected uploadDishImage(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    this.uploadingImage.set(true);
    this.api.upload<{ url: string }>('/admin/media/upload', file).subscribe({
      next: (result) => {
        this.form.controls['imageUrl']?.setValue(result.url);
        this.dishImagePreview.set(`${result.url}?preview=${Date.now()}`);
        this.uploadingImage.set(false);
        this.notify('Photo du plat importée');
      },
      error: () => {
        this.uploadingImage.set(false);
        this.error.set('La photo n’a pas pu être importée.');
      },
    });
  }
  protected dishDragStart(event: DragEvent, row: Row) {
    this.draggedDish.set(row);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }
  protected dishDrop(event: DragEvent, target: Row) {
    event.preventDefault();
    const source = this.draggedDish();
    this.draggedDish.set(null);
    if (!source || source['id'] === target['id']) return;
    const ordered = [...this.rows()],
      from = ordered.findIndex((row) => row['id'] === source['id']),
      to = ordered.findIndex((row) => row['id'] === target['id']);
    if (from < 0 || to < 0) return;
    ordered.splice(to, 0, ...ordered.splice(from, 1));
    this.rows.set(ordered);
    this.api
      .patch('/admin/dishes/reorder/all', { ids: ordered.map((row) => row['id']) })
      .subscribe({
        next: () => this.notify('Ordre des plats enregistré'),
        error: () => this.load(),
      });
  }
  protected uploadGalleryImage(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    this.uploadingImage.set(true);
    this.api.upload<{ url: string }>('/admin/media/upload', file).subscribe({
      next: (result) => {
        this.form.controls['imageUrl']?.setValue(result.url);
        this.galleryImagePreview.set(`${result.url}?preview=${Date.now()}`);
        this.uploadingImage.set(false);
        this.notify('Image de galerie importée');
      },
      error: () => {
        this.uploadingImage.set(false);
        this.error.set('L’image n’a pas pu être importée.');
      },
    });
  }
  protected uploadTestimonialImage(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    this.uploadingImage.set(true);
    this.api.upload<{ url: string }>('/admin/media/upload', file).subscribe({
      next: (result) => {
        this.form.controls['avatarUrl']?.setValue(result.url);
        this.testimonialImagePreview.set(`${result.url}?preview=${Date.now()}`);
        this.uploadingImage.set(false);
        this.notify('Photo du témoignage importée');
      },
      error: () => {
        this.uploadingImage.set(false);
        this.error.set('La photo n’a pas pu être importée.');
      },
    });
  }
  protected galleryDragStart(event: DragEvent, row: Row) {
    this.draggedGallery.set(row);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }
  protected galleryDrop(event: DragEvent, target: Row) {
    event.preventDefault();
    const source = this.draggedGallery();
    this.draggedGallery.set(null);
    if (!source || source['id'] === target['id']) return;
    const ordered = [...this.rows()],
      from = ordered.findIndex((row) => row['id'] === source['id']),
      to = ordered.findIndex((row) => row['id'] === target['id']);
    if (from < 0 || to < 0) return;
    ordered.splice(to, 0, ...ordered.splice(from, 1));
    this.rows.set(ordered);
    this.api
      .patch('/admin/gallery/reorder/all', { ids: ordered.map((row) => row['id']) })
      .subscribe({
        next: () => this.notify('Ordre de la galerie enregistré'),
        error: () => this.load(),
      });
  }
  protected testimonialDragStart(event: DragEvent, row: Row) {
    this.draggedTestimonial.set(row);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }
  protected testimonialDrop(event: DragEvent, target: Row) {
    event.preventDefault();
    const source = this.draggedTestimonial();
    this.draggedTestimonial.set(null);
    if (!source || source['id'] === target['id']) return;
    const ordered = [...this.rows()],
      from = ordered.findIndex((row) => row['id'] === source['id']),
      to = ordered.findIndex((row) => row['id'] === target['id']);
    if (from < 0 || to < 0) return;
    ordered.splice(to, 0, ...ordered.splice(from, 1));
    this.rows.set(ordered);
    this.api
      .patch('/admin/testimonials/reorder/all', { ids: ordered.map((row) => row['id']) })
      .subscribe({
        next: () => this.notify('Ordre des témoignages enregistré'),
        error: () => this.load(),
      });
  }
  protected updateStatus(row: Row, status: string) {
    const run = () =>
      this.api
        .patch(`/admin/reservations/${row['id']}`, {
          status,
          internalNotes: row['internalNotes'] ?? undefined,
        })
        .subscribe({
          next: () => {
            this.notify(status === 'CONFIRMED' ? 'Réservation confirmée' : 'Statut mis à jour');
            this.load();
          },
          error: () => this.error.set('La mise à jour du statut a échoué.'),
        });
    status === 'CANCELLED'
      ? this.askConfirm(
          'Annuler la réservation',
          `La réservation de ${row['name']} sera annulée.`,
          run,
          true,
        )
      : run();
  }
  protected deletePlanning(row: Row) {
    const event = row['kind'] === 'Événement',
      endpoint = event ? `/admin/event-inquiries/${row['id']}` : `/admin/reservations/${row['id']}`;
    this.askConfirm(
      `Supprimer ${event ? 'cet événement' : 'cette réservation'}`,
      `L’entrée de ${row['name']} sera définitivement supprimée du planning.`,
      () =>
        this.api.delete(endpoint).subscribe({
          next: () => {
            this.close();
            this.notify('Entrée supprimée du planning');
            this.load();
          },
          error: () => this.error.set('La suppression a échoué.'),
        }),
      true,
    );
  }
  protected askConfirm(title: string, message: string, action: () => void, danger = false) {
    this.confirmation.set({ title, message, action, danger });
  }
  protected confirmAction() {
    const current = this.confirmation();
    this.confirmation.set(null);
    current?.action();
  }
  protected exportCsv() {
    const headers = ['Type', 'Nom', 'Date', 'Personnes', 'Statut', 'Email', 'Téléphone'];
    const lines = this.filteredRows().map((row) =>
      [
        row['kind'],
        row['name'],
        row['displayDate'],
        row['guests'],
        row['status'],
        row['email'],
        row['phone'],
      ]
        .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
        .join(';'),
    );
    const blob = new Blob([[headers.join(';'), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'planning-the-choice.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    this.notify('Export CSV généré');
  }
  protected notify(message: string) {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), 2800);
  }
  protected dragStart(event: DragEvent, row: Row) {
    this.draggedRow.set(row);
    event.dataTransfer?.setData('text/plain', String(row['id']));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }
  protected dragOver(event: DragEvent, key: string) {
    if (!key) return;
    event.preventDefault();
    this.dragTarget.set(key);
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }
  protected dragEnd() {
    this.draggedRow.set(null);
    this.dragTarget.set('');
  }
  protected dropOn(event: DragEvent, key: string, hour?: number) {
    event.preventDefault();
    const row = this.draggedRow();
    this.dragEnd();
    if (!row || !key) return;
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month, day, 12);
    const iso = date.toISOString();
    const request =
      row['kind'] === 'Événement'
        ? this.api.patch(`/admin/event-inquiries/${row['id']}`, { eventDate: iso })
        : this.api.patch(`/admin/reservations/${row['id']}`, {
            date: iso,
            time: hour === undefined ? row['time'] : `${String(hour).padStart(2, '0')}:00`,
          });
    request.subscribe({
      next: () => {
        this.notify(
          `Planning déplacé au ${date.toLocaleDateString('fr-FR')}${hour === undefined ? '' : ` à ${String(hour).padStart(2, '0')}:00`}`,
        );
        this.load();
      },
      error: (response) => {
        this.error.set(response.error?.message || 'Le déplacement n’a pas pu être enregistré.');
        this.load();
      },
    });
  }
  protected isReservation(row: Row) {
    return row['kind'] !== 'Événement';
  }
  protected dateKey(date: Date) {
    return Number.isNaN(date.getTime())
      ? ''
      : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }
}
