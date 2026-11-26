import { api } from "../lib/api";

export const obtenerPerfil = () => api("/perfil_usuario");

export const sincronizarPerfil = (nombre) =>
  api("/perfil_usuario", {
    method: "POST",
    body: JSON.stringify({ nombre }),
  });

// Consultar preferencia de recordatorios
export const obtenerPreferenciasRecordatorios = () =>
  api("/perfil_usuario/preferencias");

// Actualizar preferencia de recordatorios
export const actualizarPreferenciaRecordatorios = (recibir_recordatorios) =>
  api("/perfil_usuario/preferencias", {
    method: "PATCH",
    body: JSON.stringify({ recibir_recordatorios }),
  });
