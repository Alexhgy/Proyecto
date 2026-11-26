import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import AppLayout from "../components/AppLayout";
import {
  obtenerPreferenciasRecordatorios,
  actualizarPreferenciaRecordatorios,
} from "../services/perfil.service";

function Perfil() {
  const { user, perfil, cerrarSesion, actualizarNombre, actualizarContrasena } =
    useAuth();
  const navigate = useNavigate();

  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [mostrarFormularioContrasena, setMostrarFormularioContrasena] =
    useState(false);

  const [contrasenaActual, setContrasenaActual] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");

  const [guardandoContrasena, setGuardandoContrasena] = useState(false);
  const [errorContrasena, setErrorContrasena] = useState("");
  const [mensajeContrasena, setMensajeContrasena] = useState("");

  const [mostrarContrasenaActual, setMostrarContrasenaActual] = useState(false);
  const [mostrarNuevaContrasena, setMostrarNuevaContrasena] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [recibirRecordatorios, setRecibirRecordatorios] = useState(true);
  const [cargandoPreferencias, setCargandoPreferencias] = useState(true);
  const [guardandoPreferencias, setGuardandoPreferencias] = useState(false);
  const [errorPreferencias, setErrorPreferencias] = useState("");
  const [mensajePreferencias, setMensajePreferencias] = useState("");

  const nombreUsuario = perfil?.nombre || "Estudiante";
  const inicial = nombreUsuario.charAt(0).toUpperCase();

  const iniciarEdicion = () => {
    setNuevoNombre(nombreUsuario);
    setError("");
    setMensaje("");
    setEditandoNombre(true);
  };

  const cancelarEdicion = () => {
    setEditandoNombre(false);
    setNuevoNombre("");
    setError("");
  };

  const handleActualizarNombre = async (e) => {
    e.preventDefault();

    const nombreLimpio = nuevoNombre.trim();

    if (!nombreLimpio) {
      setError("El nombre no puede estar vacío.");
      return;
    }

    if (nombreLimpio.length > 100) {
      setError("El nombre no puede superar los 100 caracteres.");
      return;
    }

    if (nombreLimpio === nombreUsuario) {
      setEditandoNombre(false);
      return;
    }

    setGuardandoNombre(true);
    setError("");
    setMensaje("");

    try {
      await actualizarNombre(nombreLimpio);

      setEditandoNombre(false);
      setMensaje("Tu nombre se actualizó correctamente.");
    } catch (err) {
      console.error("Error al actualizar el nombre:", err);
      setError(
        err.message ||
          "No fue posible actualizar tu nombre. Inténtalo nuevamente.",
      );
    } finally {
      setGuardandoNombre(false);
    }
  };

  const handleLogout = async () => {
    setCerrandoSesion(true);
    setError("");

    try {
      const { error } = await cerrarSesion();

      if (error) {
        throw error;
      }

      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      setError("No fue posible cerrar la sesión. Inténtalo nuevamente.");
      setCerrandoSesion(false);
    }
  };

  const cancelarCambioContrasena = () => {
    setMostrarFormularioContrasena(false);
    setContrasenaActual("");
    setNuevaContrasena("");
    setConfirmarContrasena("");
    setErrorContrasena("");
  };

  const handleActualizarContrasena = async (e) => {
    e.preventDefault();

    setErrorContrasena("");
    setMensajeContrasena("");

    if (!contrasenaActual || !nuevaContrasena || !confirmarContrasena) {
      setErrorContrasena("Completa todos los campos.");
      return;
    }

    if (nuevaContrasena.length < 8) {
      setErrorContrasena(
        "La nueva contraseña debe tener al menos 8 caracteres.",
      );
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setErrorContrasena("Las contraseñas nuevas no coinciden.");
      return;
    }

    if (contrasenaActual === nuevaContrasena) {
      setErrorContrasena("La nueva contraseña debe ser diferente a la actual.");
      return;
    }

    setGuardandoContrasena(true);

    try {
      // Verificar la contraseña actual mediante una nueva autenticación.
      const { error: errorVerificacion } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password: contrasenaActual,
        });

      if (errorVerificacion) {
        throw new Error("La contraseña actual es incorrecta.");
      }

      // Actualizar la contraseña en Supabase Auth.
      await actualizarContrasena(nuevaContrasena);

      setMensajeContrasena("Tu contraseña se actualizó correctamente.");
      cancelarCambioContrasena();
    } catch (err) {
      console.error("Error al cambiar la contraseña:", err);

      setErrorContrasena(
        err.message || "No fue posible actualizar la contraseña.",
      );
    } finally {
      setGuardandoContrasena(false);
    }
  };

  // Consultar la preferencia guardada al cargar el perfil.
  useEffect(() => {
    const cargarPreferencias = async () => {
      try {
        const resultado = await obtenerPreferenciasRecordatorios();

        setRecibirRecordatorios(resultado.recibir_recordatorios);
      } catch (error) {
        console.error("Error al cargar preferencias:", error);
        setErrorPreferencias("No fue posible cargar tus preferencias.");
      } finally {
        setCargandoPreferencias(false);
      }
    };

    cargarPreferencias();
  }, []);

  // Actualizar la preferencia en el servidor.
  const handleCambiarRecordatorios = async (e) => {
    const nuevoValor = e.target.checked;

    setGuardandoPreferencias(true);
    setErrorPreferencias("");
    setMensajePreferencias("");

    try {
      const resultado = await actualizarPreferenciaRecordatorios(nuevoValor);

      setRecibirRecordatorios(resultado.recibir_recordatorios);
      setMensajePreferencias(
        nuevoValor
          ? "Los recordatorios por correo están activados."
          : "Los recordatorios por correo están desactivados.",
      );
    } catch (error) {
      console.error("Error al actualizar preferencias:", error);

      setErrorPreferencias(
        "No fue posible guardar el cambio. Inténtalo nuevamente.",
      );
    } finally {
      setGuardandoPreferencias(false);
    }
  };

  return (
    <AppLayout>
      <main className="profile-page">
        <header className="profile-header">
          <div>
            <p className="profile-eyebrow">CUENTA</p>
            <h1>Mi perfil</h1>
            <p className="profile-subtitle">
              Consulta y administra la información de tu cuenta.
            </p>
          </div>
        </header>

        <section className="profile-card">
          <div className="profile-avatar">{inicial}</div>

          <div className="profile-user-info">
            <h2>{nombreUsuario}</h2>
            <p>{user?.email}</p>
          </div>
        </section>

        {mensaje && <p className="profile-success">{mensaje}</p>}

        <section className="profile-section">
          <h2>Información de la cuenta</h2>

          <div className="profile-info-card">
            <div className="profile-info-row">
              <div className="profile-info-icon">♙</div>

              <div className="profile-info-content">
                <span>Nombre</span>

                {!editandoNombre ? (
                  <div className="profile-edit-row">
                    <p>{nombreUsuario}</p>

                    <button
                      type="button"
                      className="profile-edit-button"
                      onClick={iniciarEdicion}
                    >
                      Editar nombre
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleActualizarNombre}>
                    <input
                      type="text"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      maxLength={100}
                      placeholder="Escribe tu nombre"
                      disabled={guardandoNombre}
                    />

                    <div className="profile-form-actions">
                      <button type="submit" disabled={guardandoNombre}>
                        {guardandoNombre ? "Guardando..." : "Guardar"}
                      </button>

                      <button
                        type="button"
                        onClick={cancelarEdicion}
                        disabled={guardandoNombre}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div className="profile-info-divider" />

            <div className="profile-info-row">
              <div className="profile-info-icon">@</div>

              <div>
                <span>Correo electrónico</span>
                <p>{user?.email || "No disponible"}</p>
              </div>
            </div>
          </div>

          {error && <p className="profile-error">{error}</p>}
        </section>

        <section className="profile-section">
          <h2>Seguridad</h2>

          <div className="profile-info-card">
            <div className="profile-info-row">
              <div className="profile-info-icon">🔒</div>

              <div className="profile-info-content">
                <span>Contraseña</span>
                <p>Administra la contraseña de tu cuenta.</p>

                {!mostrarFormularioContrasena ? (
                  <button
                    type="button"
                    className="profile-edit-button"
                    onClick={() => {
                      setMostrarFormularioContrasena(true);
                      setMensajeContrasena("");
                      setErrorContrasena("");
                    }}
                  >
                    Cambiar contraseña
                  </button>
                ) : (
                  <form onSubmit={handleActualizarContrasena}>
                    <div className="password-input-group">
                      <input
                        type={mostrarContrasenaActual ? "text" : "password"}
                        placeholder="Contraseña actual"
                        value={contrasenaActual}
                        onChange={(e) => setContrasenaActual(e.target.value)}
                        autoComplete="current-password"
                        disabled={guardandoContrasena}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setMostrarContrasenaActual(!mostrarContrasenaActual)
                        }
                        aria-label={
                          mostrarContrasenaActual
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                      >
                        {mostrarContrasenaActual ? "Ocultar" : "Ver"}
                      </button>
                    </div>

                    <div className="password-input-group">
                      <input
                        type={mostrarNuevaContrasena ? "text" : "password"}
                        placeholder="Nueva contraseña"
                        value={nuevaContrasena}
                        onChange={(e) => setNuevaContrasena(e.target.value)}
                        autoComplete="new-password"
                        disabled={guardandoContrasena}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setMostrarNuevaContrasena(!mostrarNuevaContrasena)
                        }
                        aria-label={
                          mostrarNuevaContrasena
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                      >
                        {mostrarNuevaContrasena ? "Ocultar" : "Ver"}
                      </button>
                    </div>

                    <div className="password-input-group">
                      <input
                        type={mostrarConfirmacion ? "text" : "password"}
                        placeholder="Confirmar nueva contraseña"
                        value={confirmarContrasena}
                        onChange={(e) => setConfirmarContrasena(e.target.value)}
                        autoComplete="new-password"
                        disabled={guardandoContrasena}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setMostrarConfirmacion(!mostrarConfirmacion)
                        }
                        aria-label={
                          mostrarConfirmacion
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                      >
                        {mostrarConfirmacion ? "Ocultar" : "Ver"}
                      </button>
                    </div>

                    <div className="profile-form-actions">
                      <button type="submit" disabled={guardandoContrasena}>
                        {guardandoContrasena
                          ? "Guardando..."
                          : "Guardar contraseña"}
                      </button>

                      <button
                        type="button"
                        onClick={cancelarCambioContrasena}
                        disabled={guardandoContrasena}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                {errorContrasena && (
                  <p className="profile-error">{errorContrasena}</p>
                )}

                {mensajeContrasena && (
                  <p className="profile-success">{mensajeContrasena}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="profile-section">
          <h2>Preferencias</h2>

          <div className="profile-info-card">
            <div className="profile-info-row">
              <div className="profile-info-icon">✉</div>

              <div className="profile-info-content">
                <span>Recordatorios por correo</span>

                <p>
                  Recibe un correo electrónico cuando una tarea pendiente
                  alcance su fecha programada de recordatorio.
                </p>

                <div className="reminder-toggle-row">
                  <span className="reminder-toggle-label">
                    {cargandoPreferencias
                      ? "Cargando preferencia..."
                      : recibirRecordatorios
                        ? "Activados"
                        : "Desactivados"}
                  </span>

                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={recibirRecordatorios}
                      onChange={handleCambiarRecordatorios}
                      disabled={cargandoPreferencias || guardandoPreferencias}
                    />

                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {guardandoPreferencias && <p>Guardando preferencia...</p>}

                {errorPreferencias && (
                  <p className="profile-error">{errorPreferencias}</p>
                )}

                {mensajePreferencias && (
                  <p className="profile-success">{mensajePreferencias}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="profile-section">
          <h2>Sesión</h2>

          <div className="profile-logout-card">
            <div>
              <h3>Cerrar sesión</h3>
              <p>Cierra tu sesión actual en este dispositivo.</p>
            </div>

            <button
              className="profile-logout-button"
              onClick={handleLogout}
              disabled={cerrandoSesion}
            >
              {cerrandoSesion ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default Perfil;
