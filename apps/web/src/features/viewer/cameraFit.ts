/**
 * Fit-to-bounds maths for the focus controller. Pure numbers, no three.js, so it is unit
 * tested: given a structure's axis-aligned bounds and the camera's orientation, field of view
 * and aspect, how far must the camera sit from the bounds centre for the structure to fill a
 * fixed share of the canvas, whatever its size (an 8 mm ossicle as a 450 mm femur).
 */

export type Vec3 = readonly [number, number, number];

export interface ViewExtents {
  /** Extent along the camera's right axis, in metres. */
  width: number;
  /** Extent along the camera's up axis. */
  height: number;
  /** Extent along the viewing direction. */
  depth: number;
}

export interface FitOptions {
  /** Vertical field of view in degrees (three's `PerspectiveCamera.fov`). */
  fovDeg: number;
  /** Canvas width / height. */
  aspect: number;
  /** Share of the limiting canvas dimension the structure should fill, 0..1. */
  fill?: number;
}

/** Share of the canvas a focused structure fills: 70 % of the limiting side, 15 % margin each. */
export const DEFAULT_FILL = 0.7;
/** Structures smaller than this (one millimetre) are framed as if they were this size. */
export const MIN_EXTENT = 0.001;
/**
 * The camera never sits closer to the bounds' front face than this share of the structure's
 * largest extent, so a box seen end-on (a vessel along the view axis) is not framed from inside.
 */
export const MIN_STANDOFF = 0.5;

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Extents of the box projected on the camera axes (right, up, forward: unit, orthogonal). */
export function viewExtents(
  min: Vec3,
  max: Vec3,
  right: Vec3,
  up: Vec3,
  forward: Vec3,
): ViewExtents {
  // For an axis-aligned box the projected extent on a unit axis is sum(|axis_i| * size_i).
  const size: Vec3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const along = (axis: Vec3) =>
    dot([Math.abs(axis[0]), Math.abs(axis[1]), Math.abs(axis[2])], size);
  return { width: along(right), height: along(up), depth: along(forward) };
}

/**
 * Distance from the bounds centre to the camera so that the box's front face fills `fill` of
 * the canvas along its limiting dimension (height or width, whichever is tighter), with a
 * floor relative to the structure's own size.
 */
export function fitDistance(
  extents: ViewExtents,
  { fovDeg, aspect, fill = DEFAULT_FILL }: FitOptions,
): number {
  const width = Math.max(extents.width, MIN_EXTENT);
  const height = Math.max(extents.height, MIN_EXTENT);
  const depth = Math.max(extents.depth, MIN_EXTENT);
  const tanHalfV = Math.tan((fovDeg * Math.PI) / 360);
  const tanHalfH = tanHalfV * aspect;
  // Distance from the camera to the front face at which each dimension fills `fill`.
  const toFrontFace = Math.max(height / 2 / (fill * tanHalfV), width / 2 / (fill * tanHalfH));
  const standoff = MIN_STANDOFF * Math.max(width, height, depth);
  return depth / 2 + Math.max(toFrontFace, standoff);
}

/** Share of the canvas height the box's front face covers from `distance` (inverse of the fit). */
export function heightShare(extents: ViewExtents, distance: number, fovDeg: number): number {
  const visible = 2 * (distance - extents.depth / 2) * Math.tan((fovDeg * Math.PI) / 360);
  return extents.height / visible;
}

/** Near plane for a camera this far from its target: never clips a framed structure. */
export const NEAR_RATIO = 1 / 40;
export const NEAR_MIN = 0.0005;
export const NEAR_MAX = 0.05;

export function nearFor(distanceToTarget: number): number {
  return Math.min(NEAR_MAX, Math.max(NEAR_MIN, distanceToTarget * NEAR_RATIO));
}

/**
 * The near plane that `fitDistance` leaves in front of the structure. Exposed for the tests:
 * the front face of the bounds must lie beyond it.
 */
export function frontFaceDistance(extents: ViewExtents, distance: number): number {
  return distance - Math.max(extents.depth, MIN_EXTENT) / 2;
}
