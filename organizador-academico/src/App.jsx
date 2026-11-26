import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";

import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Dashboard from "./pages/Dashboard";
import Periodos from "./pages/Periodos";
import Materias from "./pages/Materias";
import Tareas from "./pages/Tareas";
import Notificaciones from "./pages/Notificaciones";
import Perfil from "./pages/Perfil";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />

          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/periodos" element={<Periodos />} />
            <Route
              path="/periodos/:periodo_id/materias"
              element={<Materias />}
            />
            <Route
              path="/periodos/:periodo_id/materias/:materia_id/tareas"
              element={<Tareas />}
            />{" "}
            <Route path="/notificaciones" element={<Notificaciones />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
