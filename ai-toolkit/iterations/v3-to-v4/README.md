# Funnel v4 redesign — before/after

`before/` was captured by temporarily restoring the exact pre-v4 `src/app.js` and
`src/styles.css` (the marketing-round engine, held verbatim in conversation and
`ai-log.md`), building a throwaway comparison file, and screenshotting it, then
restoring the current engine. `after/` is captured straight from the rebuilt
`deliverables/part1/index.html`. Not from version control (this project has none).

Goal of this round: re-implement a visual redesign ("Funnel v4" — purple/yellow/green,
CVR-first) that was first prototyped in Claude Design, producing the
`design_handoff_iqly_funnel_v4` reference folder. Every screen was rebuilt from scratch
in `src/` against that reference, not copied from the prototype's own markup — and four
points in the design were deliberately overridden for honesty/correctness (see below).

## `landing-before.png` → `landing-after.png`
**Before:** indigo/coral marketing palette, a photographic-style Q1 preview card, plain
bullet row. **After:** the v4 purple/yellow/green system — yellow highlight on the
headline's time promise ("Find out in **3 minutes**"), a dark purple hero card holding
the live Q1 puzzle, a 3-step "Answer → See → Unlock" strip explaining the funnel before
the user commits, and a true "✓100% free" header pill. The headline's time figure and
the step copy are both generated from the live config (`NUM_QUESTIONS`,
`minutesLeftFrom`), so they can't drift out of sync with the actual quiz length.

## `quiz-before.png` → `quiz-after.png`
**Before:** a single thin progress bar, no pacing cue beyond "Question N of 12".
**After:** a segmented progress bar (one segment per question, so remaining effort is
legible at a glance), a green "Nice start!" / contextual heads-up banner at fixed
milestones, and an "≈X min left" estimate. That estimate is computed from the *actual*
remaining items' `timeBudgetMs` (`minutesLeftFrom`) rather than a flat per-question
guess, so it can't overpromise on harder, slower items near the end. The 220ms
"selected" state before auto-advance (a deliberate UX nicety — confirming the tap
registered) only became safe to re-enable this round because `funnel-qa`'s `qa.js` now
waits on a `data-qa-step` change instead of blindly re-clicking (see `ai-log.md`).

## `gate-before.png` → `gate-after.png`
**Before:** a certificate-style preview panel (seal + blurred IQ/archetype) on the
marketing-round's indigo/coral card. **After:** a dark purple-deep panel with a free
"Top X%" headline, a blurred IQ chip, and a bell-curve percentile visual — all computed
from the user's real score, never a placeholder. The progress bar above the panel is
calculated as `(answered + 1) / (answered + 2)` of real funnel progress, not the design
prototype's hardcoded "92%". The fine print reads "Free · No credit card · No spam" —
the prototype's draft copy said "Free forever", which this project's honesty principle
(`CLAUDE.md`: every on-page claim must be true) rules out, since there's no sustained
free-tier commitment being made.

## `results-before.png` → `results-after.png`
**Before:** IQ number, percentile line, archetype card, a single "Challenge a Friend"
share button producing a canvas PNG. **After:** an IQ count-up animation into a 5-band
chip (Below average → Very superior), two new "insight cards" (strongest category,
weakest category, pace) computed from the user's own answers — no invented stats — and
a full share sheet: Download image (the same canvas renderer, recolored to v4),
Copy link (clipboard API with an `execCommand` fallback, since `file://` often blocks
the clipboard API), and native-share channel buttons that only render when
`navigator.share` exists. The 4 channel buttons (WhatsApp/Messages/X/Email) all invoke
the one real `navigator.share()` sheet rather than faked per-channel deep links, which
would require network requests this project can't make. Every share action fires
`share_click` with its method.

## Overridden from the design prototype (and why)
The `design_handoff_iqly_funnel_v4` README was the primary spec, but four points were
intentionally built differently, per the brief's honesty and no-fake-stats principles:
1. Gate progress bar — real funnel-progress math, not a hardcoded 92%.
2. Gate fine print — "Free · No credit card · No spam", never "Free forever".
3. Quiz time estimate — summed from real remaining `timeBudgetMs`, not a flat 15s/item.
4. Share channels — native `navigator.share()` only, never fake deep links or a
   placeholder share URL (`SHARE_URL` defaults to empty and is only appended if set).

## Bugs the persona re-run caught (fixed before this round shipped)
Automated checks (`funnel-qa`, `contrast_check.py`) all passed before the persona agents
ever ran — these three were only visible to something that actually looked at the
screens in sequence, which is why the persona step exists:
1. **Ghost text on the gate panel.** `.analyzing-overlay` and `.teaser-panel.card-dark`
   share the exact same `--purple-deep` background, so the overlay's 300ms opacity
   fade-out made its own text visibly double-expose over the gate content underneath
   for about a third of a second — every user hit this at quiz completion, not just the
   screenshot tool. Fixed by cutting the overlay instantly (`display:none`) instead of
   cross-fading it.
2. **Landing promised a different time than the quiz delivered.** The landing headline
   hardcoded "3 minutes" while the quiz's own honest `minutesLeftFrom` estimate (summed
   from the real item bank's `timeBudgetMs`) showed "≈4 min left" at question 1. Fixed
   by having the landing read from the same `minutesLeftFrom(0)` call, so the two can't
   drift apart again.
3. **The results screen could show two different IQ numbers at once.** The hero IQ
   count-up animates from `target - 30` over ~450ms while the score card below renders
   the final value instantly; `funnel-qa`'s result screenshot was taken only 250ms after
   submit, so the evidence (and a fast glance by a real user) could catch "100" in the
   hero next to "102" on the card. Fixed by moving `qa.js`'s post-submit wait to 700ms.

See `ai-log.md`'s "Funnel v4" entries for the full build log (what `funnel-qa` and
`contrast_check.py` caught at each step), the persona re-run comparing likelihood scores
against the marketing round, and the Part 2 portfolio changes this round required.
