const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    // 1. Obtener token
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Acceso no autorizado', 401);
    }

    // 2. Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Obtener usuario
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      throw new AppError('El usuario ya no existe', 401);
    }

    // 4. Guardar usuario en la request
    req.user = currentUser;
    next();

  } catch (err) {
    next(err);
  }
};
