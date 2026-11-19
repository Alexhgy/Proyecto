require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const pool = require("./db");

const verificarAutenticacion = require("./middlewares/auth.middleware");
const supabaseStorage = require("./config/supabaseStorage");
const upload = require("./middlewares/upload.middleware");

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

app.get("/archivos", verificarAutenticacion, async (req, res) => {
  const { tarea_id } = req.query;

  try {
    let query = `
      SELECT a.*
      FROM archivo_adjunto a
      INNER JOIN tarea t ON a.tarea_id = t.id
      INNER JOIN materia m ON t.materia_id = m.id
      INNER JOIN periodo_escolar p ON m.periodo_id = p.id
      WHERE p.usuario_id = ?
    `;

    const params = [req.user.id];

    if (tarea_id) {
      query += " AND a.tarea_id = ?";
      params.push(tarea_id);
    }

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener archivos:", error);
    res.status(500).json({
      error: "Error al obtener los archivos",
    });
  }
});

app.get("/archivos/:id/descargar", verificarAutenticacion, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Buscar el archivo y verificar que pertenezca al usuario
    const [archivos] = await pool.query(
      `SELECT a.id, a.nombre_archivo, a.ruta_storage, a.tipo_mime
         FROM archivo_adjunto a
         INNER JOIN tarea t ON a.tarea_id = t.id
         INNER JOIN materia m ON t.materia_id = m.id
         INNER JOIN periodo_escolar p ON m.periodo_id = p.id
         WHERE a.id = ? AND p.usuario_id = ?`,
      [id, req.user.id],
    );

    if (archivos.length === 0) {
      return res.status(404).json({
        error: "Archivo adjunto no encontrado",
      });
    }

    const archivo = archivos[0];

    // 2. Generar URL firmada con vigencia de 60 segundos
    const { data, error } = await supabaseStorage.storage
      .from("archivos-academicos")
      .createSignedUrl(archivo.ruta_storage, 60, {
        download: archivo.nombre_archivo,
      });

    if (error) {
      console.error("Error al generar URL firmada:", error);

      return res.status(500).json({
        error: "No fue posible generar el enlace de descarga",
      });
    }

    // 3. Devolver información y URL al frontend
    res.json({
      mensaje: "Enlace de descarga generado correctamente",
      archivo: {
        id: archivo.id,
        nombre_archivo: archivo.nombre_archivo,
        tipo_mime: archivo.tipo_mime,
        url: data.signedUrl,
        expira_en_segundos: 60,
      },
    });
  } catch (error) {
    console.error("Error al generar enlace de descarga:", error);

    res.status(500).json({
      error: "Error al generar el enlace de descarga",
    });
  }
});

app.post(
  "/archivos",
  verificarAutenticacion,
  (req, res, next) => {
    upload.single("archivo")(req, res, (error) => {
      if (error) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            error: "El archivo supera el límite de 5 MiB",
          });
        }

        return res.status(400).json({
          error: error.message || "Error al recibir el archivo",
        });
      }

      next();
    });
  },
  async (req, res) => {
    const tarea_id = req.body?.tarea_id;

    try {
      // 1. Comprobar que se haya enviado un archivo
      if (!req.file) {
        return res.status(400).json({
          error: "No se proporcionó ningún archivo",
        });
      }

      if (!tarea_id) {
        return res.status(400).json({
          error: "Se requiere el ID de la tarea",
        });
      }

      // 2. Comprobar que la tarea pertenezca al usuario autenticado
      const [tareas] = await pool.query(
        `SELECT t.id
         FROM tarea t
         INNER JOIN materia m ON t.materia_id = m.id
         INNER JOIN periodo_escolar p ON m.periodo_id = p.id
         WHERE t.id = ? AND p.usuario_id = ?`,
        [tarea_id, req.user.id],
      );

      if (tareas.length === 0) {
        return res.status(404).json({
          error: "Tarea no encontrada",
        });
      }

      // 3. Generar identificadores y ruta del archivo
      const archivoId = crypto.randomUUID();
      const extension = require("path")
        .extname(req.file.originalname)
        .toLowerCase();

      const rutaStorage = `${req.user.id}/${tarea_id}/${archivoId}${extension}`;

      // 4. Subir archivo a Supabase Storage
      const { error: errorStorage } = await supabaseStorage.storage
        .from("archivos-academicos")
        .upload(rutaStorage, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (errorStorage) {
        console.error("Error al subir archivo:", errorStorage);

        return res.status(500).json({
          error: "No fue posible almacenar el archivo",
        });
      }

      // 5. Registrar los metadatos en MySQL
      try {
        const nombreArchivo = require("path")
          .basename(req.file.originalname)
          .slice(0, 255);

        await pool.query(
          `INSERT INTO archivo_adjunto
          (id, tarea_id, nombre_archivo, ruta_storage, tipo_mime, tamano_bytes)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            archivoId,
            tarea_id,
            nombreArchivo,
            rutaStorage,
            req.file.mimetype,
            req.file.size,
          ],
        );
      } catch (errorBD) {
        // Si falla MySQL, eliminar el archivo de Storage
        const { error: errorEliminacion } = await supabaseStorage.storage
          .from("archivos-academicos")
          .remove([rutaStorage]);

        if (errorEliminacion) {
          console.error(
            "No se pudo limpiar el archivo de Storage:",
            errorEliminacion,
          );
        }

        throw errorBD;
      }

      // 6. Responder al cliente
      res.status(201).json({
        mensaje: "Archivo adjuntado correctamente",
        archivo: {
          id: archivoId,
          tarea_id,
          nombre_archivo: req.file.originalname,
          tipo_mime: req.file.mimetype,
          tamano_bytes: req.file.size,
        },
      });
    } catch (error) {
      console.error("Error al adjuntar archivo:", error);

      res.status(500).json({
        error: "Error al guardar el archivo adjunto",
      });
    }
  },
);

app.delete("/archivos/:id", verificarAutenticacion, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Buscar el archivo y verificar su propietario
    const [archivos] = await pool.query(
      `SELECT a.id, a.ruta_storage
       FROM archivo_adjunto a
       INNER JOIN tarea t ON a.tarea_id = t.id
       INNER JOIN materia m ON t.materia_id = m.id
       INNER JOIN periodo_escolar p ON m.periodo_id = p.id
       WHERE a.id = ? AND p.usuario_id = ?`,
      [id, req.user.id],
    );

    if (archivos.length === 0) {
      return res.status(404).json({
        error: "Archivo adjunto no encontrado",
      });
    }

    const rutaStorage = archivos[0].ruta_storage;

    // 2. Eliminar el archivo de Supabase Storage
    const { error: errorStorage } = await supabaseStorage.storage
      .from("archivos-academicos")
      .remove([rutaStorage]);

    if (errorStorage) {
      console.error("Error al eliminar de Storage:", errorStorage);

      return res.status(500).json({
        error: "No fue posible eliminar el archivo almacenado",
      });
    }

    // 3. Eliminar el registro de MySQL
    const [result] = await pool.query(
      "DELETE FROM archivo_adjunto WHERE id = ?",
      [id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "No se encontró el registro del archivo",
      });
    }

    // 4. Responder al cliente
    res.json({
      mensaje: "Archivo adjunto eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar archivo:", error);

    res.status(500).json({
      error: "Error al eliminar el archivo adjunto",
    });
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
