/**
 * One command per bundle: Blender export -> optimize -> report. Presets hold the measured
 * per-system settings so a bundle is reproducible from the mapping alone.
 *
 *   pnpm --filter asset-pipeline bundle --system cardiovascular [--version 1] [--skip-export]
 *
 * Requires out/mapping.json (scripts/build_mapping.py) and the Z-Anatomy blend in raw/.
 * After this, run `pnpm manifest` and seed the API.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { BODY_SYSTEMS, type BodySystem } from '@atlas/shared';

interface Preset {
  /** meshopt simplify ratio (1 = keep every triangle). */
  ratio: number;
  /** Blender curve tessellation; undefined keeps the source values (12 / 4). */
  curveResolution?: number;
  bevelResolution?: number;
  note: string;
}

// Measured 2026-10-03 on the Z-Anatomy Startup.blend; see docs/pipeline.md.
const PRESETS: Partial<Record<BodySystem, Preset>> = {
  skeletal: { ratio: 0.5, note: '690 nodes, 15.7 MB raw -> 4.0 MB, 729k drawn triangles' },
  cardiovascular: {
    ratio: 0.5,
    curveResolution: 6,
    bevelResolution: 2,
    note: '676 nodes; source curves 3.8M drawn tris -> u6/b2 1.41M -> ratio 0.5 744k, 4.0 MB',
  },
  nervous: {
    ratio: 0.5,
    curveResolution: 6,
    bevelResolution: 2,
    note: '589 nodes (251 curves); 21.7 MB raw -> 4.5 MB',
  },
  muscular: { ratio: 0.5, note: '683 nodes; 25.4 MB raw -> 6.5 MB, 1.53M drawn triangles' },
  lymphatic: { ratio: 0.5, note: '159 nodes; 1.5 MB raw -> 0.5 MB' },
  digestive: { ratio: 0.5, note: '46 nodes; 7.0 MB raw -> 1.3 MB' },
  respiratory: { ratio: 0.5, note: '35 nodes; 4.4 MB raw -> 0.9 MB' },
};
const DEFAULT_PRESET: Preset = { ratio: 0.5, note: 'default' };

const BLENDER = process.env.BLENDER ?? 'F:/SteamLibrary/steamapps/common/Blender/blender.exe';
const BLEND = process.env.ZANATOMY_BLEND ?? 'raw/z-anatomy/Z-Anatomy/Startup.blend';

const { values } = parseArgs({
  options: {
    system: { type: 'string' },
    version: { type: 'string', default: '1' },
    'skip-export': { type: 'boolean', default: false },
  },
});

const system = values.system as BodySystem | undefined;
if (!system || !BODY_SYSTEMS.includes(system)) {
  console.error(`--system must be one of: ${BODY_SYSTEMS.join(', ')}`);
  process.exit(1);
}
const preset = PRESETS[system] ?? DEFAULT_PRESET;
const raw = `out/raw/${system}.glb`;
const out = `out/${system}-v${values.version}.glb`;

function run(cmd: string, args: string[], { tolerate = false } = {}): number {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  const status = res.status ?? 1;
  if (status !== 0 && !tolerate) process.exit(status);
  return status;
}

if (!values['skip-export']) {
  if (!existsSync(BLEND)) {
    console.error(`Blend not found at ${BLEND} (set ZANATOMY_BLEND)`);
    process.exit(1);
  }
  const args = [
    '-b',
    BLEND,
    '-P',
    'blender/export_system.py',
    '--',
    '--system',
    system,
    '--out',
    'out/raw',
  ];
  if (preset.curveResolution) args.push('--curve-resolution', String(preset.curveResolution));
  if (preset.bevelResolution) args.push('--bevel-resolution', String(preset.bevelResolution));
  // Blender 5.2 sometimes crashes on exit (EXCEPTION_ACCESS_VIOLATION) after the export has
  // been written. The export is complete if the raw file was (re)written during this run.
  const before = existsSync(raw) ? statSync(raw).mtimeMs : 0;
  const status = run(`"${BLENDER}"`, args, { tolerate: true });
  const after = existsSync(raw) ? statSync(raw).mtimeMs : 0;
  if (after <= before) {
    console.error(`Blender exited with ${status} and ${raw} was not written.`);
    process.exit(status || 1);
  }
  if (status !== 0) console.warn(`Blender exited with ${status} after writing ${raw}; continuing.`);
}

run('pnpm', [
  'exec',
  'tsx',
  'src/optimize.ts',
  '--in',
  raw,
  '--out',
  out,
  '--ratio',
  String(preset.ratio),
]);

const mb = (p: string) => (statSync(p).size / 1e6).toFixed(1);
console.log(`\n${system}: raw ${mb(raw)} MB -> ${out} ${mb(out)} MB (preset: ${preset.note})`);
console.log(
  'Next: pnpm manifest && pnpm --filter api db:seed, then copy the bundle to apps/web/public/models',
);
