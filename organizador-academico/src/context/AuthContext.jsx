import { createContext, useContext, useEffect, useState } from "react";
import {
  sincronizarPerfil as sincronizarPerfilService,
  obtenerPerfil as obtenerPerfilService,
} from "../services/perfil.service";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [perfil, setPerfil] = useState(null);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let inicializacionTerminada = false;

    // Escuchar cambios posteriores en la sesión.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nuevaSesion) => {
      // La recuperación inicial se maneja por separado.
      if (!inicializacionTerminada) return;

      setSession(nuevaSesion);
      setUser(nuevaSesion?.user ?? null);
    });

    // Recuperar la sesión existente y sincronizar el perfil.
    const recuperarSesion = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        const sesionActual = data.session;

        if (sesionActual) {
          const nombre = sesionActual.user.user_metadata?.nombre;

          if (!nombre) {
            throw new Error(
              "No se encontró el nombre del usuario para sincronizar su perfil.",
            );
          }

          await sincronizarPerfilService(nombre);
        }

        if (mounted) {
          setSession(sesionActual);
          setUser(sesionActual?.user ?? null);
        }
      } catch (error) {
        console.error("Error al recuperar o sincronizar la sesión:", error);
      } finally {
        inicializacionTerminada = true;

        if (mounted) {
          setLoading(false);
        }
      }
    };

    recuperarSesion();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const cargarPerfil = async () => {
      if (!user) {
        setPerfil(null);
        return;
      }

      try {
        const datosPerfil = await obtenerPerfilService();

        if (mounted) {
          setPerfil(datosPerfil);
        }
      } catch (error) {
        console.error("Error al obtener el perfil:", error);

        if (mounted) {
          setPerfil(null);
        }
      }
    };

    cargarPerfil();

    return () => {
      mounted = false;
    };
  }, [user]);

  const iniciarSesion = async (email, password) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  };

  const solicitarRecuperacion = async (email) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar-contrasena`,
    });
  };

  const registrarse = async (email, password, nombre) =>
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
        },
      },
    });

  const cerrarSesion = async () => {
    return await supabase.auth.signOut();
  };

  const sincronizarPerfil = async (nombre) => {
    return await sincronizarPerfilService(nombre);
  };

  const actualizarNombre = async (nuevoNombre) => {
    const nombreLimpio = nuevoNombre.trim();

    if (!nombreLimpio) {
      throw new Error("El nombre es obligatorio.");
    }

    // 1. Actualizar los metadatos de Supabase Auth.
    const { data, error } = await supabase.auth.updateUser({
      data: {
        nombre: nombreLimpio,
      },
    });

    if (error) {
      throw error;
    }

    // Actualizar el usuario local con la respuesta de Supabase.
    setUser(data.user);

    // 2. Sincronizar el nombre con MySQL.
    const perfilActualizado = await sincronizarPerfilService(nombreLimpio);

    // 3. Actualizar el perfil en el contexto.
    setPerfil(perfilActualizado);

    return perfilActualizado;
  };

  const actualizarContrasena = async (nuevaContrasena) => {
    const { data, error } = await supabase.auth.updateUser({
      password: nuevaContrasena,
    });

    if (error) {
      throw error;
    }

    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        perfil,
        session,
        user,
        loading,
        iniciarSesion,
        solicitarRecuperacion,
        registrarse,
        cerrarSesion,
        sincronizarPerfil,
        actualizarNombre,
        actualizarContrasena,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  }

  return context;
};
