export interface RosterJugador {
  jugadorId: string;
  nombre: string;
  dorsal: string;
  titular: boolean;
}

// Plantel completo del club (mismo grupo/edad que el partido), para buscar y meter en un cambio
// a alguien que no estaba en la formacion inicial subida (ver CargaCambio.tsx).
export interface JugadorBusqueda {
  jugadorId: string;
  nombre: string;
}
