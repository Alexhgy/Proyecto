import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const { iniciarSesion, sincronizarPerfil, solicitarRecuperacion, user } =
    useAuth();

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [modoRecuperacion, setModoRecuperacion] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");
    setLoading(true);

    try {
      if (modoRecuperacion) {
        const { error } = await solicitarRecuperacion(email.trim());

        if (error) {
          throw error;
        }

        setMensaje(
          "Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña.",
        );

        return;
      }

      const { data, error } = await iniciarSesion(email.trim(), password);

      if (error) {
        throw new Error("Correo o contraseña incorrectos.");
      }

      const nombre = data.user.user_metadata?.nombre;

      if (!nombre) {
        throw new Error(
          "No se encontró el nombre del usuario. Contacta al administrador.",
        );
      }

      await sincronizarPerfil(nombre);

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError(
        modoRecuperacion
          ? "No fue posible solicitar la recuperación. Inténtalo nuevamente."
          : error.message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">A</div>
          <span>AgendaU</span>
        </div>

        <div className="auth-heading">
          <span className="auth-eyebrow">
            {modoRecuperacion ? "RECUPERACIÓN DE CUENTA" : "BIENVENIDO"}
          </span>

          <h1>{modoRecuperacion ? "Recupera tu acceso" : "Inicia sesión"}</h1>

          <p>
            {modoRecuperacion
              ? "Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña."
              : "Organiza tus periodos, materias y tareas desde un solo lugar."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">Correo electrónico</label>

            <input
              id="email"
              type="email"
              placeholder="nombre@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {!modoRecuperacion && (
            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="password">Contraseña</label>

                <button
                  type="button"
                  className="auth-text-button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                >
                  {mostrarPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>

              <input
                id="password"
                type={mostrarPassword ? "text" : "password"}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="auth-forgot"
                onClick={() => {
                  setModoRecuperacion(true);
                  setError("");
                  setMensaje("");
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          {error && (
            <div className="auth-alert auth-alert-error" role="alert">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="auth-alert auth-alert-success" role="status">
              {mensaje}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? "Espera un momento..."
              : modoRecuperacion
                ? "Enviar enlace de recuperación"
                : "Iniciar sesión"}
          </button>

          {modoRecuperacion && (
            <button
              type="button"
              className="auth-back"
              onClick={() => {
                setModoRecuperacion(false);
                setError("");
                setMensaje("");
              }}
            >
              Volver a iniciar sesión
            </button>
          )}
        </form>

        {!modoRecuperacion && (
          <p className="auth-footer">
            ¿No tienes una cuenta? <Link to="/registro">Regístrate</Link>
          </p>
        )}
      </section>
    </main>
  );
}

export default Login;
