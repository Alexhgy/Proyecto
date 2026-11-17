const supabase = require("../config/supabase");

const verificarAutenticacion = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Comprobar que exista el encabezado Bearer
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No se proporcionó un token de autenticación",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Token de autenticación vacío",
      });
    }

    // Verificar el token con Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error("Error original de Supabase:", {
        message: error?.message,
        status: error?.status,
        code: error?.code,
      });
      return res.status(401).json({
        error: "Token inválido o sesión expirada",
      });
    }

    // Guardar la identidad verificada para los controladores
    req.user = {
      id: data.user.id,
      email: data.user.email,
    };

    next();
  } catch (error) {
    console.error("Error al verificar autenticación:", error);

    return res.status(503).json({
      error: "No fue posible verificar la autenticación",
    });
  }
};

module.exports = verificarAutenticacion;
1;
