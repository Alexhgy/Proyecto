import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AppLayout from "../components/AppLayout";

import {
  obtenerNotificaciones,
  marcarNotificacionLeida,
  eliminarNotificacion,
} from "../services/notificaciones.service";

function Notificaciones() {
  const navigate = useNavigate();

  const [notificaciones, setNotificaciones] = useState([]);
  const [filtro, setFiltro] = useState("todas");

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [accionEnCurso, setAccionEnCurso] = useState(null);

  const cargarNotificaciones = async () => {
    try {
      setCargando(true);
      setError("");

      let filtroLeida = null;

      if (filtro === "leidas") {
        filtroLeida = true;
      } else if (filtro === "pendientes") {
        filtroLeida = false;
      }

      const resultado = await obtenerNotificaciones(filtroLeida);
      setNotificaciones(resultado);
    } catch (error) {
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarNotificaciones();
  }, [filtro]);

  const manejarMarcarLeida = async (id) => {
    try {
      setAccionEnCurso(id);
      setError("");
      setMensaje("");

      await marcarNotificacionLeida(id);

      setMensaje("Notificación marcada como leída.");
      await cargarNotificaciones();
    } catch (error) {
      setError(error.message);
    } finally {
      setAccionEnCurso(null);
    }
  };

  const manejarEliminar = async (id) => {
    const confirmar = window.confirm(
      "¿Estás seguro de que deseas eliminar esta notificación?",
    );

    if (!confirmar) return;

    try {
      setAccionEnCurso(id);
      setError("");
      setMensaje("");

      await eliminarNotificacion(id);

      setMensaje("Notificación eliminada correctamente.");
      await cargarNotificaciones();
    } catch (error) {
      setError(error.message);
    } finally {
      setAccionEnCurso(null);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "Fecha no disponible";

    const fechaLocal = new Date(String(fecha).replace(" ", "T"));

    if (Number.isNaN(fechaLocal.getTime())) {
      return "Fecha no disponible";
    }

    return fechaLocal.toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const estaLeida = (notificacion) => Boolean(Number(notificacion.leida));

  const cambiarFiltro = (nuevoFiltro) => {
    setFiltro(nuevoFiltro);
    setMensaje("");
    setError("");
  };

  const filtros = [
    { valor: "todas", texto: "Todas" },
    { valor: "pendientes", texto: "Sin leer" },
    { valor: "leidas", texto: "Leídas" },
  ];

  return (
    <AppLayout>
      <main className="notifications-page">
        <header className="notifications-header">
          <div>
            <p className="notifications-eyebrow">CENTRO DE ACTIVIDAD</p>
            <h1>Notificaciones</h1>
            <p className="notifications-subtitle">
              Consulta tus avisos y mantente al tanto de tus actividades.
            </p>
          </div>

          <div className="notifications-header-icon">♧</div>
        </header>

        <section className="notifications-filter-section">
          <div className="notifications-filter-heading">
            <div>
              <h2>Tu actividad</h2>
              <p>Administra tus avisos y recordatorios.</p>
            </div>
          </div>

          <nav
            className="notifications-filters"
            aria-label="Filtrar notificaciones"
          >
            {filtros.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                className={
                  filtro === opcion.valor
                    ? "notification-filter active"
                    : "notification-filter"
                }
                onClick={() => cambiarFiltro(opcion.valor)}
                aria-pressed={filtro === opcion.valor}
              >
                {opcion.texto}
              </button>
            ))}
          </nav>
        </section>

        {mensaje && (
          <p className="notifications-success" role="status">
            <span>✓</span> {mensaje}
          </p>
        )}

        {error && (
          <p className="notifications-error" role="alert">
            {error}
          </p>
        )}

        <section className="notifications-list-section">
          {cargando ? (
            <div className="notifications-state">
              <div className="notifications-loader" />
              <p>Cargando notificaciones...</p>
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="notifications-empty">
              <div className="notifications-empty-icon">♧</div>

              <h3>
                {filtro === "pendientes"
                  ? "Todo está al día"
                  : filtro === "leidas"
                    ? "Todavía no hay notificaciones leídas"
                    : "No tienes notificaciones"}
              </h3>

              <p>
                {filtro === "pendientes"
                  ? "No tienes avisos pendientes de revisar."
                  : filtro === "leidas"
                    ? "Cuando marques una notificación como leída, aparecerá aquí."
                    : "Cuando tengas nuevos avisos o recordatorios, los encontrarás aquí."}
              </p>

              {filtro !== "todas" && (
                <button
                  type="button"
                  className="notifications-empty-button"
                  onClick={() => cambiarFiltro("todas")}
                >
                  Ver todas
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="notifications-results-heading">
                <h2>
                  {filtro === "pendientes"
                    ? "Sin leer"
                    : filtro === "leidas"
                      ? "Leídas"
                      : "Notificaciones recientes"}
                </h2>

                <span>
                  {notificaciones.length}{" "}
                  {notificaciones.length === 1
                    ? "notificación"
                    : "notificaciones"}
                </span>
              </div>

              <div className="notifications-list">
                {notificaciones.map((notificacion) => {
                  const leida = estaLeida(notificacion);
                  const procesando = accionEnCurso === notificacion.id;

                  const esRecordatorio = notificacion.tipo === "recordatorio";

                  return (
                    <article
                      key={notificacion.id}
                      className={`notification-card ${
                        leida ? "is-read" : "is-unread"
                      }`}
                    >
                      <div className="notification-card-icon">
                        {esRecordatorio ? "◷" : "♧"}
                      </div>

                      <div className="notification-content">
                        <div className="notification-card-top">
                          <div className="notification-labels">
                            <span
                              className={`notification-type ${
                                esRecordatorio ? "reminder" : "notice"
                              }`}
                            >
                              {esRecordatorio ? "Recordatorio" : "Aviso"}
                            </span>

                            {!leida && (
                              <span className="notification-unread-dot" />
                            )}
                          </div>

                          <span className="notification-date">
                            {formatearFecha(notificacion.creada_en)}
                          </span>
                        </div>

                        <h3>{notificacion.titulo}</h3>

                        <p className="notification-message">
                          {notificacion.mensaje}
                        </p>

                        {notificacion.tarea_id && (
                          <div className="notification-related-task">
                            <div>
                              <span>Tarea relacionada</span>
                              <strong>
                                {notificacion.tarea_nombre ||
                                  "Tarea no disponible"}
                              </strong>
                            </div>

                            {notificacion.materia_id && (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/materias/${notificacion.materia_id}/tareas`,
                                  )
                                }
                              >
                                Ver tarea →
                              </button>
                            )}
                          </div>
                        )}

                        <div className="notification-actions">
                          {!leida && (
                            <button
                              type="button"
                              className="notification-read-button"
                              disabled={procesando}
                              onClick={() =>
                                manejarMarcarLeida(notificacion.id)
                              }
                            >
                              {procesando
                                ? "Procesando..."
                                : "✓ Marcar como leída"}
                            </button>
                          )}

                          <button
                            type="button"
                            className="notification-delete-button"
                            disabled={procesando}
                            onClick={() => manejarEliminar(notificacion.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>
    </AppLayout>
  );
}

export default Notificaciones;
