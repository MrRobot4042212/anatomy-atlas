/** Mandatory attribution: the 3D models are CC BY-SA derivatives (ADR 0001). Keep visible. */
export function Credits() {
  return (
    <footer className="flex items-center justify-between border-t border-neutral-800 bg-neutral-950 px-4 py-2 text-[11px] text-neutral-500">
      <span>
        Modelos 3D derivados de{' '}
        <a href="https://www.z-anatomy.com/" className="underline hover:text-neutral-300">
          Z-Anatomy
        </a>{' '}
        (CC BY-SA 4.0) y{' '}
        <a href="https://lifesciencedb.jp/bp3d/" className="underline hover:text-neutral-300">
          BodyParts3D
        </a>{' '}
        de DBCLS (CC BY-SA 2.1 JP). Terminología: Terminologia Anatomica 2.
      </span>
      <span>Anatomy Atlas</span>
    </footer>
  );
}
