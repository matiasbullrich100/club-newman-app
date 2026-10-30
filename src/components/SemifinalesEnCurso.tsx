import LiveBanner from "./LiveBanner";
import { PanelFormacion } from "./ProgramaSemifinales";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import type { SemifinalEnCurso } from "@/lib/match/semifinales";

// Semifinales de Newman que ya empezaron (o terminaron hace poco): el marcador con el reloj en vivo (LiveBanner, el
// mismo de Plantel Superior) y, abajo, la formacion del partido. Va en el inicio, justo debajo de las pastillas.
export default function SemifinalesEnCurso({ semis }: { semis: SemifinalEnCurso[] }) {
  if (semis.length === 0) return null;
  return (
    <section style={{ margin: "0 0 14px" }}>
      {semis.map((s) => (
        <div key={s.partidoId}>
          <LiveBanner
            partidoId={s.partidoId}
            categoriaNombre={s.categoriaNombre}
            inicial={{ esLocal: s.esLocal, rival: s.rival, estado: s.estado, resultado: s.resultado, numeroCancha: s.numeroCancha }}
            crucesHref={tieneFixtureDivision(s.categoriaId) ? `/fixture/${s.categoriaId}/cruces` : undefined}
            posicionesHref={TORNEOS_URBA[s.categoriaId] !== undefined ? `/posiciones/${s.categoriaId}` : undefined}
            fixtureNewmanHref={`/categoria/${s.categoriaId}/fixture`}
          />
          {s.formacion && <PanelFormacion cancha={s.cancha} numeroCancha={s.numeroCancha} hora={s.hora} formacion={s.formacion} />}
        </div>
      ))}
    </section>
  );
}
