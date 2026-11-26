import { api } from "../lib/api";

export const obtenerTareas = (materia_id = null) => {
  const endpoint = materia_id
    ? `/tareas?materia_id=${encodeURIComponent(materia_id)}`
    : "/tareas";

  return api(endpoint);
};

export const crearTarea = (datos) =>
  api("/tareas", {
    method: "POST",
    body: JSON.stringify(datos),
  });

export const actualizarTarea = (id, datos) =>
  api(`/tareas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(datos),
  });

export const completarTarea = (id) =>
  api(`/tareas/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      estado_realizacion: "completada",
    }),
  });
export const eliminarTarea = (id) =>
  api(`/tareas/${id}`, {
    method: "DELETE",
  });
