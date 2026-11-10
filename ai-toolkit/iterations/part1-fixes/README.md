# Part 1 — before/after evidence

Reconstructed from the exact pre-fix source (the old lines are quoted verbatim in
`ai-log.md`), rebuilt to a throwaway file, and re-screenshotted — then the fix was
re-applied to `src/` and the real `deliverables/part1/index.html` was rebuilt again.
Not a snapshot from version control (this project has none); each "before" image
reflects literally reverting the one change in question, nothing else.

## `layout-before.png` → `layout-after.png`
Mobile, question 4 (`sp-001`, the flag rotation+reflection item), 390×664 viewport.
**Before:** the 4th answer option is clipped below the fold — a real bug caught by
the `persona-mobile-searcher` review and confirmed against this exact screenshot.
**After:** tighter `src/styles.css` spacing (smaller question-visual max-width,
reduced margins/gaps, `.screen-quiz` top-aligned instead of vertically centered) puts
all 4 options fully on-screen with room to spare.

## `wording-before.png` → `wording-after.png`
Results screen. **Before:** "higher than 56% of **test takers**" — implies real
comparative data IQly doesn't have (BRIEF.md: "no existing audience"). **After:**
"higher than an **estimated** 56% of people" — honest about the percentile being a
modeled estimate, not measured data. Found during the `funnel-cro-audit` pass.
