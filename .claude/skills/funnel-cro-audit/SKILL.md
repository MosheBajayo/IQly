---
name: funnel-cro-audit
description: Use when reviewing screenshots of the IQly quiz flow (or any variant) for conversion-rate issues — ad-to-page message match, friction per step, trust signals, mobile thumb zone/tap targets, CTA clarity, and dark-pattern/honesty checks. Apply after a flow or variant has screenshots available (mobile and desktop) and before/after shipping a change, to produce a prioritized, evidence-backed findings table.
---

# Funnel CRO Audit

## When to use
- A folder of step screenshots (mobile + desktop) exists for the flow or a variant.
- You need a structured, evidence-based list of conversion issues — not a vibe check.
- Before finalizing Part 1/2 write-ups, or whenever a build changes a funnel step.

## Input
- A folder of screenshots, ideally named `NN-<step>.png` per device (the `funnel-qa`
  skill produces this layout under `qa/<file-name>/<device>/`).
- The flow's stated purpose and traffic source (for IQly: cold search-intent visitors
  from "free iq test" / "iq test" ads, landing directly into the quiz, no prior brand
  trust).

## Checklist — walk every step, both devices
1. **Ad → page message match** — does the entry screen say "free" and "IQ test"
   within the first viewport, matching what the ad promised? Any bait-and-switch?
2. **Time to first action** — can the visitor act (start, answer, continue) without
   scrolling or reading more than ~2 sentences?
3. **Friction per step** — every extra field, click, or decision point is a drop-off
   risk. Flag anything not strictly necessary to reach the next step.
4. **Trust signals** — are claims truthful and is intent clear (what happens with an
   email, what "free" covers)? No fabricated counters, reviews, or stats.
5. **Mobile thumb zone & tap targets** — primary CTA reachable one-handed in the lower
   two-thirds of the screen; tap targets ≥ 48px; no accidental mis-taps from crowding.
6. **CTA clarity** — one obvious next action per screen; button text states the
   outcome ("See my score", not "Submit").
7. **Visual hierarchy** — does the eye land on the right element first (headline →
   value → CTA), on both the 390px and 1440px screenshots?
8. **Gate value proposition** — right before account creation, is it clear *why*
   signing up is worth it (e.g., seeing the actual score) and what it costs (just an
   email, no paywall)?
9. **Honesty / dark-pattern check** — no confirm-shaming, no disguised ads, no forced
   continuity, no hidden costs, no fake urgency/scarcity.
10. **Accessibility basics** — sufficient color contrast, labeled inputs, readable
    font sizes, no information conveyed by color alone.

## Output format
A markdown table, most severe first:

| Severity | Step | Issue | Evidence | Fix | Expected impact on which metric |
|---|---|---|---|---|---|
| P0 | 02-quiz-q3 (mobile) | CTA below the fold at 390px | `qa/.../mobile/02-quiz-q3.png` | Move "Next" above fold or make it sticky | Step completion rate, step 3 → 4 |

- **Severity**: P0 = blocks or clearly suppresses conversion; P1 = meaningful drag on
  CVR; P2 = polish, low-confidence impact.
- **Evidence**: the exact screenshot filename/path backing the claim — no issue
  without a cited screenshot.
- **Fix**: one concrete, implementable change (maps to a config flag where relevant).
- **Expected impact**: name the specific metric (step CVR, overall CVR, time-to-first-
  action, bounce) — not just "better UX."

Close with a **Top 3 recommended changes** list, ranked by expected CVR impact,
referencing the table rows they come from.

## Quality checklist
- [ ] Every finding cites a specific screenshot as evidence.
- [ ] Both mobile and desktop screenshots were reviewed for every step.
- [ ] No finding is purely aesthetic preference without a stated CVR mechanism.
- [ ] Honesty/dark-pattern check was explicitly run, not skipped.
- [ ] Severities are not all the same level — real audits have a spread.
- [ ] Top 3 list is ranked and traceable back to table rows.
