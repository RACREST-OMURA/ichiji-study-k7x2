/* 一次関数トレーニング：問題を作る・答えを判定する部分（画面には触らない） */
(function (root) {
  'use strict';
  var MINUS = '−';

  /* ---------- 小さな道具 ---------- */
  function rnd(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function nz(lo, hi) { var v; do { v = rnd(lo, hi); } while (v === 0); return v; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function m(n) { return String(n).replace('-', MINUS); }            // マイナスを「−」で表示
  function par(n) { return n < 0 ? '(' + m(n) + ')' : String(n); }   // 負の数は（）つき
  function fr(p, q) {
    if (q < 0) { p = -p; q = -q; }
    var g = gcd(p, q) || 1;
    return { p: p / g, q: q / g };
  }
  function frH(p, q) {                                               // 分数をHTMLで
    var f = fr(p, q), ap = Math.abs(f.p), s;
    if (f.q === 1) s = String(ap);
    else s = '<span class="frac"><span>' + ap + '</span><span>' + f.q + '</span></span>';
    return (f.p < 0 ? MINUS : '') + s;
  }
  function parH(p, q) { var f = fr(p, q); return f.p < 0 ? '(' + frH(p, q) + ')' : frH(p, q); }
  function xTerm(p, q) {                                             // x の項（係数つき）
    var f = fr(p, q);
    if (f.q === 1) {
      if (f.p === 1) return 'x';
      if (f.p === -1) return MINUS + 'x';
      return m(f.p) + 'x';
    }
    return frH(f.p, f.q) + 'x';
  }
  function constTail(b) { return b > 0 ? ' + ' + b : (b < 0 ? ' ' + MINUS + ' ' + (-b) : ''); }
  function eqH(p, q, b) { return 'y = ' + xTerm(p, q) + constTail(b); }
  function decTerm(a) { return (a === 1 ? '' : String(a)) + 'x'; }  // 小数の傾き（ばね）
  function eqText(a, b) {                                            // 説明用の文字列（画面の「y = ax + b」）
    var t = a === 1 ? 'x' : (a === -1 ? MINUS + 'x' : m(a) + 'x');
    return 'y = ' + t + constTail(b);
  }

  /* ---------- 答えの判定 ---------- */
  function normalize(s) {
    s = String(s == null ? '' : s);
    s = s.replace(/[！-～]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
    s = s.replace(/[−‐-―ー]/g, '-').replace(/[×✕]/g, '*').replace(/÷/g, '/')
      .replace(/[，、]/g, ',').replace(/[\s　]/g, '');
    return s.toLowerCase();
  }
  function evalExpr(s, x) {
    if (!s) return NaN;
    s = s.replace(/(\d|\))(?=[x(])/g, '$1*').replace(/x(?=\()/g, 'x*');
    if (!/^[0-9x+\-*\/().]+$/.test(s) || /\*\*/.test(s)) return NaN;
    try {
      var v = Function('x', '"use strict";return (' + s + ');')(x);
      return (typeof v === 'number' && isFinite(v)) ? v : NaN;
    } catch (e) { return NaN; }
  }
  var EPS = 1e-9;
  function near(a, b) { return Math.abs(a - b) < EPS; }

  function checkAnswer(q, raw) {
    var s = normalize(raw);
    if (!s) return { ok: false, bad: true, msg: '答えを入力してね' };
    var v;
    if (q.kind === 'num') {
      var t = s.replace(/[^\d)\.]+$/, '');
      v = evalExpr(t, NaN);
      if (isNaN(v)) return { ok: false, bad: true, msg: '数字で答えてね（分数は 3/2 のように書けます）' };
      if (near(v, q.exp)) return { ok: true };
      if (q.exp !== 0 && near(v, -q.exp)) return { ok: false, msg: '数字は合っているよ。＋と−の向き（符号）を見直そう。' };
      return { ok: false, msg: '' };
    }
    if (q.kind === 'eq') {
      if (s.indexOf('y=') !== 0) return { ok: false, bad: true, msg: '「y = …」の形で書いてね' };
      var ex = s.slice(2);
      var v0 = evalExpr(ex, 0), v1 = evalExpr(ex, 1), v2 = evalExpr(ex, 2);
      if (isNaN(v0) || isNaN(v1) || isNaN(v2)) return { ok: false, bad: true, msg: '式の形が読み取れないよ。例：y = 2x + 3　（分数は 3/2 のように）' };
      var A = v1 - v0, linear = near(v2 - v1, A);
      if (linear && near(A, q.exp.a) && near(v0, q.exp.b)) return { ok: true };
      if (!linear) return { ok: false, msg: 'x の1次の式（y = ax + b の形）で答えてね。' };
      if (near(A, q.exp.a)) return { ok: false, msg: '傾きは合っているよ。切片 b を見直そう。' };
      if (near(v0, q.exp.b)) return { ok: false, msg: '切片は合っているよ。傾き a を見直そう。' };
      return { ok: false, msg: '' };
    }
    if (q.kind === 'point') {
      var t2 = s;
      if (t2.charAt(0) === '(' && t2.charAt(t2.length - 1) === ')') t2 = t2.slice(1, -1);
      var parts = t2.split(',');
      if (parts.length !== 2) return { ok: false, bad: true, msg: '(2, 3) のように、x座標と y座標を「,」でくぎって書いてね' };
      var px = evalExpr(parts[0], NaN), py = evalExpr(parts[1], NaN);
      if (isNaN(px) || isNaN(py)) return { ok: false, bad: true, msg: '(2, 3) のように、数字で書いてね' };
      if (near(px, q.exp[0]) && near(py, q.exp[1])) return { ok: true };
      if (near(px, q.exp[0])) return { ok: false, msg: 'x座標は合っているよ。y座標を見直そう。' };
      if (near(py, q.exp[1])) return { ok: false, msg: 'y座標は合っているよ。x座標を見直そう。' };
      if (near(px, q.exp[1]) && near(py, q.exp[0])) return { ok: false, msg: 'x座標と y座標が逆になっていないかな？（x, y）の順に書くよ。' };
      return { ok: false, msg: '' };
    }
    return { ok: false, bad: true, msg: '' };
  }

  /* ---------- グラフ（SVG） ---------- */
  var gid = 0;
  function graphSVG(o) {
    var W = 360, pad = 8, cell = (W - 2 * pad) / 16, oc = W / 2, id = 'gc' + (gid++);
    function X(x) { return +(oc + x * cell).toFixed(2); }
    function Y(y) { return +(oc - y * cell).toFixed(2); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + W + '" class="graph" role="img" aria-label="座標平面のグラフ">';
    s += '<defs><clipPath id="' + id + '"><rect x="' + pad + '" y="' + pad + '" width="' + (W - 2 * pad) + '" height="' + (W - 2 * pad) + '"/></clipPath></defs>';
    s += '<rect x="' + pad + '" y="' + pad + '" width="' + (W - 2 * pad) + '" height="' + (W - 2 * pad) + '" fill="#ffffff" stroke="#c9d1e0"/>';
    var i;
    for (i = -8; i <= 8; i++) {
      if (i === 0) continue;
      s += '<line x1="' + X(i) + '" y1="' + pad + '" x2="' + X(i) + '" y2="' + (W - pad) + '" stroke="#dfe4ee" stroke-width="1"/>';
      s += '<line x1="' + pad + '" y1="' + Y(i) + '" x2="' + (W - pad) + '" y2="' + Y(i) + '" stroke="#dfe4ee" stroke-width="1"/>';
    }
    s += '<line x1="' + pad + '" y1="' + Y(0) + '" x2="' + (W - pad) + '" y2="' + Y(0) + '" stroke="#1f2937" stroke-width="1.6"/>';
    s += '<line x1="' + X(0) + '" y1="' + pad + '" x2="' + X(0) + '" y2="' + (W - pad) + '" stroke="#1f2937" stroke-width="1.6"/>';
    [-8, -6, -4, -2, 2, 4, 6, 8].forEach(function (k) {
      s += '<text x="' + X(k) + '" y="' + (Y(0) + 12) + '" font-size="10" text-anchor="middle" fill="#475569">' + m(k) + '</text>';
      s += '<text x="' + (X(0) - 4) + '" y="' + (Y(k) + 3.5) + '" font-size="10" text-anchor="end" fill="#475569">' + m(k) + '</text>';
    });
    s += '<text x="' + (X(0) - 5) + '" y="' + (Y(0) + 12) + '" font-size="10" text-anchor="end" fill="#475569">O</text>';
    s += '<text x="' + (W - 18) + '" y="' + (Y(0) - 6) + '" font-size="13" font-style="italic" fill="#1f2937">x</text>';
    s += '<text x="' + (X(0) + 7) + '" y="' + (pad + 14) + '" font-size="13" font-style="italic" fill="#1f2937">y</text>';
    s += '<g clip-path="url(#' + id + ')">';
    (o.lines || []).forEach(function (l) {
      s += '<line x1="' + X(-8) + '" y1="' + Y(l.a * -8 + l.b) + '" x2="' + X(8) + '" y2="' + Y(l.a * 8 + l.b) +
        '" stroke="' + (l.color || '#2563eb') + '" stroke-width="2.8" stroke-linecap="round"/>';
    });
    if (o.extra) s += o.extra(X, Y);
    (o.pts || []).forEach(function (p) {
      s += '<circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="4.6" fill="' + (p.color || '#dc2626') + '" stroke="#fff" stroke-width="1.5"/>';
    });
    s += '</g></svg>';
    return s;
  }

  /* ---------- 問題のつくり方（スキルごと） ---------- */
  function fracNote(f) { return f ? '（分数は 3/2 のように書けます）' : ''; }

  // ① 一次関数とは --------------------------------------------------
  function g1a() {
    var yes = [
      { h: 'y = 3x ' + MINUS + ' 2', why: 'y = ax + b の形（a = 3, b = ' + MINUS + '2）なので一次関数。' },
      { h: 'y = ' + MINUS + 'x + 5', why: 'a = ' + MINUS + '1, b = 5 の一次関数。' },
      { h: 'y = 2x', why: 'b = 0 の場合。比例は一次関数の特別な場合。' },
      { h: 'y = ' + frH(1, 2) + 'x + 1', why: 'a = 1/2, b = 1 の一次関数。' },
      { h: 'y = 5 ' + MINUS + ' 2x', why: 'y = ' + MINUS + '2x + 5 と同じ。a = ' + MINUS + '2, b = 5 の一次関数。' },
      { h: 'y = 4x + 7', why: 'a = 4, b = 7 の一次関数。' }
    ];
    var no = [
      { h: 'y = x²', why: 'x が2乗になっているので一次関数ではない。' },
      { h: 'y = <span class="frac"><span>6</span><span>x</span></span>', why: 'x が分母にあるので反比例。一次関数ではない。' },
      { h: 'y = x² + 2x', why: 'x² があるので一次関数ではない。' },
      { h: 'y = 8', why: 'x が出てこない（a = 0）ので一次関数ではない。' },
      { h: 'y = <span class="frac"><span>3</span><span>x</span></span> + 1', why: 'x が分母にあるので一次関数ではない。' },
      { h: 'y = x² ' + MINUS + ' 1', why: 'x² があるので一次関数ではない。' }
    ];
    var askYes = Math.random() < 0.5, correct, others;
    if (askYes) { correct = pick(yes); others = shuffle(no).slice(0, 3); }
    else { correct = pick(no); others = shuffle(yes).slice(0, 3); }
    var all = shuffle([correct].concat(others));
    return {
      kind: 'choice',
      text: askYes ? '次のうち、y が x の<b>一次関数である</b>ものを1つ選びなさい。' : '次のうち、y が x の一次関数で<b>ない</b>ものを1つ選びなさい。',
      choices: all.map(function (o) { return o.h; }),
      correct: all.indexOf(correct),
      ansHTML: correct.h,
      hints: [
        '一次関数は y = ax + b（a は 0 でない数）の形で表せる式です。x が分母にあったり、x² のように2乗になっていたりしたら、ちがいます。',
        '1つずつ、y = ax + b の形になるか確かめよう。b = 0 の y = ax も一次関数です（比例は一次関数の特別な場合）。'
      ],
      steps: all.map(function (o) { return o.h + ' → ' + o.why; })
    };
  }
  function g1b() {
    var a = nz(-5, 5), b = nz(-8, 8), p = rnd(-4, 5), y = a * p + b;
    return {
      kind: 'num',
      text: '一次関数 <b>' + eqH(a, 1, b) + '</b> で、x = ' + m(p) + ' のとき、y の値を求めなさい。',
      exp: y, ansHTML: m(y),
      hints: ['式の x に ' + m(p) + ' を代入するよ。マイナスの数は（　）をつけて代入すると、ミスが減ります。',
        'y = ' + m(a) + ' × ' + par(p) + constTail(b) + ' を計算しよう。かけ算が先です。'],
      steps: ['x = ' + m(p) + ' を式に代入する。',
        'y = ' + m(a) + ' × ' + par(p) + constTail(b),
        'y = ' + m(a * p) + constTail(b),
        'y = ' + m(y)]
    };
  }
  function g1c() {
    var a = nz(-5, 5), b = nz(-8, 8), p = rnd(-3, 2), q = p + rnd(1, 4), yp = a * p + b, yq = a * q + b;
    return {
      kind: 'num',
      text: '一次関数 <b>' + eqH(a, 1, b) + '</b> で、x が ' + m(p) + ' から ' + m(q) + ' まで増加するときの、<b>変化の割合</b>を求めなさい。',
      exp: a, ansHTML: m(a),
      hints: ['変化の割合 ＝ （y の増加量）÷（x の増加量）です。',
        'x = ' + m(p) + ' のときと x = ' + m(q) + ' のときの y をそれぞれ出して、増加量を求めてから割ろう。'],
      steps: ['x = ' + m(p) + ' のとき y = ' + m(yp),
        'x = ' + m(q) + ' のとき y = ' + m(yq),
        'y の増加量 ＝ ' + m(yq) + ' − ' + par(yp) + ' ＝ ' + m(yq - yp),
        'x の増加量 ＝ ' + m(q) + ' − ' + par(p) + ' ＝ ' + (q - p),
        '変化の割合 ＝ ' + m(yq - yp) + ' ÷ ' + (q - p) + ' ＝ ' + m(a),
        'ポイント：一次関数の変化の割合は、いつも x の係数 a と同じ（一定）です。']
    };
  }
  function g1d() {
    var a = nz(-5, 5), b = nz(-8, 8), dx = rnd(2, 6);
    return {
      kind: 'num',
      text: '一次関数 <b>' + eqH(a, 1, b) + '</b> で、x が ' + dx + ' 増加すると、y はいくつ増加しますか。（減るときはマイナスをつけて答える）',
      exp: a * dx, ansHTML: m(a * dx),
      hints: ['y の増加量 ＝ 変化の割合 × x の増加量 です。',
        '一次関数の変化の割合は x の係数と同じ。この式ではいくつかな？'],
      steps: ['変化の割合は x の係数 ' + m(a) + '。',
        'y の増加量 ＝ 変化の割合 × x の増加量',
        '＝ ' + m(a) + ' × ' + dx + ' ＝ ' + m(a * dx)]
    };
  }

  // ② グラフ：傾きと切片 ---------------------------------------------
  function g2a() {
    var asked = pick(['slope', 'int']), b = nz(-8, 8), eq, slope, slopeH, isFrac = false, reorder = false, a, steps;
    var r = Math.random();
    if (r < 0.35) {
      var q = pick([2, 3, 4]), p;
      do { p = nz(-7, 7); } while (gcd(p, q) !== 1);
      isFrac = true; slope = p / q; slopeH = frH(p, q); eq = eqH(p, q, b);
    } else if (r < 0.65) {
      a = nz(-6, 6); reorder = true; slope = a; slopeH = m(a);
      eq = 'y = ' + m(b) + ' ' + (a < 0 ? MINUS : '+') + ' ' + (Math.abs(a) === 1 ? '' : Math.abs(a)) + 'x';
    } else {
      a = nz(-6, 6); slope = a; slopeH = m(a); eq = eqH(a, 1, b);
    }
    steps = [reorder ? '式を y = ax + b の順にならべかえると ' + eqText(slope, b) + ' です。' : 'y = ax + b の形と見くらべる。',
      'x の係数が傾き → ' + slopeH,
      'x がつかない数が切片 → ' + m(b)];
    return {
      kind: 'num',
      text: '一次関数 <b>' + eq + '</b> のグラフについて、<b>' + (asked === 'slope' ? '傾き' : '切片（y 軸と交わる点の y 座標）') + '</b>を答えなさい。' + fracNote(isFrac && asked === 'slope'),
      exp: asked === 'slope' ? slope : b, ansHTML: asked === 'slope' ? slopeH : m(b),
      hints: ['y = ax + b の a が「傾き」、b が「切片」です。',
        reorder ? '式を y = ax + b の順にならべかえてみよう。x の前の数が傾き、x のついていない数が切片。' : 'x の前の数が傾き、x のついていない数が切片です。'],
      steps: steps
    };
  }
  function g2b() {
    var d = 1, a, pp, qq, b = rnd(-4, 4);
    if (Math.random() < 0.3) { pp = pick([-3, -1, 1, 3]); qq = 2; d = 2; a = pp / 2; }
    else { pp = pick([-3, -2, -1, 1, 2, 3]); qq = 1; a = pp; }
    var y2 = a * d + b, rise = a * d;
    return {
      kind: 'eq',
      text: '下のグラフの直線の式を、<b>y = ax + b</b> の形で求めなさい。（●は、マス目の角を通る点です）',
      graph: graphSVG({ lines: [{ a: a, b: b, color: '#2563eb' }], pts: [{ x: 0, y: b }, { x: d, y: y2 }] }),
      exp: { a: a, b: b }, ansHTML: eqH(pp, qq, b),
      hints: ['まず、グラフが y 軸と交わる点を見よう。その y 座標が切片 b です。',
        '次に、●印の2点をたどって「右へいくつ進むと、上（下）へいくつ進むか」を数えよう。それが傾き a です（分数になることもあるよ）。'],
      steps: ['y 軸と交わる点は (0, ' + m(b) + ') → 切片 b ＝ ' + m(b),
        'グラフが通るもう1つの点 (' + d + ', ' + m(y2) + ') を見つける。',
        '(0, ' + m(b) + ') から右へ ' + d + ' 進むと、' + (rise >= 0 ? '上へ ' + rise : '下へ ' + (-rise)) + ' 進む → 傾き a ＝ ' + frH(rise, d),
        '式は ' + eqH(pp, qq, b)]
    };
  }
  function g2c() {
    var p = rnd(1, 4), q = nz(-6, 6);
    return {
      kind: 'num',
      text: 'グラフ上で、右へ ' + p + ' 進むと、' + (q > 0 ? '上へ ' + q : '下へ ' + (-q)) + ' 進む直線があります。この直線の<b>傾き</b>を答えなさい。（分数は 3/2 のように書けます）',
      exp: q / p, ansHTML: frH(q, p),
      hints: ['傾き ＝ （上へ進む量）÷（右へ進む量）。下へ進むときは、「上へ進む量」がマイナスになります。',
        'y の増加量は ' + m(q) + '、x の増加量は ' + p + ' です。'],
      steps: ['傾き ＝ （y の増加量）÷（x の増加量）',
        'x の増加量 ＝ ' + p + '、y の増加量 ＝ ' + m(q) + (q < 0 ? '（下へ進むのでマイナス）' : ''),
        '傾き ＝ ' + m(q) + ' ÷ ' + p + ' ＝ ' + frH(q, p)]
    };
  }
  function g2d() {
    var f = Math.random() < 0.3, pp, qq, b = nz(-7, 7);
    if (f) { qq = pick([2, 3]); do { pp = nz(-5, 5); } while (gcd(pp, qq) !== 1); } else { pp = nz(-5, 5); qq = 1; }
    return {
      kind: 'eq',
      text: '傾きが <b>' + frH(pp, qq) + '</b>、切片が <b>' + m(b) + '</b> の一次関数の式を求めなさい。',
      exp: { a: pp / qq, b: b }, ansHTML: eqH(pp, qq, b),
      hints: ['一次関数は y = ax + b。a が傾き、b が切片です。',
        'a と b に、数をそのままあてはめよう。a = 1 や a = −1 のときは「1x」とは書かず、x や −x と書くよ。'],
      steps: ['y = ax + b に a ＝ ' + frH(pp, qq) + '、b ＝ ' + m(b) + ' を入れる。', eqH(pp, qq, b)]
    };
  }
  function g2e() {
    var a = nz(-4, 4), b = rnd(-5, 5), xs = shuffle([-3, -2, -1, 0, 1, 2, 3, 4]).slice(0, 4), ci = rnd(0, 3);
    var pts = xs.map(function (x, i) { return { x: x, y: a * x + b + (i === ci ? 0 : pick([-3, -2, -1, 1, 2, 3])) }; });
    return {
      kind: 'choice',
      text: '一次関数 <b>' + eqH(a, 1, b) + '</b> のグラフ上にある点はどれですか。',
      choices: pts.map(function (p) { return '(' + m(p.x) + ', ' + m(p.y) + ')'; }),
      correct: ci, ansHTML: '(' + m(pts[ci].x) + ', ' + m(pts[ci].y) + ')',
      hints: ['グラフ上の点は、x と y を式に入れたとき、等式が成り立つ点です。',
        '点の x の値を式に代入して y を計算し、点の y 座標と同じなら、その点はグラフ上にあります。'],
      steps: pts.map(function (p, i) {
        var yy = a * p.x + b;
        return '(' + m(p.x) + ', ' + m(p.y) + ')：x = ' + m(p.x) + ' を代入すると y = ' + m(yy) + (i === ci ? ' → 一致 ○' : ' → 点の y は ' + m(p.y) + ' なので ×');
      })
    };
  }

  // ③ 式を求める ----------------------------------------------------
  function g3a() {
    var n, d, p, b = nz(-6, 6);
    if (Math.random() < 0.3) { n = pick([-3, -1, 1, 3]); d = 2; p = pick([-4, -2, 2, 4]); }
    else { n = nz(-4, 4); d = 1; p = nz(-4, 4); }
    var ap = n * p / d, q = ap + b;
    return {
      kind: 'eq',
      text: '傾きが <b>' + frH(n, d) + '</b> で、点 <b>(' + m(p) + ', ' + m(q) + ')</b> を通る直線の式を求めなさい。',
      exp: { a: n / d, b: b }, ansHTML: eqH(n, d, b),
      hints: ['式を y = ax + b とおこう。傾き a はもう分かっているので、あとは b を求めればOK。',
        '通る点の x, y の値を y = ax + b に代入すると、b だけが分からない方程式になります。それを解こう。'],
      steps: ['求める式を y = ax + b とおく。傾きが ' + frH(n, d) + ' なので y = ' + xTerm(n, d) + ' + b',
        '点 (' + m(p) + ', ' + m(q) + ') を通るので x = ' + m(p) + '、y = ' + m(q) + ' を代入する。',
        m(q) + ' ＝ ' + parH(n, d) + ' × ' + par(p) + ' + b　→　' + m(q) + ' ＝ ' + m(ap) + ' + b',
        'b ＝ ' + m(q) + ' − ' + par(ap) + ' ＝ ' + m(b),
        '答え：' + eqH(n, d, b)]
    };
  }
  function g3b() {
    var n, d, x1, x2, b = rnd(-5, 5);
    if (Math.random() < 0.3) { n = pick([-3, -1, 1, 3]); d = 2; x1 = pick([-4, -2, 0, 2]); x2 = x1 + 2 * rnd(1, 2); }
    else { n = nz(-4, 4); d = 1; x1 = rnd(-3, 2); x2 = x1 + rnd(1, 4); }
    var y1 = n * x1 / d + b, y2 = n * x2 / d + b, ax1 = n * x1 / d;
    return {
      kind: 'eq',
      text: '2点 <b>(' + m(x1) + ', ' + m(y1) + ')</b>、<b>(' + m(x2) + ', ' + m(y2) + ')</b> を通る直線の式を求めなさい。',
      exp: { a: n / d, b: b }, ansHTML: eqH(n, d, b),
      hints: ['まず傾き a を、（y の増加量）÷（x の増加量）で求めよう。',
        '傾きが分かったら、通る点の1つ (' + m(x1) + ', ' + m(y1) + ') を y = ax + b に代入して b を求めます。'],
      steps: ['傾き a ＝ （y の増加量）÷（x の増加量） ＝ (' + m(y2) + ' − ' + par(y1) + ') ÷ (' + m(x2) + ' − ' + par(x1) + ')',
        '＝ ' + m(y2 - y1) + ' ÷ ' + (x2 - x1) + ' ＝ ' + frH(n, d),
        'y = ' + xTerm(n, d) + ' + b に (' + m(x1) + ', ' + m(y1) + ') を代入：' + m(y1) + ' ＝ ' + parH(n, d) + ' × ' + par(x1) + ' + b',
        'b ＝ ' + m(y1) + ' − ' + par(ax1) + ' ＝ ' + m(b),
        '答え：' + eqH(n, d, b)]
    };
  }
  function g3c() {
    var a = nz(-4, 4), c = rnd(-6, 6), p = rnd(-3, 4), b, q;
    do { b = rnd(-6, 6); } while (b === c);
    q = a * p + b;
    return {
      kind: 'eq',
      text: '直線 <b>' + eqH(a, 1, c) + '</b> に<b>平行</b>で、点 <b>(' + m(p) + ', ' + m(q) + ')</b> を通る直線の式を求めなさい。',
      exp: { a: a, b: b }, ansHTML: eqH(a, 1, b),
      hints: ['平行な2直線は、傾きが同じ（切片はちがう）です。',
        '傾きが決まったら、通る点の x, y を代入して b を求めよう。'],
      steps: ['平行な直線は傾きが等しいので a ＝ ' + m(a),
        'y = ' + xTerm(a, 1) + ' + b に (' + m(p) + ', ' + m(q) + ') を代入：' + m(q) + ' ＝ ' + m(a) + ' × ' + par(p) + ' + b',
        'b ＝ ' + m(q) + ' − ' + par(a * p) + ' ＝ ' + m(b),
        '答え：' + eqH(a, 1, b)]
    };
  }
  function g3d() {
    var a = nz(-4, 4), b = rnd(-6, 6), x0 = rnd(1, 3), xs = [x0, x0 + 1, x0 + 2, x0 + 3];
    var ys = xs.map(function (x) { return a * x + b; });
    var tbl = '<table class="tbl"><tr><th>x</th>' + xs.map(function (v) { return '<td>' + m(v) + '</td>'; }).join('') +
      '</tr><tr><th>y</th>' + ys.map(function (v) { return '<td>' + m(v) + '</td>'; }).join('') + '</tr></table>';
    return {
      kind: 'eq',
      text: 'y は x の一次関数で、x と y の値が次の表のようになっています。この一次関数の式を求めなさい。' + tbl,
      exp: { a: a, b: b }, ansHTML: eqH(a, 1, b),
      hints: ['表を横に見て、x が 1 増えるとき y がいくつ増える（減る）か調べよう。それが傾きです。',
        '傾きが分かったら、表の1組の (x, y) を y = ax + b に代入して b を求めます。'],
      steps: ['x が 1 増えるとき、y は ' + m(a) + ' 増えている → 傾き a ＝ ' + m(a),
        'y = ' + xTerm(a, 1) + ' + b に、表の x = ' + xs[0] + '、y = ' + m(ys[0]) + ' を代入する。',
        m(ys[0]) + ' ＝ ' + m(a) + ' × ' + xs[0] + ' + b　→　b ＝ ' + m(b),
        '答え：' + eqH(a, 1, b)]
    };
  }

  // ④ 方程式とグラフ・交点 ------------------------------------------
  function g4a() {
    var cb = pick([1, -1, 2, -2, 3]), ca = nz(-4, 4), k = nz(-4, 4), c = cb * k;
    function coefX(v) { return v === 1 ? 'x' : (v === -1 ? MINUS + 'x' : m(v) + 'x'); }
    function coefY(v) { return v === 1 ? 'y' : (v === -1 ? MINUS + 'y' : m(v) + 'y'); }
    var eq = coefX(ca) + ' ' + (cb < 0 ? MINUS : '+') + ' ' + (Math.abs(cb) === 1 ? '' : Math.abs(cb)) + 'y ＝ ' + m(c);
    var rhs = m(c) + (ca > 0 ? ' − ' : ' + ') + (Math.abs(ca) === 1 ? '' : Math.abs(ca)) + 'x';
    return {
      kind: 'eq',
      text: '方程式 <b>' + eq + '</b> を、<b>y = ax + b の形</b>（y について解いた式）に直しなさい。',
      exp: { a: -ca / cb, b: k }, ansHTML: eqH(-ca, cb, k),
      hints: ['y = … の形にするには、まず x の項を右辺に移項します（移項すると符号が変わる）。',
        'y の前の数で、右辺ぜんぶを割ります。x の項も数の項も、両方割るのを忘れずに。'],
      steps: ['x の項を右辺へ移項する：' + coefY(cb) + ' ＝ ' + rhs,
        cb === 1 ? 'y の係数は 1 なので、そのままでOK。' : '両辺を ' + m(cb) + ' で割る。',
        '答え：' + eqH(-ca, cb, k)]
    };
  }
  function g4b() {
    var a = nz(-4, 4), k = nz(-3, 3), b = a * k, onX = Math.random() < 0.5, ans = onX ? [-k, 0] : [0, b];
    return {
      kind: 'point',
      text: '一次関数 <b>' + eqH(a, 1, b) + '</b> のグラフと、<b>' + (onX ? 'x 軸' : 'y 軸') + '</b>との交点の座標を求めなさい。（例：(2, 0) のように書く）',
      exp: ans, ansHTML: '(' + m(ans[0]) + ', ' + m(ans[1]) + ')',
      hints: onX
        ? ['x 軸の上にある点は、y 座標が 0 です。', '式の y に 0 を代入して、x について解こう。']
        : ['y 軸の上にある点は、x 座標が 0 です。', '式の x に 0 を代入すると、y がすぐ出ます（切片のことだよ）。'],
      steps: onX
        ? ['x 軸上の点は y 座標が 0 だから、y = 0 を代入する。', '0 ＝ ' + m(a) + 'x' + constTail(b), m(a) + 'x ＝ ' + m(-b) + '　→　x ＝ ' + m(-k), '交点は (' + m(-k) + ', 0)']
        : ['y 軸上の点は x 座標が 0 だから、x = 0 を代入する。', 'y ＝ ' + m(a) + ' × 0' + constTail(b) + ' ＝ ' + m(b), '交点は (0, ' + m(b) + ')']
    };
  }
  function g4c() {
    var px = rnd(-3, 3), py = rnd(-3, 3), a1 = nz(-3, 3), a2;
    do { a2 = nz(-3, 3); } while (a2 === a1);
    var b1 = py - a1 * px, b2 = py - a2 * px;
    return {
      kind: 'point',
      text: '2直線 <b>① ' + eqH(a1, 1, b1) + '</b>、<b>② ' + eqH(a2, 1, b2) + '</b> の交点の座標を求めなさい。（例：(2, 3) のように書く）',
      exp: [px, py], ansHTML: '(' + m(px) + ', ' + m(py) + ')',
      hints: ['2直線の交点は、2つの式がどちらも成り立つ点。つまり連立方程式の解 (x, y) です。',
        '①と②の右辺を「＝」で結んで x の方程式を作ろう。x が出たら、①か②に代入して y を出します。'],
      steps: ['交点では①と②の y が等しいので：' + xTerm(a1, 1) + constTail(b1) + ' ＝ ' + xTerm(a2, 1) + constTail(b2),
        'x の項と数の項をそれぞれ集める：' + m(a1 - a2) + 'x ＝ ' + m(b2 - b1),
        'x ＝ ' + m(px),
        '①に代入：y ＝ ' + m(a1) + ' × ' + par(px) + constTail(b1) + ' ＝ ' + m(py),
        '交点は (' + m(px) + ', ' + m(py) + ')']
    };
  }
  function g4d() {
    var px = rnd(-4, 4), py = rnd(-4, 4), a1 = pick([-2, -1, 1, 2]), a2;
    do { a2 = pick([-2, -1, 1, 2]); } while (a2 === a1);
    var b1 = py - a1 * px, b2 = py - a2 * px;
    return {
      kind: 'point',
      text: '下のグラフは、2直線 <b>① ' + eqH(a1, 1, b1) + '</b>（青）、<b>② ' + eqH(a2, 1, b2) + '</b>（オレンジ）のグラフです。グラフから、2直線の<b>交点の座標</b>を読み取りなさい。',
      graph: graphSVG({ lines: [{ a: a1, b: b1, color: '#2563eb' }, { a: a2, b: b2, color: '#ea580c' }] }),
      exp: [px, py], ansHTML: '(' + m(px) + ', ' + m(py) + ')',
      hints: ['2本の線が交わっている点を探そう。マス目の角にぴったり重なっているはずです。',
        '原点から横に何マス（x 座標）、縦に何マス（y 座標）かを数えよう。左と下はマイナスだよ。'],
      steps: ['2本の線が交わる点を見つける。', '原点から、右へ ' + m(px) + '、上へ ' + m(py) + ' → 交点は (' + m(px) + ', ' + m(py) + ')',
        '確かめ：①に x = ' + m(px) + ' を代入すると y = ' + m(a1 * px + b1) + '、②でも y = ' + m(a2 * px + b2) + ' になる。']
    };
  }

  // ⑤ 利用（文章題） ------------------------------------------------
  function g5a() {
    if (Math.random() < 0.65) {
      var a = rnd(2, 8), b = rnd(1, 6) * 5;
      return {
        kind: 'eq',
        text: '水が ' + b + ' L 入っている水そうに、毎分 ' + a + ' L ずつ水を入れます。水を入れ始めてから x 分後の水の量を y L として、y を x の式で表しなさい。',
        exp: { a: a, b: b }, ansHTML: eqH(a, 1, b),
        hints: ['y ＝（1分あたりに増える量）× x ＋（はじめの量）の形になります。',
          '「毎分 ' + a + ' L」が傾き、「はじめに入っていた ' + b + ' L」が切片です。'],
        steps: ['はじめの量 ' + b + ' L → 切片 b ＝ ' + b, '毎分 ' + a + ' L ずつ増える → 傾き a ＝ ' + a,
          'x 分間で ' + a + 'x L 増えるので、答え：' + eqH(a, 1, b)]
      };
    }
    var c = pick([0.5, 1, 1.5, 2]), L = rnd(5, 20);
    return {
      kind: 'eq',
      text: 'ばねにおもりを 1 g つるすごとに、ばねは ' + c + ' cm ずつのびます。何もつるさないときのばねの長さは ' + L + ' cm です。x g のおもりをつるしたときのばねの長さを y cm として、y を x の式で表しなさい。',
      exp: { a: c, b: L }, ansHTML: 'y = ' + decTerm(c) + ' + ' + L,
      hints: ['y ＝（1 g あたりののび）× x ＋（もとの長さ）の形になります。',
        '「1 g ごとに ' + c + ' cm」が傾き、「何もつるさないときの ' + L + ' cm」が切片です。'],
      steps: ['もとの長さ ' + L + ' cm → 切片 b ＝ ' + L, '1 g ごとに ' + c + ' cm のびる → 傾き a ＝ ' + c, '答え：y = ' + decTerm(c) + ' + ' + L]
    };
  }
  function g5b() {
    var a = rnd(2, 8), b = rnd(1, 6) * 5, t = rnd(2, 9), k = a * t + b;
    return {
      kind: 'num',
      text: '水が ' + b + ' L 入っている水そうに、毎分 ' + a + ' L ずつ水を入れます。水の量が ' + k + ' L になるのは、水を入れ始めてから何分後ですか。',
      exp: t, ansHTML: t + '（分後）',
      hints: ['x 分後の水の量 y L は、y ＝ ' + a + 'x ＋ ' + b + ' と表せます。',
        'y ＝ ' + k + ' を代入して、x の方程式を解こう。'],
      steps: ['x 分後の水の量を y L とすると y ＝ ' + a + 'x ＋ ' + b,
        'y ＝ ' + k + ' を代入：' + k + ' ＝ ' + a + 'x ＋ ' + b,
        a + 'x ＝ ' + (k - b) + '　→　x ＝ ' + t, t + ' 分後']
    };
  }
  function g5c() {
    var a = rnd(1, 4), t = rnd(5, 12), b = a * t;
    return {
      kind: 'eq',
      text: '長さ ' + b + ' cm のろうそくに火をつけると、毎分 ' + a + ' cm ずつ短くなります。火をつけてから x 分後のろうそくの長さを y cm として、y を x の式で表しなさい。',
      exp: { a: -a, b: b }, ansHTML: eqH(-a, 1, b),
      hints: ['短くなっていくときは、傾きがマイナスになります。',
        'y ＝ −（1分に短くなる量）× x ＋（はじめの長さ）です。'],
      steps: ['はじめの長さ ' + b + ' cm → 切片 b ＝ ' + b, '毎分 ' + a + ' cm「短くなる」→ 傾きはマイナス：a ＝ ' + m(-a), '答え：' + eqH(-a, 1, b)]
    };
  }
  function g5d() {
    var a = rnd(1, 4), t = rnd(5, 12), b = a * t;
    return {
      kind: 'num',
      text: '長さ ' + b + ' cm のろうそくに火をつけると、毎分 ' + a + ' cm ずつ短くなります。このろうそくが燃えつきる（長さが 0 cm になる）のは、火をつけてから何分後ですか。',
      exp: t, ansHTML: t + '（分後）',
      hints: ['長さが 0 cm になるとき ＝ y が 0 のときです。',
        '先に式 y ＝ ' + m(-a) + 'x ＋ ' + b + ' を作って、y ＝ 0 を代入して x を求めよう。'],
      steps: ['x 分後の長さを y cm とすると y ＝ ' + m(-a) + 'x ＋ ' + b,
        '燃えつきるのは y ＝ 0 のとき：0 ＝ ' + m(-a) + 'x ＋ ' + b,
        a + 'x ＝ ' + b + '　→　x ＝ ' + t, t + ' 分後']
    };
  }
  function g5e() {
    var a1 = rnd(2, 10), d = rnd(2, 6), a2 = a1 + d, t = rnd(5, 20), b2 = pick([300, 500, 800]), b1 = b2 + d * t;
    return {
      kind: 'num',
      text: 'スマホの料金プランが2つあります。<br>プラン A：基本料 ' + b1 + ' 円 ＋ 通話 1 分につき ' + a1 + ' 円<br>プラン B：基本料 ' + b2 + ' 円 ＋ 通話 1 分につき ' + a2 + ' 円<br>通話時間 x 分のときの料金を y 円とします。2つのプランの料金が同じになるのは、通話が何分のときですか。',
      exp: t, ansHTML: t + '（分）',
      hints: ['プラン A と B の料金を、それぞれ x の式で表そう。',
        '「料金が同じ」＝ 2つの式の右辺が等しい。それを方程式にして解きます（グラフなら交点の x 座標）。'],
      steps: ['A：y ＝ ' + a1 + 'x ＋ ' + b1 + '、B：y ＝ ' + a2 + 'x ＋ ' + b2,
        '料金が同じ → ' + a1 + 'x ＋ ' + b1 + ' ＝ ' + a2 + 'x ＋ ' + b2,
        'x の項と数の項を集める：' + d + 'x ＝ ' + (b1 - b2) + '　→　x ＝ ' + t, t + ' 分']
    };
  }

  /* ---------- 単元とスキル ---------- */
  var UNITS = [
    {
      id: 'u1', no: 1, name: '一次関数とは', note: '式・変化の割合',
      learn: '<h3>一次関数ってなに？</h3>' +
        '<p>y が x の式で <b>y = ax + b</b>（a は 0 ではない）と表せるとき、「y は x の<b>一次関数</b>」といいます。</p>' +
        '<ul><li>b = 0 のとき（y = ax）は<b>比例</b>。比例は一次関数の特別な場合です。</li>' +
        '<li>x が2乗（x²）になっていたり、分母（6/x）にあったりするものは、一次関数ではありません。</li></ul>' +
        '<h3>変化の割合</h3><div class="box">変化の割合 ＝ （y の増加量）÷（x の増加量）</div>' +
        '<p>一次関数 y = ax + b では、変化の割合は<b>いつも a と同じ</b>（一定）です。</p>' +
        '<div class="ex"><b>例</b>　y = 2x + 1 で、x が 1 → 3 に増えるとき<br>y は 3 → 7 で、増加量は 4。x の増加量は 2。<br>変化の割合 ＝ 4 ÷ 2 ＝ 2（x の係数と同じ）</div>',
      skills: [
        { id: 's1a', name: '一次関数を見分ける', gen: g1a },
        { id: 's1b', name: 'x の値から y の値を求める', gen: g1b },
        { id: 's1c', name: '変化の割合を求める', gen: g1c },
        { id: 's1d', name: 'y の増加量を求める', gen: g1d }
      ]
    },
    {
      id: 'u2', no: 2, name: 'グラフ：傾きと切片', note: '式とグラフの関係',
      learn: '<h3>傾きと切片</h3><p>y = ax + b のグラフは<b>直線</b>です。</p>' +
        '<ul><li><b>a ＝ 傾き</b>：右へ 1 進むと、上へ a 進む。a が＋なら右上がり、−なら右下がり。</li>' +
        '<li><b>b ＝ 切片</b>：グラフが y 軸と交わる点 (0, b) の y 座標。</li></ul>' +
        '<h3>グラフのかき方</h3><ol><li>切片 b から、y 軸上の点 (0, b) に印をつける。</li>' +
        '<li>そこから傾きの分だけ進んだ点に印をつける（傾き 3/2 なら、右へ 2・上へ 3）。</li><li>2点を通る直線をひく。</li></ol>' +
        '<div class="ex"><b>例</b>　y = 2x − 1<br>切片が −1 なので (0, −1) を通る。傾きが 2 なので、右へ 1・上へ 2 進んだ (1, 1) も通る。</div>' +
        '<p>下の「グラフで確かめよう」で、a と b を動かして、直線の変わり方を見てみよう。</p>',
      skills: [
        { id: 's2a', name: '式から傾き・切片を読む', gen: g2a },
        { id: 's2b', name: 'グラフから式を求める', gen: g2b },
        { id: 's2c', name: '「右へ・上へ」から傾きを求める', gen: g2c },
        { id: 's2d', name: '傾きと切片から式を作る', gen: g2d },
        { id: 's2e', name: 'グラフ上の点を見つける', gen: g2e }
      ]
    },
    {
      id: 'u3', no: 3, name: '式を求める', note: '1点・2点・平行',
      learn: '<h3>式の求め方</h3><div class="box">求める式を y = ax + b とおいて、a と b を順に決める</div>' +
        '<h4>① 傾きと、通る1点がわかっているとき</h4><p>点の x, y を代入して b を求めます。</p>' +
        '<div class="ex"><b>例</b>　傾き 2、点 (1, 5) を通る<br>y = 2x + b に x = 1, y = 5 を代入 → 5 = 2 + b → b = 3<br>答え：y = 2x + 3</div>' +
        '<h4>② 通る2点がわかっているとき</h4><p>先に傾き a ＝（y の増加量）÷（x の増加量）を求め、次に1点を代入して b を求めます。</p>' +
        '<div class="ex"><b>例</b>　2点 (1, 3)、(3, 7) を通る<br>傾き ＝ (7 − 3) ÷ (3 − 1) ＝ 2。y = 2x + b に (1, 3) を代入 → 3 = 2 + b → b = 1<br>答え：y = 2x + 1</div>' +
        '<h4>③ 平行な直線</h4><p>平行な直線は<b>傾きが同じ</b>です。</p>',
      skills: [
        { id: 's3a', name: '傾きと通る1点から式を求める', gen: g3a },
        { id: 's3b', name: '通る2点から式を求める', gen: g3b },
        { id: 's3c', name: '平行な直線の式を求める', gen: g3c },
        { id: 's3d', name: '表から式を求める', gen: g3d }
      ]
    },
    {
      id: 'u4', no: 4, name: '方程式とグラフ・交点', note: '軸との交点・2直線の交点',
      learn: '<h3>軸との交点</h3><ul><li><b>x 軸との交点</b>：y = 0 を代入して x を求める。</li>' +
        '<li><b>y 軸との交点</b>：x = 0 を代入する（切片と同じ）。</li></ul>' +
        '<h3>2直線の交点</h3><p>交点の座標は、2つの式を連立方程式として解いた (x, y) です。右辺どうしを等しくして x を求め、代入して y を求めます。</p>' +
        '<div class="ex"><b>例</b>　y = x + 1 と y = −x + 5<br>x + 1 = −x + 5 → 2x = 4 → x = 2、y = 3　→　交点は (2, 3)</div>' +
        '<h3>2元1次方程式のグラフ</h3><p>ax + by = c は、<b>y について解く</b>と傾きと切片が見えます。</p>' +
        '<div class="ex"><b>例</b>　2x + y = 6 → y = −2x + 6</div>',
      skills: [
        { id: 's4a', name: '方程式を y = ax + b の形に直す', gen: g4a },
        { id: 's4b', name: '軸との交点を求める', gen: g4b },
        { id: 's4c', name: '2直線の交点を求める（式）', gen: g4c },
        { id: 's4d', name: '2直線の交点を読み取る（グラフ）', gen: g4d }
      ]
    },
    {
      id: 'u5', no: 5, name: '一次関数の利用', note: '文章題',
      learn: '<h3>文章題を式にするコツ</h3><ul>' +
        '<li>「はじめの量」→ 切片 b</li><li>「1あたりの変化（毎分○ など）」→ 傾き a</li>' +
        '<li>増えていく → a は＋　／　減っていく → a は−</li>' +
        '<li>「〜になるのは何分後？」→ y に値を入れて、x を求める</li>' +
        '<li>「2つが同じになるのは？」→ 2つの式を「＝」で結ぶ（グラフの交点）</li></ul>' +
        '<div class="ex"><b>例</b>　はじめ 10 L、毎分 3 L ずつ増える → y = 3x + 10<br>y = 28 になるのは 3x + 10 = 28 → x = 6（分後）</div>',
      skills: [
        { id: 's5a', name: '増える量を式で表す', gen: g5a },
        { id: 's5b', name: '何分後に…を求める', gen: g5b },
        { id: 's5c', name: '減る量を式で表す', gen: g5c },
        { id: 's5d', name: '0 になるときを求める', gen: g5d },
        { id: 's5e', name: '2つが同じになるときを求める', gen: g5e }
      ]
    }
  ];

  var SKILLS = {}, SKILL_UNIT = {};
  UNITS.forEach(function (u) { u.skills.forEach(function (s) { SKILLS[s.id] = s; SKILL_UNIT[s.id] = u.id; }); });

  function makeQuestion(skillId) {
    var q = SKILLS[skillId].gen();
    q.skill = skillId;
    return q;
  }

  var api = {
    UNITS: UNITS, SKILLS: SKILLS, SKILL_UNIT: SKILL_UNIT,
    makeQuestion: makeQuestion, checkAnswer: checkAnswer, graphSVG: graphSVG,
    normalize: normalize, evalExpr: evalExpr, eqText: eqText, shuffle: shuffle, pick: pick, MINUS: MINUS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof window !== 'undefined' ? window : this);
