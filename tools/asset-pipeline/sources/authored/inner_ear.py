"""Bony labyrinth: cochlea, and vestibule with the three osseous semicircular canals.

Local frame (L, A, S): L lateral (away from the midline), A anterior, S superior. Dimensions are
adult averages from the anatomical literature: cochlea of 2.75 turns, about 9 mm wide at the base
and 5 mm high; semicircular canals of about 0.8 mm lumen with arcs of 4 to 6 mm; vestibule of
about 5 mm. They are parametric, not a scan: the shape is for teaching and must be validated by
an anatomist.

HANDEDNESS is the sense of the cochlear spiral from base to apex in the local frame, which is a
proper rotation of the right ear (the left ear is its mirror image). Flip it if the reviewing
anatomist finds the sense reversed.
"""

import math

from mesh import add, centred, cross, dot, ellipsoid, merge, mul, sub, tube, unit

MM = 1e-3
HANDEDNESS = 1.0


def cochlea():
    turns = 2.75
    th_max = turns * 2.0 * math.pi
    r0, r_apex = 3.4 * MM, 0.9 * MM  # radius of the spiral centreline at the base and the apex
    k = math.log(r0 / r_apex) / th_max
    rise = 3.9 * MM  # centreline height from base to apex
    rho0, rho1 = 1.15 * MM, 0.35 * MM  # tube radius at the base and the apex

    axis = unit((0.55, 0.75, -0.35))  # modiolus: apex points anterior, lateral and slightly down
    start = unit((-0.45, -0.89, 0.0))  # the base opens toward the vestibule: posterior, medial
    u = unit(sub(start, mul(axis, dot(start, axis))))
    v = cross(axis, u)

    steps = int(turns * 56)
    pts, radii = [], []
    for i in range(steps + 1):
        t = i / steps
        th = t * th_max
        r = r0 * math.exp(-k * th)
        p = add(add(mul(u, r * math.cos(th)), mul(v, HANDEDNESS * r * math.sin(th))), mul(axis, rise * t))
        pts.append(p)
        radii.append(rho0 + (rho1 - rho0) * t)
    return centred(tube(pts, radii, sides=14))


def _canal(vc, toward_arch, plane_b, arc_radius, tube_radius, ampulla_at_start):
    """Arc of 300 degrees in the plane spanned by toward_arch and plane_b.

    The circle centre lies along toward_arch from the vestibule centre vc, so the open side of
    the arc faces the vestibule. One end carries the ampulla, a local widening of the tube.
    """
    a = unit(toward_arch)
    b = unit(sub(plane_b, mul(a, dot(plane_b, a))))
    centre = add(vc, mul(a, arc_radius + 1.5 * MM))
    steps = 54
    span = math.radians(300.0)
    pts, radii = [], []
    for i in range(steps + 1):
        t = i / steps
        ang = math.pi - span / 2.0 + span * t  # an angle of pi points back to the vestibule
        p = add(centre, add(mul(a, -arc_radius * math.cos(ang)), mul(b, arc_radius * math.sin(ang))))
        pts.append(p)
        end = t if ampulla_at_start else 1.0 - t
        radii.append(tube_radius * (1.0 + 0.9 * max(0.0, 1.0 - end / 0.18) ** 2))
    return tube(pts, radii, sides=10, cap_rings=2)


def vestibule_with_canals():
    vc = (0.0, 0.0, 0.0)
    parts = [ellipsoid(vc, (2.2 * MM, 2.5 * MM, 2.6 * MM), nu=22, nv=14)]
    # superior canal: vertical plane along the anterolateral axis, arching up
    parts.append(_canal(vc, (0.2, 0.0, 1.0), (0.7, 0.7, 0.0), 3.2 * MM, 0.4 * MM, True))
    # posterior canal: vertical plane along the petrous axis, arching posterior and down
    parts.append(_canal(vc, (0.25, -0.75, -0.55), (0.7, -0.7, 0.0), 3.2 * MM, 0.4 * MM, False))
    # lateral canal: nearly horizontal, arching lateral and posterior
    parts.append(_canal(vc, (0.65, -0.7, 0.3), (0.7, 0.7, -0.25), 2.9 * MM, 0.4 * MM, True))
    return centred(merge(parts))
