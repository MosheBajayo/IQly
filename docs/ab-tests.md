# A/B Test Tracker — IQly

Tracks every Part 2 variant in one place so the write-up, the code, and the test design
never drift apart. Update this table as soon as a test is designed — before the variant
file is built — and keep it current through to results.

*Rows marked `(backlog, not built)` describe tests that are designed but have no
corresponding file in `deliverables/part2/`. See `ai-log.md` for the history of any test
that was built, then later replaced.*

## Funnel v4 portfolio (current)

**Priority order (judgment, not measured effects — no traffic yet):** 1) Test 3 score-free
gate (High: every quiz finisher reaches the gate, hesitation concentrates at the email ask,
lowest regression risk); 2) Test 2 exit sheet (Medium: smaller exposed pool, near-zero
downside); 3) Test 1 timer (Uncertain: reaches everyone but may raise anxiety). Landing is
not tested because ad-to-page message match is already built into control and there is no
page_view → quiz_start data yet. Same ranking appears in the Part 2 write-up.

Sized with `.claude/skills/ab-test-designer/scripts/power_calc.py`, each against its own
step-level placeholder baseline (pending real campaign data, like every other placeholder
assumption in this project):

| Test | Baseline → MDE | Command | Sample size | Est. days @ 1,000 visitors/day |
|---|---|---|---|---|
| 1 — Question timer | quiz_start→quiz_complete 55% → 15% rel. | `--baseline 0.55 --mde 0.15` | 557/arm (1,114 total) | ~2 |
| 2 — Exit sheet | quiz_start→quiz_complete 55% → 15% rel. | `--baseline 0.55 --mde 0.15` | 557/arm (1,114 total) | ~2 |
| 3 — Score free, report gated | gate_view→signup_success 35% → 15% rel. | `--baseline 0.35 --mde 0.15` | 1,336/arm (2,672 total) | ~3 |

Every test still runs a minimum of one full 7-day cycle regardless of when its sample
size resolves, to avoid day-of-week bias — never stopped early on a mid-week peek.
**Tests 1 and 2 both target the quiz step on purpose** — quiz_start → quiz_complete is
the largest leak in the funnel for cold mobile traffic, and it's worth testing two
different mechanisms against it (pace pressure vs. leave-intent recovery). Because they
touch the same step, they run **sequentially** (or with mutually exclusive traffic
splits) to avoid an interaction effect muddying either result — never simultaneously
against the same quiz step. **Test 3 targets a different, independent step (the gate)**
and can run in parallel with either of the other two.

| Variant file | Funnel step | Hypothesis | Change (flag) | Primary KPI | Secondary KPI | Diagnostics / guardrails | Status |
|---|---|---|---|---|---|---|---|
| `variant-1-question-timer.html` | Quiz (quiz_start → quiz_complete) | A visible per-question clock adds focus and signals test credibility ("this is a real test"), raising engagement and the perceived value of the result, and so gate conversion | `TIMER_MODE: per_question` | Overall CVR | quiz_start → quiz_complete; gate_view → signup_success | Diagnostic: avg time per question, drop-off by question, `question_timeout` rate; guardrail: completion rate (time pressure could stress mobile users into dropping off instead) | Built, QA-passed |
| `variant-2-exit-sheet.html` | Quiz (quiz_start → quiz_complete) | Catching leave intent mid-quiz and showing how close the visitor is to their score recovers part of the mid-quiz drop-off | `EXIT_SHEET: on` | Overall CVR | quiz_start → quiz_complete | Diagnostic: `exit_sheet_continue` ÷ `exit_sheet_open` (recovery rate); guardrail: time-to-complete | Built, QA-passed |
| `variant-3-score-free-report-gated.html` | Gate (gate_view → signup_success) | For a zero-trust brand, giving the exact score away builds trust and pride, so users sign up to save the full report | `GATE_MODE: score_free_report_gated` | Overall CVR | gate_view → signup_success | Guardrail: share of signups that open the full gated report | Built, QA-passed |

## Base-engine changes (not tests — in every arm, so none of the 3 tests above confound)

- **Google signup.** "Continue with Google" ships identically in control and all 3
  variants (prototype demo: a brief "Connecting…" state, then the real results screen
  with an explicit "Prototype demo: no data sent" note — no real OAuth is possible from
  a zero-backend static file). Tracked as `signup_submit`/`signup_success {method: google
  | email}` — monitored as a diagnostic split, not a test variable, since it's identical
  across arms.
- **Gate value preview.** A blurred/partial preview card (skill bars, tips, a shareable
  card) built from the visitor's real computed score ships in every arm, blurred to
  match whatever that `GATE_MODE` actually locks. Variant 3's CTA follows from its own
  existing flag ("Get Results & Insights →" vs. control's "Show My IQ Score →") — this is
  copy, not a second flag, since it's driven by the same `GATE_MODE` value Test 3 already
  changes.
- **Challenge a Friend.** The results screen's primary post-signup CTA ("Challenge a
  Friend →" is the only share action in the challenge banner) is a viral-acquisition
  growth loop, not a CVR test — it's in every arm and isn't sized or tracked as one of
  the 3 tests above. See the Part 1 write-up.

## Backlog (not built this round)

| Candidate | Funnel step | Reason it's backlog, not built |
|---|---|---|
| Hero Q1 on landing (`ENTRY_MODE: hero_q1`) | Landing | This round's 3 test slots went to two quiz-step bets (timer, exit sheet) and one gate-step bet, chosen for the largest leak (quiz) and the strongest direct evidence (gate); the landing step's hero-Q1 idea remains a credible bet, just not spent this round |
| Chunked progress indicator | Quiz | Superseded by Funnel v4's own segmented progress bar design — there's no longer a distinct "chunked" variant left to test against it |
| 20-question quiz (`NUM_QUESTIONS: 20`) | Quiz | A real credibility test, but the expected completion-rate cost makes it a weaker bet than the 3 tests above until there's real traffic data showing completion rate has headroom to spend |
| Pre-quiz goal question (`PRE_QUIZ_GOAL`) | Landing / pre-quiz | Its personalization angle overlaps the landing step's hero-Q1 idea above — testing both would confound attribution for the same step. The flag itself was removed from `src/config.js` (see `ai-log.md`) |
| All-locked gate (`GATE_MODE: all_locked`) | Gate | Still implemented in the engine (least-honest of the 3 gate modes, highest bait-and-switch risk for a zero-trust brand), but not spent as a test slot in favor of the better-evidenced score-free-report-gated bet |

## Retired variants (superseded this round)

`variant-1-hero-q1.html` was removed and replaced by `variant-1-question-timer.html` — see
the portfolio change note above and `ai-log.md`'s "Part 2: timer test added" entry for the
full rationale. `variant-2-exit-sheet.html` and `variant-3-score-free-report-gated.html`
carry over unchanged in substance from the prior round.
