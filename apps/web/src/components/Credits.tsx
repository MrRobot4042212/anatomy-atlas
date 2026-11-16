import Link from 'next/link';

/**
 * Mandatory attribution: the 3D models are CC BY-SA derivatives (ADR 0001). Keep visible.
 * Embedded in another page, every link opens a new tab: following it inside the frame would
 * replace the atlas and drop the postMessage bridge with the host.
 */
export function Credits({ embedded = false }: { embedded?: boolean }) {
  const outside = embedded ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  return (
    <footer className="flex h-7 items-center justify-between gap-4 border-t border-hairline bg-panel px-4 text-xs text-ink-faint">
      <p className="truncate">
        Modelos 3D derivados de{' '}
        <a
          href="https://www.z-anatomy.com/"
          {...outside}
          className="underline decoration-hairline-strong underline-offset-2 hover:text-ink"
        >
          Z-Anatomy
        </a>{' '}
        (CC BY-SA 4.0) y{' '}
        <a
          href="https://lifesciencedb.jp/bp3d/"
          {...outside}
          className="underline decoration-hairline-strong underline-offset-2 hover:text-ink"
        >
          BodyParts3D
        </a>{' '}
        de DBCLS (CC BY-SA 2.1 JP). Nomenclatura: Terminologia Anatomica 2.{' '}
        <Link
          href="/licencias"
          {...outside}
          className="underline decoration-hairline-strong underline-offset-2 hover:text-ink"
        >
          Licencias
        </Link>
      </p>
      <p className="shrink-0">Wazo Anatomy</p>
    </footer>
  );
}
