const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Proteger rutas - verificar JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Verificar si el token existe en los headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Extraer token del header Authorization: Bearer <token>
      token = req.headers.authorization.split(' ')[1];
    }

    // Verificar si no hay token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado, token requerido'
      });
    }

    try {
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Buscar usuario por ID del token
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No autorizado, usuario no encontrado'
        });
      }

      // Verificar si la cuenta está activa
      if (user.status === 'inactive') {
        return res.status(401).json({
          success: false,
          message: 'Cuenta desactivada'
        });
      }

      // Verificar si el plan ha expirado
      if (user.expiry && new Date() > user.expiry) {
        // Actualizar plan a gratuito si ha expirado
        user.plan = 'free';
        user.creditsTotal = 3000;
        user.creditsUsed = 0;
        user.expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días más
        await user.save();
      }

      // Añadir usuario a la request
      req.user = user;
      next();

    } catch (error) {
      console.error('Error verificando token:', error);
      return res.status(401).json({
        success: false,
        message: 'No autorizado, token inválido'
      });
    }

  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Verificar si el usuario tiene créditos suficientes
const checkCredits = (creditsRequired = 1) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // Si es plan ilimitado, permitir
      if (user.plan === 'unlimited' || user.creditsTotal === 'Ilimitados') {
        return next();
      }

      // Verificar créditos disponibles
      const creditsAvailable = user.creditsTotal - user.creditsUsed;

      if (creditsAvailable < creditsRequired) {
        return res.status(403).json({
          success: false,
          message: `Créditos insuficientes. Necesitas ${creditsRequired} créditos, tienes ${creditsAvailable}`,
          creditsRequired,
          creditsAvailable,
          upgradeRequired: true
        });
      }

      next();

    } catch (error) {
      console.error('Error verificando créditos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
};

// @desc    Verificar rol de usuario (admin, user, etc.)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Rol ${req.user.role} no autorizado para acceder a este recurso`
      });
    }
    next();
  };
};

// @desc    Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (user && user.status !== 'inactive') {
          req.user = user;
        }
      } catch (error) {
        // Token inválido, pero no fallar
        console.log('Token inválido en auth opcional:', error.message);
      }
    }

    next();

  } catch (error) {
    console.error('Error en auth opcional:', error);
    next(); // Continuar sin autenticación
  }
};

module.exports = {
  protect,
  checkCredits,
  authorize,
  optionalAuth
};

