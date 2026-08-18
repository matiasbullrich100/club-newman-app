import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS, CATEGORIAS_JUVENILES, EDADES, equiposDeEdad, nombreNewmanDe } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { partidosEnVivoOUltimoTerminado } from "@/lib/match/resumenSeccion";
import { PARTIDOS_DEMO_IDS, pruebasVisiblesPara } from "@/lib/partidosPrueba";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import LiveBanner from "@/components/LiveBanner";
import { DORADO_SUAVE } from "@/lib/colors";

export default async function JuvenilesPage() {
  const session = await getSession();

  // Mismo patron que /superior y /juveniles/[edadId], pero con las 4 divisiones juntas -- para no
  // tener que entrar a cada edad para ver que se esta jugando/se jugo hoy (antes solo aparecia un
  // nivel mas abajo, division por division).
  const resumenCompleto = await partidosEnVivoOUltimoTerminado(CATEGORIAS_JUVENILES.map((c) => c.id));
  const pruebasVisibles = pruebasVisiblesPara(session);
  const resumen = resumenCompleto.filter((p) => pruebasVisibles || !PARTIDOS_DEMO_IDS.includes(p.id));

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Juveniles" />

      {resumen.map((p) => (
        <LiveBanner
          key={p.id}
          partidoId={p.id}
          categoriaNombre={CATEGORIAS.find((c) => c.id === p.categoriaId)?.nombre ?? p.categoriaId}
          inicial={{ esLocal: p.esLocal, rival: p.rival, estado: p.estado, resultado: p.resultado }}
          nombreNewman={nombreNewmanDe(p.categoriaId)}
          esPrueba={PARTIDOS_DEMO_IDS.includes(p.id)}
          posicionesHref={TORNEOS_URBA[p.categoriaId] !== undefined ? `/posiciones/${p.categoriaId}` : undefined}
        />
      ))}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 20 }}>
        {EDADES.map((edad) => {
          const tieneEquipos = equiposDeEdad(edad.id).length > 0;
          return (
            <Link
              key={edad.id}
              href={`/juveniles/${edad.id}/equipos`}
              style={{
                background: "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
                border: "1px solid rgba(226,197,120,.25)",
                borderRadius: 8,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <div style={{ fontWeight: 600, letterSpacing: 0.5, fontSize: "0.85rem", textTransform: "uppercase", color: DORADO_SUAVE }}>
                {edad.nombre}
              </div>
              {!tieneEquipos && <div style={{ fontSize: "0.65rem", opacity: 0.55, fontStyle: "italic" }}>Próximamente</div>}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
