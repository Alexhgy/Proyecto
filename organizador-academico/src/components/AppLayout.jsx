import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AppLayout({ children }) {
  const { perfil, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const nombreUsuario = perfil?.nombre || "Estudiante";
  const inicialUsuario = nombreUsuario.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      const { error } = await cerrarSesion();

      if (error) {
        throw error;
      }

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const enlaces = [
    { ruta: "/dashboard", icono: "⌂", texto: "Inicio" },
    { ruta: "/periodos", icono: "▦", texto: "Periodos y materias" },
    { ruta: "/notificaciones", icono: "♧", texto: "Notificaciones" },
    { ruta: "/perfil", icono: "♙", texto: "Mi perfil" },
  ];

  // También mantiene activo el acceso a materias
  // cuando el usuario consulta las tareas de una materia.
  const esSeccionMaterias =
    location.pathname.startsWith("/periodos") ||
    location.pathname.startsWith("/materias/");

  const enlaceActivo = (ruta, isActive) => {
    if (ruta === "/periodos") {
      return esSeccionMaterias;
    }

    return isActive;
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">A</div>
          <span>
            Agenda<span className="brand-accent">U</span>
          </span>
        </div>

        <p className="sidebar-label">MENÚ PRINCIPAL</p>

        <nav className="sidebar-nav">
          {enlaces.map((enlace) => (
            <NavLink
              key={enlace.ruta}
              to={enlace.ruta}
              end={enlace.ruta === "/dashboard"}
              className={({ isActive }) =>
                `nav-item ${enlaceActivo(enlace.ruta, isActive) ? "active" : ""}`
              }
            >
              <span className="nav-icon">{enlace.icono}</span>
              {enlace.texto}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="avatar">{inicialUsuario}</div>

            <div className="sidebar-user-info">
              <strong>{nombreUsuario}</strong>
              <span>Estudiante</span>
            </div>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            ↪ Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="main-area">{children}</div>

      <nav className="mobile-nav">
        {enlaces.map((enlace) => (
          <NavLink
            key={enlace.ruta}
            to={enlace.ruta}
            end={enlace.ruta === "/dashboard"}
            className={({ isActive }) =>
              `mobile-nav-item ${
                enlaceActivo(enlace.ruta, isActive) ? "active" : ""
              }`
            }
          >
            <span>{enlace.icono}</span>

            {enlace.ruta === "/periodos"
              ? "Materias"
              : enlace.ruta === "/notificaciones"
                ? "Avisos"
                : enlace.ruta === "/perfil"
                  ? "Perfil"
                  : enlace.texto}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default AppLayout;
