"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import FixtureRow, { MatchupText } from "./FixtureRow";
import type { EstadoPartido, Resultado } from "@/types/firestore";

interface EstadoVivo {
  estado: EstadoPartido;
  resultado: Resultado;
  notaEspecial?: string;
}

export default function FixtureRowLive({
  partidoId,
  href,
  categoriaNombre,
  esLocal,
  rival,
  inicial,
}: {
  partidoId: string;
  href: string;
  categoriaNombre: string;
  esLocal: boolean;
  rival: string;
  inicial: EstadoVivo;
}) {
  const [vivo, setVivo] = useState<EstadoVivo>(inicial);

  useEffect(() => {
    const ref = doc(db, "partidos", partidoId);
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as EstadoVivo;
      setVivo({ estado: data.estado, resultado: data.resultado, notaEspecial: data.notaEspecial });
    });
  }, [partidoId]);

  return (
    <FixtureRow
      href={href}
      jugada={false}
      tituloPrincipal={categoriaNombre}
      notaSecundaria={
        vivo.notaEspecial ?? (
          <>
            <MatchupText esLocal={esLocal} rival={rival} jugado={false} resultado={vivo.resultado} /> · en vivo
          </>
        )
      }
    />
  );
}
