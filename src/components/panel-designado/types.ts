export interface RosterJugador {
  jugadorId: string;
  nombre: string;
  dorsal: string;
  titular: boolean;
  // true si le sacaron roja (directa o por doble amarilla) -- no vuelve mas a jugar, se lo excluye
  // del banco de CargaCambio/SancionesActivas aunque no este en cancha.
  expulsadoDefinitivo?: boolean;
}

// Plantel completo del club (mismo grupo/edad que el partido), para buscar y meter en un cambio
// a alguien que no estaba en la formacion inicial subida (ver CargaCambio.tsx).
export interface JugadorBusqueda {
  jugadorId: string;
  nombre: string;
}
