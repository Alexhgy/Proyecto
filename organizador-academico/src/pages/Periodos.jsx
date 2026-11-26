import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  obtenerPeriodos,
  crearPeriodo,
  actualizarPeriodo,
  eliminarPeriodo,
} from "../services/periodos.service";

import AppLayout from "../components/AppLayout";

function Periodos() {
  const navigate = useNavigate();

  const [periodos, setPeriodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Datos del formulario de creación
  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Datos del formulario de edición
  const [periodoEditando, setPeriodoEditando] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const [fechaInicioEdicion, setFechaInicioEdicion] = useState("");
  const [fechaFinEdicion, setFechaFinEdicion] = useState("");
  const [estadoEdicion, setEstadoEdicion] = useState("activo");

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Consultar periodos
  const cargarPeriodos = async () => {
    try {
      setCargando(true);
      setError("");

      const datos = await obtenerPeriodos();
      setPeriodos(datos);
    } catch (error) {
      console.error("Error al cargar periodos:", error);
      setError(error.message || "No fue posible cargar los periodos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPeriodos();
  }, []);

  // Formatear fechas sin alterar el día por diferencias de zona horaria
  const formatearFecha = (fecha) => {
    if (!fecha) return "Sin fecha de finalización";

    const [anio, mes, dia] = String(fecha).slice(0, 10).split("-");

    if (!anio || !mes || !dia) return fecha;

    return new Date(
      Number(anio),
      Number(mes) - 1,
      Number(dia),
    ).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Crear periodo
  const handleSubmit = async (e) => {
    e.preventDefault();

    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setError("El nombre del periodo es obligatorio.");
      return;
    }

    if (fechaFin && fechaFin < fechaInicio) {
      setError(
        "La fecha de finalización no puede ser anterior a la fecha de inicio.",
      );
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      await crearPeriodo({
        nombre: nombreLimpio,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || null,
        estado: "activo",
      });

      setNombre("");
      setFechaInicio("");
      setFechaFin("");

      setMensaje("El periodo se creó correctamente.");

      await cargarPeriodos();
    } catch (error) {
      console.error("Error al crear periodo:", error);
      setError(error.message || "No fue posible crear el periodo.");
    } finally {
      setGuardando(false);
    }
  };

  // Preparar edición
  const iniciarEdicion = (periodo) => {
    setPeriodoEditando(periodo);
    setNombreEdicion(periodo.nombre);
    setFechaInicioEdicion(String(periodo.fecha_inicio).slice(0, 10));
    setFechaFinEdicion(
      periodo.fecha_fin ? String(periodo.fecha_fin).slice(0, 10) : "",
    );
    setEstadoEdicion(periodo.estado);

    setError("");
    setMensaje("");
  };

  // Cancelar edición
  const cancelarEdicion = () => {
    setPeriodoEditando(null);
    setNombreEdicion("");
    setFechaInicioEdicion("");
    setFechaFinEdicion("");
    setEstadoEdicion("activo");
  };

  // Actualizar periodo
  const handleActualizar = async (e) => {
    e.preventDefault();

    const nombreLimpio = nombreEdicion.trim();

    if (!nombreLimpio) {
      setError("El nombre del periodo es obligatorio.");
      return;
    }

    if (fechaFinEdicion && fechaFinEdicion < fechaInicioEdicion) {
      setError(
        "La fecha de finalización no puede ser anterior a la fecha de inicio.",
      );
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      await actualizarPeriodo(periodoEditando.id, {
        nombre: nombreLimpio,
        fecha_inicio: fechaInicioEdicion,
        fecha_fin: fechaFinEdicion || null,
        estado: estadoEdicion,
      });

      cancelarEdicion();
      setMensaje("El periodo se actualizó correctamente.");

      await cargarPeriodos();
    } catch (error) {
      console.error("Error al actualizar periodo:", error);
      setError(error.message || "No fue posible actualizar el periodo.");
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar periodo
  const handleEliminar = async (periodo) => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar el periodo "${periodo.nombre}"?\n\nTambién se eliminarán todas sus materias, tareas, archivos adjuntos y recordatorios asociados. Esta acción no se puede deshacer.`,
    );

    if (!confirmar) return;

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      await eliminarPeriodo(periodo.id);

      if (periodoEditando?.id === periodo.id) {
        cancelarEdicion();
      }

      setMensaje("El periodo se eliminó correctamente.");

      await cargarPeriodos();
    } catch (error) {
      console.error("Error al eliminar periodo:", error);
      setError(error.message || "No fue posible eliminar el periodo.");
    } finally {
      setGuardando(false);
    }
  };

  const periodosActivos = periodos.filter(
    (periodo) => periodo.estado === "activo",
  ).length;

  const periodosInactivos = periodos.length - periodosActivos;

  return (
    <AppLayout>
      <main className="periods-page">
        <header className="page-header periods-header">
          <div>
            <p className="page-eyebrow">ORGANIZACIÓN ACADÉMICA</p>
            <h1>Periodos escolares</h1>
            <p className="page-subtitle">
              Organiza tus ciclos escolares y administra las materias de cada
              periodo.
            </p>
          </div>
        </header>

        <section className="periods-summary">
          <article className="period-summary-card">
            <span className="period-summary-icon">▦</span>
            <div>
              <span className="period-summary-label">Total de periodos</span>
              <strong>{periodos.length}</strong>
            </div>
          </article>

          <article className="period-summary-card">
            <span className="period-summary-icon active-icon">✓</span>
            <div>
              <span className="period-summary-label">Activos</span>
              <strong>{periodosActivos}</strong>
            </div>
          </article>

          <article className="period-summary-card">
            <span className="period-summary-icon inactive-icon">○</span>
            <div>
              <span className="period-summary-label">Inactivos</span>
              <strong>{periodosInactivos}</strong>
            </div>
          </article>
        </section>

        {error && (
          <div className="periods-feedback error" role="alert">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="periods-feedback success" role="status">
            {mensaje}
          </div>
        )}

        <section className="periods-create-section">
          <div className="periods-section-heading">
            <div>
              <h2>Agregar periodo</h2>
              <p>Registra un nuevo ciclo escolar.</p>
            </div>
          </div>

          <form className="period-form-card" onSubmit={handleSubmit}>
            <div className="period-form-grid">
              <div className="period-form-field period-name-field">
                <label htmlFor="nombre">Nombre del periodo</label>
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. 2026-2"
                  maxLength={100}
                  required
                  disabled={guardando}
                />
              </div>

              <div className="period-form-field">
                <label htmlFor="fechaInicio">Fecha de inicio</label>
                <input
                  id="fechaInicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                  disabled={guardando}
                />
              </div>

              <div className="period-form-field">
                <label htmlFor="fechaFin">
                  Fecha de finalización
                  <span> Opcional</span>
                </label>
                <input
                  id="fechaFin"
                  type="date"
                  value={fechaFin}
                  min={fechaInicio || undefined}
                  onChange={(e) => setFechaFin(e.target.value)}
                  disabled={guardando}
                />
              </div>
            </div>

            <div className="period-form-footer">
              <p>El nuevo periodo se registrará como activo.</p>
              <button
                type="submit"
                className="period-primary-button"
                disabled={guardando}
              >
                {guardando ? "Guardando..." : "+ Crear periodo"}
              </button>
            </div>
          </form>
        </section>

        <section className="periods-list-section">
          <div className="periods-section-heading">
            <div>
              <h2>Mis periodos</h2>
              <p>
                {periodos.length === 1
                  ? "Tienes un periodo registrado."
                  : `Tienes ${periodos.length} periodos registrados.`}
              </p>
            </div>
          </div>

          {cargando ? (
            <div className="periods-empty-state">
              <p>Cargando tus periodos...</p>
            </div>
          ) : periodos.length === 0 ? (
            <div className="periods-empty-state">
              <span className="periods-empty-icon">▦</span>
              <h3>Aún no tienes periodos</h3>
              <p>
                Crea tu primer periodo escolar para comenzar a organizar tus
                materias y tareas.
              </p>
            </div>
          ) : (
            <div className="periods-grid">
              {periodos.map((periodo) => (
                <article className="period-card" key={periodo.id}>
                  {periodoEditando?.id === periodo.id ? (
                    <div className="period-edit-content">
                      <div className="period-card-top">
                        <div>
                          <span className="period-card-kicker">
                            CONFIGURACIÓN
                          </span>
                          <h3>Editar periodo</h3>
                        </div>
                        <span className="period-card-symbol">✎</span>
                      </div>

                      <form onSubmit={handleActualizar}>
                        <div className="period-edit-fields">
                          <div className="period-form-field">
                            <label htmlFor={`nombre-${periodo.id}`}>
                              Nombre del periodo
                            </label>
                            <input
                              id={`nombre-${periodo.id}`}
                              type="text"
                              value={nombreEdicion}
                              onChange={(e) => setNombreEdicion(e.target.value)}
                              maxLength={100}
                              required
                              disabled={guardando}
                            />
                          </div>

                          <div className="period-form-field">
                            <label htmlFor={`inicio-${periodo.id}`}>
                              Fecha de inicio
                            </label>
                            <input
                              id={`inicio-${periodo.id}`}
                              type="date"
                              value={fechaInicioEdicion}
                              onChange={(e) =>
                                setFechaInicioEdicion(e.target.value)
                              }
                              required
                              disabled={guardando}
                            />
                          </div>

                          <div className="period-form-field">
                            <label htmlFor={`fin-${periodo.id}`}>
                              Fecha de finalización
                            </label>
                            <input
                              id={`fin-${periodo.id}`}
                              type="date"
                              value={fechaFinEdicion}
                              min={fechaInicioEdicion || undefined}
                              onChange={(e) =>
                                setFechaFinEdicion(e.target.value)
                              }
                              disabled={guardando}
                            />
                          </div>

                          <div className="period-form-field">
                            <label htmlFor={`estado-${periodo.id}`}>
                              Estado del periodo
                            </label>
                            <select
                              id={`estado-${periodo.id}`}
                              value={estadoEdicion}
                              onChange={(e) => setEstadoEdicion(e.target.value)}
                              disabled={guardando}
                            >
                              <option value="activo">Activo</option>
                              <option value="no_activo">Inactivo</option>
                            </select>
                          </div>
                        </div>

                        <div className="period-card-actions edit-actions">
                          <button
                            type="submit"
                            className="period-primary-button"
                            disabled={guardando}
                          >
                            {guardando ? "Guardando..." : "Guardar cambios"}
                          </button>

                          <button
                            type="button"
                            className="period-secondary-button"
                            onClick={cancelarEdicion}
                            disabled={guardando}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <>
                      <div className="period-card-top">
                        <div>
                          <span className="period-card-kicker">
                            PERIODO ESCOLAR
                          </span>
                          <h3>{periodo.nombre}</h3>
                        </div>

                        <span className="period-card-symbol">▦</span>
                      </div>

                      <span
                        className={`period-status ${
                          periodo.estado === "activo"
                            ? "is-active"
                            : "is-inactive"
                        }`}
                      >
                        <span className="period-status-dot" />
                        {periodo.estado === "activo" ? "Activo" : "Inactivo"}
                      </span>

                      <div className="period-dates">
                        <div className="period-date-row">
                          <span className="period-date-icon">↗</span>
                          <div>
                            <span>Fecha de inicio</span>
                            <strong>
                              {formatearFecha(periodo.fecha_inicio)}
                            </strong>
                          </div>
                        </div>

                        <div className="period-date-row">
                          <span className="period-date-icon">↘</span>
                          <div>
                            <span>Fecha de finalización</span>
                            <strong>{formatearFecha(periodo.fecha_fin)}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="period-card-actions">
                        <button
                          type="button"
                          className="period-primary-button"
                          onClick={() =>
                            navigate(`/periodos/${periodo.id}/materias`)
                          }
                          disabled={guardando}
                        >
                          Ver materias <span>→</span>
                        </button>

                        <button
                          type="button"
                          className="period-icon-button"
                          onClick={() => iniciarEdicion(periodo)}
                          disabled={guardando}
                          aria-label={`Editar ${periodo.nombre}`}
                          title="Editar periodo"
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          className="period-icon-button delete"
                          onClick={() => handleEliminar(periodo)}
                          disabled={guardando}
                          aria-label={`Eliminar ${periodo.nombre}`}
                          title="Eliminar periodo"
                        >
                          ×
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </AppLayout>
  );
}

export default Periodos;
