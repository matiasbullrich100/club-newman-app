import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { EDADES, equiposDeEdad, nombreNewmanDe } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { partidosEnVivoOUltimoTerminado } from "@/lib/match/resumenSeccion";
import { PARTIDOS_DEMO_IDS, pruebasVisiblesPara } from "@/lib/partidosPrueba";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import LiveBanner from "@/components/LiveBanner";
import { DORADO_SUAVE } from "@/lib/colors";

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
        <Header rightLabel={edad.nombre} />
        <p style={{ textAlign: "center", color: DORADO_SUAVE, marginTop: 24, fontStyle: "italic", opacity: 0.75 }}>
          Todavía no hay equipos ni fixture cargado para {edad.nombre}.
        </p>
      </main>
    );
  }

  const resumenCompleto = await partidosEnVivoOUltimoTerminado(equipos.map((e) => e.id));
  // Ver el mismo comentario en /superior/page.tsx -- una categoria de prueba puede coincidir con
  // una real, asi que se marca "PRUEBA" y, pasado el corte, se oculta para quien no sea Admin.
  const pruebasVisibles = pruebasVisiblesPara(session);
  const resumen = resumenCompleto.filter((p) => pruebasVisibles || !PARTIDOS_DEMO_IDS.includes(p.id));

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/juveniles" />
      <SessionBar session={session} />
      <Header rightLabel={edad.nombre} />

      {resumen.map((p) => (
        <LiveBanner
          key={p.id}
          partidoId={p.id}
          categoriaNombre={equipos.find((e) => e.id === p.categoriaId)?.nombre ?? p.categoriaId}
          inicial={{ esLocal: p.esLocal, rival: p.rival, estado: p.estado, resultado: p.resultado }}
          nombreNewman={nombreNewmanDe(p.categoriaId)}
          esPrueba={PARTIDOS_DEMO_IDS.includes(p.id)}
          posicionesHref={TORNEOS_URBA[p.categoriaId] !== undefined ? `/posiciones/${p.categoriaId}` : undefined}
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
    </main>
  );
}
