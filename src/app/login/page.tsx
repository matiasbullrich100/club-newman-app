"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth/actions";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
    <main style={{ padding: "1.5rem 1rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "1.25rem" }}>Iniciar sesión</h1>
      <form action={handleSubmit} style={{ display: "grid", gap: "0.75rem", maxWidth: 320 }}>
        <label>
          Usuario
          <input name="username" type="text" required style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" required style={{ display: "block", width: "100%" }} />
        </label>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit" disabled={isPending}>
          {isPending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
