import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";

import { obtenerTareas } from "../services/tareas.service";
import { obtenerMaterias } from "../services/materias.service";

const obtenerClaveFecha = (fecha) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
};

const convertirFecha = (fecha) => {
  const [anio, mes, dia] = String(fecha).slice(0, 10).split("-");
  return new Date(Number(anio), Number(mes) - 1, Number(dia));
};

const obtenerFechaHoraTarea = (tarea) => {
  const fecha = String(tarea.fecha_limite).slice(0, 10);
  const hora = tarea.hora_limite || "23:59:00";

  return new Date(`${fecha}T${hora}`);
};

const formatoFecha = (fecha) =>
  fecha.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatoHora = (hora) => (hora ? String(hora).slice(0, 5) : "23:59");

const nombrePrioridad = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  maxima: "Máxima",
};

function Dashboard() {
  const { user, perfil } = useAuth();
  const navigate = useNavigate();

  const [tareas, setTareas] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [mesVisible, setMesVisible] = useState(() => new Date());
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() =>
    obtenerClaveFecha(new Date()),
  );

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");

      const [tareasObtenidas, materiasObtenidas] = await Promise.all([
        obtenerTareas(),
        obtenerMaterias(),
      ]);

      setTareas(tareasObtenidas);
      setMaterias(materiasObtenidas);
    } catch (error) {
      console.error("Error al cargar el dashboard:", error);
      setError(error.message || "No se pudieron cargar los datos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const tareasConMateria = useMemo(() => {
    return tareas.map((tarea) => {
      const materia = materias.find(
        (materia) => String(materia.id) === String(tarea.materia_id),
      );

      return {
        ...tarea,
        materia_nombre: materia?.nombre || "Materia desconocida",
        materia_color: materia?.color || "#64748B",
      };
    });
  }, [tareas, materias]);

  const tareasPendientes = tareasConMateria.filter(
    (tarea) => tarea.estado_realizacion === "pendiente",
  );

  const tareasCompletadas = tareasConMateria.filter(
    (tarea) => tarea.estado_realizacion === "completada",
  );

  const proximasTareas = [...tareasPendientes].sort(
    (a, b) => obtenerFechaHoraTarea(a) - obtenerFechaHoraTarea(b),
  );

  const diasCalendario = useMemo(() => {
    const anio = mesVisible.getFullYear();
    const mes = mesVisible.getMonth();

    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);

    const desplazamiento = (primerDia.getDay() + 6) % 7;
    const inicio = new Date(anio, mes, 1 - desplazamiento);

    const totalDias = Math.ceil((desplazamiento + ultimoDia.getDate()) / 7) * 7;

    return Array.from({ length: totalDias }, (_, indice) => {
      const dia = new Date(inicio);
      dia.setDate(inicio.getDate() + indice);
      return dia;
    });
  }, [mesVisible]);

  const tareasPorFecha = useMemo(() => {
    const agrupadas = {};

    tareasPendientes.forEach((tarea) => {
      const clave = String(tarea.fecha_limite).slice(0, 10);

      if (!agrupadas[clave]) {
        agrupadas[clave] = [];
      }

      agrupadas[clave].push(tarea);
    });

    return agrupadas;
  }, [tareasPendientes]);

  const tareasDelDia = tareasConMateria
    .filter(
      (tarea) => String(tarea.fecha_limite).slice(0, 10) === fechaSeleccionada,
    )
    .sort((a, b) => obtenerFechaHoraTarea(a) - obtenerFechaHoraTarea(b));

  const fechaActual = new Date();
  const claveHoy = obtenerClaveFecha(fechaActual);

  const nombreMes = mesVisible.toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  const nombreUsuario = perfil?.nombre || "Estudiante";
  const inicialUsuario = nombreUsuario.charAt(0).toUpperCase();

  const cambiarMes = (cantidad) => {
    setMesVisible(
      (actual) =>
        new Date(actual.getFullYear(), actual.getMonth() + cantidad, 1),
    );
  };

  const irAHoy = () => {
    const hoy = new Date();
    setMesVisible(hoy);
    setFechaSeleccionada(obtenerClaveFecha(hoy));
  };

  const abrirTareasMateria = (materiaId) => {
    navigate(`/materias/${materiaId}/tareas`);
  };

  const handleLogout = async () => {
    const { error } = await cerrarSesion();

    if (error) {
      console.error("Error al cerrar sesión:", error);
      return;
    }

    navigate("/login", { replace: true });
  };

  if (cargando) {
    return (
      <div className="loading-screen">
        <span className="loading-spinner" />
        <p>Cargando tu espacio académico...</p>
      </div>
    );
  }

  if (error) {
    return (
      <main className="error-screen">
        <div className="error-card">
          <span className="error-icon">!</span>
          <h2>No pudimos cargar el Dashboard</h2>
          <p>{error}</p>
          <button className="button-primary" onClick={cargarDatos}>
            Intentar nuevamente
          </button>
        </div>
      </main>
    );
  }

  return (
    <AppLayout>
      <header className="topbar">
        <div>
          <span className="topbar-caption">TU ESPACIO ACADÉMICO</span>
          <h1>Inicio</h1>
        </div>

        <div className="topbar-user">
          <div className="topbar-user-text">
            <strong>{nombreUsuario}</strong>
            <span>{user?.email}</span>
          </div>
          <div className="avatar">{inicialUsuario}</div>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="welcome-section">
          <div>
            <span className="eyebrow">PANEL GENERAL</span>
            <h2>¡Hola, {nombreUsuario}!</h2>
            <p>Este es el resumen de tu actividad académica.</p>
          </div>

          <div className="welcome-date">
            <span>HOY</span>
            <strong>
              {fechaActual.toLocaleDateString("es-MX", {
                day: "numeric",
                month: "long",
              })}
            </strong>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-icon stat-icon-blue">☷</div>
            <div>
              <span className="stat-label">Tareas pendientes</span>
              <strong className="stat-number">{tareasPendientes.length}</strong>
              <span className="stat-description">Por completar</span>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon stat-icon-green">✓</div>
            <div>
              <span className="stat-label">Tareas completadas</span>
              <strong className="stat-number">
                {tareasCompletadas.length}
              </strong>
              <span className="stat-description">Actividades terminadas</span>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon stat-icon-purple">▦</div>
            <div>
              <span className="stat-label">Total de tareas</span>
              <strong className="stat-number">{tareasConMateria.length}</strong>
              <span className="stat-description">En todos tus periodos</span>
            </div>
          </article>
        </section>

        <div className="dashboard-grid">
          <section className="panel calendar-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">ORGANIZA TU TIEMPO</span>
                <h2>Calendario</h2>
              </div>

              <button className="button-subtle" onClick={irAHoy}>
                Hoy
              </button>
            </div>

            <div className="calendar-controls">
              <h3>{nombreMes}</h3>

              <div className="calendar-arrows">
                <button
                  aria-label="Mes anterior"
                  onClick={() => cambiarMes(-1)}
                >
                  ‹
                </button>
                <button
                  aria-label="Mes siguiente"
                  onClick={() => cambiarMes(1)}
                >
                  ›
                </button>
              </div>
            </div>

            <div className="calendar-grid">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((dia) => (
                <div className="calendar-weekday" key={dia}>
                  {dia}
                </div>
              ))}

              {diasCalendario.map((dia) => {
                const clave = obtenerClaveFecha(dia);
                const tareasDelCalendario = tareasPorFecha[clave] || [];

                const colores = [
                  ...new Set(
                    tareasDelCalendario.map((tarea) => tarea.materia_color),
                  ),
                ];

                const esMesActual = dia.getMonth() === mesVisible.getMonth();

                const esHoy = clave === claveHoy;
                const estaSeleccionado = clave === fechaSeleccionada;

                return (
                  <button
                    key={clave}
                    className={[
                      "calendar-day",
                      !esMesActual ? "outside-month" : "",
                      esHoy ? "today" : "",
                      estaSeleccionado ? "selected" : "",
                    ].join(" ")}
                    onClick={() => setFechaSeleccionada(clave)}
                  >
                    <span className="calendar-day-number">{dia.getDate()}</span>

                    <span className="calendar-dots">
                      {colores.slice(0, 4).map((color) => (
                        <span
                          key={color}
                          className="calendar-dot"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="calendar-legend">
              <span className="legend-dot" />
              Los puntos indican tareas pendientes
            </div>

            <div className="selected-day-section">
              <div className="selected-day-heading">
                <h3>{formatoFecha(convertirFecha(fechaSeleccionada))}</h3>
                <span>{tareasDelDia.length} tareas</span>
              </div>

              {tareasDelDia.length === 0 ? (
                <div className="empty-state compact">
                  <span className="empty-state-icon">☼</span>
                  <p>No tienes tareas para este día.</p>
                </div>
              ) : (
                <div className="day-task-list">
                  {tareasDelDia.map((tarea) => (
                    <article
                      className="day-task"
                      key={tarea.id}
                      style={{
                        "--subject-color": tarea.materia_color,
                      }}
                    >
                      <div className="day-task-main">
                        <strong>{tarea.nombre}</strong>
                        <span>{tarea.materia_nombre}</span>
                      </div>

                      <div className="day-task-meta">
                        <span>{formatoHora(tarea.hora_limite)}</span>
                        <span
                          className={`status-pill ${
                            tarea.estado_realizacion === "completada"
                              ? "status-completed"
                              : "status-pending"
                          }`}
                        >
                          {tarea.estado_realizacion === "completada"
                            ? "Completada"
                            : "Pendiente"}
                        </span>
                      </div>

                      <button
                        className="text-button"
                        onClick={() => abrirTareasMateria(tarea.materia_id)}
                      >
                        Ver materia
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="panel upcoming-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">NO PIERDAS DE VISTA</span>
                <h2>Próximas tareas</h2>
              </div>
              <span className="count-badge">{tareasPendientes.length}</span>
            </div>

            {proximasTareas.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">✓</span>
                <h3>¡Todo al día!</h3>
                <p>No tienes tareas pendientes.</p>
              </div>
            ) : (
              <div className="upcoming-list">
                {proximasTareas.slice(0, 5).map((tarea) => {
                  const fechaHora = obtenerFechaHoraTarea(tarea);
                  const vencida = fechaHora < new Date();

                  return (
                    <article
                      className="upcoming-task"
                      key={tarea.id}
                      style={{
                        "--subject-color": tarea.materia_color,
                      }}
                    >
                      <div className="upcoming-task-top">
                        <span className="subject-label">
                          <span className="subject-dot" />
                          {tarea.materia_nombre}
                        </span>

                        <span
                          className={`priority-pill priority-${tarea.prioridad}`}
                        >
                          {nombrePrioridad[tarea.prioridad] || tarea.prioridad}
                        </span>
                      </div>

                      <h3>{tarea.nombre}</h3>

                      <div className="upcoming-task-bottom">
                        <span>
                          <span className="meta-icon">▦</span>
                          {formatoFecha(convertirFecha(tarea.fecha_limite))}
                        </span>

                        <span>
                          <span className="meta-icon">◷</span>
                          {formatoHora(tarea.hora_limite)}
                        </span>
                      </div>

                      {vencida && (
                        <span className="overdue-label">
                          Fecha límite vencida
                        </span>
                      )}

                      <button
                        className="text-button"
                        onClick={() => abrirTareasMateria(tarea.materia_id)}
                      >
                        Ver tarea →
                      </button>
                    </article>
                  );
                })}
              </div>
            )}

            {proximasTareas.length > 5 && (
              <p className="more-tasks">
                Hay {proximasTareas.length - 5} tareas más pendientes.
              </p>
            )}
          </section>
        </div>
        <footer className="dashboard-footer">
          AgendaU · Organiza tus actividades académicas
        </footer>
      </main>
    </AppLayout>
  );
}

export default Dashboard;
