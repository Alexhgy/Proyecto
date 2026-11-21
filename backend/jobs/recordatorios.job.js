const cron = require("node-cron");
const enviarRecordatoriosPendientes = require("../services/recordatorios.service");

let ejecutando = false;

const iniciarRecordatorios = () => {
  cron.schedule(
    "* * * * *",
    async () => {
      if (ejecutando) return;

      ejecutando = true;

      try {
        await enviarRecordatoriosPendientes();
      } catch (error) {
        console.error("Error en el proceso de recordatorios:", error);
      } finally {
        ejecutando = false;
      }
    },
    {
      timezone: "America/Mexico_City",
    },
  );

  console.log("Proceso automático de recordatorios iniciado");
};

module.exports = iniciarRecordatorios;
