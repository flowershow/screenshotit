# Hero Clarity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor homepage hero so users immediately see one usage example and one markdown embed example above/beside the animation.

**Architecture:** Keep existing animated hero logic, but wrap it in a right-side pane and add a new left-side instructional pane. Use responsive CSS grid for desktop split and mobile stack.

**Tech Stack:** TypeScript, template-string HTML/CSS in Worker-rendered page, Vitest.

---

### Task 1: Add failing test for hero clarity copy

**Files:**
- Modify: `src/homepage.test.ts`

**Step 1: Write the failing test**
- Assert output contains:
  - "From URL to screenshot in one line"
  - `screenshotit.app/example.com`
  - `![](https://screenshotit.app/example.com)`

**Step 2: Run test to verify it fails**
Run: `npm test -- src/homepage.test.ts`
Expected: FAIL.

**Step 3: Implement minimal homepage changes**
- Add instructional hero pane and responsive split layout in `src/homepage.ts`.
- Keep existing animation JS unchanged.

**Step 4: Run test to verify it passes**
Run: `npm test -- src/homepage.test.ts`
Expected: PASS.

### Task 2: Verify no regressions

**Files:**
- Modify: `src/homepage.ts`

**Step 1: Run full tests**
Run: `npm test`
Expected: all tests pass.

**Step 2: Summarize changes**
- Confirm no backend/analytics behavior changed.
