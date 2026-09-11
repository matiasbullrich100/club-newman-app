import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { puedeResetearPartidoDePrueba } from "@/lib/auth/scope";
import { pruebasVisiblesPara } from "@/lib/partidosPrueba";
import { asegurarInstanciaPractica } from "@/lib/match/practicaInstancias";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import ResetDemoButton from "@/components/ResetDemoButton";
import { DORADO_SUAVE } from "@/lib/colors";

export default async function PruebasPage() {
  const session = await getSession();
  if (!pruebasVisiblesPara(session)) redirect("/");

  // La cuenta "demo" opera su PROPIA copia privada, creada (o renovada si ya vencio) al toque --
  // asi 5 personas que entran a la vez con "demo" caen cada una en su partido, sin pisarse. El
  // administrador sigue usando los 2 ids fijos de siempre, permanentes, sin vencimiento.
  const esDemo = session!.rol === "designado" && session!.categoriaId === "demo";
  const instancia = esDemo && session!.demoInstanceId ? await asegurarInstanciaPractica(session!.demoInstanceId) : null;

  const PARTIDOS_DEMO = [
    { id: instancia?.preAId ?? "pre-a-test-beromama", label: "Pre A · Beromama", categoriaId: "pre-a" },
    { id: instancia?.m15Id ?? "m15-c-test-cambio", label: "M15 C · Cambios", categoriaId: "m15-c" },
  ];

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Partido de Prueba" />

      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
        {PARTIDOS_DEMO.map((p) => (
          <div
            key={p.id}
            style={{
              background: "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
              border: "1px solid rgba(226,197,120,.25)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <Link
              href={`/partido/${p.id}`}
              style={{
                display: "block",
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: 1,
                fontSize: "1rem",
                fontWeight: 700,
                color: DORADO_SUAVE,
              }}
            >
              {p.label}
            </Link>
            {puedeResetearPartidoDePrueba(session, p.categoriaId, p.id) && (
              <ResetDemoButton partidoId={p.id} label={p.label} />
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
