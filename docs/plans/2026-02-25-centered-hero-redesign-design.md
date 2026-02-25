# Centered Hero Redesign Design

**Date:** 2026-02-25

## Goal
Make homepage understanding immediate by using a centered, single-column hero that communicates the value and usage before showing the animation.

## Approved Decisions
- Remove split hero layout.
- Keep a small brand line: "Screenshot•It by Datopian Data Co".
- Use a larger centered title: "URL to Screenshot in one line".
- Subtitle: "Paste any URL after screenshotit.app and get a stable image you can embed anywhere."
- Remove box styling around hero usage line.
- Show a plain `screenshotit.app/{url}` line in hero.
- Move animation block underneath hero copy.
- Leave interactive URL input/capture controls for a future iteration.

## Layout
Hero order:
1. Brand line
2. Large title
3. Subtitle
4. Plain usage line
5. Existing animation (typed URL + preview image)

## Constraints
- Keep animation logic and selectors (`.typed-text`, `#hero-screenshot`) intact.
- Keep all sections after hero unchanged.

## Validation
- Update homepage tests for new copy and hero usage line.
- Run full test suite.
