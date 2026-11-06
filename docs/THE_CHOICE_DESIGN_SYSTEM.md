# The Choice — Design System v1

> **Premium • Fusion • Élégant • Moderne • Immersion • Nature**

## Vision

Le site doit transmettre une expérience haut de gamme, immersive et contemporaine. L'objectif est de mettre en valeur la cuisine, l'ambiance et la marque **The Choice**, sans donner une impression de fast-food.

Inspirations :
- Nobu
- Sexy Fish
- Zuma
- COYA
- The Ivy

---

# Palette de couleurs

## Couleurs principales

| Variable | Couleur | Usage |
|-----------|----------|-------|
| `--primary` | `#2D6B45` | Couleur principale de la marque |
| `--primary-hover` | `#3E8A5C` | Hover |
| `--primary-dark` | `#1F5134` | Active |

## Fonds

| Variable | Couleur |
|-----------|----------|
| `--background` | `#060606` |
| `--surface` | `#111111` |
| `--surface-2` | `#171717` |

## Texte

| Variable | Couleur |
|-----------|----------|
| `--text` | `#FFFFFF` |
| `--text-muted` | `#A7A7A7` |
| `--text-light` | `#7C7C7C` |

## Bordures

```css
rgba(255,255,255,.08)
```

Hover :

```css
rgba(255,255,255,.15)
```

---

# Typographies

## Titres (Display)

Ordre de préférence :

1. Bebas Neue
2. Anton
3. Oswald

Usage :
- Hero
- Titres de sections
- Pages 404

## Texte courant

Ordre de préférence :

1. Manrope
2. Inter

## Prix

Space Grotesk

---

# Hiérarchie

| Élément | Taille |
|----------|---------|
| Hero | 72–96px |
| Titre section | 48px |
| Sous-titre | 20px |
| Texte | 18px |
| Petit texte | 15px |

Utiliser `clamp()` pour une typographie fluide.

---

# Layout

- Grille 12 colonnes
- Largeur max : 1440px
- Mobile First
- Base d'espacement : 8px
- Rayon boutons : 12px
- Rayon cartes : 18px
- Rayon inputs : 10px

---

# Boutons

## Primaire

- Fond : Vert
- Texte : Blanc
- Hover :
  - couleur légèrement plus claire
  - scale 1.03

## Secondaire

- Transparent
- Bordure blanche
- Hover :
  - fond blanc
  - texte noir

---

# Icônes

- Lucide Icons
- Heroicons

Éviter Material Icons.

---

# Cartes

Fond :

```css
#101010
```

Hover :

- translateY(-6px)
- scale(1.01)

---

# Inputs

Fond :

```css
#141414
```

Border :

```css
rgba(255,255,255,.08)
```

Focus :

```css
border-color: var(--primary);
box-shadow: 0 0 15px rgba(45,107,69,.35);
```

---

# Navigation

- Hauteur : 88px
- Transparente au chargement
- Puis :

```css
backdrop-filter: blur(14px);
background: rgba(6,6,6,.85);
```

---

# Footer

- Fond : `#040404`
- Logo blanc
- Texte gris
- Liens verts au hover

---

# Animations

Bibliothèques :

- GSAP
- ScrollTrigger
- Lenis
- SplitText
- Flip

Effets :

- Reveal
- ClipPath
- Mask
- Stagger
- Parallax
- Image Reveal
- Cursor personnalisé

Éviter les simples fadeIn.

Durées :

| Animation | Durée |
|------------|--------|
| Hover | 0.25s |
| Reveal | 0.8s |
| Hero | 1.2s |
| Transition page | 1s |

Respecter `prefers-reduced-motion`.

---

# Responsive

| Breakpoint | Largeur |
|-------------|----------|
| Mobile | 390px |
| Tablet | 768px |
| Laptop | 1280px |
| Desktop | 1440px |

---

# Style photographique

- Contraste élevé
- Ambiance sombre
- Lumière chaude
- Profondeur de champ
- Arrière-plan légèrement flou
- Nourriture très nette
- Noir profond
- Dominante verte discrète

---

# Ton éditorial

Préférer des textes courts et impactants.

Exemple :

> **FUSION FOOD**  
> An immersive culinary experience where every plate tells a story.

---

# Recommandations

- Conserver le vert comme couleur principale.
- Utiliser un blanc cassé (`#F8F8F6`) pour les grands blocs de texte.
- Ajouter un léger dégradé (`#060606 → #0B100D`) sur les sections.
- Appliquer une texture de grain très légère (2–3 %) sur les fonds sombres pour renforcer le rendu premium.
