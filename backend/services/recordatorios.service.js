const crypto = require("crypto");
const pool = require("../db");
const transporter = require("../config/mailer");

const obtenerFechaActualCDMX = () => {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const valores = {};

  for (const parte of partes) {
    if (parte.type !== "literal") {
      valores[parte.type] = parte.value;
    }
  }

  return `${valores.year}-${valores.month}-${valores.day} ${valores.hour}:${valores.minute}:${valores.second}`;
};

const enviarRecordatoriosPendientes = async () => {
  const fechaActual = obtenerFechaActualCDMX();

  const [recordatorios] = await pool.query(
    `SELECT
        r.id AS recordatorio_id,
        r.notificacion_generada_en,
        r.enviado_en,
        t.id AS tarea_id,
        t.nombre AS tarea_nombre,
        t.fecha_limite,
        t.hora_limite,
        p.usuario_id,
        pu.correo,
        pu.recibir_recordatorios
     FROM recordatorio r
     INNER JOIN tarea t ON r.tarea_id = t.id
     INNER JOIN materia m ON t.materia_id = m.id
     INNER JOIN periodo_escolar p ON m.periodo_id = p.id
     INNER JOIN perfil_usuario pu ON p.usuario_id = pu.id
     WHERE r.fecha_programada <= ?
       AND t.estado_realizacion = 'pendiente'
       AND (
         r.notificacion_generada_en IS NULL
         OR (
           pu.recibir_recordatorios = 1
           AND r.enviado_en IS NULL
         )
       )`,
    [fechaActual],
  );

  for (const recordatorio of recordatorios) {
    const horaLimite = recordatorio.hora_limite || "23:59:00";

    // 1. Generar siempre la notificación interna.
    if (!recordatorio.notificacion_generada_en) {
      const conexion = await pool.getConnection();

      try {
        await conexion.beginTransaction();

        const [resultado] = await conexion.query(
          `UPDATE recordatorio
           SET notificacion_generada_en = ?
           WHERE id = ?
             AND notificacion_generada_en IS NULL`,
          [fechaActual, recordatorio.recordatorio_id],
        );

        if (resultado.affectedRows > 0) {
          const notificacionId = crypto.randomUUID();

          await conexion.query(
            `INSERT INTO notificacion
             (id, usuario_id, tarea_id, tipo, titulo, mensaje)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              notificacionId,
              recordatorio.usuario_id,
              recordatorio.tarea_id,
              "recordatorio",
              "Recordatorio de tarea pendiente",
              `Tienes pendiente la tarea "${recordatorio.tarea_nombre}". Su fecha límite es ${recordatorio.fecha_limite} a las ${horaLimite}.`,
            ],
          );
        }

        await conexion.commit();

        console.log(
          `Notificación interna procesada: ${recordatorio.tarea_nombre}`,
        );
      } catch (error) {
        await conexion.rollback();
        console.error(
          `Error al generar la notificación interna ${recordatorio.recordatorio_id}:`,
          error,
        );

        continue;
      } finally {
        conexion.release();
      }
    }

    // 2. Enviar el correo solamente si el usuario lo permite.
    if (
      Number(recordatorio.recibir_recordatorios) === 1 &&
      !recordatorio.enviado_en &&
      recordatorio.correo
    ) {
      try {
        await transporter.sendMail({
          from: `"Gestor Académico" <${process.env.EMAIL_USER}>`,
          to: recordatorio.correo,
          subject: "Recordatorio de tarea pendiente",
          text: `Tienes una tarea pendiente: ${recordatorio.tarea_nombre}.

Fecha límite: ${recordatorio.fecha_limite}
Hora límite: ${horaLimite}

Ingresa a tu Gestor Académico para consultar los detalles.`,
        });

        await pool.query(
          `UPDATE recordatorio
           SET enviado_en = ?
           WHERE id = ?
             AND enviado_en IS NULL`,
          [fechaActual, recordatorio.recordatorio_id],
        );

        console.log(`Correo enviado: ${recordatorio.tarea_nombre}`);
      } catch (error) {
        console.error(
          `Error al enviar el correo del recordatorio ${recordatorio.recordatorio_id}:`,
          error,
        );
      }
    }
  }
};

module.exports = enviarRecordatoriosPendientes;
