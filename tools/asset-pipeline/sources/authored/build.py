"""Authored anatomy models in the Z-Anatomy frame.

build(generator, side, centre) returns (vertices, faces) in metres, Blender axes of the
Z-Anatomy body: +x is the body left, -y is anterior, +z is up. Generators work in a
lateral/anterior/superior frame so the left structure is the exact mirror of the right one.
"""

import inner_ear
import renal_pelvis

GENERATORS = {
    "inner_ear:cochlea": inner_ear.cochlea,
    "inner_ear:vestibule": inner_ear.vestibule_with_canals,
    "renal_pelvis:pelvis": renal_pelvis.renal_pelvis,
}


def build(generator, side, centre):
    verts, faces = GENERATORS[generator]()
    s = 1.0 if side == "left" else -1.0
    out = [(centre[0] + s * lat, centre[1] - ant, centre[2] + sup) for lat, ant, sup in verts]
    # the map (L, A, S) -> (s * L, -A, S) has determinant -s: left mirrors, so flip the winding
    if s > 0:
        faces = [(a, c, b) for a, b, c in faces]
    return out, faces
