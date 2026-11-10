# Persona re-run — marketing-quiz upgrade round

Same 4 personas, same methodology as the original Part 1 round, run against the new
control screenshots (`qa/index/mobile/` and `qa/index/desktop/`) after this round's
changes landed. Scores and one-line verdicts below; see `ai-log.md`'s "Marketing-quiz
upgrade round" entry for the full before/after narrative and what was/wasn't acted on.

| Persona | Before | After | Delta | One-line verdict |
|---|---|---|---|---|
| Mobile searcher | 2/10 | 2/10 | 0 | Completed the flow but nearly dropped at a text-heavy logic question; item density/placement wasn't in scope for this round. |
| Skeptic | 7/10 | 7/10 | 0 | Completed both times; this round flagged the new certificate/ribbon icon as giving "half a second" of hesitation before the copy talked it down — not a blocker, logged as deferred. |
| High achiever | 5/10 | 8/10 | +3 | The archetype tying to the visitor's actual strongest category, plus the explicit difficulty-rising cue, both read as credibility signals this persona was missing before. |
| Desktop casual | 3/10 | 6/10 | +3 | Completed this time (dropped before); visual puzzles, progress nudges, and the archetype payoff earned real goodwill, though 3 wordy logic items still cost some "light diversion" feel. |

## Real bug this re-run caught
Desktop-casual and high-achiever independently flagged the same defect from different
angles: the gate's blurred certificate preview hardcoded "IQ 118" / "Pattern Hunter"
regardless of the visitor's actual computed score — fixed same-session (see
`ai-log.md`), `certificatePreviewHtml(score)` now renders the real `score.iq` and
`score.archetype.name`, just blurred, so it cannot mismatch the real reveal.

## Not acted on this round (deferred, tracked)
- **Text-only logic items break visual rhythm.** 3 of 4 personas (mobile-searcher,
  high-achiever, desktop-casual) independently flagged the 3 text-only logic questions
  as the main remaining drag on a bored/impatient visitor. Rebalancing item-type
  distribution touches the Part 1 item bank design directly and wasn't part of this
  round's task list.
- **Certificate/ribbon icon's brief "official-looking" hesitation.** Skeptic persona
  flagged a half-second "wait, is this trying to look credentialed?" reaction before the
  nearby copy ("shareable certificate," the indicative-score disclaimer) resolved it.
  Not a dark pattern — nothing false is claimed — but worth revisiting the icon or the
  disclaimer's position in a future round if it recurs.
