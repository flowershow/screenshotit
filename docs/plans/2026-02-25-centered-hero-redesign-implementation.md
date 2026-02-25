# Centered Hero Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor homepage hero to a centered single-column intro with animation beneath and no boxed usage line.

**Architecture:** Keep current homepage template and animation JavaScript, but replace split hero CSS/markup with a centered intro block and stacked animation block. Reuse existing monospace visual language and spacing tokens.

**Tech Stack:** TypeScript template HTML/CSS, Vitest.

---

### Task 1: Add failing tests for the new hero structure

**Files:**
- Modify: `src/homepage.test.ts`

**Step 1: Write the failing test**
- Assert hero contains:
  - "Screenshot•It by Datopian Data Co"
  - "URL to Screenshot in one line"
  - approved subtitle
  - `screenshotit.app/{url}`
- Assert old header tagline text does not appear.

**Step 2: Run test to verify it fails**
Run: `npm test -- src/homepage.test.ts`
Expected: FAIL.

### Task 2: Implement centered hero refactor

**Files:**
- Modify: `src/homepage.ts`

**Step 1: Replace hero CSS**
- Remove split-grid hero styles.
- Add centered hero intro styles and spacing.
- Keep animation styles/selectors.

**Step 2: Replace hero markup**
- Remove separate site header block.
- Add hero brand/title/subtitle/plain usage line.
- Keep animation below intro.

**Step 3: Verify test passes**
Run: `npm test -- src/homepage.test.ts`
Expected: PASS.

### Task 3: Regression verification

**Files:**
- No additional files.

**Step 1: Run full tests**
Run: `npm test`
Expected: all tests pass.
