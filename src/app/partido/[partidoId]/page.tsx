import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { puedeOperarCategoria, esManagerDeCategoria } from "@/lib/auth/scope";
import { CATEGORIAS, NUMERO_FECHAS_JUVENILES, NUMERO_FECHAS_SUPERIOR, grupoDeCategoria } from "@/lib/categorias";
import { PARTIDOS_DEMO_IDS } from "@/lib/partidosPrueba";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import type { JugadorAgregado, JugadorPartido, Partido, PosicionesTorneo } from "@/types/firestore";
import PartidoLive from "@/components/PartidoLive";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import FooterChip from "@/components/FooterChip";
import ResetDemoButton from "@/components/ResetDemoButton";
import PartidoProgramadoPanel from "@/components/PartidoProgramadoPanel";
import PartidoTerminadoPanel from "@/components/PartidoTerminadoPanel";
import type { RosterJugador } from "@/components/panel-designado/types";
import { ordenarPorDorsal } from "@/lib/players";
import { datosPartidoProgramado } from "@/lib/match/datosPartidoProgramado";
import { datosPartidoTerminado } from "@/lib/match/datosPartidoTerminado";
import { DORADO_SUAVE } from "@/lib/colors";

export default async function PartidoPage({
  params,
}: {
  params: Promise<{ partidoId: string }>;
}) {
  const { partidoId } = await params;
  const partidoRef = adminDb.collection("partidos").doc(partidoId);

  const [partidoSnap, session] = await Promise.all([partidoRef.get(), getSession()]);
  if (!partidoSnap.exists) notFound();
  const partido = partidoSnap.data() as Partido;
  const categoria = CATEGORIAS.find((c) => c.id === partido.categoriaId);
  const categoriaNombre = categoria?.nombre ?? partido.categoriaId;
  const esPartidoDePrueba = PARTIDOS_DEMO_IDS.includes(partidoId);
  const mostrarReset = esPartidoDePrueba && esManagerDeCategoria(session, partido.categoriaId);
  // numeroFecha "demo" (partidos de prueba, fuera de cualquier esquema real) no tiene vista de
  // fecha propia -- /fecha o /juveniles/.../fecha devuelven 404 para un numero fuera de rango.
  const numero = Number(partido.numeroFecha);
  const maxFechas = categoria?.grupo === "juveniles" ? NUMERO_FECHAS_JUVENILES : NUMERO_FECHAS_SUPERIOR;
  const numeroFechaValido = Number.isInteger(numero) && numero >= 1 && numero <= maxFechas;
  const backHref = PARTIDOS_DEMO_IDS.includes(partidoId)
    ? "/pruebas"
    : !numeroFechaValido
      ? "/"
      : categoria?.grupo === "juveniles"
        ? `/juveniles/${categoria.edadId}/fecha/${numero}`
        : `/fecha/${numero}`;
  const puedeOperar = puedeOperarCategoria(session, partido.categoriaId);
  const puedeReiniciar = esManagerDeCategoria(session, partido.categoriaId);

  // Boton "Tabla de posiciones al [fecha]" en PartidoHistorico -- la fecha es la de la ULTIMA
  // actualizacion de la tabla cacheada (ver /posiciones/[categoriaId]), no la fecha de ESTE
  // partido, para no confundir "posiciones al dia de hoy" con "posiciones al dia de esta fecha".
  const tienePosiciones = TORNEOS_URBA[partido.categoriaId] !== undefined;
  const posicionesSnap = tienePosiciones ? await adminDb.collection("posiciones").doc(partido.categoriaId).get() : null;
  const posicionesActualizado = posicionesSnap?.exists
    ? ((posicionesSnap.data() as PosicionesTorneo).updatedAt as unknown as FirebaseFirestore.Timestamp)?.toDate?.() ?? null
    : null;
  const posicionesHref = tienePosiciones ? `/posiciones/${partido.categoriaId}` : undefined;

  // Mismos "Fixt. New." / "Fixt Divis." que ya aparecen en el resumen (LiveBanner/ProximaFechaRow)
  // y en /categoria/[id] -- aca tambien hacen falta porque esta pagina (formacion + incidencias)
  // es a la que se llega tocando un partido puntual, y antes solo tenia el boton de Tabla.
  const grupo = grupoDeCategoria(partido.categoriaId);
  const fixtureNewmanHref =
    grupo.grupo === "juveniles" ? `/juveniles/${grupo.edadId}/equipo/${partido.categoriaId}` : `/categoria/${partido.categoriaId}/fixture`;
  const fixtureDivisionHref = tieneFixtureDivision(partido.categoriaId) ? `/fixture/${partido.categoriaId}/division` : undefined;

  const cabecera = (
    <>
      <BackLink href={backHref} />
      <Header rightLabel={`Fecha ${partido.numeroFecha}`} logo={categoria?.grupo === "juveniles" ? "urba" : "top14"} />
      <SessionBar session={session} />
      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase" }}>
        {categoriaNombre}
      </div>
    </>
  );

  // Partido ya jugado: vista estática, para siempre (nunca vuelve a estar operable).
  if (partido.estado === "terminado") {
    const datos = await datosPartidoTerminado(partidoId, partido, session);
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
        {cabecera}
        <PartidoTerminadoPanel
          partidoId={partidoId}
          partido={partido}
          datos={datos}
          posicionesHref={posicionesHref}
          posicionesActualizado={posicionesActualizado}
          fixtureNewmanHref={fixtureNewmanHref}
          fixtureDivisionHref={fixtureDivisionHref}
        />
        <FooterChip />
      </main>
    );
  }

  // Partido todavia no arranco: vista estatica (resultado/formaciones aun no hay) + si quien
  // mira puede operar esta categoria, el boton "Iniciar partido" para arrancarlo cuando toque.
  if (partido.estado === "programado") {
    const datos = await datosPartidoProgramado(partidoId, partido, session);
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
        {cabecera}
        <PartidoProgramadoPanel
          partidoId={partidoId}
          partido={partido}
          datos={datos}
          posicionesHref={posicionesHref}
          posicionesActualizado={posicionesActualizado}
          fixtureNewmanHref={fixtureNewmanHref}
          fixtureDivisionHref={fixtureDivisionHref}
        />
        <FooterChip />
      </main>
    );
  }

  // en_juego | entretiempo | suspendido: motor en vivo (Fase 1, sin cambios).
  const jugadoresQuery =
    grupo.grupo === "superior"
      ? adminDb.collection("jugadores").where("grupo", "==", "superior")
      : adminDb.collection("jugadores").where("grupo", "==", "juveniles").where("edadId", "==", grupo.edadId);
  const [plantelSnap, jugadoresSnap] = await Promise.all([partidoRef.collection("plantel").get(), jugadoresQuery.get()]);
  const plantelCompleto = jugadoresSnap.docs.map((d) => ({
    jugadorId: d.id,
    nombre: (d.data() as JugadorAgregado).nombre,
  }));
  const partidoParaCliente: Partido = {
    categoriaId: partido.categoriaId,
    numeroFecha: partido.numeroFecha,
    rival: partido.rival,
    esLocal: partido.esLocal,
    cancha: partido.cancha,
    estado: partido.estado,
    resultado: partido.resultado,
    enCanchaIds: partido.enCanchaIds,
  };
  const plantel: RosterJugador[] = ordenarPorDorsal(
    plantelSnap.docs.map((d) => {
      const data = d.data() as JugadorPartido;
      return { jugadorId: d.id, nombre: data.nombre, dorsal: data.dorsal, titular: data.titular };
    })
  );

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      {cabecera}
      <PartidoLive
        partidoId={partidoId}
        inicial={partidoParaCliente}
        session={session}
        plantel={plantel}
        plantelCompleto={plantelCompleto}
      />
      {mostrarReset && <ResetDemoButton partidoId={partidoId} />}
      <FooterChip />
    </main>
  );
}
