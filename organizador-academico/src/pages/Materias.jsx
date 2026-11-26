import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { obtenerPeriodos } from "../services/periodos.service";

import {
  obtenerMaterias,
  crearMateria,
  actualizarMateria,
  eliminarMateria,
} from "../services/materias.service";

import AppLayout from "../components/AppLayout";

const COLOR_PREDETERMINADO = "#3B82F6";

const COLORES_PREDEFINIDOS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#64748B",
  "#84CC16",
];

function Materias() {
  const { periodo_id } = useParams();
  const navigate = useNavigate();

  const [periodo, setPeriodo] = useState(null);

  const [materias, setMaterias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [color, setColor] = useState(COLOR_PREDETERMINADO);

  const [materiaEditando, setMateriaEditando] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const [descripcionEdicion, setDescripcionEdicion] = useState("");
  const [colorEdicion, setColorEdicion] = useState(COLOR_PREDETERMINADO);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarMaterias = async () => {
    try {
      setCargando(true);
      setError("");

      const [datosMaterias, periodos] = await Promise.all([
        obtenerMaterias(periodo_id),
        obtenerPeriodos(),
      ]);

      setMaterias(datosMaterias);

      const periodoActual = periodos.find(
        (p) => String(p.id) === String(periodo_id),
      );

      setPeriodo(periodoActual || null);
    } catch (error) {
      console.error("Error al cargar materias:", error);
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMaterias();
  }, [periodo_id]);

  const limpiarFormulario = () => {
    setNombre("");
    setDescripcion("");
    setColor(COLOR_PREDETERMINADO);
    setMostrarFormulario(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setError("El nombre de la materia es obligatorio.");
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      await crearMateria({
        periodo_id,
        nombre: nombreLimpio,
        descripcion: descripcion.trim(),
        color,
      });

      limpiarFormulario();
      setMensaje("Materia creada correctamente.");
      await cargarMaterias();
    } catch (error) {
      console.error("Error al crear materia:", error);
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (materia) => {
    setMateriaEditando(materia);
    setNombreEdicion(materia.nombre);
    setDescripcionEdicion(materia.descripcion || "");
    setColorEdicion(materia.color || COLOR_PREDETERMINADO);
    setError("");
    setMensaje("");
  };

  const cancelarEdicion = () => {
    setMateriaEditando(null);
    setNombreEdicion("");
    setDescripcionEdicion("");
    setColorEdicion(COLOR_PREDETERMINADO);
  };

  const handleActualizar = async (e) => {
    e.preventDefault();

    const nombreLimpio = nombreEdicion.trim();

    if (!nombreLimpio) {
      setError("El nombre de la materia es obligatorio.");
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      await actualizarMateria(materiaEditando.id, {
        nombre: nombreLimpio,
        descripcion: descripcionEdicion.trim(),
        color: colorEdicion,
      });

      cancelarEdicion();
      setMensaje("Materia actualizada correctamente.");
      await cargarMaterias();
    } catch (error) {
      console.error("Error al actualizar materia:", error);
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (materia) => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar la materia "${materia.nombre}"?\n\nTambién se eliminarán todas sus tareas, archivos adjuntos y recordatorios asociados. Esta acción no se puede deshacer.`,
    );

    if (!confirmar) return;

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      await eliminarMateria(materia.id);

      if (materiaEditando?.id === materia.id) {
        cancelarEdicion();
      }

      setMensaje("Materia eliminada correctamente.");
      await cargarMaterias();
    } catch (error) {
      console.error("Error al eliminar materia:", error);
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const SelectorColor = ({ valor, cambiarColor, id }) => (
    <div className="subject-color-picker">
      <label htmlFor={id}>Color de identificación</label>

      <div className="subject-selected-color">
        <input
          id={id}
          type="color"
          value={valor}
          onChange={(e) => cambiarColor(e.target.value)}
          disabled={guardando}
        />
        <span>{valor.toUpperCase()}</span>
      </div>

      <div className="subject-color-palette">
        {COLORES_PREDEFINIDOS.map((colorDisponible) => (
          <button
            key={colorDisponible}
            type="button"
            title={colorDisponible}
            aria-label={`Seleccionar color ${colorDisponible}`}
            aria-pressed={valor.toUpperCase() === colorDisponible}
            onClick={() => cambiarColor(colorDisponible)}
            disabled={guardando}
            className={
              valor.toUpperCase() === colorDisponible
                ? "subject-color-option selected"
                : "subject-color-option"
            }
            style={{ backgroundColor: colorDisponible }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <main className="subjects-page">
        <header className="page-header">
          <div className="page-header-content">
            <p className="page-eyebrow">ORGANIZACIÓN ACADÉMICA</p>
            <h1>Mis materias</h1>
            <p className="page-subtitle">
              Organiza tus asignaturas y mantén todas tus tareas en un solo
              lugar.
            </p>

            <div className="page-context">
              <div>
                <span className="page-context-label">PERIODO ESCOLAR</span>
                <strong>{periodo?.nombre || "Cargando periodo..."}</strong>
              </div>
            </div>
          </div>

          <div className="page-header-actions">
            <button
              type="button"
              className="page-back-button"
              onClick={() => navigate("/periodos")}
            >
              <span>←</span> Volver a periodos
            </button>
          </div>
        </header>

        <section className="subjects-summary">
          <div className="subjects-summary-icon">▦</div>
          <div>
            <span>Materias registradas</span>
            <strong>{materias.length}</strong>
          </div>
        </section>

        {error && (
          <p className="profile-error" role="alert">
            {error}
          </p>
        )}
        {mensaje && (
          <p className="profile-success" role="status">
            {mensaje}
          </p>
        )}

        <section className="subjects-create-section">
          <div className="subjects-section-heading">
            <div>
              <h2>Agregar materia</h2>
              <p>Registra una nueva asignatura en este periodo.</p>
            </div>

            <button
              type="button"
              className="subjects-add-button"
              onClick={() => {
                setMostrarFormulario(!mostrarFormulario);
                setError("");
                setMensaje("");
              }}
              disabled={guardando}
            >
              {mostrarFormulario ? "Cancelar" : "+ Nueva materia"}
            </button>
          </div>

          {mostrarFormulario && (
            <form className="subject-form" onSubmit={handleSubmit}>
              <div className="subject-form-grid">
                <div className="subject-field">
                  <label htmlFor="nombre">Nombre de la materia</label>
                  <input
                    id="nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Bases de Datos"
                    maxLength={100}
                    required
                    disabled={guardando}
                  />
                </div>

                <div className="subject-field">
                  <label htmlFor="descripcion">Descripción</label>
                  <textarea
                    id="descripcion"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Describe brevemente esta asignatura..."
                    rows={3}
                    disabled={guardando}
                  />
                </div>
              </div>

              <SelectorColor id="color" valor={color} cambiarColor={setColor} />

              <div className="subject-form-actions">
                <button
                  type="button"
                  className="subject-cancel-button"
                  onClick={limpiarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="subject-save-button"
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Crear materia"}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="subjects-list-section">
          <div className="subjects-section-heading">
            <div>
              <h2>Mis asignaturas</h2>
              <p>Selecciona una materia para consultar sus tareas.</p>
            </div>
            <span className="subjects-count">{materias.length}</span>
          </div>

          {cargando ? (
            <div className="subjects-empty">
              <p>Cargando materias...</p>
            </div>
          ) : materias.length === 0 ? (
            <div className="subjects-empty">
              <div className="subjects-empty-icon">▦</div>
              <h3>Aún no tienes materias</h3>
              <p>
                Agrega tu primera asignatura para comenzar a organizar tus
                tareas.
              </p>
              <button
                type="button"
                className="subject-save-button"
                onClick={() => setMostrarFormulario(true)}
              >
                + Agregar materia
              </button>
            </div>
          ) : (
            <div className="subjects-grid">
              {materias.map((materia) => {
                const colorMateria = materia.color || COLOR_PREDETERMINADO;
                const editando = materiaEditando?.id === materia.id;

                return (
                  <article
                    key={materia.id}
                    className="subject-card"
                    style={{ "--subject-color": colorMateria }}
                  >
                    <div className="subject-card-accent" />

                    {editando ? (
                      <div className="subject-edit-content">
                        <div className="subject-card-heading">
                          <h3>Editar materia</h3>
                        </div>

                        <form onSubmit={handleActualizar}>
                          <div className="subject-field">
                            <label htmlFor={`nombre-${materia.id}`}>
                              Nombre
                            </label>
                            <input
                              id={`nombre-${materia.id}`}
                              type="text"
                              value={nombreEdicion}
                              onChange={(e) => setNombreEdicion(e.target.value)}
                              maxLength={100}
                              required
                              disabled={guardando}
                            />
                          </div>

                          <div className="subject-field">
                            <label htmlFor={`descripcion-${materia.id}`}>
                              Descripción
                            </label>
                            <textarea
                              id={`descripcion-${materia.id}`}
                              value={descripcionEdicion}
                              onChange={(e) =>
                                setDescripcionEdicion(e.target.value)
                              }
                              rows={3}
                              disabled={guardando}
                            />
                          </div>

                          <SelectorColor
                            id={`color-${materia.id}`}
                            valor={colorEdicion}
                            cambiarColor={setColorEdicion}
                          />

                          <div className="subject-form-actions">
                            <button
                              type="button"
                              className="subject-cancel-button"
                              onClick={cancelarEdicion}
                              disabled={guardando}
                            >
                              Cancelar
                            </button>

                            <button
                              type="submit"
                              className="subject-save-button"
                              disabled={guardando}
                            >
                              {guardando ? "Guardando..." : "Guardar cambios"}
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="subject-card-content">
                        <div className="subject-card-heading">
                          <div
                            className="subject-color-indicator"
                            style={{ backgroundColor: colorMateria }}
                          />
                          <span>ASIGNATURA</span>
                        </div>

                        <h3>{materia.nombre}</h3>

                        <p className="subject-description">
                          {materia.descripcion || "Sin descripción registrada."}
                        </p>

                        <div className="subject-card-bottom">
                          <button
                            type="button"
                            className="subject-tasks-button"
                            onClick={() =>
                              navigate(
                                `/periodos/${periodo_id}/materias/${materia.id}/tareas`,
                              )
                            }
                          >
                            Ver tareas <span>→</span>
                          </button>

                          <div className="subject-card-actions">
                            <button
                              type="button"
                              onClick={() => iniciarEdicion(materia)}
                              disabled={guardando}
                              aria-label={`Editar ${materia.nombre}`}
                              title="Editar materia"
                            >
                              ✎
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEliminar(materia)}
                              disabled={guardando}
                              aria-label={`Eliminar ${materia.nombre}`}
                              title="Eliminar materia"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </AppLayout>
  );
}

export default Materias;
