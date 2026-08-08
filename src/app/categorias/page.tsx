import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS } from "@/lib/categorias";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import { DORADO_SUAVE } from "@/lib/colors";

export default async function CategoriasPage() {
  const session = await getSession();

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: 20,
        }}
      >
        {CATEGORIAS.map((cat) => (
          <Link
            key={cat.id}
            href={`/categoria/${cat.id}`}
            style={{
              background: "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
              border: "1px solid rgba(226,197,120,.25)",
              borderRadius: 8,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ fontWeight: 600, letterSpacing: 0.5, fontSize: "0.85rem", textTransform: "uppercase", color: DORADO_SUAVE }}>
              {cat.nombre}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
