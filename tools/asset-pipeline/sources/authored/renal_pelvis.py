"""Renal pelvis with major and minor calyces, as a branching tree of tubes.

Local frame (L, A, S): L lateral (away from the midline, so the hilum looks toward -L), A
anterior, S superior. The extrarenal pelvis leaves the hilum downward and medially toward the
ureter; three major calyces (superior, middle, inferior) end in minor calyces that cup the renal
papillae. Dimensions are adult averages; the shape is parametric, for teaching, and must be
validated by an anatomist.
"""

from mesh import centred, merge, tube

MM = 1e-3


def _path(points_mm, radii_mm, steps=10):
    """Smooth polyline through the given points (Catmull-Rom), with a radius per control point."""
    pts, radii = [], []
    n = len(points_mm)
    for i in range(n - 1):
        p0 = points_mm[max(i - 1, 0)]
        p1, p2 = points_mm[i], points_mm[i + 1]
        p3 = points_mm[min(i + 2, n - 1)]
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            pts.append(tuple(
                0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                       + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) * MM
                for k in range(3)))
            radii.append((radii_mm[i] + (radii_mm[i + 1] - radii_mm[i]) * t) * MM)
    pts.append(tuple(c * MM for c in points_mm[-1]))
    radii.append(radii_mm[-1] * MM)
    return pts, radii


def _cup(end_mm, direction, length_mm=9.0):
    """Minor calyx: a short tube that flares toward the papilla."""
    d = tuple(c / (sum(x * x for x in direction) ** 0.5) for c in direction)
    pts = [tuple((end_mm[k] + d[k] * length_mm * f) * MM for k in range(3)) for f in (0.0, 0.4, 0.8, 1.0)]
    return tube(pts, [2.0 * MM, 2.2 * MM, 3.0 * MM, 3.8 * MM], sides=12, cap_rings=2)


def renal_pelvis():
    parts = []
    junction = (-6.0, 2.0, 0.0)

    # extrarenal pelvis, from the ureteropelvic junction up to the hilum
    pts, rad = _path([(-17.0, 4.0, -26.0), (-12.0, 3.0, -12.0), junction], [3.5, 5.0, 6.0])
    parts.append(tube(pts, rad, sides=14, cap_rings=3))

    # major calyces
    sup_end, inf_end, mid_end = (5.0, 1.0, 24.0), (5.0, 1.0, -24.0), (8.0, 3.0, 0.0)
    for end, via in ((sup_end, (0.0, 2.0, 12.0)), (inf_end, (0.0, 2.0, -12.0))):
        pts, rad = _path([junction, via, end], [3.2, 2.9, 2.6])
        parts.append(tube(pts, rad, sides=12, cap_rings=2))
    pts, rad = _path([junction, (1.0, 2.5, 0.0), mid_end], [3.2, 3.0, 2.6])
    parts.append(tube(pts, rad, sides=12, cap_rings=2))

    # minor calyces
    for d in ((0.85, -0.35, 0.40), (0.90, 0.35, 0.25), (0.60, 0.0, 0.80)):
        parts.append(_cup(sup_end, d))
        parts.append(_cup(inf_end, (d[0], d[1], -d[2])))
    parts.append(_cup(mid_end, (0.8, 0.6, 0.0)))
    parts.append(_cup(mid_end, (0.8, -0.6, 0.0)))
    return centred(merge(parts))
