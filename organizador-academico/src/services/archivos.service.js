import { api } from "../lib/api";

// Obtener todos los archivos o los de una tarea específica.
export const obtenerArchivos = (tarea_id = null) => {
  const endpoint = tarea_id
    ? `/archivos?tarea_id=${encodeURIComponent(tarea_id)}`
    : "/archivos";

  return api(endpoint);
};

// Subir un archivo asociado a una tarea.
export const subirArchivo = (tarea_id, archivo) => {
  const formData = new FormData();

  formData.append("tarea_id", tarea_id);
  formData.append("archivo", archivo);

  return api("/archivos", {
    method: "POST",
    body: formData,
  });
};

// Solicitar una URL firmada para descargar el archivo.
export const descargarArchivo = (id) => api(`/archivos/${id}/descargar`);

// Eliminar un archivo.
export const eliminarArchivo = (id) =>
  api(`/archivos/${id}`, {
    method: "DELETE",
  });
