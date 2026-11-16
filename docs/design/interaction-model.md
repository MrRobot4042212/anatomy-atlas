# Interaction model: using the 3D body

Status: accepted 2026-11-16 (ADR 0007). Visual language: `apps/web/DESIGN.md`. Evidence: a timed
evaluation of the current atlas on ten student tasks, and a study of Complete Anatomy, Visible Body,
BioDigital, Zygote Body, Anatomage and Z-Anatomy from their public documentation. This file is what the
redesign builds.

## What the evidence says

Measured on the previous version, as a first-time student:

| Task                                       | Result                      | Cost               |
| ------------------------------------------ | --------------------------- | ------------------ |
| Find the anterior cruciate ligament        | pass                        | 3 actions, 10 s    |
| Heart with ribs and sternum, no limbs      | partial: ribs hid the heart | 11 clicks, 60 s    |
| Right kidney, isolated, see what is behind | major friction              | 8 actions, 45 s    |
| Muscles of the right forearm only          | **blocker**, not achievable | 4+ clicks, failed  |
| Sagittal cut, then back to the full body   | pass                        | 3 clicks, 15 s     |
| Sciatic nerve and the muscles it supplies  | cannot answer               | nerve in 3 actions |
| Back to the initial state                  | **no reset exists**         | 3 to 11 clicks     |
| Select the malleus (8 mm)                  | reachable only by discovery | 7 actions, 50 s    |

Also measured: 69 competing controls in the default view, the smallest hit target 14 px, 36 of 74 tab
stops under 24 px, about 50 tab stops inside the hierarchy tree, the model about 10 % of the viewport
area at load, megabyte sizes next to layer names (developer data in a student interface), the search
ranking bursae above a nerve, and a toolbar that shifts when "Mostrar todo" appears.

From the study: all products offer hide / fade / isolate on the selection, a depth or opacity control
per system, multi-select, a breadcrumb to climb the hierarchy, search that also brings the structure
into view, name-first progressive disclosure, a global reset and undo, a standard gesture set with
double click to focus, saved shareable views, and a quiz on the same scene. The recurring failures to
avoid: free orbit as the only navigation, all-or-nothing system toggles, many tools on screen at once,
and content split into separate pre-built views.

## Principles

1. **The body is the interface.** Pick on the model first; panels explain and filter, they do not
   replace picking.
2. **Show context, not clutter.** Selecting a structure dims everything else automatically, so the
   student sees what they chose and what surrounds it. One toggle turns it off.
3. **Three questions, three controls.** _Which systems?_ (layers, with a depth state each.) _Which part
   of the body?_ (a region and side filter.) _Which structure?_ (search, picking, hierarchy.) They combine:
   "muscular + forearm + right" is three clicks.
4. **Always a way back.** Reset is one visible control in a fixed slot and one key; Escape clears the
   selection; state lives in the URL so reload and share work.
5. **Guided views are content.** A curated view (thorax and heart, kidney and what lies behind it,
   the midline) is a saved combination of layers, region, translucency, cut and camera.
6. **Real data only.** No fake descriptions, innervation or relations: the catalog has names, codes,
   hierarchy, region, side and geometry. Anything else is shown as pending, never invented.
7. **Fewer, larger controls.** Targets of 40 px or more, text of 14 px or more, one primary action.

## Layout (desktop, 1440 px)

```
+--------------------------------------------------------------------------------------------+
| WAZO Anatomy        [ Buscar en latín, español o inglés            / ]      Vistas   ?     |
+----------------------+-----------------------------------------------+---------------------+
| Capas | Jerarquía    |                                               | Os femoris          |
|                      |                                               | Fémur · Femur       |
| Sistemas             |                                               | Nombres | Contenido |
|  Esquelético  [o|~|-]|                  3D model                     | ...                 |
|  Muscular     [o|~|-]|                                               |                     |
|  ...                 |                                               | [Enfocar ->]        |
|                      |        [ Anterior Posterior ... ] [Corte]     | [Aislar] [Ocultar]  |
| Región   [silueta]   |        [Atenuar resto] [Reiniciar]            |                     |
|  Cabeza Tórax ...    |                                               |                     |
|  Lado [Ambos|Izq|Der]|                                               |                     |
+----------------------+-----------------------------------------------+---------------------+
```

- **Header (64 px)**: brand, search, **Vistas** (guided views), help.
- **Left rail, two tabs**: _Capas_ (systems with a three-state control, then region and side) and
  _Jerarquía_ (the tree, its own tab, one tab stop with arrow-key navigation, rows of 40 px).
- **Canvas**: the model, centred and framed to fill at least 60 % of the height on load; a floating
  toolbar at the bottom with fixed slots.
- **Right drawer**: docked beside the canvas, never over it; the canvas resizes. Tabs _Nombres_,
  _Contenido_ (parent, siblings and children as clickable chips) and _Descripción_ (pending, said so).
- Below 1200 px the rails become sheets that open over the canvas; the model keeps the full width.

## Behaviour

- **Layer state per system**: `visible`, `translucent`, `hidden` (three states, not a checkbox). A mark on
  the row says when a system has hidden structures, with "mostrar todo" for that system.
- **Region and side filter**: regions are Cabeza, Cuello, Tórax, Abdomen, Pelvis, Brazo, Antebrazo, Mano,
  Muslo, Pierna, Pie, Dorso (from the catalog's region and laterality). Picking a region on the silhouette
  or in the list filters what shows and frames the camera on it; side is Ambos, Izquierdo, Derecho.
  Filters combine with the layers and are cleared by Reiniciar.
- **Selection**: click selects, hover names the structure, click on empty space clears. Selecting dims all
  other structures (the translucent variant) unless "Atenuar resto" is off. "Aislar" stays as the stronger
  form (others ghosted and not pickable).
- **Focus**: "Enfocar" fits the camera to the structure's bounds with a minimum distance relative to its
  size, so an 8 mm ossicle fills the canvas as a femur does. Double click on a structure focuses it; a
  single click never moves the camera.
- **Reset**: "Reiniciar" (key R) returns layers, filters, hidden, isolated, translucent, selection, cut and
  camera to the initial state. Escape clears only the selection.
- **Guided views**: a menu of curated views, each defined in data (layers, region, side, translucent
  systems, clipping, camera preset). Applying one is one click; the embed protocol can apply one by id.
- **Keyboard**: `/` search, `R` reset, `Esc` clear selection, `1` to `5` camera views, `C` cut, `A` atenuar,
  `?` shortcut sheet. Every control reachable by Tab, with a visible ring.
- **First run**: a dismissible three-line hint over the canvas (drag to rotate, wheel to zoom, click to
  identify), remembered per browser.
- **Search ranking**: exact and prefix matches on any of the three names first, then structures with
  geometry, then by hierarchy depth; left and right results show a side chip. Bursae never outrank the
  nerve of the same name.

## Acceptance (from the evaluation)

| Task                                           | Target                                         |
| ---------------------------------------------- | ---------------------------------------------- |
| Heart with ribs and sternum, no limbs          | 4 actions or fewer, or one guided view         |
| Muscles of the right forearm only              | 4 actions: Muscular, Antebrazo, Derecho (3)    |
| Back to the initial state                      | 1 action (Reiniciar or R)                      |
| Right kidney, what lies behind it              | search, select (context dims), toggle muscular |
| Select the malleus                             | search, Enfocar: it fills the canvas           |
| Any control on the default screen              | 40 px or larger target, 14 px or larger text   |
| Tab stops to reach the toolbar from the search | 10 or fewer (the tree is one stop)             |
| Layout shifts when a state button appears      | none (fixed slots)                             |
| Model share of the viewport at load            | 60 % of the canvas height or more              |

## Not in this redesign

Innervation, blood supply, origin and insertion, descriptions and quizzes need data the catalog does not
have yet. The panel has the tabs ready and says "pendiente". Identity and progress wait for the Campus
integration (ADR 0006).
