# Marketing-quiz upgrade round — before/after

Reconstructed by temporarily restoring the exact pre-round `src/app.js` and
`src/styles.css` (quoted verbatim in `ai-log.md`'s prior entries), building a throwaway
comparison file, screenshotting it, then restoring the current engine and rebuilding the
real deliverables. Not from version control (this project has none).

Goal of this round: make the flow feel like a high-converting marketing quiz while
keeping every honesty principle in `CLAUDE.md` — triggered by the final review scoring
creativity 6/10 and professional quality 5/10.

## `landing-before.png` → `landing-after.png`
**Before:** generic "Free IQ Test" headline, decorative abstract logo as the only visual,
plain bullet list. **After:** "How sharp is your mind?" headline with "Free IQ Test" kept
as a prominent tag for keyword match, the real Q1 puzzle as the hero visual (a concrete
preview, not an abstract icon), and the time bullet reworded to "12 questions · ~3 min".

## `gate-before.png` → `gate-after.png`
**Before:** generic "Your Results Are In" heading, a lock icon + blurred "###", a single
locked-score line. **After:** outcome-framed heading ("Where should we send your
results?"), a genuine certificate-style preview (seal + blurred IQ/archetype lines) in
place of a generic lock icon, and an explicit "Unlock your cognitive profile" list of
exactly what signing up gets (exact IQ, cognitive archetype, shareable certificate,
retake to track progress) — all of it true to what the results screen actually delivers.

## `results-before.png` → `results-after.png`
**Before:** IQ number, percentile line, category breakdown, generic "Share My Score".
**After:** adds a derived cognitive archetype card (e.g. "Logic Architect" — deterministic
from the user's own strongest category, no invented stats), and replaces the plain-text
share with "Challenge a Friend", which generates a canvas-rendered score card (PNG) with
the real score and archetype before sharing.

See `ai-log.md`'s "Marketing-quiz upgrade round" entry for the full reasoning, the
persona re-run comparing likelihood scores before/after, and the hiring-manager-reviewer
score deltas.
