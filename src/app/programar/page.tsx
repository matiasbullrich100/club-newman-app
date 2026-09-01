import { getSession } from "@/lib/auth/session";
import { CATEGORIAS, CATEGORIAS_SUPERIOR, nombreNewmanDe, partidoId } from "@/lib/categorias";
import { proximaFechaPorCategoria, proximasFechasDe, type ProximaFecha } from "@/lib/match/resumenSeccion";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import ProgramarFechaFila from "@/components/ProgramarFechaFila";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Pantalla para que el manager de la division (o el administrador) cargue el horario y la cancha
// puntual del partido que viene de cada categoria. Ese horario aparece en el resumen de Proxima
// Fecha cuando Newman juega de local (ver ProximaFechaBanner/ProximaFechaRow).
export default async function ProgramarPage() {
  const session = await getSession();
  const esManager = session?.rol === "manager";

  type Categoria = (typeof CATEGORIAS)[number];
  let cats: Categoria[] = [];
  if (esManager) {
    if (!session.alcance) cats = [...CATEGORIAS]; // administrador: todas las divisiones
    else if (session.alcance === "superior") cats = [...CATEGORIAS_SUPERIOR];
    else cats = CATEGORIAS.filter((c) => c.grupo === "juveniles" && c.edadId === session.alcance);
  }

  const superiorCats = cats.filter((c) => c.grupo === "superior");
  const juvCats = cats.filter((c) => c.grupo === "juveniles");
  const [superiorEntradas, juvMap] = await Promise.all([
    Promise.all(superiorCats.map(async (c) => [c.id, (await proximasFechasDe(c.id, 1))[0]] as const)),
    juvCats.length ? proximaFechaPorCategoria(juvCats.map((c) => c.id)) : new Map<string, ProximaFecha>(),
  ]);
  const superiorMap = new Map(superiorEntradas);

  const filas = cats
    .map((cat) => ({ cat, proxima: cat.grupo === "superior" ? superiorMap.get(cat.id) : juvMap.get(cat.id) }))
    .filter((f): f is { cat: Categoria; proxima: ProximaFecha } => !!f.proxima);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header />

      <h1 style={{ fontSize: "1rem", textTransform: "uppercase", letterSpacing: 1, color: DORADO, textAlign: "center", marginTop: 12 }}>
        Programar la próxima fecha
      </h1>

      {!esManager ? (
        <p style={{ textAlign: "center", color: DORADO_SUAVE, marginTop: 20 }}>
          Esta sección es solo para Manager y Administrador.
        </p>
      ) : filas.length === 0 ? (
        <p style={{ textAlign: "center", color: DORADO_SUAVE, marginTop: 20 }}>
          No hay partidos próximos para programar.
        </p>
      ) : (
        <>
          <p style={{ textAlign: "center", fontSize: "0.78rem", color: DORADO_SUAVE, opacity: 0.8, margin: "6px 0 16px" }}>
            El horario se muestra en el resumen de Próxima Fecha cuando Newman juega de local.
          </p>
          <div>
            {filas.map(({ cat, proxima }) => (
              <ProgramarFechaFila
                key={cat.id}
                partidoId={partidoId(cat.id, proxima.numeroFecha)}
                categoriaNombre={cat.nombre}
                esLocal={proxima.esLocal}
                rival={proxima.rival}
                nombreNewman={nombreNewmanDe(cat.id)}
                fecha={proxima.fecha}
                notaEspecial={proxima.notaEspecial}
                horaInicial={proxima.hora}
                numeroCanchaInicial={proxima.numeroCancha}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
