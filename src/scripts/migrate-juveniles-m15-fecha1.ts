// Carga la fecha 1 de M15 (A/B/C/D) contra Regatas, domingo 09/08/2026 -- formaciones
// transcriptas de las imagenes que paso el club. Correr con: npm run migrate-m15-fecha1
// Idempotente: pisa el doc si ya existe (mismo patron que seed.ts).

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido, Partido } from "../types/firestore";

const FECHA_ISO = "2026-08-09";

interface JugadorFormacion {
  dorsal: string;
  nombre: string;
  titular: boolean;
}

interface EquipoFecha1 {
  categoriaId: string;
  rival: string;
  cancha: string;
  hora: string;
  jugadores: JugadorFormacion[];
}

function titulares(nombres: string[]): JugadorFormacion[] {
  return nombres.map((nombre, i) => ({ dorsal: String(i + 1), nombre, titular: true }));
}

function suplente(dorsal: number, nombre: string): JugadorFormacion {
  return { dorsal: String(dorsal), nombre, titular: false };
}

const EQUIPOS: EquipoFecha1[] = [
  {
    categoriaId: "m15-a",
    rival: "Regatas A",
    cancha: "Newman",
    hora: "11:00",
    jugadores: titulares([
      "Llambi Bovino, Felipe",
      "Sola, Benicio",
      "Ayerza, Iván Federico",
      "Arnaudo Losada, Ignacio Javier",
      "Benvenuti, Vito",
      "Fiorito, Jaime",
      "Luna Alurralde, Ignacio",
      "Miguens, Faustino",
      "Pechar, Jose",
      "Valverde, Manuel",
      "Llavallol, Marcos",
      "Rodriguez Ribas, Hilario",
      "Reynal, Abbott Juan",
      "Aramburu, Iñaki",
      "Lopez Aufranc, Hilario",
    ]),
  },
  {
    categoriaId: "m15-b",
    rival: "Regatas B",
    cancha: "Newman",
    hora: "09:30",
    jugadores: [
      ...titulares([
        "Zemborain, Antonio",
        "Barros Ocampo, Bartolome",
        "Ordoñez, Pablo",
        "Perez Sartori, Ramiro",
        "Amaral Trigo, Milo",
        "Contepomi, Vicente",
        "Villamil, Simón",
        "Czar, Cristóbal",
        "Marina, Alfonso",
        "Bullrich, José",
        "Palma Cane, Lucas",
        "Dormal, Santiago",
        "Tiscornia, Félix",
        "Trigo de la Balze, Honorio",
        "Leyba, Fermín Gabriel",
      ]),
      suplente(16, "García Igarza, Joaquín"),
    ],
  },
  {
    categoriaId: "m15-c",
    rival: "Regatas C",
    cancha: "Newman",
    hora: "11:00",
    jugadores: titulares([
      "Waisman, Matias",
      "Kaufmann, Juan",
      "Marino, Facundo",
      "Oris de Roa, Teófilo",
      "Chiappe Beccar Varela, Pedro",
      "Santamarina Bergadá, Jerónimo",
      "Diaz Mathe, Cruz",
      "Estrada, José María",
      "Vinent Fernandez Speroni, Benjamín",
      "Barisic, Milo",
      "Alegre, Baldomero",
      "Zimmermann, Francisco",
      "Berasategui, Fernando",
      "Chevallier Boutell, Gonzalo",
      "Mendizabal, Felipe",
    ]),
  },
  {
    categoriaId: "m15-d",
    rival: "Regatas D",
    cancha: "Newman",
    hora: "09:30",
    jugadores: [
      ...titulares([
        "Richards, Patricio Juan",
        "Grether, Emilio",
        "Matta y Trejo, Alfonso",
        "Oneto Gaona, Alejandro Blas",
        "Escalante, Ignacio",
        "Iglesias Arrieta, Beltrán",
        "Morando, Aldo",
        "Polizza, Vicente",
        "Palette Pueyrredon, Bautista",
        "Beláustegui, Isidro",
        "Bonadeo, Santos",
        "Poggi, Joaquín",
        "Anzorreguy, Rufino",
        "Ibarzabal, Tomás",
        "Vallaco, Juan Cruz",
      ]),
      suplente(16, "Nazar, Florencio"),
      suplente(17, "Schair, Tomas"),
      suplente(18, "Quigley, Mathew"),
      suplente(19, "Summers, Owen"),
      suplente(20, "Stoddart, Marcos"),
      suplente(21, "Aguilar Quesada, Félix"),
    ],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");

  const batch = adminDb.batch();

  for (const equipo of EQUIPOS) {
    const pid = partidoId(equipo.categoriaId, 1);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const partido: Partido = {
      categoriaId: equipo.categoriaId,
      numeroFecha: 1,
      fecha: FECHA_ISO,
      hora: equipo.hora,
      rival: equipo.rival,
      esLocal: true,
      cancha: equipo.cancha,
      estado: "programado",
      resultado: { newman: 0, rival: 0 },
      enCanchaIds: equipo.jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre)),
    };
    batch.set(partidoRef, { ...partido, createdAt: new Date(), updatedAt: new Date() });

    for (const j of equipo.jugadores) {
      const jugador: JugadorPartido = {
        nombre: j.nombre,
        dorsal: j.dorsal,
        titular: j.titular,
        enCancha: j.titular,
      };
      batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), jugador);
    }

    console.log(`${equipo.categoriaId}: vs ${equipo.rival}, ${equipo.hora} hs en ${equipo.cancha} (${equipo.jugadores.length} jugadores)`);
  }

  await batch.commit();
  console.log("Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
