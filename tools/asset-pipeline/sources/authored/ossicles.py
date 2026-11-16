"""Auditory ossicles: malleus, incus and stapes.

Local frame (L, A, S): L lateral (away from the midline), A anterior, S superior. Dimensions are
adult averages from the anatomical literature (malleus about 8 mm long, incus about 6 mm,
stapes about 3.3 mm high with a footplate of about 3 x 1.4 mm). They are parametric, not a scan:
the shapes are for teaching and must be validated by an anatomist.

Each ossicle is built in the position it has in the middle ear, so the three articulate: the
malleus head meets the incus body, the incus lenticular process meets the stapes head, and the
stapes footplate lies in the oval window, medial to everything else.
"""

from mesh import centred, ellipsoid, merge, tube

MM = 1e-3


def _t(points_mm, radii_mm, sides=10, cap_rings=2):
    pts = [tuple(c * MM for c in p) for p in points_mm]
    return tube(pts, [r * MM for r in radii_mm], sides=sides, cap_rings=cap_rings)


def _e(centre_mm, semi_mm, nu=16, nv=10):
    return ellipsoid(tuple(c * MM for c in centre_mm), tuple(c * MM for c in semi_mm), nu=nu, nv=nv)


def malleus():
    parts = [
        _e((0.0, 0.0, 2.5), (1.25, 1.2, 1.4)),  # head
        _t([(0.0, 0.0, 1.4), (0.0, 0.0, 0.5)], [0.6, 0.55]),  # neck
        # manubrium: the handle, hanging down and slightly medial inside the eardrum
        _t([(0.0, 0.0, 0.5), (-0.15, -0.1, -1.5), (-0.3, -0.2, -3.5), (-0.35, -0.2, -3.9)],
           [0.55, 0.48, 0.38, 0.5]),
        _e((0.75, -0.1, 0.3), (0.38, 0.38, 0.38), nu=12, nv=8),  # lateral process
        _t([(0.0, 0.2, 0.7), (0.0, 0.8, 0.6), (0.0, 1.4, 0.4)], [0.25, 0.2, 0.12]),  # anterior process
    ]
    return centred(merge(parts))


def incus():
    parts = [
        _e((0.0, 0.3, 1.8), (1.45, 1.3, 1.1)),  # body, with the articular surface for the malleus head
        # short process: points posteriorly toward the aditus
        _t([(0.0, -0.5, 1.6), (0.0, -1.8, 1.4), (0.0, -3.0, 1.1)], [0.5, 0.38, 0.25]),
        # long process: hangs down behind the manubrium
        _t([(0.0, -0.3, 1.0), (0.05, -0.7, -0.6), (0.1, -0.9, -2.5)], [0.45, 0.35, 0.28]),
        _e((-0.75, -0.9, -2.8), (0.42, 0.42, 0.4), nu=12, nv=8),  # lenticular process, medial tip
    ]
    return centred(merge(parts))


def stapes():
    parts = [
        _e((1.55, 0.0, 0.0), (0.4, 0.45, 0.45), nu=14, nv=8),  # head, meets the lenticular process
        _t([(1.3, 0.0, 0.0), (0.8, 0.0, 0.0)], [0.25, 0.28]),  # neck
        # anterior and posterior crura: two arches from the neck to the footplate edges
        _t([(0.8, 0.15, 0.0), (-0.2, 0.8, 0.45), (-1.3, 1.2, 0.1)], [0.24, 0.2, 0.2]),
        _t([(0.8, -0.15, 0.0), (-0.2, -0.8, 0.45), (-1.3, -1.2, 0.1)], [0.24, 0.2, 0.2]),
        _e((-1.5, 0.0, 0.0), (0.2, 1.5, 0.75), nu=18, nv=10),  # footplate, in the oval window
    ]
    return centred(merge(parts))
