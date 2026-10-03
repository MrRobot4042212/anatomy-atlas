/** Mandatory attribution: the 3D models are CC BY-SA derivatives (ADR 0001). Keep visible. */
export function Credits() {
  return (
    <footer className="flex h-7 items-center justify-between gap-4 border-t border-hairline bg-panel px-4 text-[11px] text-ink-faint">
      <p className="truncate">
        Modelos 3D derivados de{' '}
        <a
          href="https://www.z-anatomy.com/"
          className="underline decoration-hairline-strong underline-offset-2 hover:text-ink"
        >
          Z-Anatomy
        </a>{' '}
        (CC BY-SA 4.0) y{' '}
        <a
          href="https://lifesciencedb.jp/bp3d/"
          className="underline decoration-hairline-strong underline-offset-2 hover:text-ink"
        >
          BodyParts3D
        </a>{' '}
        de DBCLS (CC BY-SA 2.1 JP). Nomenclatura: Terminologia Anatomica 2.
      </p>
      <p className="shrink-0">Wazo Anatomy</p>
    </footer>
  );
}
