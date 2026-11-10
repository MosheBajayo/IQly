# CLAUDE.md — IQly Project Memory

Persistent context for every AI session on this project. Read `BRIEF.md` first — it is the
verbatim source of truth. This file summarizes and operationalizes it; BRIEF.md wins on conflict.

## Project goal
- Maximize CVR = Account creations / Page visits for IQly, a new brand with no existing
  equity or audience.
- Traffic source: Google Search ads on "free iq test" and "iq test". Design for cold,
  search-intent visitors landing straight into the flow.

## Deliverables map (from BRIEF.md)
- **Part 1 — AI Quiz Flow**
  - Write-up (1-page max) → `deliverables/part1/writeup.pdf`
  - Clickable flow (quiz → results → account creation, no backend) → `deliverables/part1/index.html`
    (or linked files in the same folder)
- **Part 2 — A/B Test Ideation**
  - Write-up (hypothesis + KPIs per test) → `deliverables/part2/writeup.pdf`
  - 3 standalone variants → `deliverables/part2/variant-N-<change>.html`
- **Part 3 — Creative Design**
  - Write-up (one paragraph per creative) → `deliverables/part3/writeup.pdf`
  - 3 creatives at exact pixel sizes → `deliverables/part3/iqly-320x50.png`,
    `iqly-250x250.png`, `iqly-1080x1920.png`

## Hard technical constraints
- Vanilla HTML/CSS/JS only. Zero external requests — no CDN, no web fonts, no analytics
  pixels. Use a system font stack; inline SVG for visuals/icons.
- Must run fully offline by double-clicking `index.html`. No backend, no build step to
  open any deliverable.
- Mobile-first; must feel native at 390px and at 1440px, not a stretched/squeezed layout.
  Tap targets ≥ 48px. No horizontal scroll at any supported width.
- Each A/B variant is a complete standalone file, differing from control by exactly ONE
  config flag — never a diff or patch file.

## Product & ethics principles
- "Free" means free: no paywall, no bait-and-switch before or after signup.
- No fake reviews, counters, social proof, or statistics. Every on-page claim must be true.
- Every non-trivial design decision gets a written "because" in the write-up or `ai-log.md`.
- The landing's headline and primary CTA in `src/app.js` must match the Part 3 ad
  creatives (`src/creatives/*.html`) word for word — the ads win on message if either
  ever changes. The landing's "Free IQ Test" eyebrow tag is the one deliberate exception,
  kept for Google Search message match on "free iq test" / "iq test".

## Folder structure
- `src/` — single source of the flow + its config flags (one engine; variants are flag toggles)
- `src/creatives/` — HTML sources for the ad creatives
- `scripts/` — build, QA, and render scripts (e.g. Playwright screenshot/export scripts)
- `docs/` — write-up sources (HTML/Markdown) before exporting to PDF
- `deliverables/part1/` — final Part 1 outputs (write-up + flow)
- `deliverables/part2/` — final Part 2 outputs (write-up + 3 variants)
- `deliverables/part3/` — final Part 3 outputs (write-up + 3 creatives + contact sheet); `deliverables/part3/html/` holds a copy of the 3 creative HTML sources
- `docs/assets/part3/` — presentation assets referenced by the Part 3 write-up (contact sheet, in-context previews, continuity strip)
- `.claude/skills/` — custom project skills
- `.claude/agents/` — custom subagents (personas, reviewer)
- `ai-toolkit/iterations/` — before/after evidence from optimization rounds
- `qa/` — temporary QA screenshots; excluded from the final zip

## Tooling
- Playwright is installed locally (npm). Launch with `channel: 'chrome'` if Google Chrome
  is installed; otherwise fall back to bundled Chromium.
- Python 3 is available for small analysis scripts.
- Git: this folder is its own repo, pushed to GitHub `MosheBajayo/IQly` (`main`). Commit or push only when asked.

## Model policy
- Sonnet: building, design reasoning, writing.
- Haiku: mechanical edits (renaming, simple find/replace, boilerplate).

## Working rules
- Plan before large changes and wait for approval before executing them.
- Verify your own work — run it, screenshot it, check it — before reporting it done.
- Ask before deciding anything that's mine to decide (brand direction, which tests to
  run, which creative to ship). Don't guess on these.
- Never touch files outside this project folder. Never request broad permissions.
- After Part 1 is built, document every config flag in `CLAUDE.md`; variants may only
  differ by these flags.

## Definition of done for any flow file
- Tested at 390px and 1440px viewports.
- Zero external network requests.
- No console errors.
- No horizontal scroll.
- Tap targets ≥ 48px.

The `funnel-qa` skill (to be built next) automates this checklist.

## Config flags (`src/config.js`)
One engine, one config file; Part 2 variants differ from control by exactly one flag
(applied via `scripts/build.js --set FLAG=value`), never a forked copy of `src/`.

| Flag | Values | Default (control) | Notes |
|---|---|---|---|
| `ENTRY_MODE` | `direct`, `with_overview`, `hero_q1` | `direct` | `direct` = hero Q1 card is a non-answerable preview that starts the quiz when tapped; `hero_q1` = the hero's own options become answerable (`data-qa="answer"`) and start the quiz (Part 2 variant 1); `with_overview` is an unbuilt backlog value |
| `NUM_QUESTIONS` | integer, e.g. 12 / 20 | `12` | items drawn from `src/items/bank.json` in order |
| `GATE_MODE` | `teaser_locked`, `all_locked`, `score_free_report_gated` | `teaser_locked` | percentile free, exact IQ + breakdown gated; `score_free_report_gated` shows the exact IQ unblurred, gates only the skill profile/tips, and swaps the submit CTA to "Get Results & Insights →" (control stays "Show My IQ Score →") (Part 2 variant 3); `all_locked` is implemented but not currently tested |
| `TIMER_MODE` | `none`, `soft`, `per_question` | `none` | no visible countdown; speed bonus still applies silently. `per_question` shows a countdown **ring** (not a bar) around the question number with a live "⏱ mm:ss · time for this question" label, a brief reset pulse per question, and a contrast-checked warning color in the last 5s; at zero it shows "Time's up for this question" and stays answerable (Part 2 variant 1) |
| `BACK_BUTTON` | `true`, `false` | `true` | small back button during the quiz |
| `AUTO_ADVANCE` | `true`, `false` | `true` | if `false`, quiz screens render `data-qa="next"` (omitted when `true`, per the funnel-qa contract); when `true`, selecting an answer shows a 220ms selected state before auto-advancing |
| `ANALYZING_DURATION_MS` | number (ms) | `2600` | the gate's "analyzing" overlay dwell time; the gate's `data-qa="email"`/`"submit"` elements exist in the DOM immediately regardless of this value — only the overlay is timed; the overlay hides instantly (no opacity cross-fade) rather than fading, since it shares its background color with the panel underneath |
| `EXIT_SHEET` | `off`, `on` | `off` | `on` shows a small × button during the quiz that opens a sheet ("Keep Going" / "Leave anyway") showing how close the visitor is to their score (Part 2 variant 2); tracks `exit_sheet_open`, `exit_sheet_continue`, `exit_sheet_leave` |
| `SHARE_ENABLED` | `true`, `false` | `true` | share sheet (download image, copy link, native share) on the results screen |
| `SHARE_URL` | string | `''` (empty) | optional URL appended to the "copy link" share text; if empty, only the share text itself is copied — never a placeholder/fake URL |

`SCORING` (`MU`, `SD`, `SPEED_BONUS_MAX_PCT`, `IQ_MIN`, `IQ_MAX`) holds the `iq-quiz-builder`
scoring constants — documented placeholder assumptions, not a flag to vary per test.

`data-qa-step` (on the quiz/hero-question root, holding the current question index) is a
required part of the `funnel-qa` contract — see `.claude/skills/funnel-qa/SKILL.md` — not
a config flag, but documented here since it affects how `AUTO_ADVANCE`'s timing is tested.

Three features are **base-engine behavior in every arm, not flags** — they can't be the
one-flag difference any Part 2 variant tests:
- **Google signup.** `id="google-signup-btn"` on the gate, above the email form. Prototype
  only — no real OAuth is possible from a zero-backend static file — so it shows a brief
  "Connecting…" state, then the real results screen with an explicit "Prototype demo: no
  data sent" note. Deliberately not `data-qa="submit"`; the email path stays the one
  `funnel-qa` drives by default, with a separate dedicated check for the Google path.
- **Gate value preview.** A blurred/partial preview card (skill bars, 3 tips, a
  shareable-card mockup) built from the visitor's real computed score, blurred to match
  whatever the current `GATE_MODE` actually locks.
- **Challenge a Friend.** The results screen's primary post-signup CTA ("Challenge a
  Friend →" is the only share action in the challenge banner) — a viral-acquisition
  growth loop, not a CVR lever; `share_click` tracks `{method, cta: "challenge" | "share"}`.

## A/B test tracker
- `docs/ab-tests.md` tracks every variant: funnel step, hypothesis, flag changed, KPIs,
  guardrails, and status. Update it alongside the Part 2 write-up, not after.

## Professional file standards
- Polished English throughout. No personal notes, secrets, API keys, absolute machine
  paths, or placeholder lorem ipsum in any deliverable file.
- Never modify `BRIEF.md`.
- Every script, skill, and agent starts with a short header: what it does and why it exists.

## Logging rule
- After every meaningful step, append a dated entry to `ai-log.md` using its template.

## Naming rules
- A/B variants: `variant-N-<short-change>.html` (e.g. `variant-1-signup-after-q3.html`)
- Creatives: `iqly-<WxH>.png` (e.g. `iqly-320x50.png`)
- Write-ups: `writeup.pdf` inside each `deliverables/partN/` folder

## Agents
Read-only subagents in `.claude/agents/` for independent qualitative review. All take a
folder of step screenshots named `NN-<step>.png`; none invent statistics.
- `persona-mobile-searcher` (haiku) — cold, 30-second-patience mobile searcher; use for
  fast friction/speed checks on any flow or variant.
- `persona-skeptic` (haiku) — burned-before, trust-guarded visitor; use to pressure-test
  "free means free" and catch hidden catches or data harvesting.
- `persona-high-achiever` (haiku) — competitive visitor wanting a credible score; use to
  check test rigor and result specificity.
- `persona-desktop-casual` (haiku) — bored, low-intent desktop visitor; use to check
  whether the experience is fun/fast enough to justify signing up.
- `hiring-manager-reviewer` (sonnet) — demanding review of the full submission
  (deliverables, write-ups, `ai-log.md`, AI toolkit) against the brief; use before
  final submission and after major changes.
