import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS_SUPERIOR } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { partidosEnVivoOUltimoTerminado, partidosDeFechaExacta, proximasFechasDe } from "@/lib/match/resumenSeccion";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { debeMostrarProximaFechaEnArgentina, diasDesdeEnArgentina, mananaIsoEnArgentina } from "@/lib/fecha";
import { PARTIDOS_DEMO_IDS, pruebasVisiblesPara } from "@/lib/partidosPrueba";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import LiveBanner from "@/components/LiveBanner";
import ProximaFechaBanner from "@/components/ProximaFechaBanner";
import PartidosMananaBanner from "@/components/PartidosMananaBanner";
import { DORADO_SUAVE } from "@/lib/colors";

const ESTADOS_EN_VIVO = new Set(["en_juego", "entretiempo", "suspendido"]);

// Primera pantalla de la division: solo lo que se esta jugando/se jugo hoy + el selector de
// categoria -- el fixture completo (jugado y por jugar) vive en /categoria/[categoriaId]/fixture,
// no aca. El selector de categoria lleva a /categoria/[categoriaId], que ya muestra la formacion
// del proximo partido directo.
// De jueves a la noche a domingo (juega Plantel Superior), si Primera todavia no tiene nada en vivo
// ni recien terminado, el resultado de la fecha pasada ya esta viejo -- se muestra la Proxima Fecha
// (de Primera) en su lugar hasta que arranque el partido o haya resultado.
export default async function PlantelSuperiorPage() {
  const [session, resumenCompleto] = await Promise.all([
    getSession(),
    partidosEnVivoOUltimoTerminado(CATEGORIAS_SUPERIOR.map((c) => c.id)),
  ]);
  // Algunas categorias de prueba (ej. "pre-a", "m-22") coinciden con categorias reales, asi que
  // un partido de PARTIDOS_DEMO_IDS puede aparecer en este mismo banner -- se marca "PRUEBA" y,
  // pasado el corte, se oculta para quien no sea el Administrador (ver partidosPrueba.ts).
  const pruebasVisibles = pruebasVisiblesPara(session);
  const resumen = resumenCompleto.filter((p) => pruebasVisibles || !PARTIDOS_DEMO_IDS.includes(p.id));
  const enVivo = resumen.filter((p) => ESTADOS_EN_VIVO.has(p.estado));
  // "terminado" o Fecha libre (un bye nunca pasa a "terminado", pero cuenta como la ultima fecha
  // jugada igual -- ver partidosEnVivoOUltimoTerminado).
  const terminados = resumen.filter((p) => p.estado === "terminado" || p.notaEspecial);
  // "terminados" queda pegado toda la semana (ver partidosEnVivoOUltimoTerminado) -- sin chequear
  // la fecha, Primera SIEMPRE aparece como "recien terminada" (aunque haya jugado hace 5 dias) y
  // la Proxima Fecha nunca llegaria a mostrarse.
  const primeraTerminadoFresco = terminados.some(
    (p) => p.categoriaId === "primera" && p.fecha && diasDesdeEnArgentina(p.fecha) <= 3
  );

  const mostrarProximaFecha = enVivo.length === 0 && !primeraTerminadoFresco && debeMostrarProximaFechaEnArgentina();
  const proximasFechas = mostrarProximaFecha ? await proximasFechasDe("primera", 3) : [];

  // Resumen "Partidos de Mañana" -- todas las categorias de Plantel Superior que juegan manana,
  // con horario, para verlas de un vistazo sin entrar categoria por categoria.
  const partidosManana = await partidosDeFechaExacta(CATEGORIAS_SUPERIOR.map((c) => c.id), mananaIsoEnArgentina());
  const partidosMananaConNombre = partidosManana.map((p) => ({
    categoriaId: p.categoriaId,
    categoriaNombre: CATEGORIAS_SUPERIOR.find((c) => c.id === p.categoriaId)?.nombre ?? p.categoriaId,
    partido: p,
    posicionesHref: TORNEOS_URBA[p.categoriaId] !== undefined ? `/posiciones/${p.categoriaId}` : undefined,
    fixtureNewmanHref: `/categoria/${p.categoriaId}/fixture`,
    fixtureDivisionHref: tieneFixtureDivision(p.categoriaId) ? `/fixture/${p.categoriaId}/division` : undefined,
  }));

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Plantel Superior" />

      {enVivo.map((p) => (
        <LiveBanner
          key={p.id}
          partidoId={p.id}
          categoriaNombre={CATEGORIAS_SUPERIOR.find((c) => c.id === p.categoriaId)?.nombre ?? p.categoriaId}
          inicial={{ esLocal: p.esLocal, rival: p.rival, estado: p.estado, resultado: p.resultado, notaEspecial: p.notaEspecial }}
          esPrueba={PARTIDOS_DEMO_IDS.includes(p.id)}
          posicionesHref={TORNEOS_URBA[p.categoriaId] !== undefined ? `/posiciones/${p.categoriaId}` : undefined}
          fixtureNewmanHref={`/categoria/${p.categoriaId}/fixture`}
          fixtureDivisionHref={tieneFixtureDivision(p.categoriaId) ? `/fixture/${p.categoriaId}/division` : undefined}
        />
      ))}

      {proximasFechas.length > 0 ? (
        <ProximaFechaBanner proximas={proximasFechas} />
      ) : (
        terminados.map((p) => (
          <LiveBanner
            key={p.id}
            partidoId={p.id}
            categoriaNombre={CATEGORIAS_SUPERIOR.find((c) => c.id === p.categoriaId)?.nombre ?? p.categoriaId}
            inicial={{ esLocal: p.esLocal, rival: p.rival, estado: p.estado, resultado: p.resultado, notaEspecial: p.notaEspecial }}
            esPrueba={PARTIDOS_DEMO_IDS.includes(p.id)}
            posicionesHref={TORNEOS_URBA[p.categoriaId] !== undefined ? `/posiciones/${p.categoriaId}` : undefined}
            fixtureNewmanHref={`/categoria/${p.categoriaId}/fixture`}
            fixtureDivisionHref={tieneFixtureDivision(p.categoriaId) ? `/fixture/${p.categoriaId}/division` : undefined}
          />
        ))
      )}

      <PartidosMananaBanner partidos={partidosMananaConNombre} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 16 }}>
        {CATEGORIAS_SUPERIOR.map((cat) => (
          <Link
            key={cat.id}
            href={`/categoria/${cat.id}`}
            style={{
              background: "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
              border: "1px solid rgba(226,197,120,.25)",
              borderRadius: 8,
              padding: "8px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 600, letterSpacing: 0.3, fontSize: "0.72rem", textTransform: "uppercase", color: DORADO_SUAVE }}>
              {cat.nombre}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
