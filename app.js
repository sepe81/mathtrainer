/* ============================================================
   Math Trainer – Times Tables
   All state, quiz logic, and rendering.
   ============================================================ */

const STORAGE_KEY = 'mathtrainer_v1';

// ---------- State ----------
let stats = {};        // { "3x7": { correct: N, wrong: N }, … }
let activeFilters = new Set(['all']);  // 'all' or numbers as strings
let currentPair = null;  // [a, b]
let answerShown = false;

// ---------- Persistence ----------
function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    stats = raw ? JSON.parse(raw) : {};
  } catch (_) {
    stats = {};
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function statKey(a, b) {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return `${lo}x${hi}`;
}

function getEntry(a, b) {
  const k = statKey(a, b);
  if (!stats[k]) stats[k] = { correct: 0, wrong: 0 };
  return stats[k];
}

// ---------- Quiz Engine ----------
function weight(a, b) {
  const e = stats[statKey(a, b)];
  if (!e || (e.correct === 0 && e.wrong === 0)) return 2;
  if (e.wrong > e.correct)  return 5;
  if (e.wrong > 0)          return 3;
  if (e.correct >= 3)       return 0.5;
  return 1;
}

function allPairs() {
  const pairs = [];
  for (let a = 1; a <= 10; a++)
    for (let b = a; b <= 10; b++)
      pairs.push([a, b]);
  return pairs;
}

function filteredPairs() {
  if (activeFilters.has('all')) return allPairs();
  return allPairs().filter(([a, b]) =>
    activeFilters.has(String(a)) || activeFilters.has(String(b))
  );
}

function pickQuestion() {
  const pairs = filteredPairs();
  if (pairs.length === 0) return null;

  const weights = pairs.map(([a, b]) => weight(a, b));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pairs.length; i++) {
    r -= weights[i];
    if (r <= 0) return pairs[i];
  }
  return pairs[pairs.length - 1];
}

function recordAnswer(correct) {
  if (!currentPair) return;
  const [a, b] = currentPair;
  const e = getEntry(a, b);
  if (correct) e.correct++; else e.wrong++;
  saveStats();
}

// ---------- Derived Stats ----------
function totalStats() {
  let mastered = 0, totalCorrect = 0, totalWrong = 0;
  const all = allPairs();
  for (const [a, b] of all) {
    const e = stats[statKey(a, b)];
    if (!e) continue;
    totalCorrect += e.correct;
    totalWrong   += e.wrong;
    if (e.correct > e.wrong) mastered++;
  }
  return { mastered, total: all.length, totalCorrect, totalWrong };
}

// ---------- Cell color ----------
function cellClass(a, b) {
  const e = stats[statKey(a, b)];
  if (!e || (e.correct === 0 && e.wrong === 0)) return 'never';
  if (e.wrong > e.correct)  return 'red';
  if (e.wrong === e.correct) return 'orange';
  return 'green';
}

// ---------- Cell popover ----------
const LONG_PRESS_MS = 400;
let popoverTimer = null;

function showCellPopover(td, a, b) {
  const e = stats[statKey(a, b)];
  const text = e && (e.correct + e.wrong) > 0
    ? `${a}×${b}  ✓ ${e.correct}  ✗ ${e.wrong}`
    : `${a}×${b}  not practiced yet`;

  const pop = document.getElementById('cell-popover');
  document.getElementById('cell-popover-content').textContent = text;

  const rect = td.getBoundingClientRect();
  pop.style.left = `${rect.left + rect.width / 2}px`;
  pop.style.top  = `${rect.top + window.scrollY - 8}px`;
  pop.style.transform = 'translateX(-50%) translateY(-100%)';
  pop.classList.remove('hidden');

  clearTimeout(pop._hideTimer);
  pop._hideTimer = setTimeout(hideCellPopover, 2000);
}

function hideCellPopover() {
  document.getElementById('cell-popover').classList.add('hidden');
}

function attachCellInteraction(td, a, b) {
  // Desktop: keep native tooltip
  const e = stats[statKey(a, b)];
  td.title = e && (e.correct + e.wrong) > 0
    ? `${a}×${b} – ✓${e.correct} ✗${e.wrong}`
    : `${a}×${b} – not practiced`;

  // Touch devices: use touch events (pointer events get cancelled in
  // scroll containers on Android before pointerup can fire)
  td.addEventListener('touchstart', (ev) => {
    ev.preventDefault(); // block ghost click & scroll-gesture detection
    popoverTimer = setTimeout(() => {
      showCellPopover(td, a, b);
      popoverTimer = null;
    }, LONG_PRESS_MS);
  }, { passive: false });

  td.addEventListener('touchend', () => {
    if (popoverTimer) {
      clearTimeout(popoverTimer);
      popoverTimer = null;
      jumpToQuestion(a, b);
    }
  });

  td.addEventListener('touchmove', () => {
    clearTimeout(popoverTimer);
    popoverTimer = null;
  });

  // Desktop: plain click (no touch events fired by mouse)
  td.addEventListener('click', (ev) => {
    if (ev.pointerType !== 'touch') jumpToQuestion(a, b);
  });
}

// ---------- Rendering ----------
function renderMatrix() {
  const table = document.getElementById('matrix');
  table.innerHTML = '';

  // Header row
  const headRow = document.createElement('tr');
  headRow.appendChild(document.createElement('th')); // corner
  for (let c = 1; c <= 10; c++) {
    const th = document.createElement('th');
    th.textContent = c;
    headRow.appendChild(th);
  }
  table.appendChild(headRow);

  for (let r = 1; r <= 10; r++) {
    const tr = document.createElement('tr');
    const rowHead = document.createElement('th');
    rowHead.textContent = r;
    tr.appendChild(rowHead);

    for (let c = 1; c <= 10; c++) {
      const td = document.createElement('td');
      td.textContent = r * c;
      td.className = cellClass(r, c);
      attachCellInteraction(td, r, c);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}

function renderFilterPills() {
  const container = document.getElementById('filter-pills');
  container.innerHTML = '';

  const labels = [{ label: 'All', value: 'all' }];
  for (let i = 1; i <= 10; i++) labels.push({ label: `${i}×`, value: String(i) });

  for (const { label, value } of labels) {
    const btn = document.createElement('button');
    btn.className = 'pill' + (activeFilters.has(value) ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => toggleFilter(value));
    container.appendChild(btn);
  }
}

function renderStatsSummary() {
  const { mastered, total } = totalStats();
  document.getElementById('stats-summary').textContent =
    `${mastered} / ${total} mastered`;
}

function renderStatsPanel() {
  const { mastered, total, totalCorrect, totalWrong } = totalStats();
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-box">
      <div class="stat-num">${mastered}/${total}</div>
      <div class="stat-lbl">Mastered</div>
    </div>
    <div class="stat-box">
      <div class="stat-num">${totalCorrect}</div>
      <div class="stat-lbl">Correct</div>
    </div>
    <div class="stat-box">
      <div class="stat-num">${totalWrong}</div>
      <div class="stat-lbl">Wrong</div>
    </div>
  `;
}

function renderAll() {
  renderMatrix();
  renderFilterPills();
  renderStatsSummary();
  renderStatsPanel();
}

// ---------- Quiz UI ----------
function loadNextQuestion() {
  answerShown = false;
  currentPair = pickQuestion();

  const qEl    = document.getElementById('question');
  const ansEl  = document.getElementById('answer');
  const actEl  = document.getElementById('action-buttons');
  const showEl = document.getElementById('btn-show');

  if (!currentPair) {
    qEl.textContent = 'No questions match filter.';
    ansEl.classList.add('hidden');
    actEl.classList.add('hidden');
    showEl.classList.add('hidden');
    return;
  }

  const [a, b] = currentPair;
  qEl.textContent = `${a} × ${b} = ?`;
  ansEl.textContent = '';
  ansEl.classList.add('hidden');
  actEl.classList.add('hidden');
  showEl.classList.remove('hidden');
}

function showAnswer() {
  if (!currentPair || answerShown) return;
  answerShown = true;

  const [a, b] = currentPair;
  const ansEl  = document.getElementById('answer');
  const actEl  = document.getElementById('action-buttons');
  const showEl = document.getElementById('btn-show');

  ansEl.textContent = `= ${a * b}`;
  ansEl.classList.remove('hidden');
  actEl.classList.remove('hidden');
  showEl.classList.add('hidden');
}

function handleAnswer(correct) {
  recordAnswer(correct);

  // Flash animation
  const card = document.querySelector('.quiz-card');
  card.classList.remove('flash-correct', 'flash-wrong');
  void card.offsetWidth; // reflow
  card.classList.add(correct ? 'flash-correct' : 'flash-wrong');

  renderAll();

  // Brief delay then next question
  setTimeout(() => {
    card.classList.remove('flash-correct', 'flash-wrong');
    loadNextQuestion();
  }, 500);
}

function jumpToQuestion(a, b) {
  // Clear 'all' and set specific filter so the pair is reachable
  activeFilters.clear();
  activeFilters.add('all');
  renderFilterPills();

  currentPair = [a, b];
  answerShown = false;

  const qEl   = document.getElementById('question');
  const ansEl = document.getElementById('answer');
  const actEl = document.getElementById('action-buttons');
  const showEl = document.getElementById('btn-show');

  qEl.textContent = `${a} × ${b} = ?`;
  ansEl.textContent = '';
  ansEl.classList.add('hidden');
  actEl.classList.add('hidden');
  showEl.classList.remove('hidden');

  // Scroll to quiz
  document.getElementById('quiz-section').scrollIntoView({ behavior: 'smooth' });
}

// ---------- Filter Logic ----------
function toggleFilter(value) {
  if (value === 'all') {
    activeFilters.clear();
    activeFilters.add('all');
  } else {
    activeFilters.delete('all');
    if (activeFilters.has(value)) {
      activeFilters.delete(value);
      if (activeFilters.size === 0) activeFilters.add('all');
    } else {
      activeFilters.add(value);
    }
  }
  renderFilterPills();
  loadNextQuestion();
}

// ---------- Event Wiring ----------
function wireEvents() {
  document.addEventListener('pointerdown', (ev) => {
    if (!ev.target.closest('#cell-popover') && !ev.target.closest('.matrix td'))
      hideCellPopover();
  });

  document.getElementById('btn-show').addEventListener('click', showAnswer);
  document.getElementById('btn-correct').addEventListener('click', () => handleAnswer(true));
  document.getElementById('btn-wrong').addEventListener('click',   () => handleAnswer(false));

  // Stats toggle
  const toggleBtn  = document.getElementById('stats-toggle');
  const statsBody  = document.getElementById('stats-body');
  toggleBtn.addEventListener('click', () => {
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', String(!expanded));
    statsBody.classList.toggle('hidden', expanded);
  });

  // Reset
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('Reset all progress? This cannot be undone.')) {
      stats = {};
      saveStats();
      renderAll();
      loadNextQuestion();
    }
  });
}

// ---------- Init ----------
function init() {
  loadStats();
  wireEvents();
  renderAll();
  loadNextQuestion();
}

document.addEventListener('DOMContentLoaded', init);
