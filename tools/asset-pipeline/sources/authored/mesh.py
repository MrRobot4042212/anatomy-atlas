"""Small pure-Python mesh toolkit for the authored anatomy models (no numpy, runs inside Blender).

Vectors are tuples of three floats in metres. Meshes are (vertices, faces) with triangle faces.
Every primitive is closed and consistently oriented; outward() flips faces when the signed volume
is negative, so the normals Blender derives from the winding point out of the surface.
"""

import math


def add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def mul(a, k):
    return (a[0] * k, a[1] * k, a[2] * k)


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def length(a):
    return math.sqrt(dot(a, a))


def unit(a):
    n = length(a)
    return (a[0] / n, a[1] / n, a[2] / n)


def perpendicular(t):
    """Any unit vector perpendicular to the unit vector t."""
    helper = (1.0, 0.0, 0.0) if abs(t[0]) < 0.9 else (0.0, 1.0, 0.0)
    return unit(sub(helper, mul(t, dot(helper, t))))


def signed_volume(verts, faces):
    v = 0.0
    for a, b, c in faces:
        v += dot(verts[a], cross(verts[b], verts[c])) / 6.0
    return v


def outward(verts, faces):
    """Faces oriented so that the signed volume is positive (normals point outward)."""
    if signed_volume(verts, faces) < 0:
        faces = [(a, c, b) for a, b, c in faces]
    return verts, faces


def merge(parts):
    verts, faces = [], []
    for pv, pf in parts:
        base = len(verts)
        verts.extend(pv)
        faces.extend((a + base, b + base, c + base) for a, b, c in pf)
    return verts, faces


def tube(points, radii, sides=14, cap_rings=3):
    """Swept tube along a polyline with a radius per point, closed by rounded caps.

    Frames are parallel-transported so the tube does not twist along a curved path.
    """
    n = len(points)
    tangents = [unit(sub(points[min(i + 1, n - 1)], points[max(i - 1, 0)])) for i in range(n)]
    normal = perpendicular(tangents[0])
    frames = []
    for i in range(n):
        if i > 0:
            normal = unit(sub(normal, mul(tangents[i], dot(normal, tangents[i]))))
        frames.append((normal, cross(tangents[i], normal)))

    verts = []

    def ring(centre, rad, frame):
        start = len(verts)
        for k in range(sides):
            a = 2.0 * math.pi * k / sides
            offset = add(mul(frame[0], rad * math.cos(a)), mul(frame[1], rad * math.sin(a)))
            verts.append(add(centre, offset))
        return list(range(start, start + sides))

    rings = []
    tip0 = len(verts)
    verts.append(sub(points[0], mul(tangents[0], radii[0])))
    for j in range(1, cap_rings + 1):
        psi = (math.pi / 2.0) * j / (cap_rings + 1)
        centre = sub(points[0], mul(tangents[0], radii[0] * math.cos(psi)))
        rings.append(ring(centre, radii[0] * math.sin(psi), frames[0]))
    for i in range(n):
        rings.append(ring(points[i], radii[i], frames[i]))
    for j in range(cap_rings, 0, -1):
        psi = (math.pi / 2.0) * j / (cap_rings + 1)
        centre = add(points[-1], mul(tangents[-1], radii[-1] * math.cos(psi)))
        rings.append(ring(centre, radii[-1] * math.sin(psi), frames[-1]))
    tip1 = len(verts)
    verts.append(add(points[-1], mul(tangents[-1], radii[-1])))

    faces = []
    for k in range(sides):
        faces.append((tip0, rings[0][(k + 1) % sides], rings[0][k]))
    for r in range(len(rings) - 1):
        for k in range(sides):
            a, b = rings[r][k], rings[r][(k + 1) % sides]
            c, d = rings[r + 1][(k + 1) % sides], rings[r + 1][k]
            faces.append((a, b, c))
            faces.append((a, c, d))
    for k in range(sides):
        faces.append((tip1, rings[-1][k], rings[-1][(k + 1) % sides]))
    return outward(verts, faces)


def ellipsoid(centre, semi, nu=20, nv=12):
    """Closed ellipsoid with the given semi-axes along x, y and z."""
    verts = [add(centre, (0.0, 0.0, semi[2]))]
    for j in range(1, nv):
        phi = math.pi * j / nv
        for k in range(nu):
            th = 2.0 * math.pi * k / nu
            p = (
                semi[0] * math.sin(phi) * math.cos(th),
                semi[1] * math.sin(phi) * math.sin(th),
                semi[2] * math.cos(phi),
            )
            verts.append(add(centre, p))
    verts.append(add(centre, (0.0, 0.0, -semi[2])))
    faces = []
    for k in range(nu):
        faces.append((0, 1 + k, 1 + (k + 1) % nu))
    for j in range(nv - 2):
        for k in range(nu):
            a = 1 + j * nu + k
            b = 1 + j * nu + (k + 1) % nu
            c = 1 + (j + 1) * nu + (k + 1) % nu
            d = 1 + (j + 1) * nu + k
            faces.append((a, d, c))
            faces.append((a, c, b))
    last = len(verts) - 1
    for k in range(nu):
        faces.append((last, last - nu + (k + 1) % nu, last - nu + k))
    return outward(verts, faces)


def bounds(verts):
    lo = tuple(min(v[i] for v in verts) for i in range(3))
    hi = tuple(max(v[i] for v in verts) for i in range(3))
    return lo, hi


def centred(mesh):
    """Translate the mesh so the centre of its bounding box is the origin."""
    verts, faces = mesh
    lo, hi = bounds(verts)
    c = tuple((lo[i] + hi[i]) / 2.0 for i in range(3))
    return [sub(v, c) for v in verts], faces
