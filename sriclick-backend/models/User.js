const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Email no válido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: 8,
    select: false
  },
  name: {
    type: String,
    required: [true, 'El nombre es requerido']
  },
  company: String,
  credits: {
    remaining: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    plan: { type: String, enum: ['free', 'basic', 'professional', 'unlimited'], default: null },
    expiry: Date
  },
  devices: [{
    fingerprint: String,
    lastAccess: Date
  }],
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Hash de contraseña antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Método para verificar contraseña
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
