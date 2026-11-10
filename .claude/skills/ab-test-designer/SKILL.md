---
name: ab-test-designer
description: Use when designing, scoring, or documenting an A/B test for the IQly flow — writing the hypothesis, scoring it with ICE, defining the KPI tree and guardrails, checking test rigor (randomization, SRM, stopping rule), and sizing the sample with power_calc.py. Apply for every Part 2 variant before it is built, and update docs/ab-tests.md alongside the write-up.
---

# A/B Test Designer

## When to use
- Choosing which 3 bets to test against the Part 1 flow.
- Writing the hypothesis/KPI section of the Part 2 write-up.
- Sizing a test (sample size, runtime) before committing to it.
- Any time `docs/ab-tests.md` needs a new or updated row.

## Step-by-step procedure

### 1. Write the hypothesis
Use this exact template, one sentence:
> Because [insight], changing [X] on step [S] will increase [metric] for [segment].

Example: *"Because mobile visitors abandon when the signup form appears before they've
seen any payoff, moving account creation after the results reveal will increase
quiz-start → account-creation CVR for mobile search visitors."*

### 2. Score it with ICE (1–10 each, be specific — no gut-feel 7s without a reason)
- **Impact** — if the hypothesis is right, how much could it move the primary metric?
  10 = could plausibly double step CVR; 1 = rounding-error effect.
- **Confidence** — how much evidence (funnel-cro-audit findings, known CRO patterns,
  direct observation) backs this being right? 10 = directly observed friction; 1 = pure
  guess.
- **Ease** — how simple is the change to ship as one config flag and measure cleanly?
  10 = single flag, no new tracking needed; 1 = touches multiple steps or needs new
  instrumentation.
- `ICE score = (Impact + Confidence + Ease) / 3`. Rank candidate tests by this score;
  pick the top 3 for Part 2, and say so explicitly if a high-impact idea was dropped
  for low confidence or low ease.

### 3. Define the KPI tree
- **Primary**: overall CVR (account creations / page visits) — the one metric that
  decides ship/no-ship.
- **Secondary**: the specific step-level conversion the change targets (e.g., quiz
  step 3 → step 4 completion rate). This is the leading indicator.
- **Guardrails** (must not regress, or the win is invalid): email validity rate (no
  spike in throwaway/malformed emails), completion time (no test that merely stalls
  people into converting), downstream engagement (e.g., result-screen interaction) if
  relevant to the change.

### 4. Rigor checklist (apply to every test before it ships)
- [ ] Randomization is **user-level** (consistent variant per visitor, not per
      pageview).
- [ ] An SRM (sample ratio mismatch) check is planned — observed split vs. intended
      split should match within statistical tolerance before trusting any result.
- [ ] Test runs full **weekly cycles** (e.g., 7/14/21 days), never cut mid-week, to
      avoid day-of-week bias.
- [ ] Results are segmented by **device** (mobile vs. desktop) before declaring a
      global winner — a change can win on one and lose on the other.
- [ ] A **stopping rule** (sample size and/or date) is fixed *before* the test starts.
- [ ] **No peeking** — do not call a winner from partial data; wait for the
      pre-defined sample size/duration.

### 5. One variant = one flag
Each variant file changes exactly one config flag from the control. Never ship a
variant that bundles two changes — it breaks attribution of any CVR movement.

### 6. Size the test
Run `scripts/power_calc.py` with the baseline conversion rate, the relative minimum
detectable effect (MDE), alpha, power, and daily visitor volume. Report sample size
per arm and estimated days needed in the write-up.

### 7. Update the tracker
Add/update a row in `docs/ab-tests.md` — funnel step, hypothesis, flag changed, KPIs,
guardrails, status — **at design time**, not after the variant is built.

## Output format
For each test in the Part 2 write-up: one paragraph covering the hypothesis, the ICE
score (with the three sub-scores), why it was chosen, the primary + secondary KPI, and
the sample-size/runtime estimate from `power_calc.py`.

## Quality checklist
- [ ] Hypothesis follows the "Because…changing…will increase…for…" template exactly.
- [ ] ICE sub-scores are each justified in one clause, not just a bare number.
- [ ] KPI tree has one primary, at least one secondary, and at least one guardrail.
- [ ] Rigor checklist items are all addressed (not silently skipped).
- [ ] Variant changes exactly one flag vs. control.
- [ ] `docs/ab-tests.md` row exists and matches the write-up.
- [ ] Sample size/runtime came from `power_calc.py`, not a guess.
