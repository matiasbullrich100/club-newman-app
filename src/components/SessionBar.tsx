import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import type { SessionPayload } from "@/lib/auth/session";
import { DORADO, DORADO_SUAVE, TINTA } from "@/lib/colors";

const pillBase = {
  padding: "6px 12px",
  borderRadius: 20,
  fontWeight: 400 as const,
  letterSpacing: 1,
  fontSize: "0.72rem",
  textTransform: "uppercase" as const,
};

const ETIQUETA_ROL: Record<SessionPayload["rol"], string> = {
  designado: "Designado",
  entrenador: "Entrenador",
  manager: "Manager",
};

export default function SessionBar({ session }: { session: SessionPayload | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "6px 4px 0", fontSize: "0.78rem" }}>
      {session ? (
        <>
          <span style={{ ...pillBase, border: `1px solid ${DORADO}`, color: TINTA, background: DORADO }}>
            {ETIQUETA_ROL[session.rol]}
            {session.categoriaId ? ` · ${session.categoriaId}` : ""}
          </span>
          <form action={logout}>
            <button
              type="submit"
              style={{
                ...pillBase,
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(226,197,120,.35)",
                color: DORADO_SUAVE,
              }}
            >
              Salir
            </button>
          </form>
        </>
      ) : (
        <Link
          href="/login"
          style={{ ...pillBase, background: "rgba(255,255,255,.06)", border: "1px solid rgba(226,197,120,.35)", color: DORADO_SUAVE }}
        >
          Iniciar sesión
        </Link>
      )}
    </div>
  );
}
