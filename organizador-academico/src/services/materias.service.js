import { api } from "../lib/api";

// Obtener todas las materias o filtrarlas por periodo
export const obtenerMaterias = (periodo_id = null) => {
  const endpoint = periodo_id
    ? `/materias?periodo_id=${encodeURIComponent(periodo_id)}`
    : "/materias";

  return api(endpoint);
};

// Crear una materia
export const crearMateria = (datos) => {
  return api("/materias", {
    method: "POST",
    body: JSON.stringify(datos),
  });
};

// Actualizar una materia existente
export const actualizarMateria = (id, datos) => {
  return api(`/materias/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
};

// Eliminar una materia
export const eliminarMateria = (id) => {
  return api(`/materias/${id}`, {
    method: "DELETE",
  });
};
