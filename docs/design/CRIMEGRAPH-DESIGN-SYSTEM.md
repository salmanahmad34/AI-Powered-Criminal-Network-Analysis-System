# CrimeGraph AI — Design System

> Version 2.0 — Light SaaS Platform Aesthetic
> Last updated: 2026-09-01

---

## 1. Color Tokens

All colors are defined as CSS custom properties in globals.css under :root.

| Token | Value | Usage |
|---|---|---|
| --background | #f7f7f6 | Page background (warm off-white) |
| --surface | #ffffff | Primary surface (cards, panels) |
| --surface-muted | #f4f4f2 | Subtle muted surface (table zebra, hover) |
| --card-bg | #ffffff | Card fill |
| --card-border | #e5e5e3 | Card / panel border |
| --sidebar-bg | #ffffff | Sidebar / nav fill |
| --border | #e5e5e3 | General borders |
| --border-subtle | #f0f0ee | Separator lines |
| --text-primary | #18181b | Headings, labels, key values |
| --text-secondary | #52525b | Body text, descriptors |
| --text-tertiary | #a1a1aa | Table header labels, placeholders |
| --foreground | #18181b | Tailwind text-foreground alias |
| --accent-color | #1a2744 | Primary accent (dark navy) |
| --accent-hover | #243358 | Hover for navy accent |
| --accent-muted | #e8eaf2 | Light navy fill (badge backgrounds) |
| --teal-accent | #2563eb | Secondary accent (restrained blue) |
| --teal-muted | #eff6ff | Light blue fill |
| --danger-color | #dc2626 | Destructive actions |

## 2. Status Color System

| Severity | Background | Border | Text |
|---|---|---|---|
| CRITICAL | #fef2f2 | #fecaca | #b91c1c |
| HIGH | #fffbeb | #fde68a | #92400e |
| MEDIUM | #eff6ff | #bfdbfe | #1d4ed8 |
| LOW | #f4f4f2 | #e5e5e3 | #52525b |
| SUCCESS | #f0fdf4 | #bbf7d0 | #15803d |

## 3. Typography

Primary font: Plus Jakarta Sans (600-800)
Body font: Inter (400-600)

## 4. Component Patterns

Cards: bg-white border border-[var(--card-border)] rounded-xl
Buttons: .btn-primary / .btn-secondary
Badges: .badge with status bg/border/text classes
Tables: .data-table
Forms: .form-input / .form-select

## 5. Design Rules

- No text-white on light surfaces
- No hardcoded dark hex colors (#0d0f14, #1e2530, #1a1e27)
- No bg-indigo-* — use --accent-color or --teal-accent
- No translucent dark badges (bg-green-500/10) — use light equivalents
- No dark borders (border-white/5) — use border-[var(--card-border)]
- No glow effects, no neon colors
