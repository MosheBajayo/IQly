---
name: ad-creative-builder
description: Use when designing or exporting the 3 IQly ad creatives (320x50, 250x250, 1080x1920) for Google Display/Search — safe zones, copy limits, CTA contrast, and visual continuity with the quiz flow's entry screen. Apply when building src/creatives/*.html and when exporting final PNGs with scripts/render.js for deliverables/part3/.
---

# Ad Creative Builder

## When to use
- Designing or editing an ad creative's HTML source in `src/creatives/`.
- Exporting a creative to a pixel-exact PNG for `deliverables/part3/`.
- Reviewing a creative for brand/claim consistency with the quiz flow.

## Specs and safe zones
| Size | Format | Safe zone | Notes |
|---|---|---|---|
| 320×50 | Banner | 8px margin all sides | Tiny — one message, one CTA, no body copy. |
| 250×250 | Square banner | 16px margin all sides | Room for a headline + visual + CTA. |
| 1080×1920 | Full-screen mobile | 80px top/bottom, 60px sides | Design for a phone screen; keep the CTA in the lower thumb zone. |

Safe zone = nothing essential (text, CTA, logo) may be clipped or crowd the edge
within that margin. Background art can bleed to the edge; text and buttons may not.

## Rules
1. **≤ 5 words on 320×50.** Headline + CTA combined must fit in five words or fewer
   (e.g., "Free IQ Test — Start Now").
2. **One focal visual** per creative — a single clear subject (score dial, brain icon,
   result card), never a busy collage. More elements at larger sizes, not more
   message density.
3. **High-contrast CTA** — the call-to-action button/text must meet at least a 4.5:1
   contrast ratio against its background and be visually distinct from the rest of
   the creative (its own color block or outline, not just bold text).
4. **Brand consistency** — same color palette, type, and tone across all 3 sizes; a
   viewer should recognize them as one campaign.
5. **Visual continuity with the flow's entry screen** — reuse the entry screen's
   color palette, headline phrasing, and visual motif so the click doesn't feel like
   a bait-and-switch (this is also an ad-to-page message-match check, see
   `funnel-cro-audit`).
6. **True claims only** — "Free" must mean free with no paywall; no fabricated stats,
   counters, or testimonials. Matches the project's honesty principle in `CLAUDE.md`.

## Step-by-step procedure
1. Build each creative as a standalone HTML file in `src/creatives/` at its exact
   pixel dimensions (e.g., a `<div>` sized `320px × 50px` with inline CSS). Vanilla
   HTML/CSS/inline SVG only — no external fonts, images, or CDN requests.
2. Check it against the rules above and against the live Part 1 entry screen for
   continuity.
3. Export to PNG with `scripts/render.js <html-file> <width> <height> <output-png>`.
4. Confirm the script's dimension assertion passed (it fails loudly if not).
5. Name the output `iqly-<WxH>.png` (e.g., `iqly-320x50.png`) in
   `deliverables/part3/`.
6. Write the one-paragraph write-up entry: what the creative shows, why that choice,
   and how it connects to the entry screen.

## Output format
- One HTML source per size in `src/creatives/`.
- One exported PNG per size in `deliverables/part3/`, named per the convention above,
  verified at exact pixel dimensions.
- One paragraph per creative in the Part 3 write-up.

## Quality checklist
- [ ] 320×50 copy is 5 words or fewer.
- [ ] Each creative has exactly one focal visual.
- [ ] CTA has high contrast and is visually distinct.
- [ ] All 3 sizes share one consistent palette/type/tone.
- [ ] Each creative visually matches the quiz flow's entry screen.
- [ ] No claim on any creative is false or exaggerated.
- [ ] `render.js` confirms exact output dimensions for every export.
- [ ] Zero external network requests in the HTML source (inline SVG/CSS only).
