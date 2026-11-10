---
name: iq-quiz-builder
description: Use when writing, editing, or expanding IQ test items for the IQly quiz flow — original inline-SVG matrix/pattern, number-series, logic, and spatial puzzles, their distractors, and the scoring model that turns answers into an indicative IQ score and percentile. Apply before any item or item bank is added to src/, and before changing the scoring formula.
---

# IQ Quiz Builder

## When to use
- Writing new IQ test items (matrix, number-series, logic, spatial) for the quiz flow.
- Reviewing or expanding an existing item bank.
- Implementing or changing the scoring model (raw score → IQ → percentile).
- Never use for copying or lightly rewording items from a known published test.

## Hard rule: originality
Every item must be an original construction. Do not reproduce, trace, or lightly
re-skin items from Raven's Progressive Matrices, WAIS, Mensa admission tests, or any
other published IQ test — including their exact shapes, numeric sequences, or logic
premises. You may reuse a general *format* (e.g., "3x3 visual matrix," "find the next
number") but the concrete content must be generated from scratch for IQly.

## Item types
1. **Matrix / pattern** — 2x2 or 3x3 grid of inline-SVG shapes with one missing cell;
   pick the shape that completes the pattern (rotation, count, fill, overlay rules).
2. **Number series** — a sequence of numbers following one or two combined rules
   (arithmetic, geometric, alternating, digit manipulation); pick the next number.
3. **Logic** — short verbal/symbolic premises leading to one valid deduction.
4. **Spatial** — inline-SVG shape rotation, reflection, folding, or part-to-whole
   reasoning.

All visuals are inline `<svg>` — no external images, icon fonts, or CDN assets.

## Difficulty ladder (1 = easiest, 5 = hardest)
| Level | Matrix | Number series | Logic | Spatial |
|---|---|---|---|---|
| 1 | 2x2 grid, single visual rule (e.g., shape count) | 2-step constant arithmetic (+3, +3, +3) | one premise, direct conclusion | single 90°/180° rotation |
| 2 | 2x2 grid, two combined rules | arithmetic with one changing step | one premise + one negation | rotation + reflection |
| 3 | 3x3 grid, one rule per row/column | alternating two interleaved series | two premises, one inference | 2D shape folding (which net forms the shape) |
| 4 | 3x3 grid, two overlapping rules | non-linear rule (squares, products) | two premises + exclusion rule | part-to-whole with distractor mirror-images |
| 5 | 3x3 grid, rule depends on both row and column | multi-step rule with a red herring digit | three premises, multi-step deduction | mental rotation in 3D implied by 2D projections |

A bank must include items spanning the full ladder, not clustered at one end.

## Distractor design rules
- Exactly **one** option is unambiguously correct; everyone else must be wrong under
  the item's own rule, with no second defensible reading.
- Use 4–6 options. Each distractor should represent a plausible, specific error:
  - applied only part of the rule (e.g., rotated but didn't change fill),
  - off-by-one in a series,
  - mirrored/reversed version of the correct shape,
  - a conclusion that sounds right but reverses the logical direction.
- Never include a "none of the above" / "all of the above" option.
- Keep option format (length, visual complexity, phrasing style) consistent across
  options so the correct answer isn't guessable from its shape alone.

## Mandatory self-verification step
Before an item (or a bank) is considered done:
1. Hide the marked answer. Solve the item cold from only the prompt/SVG and options.
2. Write down the option you independently derive as correct.
3. Compare against the stored `correct` flag.
4. If they disagree: the item is broken — rewrite the item or its rule, don't just
   move the correct flag. Re-run this step after any rewrite.
5. Record in `ai-log.md` that this pass was run and its outcome (e.g., "12/12 items
   verified, 1 rewritten").

Never ship an item bank that has not been through this pass.

## Item schema (JSON)
```json
{
  "id": "mx-003",
  "type": "matrix",
  "difficulty": 3,
  "prompt": "Which shape completes the pattern?",
  "svg": "<svg viewBox='0 0 120 120'>...grid markup...</svg>",
  "options": [
    { "text": "A", "svg": "<svg>...</svg>", "correct": false },
    { "text": "B", "svg": "<svg>...</svg>", "correct": true },
    { "text": "C", "svg": "<svg>...</svg>", "correct": false },
    { "text": "D", "svg": "<svg>...</svg>", "correct": false }
  ],
  "explanation": "Each row rotates the shape 90° and alternates fill."
}
```
A bank is a JSON array of items, **sorted ascending by `difficulty`**.

## Scoring model
This produces an **indicative** score for entertainment/self-assessment, calibrated
against the item bank's own assumed statistics — it is explicitly **not a clinical or
psychometrically validated IQ assessment**, and the flow's copy must say so.

1. Each item's weight is its `difficulty` (1–5).
2. Speed bonus per correct item: up to +20% of its weight if answered in under the
   item's time budget, scaled linearly to 0% at or beyond the budget. Speed never
   earns points on a wrong answer.
3. `rawScore = Σ (correct_i ? difficulty_i + speedBonus_i : 0)`
4. `maxPossible = Σ (difficulty_i × 1.2)`
5. `pctOfMax = rawScore / maxPossible`
6. Assume `pctOfMax` is approximately normal across test-takers with placeholder
   `mu = 0.5`, `sd = 0.18`. **These two constants are assumptions, not measured data**
   — flag them for recalibration once real completion data exists.
7. `z = (pctOfMax - mu) / sd`
8. `IQ = round(100 + 15 × z)`, clamped to `[70, 145]`.
9. `percentile = round(normalCDF(z) × 100)`.
10. Display copy must include a line equivalent to: "This is an indicative score for
    entertainment purposes, not a clinical assessment."

## Output format
- One JSON item bank file (or an update to the existing one) matching the schema
  above, ordered by difficulty.
- A short self-verification note (which items were solved cold, any rewrites).
- If scoring logic changed, the updated formula/constants and why.

## Quality checklist
- [ ] Every item is an original construction (no known-test reproduction).
- [ ] Bank covers the full 1–5 difficulty ladder.
- [ ] Every item has 4–6 options, exactly one `correct: true`.
- [ ] Distractors are plausible, specific, and non-absurd; no "all/none of the above".
- [ ] Self-verification pass completed and logged.
- [ ] All visuals are inline SVG; zero external assets.
- [ ] `scripts/validate_items.js <bank.json>` passes with no errors.
- [ ] Results copy states the score is indicative, not clinical.
