import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Licencias y atribuciones · Wazo Anatomy',
  description: 'Origen y licencia de los modelos 3D y de la nomenclatura anatómica.',
};

const link =
  'text-accent-text underline decoration-hairline-strong underline-offset-2 hover:text-ink';

/**
 * Full attribution notice. The footer on the viewer carries the short form and links here.
 * The wording of the model credits follows the template Z-Anatomy requires for derived work.
 */
export default function Licencias() {
  return (
    <div className="min-h-screen bg-ground text-ink">
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/" className={`${link} text-[13px]`}>
          Volver al atlas
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">Licencias y atribuciones</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
          Wazo Anatomy se apoya en trabajo abierto de terceros. Esta página recoge su origen y las
          condiciones con las que se usa.
        </p>

        <section className="mt-10">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Modelos 3D
          </h2>
          <ul className="mt-3 space-y-2 text-[13px] leading-relaxed">
            <li>
              <a href="https://www.z-anatomy.com/" className={link}>
                Z-Anatomy
              </a>{' '}
              · The libre 3D atlas of anatomy ·{' '}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" className={link}>
                CC BY-SA 4.0
              </a>
            </li>
            <li>
              <a href="https://lifesciencedb.jp/bp3d/" className={link}>
                BodyParts3D
              </a>{' '}
              · The Database Center for Life Science ·{' '}
              <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/" className={link}>
                CC BY-SA 2.1 Japan
              </a>
            </li>
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed">
            Los riñones proceden directamente de BodyParts3D, The Database Center for Life Science,
            con licencia{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" className={link}>
              CC BY 4.0
            </a>
            .
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
            Los modelos mostrados son una adaptación: se han seleccionado, renombrado según su
            código de Terminologia Anatomica, optimizado y comprimido para la web. La adaptación se
            distribuye bajo los mismos términos, CC BY-SA 4.0.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Nomenclatura
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed">
            <i>Terminologia Anatomica</i>, segunda edición (2019). Federative International
            Programme for Anatomical Terminology (FIPAT), International Federation of Associations
            of Anatomists (IFAA).{' '}
            <a href="https://creativecommons.org/licenses/by-nd/4.0/" className={link}>
              CC BY-ND 4.0
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
