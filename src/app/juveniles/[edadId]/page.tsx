import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { EDADES, equiposDeEdad, nombreNewmanDe } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { partidosEnVivoOUltimoTerminado } from "@/lib/match/resumenSeccion";
import { resultadoSigueFresco } from "@/lib/fecha";
import { PARTIDOS_DEMO_IDS } from "@/lib/partidosPrueba";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import LiveBanner from "@/components/LiveBanner";
import { DORADO_SUAVE } from "@/lib/colors";
import { Seuo } from "@/components/PieNota";

// Primera pantalla de la edad: solo lo que se esta jugando/se jugo hoy + el selector de equipo --
// el fixture completo (jugado y por jugar) de cada equipo vive en /juveniles/[edadId]/equipo/[equipoId],
// no aca (mismo patron que /superior).
export default async function EdadPage({ params }: { params: Promise<{ edadId: string }> }) {
  const { edadId } = await params;
  const edad = EDADES.find((e) => e.id === edadId);
  if (!edad) notFound();

  const equipos = equiposDeEdad(edadId);
  const session = await getSession();

  if (equipos.length === 0) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
        <BackLink href="/juveniles" />
        <SessionBar session={session} />
        <Header rightLabel={edad.nombre} logo="urba" />
        <p style={{ textAlign: "center", color: DORADO_SUAVE, marginTop: 24, fontStyle: "italic", opacity: 0.75 }}>
          Todavía no hay equipos ni fixture cargado para {edad.nombre}.
        </p>
      </main>
    );
  }

  // Ver el mismo comentario en /superior/page.tsx -- una categoria de prueba puede coincidir con
  // una real; partidosEnVivoOUltimoTerminado ya oculta esos partidos para quien no puede verlos.
  const resumen = await partidosEnVivoOUltimoTerminado(equipos.map((e) => e.id), session);

  // Esta pantalla es "lo que pasa HOY": solo se muestra el banner de una categoria si esta en vivo
  // o si SU resultado / Fecha libre es de hoy o los ultimos 3 dias. partidosEnVivoOUltimoTerminado
  // devuelve el ultimo terminado por mas viejo que sea, asi que sin este filtro un resultado de la
  // fecha pasada quedaba pegado aca para siempre -- mismo criterio que el `fresco()` de /juveniles
  // y /superior. El fixture completo esta un nivel mas adentro.
  const ESTADOS_EN_VIVO = new Set(["en_juego", "entretiempo", "suspendido"]);
  const frescos = resumen.filter(
    (p) =>
      ESTADOS_EN_VIVO.has(p.estado) ||
      ((p.estado === "terminado" || !!p.notaEspecial) && !!p.fecha && resultadoSigueFresco(p.fecha))
  );

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/juveniles" />
      <SessionBar session={session} />
      <Header rightLabel={edad.nombre} logo="urba" />

      {frescos.map((p) => (
        <LiveBanner
          key={p.id}
          partidoId={p.id}
          categoriaNombre={equipos.find((e) => e.id === p.categoriaId)?.nombre ?? p.categoriaId}
          inicial={{ esLocal: p.esLocal, rival: p.rival, estado: p.estado, resultado: p.resultado, notaEspecial: p.notaEspecial }}
          nombreNewman={nombreNewmanDe(p.categoriaId)}
          esPrueba={PARTIDOS_DEMO_IDS.includes(p.id)}
          ultimaFechaHref={
            tieneFixtureDivision(p.categoriaId) && !PARTIDOS_DEMO_IDS.includes(p.id) && Number.isInteger(p.numeroFecha) && p.numeroFecha > 0
              ? `/fixture/${p.categoriaId}/division/${p.numeroFecha}`
              : undefined
          }
          posicionesHref={TORNEOS_URBA[p.categoriaId] !== undefined ? `/posiciones/${p.categoriaId}` : undefined}
          fixtureNewmanHref={`/juveniles/${edadId}/equipo/${p.categoriaId}`}
          fixtureDivisionHref={tieneFixtureDivision(p.categoriaId) ? `/fixture/${p.categoriaId}/division` : undefined}
        />
      ))}

      <p style={{ textAlign: "center", marginTop: 16 }}>
        <Link
          href={`/juveniles/${edadId}/equipos`}
          style={{
            display: "inline-block",
            textTransform: "uppercase",
            letterSpacing: 1,
            fontSize: "0.78rem",
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid rgba(226,197,120,.4)",
            color: DORADO_SUAVE,
          }}
        >
          Ver por equipo
        </Link>
      </p>
      <Seuo />
    </main>
  );
}
