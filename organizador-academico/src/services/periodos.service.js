import { api } from "../lib/api";

// Obtener todos los periodos del usuario autenticado
export const obtenerPeriodos = () => {
  return api("/periodos");
};

// Crear un nuevo periodo escolar
export const crearPeriodo = (datos) => {
  return api("/periodos", {
    method: "POST",
    body: JSON.stringify(datos),
  });
};

// Actualizar un periodo escolar existente
export const actualizarPeriodo = (id, datos) => {
  return api(`/periodos/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
};

// Eliminar un periodo escolar
export const eliminarPeriodo = (id) => {
  return api(`/periodos/${id}`, {
    method: "DELETE",
  });
};
