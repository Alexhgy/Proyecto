import { api } from "../lib/api";

// Obtener todas las notificaciones o filtrarlas por estado de lectura
export const obtenerNotificaciones = (leida = null) => {
  const endpoint =
    leida === null
      ? "/notificaciones"
      : `/notificaciones?leida=${Number(leida)}`;

  return api(endpoint);
};

// Crear una notificación
export const crearNotificacion = (datos) => {
  return api("/notificaciones", {
    method: "POST",
    body: JSON.stringify(datos),
  });
};

// Marcar una notificación como leída
export const marcarNotificacionLeida = (id) => {
  return api(`/notificaciones/${id}/leida`, {
    method: "PATCH",
  });
};

// Eliminar una notificación
export const eliminarNotificacion = (id) => {
  return api(`/notificaciones/${id}`, {
    method: "DELETE",
  });
};
