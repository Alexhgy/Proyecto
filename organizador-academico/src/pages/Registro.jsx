import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Registro() {
  const { registrarse, sincronizarPerfil, user } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

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

    const nombreLimpio = nombre.trim();
    const emailLimpio = email.trim();

    if (!nombreLimpio) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await registrarse(
        emailLimpio,
        password,
        nombreLimpio,
      );

      if (error) {
        throw error;
      }

      // Supabase devuelve identidades vacías cuando oculta
      // que el correo ya pertenece a una cuenta confirmada.
      if (
        data.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        throw new Error(
          "No fue posible completar el registro con ese correo. Si ya tienes una cuenta, inicia sesión o recupera tu contraseña.",
        );
      }

      if (data.session) {
        await sincronizarPerfil(nombreLimpio);
        navigate("/dashboard", { replace: true });
      } else {
        setMensaje(
          "Tu registro se realizó correctamente. Revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.",
        );

        setPassword("");
        setConfirmarPassword("");
      }
    } catch (error) {
      console.error("Error durante el registro:", error);

      setError(
        error.message ||
          "No fue posible crear tu cuenta. Inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-register">
        <div className="auth-brand">
          <div className="auth-logo">A</div>
          <span>AgendaU</span>
        </div>

        <div className="auth-heading">
          <span className="auth-eyebrow">COMIENZA A ORGANIZARTE</span>

          <h1>Crear cuenta</h1>

          <p>
            Regístrate para organizar tus periodos escolares, materias y
            actividades académicas.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="nombre">Nombre</label>

            <input
              id="nombre"
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
              maxLength={100}
              required
            />
          </div>

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
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="confirmarPassword">Confirmar contraseña</label>

              <button
                type="button"
                className="auth-text-button"
                onClick={() => setMostrarConfirmacion(!mostrarConfirmacion)}
              >
                {mostrarConfirmacion ? "Ocultar" : "Mostrar"}
              </button>
            </div>

            <input
              id="confirmarPassword"
              type={mostrarConfirmacion ? "text" : "password"}
              placeholder="Repite tu contraseña"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

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
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </section>
    </main>
  );
}

export default Registro;
