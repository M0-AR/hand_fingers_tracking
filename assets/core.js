(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const SA = (window.SA = window.SA || {});

  const store = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* storage may be unavailable */
      }
    },
  };

  /* ---------------------------------------------------------------- toast */

  const toastEl = $('#toast');
  let toastTimer = 0;

  function toast(message, duration = 3200) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), duration);
  }

  SA.toast = toast;

  /* ------------------------------------------------------------- year/nav */

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const nav = $('#nav');
  const progress = $('#scroll-progress');
  let scrollQueued = false;

  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(() => {
      scrollQueued = false;
      const top = window.scrollY || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = `${height > 0 ? Math.min(100, (top / height) * 100) : 0}%`;
      if (nav) nav.classList.toggle('scrolled', top > 24);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------------- menu */

  const menuBtn = $('#menu-btn');
  const navLinks = $('#nav-links');

  function setMenu(open) {
    if (!menuBtn || !navLinks) return;
    navLinks.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  }

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
    navLinks.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('click', (event) => {
      if (!navLinks.classList.contains('open')) return;
      if (!event.target.closest('.nav')) setMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setMenu(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 980) setMenu(false);
    });
  }

  /* -------------------------------------------------------------- reveal */

  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -7% 0px', threshold: 0.06 },
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* --------------------------------------------------------------- copy */

  $$('.copy-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const block = button.closest('.code-block');
      const code = block ? $('pre code', block) : null;
      if (!code) return;
      const text = code.textContent || '';
      let copied = false;

      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        try {
          copied = document.execCommand('copy');
        } catch {
          copied = false;
        }
        area.remove();
      }

      const label = button.textContent;
      button.textContent = copied ? 'Copied' : 'Select';
      toast(copied ? 'Code copied to clipboard.' : 'Copy blocked by the browser. Select the code manually.');
      window.setTimeout(() => {
        button.textContent = label;
      }, 1800);
    });
  });

  /* ------------------------------------------------------- scene switch */

  $$('.scene-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.scene-tab').forEach((other) => {
        const active = other === tab;
        other.classList.toggle('active', active);
        other.setAttribute('aria-selected', String(active));
      });
      document.dispatchEvent(new CustomEvent('sa:scene', { detail: tab.dataset.scene || 'holo' }));
    });
  });

  /* --------------------------------------------------- control-list pulse */

  $$('.control-list li').forEach((item) => {
    item.addEventListener('click', () => {
      $$('.control-list li').forEach((other) => other.classList.remove('active'));
      item.classList.add('active');
      window.clearTimeout(item._pulseTimer);
      item._pulseTimer = window.setTimeout(() => item.classList.remove('active'), 1500);
      document.dispatchEvent(new CustomEvent('sa:signal', { detail: item.dataset.signal || '' }));
    });
  });

  /* ------------------------------------------------------- architecture */

  const LAYERS = [
    {
      kicker: 'LAYER 01',
      title: 'Input',
      body:
        'The system starts with what you already have: a standard RGB webcam. The optional BLE path reads an IMU sensor for prototyping. Mouse and keyboard are always available as a fallback, so a failed camera never blocks the user.',
      points: [
        'Webcam at 30 fps, processed locally.',
        'BLE IMU packets parsed as a legacy bridge.',
        'Mouse and keyboard never removed.',
      ],
      files: 'main.py · device_model.py',
    },
    {
      kicker: 'LAYER 02',
      title: 'Perception',
      body:
        'A hand model turns each RGB frame into 21 normalized landmarks and a handedness label. The browser demo runs the model inside the tab; the Python demos use the MediaPipe SDK. Coordinates are image-relative, not metric measurements.',
      points: [
        '21 landmarks per hand at a 30 fps target.',
        'Raw landmarks are kept; smoothing happens later.',
        'Handedness helps disambiguate left from right.',
      ],
      files: 'main.py · control_each_single_point.py',
    },
    {
      kicker: 'LAYER 03',
      title: 'Signal engine',
      body:
        'Normalized geometry becomes three stable signals: pinch ratio, openness, and wrist rotation. Hysteresis and adaptive smoothing keep those signals from flickering when the hand hovers near a threshold.',
      points: [
        'Pinch = thumb–index gap ÷ palm length.',
        'Openness = mean fingertip reach ÷ palm length.',
        'Rotation = wrist-to-middle-knuckle angle.',
      ],
      files: 'control_each_single_point_with_rotation.py',
    },
    {
      kicker: 'LAYER 04',
      title: 'Adapters',
      body:
        'Signals are translated into actions. The browser demo drives a 3D scene. The Python adapter can emulate a mouse, publish over a socket, or send BLE commands through the legacy bridge. Each adapter is deliberately replaceable.',
      points: [
        'Mouse and keyboard remain the default fallback.',
        'The BLE bridge is for prototyping, not clinical use.',
        'Adapters can be swapped without touching perception.',
      ],
      files: 'device_model.py · left/right demo',
    },
    {
      kicker: 'LAYER 05',
      title: 'Applications',
      body:
        'The perception layer does not care what the hand controls. The same signals can drive imaging review, simulation, training, or accessibility tools — provided the deployment is validated for its intended use.',
      points: [
        'Imaging and simulation prototypes.',
        'Hands-busy and sterile-field workflows.',
        'Validation and risk management are separate work.',
      ],
      files: 'README.md · research links',
    },
  ];

  const archDetail = $('#arch-detail');
  const archKicker = $('#arch-kicker');
  const archTitle = $('#arch-title');
  const archBody = $('#arch-body');
  const archPoints = $('#arch-points');
  const archFiles = $('.arch-files code');

  function renderLayer(index) {
    const layer = LAYERS[index];
    if (!layer || !archDetail) return;
    if (archKicker) archKicker.textContent = layer.kicker;
    if (archTitle) archTitle.textContent = layer.title;
    if (archBody) archBody.textContent = layer.body;
    if (archPoints) {
      archPoints.textContent = '';
      layer.points.forEach((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        archPoints.appendChild(li);
      });
    }
    if (archFiles) archFiles.textContent = layer.files;

    $$('.arch-layer').forEach((button) => {
      const active = Number(button.dataset.layer) === index;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  $$('.arch-layer').forEach((button) => {
    button.addEventListener('click', () => renderLayer(Number(button.dataset.layer)));
  });
  if ($('.arch-layer')) renderLayer(0);

  /* ------------------------------------------------------------- learning */

  const LEARN_KEY = 'sa_learn_v1';
  const levelBoxes = $$('.level-check');
  const learnLabel = $('#learn-progress-label');
  const learnBar = $('#learn-progress');

  function updateLearning() {
    if (!levelBoxes.length) return;
    const done = levelBoxes.filter((box) => box.checked).length;
    const percent = Math.round((done / levelBoxes.length) * 100);
    if (learnLabel) learnLabel.textContent = `${percent}%`;
    if (learnBar) learnBar.style.width = `${percent}%`;
  }

  if (levelBoxes.length) {
    const saved = store.get(LEARN_KEY, {});
    levelBoxes.forEach((box) => {
      box.checked = Boolean(saved[box.dataset.level]);
      box.addEventListener('change', () => {
        const state = {};
        levelBoxes.forEach((other) => {
          if (other.checked) state[other.dataset.level] = true;
        });
        store.set(LEARN_KEY, state);
        updateLearning();
        if (box.checked) {
          const level = box.closest('.level');
          const title = level ? $('.level-title b', level) : null;
          toast(`Level complete${title ? `: ${title.textContent}` : ''}. Progress saved on this device.`);
        }
      });
    });
    updateLearning();
  }

  /* ----------------------------------------------------------------- quiz */

  const QUESTIONS = [
    {
      question: 'How many landmarks does a single-hand model return?',
      options: ['5', '15', '21', '42'],
      answer: 2,
      explain:
        'Twenty-one: one wrist plus four joints for each of the five fingers. The model returns them for every frame it sees a hand.',
    },
    {
      question: 'Which landmark is the wrist — the anchor for hand size?',
      options: ['0', '4', '9', '20'],
      answer: 0,
      explain:
        'Landmark 0 is the wrist. Landmark 9 is the middle knuckle, and 4, 8, 12, 16 and 20 are the five fingertips.',
    },
    {
      question: 'Why divide the thumb–index gap by the wrist-to-middle-knuckle distance?',
      options: [
        'To convert pixels into centimetres',
        'To make the gesture independent of hand size and distance from the camera',
        'To remove the need for a camera',
        'To estimate heart rate',
      ],
      answer: 1,
      explain:
        'Dividing by a hand-relative length makes the pinch ratio scale-invariant. A child and an adult, close or far, produce comparable numbers.',
    },
    {
      question: 'What problem does hysteresis solve?',
      options: [
        'Network latency',
        'Flicker when a signal hovers near a threshold',
        'Battery drain',
        'Colour calibration',
      ],
      answer: 1,
      explain:
        'Hysteresis uses two thresholds: one to enter a state and a different one to leave it. The gap stops a noisy signal from rapidly toggling the interface.',
    },
    {
      question: 'What does the z coordinate from an RGB hand model represent?',
      options: [
        'Precise millimetres',
        'Relative depth, not calibrated distance',
        'Time since the last frame',
        'Hand temperature',
      ],
      answer: 1,
      explain:
        'z is estimated relative depth. It is useful for ordering points and adding parallax, but it is not a calibrated distance in centimetres.',
    },
    {
      question: 'What is the safest default when camera tracking fails?',
      options: [
        'Block the whole application',
        'Hide the error',
        'Keep mouse and keyboard available',
        'Restart the computer',
      ],
      answer: 2,
      explain:
        'A failed camera must never remove the user’s ability to act. Mouse, keyboard, or touch should always remain as an explicit fallback.',
    },
    {
      question: 'What does the One Euro filter do?',
      options: [
        'Encrypts video',
        'Adaptive smoothing — stable when still, responsive when fast',
        'Detects faces',
        'Compresses 3D models',
      ],
      answer: 1,
      explain:
        'The One Euro filter tunes its cutoff with speed. Slow movement gets strong smoothing; fast movement gets less lag. It is the canonical fix for pointer jitter.',
    },
    {
      question: 'Where does the browser lab process your camera frames?',
      options: [
        'On a remote GPU server',
        'Inside the browser tab, on your device',
        'In the GitHub repository',
        'On the BLE sensor',
      ],
      answer: 1,
      explain:
        'Inference runs locally in the tab. The model files are downloaded from a public CDN, but your video frames are not uploaded.',
    },
    {
      question: 'Which claim can this repository honestly support today?',
      options: [
        'It improves surgical outcomes',
        'It is a certified medical device',
        'It can infer 21 hand landmarks from RGB frames',
        'It measures sub-millimetre precision',
      ],
      answer: 2,
      explain:
        'The repository demonstrates landmark inference and interaction prototyping. It has no clinical study, no regulatory clearance, and no metric-precision claim.',
    },
    {
      question: 'What is the correct next step before any clinical deployment?',
      options: [
        'Publish a press release',
        'Formal validation, risk management, and usability testing',
        'Add more animations',
        'Remove the safety notice',
      ],
      answer: 1,
      explain:
        'Clinical use requires a quality-management process, risk analysis, usability engineering, privacy review, and validation against the intended use. A demo is not evidence.',
    },
  ];

  const quizCard = $('#quiz-card');
  const quizResult = $('#quiz-result');
  const quizCount = $('#quiz-count');
  const quizScore = $('#quiz-score');
  const quizProgress = $('#quiz-progress');
  const quizQuestion = $('#quiz-question');
  const quizOptions = $('#quiz-options');
  const quizFeedback = $('#quiz-feedback');
  const quizNext = $('#quiz-next');
  const quizRestart = $('#quiz-restart');
  const resultScore = $('#result-score');
  const resultBadge = $('#result-badge');
  const resultText = $('#result-text');
  const BEST_KEY = 'sa_quiz_best_v1';

  let quizIndex = 0;
  let quizPoints = 0;
  let quizAnswered = false;

  function renderQuestion() {
    if (!quizOptions || !quizQuestion) return;
    const item = QUESTIONS[quizIndex];
    quizAnswered = false;

    if (quizCount) quizCount.textContent = `Question ${quizIndex + 1} of ${QUESTIONS.length}`;
    if (quizScore) quizScore.textContent = `Score ${quizPoints}`;
    if (quizProgress) quizProgress.style.width = `${(quizIndex / QUESTIONS.length) * 100}%`;
    quizQuestion.textContent = item.question;

    quizOptions.textContent = '';
    item.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quiz-option';
      const letter = document.createElement('span');
      letter.className = 'letter';
      letter.textContent = String.fromCharCode(65 + index);
      const label = document.createElement('span');
      label.textContent = option;
      button.append(letter, label);
      button.addEventListener('click', () => answerQuestion(index));
      quizOptions.appendChild(button);
    });

    if (quizFeedback) {
      quizFeedback.hidden = true;
      quizFeedback.textContent = '';
    }
    if (quizNext) {
      quizNext.hidden = true;
      quizNext.textContent = quizIndex === QUESTIONS.length - 1 ? 'See result' : 'Next question';
    }
    if (quizRestart) quizRestart.hidden = quizIndex === 0;
  }

  function answerQuestion(choice) {
    if (quizAnswered) return;
    quizAnswered = true;
    const item = QUESTIONS[quizIndex];
    const correct = choice === item.answer;
    if (correct) quizPoints += 1;

    $$('.quiz-option', quizOptions).forEach((button, index) => {
      button.disabled = true;
      if (index === item.answer) button.classList.add('correct');
      if (index === choice && !correct) button.classList.add('wrong');
    });

    if (quizScore) quizScore.textContent = `Score ${quizPoints}`;
    if (quizProgress) quizProgress.style.width = `${((quizIndex + 1) / QUESTIONS.length) * 100}%`;

    if (quizFeedback) {
      quizFeedback.hidden = false;
      quizFeedback.textContent = '';
      const strong = document.createElement('b');
      strong.textContent = correct ? 'Correct. ' : 'Not quite. ';
      quizFeedback.append(strong, document.createTextNode(item.explain));
    }
    if (quizNext) quizNext.hidden = false;
  }

  function nextQuestion() {
    if (!quizAnswered) return;
    if (quizIndex >= QUESTIONS.length - 1) {
      finishQuiz();
      return;
    }
    quizIndex += 1;
    renderQuestion();
  }

  function finishQuiz() {
    if (!quizCard || !quizResult) return;
    quizCard.hidden = true;
    quizResult.hidden = false;
    if (resultScore) resultScore.textContent = String(quizPoints);

    let badge = 'Curious beginner';
    let text =
      'Everyone starts here. Read Level 1 and Level 2, then come back — the score moves fast once the vocabulary clicks.';
    if (quizPoints === 10) {
      badge = 'Interview-ready';
      text =
        'You can explain the pipeline, the signal math, and the limits without hand-waving. That is the level most candidates reach only after shipping.';
    } else if (quizPoints === 9) {
      badge = 'Systems thinker';
      text =
        'One small gap, otherwise strong. Re-read the question you missed, then explain the answer to someone else — that is the real test.';
    } else if (quizPoints === 8) {
      badge = 'Strong foundation';
      text =
        'You have the foundation. The five levels will turn the missing pieces into instincts, especially the signal-quality material.';
    } else if (quizPoints >= 5) {
      badge = 'Explorer';
      text =
        'You understand the shape of the system. Work through the five levels with the quiz open, then try again — most people jump several points.';
    }

    if (resultBadge) resultBadge.textContent = badge;
    if (resultText) resultText.textContent = text;

    const best = Number(store.get(BEST_KEY, 0)) || 0;
    if (quizPoints > best) {
      store.set(BEST_KEY, quizPoints);
      if (quizPoints >= 8) toast(`New best: ${quizPoints}/10. Saved on this device.`);
    }
  }

  function restartQuiz() {
    quizIndex = 0;
    quizPoints = 0;
    quizAnswered = false;
    if (quizResult) quizResult.hidden = true;
    if (quizCard) quizCard.hidden = false;
    renderQuestion();
  }

  if (quizQuestion) renderQuestion();
  if (quizNext) quizNext.addEventListener('click', nextQuestion);
  if (quizRestart) quizRestart.addEventListener('click', restartQuiz);
  const resultRestart = $('#result-restart');
  if (resultRestart) resultRestart.addEventListener('click', restartQuiz);

  /* ------------------------------------------------------------------ ROI */

  const roiInputs = {
    procs: $('#roi-procs'),
    mins: $('#roi-mins'),
    cost: $('#roi-cost'),
    days: $('#roi-days'),
  };
  const roiOut = {
    procs: $('#roi-procs-out'),
    mins: $('#roi-mins-out'),
    cost: $('#roi-cost-out'),
    days: $('#roi-days-out'),
    value: $('#roi-value'),
    hours: $('#roi-hours'),
  };

  function money(value) {
    if (value >= 1e6) {
      const millions = value / 1e6;
      return `$${millions >= 10 ? millions.toFixed(0) : millions.toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (value >= 1e3) return `$${Math.round(value / 1e3).toLocaleString('en-US')}K`;
    return `$${Math.round(value).toLocaleString('en-US')}`;
  }

  function updateRoi() {
    if (!roiInputs.procs) return;
    const procs = Number(roiInputs.procs.value);
    const mins = Number(roiInputs.mins.value);
    const cost = Number(roiInputs.cost.value);
    const days = Number(roiInputs.days.value);
    const annual = procs * mins * cost * days;
    const hours = (procs * mins * days) / 60;

    if (roiOut.procs) roiOut.procs.textContent = String(procs);
    if (roiOut.mins) roiOut.mins.textContent = String(mins);
    if (roiOut.cost) roiOut.cost.textContent = `$${cost}`;
    if (roiOut.days) roiOut.days.textContent = String(days);
    if (roiOut.value) roiOut.value.textContent = money(annual);
    if (roiOut.hours) {
      roiOut.hours.textContent = `${Math.round(hours).toLocaleString('en-US')} hours of capacity returned`;
    }
  }

  if (roiInputs.procs) {
    Object.values(roiInputs).forEach((input) => {
      if (input) input.addEventListener('input', updateRoi);
    });
    updateRoi();
  }

  /* --------------------------------------------------------- neural link */

  const CONCEPTS = [
    { name: 'Landmark', note: 'A named point on the hand. Twenty-one of them describe a pose.' },
    { name: 'Wrist anchor', note: 'Landmark 0 anchors every distance and angle calculation.' },
    { name: 'Hand size', note: 'Normalizing by palm length makes gestures scale-invariant.' },
    { name: 'Pinch ratio', note: 'Thumb-to-index gap divided by hand size — a stable, simple signal.' },
    { name: 'Hysteresis', note: 'Two thresholds prevent flicker when a signal sits near the boundary.' },
    { name: 'One Euro filter', note: 'Adaptive smoothing: steady when still, responsive when moving fast.' },
    { name: 'Relative depth', note: 'z is estimated depth, not centimetres. Never use it as a measurement.' },
    { name: 'Latency', note: 'Every frame of delay is felt. Keep the perception-to-action loop short.' },
    { name: 'Fallback', note: 'Mouse and keyboard must stay available when tracking fails.' },
    { name: 'On-device', note: 'Process frames locally. Upload nothing by default.' },
    { name: 'Confirmation', note: 'If an action is risky, require a deliberate second gesture.' },
    { name: 'Validation', note: 'A prototype becomes a product only after measured studies.' },
  ];
  SA.concepts = CONCEPTS;

  const neuralCanvas = $('#neural-canvas');
  const neuralCount = $('#neural-count');
  const neuralLog = $('#neural-log');
  const conceptPop = $('#concept-pop');
  const narrator = $('#narrator');
  const unlocked = new Set();
  let popTimer = 0;
  let neuralVisible = true;
  let neuralCtx = null;
  let neuralSize = { w: 0, h: 0, dpr: 1 };

  const nodeLayout = Array.from({ length: CONCEPTS.length }, (_, index) => {
    const angle = index * 2.399963 + 0.55;
    const radius = 0.24 + ((index * 37) % 5) * 0.035;
    return {
      x: 0.5 + Math.cos(angle) * radius * 0.86,
      y: 0.5 + Math.sin(angle) * radius * 0.74,
    };
  });

  function updateNeuralCount() {
    if (neuralCount) neuralCount.textContent = `${unlocked.size} / ${CONCEPTS.length}`;
  }

  function resizeNeural() {
    if (!neuralCanvas) return;
    const rect = neuralCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (rect.width < 2 || rect.height < 2) return;
    neuralSize = { w: rect.width, h: rect.height, dpr };
    neuralCanvas.width = Math.round(rect.width * dpr);
    neuralCanvas.height = Math.round(rect.height * dpr);
    if (!neuralCtx) neuralCtx = neuralCanvas.getContext('2d');
    if (neuralCtx) neuralCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawNeural(now) {
    if (!neuralCanvas || !neuralCtx || !neuralVisible || document.hidden) return;
    const { w, h } = neuralSize;
    if (w < 2 || h < 2) return;
    const ctx = neuralCtx;
    const t = now / 1000;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(53, 224, 208, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(76, 141, 255, 0.06)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.22, 0, Math.PI * 2);
    ctx.stroke();

    const hub = { x: w / 2, y: h / 2 };
    const points = nodeLayout.map((p) => ({ x: p.x * w, y: p.y * h }));

    points.forEach((point, index) => {
      const active = unlocked.has(index);
      ctx.beginPath();
      ctx.moveTo(hub.x, hub.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = active ? 'rgba(53, 224, 208, 0.32)' : 'rgba(255, 255, 255, 0.045)';
      ctx.lineWidth = active ? 1.2 : 0.7;
      ctx.stroke();
    });

    const ordered = Array.from(unlocked).sort((a, b) => a - b);
    for (let i = 1; i < ordered.length; i += 1) {
      const a = points[ordered[i - 1]];
      const b = points[ordered[i]];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(76, 141, 255, 0.28)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = 1; i < ordered.length; i += 1) {
      const a = points[ordered[i - 1]];
      const b = points[ordered[i]];
      const phase = (t * 0.45 + i * 0.23) % 1;
      ctx.beginPath();
      ctx.arc(a.x + (b.x - a.x) * phase, a.y + (b.y - a.y) * phase, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(143, 248, 238, 0.7)';
      ctx.fill();
    }

    points.forEach((point, index) => {
      const active = unlocked.has(index);
      const pulse = active ? 1 + Math.sin(t * 2.4 + index) * 0.12 : 1;
      ctx.beginPath();
      ctx.arc(point.x, point.y, (active ? 4.2 : 2.4) * pulse, 0, Math.PI * 2);
      if (active) {
        ctx.shadowColor = 'rgba(53, 224, 208, 0.85)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#8ff8ee';
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    ctx.beginPath();
    ctx.arc(hub.x, hub.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = unlocked.size ? '#35e0d0' : 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
  }

  if (neuralCanvas) {
    resizeNeural();
    if ('ResizeObserver' in window) new ResizeObserver(resizeNeural).observe(neuralCanvas);
    else window.addEventListener('resize', resizeNeural);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        (entries) => {
          neuralVisible = entries.some((entry) => entry.isIntersecting);
        },
        { threshold: 0.05 },
      ).observe(neuralCanvas);
    }
    const neuralLoop = (now) => {
      drawNeural(now);
      window.requestAnimationFrame(neuralLoop);
    };
    window.requestAnimationFrame(neuralLoop);
  }

  function speak(text) {
    if (!narrator || !narrator.checked || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.98;
      utterance.pitch = 1;
      utterance.lang = 'en-US';
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((voice) => /^en[-_]US/i.test(voice.lang)) || voices.find((voice) => /^en/i.test(voice.lang));
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
    } catch {
      /* speech is optional */
    }
  }

  function showConceptPop(concept) {
    if (!conceptPop) return;
    conceptPop.textContent = '';
    const strong = document.createElement('b');
    strong.textContent = concept.name;
    conceptPop.append(strong, document.createTextNode(` — ${concept.note}`));
    conceptPop.classList.add('show');
    window.clearTimeout(popTimer);
    popTimer = window.setTimeout(() => conceptPop.classList.remove('show'), 3800);
  }

  function resetConcepts() {
    unlocked.clear();
    updateNeuralCount();
    if (neuralLog) {
      neuralLog.textContent = '';
      const empty = document.createElement('p');
      empty.className = 'log-empty';
      empty.textContent = 'Pass rings to grow the network. Each ring teaches one idea.';
      neuralLog.appendChild(empty);
    }
    if (conceptPop) conceptPop.classList.remove('show');
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* optional */
      }
    }
  }

  SA.resetConcepts = resetConcepts;
  SA.getConceptCount = () => unlocked.size;

  SA.unlockConcept = (index) => {
    const concept = CONCEPTS[index];
    if (!concept || unlocked.has(index)) return false;
    unlocked.add(index);
    updateNeuralCount();

    if (neuralLog) {
      const empty = $('.log-empty', neuralLog);
      if (empty) empty.remove();
      const item = document.createElement('div');
      item.className = 'log-item';
      const title = document.createElement('b');
      title.textContent = `${String(index + 1).padStart(2, '0')} · ${concept.name}`;
      const note = document.createElement('span');
      note.textContent = concept.note;
      item.append(title, note);
      neuralLog.prepend(item);
      while (neuralLog.children.length > 12) neuralLog.lastElementChild.remove();
    }

    showConceptPop(concept);
    speak(`${concept.name}. ${concept.note}`);
    return true;
  };

  if (narrator) {
    narrator.addEventListener('change', () => {
      if (!narrator.checked && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* optional */
        }
      } else if (narrator.checked) {
        toast('Narrator on. Each new concept will be spoken aloud.');
      }
    });
  }

  updateNeuralCount();
  resetConcepts();
})();
