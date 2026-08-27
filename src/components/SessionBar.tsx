import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import type { SessionPayload } from "@/lib/auth/session";
import { nombreCategoria } from "@/lib/categorias";
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
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        fontSize: "0.78rem",
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 100,
      }}
    >
      {session ? (
        <>
          <span style={{ ...pillBase, border: `1px solid ${DORADO}`, color: TINTA, background: DORADO }}>
            {session.username === "admin" ? "Administrador" : ETIQUETA_ROL[session.rol]}
            {/* Nombre de la categoria del designado, derivado de categoriaId (no del username de la
                sesion) para que valga aunque la cuenta se haya renombrado despues de loguearse. */}
            {session.categoriaId ? ` · ${nombreCategoria(session.categoriaId)}` : ""}
            {session.alcance ? ` · ${session.alcance.toUpperCase()}` : ""}
          </span>
          <form action={logout}>
            <button
              type="submit"
              style={{
                ...pillBase,
                background: "rgba(53,9,22,.92)",
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
          style={{ ...pillBase, background: "rgba(53,9,22,.92)", border: "1px solid rgba(226,197,120,.35)", color: DORADO_SUAVE }}
        >
          Iniciar sesión
        </Link>
      )}
    </div>
  );
}
