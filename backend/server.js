require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const pool = require("./db");

const verificarAutenticacion = require("./middlewares/auth.middleware");
const supabaseStorage = require("./config/supabaseStorage");
const upload = require("./middlewares/upload.middleware");
const iniciarRecordatorios = require("./jobs/recordatorios.job");

const app = express();
const port = 3000;

const calcularFechaProgramada = (fecha, hora) => {
  const fechaValida = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);

  if (!fechaValida) {
    throw new Error("La fecha límite debe tener formato YYYY-MM-DD");
  }

  const [, anio, mes, dia] = fechaValida;

  // Comprobar que la fecha realmente exista.
  const comprobacion = new Date(
    Date.UTC(Number(anio), Number(mes) - 1, Number(dia)),
  );

  if (
    comprobacion.getUTCFullYear() !== Number(anio) ||
    comprobacion.getUTCMonth() !== Number(mes) - 1 ||
    comprobacion.getUTCDate() !== Number(dia)
  ) {
    throw new Error("La fecha límite no es válida");
  }

  const horaEfectiva = hora || "23:59:00";

  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(horaEfectiva)) {
    throw new Error("La hora límite no es válida");
  }

  // Interpretar la fecha y hora como horario de Ciudad de México.
  const horaCompleta =
    horaEfectiva.length === 5 ? `${horaEfectiva}:00` : horaEfectiva;

  const vencimiento = new Date(`${fecha}T${horaCompleta}-06:00`);

  // Restar exactamente 24 horas.
  const fechaRecordatorio = new Date(
    vencimiento.getTime() - 24 * 60 * 60 * 1000,
  );

  // No programar recordatorios cuyo momento ya pasó.
  if (fechaRecordatorio.getTime() <= Date.now()) {
    return null;
  }

  // Convertir el instante calculado a fecha y hora local de CDMX.
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fechaRecordatorio);

  const valores = {};

  for (const parte of partes) {
    if (parte.type !== "literal") {
      valores[parte.type] = parte.value;
    }
  }

  return `${valores.year}-${valores.month}-${valores.day} ${valores.hour}:${valores.minute}:${valores.second}`;
};

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

  const estadoFinal = estado_realizacion ?? "pendiente";

  // Calcular el recordatorio antes de iniciar la transacción.
  let fechaProgramada = null;

  if (estadoFinal === "pendiente") {
    try {
      fechaProgramada = calcularFechaProgramada(fecha_limite, hora_limite);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }

  let connection;
  let transaccionIniciada = false;

  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();
    transaccionIniciada = true;

    // Comprobar que la materia pertenece al usuario.
    const [materias] = await connection.query(
      `SELECT m.id
       FROM materia m
       INNER JOIN periodo_escolar p ON m.periodo_id = p.id
       WHERE m.id = ? AND p.usuario_id = ?`,
      [materia_id, req.user.id],
    );

    if (materias.length === 0) {
      await connection.rollback();
      transaccionIniciada = false;

      return res.status(404).json({
        error: "Materia no encontrada",
      });
    }

    // Crear la tarea.
    await connection.query(
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
        estadoFinal,
        estado_repaso ?? "pendiente",
      ],
    );

    // Crear el recordatorio cuando corresponda.
    if (fechaProgramada !== null) {
      const recordatorioId = crypto.randomUUID();

      await connection.query(
        `INSERT INTO recordatorio (
          id,
          tarea_id,
          fecha_programada
        ) VALUES (?, ?, ?)`,
        [recordatorioId, nuevoId, fechaProgramada],
      );
    }

    // Confirmar ambas operaciones.
    await connection.commit();
    transaccionIniciada = false;

    res.status(201).json({
      id: nuevoId,
      mensaje: "Tarea creada con éxito",
      recordatorio_creado: fechaProgramada !== null,
      fecha_programada: fechaProgramada,
    });
  } catch (error) {
    if (connection && transaccionIniciada) {
      await connection.rollback();
    }

    console.error("Error al crear tarea:", error);

    res.status(500).json({
      error: "Error al crear la tarea",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Ruta específica para marcar tarea como completada

app.patch("/tareas/:id/completar", verificarAutenticacion, async (req, res) => {
  const { id } = req.params;

  let connection;
  let transaccionIniciada = false;

  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();
    transaccionIniciada = true;

    const [result] = await connection.query(
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
      await connection.rollback();
      transaccionIniciada = false;

      return res.status(404).json({
        error: "Tarea no encontrada",
      });
    }

    const [recordatoriosEliminados] = await connection.query(
      `DELETE FROM recordatorio
       WHERE tarea_id = ?
       AND enviado_en IS NULL`,
      [id],
    );

    await connection.commit();
    transaccionIniciada = false;

    res.json({
      mensaje: "Tarea marcada como completada",
      recordatorio_cancelado: recordatoriosEliminados.affectedRows > 0,
    });
  } catch (error) {
    if (connection && transaccionIniciada) {
      await connection.rollback();
    }

    console.error("Error al completar tarea:", error);

    res.status(500).json({
      error: "Error al actualizar el estado de la tarea",
    });
  } finally {
    if (connection) {
      connection.release();
    }
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
// ARCHIVO ADJUNTO - Pruebas completadas
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
// RECORDATORIO - Pruebas completadas - Falta enviarlo al correo
// ==========================================

app.get("/recordatorios", verificarAutenticacion, async (req, res) => {
  const { tarea_id } = req.query;

  try {
    let query = `
      SELECT r.*
      FROM recordatorio r
      INNER JOIN tarea t ON r.tarea_id = t.id
      INNER JOIN materia m ON t.materia_id = m.id
      INNER JOIN periodo_escolar p ON m.periodo_id = p.id
      WHERE p.usuario_id = ?
    `;

    const params = [req.user.id];

    if (tarea_id) {
      query += " AND r.tarea_id = ?";
      params.push(tarea_id);
    }

    query += " ORDER BY r.fecha_programada ASC";

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener recordatorios:", error);

    res.status(500).json({
      error: "Error al obtener recordatorios",
    });
  }
});

app.post("/recordatorios", verificarAutenticacion, async (req, res) => {
  const tarea_id = req.body?.tarea_id;
  const fecha_programada = req.body?.fecha_programada;

  try {
    // 1. Validar los datos recibidos
    if (!tarea_id || !fecha_programada) {
      return res.status(400).json({
        error: "Se requiere tarea_id y fecha_programada",
      });
    }

    if (isNaN(Date.parse(fecha_programada))) {
      return res.status(400).json({
        error: "La fecha programada no es válida",
      });
    }

    // 2. Verificar que la tarea pertenezca al usuario
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

    // 3. Generar ID e insertar recordatorio
    const recordatorioId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO recordatorio
       (id, tarea_id, fecha_programada)
       VALUES (?, ?, ?)`,
      [recordatorioId, tarea_id, fecha_programada],
    );

    res.status(201).json({
      id: recordatorioId,
      tarea_id,
      fecha_programada,
      mensaje: "Recordatorio programado correctamente",
    });
  } catch (error) {
    console.error("Error al crear recordatorio:");
    console.error("Código:", error.code);
    console.error("Mensaje:", error.message);
    console.error("SQL:", error.sqlMessage);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "Esta tarea ya tiene un recordatorio programado",
      });
    }

    res.status(500).json({
      error: "Error al crear el recordatorio",
    });
  }
});

app.delete("/recordatorios/:id", verificarAutenticacion, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `DELETE r
         FROM recordatorio r
         INNER JOIN tarea t ON r.tarea_id = t.id
         INNER JOIN materia m ON t.materia_id = m.id
         INNER JOIN periodo_escolar p ON m.periodo_id = p.id
         WHERE r.id = ? AND p.usuario_id = ?`,
      [id, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Recordatorio no encontrado",
      });
    }

    res.json({
      mensaje: "Recordatorio eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar recordatorio:", error);

    res.status(500).json({
      error: "Error al eliminar el recordatorio",
    });
  }
});

// ==========================================
// NOTIFICACION - Pruebas completadas
// ==========================================

app.get("/notificaciones", verificarAutenticacion, async (req, res) => {
  const { leida } = req.query;

  try {
    let query = `
      SELECT *
      FROM notificacion
      WHERE usuario_id = ?
    `;

    const params = [req.user.id];

    if (leida !== undefined) {
      if (leida !== "0" && leida !== "1") {
        return res.status(400).json({
          error: "El filtro leida debe ser 0 o 1",
        });
      }

      query += " AND leida = ?";
      params.push(Number(leida));
    }

    query += " ORDER BY creada_en DESC";

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);

    res.status(500).json({
      error: "Error al obtener las notificaciones",
    });
  }
});

app.post("/notificaciones", verificarAutenticacion, async (req, res) => {
  const { tarea_id, tipo, titulo, mensaje } = req.body || {};

  try {
    // 1. Validar los campos obligatorios
    if (!tipo || !titulo || !mensaje) {
      return res.status(400).json({
        error: "Se requieren tipo, titulo y mensaje",
      });
    }

    if (!["recordatorio", "aviso"].includes(tipo)) {
      return res.status(400).json({
        error: "Tipo de notificación no válido",
      });
    }

    if (
      typeof titulo !== "string" ||
      titulo.trim().length === 0 ||
      titulo.length > 150
    ) {
      return res.status(400).json({
        error: "El título debe tener entre 1 y 150 caracteres",
      });
    }

    if (typeof mensaje !== "string" || mensaje.trim().length === 0) {
      return res.status(400).json({
        error: "El mensaje no puede estar vacío",
      });
    }

    // 2. Verificar la propiedad de la tarea, si se proporcionó
    if (tarea_id) {
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
    }

    // 3. Crear la notificación
    const notificacionId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO notificacion
       (id, usuario_id, tarea_id, tipo, titulo, mensaje)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        notificacionId,
        req.user.id,
        tarea_id || null,
        tipo,
        titulo.trim(),
        mensaje.trim(),
      ],
    );

    res.status(201).json({
      id: notificacionId,
      mensaje: "Notificación creada correctamente",
    });
  } catch (error) {
    console.error("Error al crear notificación:", error);

    res.status(500).json({
      error: "Error al crear la notificación",
    });
  }
});

// Marcar notificación como leída
app.patch(
  "/notificaciones/:id/leida",
  verificarAutenticacion,
  async (req, res) => {
    const { id } = req.params;

    try {
      const [result] = await pool.query(
        `UPDATE notificacion
         SET leida = TRUE
         WHERE id = ? AND usuario_id = ?`,
        [id, req.user.id],
      );

      if (result.affectedRows === 0) {
        // Comprobar si existe, pero ya estaba leída
        const [rows] = await pool.query(
          `SELECT id
           FROM notificacion
           WHERE id = ? AND usuario_id = ?`,
          [id, req.user.id],
        );

        if (rows.length === 0) {
          return res.status(404).json({
            error: "Notificación no encontrada",
          });
        }
      }

      res.json({
        mensaje: "Notificación marcada como leída",
      });
    } catch (error) {
      console.error("Error al actualizar notificación:", error);

      res.status(500).json({
        error: "Error al marcar la notificación como leída",
      });
    }
  },
);

app.delete("/notificaciones/:id", verificarAutenticacion, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `DELETE FROM notificacion
         WHERE id = ? AND usuario_id = ?`,
      [id, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Notificación no encontrada",
      });
    }

    res.json({
      mensaje: "Notificación eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar notificación:", error);

    res.status(500).json({
      error: "Error al eliminar la notificación",
    });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor ejecutándose en el puerto ${port}`);
  iniciarRecordatorios();
});
