import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import Header from "@/components/Header";
import SessionBar from "@/components/SessionBar";
import ResetDemoButton from "@/components/ResetDemoButton";
import { DORADO_SUAVE } from "@/lib/colors";

// Partidos de prueba (Fase 1), uno por categoria -- fuera del esquema real a proposito, asi
// que necesitan su propio link (nunca aparecen en /fecha ni /categoria).
const PARTIDOS_DEMO = [
  { id: "demo-partido-1", label: "Pre B" },
  { id: "demo-partido-2", label: "M-22" },
  { id: "demo-partido-3", label: "Pre A" },
];

const botonStyle: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: 1,
  fontSize: "1rem",
  fontWeight: 700,
  padding: "18px 16px",
  borderRadius: 10,
  border: "1px solid rgba(226,197,120,.4)",
  color: DORADO_SUAVE,
  background: "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
};

export default async function Home() {
  const session = await getSession();

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <Header tituloHome />
      <SessionBar session={session} />

      <p style={{ marginTop: 16, fontSize: "0.85rem", textAlign: "center" }}>
        Partidos de prueba (Fase 1):{" "}
        {PARTIDOS_DEMO.map((p, i) => (
          <span key={p.id}>
            {i > 0 && " · "}
            <Link href={`/partido/${p.id}`} style={{ color: DORADO_SUAVE }}>
              {p.label}
            </Link>
          </span>
        ))}
      </p>

      {session?.rol === "manager" && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {PARTIDOS_DEMO.map((p) => (
            <ResetDemoButton key={p.id} partidoId={p.id} label={p.label} />
          ))}
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        <Link href="/superior" style={botonStyle}>
          Plantel Superior
        </Link>
        <Link href="/juveniles" style={botonStyle}>
          Juveniles
        </Link>
      </div>

      {(session?.rol === "manager" || session?.rol === "entrenador") && (
        <p style={{ textAlign: "center", marginTop: 20 }}>
          <Link
            href="/estadisticas"
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
            Tarjetas y minutos
          </Link>
        </p>
      )}
    </main>
  );
}
