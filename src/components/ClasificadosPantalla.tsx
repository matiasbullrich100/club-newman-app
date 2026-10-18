"use client";

// Decide CUANDO se muestra la pantalla "Newman clasificado a playoff" (hoy y manana, 18 y 19/10/2026; despues
// deja de mostrarse sola). Reemplaza a los tips de antes:
// - Al entrar a Plantel Superior, Juveniles o Playoff: SIEMPRE (cada vez que se entra a una de esas secciones,
//   como los tips; moverse dentro de la misma seccion no la repite).
// - En cualquier otra pagina por la que se abra la app: la primera vez de cada dia.
// - `?clasificados=1` en la direccion: siempre (para revisarla).
// La pantalla en si (y su boton "Entendido") es EnJuegoTips: se la monta de nuevo (key) cada vez que corresponde.

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import EnJuegoTips from "./EnJuegoTips";
import type { ClasificadoNewman } from "@/lib/clasificadosNewman";

const DIAS = ["2026-10-18", "2026-10-19"];
const SECCIONES = ["/superior", "/juveniles", "/playoff"];
const LS_DIA = "enjuegoClasificadosDia";

// Seccion a la que pertenece una ruta (o null): /juveniles/m19/... es "/juveniles".
const seccionDe = (p: string) => SECCIONES.find((s) => p === s || p.startsWith(`${s}/`)) ?? null;

export default function ClasificadosPantalla({ clasificados }: { clasificados: ClasificadoNewman[] }) {
  const pathname = usePathname();
  const previo = useRef<string | null>(null);
  const [vez, setVez] = useState(0);

  useEffect(() => {
    const antes = previo.current;
    previo.current = pathname;
    if (clasificados.length === 0) return;
    const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
    const forzada = antes === null && new URLSearchParams(window.location.search).get("clasificados") === "1";
    if (!forzada && !DIAS.includes(hoy)) return;

    let mostrar = forzada;
    const seccion = seccionDe(pathname);
    if (!mostrar && seccion && seccion !== (antes === null ? null : seccionDe(antes))) mostrar = true;
    if (!mostrar && antes === null) {
      try {
        mostrar = localStorage.getItem(LS_DIA) !== hoy;
      } catch {
        mostrar = true;
      }
    }
    if (!mostrar) return;
    try {
      localStorage.setItem(LS_DIA, hoy);
    } catch {
      /* storage bloqueado: se muestra igual */
    }
    setVez((v) => v + 1);
  }, [pathname, clasificados]);

  return vez > 0 ? <EnJuegoTips key={vez} clasificados={clasificados} /> : null;
}
