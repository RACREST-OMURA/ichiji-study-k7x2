/* 一次関数トレーニング：画面と成績の記録（記録はこの端末の中だけに保存） */
(function () {
  'use strict';
  var E = window.Engine;
  var root = document.getElementById('app');
  var KEY = 'ichiji_v1';
  var MINUS = E.MINUS;

  /* ---------- 成績の保存 ---------- */
  var store = load();
  function load() {
    try {
      var j = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (j && j.skills) { if (!j.tests) j.tests = []; return j; }
    } catch (e) { /* 保存できない環境でも動く */ }
    return { skills: {}, tests: [] };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignore */ } }
  function record(id, val) {
    var s = store.skills[id] || (store.skills[id] = { hist: [] });
    s.hist.push(val);
    if (s.hist.length > 20) s.hist.shift();
    save();
  }
  function stat(id) {
    var h = (store.skills[id] && store.skills[id].hist) || [];
    if (!h.length) return { n: 0, avg: null, pct: null, label: '未学習', cls: '' };
    var last = h.slice(-8), sum = 0, i;
    for (i = 0; i < last.length; i++) sum += last[i];
    var avg = sum / last.length, pct = Math.round(avg * 100), label, cls;
    if (h.length < 3) { label = '練習中'; cls = ''; }
    else if (avg >= 0.85) { label = '得意'; cls = 'good'; }
    else if (avg >= 0.6) { label = 'もう少し'; cls = 'mid'; }
    else { label = '苦手'; cls = 'weak'; }
    return { n: h.length, avg: avg, pct: pct, label: label, cls: cls };
  }
  function unitStat(u) {
    var sum = 0, c = 0;
    u.skills.forEach(function (s) { var t = stat(s.id); if (t.n) { sum += t.avg; c++; } });
    return c ? Math.round(sum / c * 100) : null;
  }
  function weakest() {
    var best = null;
    E.UNITS.forEach(function (u) {
      u.skills.forEach(function (s) {
        var t = stat(s.id);
        if (t.n && (best === null || t.avg < best.avg)) best = { id: s.id, name: s.name, avg: t.avg, pct: t.pct };
      });
    });
    return best;
  }
  function unitOf(id) { return E.UNITS.filter(function (u) { return u.id === E.SKILL_UNIT[id]; })[0]; }
  function unitById(id) { return E.UNITS.filter(function (u) { return u.id === id; })[0]; }

  /* ---------- 画面の共通部品 ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bar(pct) { return '<div class="bar"><i style="width:' + (pct || 0) + '%"></i></div>'; }
  function backBar(title) {
    return '<div class="top"><button class="btn small ghost" data-act="home">← ホーム</button><div class="sub">' + (title || '') + '</div></div>';
  }
  function show(html) { root.innerHTML = html; window.scrollTo(0, 0); }

  /* ---------- ホーム ---------- */
  function viewHome() {
    S = null;
    var wk = weakest(), rec;
    if (!wk) {
      rec = '<p>まだ記録がありません。まずは<b>「学ぶ」</b>でポイントを読んでから、<b>「ステップ練習」</b>に進みましょう。</p>';
    } else if (wk.avg >= 0.85) {
      rec = '<p>いまのところ、苦手はありません。すばらしい！<b>「テスト」</b>で力だめしをしてみよう。</p>';
    } else {
      rec = '<p>いま練習したいのは <b>「' + esc(wk.name) + '」</b>（' + wk.pct + '%）です。</p>' +
        '<button class="btn primary wide" data-act="weak">苦手をなおす（10問）</button>';
    }
    var h = '<h1>一次関数トレーニング</h1><p class="sub">中学2年 数学　／　ヒントを見ながら、順番にできるようになろう</p>';
    h += '<div class="card"><h2>今日のおすすめ</h2>' + rec + '</div>';
    h += '<div class="grid2 menu">' +
      '<button class="btn" data-act="learnmenu">📖 学ぶ<span>ポイントの解説・グラフで確かめる</span></button>' +
      '<button class="btn" data-act="stepmenu">🪜 ステップ練習<span>単元ごとに、ヒントつきで順番に</span></button>' +
      '<button class="btn" data-act="weak">🎯 苦手をなおす<span>まちがえやすい所を多めに出します</span></button>' +
      '<button class="btn" data-act="testsetup">📝 テスト<span>範囲をえらんで、ヒントなしで挑戦</span></button>' +
      '</div>';
    h += '<div class="card"><h2>いまの実力</h2>';
    E.UNITS.forEach(function (u) {
      var up = unitStat(u);
      h += '<div class="mt"><div class="row between"><b>' + u.no + '. ' + esc(u.name) + '</b><span class="sub">' + (up === null ? '未学習' : up + '%') + '</span></div>' + bar(up);
      u.skills.forEach(function (s) {
        var t = stat(s.id);
        h += '<div class="skillrow"><span class="nm">' + esc(s.name) + '</span>' +
          '<span class="chip ' + t.cls + '">' + t.label + '</span><span class="pc">' + (t.pct === null ? '' : t.pct + '%') + '</span></div>';
      });
      h += '</div>';
    });
    h += '</div>';
    if (store.tests.length) {
      h += '<div class="card"><h2>テストの点数</h2>';
      store.tests.slice(-6).reverse().forEach(function (t) {
        var d = new Date(t.t);
        h += '<div class="histrow"><span>' + (d.getMonth() + 1) + '/' + d.getDate() + '</span>' + bar(t.score) + '<span class="sc">' + t.score + '点</span></div>' +
          '<div class="sub small">範囲：' + esc(t.units.map(function (id) { return unitById(id).name; }).join('、')) + '（' + t.correct + '/' + t.total + '問）</div>';
      });
      h += '</div>';
    }
    h += '<p class="center mt"><button class="btn small ghost" data-act="reset">成績をリセット</button></p>';
    h += '<p class="sub small center">成績は、この iPad（このブラウザ）の中だけに保存されます。</p>';
    show(h);
  }

  /* ---------- 学ぶ ---------- */
  function viewLearnMenu() {
    var h = backBar('学ぶ') + '<h2>どの単元を読む？</h2>';
    E.UNITS.forEach(function (u) {
      h += '<button class="btn wide mt" data-act="learn" data-id="' + u.id + '">' + u.no + '. ' + esc(u.name) + '　<span class="sub">' + esc(u.note) + '</span></button>';
    });
    h += '<button class="btn wide mt" data-act="explorer">📈 グラフで確かめよう（a と b を動かす）</button>';
    show(h);
  }
  function viewLearn(id) {
    var u = unitById(id);
    var h = backBar('学ぶ') + '<div class="card learn"><h2>' + u.no + '. ' + esc(u.name) + '</h2>' + u.learn + '</div>';
    if (id === 'u2') h += '<button class="btn wide" data-act="explorer">📈 グラフで確かめよう</button>';
    h += '<button class="btn primary wide mt" data-act="step" data-id="' + id + '">この単元をステップ練習する</button>';
    show(h);
  }
  function viewExplorer() {
    show(backBar('グラフで確かめよう') + '<div class="card"><div class="eqbig" id="eq"></div><div class="graphbox" id="gx"></div>' +
      '<div class="slider"><label for="ra"><b>a（傾き）</b></label><input type="range" id="ra" min="-4" max="4" step="0.5" value="1"><b id="va"></b></div>' +
      '<div class="slider"><label for="rb"><b>b（切片）</b></label><input type="range" id="rb" min="-6" max="6" step="1" value="1"><b id="vb"></b></div>' +
      '<div class="fb info" id="msg"></div></div>');
    var ra = document.getElementById('ra'), rb = document.getElementById('rb');
    function upd() {
      var a = +ra.value, b = +rb.value;
      document.getElementById('va').textContent = String(a).replace('-', MINUS);
      document.getElementById('vb').textContent = String(b).replace('-', MINUS);
      document.getElementById('eq').textContent = a === 0 ? 'y = ' + String(b).replace('-', MINUS) : E.eqText(a, b);
      document.getElementById('gx').innerHTML = E.graphSVG({
        lines: [{ a: a, b: b, color: '#2563eb' }],
        extra: function (X, Y) {
          return '<polyline points="' + X(0) + ',' + Y(b) + ' ' + X(1) + ',' + Y(b) + ' ' + X(1) + ',' + Y(a + b) + '" fill="none" stroke="#16a34a" stroke-width="2.4" stroke-dasharray="5 4"/>';
        },
        pts: [{ x: 0, y: b }, { x: 1, y: a + b, color: '#16a34a' }]
      });
      var msg;
      if (a === 0) msg = 'a = 0 のとき、x がなくなって y = b。横にまっすぐな線です（一次関数ではありません）。';
      else msg = '赤い点は切片 (0, ' + String(b).replace('-', MINUS) + ')。そこから「右へ 1」進むと「' + (a > 0 ? '上へ ' + a : '下へ ' + (-a)) + '」進みます（緑の点線）。' + (a > 0 ? '右上がり。' : '右下がり。');
      document.getElementById('msg').textContent = msg;
    }
    ra.addEventListener('input', upd); rb.addEventListener('input', upd); upd();
  }

  /* ---------- 練習・テストの進行 ---------- */
  var S = null;
  var PRAISE = ['せいかい！', 'その調子！', 'いいね、合ってる！', 'ばっちり！', 'よくできました！'];

  function viewStepMenu() {
    var h = backBar('ステップ練習') + '<h2>どの単元を練習する？</h2><p class="sub">1つのステップで「2回つづけて、ヒントなしで正解」できたら次のステップへ進みます。</p>';
    E.UNITS.forEach(function (u) {
      var up = unitStat(u);
      h += '<button class="btn wide mt" data-act="step" data-id="' + u.id + '"><span style="display:block;text-align:left">' + u.no + '. ' + esc(u.name) +
        '　<span class="sub">' + (up === null ? '未学習' : up + '%') + '</span></span></button>';
    });
    show(h);
  }
  function startStep(unitId) {
    var u = unitById(unitId);
    S = { mode: 'step', unit: u, idx: 0, asked: 0, streak: 0, cleared: [], q: null, n: 0, log: [] };
    nextQuestion();
  }
  function startWeak() {
    S = { mode: 'weak', total: 10, q: null, n: 0, log: [], last: null };
    nextQuestion();
  }
  function viewTestSetup() {
    var h = backBar('テスト') + '<h2>テストの範囲をえらぼう</h2><div class="card">';
    E.UNITS.forEach(function (u) {
      h += '<label class="row" style="padding:8px 0;min-height:48px"><input type="checkbox" class="uchk" value="' + u.id + '" checked style="width:26px;height:26px"> ' +
        '<span>' + u.no + '. ' + esc(u.name) + '</span></label>';
    });
    h += '</div><div class="card"><h3 style="margin-top:0">問題の数</h3><div class="row">';
    [5, 10, 15].forEach(function (n) {
      h += '<label class="row" style="min-height:48px"><input type="radio" name="tn" value="' + n + '"' + (n === 10 ? ' checked' : '') + ' style="width:26px;height:26px"> ' + n + '問</label>';
    });
    h += '</div></div><p class="sub">テストでは、ヒントは出ません。1問1回で答えます。</p><button class="btn primary wide" data-act="teststart">テストをはじめる</button>';
    show(h);
  }
  function startTest() {
    var units = [].slice.call(document.querySelectorAll('.uchk')).filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
    var nEl = document.querySelector('input[name=tn]:checked'), total = nEl ? +nEl.value : 10;
    if (!units.length) { alert('範囲を1つ以上えらんでください'); return; }
    var skills = [];
    units.forEach(function (id) { unitById(id).skills.forEach(function (s) { skills.push(s.id); }); });
    var seq = [];
    while (seq.length < total) { seq = seq.concat(E.shuffle(skills)); }
    S = { mode: 'test', total: total, units: units, seq: seq.slice(0, total), q: null, n: 0, log: [] };
    nextQuestion();
  }

  function pickWeakSkill() {
    var all = [];
    E.UNITS.forEach(function (u) { u.skills.forEach(function (s) { all.push(s.id); }); });
    var weights = all.map(function (id) {
      var t = stat(id), w = (t.n ? (1 - t.avg) : 0.6) + 0.1;
      if (id === S.last) w *= 0.2;
      return w;
    });
    var sum = weights.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * sum, i;
    for (i = 0; i < all.length; i++) { r -= weights[i]; if (r <= 0) return all[i]; }
    return all[all.length - 1];
  }

  function nextQuestion() {
    var skillId;
    if (S.mode === 'step') {
      if (S.q) {
        if (S.streak >= 2 || S.asked >= 6) { S.cleared[S.idx] = S.streak >= 2; S.idx++; S.streak = 0; S.asked = 0; }
      }
      if (S.idx >= S.unit.skills.length) return viewStepEnd();
      skillId = S.unit.skills[S.idx].id;
    } else if (S.mode === 'weak') {
      if (S.n >= S.total) return viewWeakEnd();
      skillId = pickWeakSkill();
      S.last = skillId;
    } else {
      if (S.n >= S.total) return viewTestResult();
      skillId = S.seq[S.n];
    }
    S.q = E.makeQuestion(skillId);
    S.n++; S.asked++;
    S.wrong = 0; S.hint = 0; S.helped = false; S.revealed = false; S.done = false; S.fb = null; S.sel = null;
    S.off = []; S.input = S.q.kind === 'eq' ? 'y = ' : ''; S.val = null;
    viewQuiz();
  }

  function onDone(val, userAns) {
    S.done = true; S.val = val;
    record(S.q.skill, val);
    S.log.push({ q: S.q, val: val, user: userAns });
    if (S.mode === 'step') { if (val === 1) S.streak++; else S.streak = 0; }
  }

  function captureInput() {
    var el = document.getElementById('ans');
    if (el) S.input = el.value;
  }

  function submit() {
    if (!S || S.done) return;
    var q = S.q, res, userAns;
    if (q.kind === 'choice') {
      if (S.sel === null) { S.fb = { type: 'info', msg: '答えをえらんでから「答え合わせ」を押してね' }; return viewQuiz(); }
      res = { ok: S.sel === q.correct }; userAns = q.choices[S.sel];
    } else {
      captureInput();
      res = E.checkAnswer(q, S.input); userAns = S.input;
    }
    if (res.bad) { S.fb = { type: 'info', msg: res.msg }; return viewQuiz(); }
    if (S.mode === 'test') {
      onDone(res.ok ? 1 : 0, userAns);
      S.fb = { type: res.ok ? 'ok' : 'ng', msg: res.ok ? '⭕ 正解！' : '✖ 残念。正解は後で確認できます。' };
    } else if (res.ok) {
      onDone(S.helped ? 0.5 : 1, userAns);
      var praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      S.fb = { type: 'ok', msg: '⭕ ' + praise + (S.helped ? '（ヒントを使ったので、もう一度ひとりで解けるとバッチリ）' : '') };
    } else {
      S.wrong++; S.helped = true;
      if (q.kind === 'choice') S.off.push(S.sel);
      S.sel = null;
      var more = S.wrong >= 2 ? 'ヒントを見てもいいよ。' : 'もう一度考えてみよう。';
      S.fb = { type: 'ng', msg: '✖ おしい！' + more + (res.msg ? ' ' + res.msg : '') };
    }
    viewQuiz();
  }

  function padHTML(kind) {
    var keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'];
    var extra = kind === 'num' ? [MINUS, '/'] : (kind === 'eq' ? ['x', 'y', '=', '+', MINUS, '/', '(', ')'] : ['(', ')', ',', MINUS, '/']);
    var h = '<div class="pad">';
    keys.concat(extra).forEach(function (k) { h += '<button type="button" data-k="' + k + '">' + k + '</button>'; });
    h += '<button type="button" class="fn" data-k="back">⌫</button><button type="button" class="fn" data-k="clear">消す</button></div>';
    return h;
  }

  function stepsHTML(q, showAns) {
    var h = '<div class="steps"><b>解き方</b><ol>';
    q.steps.forEach(function (s) { h += '<li>' + s + '</li>'; });
    h += '</ol>' + (showAns ? '<div class="ans">答え：' + q.ansHTML + '</div>' : '') + '</div>';
    return h;
  }

  function viewQuiz() {
    var q = S.q, sk = E.SKILLS[q.skill], u = unitOf(q.skill), h = '', prog;
    if (S.mode === 'step') {
      var dots = '', i;
      for (i = 0; i < 2; i++) dots += i < S.streak ? '●' : '○';
      prog = 'ステップ ' + (S.idx + 1) + '/' + S.unit.skills.length + '　<span class="dots">' + dots + '</span>';
    } else prog = S.n + ' / ' + S.total + ' 問';
    var title = S.mode === 'step' ? 'ステップ練習' : (S.mode === 'weak' ? '苦手をなおす' : 'テスト');
    h += '<div class="top"><button class="btn small ghost" data-act="quit">やめる</button><div class="sub">' + title + '　' + prog + '</div></div>';
    h += '<div class="card"><div class="tag">' + u.no + '. ' + esc(sk.name) + '</div><div class="qtext">' + q.text + '</div>';
    if (q.graph) h += '<div class="graphbox">' + q.graph + '</div>';

    var locked = S.done;
    if (q.kind === 'choice') {
      h += '<div class="choices">';
      q.choices.forEach(function (c, i) {
        var cls = 'choice' + (S.sel === i ? ' sel' : '') + (S.off.indexOf(i) >= 0 ? ' off' : '') + (S.done && S.mode !== 'test' && i === q.correct ? ' right' : '');
        h += '<button class="' + cls + '" data-act="choose" data-i="' + i + '"' + (locked || S.off.indexOf(i) >= 0 ? ' disabled' : '') + '>' + c + '</button>';
      });
      h += '</div>';
    } else {
      h += '<input class="ans" id="ans" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="none" placeholder="' +
        (q.kind === 'point' ? '例： (2, 3)' : (q.kind === 'eq' ? '例： y = 2x + 3' : '答えを入力')) + '"' + (locked ? ' readonly' : '') + ' value="' + esc(S.input) + '">';
      if (!locked) h += padHTML(q.kind) + '<div class="sub small"><button type="button" class="btn small ghost" data-act="kbd">⌨ ふつうのキーボードで入力する</button>　分数は 3/2 のように書けます</div>';
    }

    if (!locked && !S.revealed) h += '<button class="btn primary wide mt" data-act="submit">答え合わせ</button>';
    if (!locked && S.mode === 'test') h += '<button class="btn small ghost wide mt" data-act="skip">わからない（とばす）</button>';

    if (S.fb) h += '<div class="fb ' + S.fb.type + '">' + esc(S.fb.msg) + '</div>';

    if (S.mode !== 'test') {
      var i2;
      for (i2 = 0; i2 < S.hint; i2++) h += '<div class="hintbox"><b class="hd">ヒント' + (i2 + 1) + '</b>' + q.hints[i2] + '</div>';
      if (!S.done) {
        h += '<div class="row mt">';
        if (S.hint < 2) h += '<button class="btn small" data-act="hint">💡 ヒント' + (S.hint + 1) + 'を見る</button>';
        if (S.hint >= 1 || S.wrong >= 1) h += '<button class="btn small" data-act="reveal">📘 解き方を見る（答えが出ます）</button>';
        h += '</div>';
      }
      if (S.revealed) h += stepsHTML(q, true);
      else if (S.done) h += '<details><summary>解き方をかくにんする</summary>' + stepsHTML(q, false) + '</details>';
    } else if (S.done) {
      // テスト中は答えを見せない（あとで結果画面で確認）
    }

    if (S.done) {
      var last = (S.mode === 'test' && S.n >= S.total) || (S.mode === 'weak' && S.n >= S.total);
      h += '<button class="btn primary wide mt" data-act="next">' + (last ? (S.mode === 'test' ? '結果を見る' : 'おわり') : 'つぎの問題へ') + '</button>';
    }
    h += '</div>';
    root.innerHTML = h;
    var el = document.getElementById('ans');
    if (el && !S.done) { try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ } var l = el.value.length; try { el.setSelectionRange(l, l); } catch (e2) { /* ignore */ } }
  }

  function viewStepEnd() {
    var h = backBar('ステップ練習') + '<div class="card"><h2>おつかれさま！</h2><p><b>' + esc(S.unit.name) + '</b> のステップが終わりました。</p>';
    S.unit.skills.forEach(function (s, i) {
      h += '<div class="skillrow"><span class="nm">' + esc(s.name) + '</span><span class="chip ' + (S.cleared[i] ? 'good' : 'mid') + '">' + (S.cleared[i] ? 'クリア' : 'あとで復習') + '</span></div>';
    });
    h += '</div><div class="grid2"><button class="btn primary" data-act="step" data-id="' + S.unit.id + '">もう一度やる</button><button class="btn" data-act="home">ホームへ</button></div>';
    show(h);
  }
  function viewWeakEnd() {
    var good = S.log.filter(function (l) { return l.val === 1; }).length, half = S.log.filter(function (l) { return l.val === 0.5; }).length;
    show(backBar('苦手をなおす') + '<div class="card"><h2>10問おわり！</h2><p>ヒントなしで正解：<b>' + good + '問</b>　／　ヒントを使って正解：<b>' + half + '問</b>　／　できなかった：<b>' + (S.log.length - good - half) + '問</b></p>' +
      '<p class="sub">ホームの「いまの実力」で、変化を見てみよう。</p></div>' +
      '<div class="grid2"><button class="btn primary" data-act="weak">もう10問やる</button><button class="btn" data-act="home">ホームへ</button></div>');
  }

  function viewTestResult() {
    var correct = S.log.filter(function (l) { return l.val === 1; }).length, total = S.log.length, score = Math.round(correct / total * 100);
    var by = {};
    S.log.forEach(function (l) { var b = by[l.q.skill] || (by[l.q.skill] = { ok: 0, n: 0 }); b.n++; if (l.val === 1) b.ok++; });
    store.tests.push({ t: Date.now(), units: S.units, score: score, correct: correct, total: total, by: by });
    if (store.tests.length > 30) store.tests.shift();
    save();
    var h = backBar('テスト結果') + '<div class="card center"><div class="sub">テストの結果</div><div style="font-size:48px;font-weight:800;color:var(--main)">' + score + '<span style="font-size:22px">点</span></div><div>' + correct + ' / ' + total + ' 問 正解</div></div>';
    h += '<div class="card"><h2>スキルごと</h2>';
    Object.keys(by).forEach(function (id) {
      var b = by[id], full = b.ok === b.n;
      h += '<div class="skillrow"><span class="nm">' + esc(E.SKILLS[id].name) + '</span><span class="chip ' + (full ? 'good' : 'weak') + '">' + b.ok + '/' + b.n + '</span></div>';
    });
    h += '</div>';
    var wrong = S.log.filter(function (l) { return l.val !== 1; });
    if (wrong.length) {
      h += '<div class="card"><h2>まちがえた問題</h2>';
      wrong.forEach(function (l) {
        h += '<div class="wrongitem"><div class="tag">' + esc(E.SKILLS[l.q.skill].name) + '</div><div>' + l.q.text + '</div>' + (l.q.graph ? '<div class="graphbox">' + l.q.graph + '</div>' : '') +
          '<p>あなたの答え：' + esc(l.user || '') + '</p><p class="right-ans">正解：' + l.q.ansHTML + '</p><details><summary>解き方を見る</summary>' + stepsHTML(l.q, false) + '</details></div>';
      });
      h += '</div><button class="btn primary wide" data-act="weak">まちがえやすい所を練習する</button>';
    } else {
      h += '<div class="fb ok">全問正解！すごい！</div>';
    }
    h += '<button class="btn wide mt" data-act="home">ホームへ</button>';
    S = null;
    show(h);
  }

  /* ---------- クリック・キー入力の受け口 ---------- */
  root.addEventListener('click', function (e) {
    var kEl = e.target.closest('[data-k]');
    if (kEl && S && S.q) {
      var inp = document.getElementById('ans');
      if (!inp || S.done) return;
      var k = kEl.getAttribute('data-k'), v = inp.value, a = inp.selectionStart, b = inp.selectionEnd;
      if (a === null || a === undefined) { a = b = v.length; }
      if (k === 'clear') { inp.value = S.q.kind === 'eq' ? 'y = ' : ''; }
      else if (k === 'back') {
        if (a !== b) { inp.value = v.slice(0, a) + v.slice(b); b = a; }
        else if (a > 0) { inp.value = v.slice(0, a - 1) + v.slice(a); a = a - 1; b = a; }
        inp.setSelectionRange(a, a);
      } else {
        inp.value = v.slice(0, a) + k + v.slice(b);
        inp.setSelectionRange(a + k.length, a + k.length);
      }
      S.input = inp.value;
      return;
    }
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-id');
    if (S && S.q) captureInput();
    switch (act) {
      case 'home': viewHome(); break;
      case 'learnmenu': viewLearnMenu(); break;
      case 'learn': viewLearn(id); break;
      case 'explorer': viewExplorer(); break;
      case 'stepmenu': viewStepMenu(); break;
      case 'step': startStep(id); break;
      case 'weak': startWeak(); break;
      case 'testsetup': viewTestSetup(); break;
      case 'teststart': startTest(); break;
      case 'choose': if (S && !S.done) { S.sel = +t.getAttribute('data-i'); S.fb = null; viewQuiz(); } break;
      case 'submit': submit(); break;
      case 'hint': if (S && S.hint < 2) { S.hint++; S.helped = true; viewQuiz(); } break;
      case 'reveal': if (S && !S.done) { S.revealed = true; onDone(0, S.input); S.fb = { type: 'info', msg: '解き方を見ました。次の問題で、ひとりで解いてみよう。' }; viewQuiz(); } break;
      case 'skip': if (S && !S.done) { onDone(0, '（わからない）'); S.fb = { type: 'ng', msg: '✖ とばしました。正解は後で確認できます。' }; viewQuiz(); } break;
      case 'next': nextQuestion(); break;
      case 'quit': if (confirm('練習をやめてホームにもどりますか？')) viewHome(); break;
      case 'kbd': var el = document.getElementById('ans'); if (el) { el.setAttribute('inputmode', 'text'); el.focus(); } break;
      case 'reset': if (confirm('これまでの成績をすべて消します。よろしいですか？')) { store = { skills: {}, tests: [] }; save(); viewHome(); } break;
    }
  });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.id === 'ans') { e.preventDefault(); submit(); }
  });

  viewHome();
})();
