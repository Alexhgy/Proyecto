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
       t.nombre AS tarea_nombre,
       t.fecha_limite,
       t.hora_limite,
       pu.correo
     FROM recordatorio r
     INNER JOIN tarea t ON r.tarea_id = t.id
     INNER JOIN materia m ON t.materia_id = m.id
     INNER JOIN periodo_escolar p ON m.periodo_id = p.id
     INNER JOIN perfil_usuario pu ON p.usuario_id = pu.id
     WHERE r.fecha_programada <= ?
       AND r.enviado_en IS NULL
       AND t.estado_realizacion = 'pendiente'
       AND pu.correo IS NOT NULL
       AND pu.correo <> ''`,
    [fechaActual],
  );

  for (const recordatorio of recordatorios) {
    try {
      const horaLimite = recordatorio.hora_limite || "23:59:00";

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
         SET enviado_en = NOW()
         WHERE id = ? AND enviado_en IS NULL`,
        [recordatorio.recordatorio_id],
      );

      console.log(`Recordatorio enviado: ${recordatorio.tarea_nombre}`);
    } catch (error) {
      console.error(
        `Error al enviar el recordatorio ${recordatorio.recordatorio_id}:`,
        error,
      );
    }
  }
};

module.exports = enviarRecordatoriosPendientes;
