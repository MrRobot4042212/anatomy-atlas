# Viewer performance measurement

Date: 2026-11-16. Scope: measurement only, no application code was changed.

## Verdict against the target

Target (project rules): 60 fps on an integrated-GPU laptop with skeletal + cardiovascular on.

- **Not verified on the target hardware.** The only machine available has a discrete AMD Radeon RX 9070 XT (plus an AMD Radeon iGPU). The browser (Brave) masks the WebGL renderer string, so which GPU rendered the page could not be read directly (see Machine). A GPU micro-benchmark ran at hardware speed, so it was not software rendering.
- **On this machine the target configuration holds the display refresh rate** (about 72 fps, 13.9 ms frame, p95 14.0 ms, worst 14.1 to 34.6 ms) with 1664 draw calls and 1.47 M triangles. The measurement is capped by the display (72 Hz), so GPU headroom is unknown. This result says nothing about an integrated-GPU laptop.
- **All 11 layers on** (3532 calls, 4.38 M triangles) still reaches 68 to 72 fps with a p95 of 20.8 ms, so it is close to the cap, again on a strong GPU.
- **Real problem seen: startup stalls.** During the first seconds after load the viewer showed frames of 30 to 2500 ms (details below). This is not covered by the steady-state numbers and is the main risk for a weak machine.

## Machine and method

| Item              | Value                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| CPU               | AMD Ryzen 7 7800X3D (Windows 11 Pro), 53% CPU load during tests (other processes)                                                                    |
| GPUs (Windows)    | AMD Radeon RX 9070 XT (discrete), AMD Radeon(TM) Graphics (integrated)                                                                               |
| Browser           | Brave (Chrome 157 engine) driven through a browser extension; `UNMASKED_RENDERER_WEBGL` = "Brave" (masked), `gl.RENDERER` = "WebKit WebGL"           |
| GPU actually used | Not readable. Offscreen benchmark: 50 full-screen 20-iteration `sin` passes at 1920x917 took 3.14 ms, consistent with a hardware GPU                 |
| Viewport / DPR    | 1920 x 917, devicePixelRatio 1 (canvas dpr 1)                                                                                                        |
| Display refresh   | about 72 Hz (frame 13.89 ms is the floor in every run)                                                                                               |
| Server            | Next DEV server (no minification, slower JS). Frame time is mostly GPU bound, but CPU-side draw submission and startup work are inflated by dev mode |

Method:

- `atlasStats` (published every 500 ms by `DevProbe` in `AnatomyViewer.tsx`): `gl.info.render.calls`, `triangles`, `geometries`, mean frame ms.
- Independent sample: `requestAnimationFrame` deltas for 5 s, 3 runs per condition, idle camera and orbiting (synthetic pointer events on the canvas, orbit controls). Layers toggled by clicking the left-panel checkboxes. 5 s of settling before each configuration.
- Network from `PerformanceResourceTiming` (`transferSize`, `encodedBodySize`, `decodedBodySize`) after `clearResourceTimings()`.
- Heap from `performance.memory.usedJSHeapSize`.

## Results per configuration

Per-frame counters (from `atlasStats`):

| Configuration                 | Draw calls | Triangles | Meshes | Geometries | Materials | Translucent meshes | JS heap  |
| ----------------------------- | ---------- | --------- | ------ | ---------- | --------- | ------------------ | -------- |
| (a) skeletal only (default)   | 988        | 728,347   | 988    | 552        | 10        | 0                  | 47.7 MB  |
| (b) skeletal + cardiovascular | 1,664      | 1,472,710 | 1,664  | 982        | 17        | 0                  | 73.2 MB  |
| (c) all 11 layers             | 3,532      | 4,375,030 | 3,584  | 2,021      | 46        | 134                | 216.2 MB |

Draw calls equal mesh count in (a) and (b): one draw call per mesh, no merging or instancing. All meshes have a BVH.

Frame time, my own rAF sampling (5 s per run, 3 runs; fps = 1000 / avg):

| Configuration         | Idle avg ms (3 runs) | Idle p95 ms      | Idle worst ms    | Idle fps          | Orbit avg ms (3 runs) | Orbit p95 ms     | Orbit worst ms   | Orbit fps        |
| --------------------- | -------------------- | ---------------- | ---------------- | ----------------- | --------------------- | ---------------- | ---------------- | ---------------- |
| (a) skeletal          | 13.90, 14.11, 9.89   | 14, 14, 20.8     | 17.2, 27.9, 55.6 | 71.9, 70.9, 101.1 | 19.02, 15.46, 13.90   | 34.8, 14, 14     | 194, 320, 15.5   | 52.6, 64.7, 72.0 |
| (b) skeletal + cardio | 13.91, 13.89, 13.89  | 14, 14, 14       | 17.2, 14.1, 14.1 | 71.9, 72.0, 72.0  | 14.13, 14.35, 13.89   | 14.3, 20.8, 14   | 34.6, 28.0, 14.1 | 70.8, 69.7, 72.0 |
| (c) all layers        | 14.47, 14.73, 13.89  | 20.8, 20.9, 14.1 | 34.9, 34.9, 14.2 | 69.1, 67.9, 72.0  | 14.80, 14.56, 14.17   | 20.9, 20.8, 14.2 | 35.0, 34.9, 35.0 | 67.6, 68.7, 70.6 |

Notes:

- The 101 fps run of (a) means the refresh cap was not constant (display or compositor change); the 72 fps runs are the stable reading.
- `atlasStats.frameMs` read 13.89 ms for (b) and (c), 15.36 ms right after the (c) orbit runs.
- Because the cap is 72 Hz, runs at 13.9 ms mean "at least 72 fps", not the real GPU limit.

### Startup stalls (first load, configuration (a), before the table above)

Right after the first page load, with the skeleton already loaded and the scene not yet "settled":

| Sample                           | Avg ms | p95 ms  | Worst ms | fps  |
| -------------------------------- | ------ | ------- | -------- | ---- |
| idle 5 s (about 4 s after load)  | 60.8   | 111.1   | 2,208.7  | 16.4 |
| orbit 5 s right after            | 192.4  | 854.5   | 1,000.3  | 5.2  |
| idle 5 s (about 12 s after load) | 555.7  | 2,535.3 | 2,535.3  | 1.8  |
| idle 4 s (about 20 s after load) | 14.0   | 14.0    | 41.7     | 71.2 |

`atlasStats.frameMs` was 31.5, 288 and 2175 ms in those samples. The long-animation-frame log attributes the long frames to the `@react-three/fiber` render `loop` (60 to 360 ms of script per frame, 147 long frames recorded). The cause was not isolated: candidates are BVH construction for 988 meshes, shader compilation, dev-mode JS, and contention with other processes on the machine. This was a single occurrence, and it was not reproduced after the page settled, so it is reported as observed, not as a proven cause.

## Network

GLB bytes (all served without HTTP compression: `encodedBodySize` is about equal to `transferSize`; "decoded" is the size after the browser decodes the body, which is larger because the GLBs are already meshopt/Draco-compressed internally and the response is compressed again in transit only if the server does it. Here transferSize equals the body, so the difference is what the resource-timing API reports as decoded body).

| Bundle                | Transferred bytes               | Decoded body bytes | Fetch start to end (ms from toggle)              |
| --------------------- | ------------------------------- | ------------------ | ------------------------------------------------ |
| skeletal-v1 (default) | 2,928,030                       | 3,979,028          | 4,701 to 4,747 ms after navigation (first visit) |
| cardiovascular-v1     | 2,978,896                       | 3,973,540          | 11 to 113                                        |
| muscular-v1           | 5,131,277                       | 6,516,208          | 9 to 173                                         |
| nervous-v1            | 3,413,292                       | 4,570,448          | 325 to 759                                       |
| lymphatic-v1          | 258,484                         | 502,376            | 693 to 706                                       |
| digestive-v1          | 1,050,193                       | 1,313,048          | 1,026 to 1,062                                   |
| respiratory-v1        | 714,242                         | 892,936            | 1,434 to 1,459                                   |
| urinary-v1            | 91,559                          | 120,196            | 1,680 to 1,685                                   |
| reproductive-v1       | 55,508                          | 72,084             | 2,001 to 2,006                                   |
| endocrine-v1          | 58,430                          | 72,232             | 2,335 to 2,339                                   |
| integumentary-v1      | 124,234                         | 152,096            | 2,659 to 2,666                                   |
| **All 11**            | **16,804,145 (about 16.0 MiB)** | **22,164,192**     |                                                  |

- Target configuration (b): 5,906,926 bytes (5.6 MiB) for the two bundles.
- Lazy loading works: before any toggle, only `skeletal-v1.glb` was requested (a single GLB resource entry). Each other bundle appeared only after its layer was toggled on. Bytes are per bundle, none exceeds the 25 MB rule (largest: muscular, 5.1 MB).
- Localhost, so the fetch times are not representative of a CDN or a mobile network. At 10 Mbit/s the 16.8 MB total would take about 13 s; at 50 Mbit/s about 2.7 s (arithmetic, not measured).
- Bundle files carry a `?v=<hash>` query; on reload the skeletal GLB came from cache (transferSize 300, a revalidation).

## Time to first interaction

- Reload (cache warm): first paint and first contentful paint at 168 ms, DOMContentLoaded 155 ms, load event 256 ms, skeletal GLB response complete at 1,268 ms after navigation start. Skeleton visibility could not be timed to the frame (the probe publishes only every 500 ms, and my script could attach after it). Upper bound observed: `atlasStats.calls > 0` before 4.76 s after navigation.
- First visit with cold cache: skeletal GLB response complete at 4.75 s after navigation (the dev server compiled the page on demand in that window, so this is inflated by the dev server).
- JS on the page: 31 resources, 1.55 MB of encoded JS (dev, unminified).

## Top three bottlenecks (ordered by measured impact)

1. **Draw calls: one per mesh, 3,532 with all layers (988 for skeletal alone, 1,664 for the target).** The count is linear in mesh count and cardiovascular adds 676 calls and 744 k triangles over skeletal. Going from (b) to (c) is where p95 frame time first leaves the display cap (14.0 to 20.8 ms) and orbit worst frames reach 35 ms. On an integrated GPU the CPU submission cost of about 1,700 calls per frame is the first thing to hurt.
   Recommendation: merge static, non-interactive geometry per bundle (for example by material and region) into a few draw calls and keep a per-triangle-range lookup (face index to `meshId`) for picking, or use `BatchedMesh` (three.js) with one instance per `meshId`. Expected cost: 1 to 2 days in `tools/asset-pipeline` and the viewer picking path, with the `meshId` contract unchanged. Acceptance: target configuration under 300 calls, re-measured with the same method.

2. **Main-thread stalls during startup (frames of 30 to 2,535 ms in the first seconds after load).** These are far larger than any steady-state cost and would be seen by a user as a frozen first screen. Attributed in the long-frame log to the R3F render loop, cause not isolated.
   Recommendation: first measure it in a production build on a separate output directory (not the dev server): record a Performance trace of the first 15 s and check BVH construction (`computeBoundsTree` for 988 geometries). If it is the BVH, build it lazily on first pointer interaction or in a worker, or use `indirect: true` BVH with a time budget per frame. Expected cost: half a day to measure, 1 day to fix.

3. **Payload and memory of the full model: 16.8 MB over the wire (22.2 MB decoded), 4.38 M triangles and 216 MB of JS heap with all layers (47.7 MB at load, 73.2 MB for the target).** Muscular (5.1 MB) and nervous (3.4 MB) are 51% of the bytes; the target configuration costs 5.9 MB. No bytes are saved by HTTP compression because the server sent bodies uncompressed.
   Recommendation: ship bundles with meshopt plus quantized attributes through a CDN with brotli on the GLB response (verify `content-encoding`), and add a simplified LOD for the muscular and nervous bundles that is swapped in when the camera is far. Expected cost: 1 day for the CDN/header change, 2 to 3 days for LODs in the pipeline. Re-measure the transferred bytes and the heap per bundle afterwards.

## What was not measured

- Real integrated-GPU laptop numbers (no such hardware here); the GPU used by the browser is unknown because the renderer string is masked.
- GPU headroom above 72 fps (display cap); GPU time per frame (no timer query used).
- Production build performance (a `next build` would collide with the running dev server's `.next` folder).
- Exact time until the skeleton is visible on screen; exact cause of the startup stalls.
- Network behaviour on a real CDN or throttled connection.
