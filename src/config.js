// Single source of truth for every flow flag. scripts/build.js may override any of these
// with --set FLAG=value when producing a Part 2 variant; never fork this file per variant.
window.IQLY_CONFIG = {
  // 'direct' = landing CTA goes to Q1; the hero Q1 card is a non-answerable preview that
  //   also starts the quiz when tapped (control).
  // 'with_overview' = show a 1-screen "what to expect" summary first (backlog, unbuilt).
  // 'hero_q1' = the hero Q1 card's options become answerable (data-qa="answer"); tapping
  //   one starts the quiz AND records that answer for Q1 (Part 2 variant 1).
  ENTRY_MODE: 'direct',

  // Number of items drawn from src/items/bank.json, in bank order (ascending difficulty).
  // Bank holds 20 authored items so a future 20-question backlog test needs no new content.
  NUM_QUESTIONS: 12,

  // 'teaser_locked' = percentile free, exact IQ + report gated (control).
  // 'all_locked' = nothing shown before signup (backlog, implemented).
  // 'score_free_report_gated' = exact IQ shown free, only skill profile/tips gated (Part 2 variant 3).
  GATE_MODE: 'teaser_locked',

  // 'none' = no visible countdown (control); speed bonus still applies silently.
  // 'soft' = ambient, non-threatening pacing cue (backlog, unbuilt).
  // 'per_question' = visible countdown ring/bar against the item's own timeBudgetMs;
  //   at zero, shows "Time's up. Take your best guess" and does NOT auto-advance or
  //   mark the item wrong (Part 2 variant 1); tracks question_timeout {questionIndex}.
  TIMER_MODE: 'none',

  // Small, de-emphasized back button during the quiz.
  BACK_BUTTON: true,

  // true = selecting an answer shows the selected state for 220ms then auto-advances
  // (next question screen has no data-qa="next" element). false = screens show an
  // explicit data-qa="next" button.
  AUTO_ADVANCE: true,

  // Dwell time of the "analyzing" overlay before it auto-advances to reveal the gate.
  ANALYZING_DURATION_MS: 2600,

  // 'off' = no exit (x) button during the quiz (control).
  // 'on' = an x button opens an exit sheet showing how close the visitor is to their
  //   score, with "Keep Going" / "Leave anyway" (Part 2 variant 2).
  EXIT_SHEET: 'off',

  // Share button(s) on the results screen (header pill, score card, challenge banner).
  SHARE_ENABLED: true,

  // Optional URL appended to the "copy link" share text. Empty by default — if empty,
  // only the share text itself is copied, never a placeholder/fake URL.
  SHARE_URL: '',

  // Scoring model constants from the iq-quiz-builder skill. These are placeholder
  // assumptions (no real completion data exists yet), not measured statistics.
  SCORING: {
    SPEED_BONUS_MAX_PCT: 0.2,
    MU: 0.5,
    SD: 0.18,
    IQ_MIN: 70,
    IQ_MAX: 145,
  },
};
