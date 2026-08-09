import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { EDADES, equiposDeEdad } from "@/lib/categorias";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import { DORADO_SUAVE } from "@/lib/colors";

export default async function JuvenilesPage() {
  const session = await getSession();

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Juveniles" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 20 }}>
        {EDADES.map((edad) => {
          const tieneEquipos = equiposDeEdad(edad.id).length > 0;
          return (
            <Link
              key={edad.id}
              href={`/juveniles/${edad.id}`}
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
