# Hero Clarity Design

**Date:** 2026-02-25

## Goal
Make homepage visitors understand how ScreenshotIt works immediately by showing one concrete URL example and one markdown embed example before the animation.

## Decisions
- Use a compact split hero on desktop.
- Keep linear flow on mobile by stacking the explanation first and animation second.
- Keep interaction minimal (no new hero copy buttons).

## Layout
- Left panel (new):
  - Headline: "From URL to screenshot in one line"
  - One-sentence explanation
  - `Input` code line: `screenshotit.app/example.com`
  - `Markdown` code line: `![](https://screenshotit.app/example.com)`
- Right panel (existing): typed URL animation + rotating screenshot preview.

## UX Constraints
- No additional JS behavior needed for the new content.
- Keep the existing animation selectors and timing unchanged.
- Preserve the rest of the homepage sections as-is.

## Validation
- Add test assertion(s) for new hero copy and example lines.
- Run full test suite.
