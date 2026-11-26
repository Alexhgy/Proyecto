import { api } from "../lib/api";

// Obtener todos los recordatorios o filtrarlos por tarea
export const obtenerRecordatorios = (tarea_id = null) => {
  const endpoint = tarea_id
    ? `/recordatorios?tarea_id=${encodeURIComponent(tarea_id)}`
    : "/recordatorios";

  return api(endpoint);
};

// Crear un recordatorio
export const crearRecordatorio = (datos) => {
  return api("/recordatorios", {
    method: "POST",
    body: JSON.stringify(datos),
  });
};

// Eliminar un recordatorio
export const eliminarRecordatorio = (id) => {
  return api(`/recordatorios/${id}`, {
    method: "DELETE",
  });
};
