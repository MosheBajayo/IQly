---
name: funnel-qa
description: Use to automatically click through the IQly quiz flow (or any Part 2 variant) end to end and verify the Definition of Done from CLAUDE.md — zero external network requests, no console errors, no horizontal scroll on mobile, tap targets ≥ 48px on mobile. Apply after any change to a flow or variant HTML file, before marking it done.
---

# Funnel QA

## When to use
- After building or editing `src/` (the flow) or any `deliverables/part2/variant-N-*.html`.
- Before marking any flow file "done" per CLAUDE.md's Definition of Done.
- Run `scripts/qa.js <path-to-html>` — never hand-verify what this script can check.

## The data-qa contract (required for the flow to be testable)
The flow build **must** expose these attributes so this skill can drive it without
knowing the visual design:

| Attribute | On | Meaning |
|---|---|---|
| `data-qa="start"` | the entry CTA | starts the quiz from the landing screen |
| `data-qa="answer"` | each selectable answer option | clicking selects that option |
| `data-qa="next"` | the step's continue button | advances to the next step/question |
| `data-qa="email"` | the signup email `<input>` | where the test email is filled |
| `data-qa="submit"` | the account-creation button | submits and reaches the result/confirmation |
| `data-qa-step` | the quiz (or hero-question) screen's root element | holds the current question index as a string; the script waits for this to change (or the element to disappear, once the quiz hands off to the gate) after clicking an answer, instead of re-clicking — this is what prevents the repeated-click / `MAX_STEPS` starvation logged in `ai-log.md` (2026-11-06) |
| `data-timer-root` | the per-question countdown wrapper (`TIMER_MODE=per_question` only) | presence signals this build has a visible timer; the script waits up to 35s for Q1's real countdown to elapse instead of answering immediately on that one question |
| `data-timeout-banner` | the "Time's up — take your best guess" banner (`TIMER_MODE=per_question` only) | becomes visible once Q1's timer reaches zero; the script confirms this before falling through to its normal immediate-answer loop. Deliberately **not** a `data-qa` attribute — it's a status indicator, not a tap target, so it must stay out of the tap-target scan |
| `id="google-signup-btn"` | the gate's "Continue with Google" button | drives a dedicated, separate pass through the quiz (its own browser context) that clicks this instead of filling email, then confirms `.account-strip` mentions Google. Deliberately **not** `data-qa="submit"` — the email path stays the one the main click-driver loop uses |

Rules for the flow build:
- Every interactive element the script needs to drive carries its `data-qa` value;
  decorative elements don't need one.
- `data-qa="answer"` can appear multiple times per screen (one per option) — the
  script clicks the first visible one.
- If a step has no explicit "next" (selecting an answer auto-advances), omit
  `data-qa="next"` on that step; the script only clicks it when present and visible.
- Document in `CLAUDE.md`'s config-flag list if a flag changes which `data-qa`
  elements exist on a given screen.

## What qa.js does
1. Launches Chrome (falls back to bundled Chromium) and loads the file via `file://`.
2. Runs the flow twice: iPhone 14 emulation (390×664 viewport, touch) and a
   1440×900 desktop viewport.
3. Drives the flow generically: click `start` → loop (click first visible `answer`,
   click `next` if present, screenshot) until no more answers → fill `email` with
   `test@example.com` → click `submit` → screenshot the result screen.
4. Checks, per device:
   - **Zero network requests outside `file://`** (both devices).
   - **No console errors / uncaught page errors** (both devices).
   - **No horizontal scroll** — `scrollWidth` vs `clientWidth`, checked at every
     captured step (mobile only).
   - **Tap targets ≥ 48px** — every visible `[data-qa]` element's bounding box, at
     every captured step (mobile only).
5. Saves screenshots to `qa/<file-name>/<device>/NN-<step>.png`.
6. Writes `qa/<file-name>/report.md` with a pass/fail table and the specific
   violations found (file:// URLs excluded, error text, offending selectors/sizes).

## Step-by-step procedure
1. `node .claude/skills/funnel-qa/scripts/qa.js <path-to-html>`
2. Open `qa/<file-name>/report.md`. Any FAIL must be fixed in the flow, not in the
   script.
3. Re-run after a fix until all checks pass.
4. Reference the report in `ai-log.md` when marking the file done.
5. `qa/` screenshots are QA evidence, not a deliverable — never copy them into
   `deliverables/`.

## Output format
- `qa/<file-name>/mobile/NN-<step>.png` and `qa/<file-name>/desktop/NN-<step>.png`
- `qa/<file-name>/report.md`:
  ```markdown
  # Funnel QA Report — <file-name>
  Date: YYYY-MM-DD

  | Check | Mobile | Desktop |
  |---|---|---|
  | Zero external network requests | PASS | PASS |
  | No console errors | PASS | PASS |
  | No horizontal scroll | PASS | N/A |
  | Tap targets ≥ 48px | FAIL (2 issues) | N/A |

  ## Steps captured
  - 01-landing.png
  - 02-after-start.png
  - ...

  ## Issues
  - [mobile] question-2: [data-qa="next"] is 44x32px (needs ≥ 48x48)
  ```

## Quality checklist
- [ ] Flow exposes every required `data-qa` attribute before running this skill.
- [ ] Script reaches the actual result/confirmation screen, not just the signup step.
- [ ] Report lists concrete evidence for every FAIL (URL, error text, selector+size).
- [ ] Re-run after any fix — don't hand-wave a re-check.
- [ ] `qa/` output is excluded from the final submission zip.
