"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import type { Incidente } from "@/types/firestore";
import { describirIncidente } from "@/lib/incidentes";

export default function IncidentesFeed({ partidoId }: { partidoId: string }) {
  const [incidentes, setIncidentes] = useState<(Incidente & { id: string })[]>([]);

  useEffect(() => {
    const q = query(collection(db, "partidos", partidoId, "incidentes"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setIncidentes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Incidente) })));
    });
  }, [partidoId]);

  if (incidentes.length === 0) return null;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <h3 style={{ fontSize: "0.9rem" }}>Incidencias</h3>
      <ul style={{ listStyle: "none", padding: 0, fontSize: "0.85rem" }}>
        {incidentes.map((inc) => (
          <li key={inc.id} style={{ padding: "0.25rem 0", borderBottom: "1px solid #eee" }}>
            {inc.periodo} {inc.minuto}&apos; — {describirIncidente(inc)}
          </li>
        ))}
      </ul>
    </div>
  );
}
