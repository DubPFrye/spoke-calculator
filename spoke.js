/*
 * Spoke length geometry. No DOM access, so the same file runs in the browser
 * (window.Spoke) and in Node for the tests (require('./spoke.js')).
 *
 * Coordinates: look along the axle. The hub hole sits at radius r = PCD/2 on a flange
 * that is `flangeOffset` mm from the wheel's centre plane. The rim hole it laces to sits
 * at radius R = ERD/2, turned `alpha` around the axle, and `holeOffset` mm from the centre
 * plane toward the same flange. The spoke runs straight between the two points.
 *
 * Each side has spokes/2 holes, so neighbouring holes on one flange are 360/(spokes/2)
 * degrees apart. Every cross moves the rim hole two of those steps further round, which
 * gives alpha = 720 * cross / spokes degrees.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Spoke = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TAU = 2 * Math.PI;
  const deg = (rad) => (rad * 180) / Math.PI;

  function need(cond, msg) {
    if (!cond) throw new RangeError(msg);
  }
  function finite(name, v) {
    need(typeof v === 'number' && Number.isFinite(v), `${name} must be a number`);
  }

  /** Angle between a hub hole and its rim hole, seen along the axle (radians). */
  function lacingAngle(spokes, cross) {
    return (TAU * cross) / (spokes / 2);
  }

  /** Largest cross count where the spoke still leaves the flange no further than tangent. */
  function maxCross(erd, pcd, spokes) {
    const R = erd / 2, r = pcd / 2;
    const limit = Math.acos(Math.min(1, r / R)); // alpha where R cos(alpha) = r
    return Math.floor((limit * (spokes / 2)) / TAU + 1e-9);
  }

  /**
   * One side of the wheel.
   * @param {object} p
   * @param {number} p.erd          rim effective rim diameter (mm)
   * @param {number} p.spokes       total spokes in the wheel
   * @param {number} p.pcd          flange spoke-hole circle diameter (mm)
   * @param {number} p.flangeOffset centre plane to flange (mm)
   * @param {number} p.cross        cross pattern on this side (0 = radial)
   * @param {number} [p.holeOffset] rim holes for this side sit this far from the centre
   *                                plane toward this side's flange (mm, may be negative)
   * @param {number} [p.hubHole]    flange hole diameter (mm); half of it is subtracted
   */
  function side(p) {
    const { erd, spokes, pcd, flangeOffset, cross } = p;
    const holeOffset = p.holeOffset ?? 0;
    const hubHole = p.hubHole ?? 2.6;
    finite('ERD', erd); finite('Spoke count', spokes); finite('Flange diameter', pcd);
    finite('Flange offset', flangeOffset); finite('Cross', cross);
    finite('Rim hole offset', holeOffset); finite('Hub hole diameter', hubHole);
    need(Number.isInteger(spokes) && spokes >= 4 && spokes % 2 === 0, 'Spoke count must be an even whole number, 4 or more');
    need(Number.isInteger(cross) && cross >= 0, 'Cross must be a whole number, 0 or more');
    need(pcd > 0, 'Flange diameter must be more than 0');
    need(erd > pcd, 'ERD must be larger than the flange diameter');
    need(hubHole >= 0 && hubHole < pcd, 'Hub hole diameter is out of range');
    need(cross < spokes / 4, `Cross ${cross} is impossible with ${spokes} spokes (max ${Math.ceil(spokes / 4) - 1})`);

    const R = erd / 2, r = pcd / 2;
    const alpha = lacingAngle(spokes, cross);
    const dx = R * Math.cos(alpha) - r;
    const dy = R * Math.sin(alpha);
    const planar = Math.hypot(dx, dy);           // spoke length seen along the axle
    const lateral = flangeOffset - holeOffset;   // spoke length seen from the front
    const centres = Math.hypot(planar, lateral); // hub hole centre to rim hole centre
    const length = centres - hubHole / 2;

    const warnings = [];
    need(lateral > 0, 'The rim holes sit outside this flange, so the spokes cannot pull the rim toward it');
    // Angle at the hub between the flange radius and the spoke: 90 means tangent.
    const exitAngle = deg(Math.atan2(Math.abs(dy), dx));
    if (exitAngle > 90.0001) {
      warnings.push(`Spokes leave the flange past tangent (${exitAngle.toFixed(0)}°) and would bend over the flange. Use fewer crosses.`);
    }
    // Angle at the rim between the rim radius and the spoke, in the wheel plane.
    const nippleAngle = deg(Math.acos(Math.max(-1, Math.min(1, (R - r * Math.cos(alpha)) / planar))));
    // Bracing angle: how far the spoke leans out of the wheel plane.
    const bracingAngle = deg(Math.atan2(lateral, planar));

    return { length, centres, planar, lateral, alphaDeg: deg(alpha), exitAngle, nippleAngle, bracingAngle, warnings };
  }

  /**
   * A whole wheel.
   * @param {object} w
   * @param {number} w.erd, w.spokes
   * @param {number} [w.hubHole=2.6]
   * @param {number} [w.holeStagger=0]  each side's rim holes sit this far toward their own flange
   * @param {number} [w.rimOffset=0]    all rim holes shift this far toward the LEFT side
   * @param {{pcd:number, offset:number, cross:number}} w.left, w.right
   */
  function wheel(w) {
    const stagger = w.holeStagger ?? 0;
    const rimOffset = w.rimOffset ?? 0;
    const common = { erd: w.erd, spokes: w.spokes, hubHole: w.hubHole };
    need(w.left && w.right, 'Both sides are required');
    const left = side({ ...common, pcd: w.left.pcd, flangeOffset: w.left.offset, cross: w.left.cross, holeOffset: stagger + rimOffset });
    const right = side({ ...common, pcd: w.right.pcd, flangeOffset: w.right.offset, cross: w.right.cross, holeOffset: stagger - rimOffset });

    // The sideways pulls of both sides cancel: T_L * lat_L/len_L = T_R * lat_R/len_R.
    const sinL = left.lateral / left.centres;
    const sinR = right.lateral / right.centres;
    const tensionLeft = Math.min(1, sinR / sinL);
    const tensionRight = Math.min(1, sinL / sinR);

    const warnings = [];
    if (w.spokes % 4 !== 0) warnings.push('Spoke counts are normally a multiple of 4; hub and rim drillings rarely match otherwise.');
    left.warnings.forEach((m) => warnings.push('Left: ' + m));
    right.warnings.forEach((m) => warnings.push('Right: ' + m));
    const slack = Math.min(tensionLeft, tensionRight);
    if (slack < 0.5) {
      warnings.push(`The ${tensionLeft < tensionRight ? 'left' : 'right'} side runs at only ${(slack * 100).toFixed(0)}% of the other side's tension, so those spokes may loosen. An offset rim helps.`);
    }

    return { left, right, tensionLeft, tensionRight, warnings };
  }

  /** Round to the nearest multiple of `step` (mm). */
  function roundTo(x, step) {
    need(step > 0, 'Rounding step must be more than 0');
    return Math.round(x / step) * step;
  }

  return { side, wheel, lacingAngle, maxCross, roundTo };
});
