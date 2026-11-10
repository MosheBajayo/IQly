# IQly — AI Builder Challenge Submission

A quiz funnel, A/B test variants, and ad creatives for IQly, a new IQ-test brand launching
on Google Search traffic for "free iq test" and "iq test". The goal throughout is to
maximize CVR (account creations / page visits) while keeping every claim on the page
honest. See `BRIEF.md` for the original challenge brief and `CLAUDE.md` for the working
constraints and principles behind every decision.

## Start here

| Deliverable | File path | Status |
|---|---|---|
| Part 1 — Write-up | `deliverables/part1/writeup.pdf` | Done |
| Part 1 — Flow | `deliverables/part1/index.html` | Done — double-click to open in a browser |
| Part 2 — Write-up | `deliverables/part2/writeup.pdf` | Done |
| Part 2 — Variant 1 (per-question timer) | `deliverables/part2/variant-1-question-timer.html` | Done — double-click to open |
| Part 2 — Variant 2 (exit-intent sheet) | `deliverables/part2/variant-2-exit-sheet.html` | Done — double-click to open |
| Part 2 — Variant 3 (score free, report gated) | `deliverables/part2/variant-3-score-free-report-gated.html` | Done — double-click to open |
| Part 3 — Write-up | `deliverables/part3/writeup.pdf` | Done — one paragraph per creative |
| Part 3 — Creative 320×50 | `deliverables/part3/iqly-320x50.png` | Done — outcome hook + landing CTA, 6.4KB |
| Part 3 — Creative 250×250 | `deliverables/part3/iqly-250x250.png` | Done — landing headline + real Q1 puzzle, 17.7KB |
| Part 3 — Creative 1080×1920 | `deliverables/part3/iqly-1080x1920.png` | Done — hook → participation → payoff → action layout |
| Part 3 — Creative sources | `deliverables/part3/html/*.html` | Done — standalone HTML sources for all 3 creatives |
| Part 3 — Contact sheet | `deliverables/part3/iqly-contact-sheet.png` | Done — all 3 creatives at true relative scale |

All HTML deliverables are self-contained: no backend, no build step, no external
requests. Opening the file in any browser is enough to click through.

## Folder structure

- `BRIEF.md` — the verbatim challenge brief (never modified)
- `CLAUDE.md` — project memory: goals, constraints, principles, working rules
- `ai-log.md` — dated log of decisions made during the build
- `src/` — single source of the quiz flow and its config flags
- `src/creatives/` — HTML sources for the ad creatives
- `scripts/` — build, QA, and render scripts (e.g. Playwright exports)
- `docs/` — write-up sources before export to PDF
- `deliverables/part1/`, `part2/`, `part3/` — final submission outputs per part
- `.claude/skills/`, `.claude/agents/` — custom Claude Code skills and subagents used to build this
- `ai-toolkit/iterations/` — before/after evidence from optimization rounds
- `qa/` — temporary QA screenshots (not included in the final submission)
- `scripts/package.js` — builds the clean submission zip (`dist/IQly-submission.zip`), leaving out `qa/`, `node_modules/`, design-tool exports and OS/session files

## How AI was used

Full dated record in `ai-log.md`; highlights below.

I used Claude Design (an Anthropic Claude product, not an external agentic harness) only to
produce static visual prototypes of Funnel v4; its exports are not part of this submission.
Claude Code then re-implemented the design in the production architecture, verified by automated QA, CRO audit and persona
reviews.

Part 3 creatives were mocked up in Claude Design and implemented pixel-exact in Claude
Code; the ads were then aligned to the landing's CTA and headline for message match, with automated
size, contrast, continuity and funnel QA checks.

- **Toolkit, not one-off prompting.** 5 Claude Code skills (`.claude/skills/`) each ship
  an executable, independently-verified script — `iq-quiz-builder/scripts/validate_items.js`
  (item bank schema/ordering), `funnel-qa/scripts/qa.js` (end-to-end click-through QA on
  mobile + desktop), `ab-test-designer/scripts/power_calc.py` (sample-size/runtime
  sizing). 5 subagents in `.claude/agents/` (4 personas + a hiring-manager reviewer)
  gave independent, non-rubber-stamp pressure on the flow.
- **A QA-script read caught a real architecture bug before it shipped.** Reading
  `funnel-qa/scripts/qa.js`'s actual source (not its spec) surfaced that a timed
  "analyzing" screen would stall the automated driver between quiz-complete and the
  signup gate — fixed by rendering the gate immediately with an overlay on top, instead
  of as a separate timed screen (`ai-log.md`, 2026-11-06).
- **Findings were acted on, not just collected.** The CRO audit caught a real honesty
  gap (percentile copy implying real comparative data IQly doesn't have yet) and fixed
  it in shipped code. Two persona reviews independently flagged friction that led to
  concrete fixes: a clipped mobile layout bug, and a Part 2 test (the 20-question
  variant) directly answering the high-achiever persona's "thin sample size" complaint.
- **Where I overrode the toolkit.** Deliberately skipped running `funnel-cro-audit`
  against the Part 2 variants — that skill's checklist is calibrated to find the best
  default experience, but the variants intentionally test worse-sounding-on-paper
  mechanics (e.g. hiding the free percentile) to see what the data says; auditing them
  against the control's own standard would just re-flag the intended experiment as a bug.
- **A requested feature conflicted with an earlier documented decision — surfaced, not silently built or silently refused.** A later round asked for a "Continue with Google" button, directly reversing this project's own written decision that one would be a bait-and-switch (no backend exists to really authenticate anyone). Flagged the conflict back before building anything; the resolution that shipped — a clearly-labeled "Prototype demo: no data sent" state instead of a fake-looking verified account — keeps the honesty principle intact while adding the feature.
- **Persona review caught real bugs the automated checks couldn't see.** Rebuilding the
  flow from the Funnel v4 design (`ai-toolkit/iterations/v3-to-v4/`), all of `funnel-qa`
  and `contrast_check.py` passed clean — but running the 4 personas against the result
  surfaced a same-color overlay fade that visibly ghosted text over the gate panel for a
  third of a second, a landing headline promising a different time than the quiz's own
  honest estimate, and a results screen that could show two different IQ numbers at once
  mid-animation. All three were root-caused and fixed in `src/`, then re-verified with a
  second persona pass before shipping (`ai-toolkit/iterations/v3-to-v4/README.md`).
