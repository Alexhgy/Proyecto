const multer = require("multer");
const path = require("path");

const tiposPermitidos = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".txt": "text/plain",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const almacenamiento = multer.memoryStorage();

const filtroArchivos = (req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const tipoMimeEsperado = tiposPermitidos[extension];

  if (!tipoMimeEsperado || file.mimetype !== tipoMimeEsperado) {
    return callback(new Error("Formato de archivo no permitido"), false);
  }

  callback(null, true);
};

const upload = multer({
  storage: almacenamiento,
  fileFilter: filtroArchivos,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;
