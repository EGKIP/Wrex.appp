# Wrex design foundation

This foundation supports the document-first redesign. It intentionally keeps existing Tailwind names working while new components move to semantic tokens.

## Product character

- Calm writing desk, not a dashboard
- Warm paper and dark ink rather than cool slate
- Editorial serif for expressive headings; restrained sans for interface copy
- Flat surfaces with fine borders and almost no elevation
- Color reserved for status, highlights, and the occasional brand action
- Motion limited to orientation and state changes

## Core tokens

Tokens live in `src/styles.css` as space-separated RGB values and are exposed through `tailwind.config.js`.

| Token | Purpose |
|---|---|
| `paper` | Application canvas |
| `parchment` | Selected or gently emphasized areas |
| `ink` | Primary text and primary actions |
| `brand` | Deep brown brand state |
| `charcoal` | Secondary copy |
| `taupe` | Placeholder and quiet metadata |
| `border-base` | Dividers and control borders |
| `accent` | Selection and focus support |

Legacy names such as `navy`, `mist`, and `canvas` currently map to the new palette. Do not introduce new usage of those aliases; remove them gradually as components are migrated.

## Typography

- `font-heading`: Fraunces, reserved for marketing statements and document-level expressive headings
- `font-sans`: Outfit, used for interface controls and supporting copy
- `font-mono`: JetBrains Mono, used only for shortcuts and numerical metadata
- Body copy should generally use a line height between 1.55 and 1.7 and stay near 65 characters wide.

The current fonts are retained to avoid introducing another dependency during the foundation PR. Font delivery and self-hosting can be reviewed separately.

## Shape and elevation

- Controls: 8 px radius
- Panels: 12 px radius
- Dialogs: 14 px radius
- Borders provide most grouping.
- `shadow-soft` is nearly flat; `shadow-raised` is reserved for transient or floating layers.
- Large pill buttons, shine effects, glowing shadows, and decorative gradients are deprecated.

## Primitives

- `Button`: primary, secondary, quiet, and danger variants; three sizes
- `Field`: label, hint/error association, invalid state, and shared focus treatment
- `Surface`: default, muted, and accent containers
- `StatusBadge`: small semantic status labels

Prefer these primitives over repeating utility strings. Extend an existing primitive before creating a one-off control, unless the interaction is genuinely unique to the editor.

## Accessibility

- Every interactive element receives a visible warm-brown focus ring.
- Primary controls retain at least a 40 px target; large controls use 48 px.
- Fields programmatically associate labels and hint/error text.
- Semantic status must include text or an accessible label; color alone is insufficient.
- Reduced-motion behavior remains global and mandatory.

## Migration rule

Migrate one surface at a time. A feature PR should not combine visual-token adoption with backend behavior changes or delete compatibility aliases before all consumers are updated.

