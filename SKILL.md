# SKILL.md — Wrex.app Design System & Agent Design Judgment

> This file is the design authority for all UI work on Wrex.app.
> Before making any visual change, consult this file.

---

## 1. Product Context

**Wrex.app** is an authentic writing workspace for students and professionals.
It helps users understand if their writing sounds like *them* — not like AI.
The emotional promise: confidence, clarity, ownership of your words.

**Target user:** Student under deadline pressure, or professional who writes regularly.
**Moment of use:** Right before submitting something important.
**Core feeling to design for:** "This is my writing. I can trust it."

---

## 2. Brand Identity

| Token | Value |
|---|---|
| Primary accent | `#FBBF24` (yellow) |
| Dark accent | `#F59E0B` |
| Navy (headings, UI) | `#0F172A` |
| Charcoal (body text) | `#334155` |
| Mist (backgrounds) | `#F1F5F9` |
| Canvas (page bg) | `#FAFAFA` |
| Border | `#E2E8F0` |
| Danger | `#EF4444` |
| Success | `#10B981` |

**Typography:** Inter everywhere. Weights: 400 (body), 600 (labels), 700 (headings), 800 (hero).
**Font mono:** JetBrains Mono for code/scores only.

---

## 3. Design Parameters

```
DESIGN_VARIANCE: 6       // Distinctive, not generic — break templates
VISUAL_DENSITY: 5        // Balanced — not sparse, not cluttered
MOTION_INTENSITY: 3      // Subtle animations only — no distractions
TRUST_FACTOR: HIGH       // Signals: clean, consistent, no dark patterns
BRAND_LEVEL: PREMIUM     // Feels like a tool worth paying for
```

---

## 4. Visual Principles

### DO
- Use generous whitespace as a design element — let content breathe
- Use **strong typographic hierarchy** — one dominant element per section
- Make the yellow accent intentional and rare — it should draw the eye exactly once per view
- Write UI copy like a human, not a feature list
- Use navy for authority, yellow for action/signal, white for clarity
- Earn every animation — it must add meaning, not decoration
- Design for the moment just before submission — urgency + confidence

### DON'T
- Purple glows, gradient blobs that do nothing, or glassmorphism for its own sake
- 3-identical-card grids — this is the #1 generic SaaS pattern to avoid
- Robot / AI chip / circuit board imagery — Wrex is about *human* voice
- Fake stats or empty social proof ("10,000+ users")
- Overloaded CTAs — one primary action per section
- Icon-label-description cards repeated 4+ times in a row
- Paragraph text below 13px

---

## 5. Component Patterns

### Buttons
- Primary: yellow gradient + navy text + shadow-button + btn-shine class
- Secondary: navy border + navy text, transparent bg
- Ghost: charcoal/60 text, no border, underline on hover

### Cards
- Standard: `rounded-modal border border-border-base bg-white shadow-soft`
- Elevated: `shadow-soft-md` on hover with `-translate-y-1`
- Never stack more than 3 identical card layouts in one section

### Section structure
- Max content width: `max-w-7xl` for marketing, `max-w-4xl` for app
- Standard section padding: `px-6 py-16 lg:px-10 lg:py-24`
- Section heading: `text-[1.75rem] lg:text-[2.25rem]` font-bold text-navy

### Spacing rhythm
- Section gap: 80–96px
- Card internal padding: 24–32px
- Item gap within cards: 12–16px

---

## 6. Anti-Patterns Currently Present (Audit)

| Component | Issue | Fix direction |
|---|---|---|
| Hero right panel | 4 identical icon-label-desc card rows | Replace with a real UI preview (score mockup) |
| HowItWorks | Classic 3-card grid — step 1 has accent bg, 2+3 plain | Use a horizontal step timeline or large numbered layout |
| AnalyzerSection header | "Try it now — free" feels like a landing page, not a product | In workspace: remove heading entirely |
| Grammar card hints | "click underlined words to fix" shown in multiple places | One place only, inline |
| Hero blob | Yellow blob is invisible and adds visual noise | Replace with a clean geometric accent or remove |

---

## 7. Redesign Priority Order

1. **Hero** — biggest conversion impact
2. **HowItWorks** — currently generic, needs distinction  
3. **AnalyzerSection** — workspace polish (ongoing)
4. **Navbar** — minor adjustments
5. **Footer / FAQ** — low priority

---

## 8. Voice & Copy Rules

- Never say "AI detection" — say "Authenticity Score"
- Never say "AI-generated" as a judgment — say "AI-pattern signals"
- Use second person ("your writing", "your voice")
- Be direct. Avoid filler words: "simply", "just", "easy", "powerful"
- CTA copy: imperative verb + value ("Check your voice", "See your score")

---

*Last updated: 2026-04-25. Updated by Augment Agent.*
