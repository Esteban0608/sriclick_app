const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, name, company } = req.body;
    
    // 1. Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('El email ya está registrado', 400));
    }
    
    // 2. Crear nuevo usuario
    const newUser = await User.create({
      email,
      password,
      name,
      company
    });
    
    // 3. Generar token JWT
    const token = signToken(newUser._id);
    
    res.status(201).json({
      success: true,
      token,
      data: {
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          credits: newUser.credits
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // 1. Verificar email y contraseña
    if (!email || !password) {
      return next(new AppError('Por favor ingrese email y contraseña', 400));
    }
    
    // 2. Buscar usuario
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Email o contraseña incorrectos', 401));
    }
    
    // 3. Verificar si el usuario está activo
    if (!user.active) {
      return next(new AppError('Su cuenta ha sido desactivada', 401));
    }
    
    // 4. Generar token JWT
    const token = signToken(user._id);
    
    res.status(200).json({
      success: true,
      token,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          credits: user.credits
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
