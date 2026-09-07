---
name: design-system
description: Establish or apply a project's visual design system - tokens, type scale, spacing, colour, component conventions, and the anti-patterns that make a site look AI-generated. Use when starting a new site, when a UI looks generic or inconsistent, or before building any new page or component. Preloaded into the designer and reviewer agents.
---

# Design System

Your job is to make the project look deliberate rather than templated. Never invent
values ad hoc. Read the tokens, then apply them.

## Order of operations

1. Read `context/brand.md` and `context/design.md` in the current project. If
   `brand.md` is missing, ask three questions (audience, one-word feel, one reference
   site) and write it before proceeding.
2. Read `${CLAUDE_PLUGIN_ROOT}/references/masterlist/D-craft.md` (UI/UX principles and
   visual foundations, ~800 tokens). When building or extending a system also read
   `${CLAUDE_PLUGIN_ROOT}/references/masterlist/F-systems.md` §16. Do not load the
   whole Masterlist.
3. Read `tokens.css` / `tailwind.config.*` / the theme file in the project. If none
   exists, create one from the checklist below before writing any component, and record
   its path in `context/design.md`.
4. Only then write markup.

## Token checklist

A project is not ready for UI work until all of these are defined in one file:

- Type scale: 5-7 steps, one ratio, one display face plus one text face maximum
- Spacing scale: single base unit, geometric steps, no arbitrary pixel values
- Colour: 1 accent, 1 neutral ramp of 9-11 steps, semantic aliases layered on top
- Radius: at most 3 values
- Shadow: at most 3 values, all sharing one light direction
- Breakpoints: named, and consistent with the grid

## Rules

- One accent colour. A second accent needs written justification in `context/design.md`.
- Never use a raw hex or px value in a component. Reference a token or add one.
- Body text minimum 16px, line length 60-75 characters, line height >= 1.5.
- Every interactive element needs hover, focus-visible, active, and disabled states.
- Check contrast before shipping: 4.5:1 for body text, 3:1 for large text and UI borders.
- Respect `prefers-reduced-motion`; animate transform and opacity only.

## Anti-patterns

Reject these on sight - they are what "AI-generated site" looks like:

- Purple-to-blue gradient hero
- Three-column feature grid with generic outline icons
- Centred hero, subtitle, two buttons, no other layout idea on the page
- Uniform card grid where every card has identical weight
- Emoji used as iconography
- Perfectly centred everything; no asymmetry, no whitespace budget

## Output

When you finish, append any new decision to the log in `context/design.md` as one
line: `YYYY-MM-DD - decision - reason`.
