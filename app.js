// ESG 예산 배분 시연 — 저장은 localStorage만 (모든 접근은 try/catch)
var KEY = 'esg_giants_demo_v1';
var state = { runs: {}, draft: null };
var app = document.getElementById('app');

function loadState() {
  try {
    var s = localStorage.getItem(KEY);
    if (s) {
      var o = JSON.parse(s);
      if (o && typeof o === 'object') return { runs: o.runs || {}, draft: o.draft || null };
    }
  } catch (e) {}
  return { runs: {}, draft: null };
}
function saveState() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

function h(tag, attrs, kids) {
  var el = document.createElement(tag);
  if (attrs) Object.keys(attrs).forEach(function (k) {
    if (k === 'class') el.className = attrs[k];
    else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
    else el.setAttribute(k, attrs[k]);
  });
  (kids || []).forEach(function (c) {
    if (c === null || c === undefined) return;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return el;
}
function clear() { app.innerHTML = ''; window.scrollTo(0, 0); }
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function cardById(id) {
  for (var i = 0; i < CARDS.length; i++) if (CARDS[i].id === id) return CARDS[i];
  return null;
}
function sumAlloc(alloc) {
  return CARDS.reduce(function (s, c) { return s + (alloc[c.id] || 0); }, 0);
}
function areaSums(alloc) {
  var r = { E: 0, S: 0, G: 0 };
  CARDS.forEach(function (c) { r[c.area] += alloc[c.id] || 0; });
  return r;
}
function prevRun(round) {
  for (var r = round - 1; r >= 1; r--) if (state.runs[r]) return state.runs[r];
  return null;
}
function emptyAlloc() {
  var a = {};
  CARDS.forEach(function (c) { a[c.id] = 0; });
  return a;
}
function changedCards(alloc, prev) {
  return CARDS.filter(function (c) { return (alloc[c.id] || 0) !== (prev.alloc[c.id] || 0); });
}
function topCards(alloc) {
  var max = 0;
  CARDS.forEach(function (c) { if ((alloc[c.id] || 0) > max) max = alloc[c.id]; });
  return CARDS.filter(function (c) { return max > 0 && alloc[c.id] === max; });
}

/* ---------- 시작 화면 ---------- */
function renderStart() {
  clear();
  app.appendChild(h('h1', null, ['롯데 자이언츠의 마지막 우승은 1992년이야. 지금 구단에 개선에 쓸 예산 100이 생겼다고 해 보자. 어디에 쓸래?']));
  app.appendChild(h('p', { class: 'note' }, ['여기 나오는 예산과 개선안은 전부 가상이야. 실제 구단 상황이 아니야.']));
  var chips = h('div', { class: 'chips' });
  ROUNDS.forEach(function (r) {
    var done = !!state.runs[r.n];
    chips.appendChild(h('button', { class: 'chip' + (done ? ' done' : ''), type: 'button', onclick: function () { onPickRound(r.n); } }, [
      h('b', null, [r.label + (done ? ' ✓ 제출함' : '')]),
      h('small', null, [r.sub + (done ? ' · 눌러서 결과 보기' : '')])
    ]));
  });
  app.appendChild(chips);
  if (Object.keys(state.runs).length || state.draft) {
    app.appendChild(h('button', { class: 'hintbtn', type: 'button', onclick: function () {
      if (window.confirm('이 기기에 저장된 기록을 모두 지울까?')) {
        state = { runs: {}, draft: null };
        saveState();
        renderStart();
      }
    } }, ['처음부터 다시 하기']));
  }
}
function onPickRound(n) {
  if (state.runs[n]) { renderResult(n); return; }
  startRound(n);
}
function startRound(n) {
  var prev = prevRun(n);
  state.draft = {
    round: n, step: 'alloc', order: shuffle(CARDS.map(function (c) { return c.id; })),
    alloc: prev ? JSON.parse(JSON.stringify(prev.alloc)) : emptyAlloc(),
    q1: '', q2id: '', q2: '', q3: '', hint1: false, hint2: false
  };
  saveState();
  renderAlloc();
}

/* ---------- 배분 화면 (영역 정보를 읽지 않는다) ---------- */
function renderAlloc() {
  var d = state.draft;
  clear();
  var remain = h('b', null, ['']);
  var fill = h('div', { class: 'bar-fill' });
  app.appendChild(h('div', { class: 'sticky' }, [
    h('div', null, [ROUNDS[d.round - 1].label + ' · 남은 예산 ', remain, ' / ' + TOTAL]),
    h('div', { class: 'bar-track' }, [fill])
  ]));
  var next = h('button', { class: 'btn primary', type: 'button', onclick: function () { d.step = 'reason'; saveState(); renderReason(); } }, ['다음']);
  var refs = {};

  function refresh() {
    var left = TOTAL - sumAlloc(d.alloc);
    remain.textContent = String(left);
    fill.style.width = (100 - left) + '%';
    next.disabled = left !== 0;
    d.order.forEach(function (id) {
      refs[id].v.textContent = String(d.alloc[id] || 0);
      refs[id].minus.disabled = (d.alloc[id] || 0) <= 0;
      refs[id].plus.disabled = left < STEP;
    });
  }
  function change(id, delta) {
    var cur = d.alloc[id] || 0;
    var left = TOTAL - sumAlloc(d.alloc);
    if (delta > 0 && left < STEP) return;
    if (delta < 0 && cur < STEP) return;
    d.alloc[id] = cur + delta;
    saveState();
    refresh();
  }

  var list = h('div');
  d.order.forEach(function (id) {
    var c = cardById(id);
    var v = h('span', { class: 'v' }, ['0']);
    var minus = h('button', { type: 'button', 'aria-label': '줄이기: ' + c.text, onclick: function () { change(id, -STEP); } }, ['−']);
    var plus = h('button', { type: 'button', 'aria-label': '늘리기: ' + c.text, onclick: function () { change(id, STEP); } }, ['+']);
    refs[id] = { v: v, minus: minus, plus: plus };
    list.appendChild(h('div', { class: 'cardrow' }, [
      h('div', { class: 't' }, [c.text]),
      h('div', { class: 'stepper' }, [minus, v, plus])
    ]));
  });
  app.appendChild(list);
  app.appendChild(h('p', { class: 'note' }, ['버튼을 한 번 누르면 5씩 바뀌어. 100을 다 써야 다음으로 갈 수 있어.']));
  app.appendChild(h('div', { class: 'row' }, [
    h('button', { class: 'btn', type: 'button', onclick: function () { state.draft = null; saveState(); renderStart(); } }, ['처음으로']),
    next
  ]));
  refresh();
}

/* ---------- 이유 화면 ---------- */
function question(label, hintText, hintKey, body) {
  var d = state.draft;
  var hintBox = h('div', { class: 'hint' }, [hintText]);
  hintBox.hidden = !d[hintKey];
  var btn = h('button', { class: 'hintbtn', type: 'button', onclick: function () {
    d[hintKey] = !d[hintKey];
    hintBox.hidden = !d[hintKey];
    saveState();
  } }, ['💡 막막하면 힌트 보기']);
  var kids = [h('h2', null, [label])].concat(body);
  if (hintText) { kids.push(btn); kids.push(hintBox); }
  return h('section', null, kids);
}
function textBox(key, onchange) {
  var d = state.draft;
  var t = h('textarea', { rows: '2', maxlength: '150', placeholder: '한 문장으로 써 줘' });
  t.value = d[key] || '';
  t.addEventListener('input', function () { d[key] = t.value; saveState(); onchange(); });
  return t;
}
function renderReason() {
  var d = state.draft;
  clear();
  var prev = prevRun(d.round);
  var changed = prev ? changedCards(d.alloc, prev) : [];
  var tops = topCards(d.alloc);
  var submit = h('button', { class: 'btn red', type: 'button', onclick: onSubmit }, ['제출']);

  function check() {
    var ok = d.q1.trim() && d.q2id && d.q2.trim() && (!changed.length || d.q3.trim());
    submit.disabled = !ok;
  }
  app.appendChild(h('h1', null, [ROUNDS[d.round - 1].label + ' · 이유를 한 문장씩 써 줘']));

  app.appendChild(question('Q1. 왜 여기에 가장 많이 썼어?', '이 카드에 돈을 쓰면 누가 달라질까? 다른 카드에 쓸 때와 뭐가 다를까?', 'hint1', [
    h('div', { class: 'pick' }, [tops.map(function (c) { return c.text + ' (' + d.alloc[c.id] + ')'; }).join(' / ')]),
    textBox('q1', check)
  ]));

  var opts = h('div');
  d.order.forEach(function (id) {
    var c = cardById(id);
    var radio = h('input', { type: 'radio', name: 'q2' });
    radio.checked = d.q2id === id;
    var lab = h('label', { class: 'opt' + (radio.checked ? ' sel' : '') }, [radio, h('span', null, [c.text])]);
    radio.addEventListener('change', function () {
      d.q2id = id; saveState();
      Array.prototype.forEach.call(opts.children, function (el) { el.className = 'opt'; });
      lab.className = 'opt sel';
      check();
    });
    opts.appendChild(lab);
  });
  app.appendChild(question('Q2. 예산과 상관없이, 구단이 가장 먼저 바꿔야 할 것 1장을 골라 줘', '이 중에 먼저 안 바꾸면 다른 카드가 소용없어지는 게 있을까?', 'hint2', [
    opts,
    h('h2', null, ['왜 이게 먼저야?']),
    textBox('q2', check)
  ]));

  if (changed.length) {
    app.appendChild(h('h2', null, ['Q3. 가장 크게 바꾼 카드는 뭐고, 뭐 때문에 바꿨어?']));
    var lines = h('div', { class: 'chg' });
    changed.forEach(function (c) {
      lines.appendChild(h('span', null, [(prev.alloc[c.id] || 0) + ' → ' + d.alloc[c.id]]));
      lines.appendChild(h('span', null, [c.text]));
    });
    app.appendChild(lines);
    app.appendChild(textBox('q3', check));
  }

  app.appendChild(h('div', { class: 'row', style: 'margin-top:18px' }, [
    h('button', { class: 'btn', type: 'button', onclick: function () { d.step = 'alloc'; saveState(); renderAlloc(); } }, ['← 배분 고치기']),
    submit
  ]));
  check();
}
function onSubmit() {
  var d = state.draft;
  var prev = prevRun(d.round);
  var needQ3 = prev && changedCards(d.alloc, prev).length > 0;
  state.runs[d.round] = {
    alloc: d.alloc, q1: d.q1.trim(), q2id: d.q2id, q2: d.q2.trim(), q3: needQ3 ? d.q3.trim() : ''
  };
  var n = d.round;
  state.draft = null;
  saveState();
  renderResult(n);
}

/* ---------- 결과 화면 (제출 뒤에만 영역 공개) ---------- */
function stackBar(sums, total) {
  var bar = h('div', { class: 'stack' });
  ['E', 'S', 'G'].forEach(function (k) {
    if (!sums[k]) return;
    var seg = h('div', { class: 'seg ' + k, style: 'width:' + (sums[k] / total * 100) + '%' }, [k + ' ' + sums[k]]);
    seg.title = AREAS[k].name;
    bar.appendChild(seg);
  });
  return bar;
}
function renderResult(n) {
  var run = state.runs[n];
  clear();
  var sums = areaSums(run.alloc);
  app.appendChild(h('h1', null, [ROUNDS[n - 1].label + ' · 내 예산은 이렇게 나뉘었어']));
  app.appendChild(stackBar(sums, TOTAL));
  ['E', 'S', 'G'].forEach(function (k) {
    app.appendChild(h('div', { class: 'lab' }, [h('span', null, [AREAS[k].name + ' (' + k + ')']), h('span', null, [String(sums[k])])]));
    app.appendChild(h('p', { class: 'gloss' }, [AREAS[k].gloss]));
  });

  var max = Math.max(sums.E, sums.S, sums.G);
  var topAreas = ['E', 'S', 'G'].filter(function (k) { return sums[k] === max; });
  var pCard = cardById(run.q2id);
  var same = topAreas.indexOf(pCard.area) >= 0;
  app.appendChild(h('h2', null, ['먼저 바꿔야 한다고 고른 것']));
  app.appendChild(h('div', { class: 'qa' }, [h('small', null, [AREAS[pCard.area].name + ' (' + pCard.area + ')']), pCard.text]));
  app.appendChild(h('div', { class: 'compare' }, [same
    ? '배분이 가장 많은 영역과 먼저 바꿔야 한다고 고른 영역이 같아. 이 영역이 왜 특별할까?'
    : '배분이 가장 많은 영역과 먼저 바꿔야 한다고 고른 영역이 달라. 왜 다를까?']));

  var prev = prevRun(n);
  if (prev) {
    var ps = areaSums(prev.alloc);
    app.appendChild(h('h2', null, ['이전 회차와 비교']));
    var tbl = h('div', { class: 'chg' });
    ['E', 'S', 'G'].forEach(function (k) {
      tbl.appendChild(h('b', null, [AREAS[k].name + ' (' + k + ')']));
      tbl.appendChild(h('span', null, [ps[k] + ' → ' + sums[k]]));
    });
    app.appendChild(tbl);
  }

  app.appendChild(h('h2', null, ['내가 쓴 이유']));
  app.appendChild(h('div', { class: 'qa' }, [h('small', null, ['가장 많이 쓴 이유']), run.q1]));
  app.appendChild(h('div', { class: 'qa' }, [h('small', null, ['먼저 바꿔야 하는 이유']), run.q2]));
  if (run.q3) app.appendChild(h('div', { class: 'qa' }, [h('small', null, ['가장 크게 바꾼 이유']), run.q3]));

  var row = h('div', { class: 'row', style: 'margin-top:18px' });
  row.appendChild(h('button', { class: 'btn', type: 'button', onclick: renderStart }, ['처음으로']));
  if (n < 3) row.appendChild(h('button', { class: 'btn primary', type: 'button', onclick: function () { onPickRound(n + 1); } }, [ROUNDS[n].label + ' 하러 가기']));
  row.appendChild(h('button', { class: 'btn', type: 'button', onclick: function () { delete state.runs[n]; saveState(); startRound(n); } }, ['이 회차 다시 하기']));
  app.appendChild(row);
}

function renderStudent() {
  var d = state.draft;
  if (d && d.step === 'reason') renderReason();
  else if (d && d.step === 'alloc') renderAlloc();
  else renderStart();
}

// ==== TEACHER-ONLY START ====
var TEACHER_HYPOTHESIS_AREA = 'G';

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// 영역별 편향 없이 카드마다 똑같은 규칙으로 뽑는 가상 학급 30명 (시드 고정)
function fakeClass() {
  var rnd = mulberry32(20261030);
  return ROUNDS.map(function () {
    var students = [];
    for (var s = 0; s < 30; s++) {
      var w = CARDS.map(function () { return 0.5 + rnd(); });
      var wsum = w.reduce(function (a, b) { return a + b; }, 0);
      var alloc = emptyAlloc();
      for (var u = 0; u < TOTAL / STEP; u++) {
        var x = rnd() * wsum, i = 0;
        while (i < w.length - 1 && x >= w[i]) { x -= w[i]; i++; }
        alloc[CARDS[i].id] += STEP;
      }
      students.push({ sums: areaSums(alloc), pri: CARDS[Math.floor(rnd() * CARDS.length)].area });
    }
    return students;
  });
}
function renderTeacher() {
  clear();
  app.appendChild(h('div', { class: 'badge' }, ['시연용 가상 데이터 · 실제 학생 결과 아님']));
  app.appendChild(h('h1', null, ['교사 화면 · 가상 학생 30명']));
  app.appendChild(h('p', { class: 'note' }, ['교사의 가설 영역: ' + TEACHER_HYPOTHESIS_AREA + ' (' + AREAS[TEACHER_HYPOTHESIS_AREA].name + '). 가상 데이터는 영역·회차에 상관없이 같은 규칙의 무작위로 만들었어. 가설을 뒷받침하는 증거가 아니라, 학생 판단 데이터를 나란히 보는 화면 모양을 보여 주는 용도야.']));
  var data = fakeClass();
  var avgRows = [], priRows = [];
  app.appendChild(h('h2', null, ['회차별 반 평균 영역 배분']));
  data.forEach(function (students, i) {
    var avg = { E: 0, S: 0, G: 0 };
    students.forEach(function (st) { ['E', 'S', 'G'].forEach(function (k) { avg[k] += st.sums[k] / students.length; }); });
    var r = { E: Math.round(avg.E * 10) / 10, S: Math.round(avg.S * 10) / 10, G: Math.round(avg.G * 10) / 10 };
    avgRows.push(r);
    app.appendChild(h('div', { class: 'lab' }, [h('span', null, [ROUNDS[i].label + ' (' + ROUNDS[i].sub + ')'])]));
    app.appendChild(stackBar({ E: r.E, S: r.S, G: r.G }, TOTAL));
  });
  app.appendChild(h('h2', null, ['“가장 먼저 바꿔야 할 것” 영역 분포 (명)']));
  data.forEach(function (students, i) {
    var cnt = { E: 0, S: 0, G: 0 };
    students.forEach(function (st) { cnt[st.pri]++; });
    priRows.push(cnt);
    app.appendChild(h('div', { class: 'lab' }, [h('span', null, [ROUNDS[i].label])]));
    app.appendChild(stackBar(cnt, students.length));
  });
  var gHyp = h('span', { class: 'hyp' }, ['가설']);
  var tbl = h('table', null, [
    h('tr', null, [h('th', null, ['회차']), h('th', null, ['E 평균']), h('th', null, ['S 평균']), h('th', null, [h('span', null, ['G 평균']), gHyp]), h('th', null, ['먼저 E/S/G (명)'])])
  ].concat(avgRows.map(function (r, i) {
    return h('tr', null, [h('td', null, [ROUNDS[i].label]), h('td', null, [String(r.E)]), h('td', null, [String(r.S)]), h('td', null, [String(r.G)]),
      h('td', null, [priRows[i].E + '/' + priRows[i].S + '/' + priRows[i].G])]);
  })));
  app.appendChild(h('h2', null, ['수치 표']));
  app.appendChild(tbl);
  app.appendChild(h('p', { class: 'gloss' }, ['막대의 E·S·G 글자는 영역 이름이야. 색만으로 구분하지 않아도 돼.']));
}
// ==== TEACHER-ONLY END ====

function init() {
  state = loadState();
  var teacher = false;
  try { teacher = new URLSearchParams(location.search).get('teacher') === '1'; } catch (e) {}
  if (teacher) renderTeacher(); else renderStudent();
}
init();
