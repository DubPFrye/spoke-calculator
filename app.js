/* Spoke calculator UI: reads the form, runs Spoke.wheel(), draws the results. */
(function () {
  'use strict';

  const form = document.getElementById('form');
  const $ = (id) => document.getElementById(id);
  const F = form.elements;
  const SVGNS = 'http://www.w3.org/2000/svg';
  let view = 'B';

  // Short keys for the shareable link (#erd=559&n=36...).
  const KEYS = {
    erd: 'erd', rimOffset: 'ro', holeStagger: 'hs', pcdL: 'pl', offL: 'ol', pcdR: 'pr', offR: 'or',
    hubHole: 'hh', spokes: 'n', crossL: 'xl', crossR: 'xr', step: 'st', sameHub: 'same',
  };

  const num = (name) => (F[name].value.trim() === '' ? NaN : Number(F[name].value));

  function fillCross(select, spokes, keep) {
    const max = Math.ceil(spokes / 4) - 1;
    select.innerHTML = '';
    for (let x = 0; x <= max; x++) {
      const o = document.createElement('option');
      o.value = String(x);
      o.textContent = x === 0 ? '0 (radial)' : `${x}`;
      select.appendChild(o);
    }
    select.value = String(Math.min(keep, max));
  }

  function syncSame() {
    const same = F.sameHub.checked;
    F.pcdR.disabled = same;
    F.offR.disabled = same;
    if (same) { F.pcdR.value = F.pcdL.value; F.offR.value = F.offL.value; }
  }

  function readInputs() {
    return {
      erd: num('erd'),
      spokes: Number(F.spokes.value),
      hubHole: num('hubHole'),
      rimOffset: num('rimOffset'),
      holeStagger: num('holeStagger'),
      left: { pcd: num('pcdL'), offset: num('offL'), cross: Number(F.crossL.value) },
      right: { pcd: num('pcdR'), offset: num('offR'), cross: Number(F.crossR.value) },
    };
  }

  const mm = (x, d = 1) => `${x.toFixed(d)} mm`;
  const dg = (x) => `${x.toFixed(1)}°`;

  function showError(msg) {
    $('err').textContent = msg;
    $('err').hidden = false;
    ['lenL', 'lenR', 'miniL', 'miniR'].forEach((id) => { $(id).textContent = '–'; });
    $('exactL').textContent = $('exactR').textContent = '';
    $('warn').hidden = true;
    $('details').innerHTML = '';
    $('wheel').innerHTML = '';
    $('section').innerHTML = '';
  }

  function render() {
    syncSame();
    const w = readInputs();
    // Mark empty or non-numeric fields.
    for (const el of form.querySelectorAll('input[type=number]')) {
      el.setAttribute('aria-invalid', el.value.trim() === '' || !Number.isFinite(Number(el.value)) ? 'true' : 'false');
    }
    let r;
    try { r = Spoke.wheel(w); } catch (e) { showError(e.message); saveHash(); return; }
    $('err').hidden = true;

    const step = Number(F.step.value);
    const dec = step < 1 ? 1 : 0;
    const L = Spoke.roundTo(r.left.length, step), R = Spoke.roundTo(r.right.length, step);
    $('lenL').textContent = L.toFixed(dec);
    $('lenR').textContent = R.toFixed(dec);
    $('miniL').textContent = L.toFixed(dec);
    $('miniR').textContent = R.toFixed(dec);
    $('exactL').textContent = `${r.left.length.toFixed(2)} mm exact`;
    $('exactR').textContent = `${r.right.length.toFixed(2)} mm exact`;

    const warn = $('warn');
    warn.innerHTML = '';
    r.warnings.forEach((m) => { const li = document.createElement('li'); li.textContent = m; warn.appendChild(li); });
    warn.hidden = r.warnings.length === 0;

    const rows = [
      ['Relative tension', `${Math.round(r.tensionLeft * 100)}%`, `${Math.round(r.tensionRight * 100)}%`],
      ['Bracing angle', dg(r.left.bracingAngle), dg(r.right.bracingAngle)],
      ['Exit angle at hub', dg(r.left.exitAngle), dg(r.right.exitAngle)],
      ['Angle at nipple', dg(r.left.nippleAngle), dg(r.right.nippleAngle)],
      ['Hub to rim, sideways', mm(r.left.lateral), mm(r.right.lateral)],
      ['Max cross (tangent)', String(Spoke.maxCross(w.erd, w.left.pcd, w.spokes)), String(Spoke.maxCross(w.erd, w.right.pcd, w.spokes))],
    ];
    $('details').innerHTML = rows.map(([k, a, b]) => `<tr><td>${k}</td><td>${a}</td><td>${b}</td></tr>`).join('');

    drawWheel(w);
    drawSection(w, r);
    saveHash();
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // Lacing seen along the axle. Rim holes alternate left/right; the right flange is turned
  // half a hole step from the left. On each flange, neighbouring holes lace in opposite
  // directions (leading solid, trailing dashed).
  function drawWheel(w) {
    const svg = $('wheel');
    svg.innerHTML = '';
    const R = 100, n = w.spokes, half = n / 2;
    const toXY = (rad, ang) => [rad * Math.sin(ang), -rad * Math.cos(ang)];
    const sides = view === 'B' ? ['L', 'R'] : [view];

    el('circle', { class: 'rim', cx: 0, cy: 0, r: R }, svg);
    for (const s of sides) {
      const p = s === 'L' ? w.left : w.right;
      const r = (p.pcd / w.erd) * R;
      const alpha = Spoke.lacingAngle(n, p.cross);
      el('circle', { class: 'flange', cx: 0, cy: 0, r }, svg);
      for (let k = 0; k < half; k++) {
        const th = (2 * Math.PI * k) / half + (s === 'L' ? 0 : (2 * Math.PI) / n);
        const lead = k % 2 === 0;
        const [x1, y1] = toXY(r, th);
        const [x2, y2] = toXY(R, th + (lead ? alpha : -alpha));
        el('line', { class: `sp sp-${s}${lead ? '' : ' trail'}`, x1, y1, x2, y2 }, svg);
        el('circle', { class: 'hole', cx: x1, cy: y1, r: 1.3 }, svg);
      }
    }
    for (let k = 0; k < n; k++) {
      const [x, y] = toXY(R, (2 * Math.PI * k) / n);
      el('circle', { class: 'hole', cx: x, cy: y, r: 1.4 }, svg);
    }
    el('circle', { class: 'flange', cx: 0, cy: 0, r: 3 }, svg);
  }

  // Cross-section through the axle: flange offsets, hole positions and dish.
  function drawSection(w, r) {
    const svg = $('section');
    svg.innerHTML = '';
    const cx = 110, axleY = 100, rimY = 14;
    const maxLat = Math.max(w.left.offset, w.right.offset, Math.abs(w.rimOffset) + w.holeStagger, 20);
    const s = Math.min(1.4, 80 / maxLat); // px per mm sideways
    const k = (axleY - rimY) / (w.erd / 2); // px per mm radially
    const xFL = cx - w.left.offset * s, xFR = cx + w.right.offset * s;
    const yFL = axleY - (w.left.pcd / 2) * k, yFR = axleY - (w.right.pcd / 2) * k;
    const xHL = cx - (w.holeStagger + w.rimOffset) * s, xHR = cx + (w.holeStagger - w.rimOffset) * s;

    el('line', { class: 'axle', x1: 10, y1: axleY, x2: 210, y2: axleY }, svg);
    el('line', { class: 'axle', x1: cx, y1: 4, x2: cx, y2: axleY + 8 }, svg);
    el('rect', { class: 'hubbody', x: xFL, y: Math.max(yFL, yFR) + 6, width: xFR - xFL, height: axleY - Math.max(yFL, yFR) - 6 }, svg);
    el('line', { class: 'flange', x1: xFL, y1: axleY, x2: xFL, y2: yFL, 'stroke-width': 2.5 }, svg);
    el('line', { class: 'flange', x1: xFR, y1: axleY, x2: xFR, y2: yFR, 'stroke-width': 2.5 }, svg);
    el('rect', { class: 'rim', x: cx - 14, y: rimY - 8, width: 28, height: 8, rx: 2, 'stroke-width': 1.5 }, svg);
    el('line', { class: 'sp sp-L', x1: xFL, y1: yFL, x2: xHL, y2: rimY, 'stroke-width': 1.6 }, svg);
    el('line', { class: 'sp sp-R', x1: xFR, y1: yFR, x2: xHR, y2: rimY, 'stroke-width': 1.6 }, svg);
    el('text', { class: 'dim', x: xFL - 4, y: axleY + 12, 'text-anchor': 'end' }, svg).textContent = `${w.left.offset} mm`;
    el('text', { class: 'dim', x: xFR + 4, y: axleY + 12 }, svg).textContent = `${w.right.offset} mm`;
    el('text', { class: 'dim', x: 12, y: rimY + 2 }, svg).textContent = `${r.left.bracingAngle.toFixed(1)}°`;
    el('text', { class: 'dim', x: 208, y: rimY + 2, 'text-anchor': 'end' }, svg).textContent = `${r.right.bracingAngle.toFixed(1)}°`;
  }

  // --- Link state --------------------------------------------------------------

  function saveHash() {
    const q = new URLSearchParams();
    for (const [name, key] of Object.entries(KEYS)) {
      const f = F[name];
      q.set(key, f.type === 'checkbox' ? (f.checked ? '1' : '0') : f.value);
    }
    history.replaceState(null, '', '#' + q.toString());
  }

  function loadHash() {
    const q = new URLSearchParams(location.hash.slice(1));
    if (!q.has('erd')) return { crossL: 1, crossR: 1 };
    for (const [name, key] of Object.entries(KEYS)) {
      if (!q.has(key) || name === 'crossL' || name === 'crossR') continue;
      const f = F[name];
      if (f.type === 'checkbox') f.checked = q.get(key) === '1';
      else f.value = q.get(key);
    }
    return { crossL: Number(q.get('xl')) || 0, crossR: Number(q.get('xr')) || 0 };
  }

  // --- Wire up -------------------------------------------------------------------

  const start = loadHash();
  fillCross(F.crossL, Number(F.spokes.value), start.crossL);
  fillCross(F.crossR, Number(F.spokes.value), start.crossR);

  let lastCrossL = Number(F.crossL.value);
  form.addEventListener('input', (e) => {
    if (e.target === F.spokes) {
      const n = Number(F.spokes.value);
      fillCross(F.crossL, n, Number(F.crossL.value));
      fillCross(F.crossR, n, Number(F.crossR.value));
    }
    // Keep the right cross following the left one until someone sets it differently.
    if (e.target === F.crossL && Number(F.crossR.value) === lastCrossL) F.crossR.value = F.crossL.value;
    lastCrossL = Number(F.crossL.value);
    render();
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  document.querySelectorAll('.seg button').forEach((b) => {
    b.addEventListener('click', () => {
      view = b.dataset.view;
      document.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if ($('err').hidden) drawWheel(readInputs());
    });
  });

  $('share').addEventListener('click', async () => {
    const btn = $('share');
    try {
      await navigator.clipboard.writeText(location.href);
      btn.textContent = 'Link copied';
    } catch {
      btn.textContent = 'Copy the address bar to share';
    }
    setTimeout(() => { btn.textContent = 'Copy link to this wheel'; }, 2000);
  });

  // Phones: show the two lengths in a bottom bar while the results card is off screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      $('mini').classList.toggle('show', !entry.isIntersecting && entry.boundingClientRect.top > 0);
    }).observe(document.querySelector('.lengths'));
  }

  $('yr').textContent = new Date().getFullYear();
  render();
})();
