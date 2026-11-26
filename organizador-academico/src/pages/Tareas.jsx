import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";

import {
  obtenerTareas,
  crearTarea,
  actualizarTarea,
  completarTarea,
  eliminarTarea,
} from "../services/tareas.service";

import {
  obtenerArchivos,
  subirArchivo,
  descargarArchivo,
  eliminarArchivo,
} from "../services/archivos.service";

import { obtenerPeriodos } from "../services/periodos.service";
import { obtenerMaterias } from "../services/materias.service";

const EXTENSIONES_PERMITIDAS = [
  "pdf",
  "docx",
  "doc",
  "txt",
  "jpg",
  "jpeg",
  "png",
  "webp",
];

const TAMANO_MAXIMO = 5 * 1024 * 1024;

const formatearFecha = (fecha) => {
  if (!fecha) return "Sin fecha";

  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
};

const PRIORIDADES = {
  maxima: { texto: "Máxima", clase: "maxima" },
  alta: { texto: "Alta", clase: "alta" },
  media: { texto: "Media", clase: "media" },
  baja: { texto: "Baja", clase: "baja" },
};

function Tareas() {
  const { periodo_id, materia_id } = useParams();
  const navigate = useNavigate();

  const [periodo, setPeriodo] = useState(null);
  const [materia, setMateria] = useState(null);

  const [tareas, setTareas] = useState([]);
  const [archivosPorTarea, setArchivosPorTarea] = useState({});
  const [cargandoArchivos, setCargandoArchivos] = useState({});
  const [errorArchivos, setErrorArchivos] = useState({});

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [tareaEditando, setTareaEditando] = useState(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [horaLimite, setHoraLimite] = useState("");
  const [prioridad, setPrioridad] = useState("media");

  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const cargarArchivos = async (tareaId) => {
    try {
      setCargandoArchivos((actuales) => ({
        ...actuales,
        [tareaId]: true,
      }));

      setErrorArchivos((actuales) => ({
        ...actuales,
        [tareaId]: "",
      }));

      const resultado = await obtenerArchivos(tareaId);

      setArchivosPorTarea((actuales) => ({
        ...actuales,
        [tareaId]: resultado,
      }));
    } catch (error) {
      setErrorArchivos((actuales) => ({
        ...actuales,
        [tareaId]: error.message,
      }));
    } finally {
      setCargandoArchivos((actuales) => ({
        ...actuales,
        [tareaId]: false,
      }));
    }
  };

  const cargarTareas = async () => {
    try {
      setCargando(true);
      setError("");

      const resultado = await obtenerTareas(materia_id);

      setTareas(resultado);

      // Consultar los archivos asociados a cada tarea.
      const consultas = await Promise.allSettled(
        resultado.map((tarea) => obtenerArchivos(tarea.id)),
      );

      const archivos = {};

      consultas.forEach((consulta, indice) => {
        const tareaId = resultado[indice].id;

        if (consulta.status === "fulfilled") {
          archivos[tareaId] = consulta.value;
        } else {
          archivos[tareaId] = [];
        }
      });

      setArchivosPorTarea(archivos);
    } catch (error) {
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  const cargarContexto = async () => {
    try {
      const [periodos, materias] = await Promise.all([
        obtenerPeriodos(),
        obtenerMaterias(periodo_id),
      ]);

      const periodoActual = periodos.find(
        (p) => String(p.id) === String(periodo_id),
      );

      const materiaActual = materias.find(
        (m) => String(m.id) === String(materia_id),
      );

      setPeriodo(periodoActual || null);
      setMateria(materiaActual || null);
    } catch (error) {
      console.error("Error al cargar el contexto académico:", error);
      setError(
        "No fue posible cargar la información del periodo y la materia.",
      );
    }
  };

  useEffect(() => {
    cargarTareas();
    cargarContexto();
  }, [periodo_id, materia_id]);

  const ordenarTareas = (lista) => {
    const ordenPrioridad = {
      maxima: 4,
      alta: 3,
      media: 2,
      baja: 1,
    };

    return [...lista].sort((a, b) => {
      if (a.estado_realizacion !== b.estado_realizacion) {
        return a.estado_realizacion === "pendiente" ? -1 : 1;
      }

      const fechaA = `${a.fecha_limite} ${a.hora_limite || "23:59:59"}`;
      const fechaB = `${b.fecha_limite} ${b.hora_limite || "23:59:59"}`;

      if (fechaA !== fechaB) {
        return fechaA.localeCompare(fechaB);
      }

      return ordenPrioridad[b.prioridad] - ordenPrioridad[a.prioridad];
    });
  };

  const limpiarFormulario = () => {
    setNombre("");
    setDescripcion("");
    setFechaLimite("");
    setHoraLimite("");
    setPrioridad("media");
    setTareaEditando(null);
    setMostrarFormulario(false);
  };

  const manejarCrearTarea = async (e) => {
    e.preventDefault();

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const datos = {
        materia_id,
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        fecha_limite: fechaLimite,
        hora_limite: horaLimite || null,
        prioridad,
        estado_realizacion: "pendiente",
        estado_repaso: "pendiente",
      };

      await crearTarea(datos);

      limpiarFormulario();
      setMensaje("La tarea se creó correctamente.");

      await cargarTareas();
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (tarea) => {
    setTareaEditando(tarea.id);
    setNombre(tarea.nombre);
    setDescripcion(tarea.descripcion || "");
    setFechaLimite(tarea.fecha_limite);
    setHoraLimite(tarea.hora_limite || "");
    setPrioridad(tarea.prioridad);

    setMensaje("");
    setError("");
    setMostrarFormulario(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const manejarActualizarTarea = async (e) => {
    e.preventDefault();

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const datos = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        fecha_limite: fechaLimite,
        hora_limite: horaLimite || null,
        prioridad,
      };

      await actualizarTarea(tareaEditando, datos);

      limpiarFormulario();
      setMensaje("La tarea se actualizó correctamente.");

      await cargarTareas();
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const manejarCompletarTarea = async (id) => {
    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      await completarTarea(id);

      setMensaje("La tarea se marcó como completada.");
      await cargarTareas();
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const manejarReabrirTarea = async (id) => {
    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      await actualizarTarea(id, {
        estado_realizacion: "pendiente",
      });

      setMensaje("La tarea volvió a estar pendiente.");
      await cargarTareas();
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const manejarEliminarTarea = async (tarea) => {
    const confirmar = window.confirm(
      `¿Deseas eliminar la tarea "${tarea.nombre}"? También se eliminarán sus archivos y recordatorios asociados.`,
    );

    if (!confirmar) return;

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      await eliminarTarea(tarea.id);

      if (tareaEditando === tarea.id) {
        limpiarFormulario();
      }

      setMensaje("La tarea se eliminó correctamente.");
      await cargarTareas();
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  // Subir un archivo a una tarea.
  const manejarSubirArchivo = async (tareaId, archivo) => {
    if (!archivo) return;

    const extension = archivo.name.split(".").pop().toLowerCase();

    if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
      setErrorArchivos((actuales) => ({
        ...actuales,
        [tareaId]: "Formato no permitido.",
      }));
      return;
    }

    if (archivo.size > TAMANO_MAXIMO) {
      setErrorArchivos((actuales) => ({
        ...actuales,
        [tareaId]: "El archivo supera el límite de 5 MiB.",
      }));
      return;
    }

    try {
      setCargandoArchivos((actuales) => ({
        ...actuales,
        [tareaId]: true,
      }));

      setErrorArchivos((actuales) => ({
        ...actuales,
        [tareaId]: "",
      }));

      await subirArchivo(tareaId, archivo);

      await cargarArchivos(tareaId);

      setMensaje(`Archivo "${archivo.name}" adjuntado correctamente.`);
    } catch (error) {
      setErrorArchivos((actuales) => ({
        ...actuales,
        [tareaId]: error.message,
      }));
    } finally {
      setCargandoArchivos((actuales) => ({
        ...actuales,
        [tareaId]: false,
      }));
    }
  };

  // Descargar un archivo mediante su URL firmada.
  const manejarDescargarArchivo = async (archivo) => {
    try {
      setError("");
      setMensaje("");

      const resultado = await descargarArchivo(archivo.id);

      const enlace = document.createElement("a");
      enlace.href = resultado.archivo.url;
      enlace.download = resultado.archivo.nombre_archivo;
      enlace.target = "_blank";
      enlace.rel = "noopener noreferrer";

      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      setMensaje("Se inició la descarga del archivo.");
    } catch (error) {
      setError(error.message);
    }
  };

  // Eliminar un archivo adjunto.
  const manejarEliminarArchivo = async (tareaId, archivo) => {
    setGuardando(true);
    const confirmar = window.confirm(
      `¿Deseas eliminar el archivo "${archivo.nombre_archivo}"?`,
    );

    if (!confirmar) return;

    try {
      setErrorArchivos((actuales) => ({
        ...actuales,
        [tareaId]: "",
      }));

      setCargandoArchivos((actuales) => ({
        ...actuales,
        [tareaId]: true,
      }));

      await eliminarArchivo(archivo.id);

      await cargarArchivos(tareaId);

      setMensaje("Archivo eliminado correctamente.");
    } catch (error) {
      setErrorArchivos((actuales) => ({
        ...actuales,
        [tareaId]: error.message,
      }));
    } finally {
      setCargandoArchivos((actuales) => ({
        ...actuales,
        [tareaId]: false,
      }));
    }
  };

  const tareasOrdenadas = ordenarTareas(tareas);

  if (cargando) {
    return (
      <AppLayout>
        <main className="tasks-page">
          <p className="tasks-loading">Cargando tareas...</p>
        </main>
      </AppLayout>
    );
  }

  const pendientes = tareasOrdenadas.filter(
    (tarea) => tarea.estado_realizacion === "pendiente",
  );

  const completadas = tareasOrdenadas.filter(
    (tarea) => tarea.estado_realizacion === "completada",
  );

  return (
    <AppLayout>
      <main className="tasks-page">
        <header className="page-header">
          <div className="page-header-content">
            <p className="page-eyebrow">ORGANIZACIÓN ACADÉMICA</p>

            <h1>Tareas</h1>

            <p className="page-subtitle">
              Administra tus entregas, prioridades y fechas límite.
            </p>

            <div className="page-context">
              <div>
                <span className="page-context-label">PERIODO ESCOLAR</span>
                <strong>{periodo?.nombre || "Cargando periodo..."}</strong>
              </div>

              <div>
                <span className="page-context-label">MATERIA</span>
                <strong>{materia?.nombre || "Cargando materia..."}</strong>
              </div>
            </div>
          </div>

          <div className="page-header-actions">
            <button
              type="button"
              className="page-back-button"
              onClick={() => navigate(`/periodos/${periodo_id}/materias`)}
            >
              <span>←</span> Volver a materias
            </button>
          </div>
        </header>

        <section className="tasks-summary">
          <div className="tasks-summary-item">
            <span className="tasks-summary-icon pending">◷</span>
            <div>
              <span>Pendientes</span>
              <strong>{pendientes.length}</strong>
            </div>
          </div>

          <div className="tasks-summary-item">
            <span className="tasks-summary-icon completed">✓</span>
            <div>
              <span>Completadas</span>
              <strong>{completadas.length}</strong>
            </div>
          </div>

          <div className="tasks-summary-item">
            <span className="tasks-summary-icon total">▤</span>
            <div>
              <span>Total</span>
              <strong>{tareas.length}</strong>
            </div>
          </div>
        </section>

        {mensaje && (
          <p className="profile-success" role="status">
            {mensaje}
          </p>
        )}

        {error && (
          <p className="profile-error" role="alert">
            {error}
          </p>
        )}

        <section className="tasks-create-section">
          <div className="tasks-section-heading">
            <div>
              <h2>{tareaEditando ? "Editar tarea" : "Nueva tarea"}</h2>
              <p>
                {tareaEditando
                  ? "Modifica los detalles de tu tarea."
                  : "Registra una nueva actividad o entrega."}
              </p>
            </div>

            {!tareaEditando && (
              <button
                type="button"
                className="tasks-add-button"
                onClick={() => setMostrarFormulario(!mostrarFormulario)}
              >
                {mostrarFormulario ? "Cancelar" : "+ Nueva tarea"}
              </button>
            )}
          </div>

          {mostrarFormulario && (
            <form
              className="task-form"
              onSubmit={
                tareaEditando ? manejarActualizarTarea : manejarCrearTarea
              }
            >
              <div className="task-field">
                <label htmlFor="nombre">Nombre de la tarea</label>
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Proyecto final"
                  maxLength={150}
                  required
                  disabled={guardando}
                />
              </div>

              <div className="task-field">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Agrega instrucciones o detalles..."
                  rows={3}
                  disabled={guardando}
                />
              </div>

              <div className="task-form-grid">
                <div className="task-field">
                  <label htmlFor="fechaLimite">Fecha límite</label>
                  <input
                    id="fechaLimite"
                    type="date"
                    value={fechaLimite}
                    onChange={(e) => setFechaLimite(e.target.value)}
                    required
                    disabled={guardando}
                  />
                </div>

                <div className="task-field">
                  <label htmlFor="horaLimite">Hora límite</label>
                  <input
                    id="horaLimite"
                    type="time"
                    value={horaLimite}
                    onChange={(e) => setHoraLimite(e.target.value)}
                    disabled={guardando}
                  />
                  <small>Sin hora especificada, se utilizarán las 23:59.</small>
                </div>
              </div>

              <div className="task-field">
                <label htmlFor="prioridad">Prioridad</label>
                <div className="task-priority-options">
                  {Object.entries(PRIORIDADES).map(([valor, datos]) => (
                    <button
                      key={valor}
                      type="button"
                      className={`task-priority-option ${datos.clase} ${
                        prioridad === valor ? "selected" : ""
                      }`}
                      onClick={() => setPrioridad(valor)}
                      disabled={guardando}
                      aria-pressed={prioridad === valor}
                    >
                      {datos.texto}
                    </button>
                  ))}
                </div>
              </div>

              <div className="task-form-actions">
                {tareaEditando && (
                  <button
                    type="button"
                    className="task-cancel-button"
                    onClick={limpiarFormulario}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="submit"
                  className="task-save-button"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : tareaEditando
                      ? "Guardar cambios"
                      : "Crear tarea"}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="tasks-list-section">
          <div className="tasks-section-heading">
            <div>
              <h2>Mis tareas</h2>
              <p>Ordenadas por fecha límite y prioridad.</p>
            </div>
          </div>

          {tareasOrdenadas.length === 0 ? (
            <div className="tasks-empty">
              <div className="tasks-empty-icon">✓</div>
              <h3>No hay tareas registradas</h3>
              <p>
                Crea tu primera tarea para comenzar a organizar tus entregas.
              </p>
              <button
                type="button"
                className="task-save-button"
                onClick={() => setMostrarFormulario(true)}
              >
                + Crear tarea
              </button>
            </div>
          ) : (
            <>
              {pendientes.length > 0 && (
                <div className="tasks-group">
                  <div className="tasks-group-heading">
                    <h3>Pendientes</h3>
                    <span>{pendientes.length}</span>
                  </div>

                  <div className="tasks-grid">
                    {pendientes.map((tarea) => {
                      const archivos = archivosPorTarea[tarea.id] || [];
                      const prioridadInfo =
                        PRIORIDADES[tarea.prioridad] || PRIORIDADES.media;

                      return (
                        <article
                          key={tarea.id}
                          className={`task-card priority-${prioridadInfo.clase}`}
                        >
                          <div className="task-card-top">
                            <span
                              className={`task-priority-badge ${prioridadInfo.clase}`}
                            >
                              {prioridadInfo.texto}
                            </span>

                            <span className="task-status pending">
                              Pendiente
                            </span>
                          </div>

                          <h3>{tarea.nombre}</h3>

                          <p className="task-description">
                            {tarea.descripcion || "Sin descripción."}
                          </p>

                          <div className="task-deadline">
                            <div>
                              <span>Fecha límite</span>
                              <strong>
                                {formatearFecha(tarea.fecha_limite)}
                              </strong>
                            </div>

                            <div>
                              <span>Hora</span>
                              <strong>
                                {tarea.hora_limite
                                  ? tarea.hora_limite.slice(0, 5)
                                  : "23:59"}
                              </strong>
                            </div>
                          </div>

                          <div className="task-card-actions">
                            <button
                              type="button"
                              className="task-complete-button"
                              onClick={() => manejarCompletarTarea(tarea.id)}
                              disabled={guardando}
                            >
                              ✓ Completar
                            </button>

                            <button
                              type="button"
                              className="task-icon-button"
                              onClick={() => iniciarEdicion(tarea)}
                              aria-label="Editar tarea"
                              title="Editar"
                            >
                              ✎
                            </button>

                            <button
                              type="button"
                              className="task-icon-button delete"
                              onClick={() => manejarEliminarTarea(tarea)}
                              aria-label="Eliminar tarea"
                              title="Eliminar"
                            >
                              ×
                            </button>
                          </div>

                          <details className="task-attachments">
                            <summary>
                              <span>Archivos adjuntos</span>
                              <span className="task-file-count">
                                {archivos.length}
                              </span>
                            </summary>

                            <div className="task-attachments-content">
                              <label htmlFor={`archivo-${tarea.id}`}>
                                Adjuntar archivo
                              </label>

                              <input
                                id={`archivo-${tarea.id}`}
                                type="file"
                                accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.webp"
                                disabled={Boolean(cargandoArchivos[tarea.id])}
                                onChange={(e) => {
                                  const archivo = e.target.files[0];
                                  manejarSubirArchivo(tarea.id, archivo);
                                  e.target.value = "";
                                }}
                              />

                              <small>
                                PDF, DOCX, DOC, TXT, JPG, PNG o WEBP. Máximo 5
                                MiB.
                              </small>

                              {cargandoArchivos[tarea.id] && (
                                <p>Procesando archivos...</p>
                              )}

                              {errorArchivos[tarea.id] && (
                                <p className="profile-error">
                                  {errorArchivos[tarea.id]}
                                </p>
                              )}

                              {archivos.length === 0 ? (
                                <p className="task-no-files">
                                  No hay archivos adjuntos.
                                </p>
                              ) : (
                                <ul className="task-file-list">
                                  {archivos.map((archivo) => (
                                    <li key={archivo.id}>
                                      <div>
                                        <strong>
                                          {archivo.nombre_archivo}
                                        </strong>
                                        <small>
                                          {(
                                            archivo.tamano_bytes / 1024
                                          ).toFixed(1)}{" "}
                                          KB
                                        </small>
                                      </div>

                                      <div className="task-file-actions">
                                        <button
                                          type="button"
                                          disabled={Boolean(
                                            cargandoArchivos[tarea.id],
                                          )}
                                          onClick={() =>
                                            manejarDescargarArchivo(archivo)
                                          }
                                        >
                                          Descargar
                                        </button>

                                        <button
                                          type="button"
                                          disabled={Boolean(
                                            cargandoArchivos[tarea.id],
                                          )}
                                          onClick={() =>
                                            manejarEliminarArchivo(
                                              tarea.id,
                                              archivo,
                                            )
                                          }
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </details>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}

              {completadas.length > 0 && (
                <div className="tasks-group completed-group">
                  <div className="tasks-group-heading">
                    <h3>Completadas</h3>
                    <span>{completadas.length}</span>
                  </div>

                  <div className="tasks-grid">
                    {completadas.map((tarea) => (
                      <article
                        key={tarea.id}
                        className="task-card completed-card"
                      >
                        <div className="task-card-top">
                          <span className="task-status completed">
                            ✓ Completada
                          </span>
                        </div>

                        <h3>{tarea.nombre}</h3>

                        <p className="task-description">
                          {tarea.descripcion || "Sin descripción."}
                        </p>

                        <div className="task-deadline">
                          <div>
                            <span>Fecha límite</span>
                            <strong>
                              {formatearFecha(tarea.fecha_limite)}
                            </strong>
                          </div>

                          <div>
                            <span>Hora</span>
                            <strong>
                              {tarea.hora_limite
                                ? tarea.hora_limite.slice(0, 5)
                                : "23:59"}
                            </strong>
                          </div>
                        </div>

                        <div className="task-card-actions">
                          <button
                            type="button"
                            className="task-reopen-button"
                            onClick={() => manejarReabrirTarea(tarea.id)}
                            disabled={guardando}
                          >
                            ↶ Reabrir tarea
                          </button>

                          <button
                            type="button"
                            className="task-icon-button"
                            onClick={() => iniciarEdicion(tarea)}
                            aria-label="Editar tarea"
                            title="Editar"
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            className="task-icon-button delete"
                            onClick={() => manejarEliminarTarea(tarea)}
                            aria-label="Eliminar tarea"
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </AppLayout>
  );
}

export default Tareas;
