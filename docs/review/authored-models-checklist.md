# Authored models: checklist for the anatomist

Three structures (six meshes, left and right) are original parametric models, built by script from
published adult averages in `tools/asset-pipeline/sources/authored/`. They are teaching
approximations, not scans. Please judge each item and note the correction needed; most
corrections are a single number in the generator.

How to look at them: run the atlas, search the structure name, press Isolate, and zoom with the
mouse wheel. The info panel shows the model extents.

## Cochlea (`inner_ear.py`, cochlea)

| Parameter          | Current value                                | Question                              |
| ------------------ | -------------------------------------------- | ------------------------------------- |
| Turns              | 2.75                                         | Correct for the average adult?        |
| Basal turn width   | about 9 mm (centreline radius 3.4 mm)        | Plausible?                            |
| Height             | about 5 mm (rise 3.9 mm plus the tube)       | Plausible?                            |
| Tube radius        | 1.15 mm at the base, 0.35 mm at the apex     | Taper acceptable?                     |
| Modiolus direction | apex anterior, lateral and slightly inferior | Angles in the body correct?           |
| Spiral sense       | one constant, `HANDEDNESS`, mirrored per ear | Is the sense right for the right ear? |

The spiral sense is the item most likely to be wrong: it could not be confirmed from a source
and is one constant to flip.

## Vestibule with the three osseous semicircular canals (`inner_ear.py`, vestibule)

| Parameter        | Current value                                                                      | Question                                  |
| ---------------- | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| Vestibule        | ellipsoid about 4.4 x 5.0 x 5.2 mm                                                 | Size and shape?                           |
| Canal arc radius | superior 3.2, posterior 3.2, lateral 2.9 mm                                        | Realistic relative sizes?                 |
| Canal lumen      | radius 0.4 mm, ampulla about 1.9 times wider                                       | Ampullae at the right ends?               |
| Canal planes     | superior and posterior vertical, lateral near horizontal, mutually near orthogonal | Orientation relative to the petrous axis? |
| Common crus      | not modelled (superior and posterior canals end separately)                        | Worth adding?                             |

The catalog has no separate entries for the canals, so they are part of the Vestibule mesh, as in
the source model. Say if they should become their own structures (Terminologia Anatomica:
Canales semicirculares ossei).

## Renal pelvis with calyces (`renal_pelvis.py`)

| Parameter         | Current value                                              | Question               |
| ----------------- | ---------------------------------------------------------- | ---------------------- |
| Extrarenal pelvis | funnel from the ureteropelvic junction, radius 3.5 to 6 mm | Shape and calibre?     |
| Major calyces     | three: superior, middle, inferior                          | Count and branching?   |
| Minor calyces     | seven cups of 9 mm with a flared end                       | Count per major calyx? |
| Position          | in the renal sinus, centred as in the source body          | Fits the kidney hilum? |

## Auditory ossicles (`ossicles.py`)

The ossicles of the source model probably come from a non-commercial dataset, so they are
authored here too. Each is built where it sits in the middle ear so the three articulate.

| Structure | Current value                                                                   | Question                    |
| --------- | ------------------------------------------------------------------------------- | --------------------------- |
| Malleus   | about 8.3 mm long: head, neck, handle, lateral and anterior processes           | Proportions, handle angle?  |
| Incus     | about 6 mm: body, short process (posterior), long process (down), lenticular    | Process angles and lengths? |
| Stapes    | about 3.7 mm: head, neck, two crura, footplate of 3 x 1.5 mm                    | Crura curvature, footplate? |
| Fit       | malleus head to incus body, lenticular process to stapes head, footplate medial | Do the joints line up?      |
