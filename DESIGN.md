<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->
---
name: Student Score Tracker
description: A warm, encouraging single-teacher tool for tracking student score trends over time.
---

# Design System: Student Score Tracker

## 1. Overview

**Creative North Star: "The Growth Notebook"**

This system started life as a literal handwritten notebook page, and it should still feel like one, filtered through a genuinely warm, encouraging product surface rather than an enterprise dashboard. The single named reference chosen for this project is Duolingo, not for its mascot or gamification mechanics but for its underlying instinct: progress is framed as something to notice and feel good about, not a clinical measurement to audit. A dip in a score reads as "worth a look," never "failing."

This explicitly rejects the cluttered multi-module school-ERP dashboards this project's own reference screenshots came from (fee tracking, HR, attendance, family portals), and rejects the generic AI-SaaS analytics look: gradient hero-metric tiles, identical icon-in-a-box card grids, glassmorphism panels. Those are cold and interchangeable; this is not.

**Key Characteristics:**
- Serif display type for headings and big numbers, paired with a plain sans for body and UI chrome — gives the numbers a bit of "report card" gravitas without tipping into a formal, cold register.
- A full, deliberate color palette anchored in Growth Green rather than a single quiet accent — bold enough to celebrate a good trend, restrained enough to stay legible.
- Motion that responds to real events (a score improved, a chart finished loading) rather than decorating the page for its own sake.

## 2. Colors

Full palette, not a single-accent system: Growth Green is the primary/brand color (navigation, buttons, links, the primary trend-line in charts), and three supporting bold colors exist specifically for dashboard stat tiles, where variety aids scannability between metrics.

### Primary
- **Growth Green** (`[to be resolved during implementation]`): navigation active state, primary buttons, links, the primary series in the score-trend chart, positive score deltas.

### Secondary
- **Stat-tile Blue** (`[to be resolved during implementation]`): one of the rotating dashboard stat-tile colors.
- **Stat-tile Amber** (`[to be resolved during implementation]`): one of the rotating dashboard stat-tile colors.

### Tertiary
- **Stat-tile Rose** (`[to be resolved during implementation]`): one of the rotating dashboard stat-tile colors; also doubles as the negative-delta / destructive-action color, kept consistent rather than tile-only.

### Neutral
- **Warm neutral background/surface family** (`[to be resolved during implementation]`): tinted toward the green hue at low chroma, not a pure gray — both light and dark theme variants needed.

### Named Rules
**The Curated Rotation Rule.** Dashboard stat tiles rotate through exactly four colors (green, blue, amber, rose), always in that order, with green leading. No fifth color is added even if a fifth tile is needed later — reuse the rotation rather than expanding the palette.

## 3. Typography

**Display Font:** Serif, warm and slightly rounded rather than austere `[specific family to be chosen at implementation]`
**Body Font:** Plain sans `[specific family to be chosen at implementation]`

**Character:** The serif carries the "report card" gravitas for headings and big score numbers; the sans keeps every interactive control, label, and paragraph fast to scan. Neither should read as decorative — the serif is a display choice, not a body-text one.

### Hierarchy
- **Display** (serif, large, e.g. big stat-tile numbers and page titles): the numbers that matter most on a screen.
- **Headline** (serif, medium): section headings (card titles, student name on detail page).
- **Title** (sans, medium weight): sub-section labels, table headers.
- **Body** (sans, regular): paragraphs, form labels, table cell text. Cap at 65-75ch anywhere prose-like text appears.
- **Label** (sans, small, medium weight): badges, chips, delta indicators, serial-number tags.

### Named Rules
**The One Serif Rule.** Serif type appears only in Display and Headline roles. Every interactive element (buttons, inputs, nav, table content) stays in the sans family so the UI never feels sluggish to read.

## 4. Elevation

Flat by default, matching the "Responsive, not choreographed" motion energy — most surfaces sit at the same visual depth with color and spacing doing the separating work, not shadow. Elevation is reserved for genuinely transient, floating surfaces (drawers, dropdown menus, modals/confirmation dialogs) where a real spatial "in front of the page" relationship exists.

### Named Rules
**The Earned Elevation Rule.** A shadow only appears on something that is actually floating above the page (drawer, menu, dialog). Cards, tiles, and table rows stay flat; depth is not decoration.

## 6. Do's and Don'ts

### Do:
- **Do** lead with the serif display face on every stat-tile number and page title — that's the "report card" signal.
- **Do** keep Growth Green as the only color used for navigation/primary actions; the blue/amber/rose trio is reserved for dashboard stat tiles and never bleeds into buttons or nav.
- **Do** frame negative deltas constructively in copy ("worth a look") even while using the rose delta color to draw the eye.
- **Do** keep motion responsive to real state changes (score added, chart loaded) — count-ups, draw-ins, optimistic inserts — never motion added purely for polish's sake.
- **Do** respect `prefers-reduced-motion` by disabling count-up/draw-in animation and snapping directly to end states.

### Don't:
- **Don't** build cluttered multi-module dashboards like the ERP-style reference screenshots this project started from (no fee tracking, HR, attendance, or family-portal visual patterns).
- **Don't** use generic AI-SaaS analytics patterns: gradient hero-metric tiles, identical icon-in-a-box card grids, glassmorphism panels.
- **Don't** use a side-stripe colored border as a card/alert accent.
- **Don't** use gradient text (`background-clip: text`) for emphasis — use the serif display weight/size instead.
- **Don't** reach for a modal as the first answer for score entry or edits — prefer the inline drawer/form pattern from the spec before defaulting to a modal.
- **Don't** let the stat-tile color rotation expand past four colors or change order.
