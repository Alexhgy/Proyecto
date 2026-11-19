const express = require("express");
const pool = require("./db");
const cors = require("cors");
const crypto = require("crypto");
const verificarAutenticacion = require("./middlewares/auth.middleware");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Servidor iniciado");
});

// ==========================================
// AUTENTICACIÓN
// ==========================================

app.get("/auth/me", verificarAutenticacion, (req, res) => {
  res.json({
    mensaje: "Usuario autenticado correctamente",
    usuario: req.user,
  });
});

// ==========================================
// PERFIL USUARIO - Pruebas completadas
// ==========================================

// GET: Obtener todos los perfiles
app.get("/perfil_usuario", verificarAutenticacion, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM perfil_usuario WHERE id = ?",
      [req.user.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "No existe un perfil para este usuario",
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error en GET perfil_usuario:", error);
    res.status(500).json({
      error: "Error al consultar el perfil",
    });
  }
});

// POST: Crear un perfil
app.post("/perfil_usuario", verificarAutenticacion, async (req, res) => {
  const { nombre } = req.body;
  const id = req.user.id;
  const correo = req.user.email;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({
      error: "El nombre es obligatorio",
    });
  }

  try {
    await pool.query(
      `INSERT INTO perfil_usuario (id, nombre, correo)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
       nombre = VALUES(nombre),
       correo = VALUES(correo)`,
      [id, nombre.trim(), correo],
    );

    res.status(200).json({
      id,
      nombre: nombre.trim(),
      correo,
      mensaje: "Perfil sincronizado correctamente",
    });
  } catch (error) {
    console.error("Error en POST perfil_usuario:", error);
    res.status(500).json({
      error: "Error al crear o actualizar el perfil",
    });
  }
});

// PUT: Actualizar un perfil
app.put("/perfil_usuario/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, correo } = req.body;
  try {
    const [result] = await pool.query(
      "UPDATE perfil_usuario SET nombre = ?, correo = ? WHERE id = ?",
      [nombre, correo, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ mensaje: "Usuario actualizado correctamente" });
  } catch (error) {
    console.error("Error en la consulta PUT:", error);
    res.status(500).json({ error: "Error al actualizar el usuario" });
  }
});

// DELETE: Eliminar un perfil
app.delete("/perfil_usuario/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "DELETE FROM perfil_usuario WHERE id = ?",
      [id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ mensaje: `Usuario con ID ${id} eliminado` });
  } catch (error) {
    console.error("Error en la consulta DELETE:", error);
    res.status(500).json({ error: "Error al eliminar el usuario" });
  }
});

// ==========================================
// PERIODO ESCOLAR - Pruebas completadas
// ==========================================

// Obtener todos los periodos (o filtrados por usuario)
app.get("/periodos", verificarAutenticacion, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM periodo_escolar WHERE usuario_id = ?",
      [req.user.id],
    );

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener periodos:", error);
    res.status(500).json({
      error: "Error al obtener los periodos escolares",
    });
  }
});

app.post("/periodos", verificarAutenticacion, async (req, res) => {
  const { nombre, fecha_inicio, fecha_fin, estado } = req.body;

  const nuevoId = crypto.randomUUID();
  const usuario_id = req.user.id;

  try {
    const [result] = await pool.query(
      `INSERT INTO periodo_escolar
       (id, usuario_id, nombre, fecha_inicio, fecha_fin, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nuevoId,
        usuario_id,
        nombre,
        fecha_inicio,
        fecha_fin ?? null,
        estado ?? "activo",
      ],
    );

    res.status(201).json({
      id: nuevoId,
      mensaje: "Periodo escolar creado",
    });
  } catch (error) {
    console.error("Error al crear periodo:", error);
    res.status(500).json({
      error: "Error al crear el periodo escolar",
    });
  }
});

app.put("/periodos/:id", verificarAutenticacion, async (req, res) => {
  const { id } = req.params;
  const { nombre, fecha_inicio, fecha_fin, estado } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE periodo_escolar
       SET nombre = ?, fecha_inicio = ?, fecha_fin = ?, estado = ?
       WHERE id = ? AND usuario_id = ?`,
      [nombre, fecha_inicio, fecha_fin, estado, id, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Periodo no encontrado",
      });
    }

    res.json({
      mensaje: "Periodo actualizado correctamente",
    });
  } catch (error) {
    console.error("Error al actualizar periodo:", error);
    res.status(500).json({
      error: "Error al actualizar el periodo",
    });
  }
});

app.delete("/periodos/:id", verificarAutenticacion, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `DELETE FROM periodo_escolar
       WHERE id = ? AND usuario_id = ?`,
      [id, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Periodo no encontrado",
      });
    }

    res.json({
      mensaje: "Periodo eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar periodo:", error);
    res.status(500).json({
      error: "Error al eliminar el periodo",
    });
  }
});

// ==========================================
// MATERIA - Pruebas completadas
// ==========================================

app.get("/materias", verificarAutenticacion, async (req, res) => {
  const { periodo_id } = req.query;

  try {
    let query = `
      SELECT m.*
      FROM materia m
      INNER JOIN periodo_escolar p ON m.periodo_id = p.id
      WHERE p.usuario_id = ?
    `;

    const params = [req.user.id];

    if (periodo_id) {
      query += " AND m.periodo_id = ?";
      params.push(periodo_id);
    }

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener materias:", error);
    res.status(500).json({
      error: "Error al obtener las materias",
    });
  }
});

app.post("/materias", verificarAutenticacion, async (req, res) => {
  const { periodo_id, nombre, descripcion } = req.body;
  const nuevoId = crypto.randomUUID();

  try {
    const [periodos] = await pool.query(
      `SELECT id
       FROM periodo_escolar
       WHERE id = ? AND usuario_id = ?`,
      [periodo_id, req.user.id],
    );

    if (periodos.length === 0) {
      return res.status(404).json({
        error: "Periodo no encontrado",
      });
    }

    await pool.query(
      `INSERT INTO materia
       (id, periodo_id, nombre, descripcion)
       VALUES (?, ?, ?, ?)`,
      [nuevoId, periodo_id, nombre, descripcion],
    );

    res.status(201).json({
      id: nuevoId,
      periodo_id,
      nombre,
      descripcion,
      mensaje: "Materia creada con éxito",
    });
  } catch (error) {
    console.error("Error al crear materia:", error);
    res.status(500).json({
      error: "Error al crear la materia",
    });
  }
});

app.put("/materias/:id", verificarAutenticacion, async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;

  try {
    const [materias] = await pool.query(
      `SELECT m.id
       FROM materia m
       INNER JOIN periodo_escolar p ON m.periodo_id = p.id
       WHERE m.id = ? AND p.usuario_id = ?`,
      [id, req.user.id],
    );

    if (materias.length === 0) {
      return res.status(404).json({
        error: "Materia no encontrada",
      });
    }

    await pool.query(
      `UPDATE materia
       SET nombre = ?, descripcion = ?
       WHERE id = ?`,
      [nombre, descripcion, id],
    );

    res.json({
      mensaje: "Materia actualizada correctamente",
    });
  } catch (error) {
    console.error("Error al actualizar materia:", error);
    res.status(500).json({
      error: "Error al actualizar la materia",
    });
  }
});

app.delete("/materias/:id", verificarAutenticacion, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `DELETE m
       FROM materia m
       INNER JOIN periodo_escolar p ON m.periodo_id = p.id
       WHERE m.id = ? AND p.usuario_id = ?`,
      [id, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Materia no encontrada",
      });
    }

    res.json({
      mensaje: "Materia eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar materia:", error);
    res.status(500).json({
      error: "Error al eliminar la materia",
    });
  }
});

// ==========================================
// TAREA - Pruebas completadas - Revisar horas limite en "fecha_limite"
// ==========================================

app.get("/tareas", verificarAutenticacion, async (req, res) => {
  const { materia_id } = req.query;

  try {
    let query = `
      SELECT t.*
      FROM tarea t
      INNER JOIN materia m ON t.materia_id = m.id
      INNER JOIN periodo_escolar p ON m.periodo_id = p.id
      WHERE p.usuario_id = ?
    `;

    const params = [req.user.id];

    if (materia_id) {
      query += " AND t.materia_id = ?";
      params.push(materia_id);
    }

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener tareas:", error);
    res.status(500).json({
      error: "Error al obtener las tareas",
    });
  }
});

app.post("/tareas", verificarAutenticacion, async (req, res) => {
  const {
    materia_id,
    nombre,
    descripcion,
    fecha_limite,
    hora_limite,
    prioridad,
    estado_realizacion,
    estado_repaso,
  } = req.body;

  const nuevoId = crypto.randomUUID();

  try {
    // Comprobar que la materia pertenece al usuario
    const [materias] = await pool.query(
      `SELECT m.id
       FROM materia m
       INNER JOIN periodo_escolar p ON m.periodo_id = p.id
       WHERE m.id = ? AND p.usuario_id = ?`,
      [materia_id, req.user.id],
    );

    if (materias.length === 0) {
      return res.status(404).json({
        error: "Materia no encontrada",
      });
    }

    // Crear la tarea
    await pool.query(
      `INSERT INTO tarea (
        id,
        materia_id,
        nombre,
        descripcion,
        fecha_limite,
        hora_limite,
        prioridad,
        estado_realizacion,
        estado_repaso
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nuevoId,
        materia_id,
        nombre,
        descripcion,
        fecha_limite,
        hora_limite ?? null,
        prioridad ?? "media",
        estado_realizacion ?? "pendiente",
        estado_repaso ?? "pendiente",
      ],
    );

    res.status(201).json({
      id: nuevoId,
      mensaje: "Tarea creada con éxito",
    });
  } catch (error) {
    console.error("Error al crear tarea:", error);
    res.status(500).json({
      error: "Error al crear la tarea",
    });
  }
});

// Ruta específica para marcar tarea como completada
app.patch("/tareas/:id/completar", verificarAutenticacion, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `UPDATE tarea t
         INNER JOIN materia m ON t.materia_id = m.id
         INNER JOIN periodo_escolar p ON m.periodo_id = p.id
         SET
           t.estado_realizacion = 'completada',
           t.completada_en = NOW()
         WHERE t.id = ? AND p.usuario_id = ?`,
      [id, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Tarea no encontrada",
      });
    }

    res.json({
      mensaje: "Tarea marcada como completada",
    });
  } catch (error) {
    console.error("Error al completar tarea:", error);
    res.status(500).json({
      error: "Error al actualizar el estado de la tarea",
    });
  }
});

app.delete("/tareas/:id", verificarAutenticacion, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `DELETE t
       FROM tarea t
       INNER JOIN materia m ON t.materia_id = m.id
       INNER JOIN periodo_escolar p ON m.periodo_id = p.id
       WHERE t.id = ? AND p.usuario_id = ?`,
      [id, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Tarea no encontrada",
      });
    }

    res.json({
      mensaje: "Tarea eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar tarea:", error);
    res.status(500).json({
      error: "Error al eliminar la tarea",
    });
  }
});

// ==========================================
// 4. ARCHIVO ADJUNTO
// ==========================================

app.get("/archivos", async (req, res) => {
  const { tarea_id } = req.query;
  try {
    let query = "SELECT * FROM archivo_adjunto";
    let params = [];
    if (tarea_id) {
      query += " WHERE tarea_id = ?";
      params.push(tarea_id);
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los archivos" });
  }
});

app.post("/archivos", async (req, res) => {
  const { tarea_id, nombre_archivo, ruta_storage, tipo_mime, tamano_bytes } =
    req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO archivo_adjunto (tarea_id, nombre_archivo, ruta_storage, tipo_mime, tamano_bytes) VALUES (?, ?, ?, ?, ?)",
      [tarea_id, nombre_archivo, ruta_storage, tipo_mime, tamano_bytes],
    );
    res.status(201).json({
      id: result.insertId,
      mensaje: "Archivo adjuntado correctamente",
    });
  } catch (error) {
    res.status(500).json({ error: "Error al guardar el archivo adjunto" });
  }
});

app.delete("/archivos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "DELETE FROM archivo_adjunto WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Archivo no encontrado" });
    res.json({ mensaje: "Archivo adjunto eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar el archivo" });
  }
});

// ==========================================
// RECORDATORIO
// ==========================================

app.get("/recordatorios", async (req, res) => {
  const { tarea_id } = req.query;
  try {
    let query = "SELECT * FROM recordatorio";
    let params = [];
    if (tarea_id) {
      query += " WHERE tarea_id = ?";
      params.push(tarea_id);
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener recordatorios" });
  }
});

app.post("/recordatorios", async (req, res) => {
  const { tarea_id, fecha_programada } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO recordatorio (tarea_id, fecha_programada) VALUES (?, ?)",
      [tarea_id, fecha_programada],
    );
    res
      .status(201)
      .json({ id: result.insertId, mensaje: "Recordatorio programado" });
  } catch (error) {
    res.status(500).json({ error: "Error al crear el recordatorio" });
  }
});

app.delete("/recordatorios/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM recordatorio WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Recordatorio no encontrado" });
    res.json({ mensaje: "Recordatorio eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar el recordatorio" });
  }
});

// ==========================================
// 6. NOTIFICACION
// ==========================================

app.get("/notificaciones", async (req, res) => {
  const { usuario_id } = req.query;
  try {
    let query = "SELECT * FROM notificacion";
    let params = [];
    if (usuario_id) {
      query += " WHERE usuario_id = ?";
      params.push(usuario_id);
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
});

app.post("/notificaciones", async (req, res) => {
  const { usuario_id, tarea_id, tipo, titulo, mensaje } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO notificacion (usuario_id, tarea_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?, ?)",
      [usuario_id, tarea_id || null, tipo, titulo, mensaje],
    );
    res
      .status(201)
      .json({ id: result.insertId, mensaje: "Notificación creada" });
  } catch (error) {
    res.status(500).json({ error: "Error al crear la notificación" });
  }
});

// Marcar notificación como leída
app.patch("/notificaciones/:id/leer", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "UPDATE notificacion SET leida = 1 WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Notificación no encontrada" });
    res.json({ mensaje: "Notificación marcada como leída" });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar la notificación" });
  }
});

app.delete("/notificaciones/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM notificacion WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Notificación no encontrada" });
    res.json({ mensaje: "Notificación eliminada" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar la notificación" });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
