import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL;

export const api = async (endpoint, options = {}) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = {
    ...options.headers,
    Authorization: session?.access_token
      ? `Bearer ${session.access_token}`
      : "",
  };

  const esFormData = options.body instanceof FormData;

  if (!esFormData && options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Leemos la respuesta como texto para evitar errores
  // cuando el servidor no devuelve JSON.
  const texto = await response.text();

  let resultado = null;

  if (texto) {
    try {
      resultado = JSON.parse(texto);
    } catch {
      if (!response.ok) {
        throw new Error(
          `Error del servidor (${response.status}): ${texto.slice(0, 300)}`,
        );
      }

      throw new Error("El servidor respondió con un formato distinto a JSON.");
    }
  }

  if (!response.ok) {
    throw new Error(
      resultado?.error || `Error en la solicitud (${response.status})`,
    );
  }

  return resultado;
};
