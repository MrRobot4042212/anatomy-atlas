import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILL,
  fitDistance,
  frontFaceDistance,
  heightShare,
  nearFor,
  viewExtents,
  type Vec3,
} from './cameraFit';

// Anterior view: camera on +Z looking at -Z, Y up.
const RIGHT: Vec3 = [1, 0, 0];
const UP: Vec3 = [0, 1, 0];
const FORWARD: Vec3 = [0, 0, -1];
const FOV = 35;
const LANDSCAPE = 1280 / 686;

/** Share of the canvas width the front face covers from `distance`. */
function widthShare(width: number, depth: number, distance: number, aspect: number) {
  const tanH = Math.tan((FOV * Math.PI) / 360) * aspect;
  return width / (2 * (distance - depth / 2) * tanH);
}

describe('viewExtents', () => {
  it('maps box sides onto the camera axes', () => {
    const e = viewExtents([0, 0, 0], [0.1, 0.2, 0.3], RIGHT, UP, FORWARD);
    expect(e.width).toBeCloseTo(0.1);
    expect(e.height).toBeCloseTo(0.2);
    expect(e.depth).toBeCloseTo(0.3);
  });

  it('grows the projected extent for an oblique view', () => {
    const s = Math.SQRT1_2;
    const e = viewExtents([0, 0, 0], [1, 1, 1], [s, 0, -s], UP, [-s, 0, -s]);
    expect(e.width).toBeCloseTo(Math.SQRT2);
    expect(e.depth).toBeCloseTo(Math.SQRT2);
  });
});

describe('fitDistance', () => {
  it('makes an 8 mm ossicle fill the canvas as a femur does', () => {
    // The malleus from the catalog (2.5 x 8.3 x 2.7 mm) and a femur (80 x 450 x 60 mm).
    const malleus = viewExtents(
      [0.04695, 1.57795, -0.00536],
      [0.04945, 1.58625, -0.00264],
      RIGHT,
      UP,
      FORWARD,
    );
    const femur = viewExtents([0.05, 0.45, -0.03], [0.13, 0.9, 0.03], RIGHT, UP, FORWARD);
    const dMalleus = fitDistance(malleus, { fovDeg: FOV, aspect: LANDSCAPE });
    const dFemur = fitDistance(femur, { fovDeg: FOV, aspect: LANDSCAPE });
    expect(heightShare(malleus, dMalleus, FOV)).toBeCloseTo(DEFAULT_FILL, 5);
    expect(heightShare(femur, dFemur, FOV)).toBeCloseTo(DEFAULT_FILL, 5);
    // A couple of centimetres away: well inside the old 5 cm minimum distance that kept it a dot.
    expect(dMalleus).toBeLessThan(0.03);
    expect(dFemur).toBeGreaterThan(1);
  });

  it('frames a large structure by its limiting dimension', () => {
    // A wide box in a portrait canvas: the width is what limits.
    const wide = { width: 0.6, height: 0.1, depth: 0.1 };
    const aspect = 0.6;
    const d = fitDistance(wide, { fovDeg: FOV, aspect });
    expect(widthShare(wide.width, wide.depth, d, aspect)).toBeCloseTo(DEFAULT_FILL, 5);
    expect(heightShare(wide, d, FOV)).toBeLessThan(DEFAULT_FILL);
  });

  it('keeps a standoff for a very elongated box seen end-on', () => {
    // A 2 x 2 x 400 mm vessel along the view axis: the front face is tiny, the box is long.
    const vessel = { width: 0.002, height: 0.002, depth: 0.4 };
    const d = fitDistance(vessel, { fovDeg: FOV, aspect: LANDSCAPE });
    expect(frontFaceDistance(vessel, d)).toBeCloseTo(0.2, 5); // half the longest extent
    expect(d).toBeCloseTo(0.4, 5);
  });

  it('frames a very elongated box side-on by its length', () => {
    const rod = { width: 0.4, height: 0.004, depth: 0.004 };
    const d = fitDistance(rod, { fovDeg: FOV, aspect: LANDSCAPE });
    expect(widthShare(rod.width, rod.depth, d, LANDSCAPE)).toBeCloseTo(DEFAULT_FILL, 5);
  });

  it('treats a degenerate box as one millimetre instead of dividing by zero', () => {
    const d = fitDistance({ width: 0, height: 0, depth: 0 }, { fovDeg: FOV, aspect: 1 });
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThan(0.001);
  });

  it('honours a custom fill share', () => {
    const box = { width: 0.1, height: 0.1, depth: 0.1 };
    const d = fitDistance(box, { fovDeg: FOV, aspect: 1, fill: 0.5 });
    expect(heightShare(box, d, FOV)).toBeCloseTo(0.5, 5);
  });
});

describe('nearFor', () => {
  it('never clips the framed structure, tiny, large or elongated', () => {
    const cases = [
      { width: 0.0025, height: 0.0083, depth: 0.0027 },
      { width: 0.08, height: 0.45, depth: 0.06 },
      { width: 0.002, height: 0.002, depth: 0.4 },
      { width: 0.68, height: 1.71, depth: 0.26 },
    ];
    for (const e of cases) {
      const d = fitDistance(e, { fovDeg: FOV, aspect: LANDSCAPE });
      expect(nearFor(d)).toBeLessThan(frontFaceDistance(e, d));
    }
  });

  it('is clamped for depth precision far away and close up', () => {
    expect(nearFor(3.2)).toBe(0.05);
    expect(nearFor(0.001)).toBe(0.0005);
    expect(nearFor(0.4)).toBeCloseTo(0.01);
  });
});
