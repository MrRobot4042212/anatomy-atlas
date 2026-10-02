import { BODY_SYSTEMS } from '@atlas/shared';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Anatomy Atlas</h1>
        <p className="mt-2 text-neutral-500">
          Interactive 3D human anatomy. The viewer lands here in phase 1; this page only proves the
          workspace wiring (shared types imported from <code>@atlas/shared</code>).
        </p>
      </header>
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Body systems
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BODY_SYSTEMS.map((system) => (
            <li key={system} className="rounded-md border border-neutral-200 px-3 py-2 text-sm">
              {system}
            </li>
          ))}
        </ul>
      </section>
      <footer className="mt-auto text-xs text-neutral-400">
        3D models derived from Z-Anatomy (CC BY-SA 4.0) and BodyParts3D by DBCLS (CC BY-SA 2.1 JP).
      </footer>
    </main>
  );
}
