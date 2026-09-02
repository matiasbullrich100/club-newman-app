"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth/actions";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 10px",
  borderRadius: 7,
  border: "1px solid rgba(226,197,120,.35)",
  background: "rgba(0,0,0,.25)",
  color: "#f7f1e4",
  fontSize: "0.9rem",
  marginTop: 4,
};

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (result.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(result.error ?? "No se pudo iniciar sesión");
      }
    });
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <Header />
      <div
        style={{
          background: "rgba(255,255,255,.045)",
          border: "1px solid rgba(226,197,120,.2)",
          borderRadius: 12,
          padding: 16,
          maxWidth: 320,
          margin: "1rem auto 0",
        }}
      >
        <h1 style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: "0.85rem", color: DORADO, marginBottom: 10 }}>
          Iniciar sesión
        </h1>
        <form action={handleSubmit} style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.75rem", opacity: 0.8, color: DORADO_SUAVE }}>
            Usuario
            <input
              name="username"
              type="text"
              required
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              spellCheck={false}
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: "0.75rem", opacity: 0.8, color: DORADO_SUAVE }}>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Contraseña
              <button
                type="button"
                onClick={() => setMostrarPassword((v) => !v)}
                style={{
                  fontSize: "0.68rem",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: DORADO,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                }}
              >
                {mostrarPassword ? "Ocultar" : "Mostrar"}
              </button>
            </span>
            <input
              name="password"
              type={mostrarPassword ? "text" : "password"}
              required
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="current-password"
              spellCheck={false}
              style={inputStyle}
            />
          </label>
          {error && <p style={{ color: "#f3caca", fontSize: "0.85rem" }}>{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            style={{
              marginTop: 6,
              fontSize: "0.78rem",
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: DORADO,
              color: "#451526",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {isPending ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
