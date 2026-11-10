/*
 * Tests for spoke.js. Runs in Node (`node tests/spoke.test.js`) and in the browser
 * (open tests/index.html).
 *
 * Expected lengths are worked out independently of spoke.js: either exact Pythagorean
 * cases you can check by hand, or by placing the hub hole and rim hole as 3D points and
 * measuring the distance between them (see the comments on each case).
 */
(function () {
  'use strict';
  const isNode = typeof module === 'object' && typeof require === 'function';
  const Spoke = isNode ? require('../spoke.js') : window.Spoke;

  const results = [];
  function test(name, fn) {
    try { fn(); results.push({ name, ok: true }); }
    catch (e) { results.push({ name, ok: false, msg: e.message }); }
  }
  function near(actual, expected, tol, label) {
    if (!(Math.abs(actual - expected) <= tol)) {
      throw new Error(`${label || 'value'}: expected ${expected} ± ${tol}, got ${actual}`);
    }
  }
  function ok(cond, msg) { if (!cond) throw new Error(msg); }
  function throws(fn, match) {
    try { fn(); } catch (e) {
      ok(!match || match.test(e.message), `threw "${e.message}", expected ${match}`);
      return;
    }
    throw new Error('expected an error');
  }

  // --- Known lengths ---------------------------------------------------------

  test('radial, centred flange: length = (ERD - PCD)/2 - hole/2', () => {
    // R - r = 300 - 30 = 270, minus half of a 2.6 mm hole.
    const s = Spoke.side({ erd: 600, spokes: 36, pcd: 60, flangeOffset: 0.0001, cross: 0, hubHole: 2.6 });
    near(s.length, 268.7, 1e-6, 'length');
  });

  test('radial with flange offset: 28-195-197 triangle', () => {
    // (R - r, offset) = (273, 39.2) -> 275.8 exactly (1.4 x 195-28-197).
    const s = Spoke.side({ erd: 606, spokes: 32, pcd: 60, flangeOffset: 39.2, cross: 0, hubHole: 2.6 });
    near(s.length, 274.5, 1e-6, 'length');
  });

  test('32 spokes 4-cross puts the rim hole 90° round: sqrt(R² + r² + d²)', () => {
    // 288² + 36² + 21² = 291², so 291 - 1.3.
    const s = Spoke.side({ erd: 576, spokes: 32, pcd: 72, flangeOffset: 21, cross: 4, hubHole: 2.6 });
    near(s.alphaDeg, 90, 1e-9, 'lacing angle');
    near(s.length, 289.7, 1e-6, 'length');
  });

  test('36 spokes 3-cross road front: worked by hand', () => {
    // alpha = 60°, so L² = 300² + 29² + 35² - 2·300·29·cos60 = 83366; sqrt = 288.7317, minus 1.3.
    const s = Spoke.side({ erd: 600, spokes: 36, pcd: 58, flangeOffset: 35, cross: 3, hubHole: 2.6 });
    near(s.length, 287.4317, 1e-3, 'length');
  });

  test('dished rear wheel, 32 spokes 3-cross (3D point method)', () => {
    const w = Spoke.wheel({ erd: 602, spokes: 32, hubHole: 2.6,
      left: { pcd: 45, offset: 35, cross: 3 }, right: { pcd: 45, offset: 20, cross: 3 } });
    near(w.left.length, 293.9098, 1e-3, 'left');
    near(w.right.length, 292.5091, 1e-3, 'right');
  });

  test('offset rim shifts holes toward the left: left spokes shorten, right lengthen', () => {
    const w = Spoke.wheel({ erd: 602, spokes: 32, hubHole: 2.6, rimOffset: 3,
      left: { pcd: 45, offset: 35, cross: 3 }, right: { pcd: 45, offset: 20, cross: 3 } });
    near(w.left.lateral, 32, 1e-9, 'left lateral');
    near(w.right.lateral, 23, 1e-9, 'right lateral');
    near(w.left.length, 293.5691, 1e-3, 'left');
    near(w.right.length, 292.7286, 1e-3, 'right');
  });

  test('hole stagger moves each side\'s holes toward its own flange', () => {
    const w = Spoke.wheel({ erd: 600, spokes: 36, holeStagger: 2,
      left: { pcd: 58, offset: 35, cross: 3 }, right: { pcd: 58, offset: 35, cross: 3 } });
    near(w.left.lateral, 33, 1e-9, 'left lateral');
    near(w.right.lateral, 33, 1e-9, 'right lateral');
  });

  test('hub motor, 36 spokes, large flange, 1-cross and 2-cross (3D point method)', () => {
    const base = { erd: 560, spokes: 36, pcd: 200, flangeOffset: 40, hubHole: 2.6 };
    near(Spoke.side({ ...base, cross: 1 }).length, 192.0319, 1e-3, '1x');
    near(Spoke.side({ ...base, cross: 2 }).length, 215.7288, 1e-3, '2x');
  });

  test('asymmetric cross pattern per side', () => {
    const w = Spoke.wheel({ erd: 600, spokes: 36,
      left: { pcd: 58, offset: 35, cross: 3 }, right: { pcd: 58, offset: 35, cross: 0 } });
    near(w.left.alphaDeg, 60, 1e-9, 'left angle');
    near(w.right.alphaDeg, 0, 1e-9, 'right angle');
    ok(w.left.length > w.right.length, 'crossed side should be longer');
  });

  // --- Tension and angles ----------------------------------------------------

  test('symmetric wheel has equal tension both sides', () => {
    const w = Spoke.wheel({ erd: 600, spokes: 36,
      left: { pcd: 58, offset: 35, cross: 3 }, right: { pcd: 58, offset: 35, cross: 3 } });
    near(w.tensionLeft, 1, 1e-12, 'left');
    near(w.tensionRight, 1, 1e-12, 'right');
  });

  test('dished rear: left side carries about 57% of the right side tension', () => {
    const w = Spoke.wheel({ erd: 602, spokes: 32,
      left: { pcd: 45, offset: 35, cross: 3 }, right: { pcd: 45, offset: 20, cross: 3 } });
    near(w.tensionRight, 1, 1e-12, 'right');
    near(w.tensionLeft, 0.57415, 1e-4, 'left');
  });

  test('radial spokes leave the flange straight out and meet the rim in line', () => {
    const s = Spoke.side({ erd: 600, spokes: 36, pcd: 58, flangeOffset: 35, cross: 0 });
    near(s.exitAngle, 0, 1e-9, 'exit');
    near(s.nippleAngle, 0, 1e-6, 'nipple');
  });

  test('past-tangent lacing on a big flange is flagged', () => {
    // R cos(alpha) < r: 280·cos 80° = 48.6 < 100.
    const s = Spoke.side({ erd: 560, spokes: 36, pcd: 200, flangeOffset: 40, cross: 4 });
    ok(s.exitAngle > 90, 'exit angle should be past 90');
    ok(s.warnings.some((m) => /tangent/.test(m)), 'expected a tangent warning');
  });

  test('maxCross matches the tangent limit', () => {
    // acos(100/280) · 18 / 360° = 3.45 -> 3
    ok(Spoke.maxCross(560, 200, 36) === 3, 'hub motor');
    ok(Spoke.maxCross(600, 58, 36) === 4, 'road hub: the cross < spokes/4 limit is separate');
  });

  // --- Input checks ----------------------------------------------------------

  test('rejects odd spoke counts', () => {
    throws(() => Spoke.side({ erd: 600, spokes: 35, pcd: 58, flangeOffset: 35, cross: 3 }), /even/);
  });
  test('rejects a cross count the spoke count cannot make', () => {
    throws(() => Spoke.side({ erd: 600, spokes: 16, pcd: 58, flangeOffset: 35, cross: 4 }), /impossible/);
  });
  test('rejects ERD not larger than the flange', () => {
    throws(() => Spoke.side({ erd: 50, spokes: 36, pcd: 58, flangeOffset: 35, cross: 0 }), /ERD/);
  });
  test('rejects rim holes outside the flange', () => {
    throws(() => Spoke.side({ erd: 600, spokes: 36, pcd: 58, flangeOffset: 3, cross: 3, holeOffset: 4 }), /outside/);
  });
  test('rejects non-numbers', () => {
    throws(() => Spoke.side({ erd: NaN, spokes: 36, pcd: 58, flangeOffset: 35, cross: 3 }), /number/);
  });
  test('warns on spoke counts that are not a multiple of 4', () => {
    const w = Spoke.wheel({ erd: 600, spokes: 34,
      left: { pcd: 58, offset: 35, cross: 3 }, right: { pcd: 58, offset: 35, cross: 3 } });
    ok(w.warnings.some((m) => /multiple of 4/.test(m)), 'expected warning');
  });

  test('roundTo', () => {
    near(Spoke.roundTo(287.43, 1), 287, 1e-9, '1 mm');
    near(Spoke.roundTo(287.6, 2), 288, 1e-9, '2 mm');
    near(Spoke.roundTo(287.3, 0.5), 287.5, 1e-9, '0.5 mm');
  });

  // --- Report ----------------------------------------------------------------

  const failed = results.filter((r) => !r.ok);
  if (isNode) {
    results.forEach((r) => console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok ? '' : '\n     ' + r.msg}`));
    console.log(`\n${results.length - failed.length}/${results.length} passed`);
    if (failed.length) process.exitCode = 1;
  } else {
    window.TEST_RESULTS = { passed: results.length - failed.length, failed: failed.length, results };
    const out = document.getElementById('out');
    if (out) {
      out.innerHTML = results.map((r) =>
        `<li class="${r.ok ? 'ok' : 'fail'}">${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : `<br><code>${r.msg}</code>`}</li>`).join('');
      document.getElementById('sum').textContent = `${results.length - failed.length}/${results.length} passed`;
      document.getElementById('sum').className = failed.length ? 'fail' : 'ok';
    }
  }
})();
