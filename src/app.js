// IQly Funnel v4 engine: single state machine driving landing -> quiz -> gate (with an
// analyzing overlay) -> results. Reads window.IQLY_CONFIG and window.IQLY_BANK (both
// inlined by scripts/build.js). Re-implements the "IQly Funnel v4" design handoff
// (Design system setup needed/design_handoff_iqly_funnel_v4/README.md) in this file's
// own string-template render*() pattern — not a copy of the prototype's code.
(function () {
  'use strict';

  var CONFIG = window.IQLY_CONFIG;
  var BANK = window.IQLY_BANK || [];
  var STORAGE_KEY = 'iqly_v1_state';

  var TYPE_LABELS = {
    'matrix': 'Pattern Recognition',
    'number-series': 'Numerical Reasoning',
    'logic': 'Logical Deduction',
    'spatial': 'Spatial Reasoning',
  };

  // Deterministic from the user's own answers (accuracy per category) — no invented stats.
  // Priority order below only breaks exact ties; it never overrides a real higher accuracy.
  var ARCHETYPES = {
    'matrix': { name: 'Pattern Hunter', description: 'You spot hidden visual rules faster than most — patterns rarely escape you.' },
    'number-series': { name: 'Number Navigator', description: 'You see the logic inside a sequence almost instantly.' },
    'logic': { name: 'Logic Architect', description: 'You build airtight conclusions from just a few clues.' },
    'spatial': { name: 'Spatial Visionary', description: 'You can rotate, flip, and rebuild shapes entirely in your head.' },
  };
  var ARCHETYPE_PRIORITY = ['matrix', 'number-series', 'logic', 'spatial'];

  // Original practice tips (not from the design prototype, which only sketches the
  // mechanism) — three honest, generic test-taking tips per category, no fake claims.
  var TIPS = {
    'matrix': [
      'Scan each row and column separately before combining the rule — most grids change one attribute at a time.',
      'If a shape repeats, check its size and fill, not just its outline — more than one attribute can shift together.',
      'When stuck, test your best guess against every other cell in the grid, not just the one next to the gap.',
    ],
    'number-series': [
      'Check the simplest rule first — constant addition or multiplication — before assuming something complex.',
      'Write out the differences between consecutive terms; a pattern in the differences often reveals the real rule.',
      'Watch for a number that breaks the pattern — it may be a one-off red herring, not the whole rule.',
    ],
    'logic': [
      'Write each premise as an if-then statement before looking at the answer options.',
      'A rule can only prove its own direction — don’t assume the reverse is also true.',
      'When a premise says "no one with X has Y," use it to rule things out, not to confirm them.',
    ],
    'spatial': [
      'Picture the object rotating one step at a time instead of jumping straight to the final position.',
      'Check whether a shape has been mirrored, not just rotated — they can look deceptively similar.',
      'For piece-fitting puzzles, match the exact size and angle of the gap before trusting the overall silhouette.',
    ],
  };

  var state = {
    screen: 'landing',
    questions: BANK.slice(0, CONFIG.NUM_QUESTIONS),
    currentIndex: 0,
    answers: [],
    questionStartTime: null,
    score: null,
    exitSheetOpen: false,
    shareSheetOpen: false,
    signupMethod: null,
  };

  // Per-question countdown interval handle (TIMER_MODE=per_question). Deliberately not
  // part of `state`/`saveState()` — a setInterval id can't be serialized to localStorage
  // and has no meaning across a reload; it's cleared and restarted on every renderQuiz().
  var questionTimerInterval = null;

  // ---- tracking ----
  function track(event, props) {
    var payload = Object.assign({ event: event, ts: Date.now() }, props || {});
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
    } catch (e) {}
    try { console.log('[track]', payload); } catch (e) {}
  }

  // ---- persistence (refresh-safe) ----
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        screen: state.screen,
        currentIndex: state.currentIndex,
        answers: state.answers,
      }));
    } catch (e) {}
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  // ---- scoring (iq-quiz-builder spec) ----
  function erf(x) {
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var t = 1 / (1 + p * x);
    var y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  function normalCDF(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }

  function computeArchetype(byType) {
    var bestKey = null;
    var bestRatio = -1;
    ARCHETYPE_PRIORITY.forEach(function (key) {
      var t = byType[key];
      if (!t || t.total === 0) return;
      var ratio = t.correct / t.total;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestKey = key;
      }
    });
    if (!bestKey) bestKey = ARCHETYPE_PRIORITY[0];
    return Object.assign({ key: bestKey }, ARCHETYPES[bestKey]);
  }

  function computeScore() {
    var S = CONFIG.SCORING;
    var rawScore = 0;
    var maxPossible = 0;
    var byType = {};

    state.questions.forEach(function (q, i) {
      var a = state.answers[i];
      maxPossible += q.difficulty * 1.2;
      if (!byType[q.type]) byType[q.type] = { correct: 0, total: 0, label: TYPE_LABELS[q.type] || q.type };
      byType[q.type].total += 1;
      if (a && a.correct) {
        byType[q.type].correct += 1;
        var speedBonus = 0;
        if (q.timeBudgetMs && a.timeMs < q.timeBudgetMs) {
          speedBonus = q.difficulty * S.SPEED_BONUS_MAX_PCT * (1 - a.timeMs / q.timeBudgetMs);
        }
        rawScore += q.difficulty + speedBonus;
      }
    });

    var pctOfMax = maxPossible > 0 ? rawScore / maxPossible : 0;
    var z = (pctOfMax - S.MU) / S.SD;
    var iq = Math.max(S.IQ_MIN, Math.min(S.IQ_MAX, Math.round(100 + 15 * z)));
    var percentile = Math.max(1, Math.min(99, Math.round(normalCDF(z) * 100)));
    return { iq: iq, percentile: percentile, byType: byType, archetype: computeArchetype(byType) };
  }

  // IQ band classification shown on results (index drives which of the 5 band-bar
  // segments is highlighted). Standard psychometric band labels are kept alongside the
  // "indicative, not a clinical assessment" disclaimer, never in place of it.
  function iqBand(iq) {
    if (iq < 90) return { label: 'Below average', index: 0 };
    if (iq < 110) return { label: 'Average', index: 1 };
    if (iq < 120) return { label: 'High average', index: 2 };
    if (iq < 130) return { label: 'Superior', index: 3 };
    return { label: 'Very superior', index: 4 };
  }

  // Insight cards are a pure function of state.answers/state.questions — nothing here is
  // invented or compared to other people; "Your pace" and "hardest items solved" are both
  // directly measured from this visitor's own recorded timeMs/difficulty.
  function computeInsights(score) {
    var byType = score.byType;
    var strongestKey = null, weakestKey = null;
    var bestRatio = -1, worstRatio = 2;
    ARCHETYPE_PRIORITY.forEach(function (key) {
      var t = byType[key];
      if (!t || t.total === 0) return;
      var ratio = t.correct / t.total;
      if (ratio > bestRatio) { bestRatio = ratio; strongestKey = key; }
      if (ratio < worstRatio) { worstRatio = ratio; weakestKey = key; }
    });
    var totalTimeMs = 0, answeredCount = 0, hardestSolved = 0, hardestTotal = 0;
    state.questions.forEach(function (q, i) {
      var a = state.answers[i];
      if (a) { totalTimeMs += a.timeMs; answeredCount += 1; }
      if (q.difficulty === 5) {
        hardestTotal += 1;
        if (a && a.correct) hardestSolved += 1;
      }
    });
    return {
      strongestKey: strongestKey,
      weakestKey: weakestKey,
      avgSeconds: answeredCount > 0 ? Math.max(1, Math.round(totalTimeMs / answeredCount / 1000)) : 0,
      hardestSolved: hardestSolved,
      hardestTotal: hardestTotal,
    };
  }

  // Honest "time left" estimate: the sum of the REMAINING items' own timeBudgetMs, not a
  // flat per-item guess, so the displayed minutes always matches the actual item mix.
  function minutesLeftFrom(index) {
    var ms = 0;
    for (var i = index; i < state.questions.length; i++) {
      ms += state.questions[i].timeBudgetMs || 20000;
    }
    return Math.max(1, Math.round(ms / 60000));
  }

  var TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * 20; // r=20 in the ring's 48x48 viewBox

  function formatMMSS(ms) {
    var totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ---- shared visuals ----
  function logoSvg(size) {
    size = size || 20;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 48 48" aria-hidden="true">' +
      '<circle cx="24" cy="24" r="20" fill="none" stroke="#5A3FD8" stroke-width="4"/>' +
      '<circle cx="24" cy="24" r="11" fill="none" stroke="#5A3FD8" stroke-width="4"/>' +
      '<circle cx="24" cy="24" r="3" fill="#FFD24A"/>' +
      '</svg>';
  }

  function logoChipHtml() {
    return '<span class="logo-chip">' + logoSvg(20) + '</span>';
  }

  // IQly has no existing test-taker population yet (BRIEF.md: "no existing audience"),
  // so the percentile is a modeled estimate off the scoring constants, not measured data.
  function percentileText(percentile) {
    return 'You scored higher than an estimated ' + percentile + '% of people.';
  }

  function bellCurveSvg(percentile) {
    var x = 20 + (percentile / 100) * 260;
    return '<svg viewBox="0 0 300 120" class="bell-curve" aria-hidden="true">' +
      '<path d="M10,100 C60,100 70,10 150,10 C230,10 240,100 290,100" fill="none" stroke="#C9BCFF" stroke-width="3"/>' +
      '<line x1="' + x + '" y1="15" x2="' + x + '" y2="105" stroke="#FFD24A" stroke-width="3"/>' +
      '<circle cx="' + x + '" cy="15" r="5" fill="#FFD24A"/>' +
      '</svg>';
  }

  var app = document.getElementById('app');
  function render(html) { app.innerHTML = html; }

  // ================= LANDING =================
  function renderLanding(isFresh) {
    state.screen = 'landing';
    if (isFresh) track('page_view', {});

    var heroQ = state.questions[0];
    var isHeroQ1 = CONFIG.ENTRY_MODE === 'hero_q1';
    var hasVisualOptions = heroQ.options.some(function (o) { return !!o.svg; });
    // Same source of truth as the quiz's "min left" estimate (minutesLeftFrom), so the
    // landing's time promise can never drift out of sync with what the quiz actually shows.
    var totalMins = minutesLeftFrom(0);

    var heroOptionsHtml = heroQ.options.map(function (opt, i) {
      return '<button class="hero-q1-option' + (hasVisualOptions ? ' option-visual' : '') + '"' +
        (isHeroQ1 ? ' data-qa="answer" data-index="' + i + '"' : '') + '>' +
        (opt.svg ? '<span class="option-visual">' + opt.svg + '</span> ' : '') +
        (opt.text || '') +
        '</button>';
    }).join('');

    render(
      '<main class="screen screen-landing"><div class="container">' +
        '<div class="landing-layout">' +
          '<div class="landing-left">' +
            '<div class="header-bar">' +
              '<span class="brand">' + logoChipHtml() + '<span class="brand-name">IQly</span></span>' +
              '<span class="pill pill-green">✓ 100% free</span>' +
            '</div>' +
            '<span class="eyebrow-pill">Free IQ Test · 12 questions</span>' +
            '<h1 class="landing-h1">What’s your IQ? Find out free in <span class="highlight">' + totalMins + ' minutes.</span></h1>' +
            '<p class="landing-sub">12 puzzles across pattern, number, logic and spatial reasoning. See your estimated percentile the moment you finish.</p>' +
            '<button class="btn btn-cta btn-cta-lg" data-qa="start" id="landing-cta">Start the Free Test →</button>' +
            '<div class="check-row"><span>No signup to start</span><span>~' + totalMins + ' minutes</span><span>Instant percentile</span></div>' +
            '<div class="steps-strip">' +
              '<div class="step-card"><p class="step-num">01</p><p class="step-title">Answer</p><p class="step-desc">12 short puzzles across 4 reasoning types.</p></div>' +
              '<div class="step-card"><p class="step-num">02</p><p class="step-title">See</p><p class="step-desc">Your estimated percentile, instantly and free.</p></div>' +
              '<div class="step-card"><p class="step-num">03</p><p class="step-title">Unlock</p><p class="step-desc">Add your email to see your exact score and full report.</p></div>' +
            '</div>' +
          '</div>' +
          '<div class="landing-right">' +
            '<div class="card-dark">' +
              '<p class="hero-q1-eyebrow">Question 1 · Can you solve it?</p>' +
              '<p class="hero-q1-sub">Tap an answer to begin</p>' +
              '<div class="hero-q1-body">' +
                '<div class="hero-q1-tile">' + (heroQ.svg || '') + '</div>' +
                '<p class="hero-q1-prompt">' + heroQ.prompt + '</p>' +
              '</div>' +
              '<div class="hero-q1-options">' + heroOptionsHtml + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="sticky-cta"><button class="btn btn-cta" id="sticky-cta">Start the Free Test →</button></div>' +
      '</main>'
    );

    function startFresh() {
      track('quiz_start', {});
      state.currentIndex = 0;
      state.answers = [];
      saveState();
      renderQuestion();
    }

    document.getElementById('landing-cta').addEventListener('click', startFresh);
    document.getElementById('sticky-cta').addEventListener('click', startFresh);

    var answered = false;
    Array.prototype.slice.call(document.querySelectorAll('.hero-q1-option')).forEach(function (el, i) {
      el.addEventListener('click', function () {
        if (answered) return;
        answered = true;
        if (isHeroQ1) {
          track('quiz_start', {});
          state.currentIndex = 0;
          state.answers = [];
          state.questionStartTime = Date.now();
          handleAnswer(i);
        } else {
          startFresh();
        }
      });
    });
  }

  // ================= QUIZ =================
  function headsUpBannerHtml(index) {
    var total = state.questions.length;
    var banners = {
      0: { tone: 'green', icon: '✓', title: 'Nice start!', body: 'They begin easy. Go with your first instinct.' },
      3: { tone: 'green', icon: '⅓', title: 'A third done — great pace.', body: 'Questions get harder now. Accuracy beats speed.' },
      5: { tone: 'purple', icon: '½', title: 'Halfway there.', body: 'Your score is taking shape. Finish to see your percentile.' },
      8: { tone: 'yellow', icon: '3', title: 'Only 3 left!', body: 'Your percentile unlocks right after question ' + total + '.' },
      11: { tone: 'yellow', icon: '★', title: 'Last question!', body: 'One more answer and your results are ready.' },
    };
    var b = banners[index];
    if (!b) return '';
    return '<div class="headsup-banner tone-' + b.tone + '">' +
      '<span class="headsup-icon">' + b.icon + '</span>' +
      '<span><span class="headsup-title">' + b.title + '</span><br/><span class="headsup-body">' + b.body + '</span></span>' +
      '</div>';
  }

  function exitSheetHtml() {
    var total = state.questions.length;
    var pctDone = Math.round((state.currentIndex / total) * 100);
    var remaining = total - state.currentIndex;
    var mins = minutesLeftFrom(state.currentIndex);
    return '<div class="exit-scrim" id="exit-scrim">' +
      '<div class="exit-sheet">' +
        '<span class="pill pill-yellow">You’re ' + pctDone + '% done</span>' +
        '<h2>Only ' + remaining + ' question' + (remaining === 1 ? '' : 's') + ' until your score.</h2>' +
        '<p>That’s about ' + mins + ' min. Your answers so far are saved on this device, so nothing is lost if you keep going.</p>' +
        '<button class="btn btn-cta" id="exit-keep-going">Keep Going</button>' +
        '<button class="btn-text" id="exit-leave" style="width:100%;text-align:center;">Leave anyway</button>' +
      '</div>' +
    '</div>';
  }

  // TIMER_MODE=per_question only: a visible countdown against the item's own
  // timeBudgetMs. At zero it does NOT auto-advance or mark the item wrong — scoring
  // already zeroes the speed bonus once timeMs >= timeBudgetMs, so letting the user
  // keep answering normally after timeout needs no scoring change, only this UI state.
  function startQuestionTimer(q) {
    var totalMs = q.timeBudgetMs || 20000;
    var startedAt = Date.now();
    var timedOut = false;
    var ringEl = document.getElementById('question-timer-ring');
    var labelEl = document.getElementById('question-timer-label');
    var bannerEl = document.getElementById('timeout-banner');
    var pulseEl = document.getElementById('timer-reset-pulse');

    if (ringEl) {
      ringEl.style.strokeDasharray = String(TIMER_RING_CIRCUMFERENCE);
      ringEl.style.strokeDashoffset = '0';
      ringEl.classList.remove('is-warning');
    }

    // "New question · timer reset" pulse: opacity-only visibility (never `hidden`,
    // since display:none can't be transitioned) so it actually fades under normal
    // motion, and simply snaps under prefers-reduced-motion (global motion block).
    if (pulseEl) {
      pulseEl.classList.add('is-active');
      setTimeout(function () {
        pulseEl.classList.remove('is-active');
      }, 1200);
    }

    function tick() {
      var elapsed = Date.now() - startedAt;
      var remaining = Math.max(0, totalMs - elapsed);
      var fraction = totalMs > 0 ? Math.max(0, Math.min(1, remaining / totalMs)) : 0;
      if (ringEl) {
        ringEl.style.strokeDashoffset = String(TIMER_RING_CIRCUMFERENCE * (1 - fraction));
        if (remaining <= 5000) ringEl.classList.add('is-warning');
      }
      if (labelEl) labelEl.textContent = '⏱ ' + formatMMSS(remaining) + ' · time for this question';
      if (remaining <= 0 && !timedOut) {
        timedOut = true;
        clearInterval(questionTimerInterval);
        questionTimerInterval = null;
        if (bannerEl) bannerEl.hidden = false;
        track('question_timeout', { questionIndex: state.currentIndex });
      }
    }
    tick();
    questionTimerInterval = setInterval(tick, 100);
  }

  function renderQuiz() {
    var q = state.questions[state.currentIndex];
    var total = state.questions.length;
    var hasVisualOptions = q.options.some(function (o) { return !!o.svg; });
    var letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    var segmentsHtml = state.questions.map(function (_, i) {
      var cls = i < state.currentIndex ? 'is-done' : (i === state.currentIndex ? 'is-current' : '');
      return '<span class="segment ' + cls + '"></span>';
    }).join('');

    var optionsHtml = q.options.map(function (opt, i) {
      return '<button class="chip-option" data-qa="answer" data-index="' + i + '">' +
        '<span class="option-letter">' + letters[i] + '</span>' +
        (opt.svg ? '<span class="option-visual">' + opt.svg + '</span>' : '') +
        (opt.text ? '<span class="option-text">' + opt.text + '</span>' : '') +
        '</button>';
    }).join('');

    var remainingAfter = total - state.currentIndex - 1;

    render(
      '<main class="screen screen-quiz" data-qa-step="' + state.currentIndex + '">' +
        '<div class="container" style="max-width:860px">' +
          '<div class="header-bar">' +
            '<span class="brand">' + logoChipHtml() + '<span class="brand-name">Question ' + (state.currentIndex + 1) + ' of ' + total + '</span></span>' +
            (CONFIG.EXIT_SHEET === 'on' ? '<button class="quiz-exit-btn" id="quiz-exit-btn" aria-label="Exit">×</button>' : '') +
          '</div>' +
          '<div class="segmented-progress">' + segmentsHtml + '</div>' +
          '<div class="quiz-meta-row">' +
            '<span class="quiz-meta-category">' + (TYPE_LABELS[q.type] || q.type) + '</span>' +
            '<span class="quiz-meta-time">≈ ' + minutesLeftFrom(state.currentIndex) + ' min left</span>' +
          '</div>' +
          (CONFIG.TIMER_MODE === 'per_question' ?
            '<div class="question-timer-row" data-timer-root>' +
              '<div class="question-timer-ring">' +
                '<svg viewBox="0 0 48 48" aria-hidden="true">' +
                  '<circle class="ring-track" cx="24" cy="24" r="20"></circle>' +
                  '<circle class="ring-progress" id="question-timer-ring" cx="24" cy="24" r="20"></circle>' +
                '</svg>' +
                '<span class="question-timer-ring-num">' + (state.currentIndex + 1) + '</span>' +
              '</div>' +
              '<span class="question-timer-label" id="question-timer-label">⏱ ' + formatMMSS(q.timeBudgetMs || 20000) + ' · time for this question</span>' +
              '<span class="question-timer-reset-pulse" id="timer-reset-pulse">New question · timer reset</span>' +
            '</div>' +
            '<div class="headsup-banner tone-yellow" id="timeout-banner" data-timeout-banner hidden>' +
              '<span class="headsup-icon">⏱</span>' +
              '<span><span class="headsup-title">Time’s up for this question.</span><br/><span class="headsup-body">Take your best guess.</span></span>' +
            '</div>'
          : '') +
          headsUpBannerHtml(state.currentIndex) +
          '<div class="quiz-body">' +
            '<div class="quiz-puzzle-col">' +
              (q.svg ? '<div class="quiz-puzzle-tile">' + q.svg + '</div>' : '') +
              '<p class="quiz-prompt">' + q.prompt + '</p>' +
            '</div>' +
            '<div class="quiz-options-col' + (hasVisualOptions ? '' : '') + '">' + optionsHtml + '</div>' +
          '</div>' +
          '<div class="quiz-footer">' +
            (CONFIG.BACK_BUTTON && state.currentIndex > 0 ? '<button class="quiz-back-link" id="back-btn">← Back</button>' : '<span></span>') +
            '<span>' + remainingAfter + ' to go · ' + minutesLeftFrom(state.currentIndex) + ' min</span>' +
          '</div>' +
        '</div>' +
      '</main>'
    );

    state.questionStartTime = Date.now();

    if (questionTimerInterval) { clearInterval(questionTimerInterval); questionTimerInterval = null; }
    if (CONFIG.TIMER_MODE === 'per_question') startQuestionTimer(q);

    var answered = false;
    Array.prototype.slice.call(document.querySelectorAll('[data-qa="answer"]')).forEach(function (optEl) {
      optEl.addEventListener('click', function () {
        if (answered) return;
        answered = true;
        optEl.classList.add('selected');
        handleAnswer(parseInt(optEl.getAttribute('data-index'), 10));
      });
    });

    if (CONFIG.BACK_BUTTON && state.currentIndex > 0) {
      document.getElementById('back-btn').addEventListener('click', function () {
        state.answers.splice(state.currentIndex - 1, 1);
        state.currentIndex -= 1;
        renderQuiz();
      });
    }

    if (CONFIG.EXIT_SHEET === 'on') {
      document.getElementById('quiz-exit-btn').addEventListener('click', openExitSheet);
    }
  }

  function renderQuestion() {
    state.screen = 'quiz';
    saveState();
    renderQuiz();
  }

  function openExitSheet() {
    track('exit_sheet_open', {});
    var wrapper = document.createElement('div');
    wrapper.innerHTML = exitSheetHtml();
    document.body.appendChild(wrapper.firstElementChild);
    document.getElementById('exit-keep-going').addEventListener('click', function () {
      track('exit_sheet_continue', {});
      closeExitSheet();
    });
    document.getElementById('exit-leave').addEventListener('click', function () {
      track('exit_sheet_leave', {});
      closeExitSheet();
      clearState();
      state.currentIndex = 0;
      state.answers = [];
      renderLanding(true);
    });
  }

  function closeExitSheet() {
    var scrim = document.getElementById('exit-scrim');
    if (scrim) scrim.remove();
  }

  function handleAnswer(index) {
    if (questionTimerInterval) { clearInterval(questionTimerInterval); questionTimerInterval = null; }
    var q = state.questions[state.currentIndex];
    var timeMs = Date.now() - (state.questionStartTime || Date.now());
    var correct = !!(q.options[index] && q.options[index].correct);
    state.answers[state.currentIndex] = {
      id: q.id, type: q.type, difficulty: q.difficulty, correct: correct, timeMs: timeMs,
    };
    track('question_answered', {
      id: q.id, type: q.type, difficulty: q.difficulty, correct: correct, timeMs: timeMs, index: state.currentIndex,
    });
    saveState();

    if (CONFIG.AUTO_ADVANCE) {
      // 220ms so the selected state is visible before advancing. Safe against
      // funnel-qa's generic driver because the script now waits for data-qa-step to
      // change (polling), rather than re-clicking in a tight loop — see qa.js and
      // ai-log.md's "Funnel v4" entry for why a timed delay previously had to be removed.
      setTimeout(advance, 220);
    } else {
      var nextBtn = document.querySelector('[data-qa="next"]');
      if (nextBtn) nextBtn.removeAttribute('disabled');
    }
  }

  function advance() {
    if (state.currentIndex + 1 < state.questions.length) {
      state.currentIndex += 1;
      renderQuiz();
      saveState();
    } else {
      track('quiz_complete', {});
      state.score = computeScore();
      saveState();
      renderGate(true);
    }
  }

  // ================= GATE (+ analyzing overlay) =================
  // The gate's free/locked content varies by GATE_MODE; the header, report-includes
  // list, form and fine print are identical across all 3 modes so the only measurable
  // difference between control and a variant is this one flag.
  function gateTeaserHtml(score) {
    var mode = CONFIG.GATE_MODE;
    var topPct = 100 - score.percentile;

    if (mode === 'all_locked') {
      return '<div class="teaser-panel card-dark">' +
        '<span class="pill pill-green">✓ Your results are ready</span>' +
        '<div class="iq-chip"><p class="iq-chip-label">Your IQ</p><p class="iq-chip-value">' + score.iq + '</p></div>' +
        '<p class="teaser-percentile-line">Your percentile and full report are ready to unlock.</p>' +
      '</div>';
    }

    if (mode === 'score_free_report_gated') {
      return '<div class="teaser-panel card-dark">' +
        '<span class="pill pill-green">✓ Your results are ready</span>' +
        '<p class="teaser-free-label">Your score · free</p>' +
        '<div class="iq-chip"><p class="iq-chip-label">Your IQ</p><p class="iq-chip-value" style="filter:none">' + score.iq + '</p></div>' +
        bellCurveSvg(score.percentile) +
        '<p class="teaser-percentile-line">' + percentileText(score.percentile) + '</p>' +
      '</div>';
    }

    // 'teaser_locked' — control
    return '<div class="teaser-panel card-dark">' +
      '<span class="pill pill-green">✓ Your results are ready</span>' +
      '<p class="teaser-free-label">Free preview · estimate</p>' +
      '<p class="teaser-top-pct">Top ' + topPct + '%</p>' +
      '<div class="iq-chip"><p class="iq-chip-label">Your IQ</p><p class="iq-chip-value">' + score.iq + '</p></div>' +
      bellCurveSvg(score.percentile) +
      '<p class="teaser-percentile-line">' + percentileText(score.percentile) + '</p>' +
    '</div>';
  }

  function reportIncludesHtml() {
    var items = ['Skill profile across 4 areas', 'Personal insights & tips', 'Shareable result card'];
    if (CONFIG.GATE_MODE !== 'score_free_report_gated') items.unshift('Your exact IQ score');
    return '<p class="report-includes-lead">Your free report includes</p>' +
      '<ul class="report-includes-list">' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
  }

  // A real, non-invented preview of the gated report: the user's own computed score,
  // skill accuracy and weakest-category tips, blurred to match whatever is actually
  // locked for the current GATE_MODE (the exact IQ is already free in
  // score_free_report_gated, so only that one piece stays unblurred there).
  function signupPreviewHtml(score) {
    var insights = computeInsights(score);
    var band = iqBand(score.iq);
    var scoreLocked = CONFIG.GATE_MODE !== 'score_free_report_gated';
    var tips = (TIPS[insights.weakestKey] || []).slice(0, 3);
    var barsHtml = ARCHETYPE_PRIORITY.map(function (key) {
      var t = score.byType[key];
      var pct = t && t.total ? Math.round((t.correct / t.total) * 100) : 0;
      return '<div class="signup-preview-bar"><div class="signup-preview-bar-fill" style="width:' + pct + '%"></div></div>';
    }).join('');
    return '<div class="signup-preview">' +
      '<p class="signup-preview-lead">What you unlock</p>' +
      '<div class="signup-preview-card">' +
        '<div class="signup-preview-top">' +
          '<span class="signup-preview-iq"' + (scoreLocked ? ' style="filter:blur(5px)"' : '') + '>' + score.iq + '</span>' +
          '<span class="band-chip">' + band.label + '</span>' +
        '</div>' +
        '<div class="signup-preview-bars" style="filter:blur(3px)">' + barsHtml + '</div>' +
        (tips.length ? '<div class="signup-preview-tips" style="filter:blur(3px)">' +
          tips.map(function (t) { return '<p>→ ' + t + '</p>'; }).join('') +
        '</div>' : '') +
        '<div class="signup-preview-sharecard" style="filter:blur(3px)">' +
          '<span class="signup-preview-sharecard-iq">' + score.iq + '</span>' +
          '<span class="signup-preview-sharecard-label">' + score.archetype.name + ' · Shareable result card</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function analyzingOverlayHtml() {
    return '<div class="analyzing-overlay" id="analyzing-overlay">' +
      '<div class="analyzing-inner">' +
        '<span class="pill pill-green">✓ ' + state.questions.length + '/' + state.questions.length + ' answered</span>' +
        '<h2 class="analyzing-title">Calculating your results…</h2>' +
        '<div class="analyzing-track"><div class="analyzing-fill" id="analyzing-fill" style="width:0%"></div></div>' +
        '<div class="analyzing-steps" id="analyzing-steps">' +
          '<div class="analyzing-step" data-step="0"><span class="analyzing-dot">1</span><span>Scoring your ' + state.questions.length + ' answers</span></div>' +
          '<div class="analyzing-step" data-step="1"><span class="analyzing-dot">2</span><span>Adding your speed bonus</span></div>' +
          '<div class="analyzing-step" data-step="2"><span class="analyzing-dot">3</span><span>Building your skill profile</span></div>' +
          '<div class="analyzing-step" data-step="3"><span class="analyzing-dot">4</span><span>Estimating your percentile</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // The "analyzing" moment is an overlay on top of the already-rendered gate screen (not
  // a separate timed screen) so data-qa="email"/"submit" exist in the DOM the instant the
  // quiz completes, even though they're visually covered for ANALYZING_DURATION_MS. A
  // separate timed screen would leave a window where funnel-qa's one-shot email-visibility
  // check finds neither an answer nor an email field, stalling it before it ever reaches
  // signup/result (see ai-log.md, 2026-11-06).
  function renderGate(showAnalyzing) {
    state.screen = 'gate';
    saveState();
    track('gate_view', {});
    var score = state.score;
    var total = state.questions.length;
    var gateProgressPct = Math.round(((total + 1) / (total + 2)) * 100);
    var scoreAlreadyFree = CONFIG.GATE_MODE === 'score_free_report_gated';
    var gateHeading = scoreAlreadyFree ? 'Unlock your full report, free' : 'Unlock your exact IQ score, free';
    var submitLabel = scoreAlreadyFree ? 'Get Results & Insights →' : 'Show My IQ Score →';

    render(
      '<main class="screen screen-gate"><div class="container">' +
        (showAnalyzing ? analyzingOverlayHtml() : '') +
        '<div class="header-bar">' +
          '<span class="brand">' + logoChipHtml() + '<span class="brand-name">Last step</span></span>' +
        '</div>' +
        '<div class="gate-progress-track"><div class="gate-progress-fill" style="width:' + gateProgressPct + '%"></div></div>' +
        '<div class="gate-layout">' +
          gateTeaserHtml(score) +
          '<div class="form-panel">' +
            '<h2>' + gateHeading + '</h2>' +
            '<button type="button" class="btn btn-outline" id="google-signup-btn"' + (showAnalyzing ? ' disabled' : '') + '>' +
              '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style="margin-right:8px;vertical-align:-4px;"><circle cx="9" cy="9" r="7.3" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="9" y="12.5" text-anchor="middle" font-size="9" font-weight="800" fill="currentColor">G</text></svg>' +
              'Continue with Google' +
            '</button>' +
            '<p class="google-demo-note">Prototype demo: no data is sent.</p>' +
            '<div class="auth-divider"><span>or</span></div>' +
            '<form id="gate-form" novalidate>' +
              '<label for="email-input" class="field-label">Your email</label>' +
              '<input id="email-input" type="email" placeholder="you@example.com" data-qa="email" autocomplete="email" required' +
                (showAnalyzing ? ' disabled' : '') + ' />' +
              '<p class="field-error" id="email-error" hidden>Please enter a valid email so we can show your score.</p>' +
              '<button type="submit" class="btn btn-cta" data-qa="submit"' +
                (showAnalyzing ? ' disabled' : '') + '>' + submitLabel + '</button>' +
            '</form>' +
            '<p class="form-cta-note">Free · No credit card · No spam</p>' +
            signupPreviewHtml(score) +
            reportIncludesHtml() +
            '<p class="gate-heads-up">Your answers are only stored on this device. Add your email to keep your results and retake later.</p>' +
          '</div>' +
        '</div>' +
      '</div></main>'
    );

    if (showAnalyzing) {
      var stepEls = Array.prototype.slice.call(document.querySelectorAll('.analyzing-step'));
      var fillEl = document.getElementById('analyzing-fill');
      var stepMs = Math.max(1, Math.floor(CONFIG.ANALYZING_DURATION_MS / 4));
      var step = 0;
      var interval = setInterval(function () {
        if (stepEls[step]) stepEls[step].classList.add('is-done');
        step += 1;
        if (fillEl) fillEl.style.width = Math.min(100, Math.round((step / 4) * 100)) + '%';
        if (step >= 4) clearInterval(interval);
      }, stepMs);
      setTimeout(function () {
        clearInterval(interval);
        // Hide immediately, no opacity cross-fade: the overlay and the teaser panel
        // beneath it share the same --purple-deep background, so fading the overlay's
        // opacity made its text visibly ghost through the panel's matching-color
        // background for ~300ms (caught by persona review screenshots) instead of
        // reading as a clean reveal.
        var overlay = document.getElementById('analyzing-overlay');
        if (overlay) overlay.style.display = 'none';
        // Keep the form inert (including to keyboard/screen-reader focus) until the
        // overlay is actually gone, not just visually fading.
        var emailInput = document.getElementById('email-input');
        var submitBtn = document.querySelector('[data-qa="submit"]');
        var googleBtn = document.getElementById('google-signup-btn');
        if (emailInput) emailInput.removeAttribute('disabled');
        if (submitBtn) submitBtn.removeAttribute('disabled');
        if (googleBtn) googleBtn.removeAttribute('disabled');
      }, CONFIG.ANALYZING_DURATION_MS);
    }

    document.getElementById('gate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('email-input');
      var errorEl = document.getElementById('email-error');
      var value = input.value.trim();
      track('signup_submit', { method: 'email' });
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!valid) {
        errorEl.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        return;
      }
      errorEl.hidden = true;
      state.email = value;
      state.signupMethod = 'email';
      track('signup_success', { method: 'email' });
      renderResults();
    });

    // Prototype only: no real Google OAuth is possible from a zero-backend, zero-
    // external-request static file, so this never claims to verify anything — the
    // results screen explicitly discloses "Prototype demo: no data sent." Deliberately
    // not data-qa="submit": the email path stays the one funnel-qa drives by default.
    var googleSignupBtn = document.getElementById('google-signup-btn');
    if (googleSignupBtn) {
      googleSignupBtn.addEventListener('click', function () {
        if (googleSignupBtn.disabled) return;
        googleSignupBtn.disabled = true;
        googleSignupBtn.textContent = 'Connecting…';
        track('signup_submit', { method: 'google' });
        setTimeout(function () {
          state.signupMethod = 'google';
          track('signup_success', { method: 'google' });
          renderResults();
        }, 700);
      });
    }
  }

  // ================= RESULTS =================
  function copyToClipboard(text, onDone) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { onDone(true); }).catch(function () { onDone(execCommandCopy(text)); });
        return;
      }
    } catch (e) {}
    onDone(execCommandCopy(text));
  }

  function execCommandCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function shareText(score) {
    return 'I scored ' + score.iq + ' on the IQly free IQ test. Think you can beat me?';
  }

  // Draws a simple, honest share card client-side (no backend, no external requests):
  // brand mark, the user's real score, their derived archetype. Nothing is invented.
  function generateShareCardDataUrl(score) {
    var canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FBFAFF';
    ctx.fillRect(0, 0, 1080, 1080);

    ctx.strokeStyle = '#5A3FD8';
    ctx.lineWidth = 16;
    ctx.beginPath(); ctx.arc(540, 220, 90, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(540, 220, 50, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#FFD24A';
    ctx.beginPath(); ctx.arc(540, 220, 14, 0, Math.PI * 2); ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#5A3FD8';
    ctx.font = '700 40px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillText('IQLY', 540, 360);

    ctx.fillStyle = '#1B1530';
    ctx.font = '800 220px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillText(String(score.iq), 540, 620);

    ctx.fillStyle = '#24154F';
    ctx.font = '700 48px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillText(score.archetype.name, 540, 700);

    ctx.fillStyle = '#5D5775';
    ctx.font = '400 32px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillText('Higher than an estimated ' + score.percentile + '% of people', 540, 760);

    ctx.font = '400 28px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillText('Free IQ test at IQly', 540, 980);

    return canvas.toDataURL('image/png');
  }

  function openShareSheet(score, cta) {
    var hasNativeShare = typeof navigator.share === 'function';
    var wrapper = document.createElement('div');
    wrapper.innerHTML =
      '<div class="share-scrim" id="share-scrim">' +
        '<div class="share-sheet">' +
          '<div class="share-sheet-dark">' +
            '<p class="iq-label">Your estimated IQ</p>' +
            '<p style="font-size:40px;font-weight:800;margin:0 0 4px;">' + score.iq + '</p>' +
            '<p style="color:#C9BCFF;font-size:13px;margin:0;">' + score.archetype.name + ' · higher than an estimated ' + score.percentile + '% of people</p>' +
          '</div>' +
          '<div class="share-sheet-grid">' +
            '<button class="share-channel-btn" id="share-download">Download image</button>' +
            '<button class="share-channel-btn" id="share-copy">Copy link</button>' +
            '<button class="share-channel-btn" id="share-whatsapp"' + (hasNativeShare ? '' : ' disabled') + '>WhatsApp</button>' +
            '<button class="share-channel-btn" id="share-messages"' + (hasNativeShare ? '' : ' disabled') + '>Messages</button>' +
            '<button class="share-channel-btn" id="share-x"' + (hasNativeShare ? '' : ' disabled') + '>X</button>' +
            '<button class="share-channel-btn" id="share-email"' + (hasNativeShare ? '' : ' disabled') + '>Email</button>' +
          '</div>' +
          '<p class="share-feedback" id="share-sheet-feedback" hidden></p>' +
          '<button class="share-sheet-close" id="share-sheet-close">Close</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrapper.firstElementChild);

    var feedbackEl = document.getElementById('share-sheet-feedback');
    function showFeedback(msg) { feedbackEl.textContent = msg; feedbackEl.hidden = false; }

    document.getElementById('share-scrim').addEventListener('click', function (e) {
      if (e.target.id === 'share-scrim') closeShareSheet();
    });
    document.getElementById('share-sheet-close').addEventListener('click', closeShareSheet);

    document.getElementById('share-download').addEventListener('click', function () {
      track('share_click', { method: 'download', cta: cta });
      try {
        var dataUrl = generateShareCardDataUrl(score);
        var a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'iqly-score-card.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showFeedback('Downloaded ✓');
      } catch (e) {
        showFeedback('Could not generate the card on this device.');
      }
    });

    document.getElementById('share-copy').addEventListener('click', function () {
      track('share_click', { method: 'copy_link', cta: cta });
      var text = shareText(score) + (CONFIG.SHARE_URL ? ' ' + CONFIG.SHARE_URL : '');
      copyToClipboard(text, function (ok) {
        showFeedback(ok ? 'Copied ✓' : 'Could not copy — please copy manually.');
      });
    });

    ['whatsapp', 'messages', 'x', 'email'].forEach(function (channel) {
      var el = document.getElementById('share-' + channel);
      if (!el || !hasNativeShare) return;
      el.addEventListener('click', function () {
        track('share_click', { method: channel, cta: cta });
        try {
          navigator.share({ text: shareText(score) + (CONFIG.SHARE_URL ? ' ' + CONFIG.SHARE_URL : '') });
        } catch (e) {}
      });
    });
  }

  function closeShareSheet() {
    var scrim = document.getElementById('share-scrim');
    if (scrim) scrim.remove();
  }

  function animateCountUp(el, target) {
    var prefersReduced = false;
    try { prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (prefersReduced) { el.textContent = String(target); return; }
    var current = Math.max(0, target - 30);
    el.textContent = String(current);
    var interval = setInterval(function () {
      current += 2;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      el.textContent = String(current);
    }, 30);
  }

  function renderResults() {
    state.screen = 'results';
    saveState();
    track('result_view', {});
    var score = state.score;
    var insights = computeInsights(score);
    var band = iqBand(score.iq);
    var weakestLabel = insights.weakestKey ? (TYPE_LABELS[insights.weakestKey] || insights.weakestKey) : '';
    var strongestLabel = insights.strongestKey ? (TYPE_LABELS[insights.strongestKey] || insights.strongestKey) : '';
    var strongestType = insights.strongestKey ? score.byType[insights.strongestKey] : null;
    var weakestType = insights.weakestKey ? score.byType[insights.weakestKey] : null;

    var bandSegHtml = [1, 2, 1, 1, 1].map(function (flex, i) {
      return '<span class="band-seg' + (i === band.index ? ' is-active' : '') + '" style="flex:' + flex + '"></span>';
    }).join('');

    var skillRowsHtml = Object.keys(score.byType).map(function (key) {
      var t = score.byType[key];
      var pct = Math.round((t.correct / t.total) * 100);
      var tone = key === insights.strongestKey ? 'green' : (key === insights.weakestKey ? 'yellow' : 'purple');
      return '<div class="skill-row">' +
        '<div class="skill-row-head"><span>' + t.label + '</span><span>' + t.correct + '/' + t.total + '</span></div>' +
        '<div class="skill-track"><div class="skill-fill tone-' + tone + '" style="width:' + pct + '%"></div></div>' +
      '</div>';
    }).join('');

    var tipsHtml = (TIPS[insights.weakestKey] || []).map(function (tip) { return '<li>' + tip + '</li>'; }).join('');

    render(
      '<main class="screen screen-results"><div class="container">' +
        '<div class="header-bar">' +
          '<span class="brand">' + logoChipHtml() + '<span class="brand-name">IQly</span></span>' +
          (CONFIG.SHARE_ENABLED ? '<button class="pill pill-purple-tint" id="share-pill" style="border:none;cursor:pointer;">Share my score ↗</button>' : '') +
        '</div>' +
        (state.signupMethod === 'google' ?
          '<div class="account-strip">✓ Signed in with Google (demo). <span class="account-strip-note">Prototype demo: no data sent.</span></div>' :
          '<div class="account-strip">✓ Account created. Your report is saved to ' + (state.email || 'your email') + '.</div>'
        ) +
        '<div class="results-hero">' +
          '<div class="results-hero-left">' +
            '<p class="iq-label">Your estimated IQ</p>' +
            '<p class="iq-countup" id="iq-countup">0</p>' +
            '<span class="band-chip">' + band.label + '</span>' +
            '<p class="hero-percentile-line">Higher than an estimated <strong>' + score.percentile + '%</strong> of people</p>' +
            '<div class="band-bar">' + bandSegHtml + '</div>' +
            '<p class="band-fact">About two-thirds of estimated scores on this test fall between 85 and 115.</p>' +
          '</div>' +
          '<div class="results-hero-right">' +
            '<div class="score-card">' +
              logoChipHtml() +
              '<p class="score-card-label">SCORE CARD</p>' +
              '<p class="score-card-iq">' + score.iq + '</p>' +
              '<span class="score-card-archetype">' + score.archetype.name + '</span>' +
              '<p class="score-card-line">Higher than an est. ' + score.percentile + '% of people · Can you beat it?</p>' +
              (CONFIG.SHARE_ENABLED ? '<button class="btn btn-cta" id="share-card-btn">Share My Score</button>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<p class="scoring-note">This is an indicative score for entertainment purposes, not a clinical assessment. Accuracy matters most; speed counts a little' +
          (CONFIG.TIMER_MODE === 'per_question' ? ' — each question had its own timer, but it never cut off an answer or marked one wrong, it only tracked pace' : '') +
          '.</p>' +
        '<div class="insight-cards">' +
          '<div class="insight-card tone-green"><p class="insight-title">Your edge</p><p class="insight-body">' + strongestLabel + (strongestType ? ' (' + strongestType.correct + '/' + strongestType.total + ')' : '') + ' — ' + score.archetype.name + '</p></div>' +
          '<div class="insight-card tone-yellow"><p class="insight-title">Room to grow</p><p class="insight-body">' + weakestLabel + (weakestType ? ': ' + weakestType.correct + '/' + weakestType.total + ' correct' : '') + '</p></div>' +
          '<div class="insight-card tone-purple"><p class="insight-title">Your pace</p><p class="insight-body">~' + insights.avgSeconds + 's per question · ' + insights.hardestSolved + '/' + insights.hardestTotal + ' hardest items solved</p></div>' +
        '</div>' +
        '<div class="skill-section"><h2>Skill profile</h2>' + skillRowsHtml + '</div>' +
        (weakestLabel ? '<div class="tips-section"><h2>Sharpen your ' + weakestLabel + '</h2><ul class="tips-list">' + tipsHtml + '</ul></div>' : '') +
        '<div class="challenge-banner">' +
          '<h2>Think a friend can beat ' + score.iq + '?</h2>' +
          '<div class="result-actions">' +
            (CONFIG.SHARE_ENABLED ? '<button class="btn btn-cta-dark" id="challenge-btn">Challenge a Friend →</button>' : '') +
            '<button class="btn btn-outline" id="retake-btn">Retake the Test</button>' +
          '</div>' +
        '</div>' +
        '<p class="share-feedback" id="share-feedback" hidden></p>' +
      '</div></main>'
    );

    animateCountUp(document.getElementById('iq-countup'), score.iq);

    if (CONFIG.SHARE_ENABLED) {
      var challengeBtn = document.getElementById('challenge-btn');
      if (challengeBtn) challengeBtn.addEventListener('click', function () { openShareSheet(score, 'challenge'); });
      ['share-pill', 'share-card-btn'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', function () { openShareSheet(score, 'share'); });
      });
    }

    document.getElementById('retake-btn').addEventListener('click', function () {
      clearState();
      state.currentIndex = 0;
      state.answers = [];
      state.score = null;
      renderLanding(true);
    });
  }

  // ---- init / resume ----
  function init() {
    var saved = loadState();
    if (saved && saved.screen && saved.screen !== 'landing') {
      state.currentIndex = saved.currentIndex || 0;
      state.answers = saved.answers || [];
      if (saved.screen === 'quiz') {
        state.screen = 'quiz';
        renderQuiz();
      } else if (saved.screen === 'gate') {
        state.score = computeScore();
        renderGate(false);
      } else if (saved.screen === 'results') {
        state.score = computeScore();
        renderResults();
      } else {
        renderLanding(true);
      }
    } else {
      renderLanding(true);
    }
  }

  init();
})();
