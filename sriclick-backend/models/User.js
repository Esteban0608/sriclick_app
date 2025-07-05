const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Por favor proporciona un email válido'
    ]
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false // No incluir en consultas por defecto
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'professional', 'unlimited'],
    default: 'free'
  },
  creditsUsed: {
    type: Number,
    default: 0,
    min: [0, 'Los créditos usados no pueden ser negativos']
  },
  creditsTotal: {
    type: mongoose.Schema.Types.Mixed, // Puede ser número o 'Ilimitados'
    default: 3000
  },
  expiry: {
    type: Date,
    default: function() {
      // 30 días desde la creación para plan gratuito
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLogin: {
    type: Date
  },
  preferences: {
    downloadPath: {
      type: String,
      default: 'Downloads'
    },
    autoDownload: {
      type: Boolean,
      default: false
    },
    notifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'es'
    }
  },
  sriCredentials: {
    ruc: {
      type: String,
      trim: true
    },
    username: {
      type: String,
      trim: true
    },
    // Nota: La contraseña del SRI se debe encriptar antes de guardar
    encryptedPassword: {
      type: String
    },
    lastSync: {
      type: Date
    }
  },
  statistics: {
    totalDownloads: {
      type: Number,
      default: 0
    },
    totalInvoices: {
      type: Number,
      default: 0
    },
    lastDownloadDate: {
      type: Date
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar rendimiento
userSchema.index({ email: 1 });
userSchema.index({ plan: 1 });
userSchema.index({ expiry: 1 });
userSchema.index({ status: 1 });

// Virtual para créditos restantes
userSchema.virtual('creditsRemaining').get(function() {
  if (this.creditsTotal === 'Ilimitados' || this.plan === 'unlimited') {
    return 'Ilimitados';
  }
  return Math.max(0, this.creditsTotal - this.creditsUsed);
});

// Virtual para verificar si el plan está activo
userSchema.virtual('isPlanActive').get(function() {
  if (this.plan === 'free') {
    return true; // Plan gratuito siempre activo
  }
  return this.expiry && new Date() < this.expiry;
});

// Virtual para días restantes del plan
userSchema.virtual('daysRemaining').get(function() {
  if (!this.expiry) return 0;
  const now = new Date();
  const expiry = new Date(this.expiry);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Middleware pre-save para validaciones adicionales
userSchema.pre('save', function(next) {
  // Validar que los créditos usados no excedan el total
  if (typeof this.creditsTotal === 'number' && this.creditsUsed > this.creditsTotal) {
    return next(new Error('Los créditos usados no pueden exceder el total'));
  }
  
  // Actualizar estadísticas si es necesario
  if (this.isModified('creditsUsed')) {
    this.statistics.totalDownloads = this.creditsUsed;
  }
  
  next();
});

// Método para verificar si puede usar créditos
userSchema.methods.canUseCredits = function(amount = 1) {
  if (this.plan === 'unlimited' || this.creditsTotal === 'Ilimitados') {
    return true;
  }
  return (this.creditsUsed + amount) <= this.creditsTotal;
};

// Método para usar créditos
userSchema.methods.useCredits = async function(amount = 1) {
  if (!this.canUseCredits(amount)) {
    throw new Error('Créditos insuficientes');
  }
  
  if (this.plan !== 'unlimited' && this.creditsTotal !== 'Ilimitados') {
    this.creditsUsed += amount;
    this.statistics.totalDownloads += amount;
    this.statistics.lastDownloadDate = new Date();
    await this.save();
  }
  
  return true;
};

// Método para renovar plan
userSchema.methods.renewPlan = function(planType, duration = 365) {
  const plans = {
    free: { credits: 3000, duration: 30 },
    basic: { credits: 12000, duration: 365 },
    professional: { credits: 75000, duration: 365 },
    unlimited: { credits: 'Ilimitados', duration: 365 }
  };
  
  const plan = plans[planType];
  if (!plan) {
    throw new Error('Tipo de plan no válido');
  }
  
  this.plan = planType;
  this.creditsTotal = plan.credits;
  this.creditsUsed = 0;
  this.expiry = new Date(Date.now() + (duration || plan.duration) * 24 * 60 * 60 * 1000);
  
  return this;
};

// Método estático para limpiar planes expirados
userSchema.statics.cleanExpiredPlans = async function() {
  const expiredUsers = await this.find({
    plan: { $ne: 'free' },
    expiry: { $lt: new Date() }
  });
  
  for (const user of expiredUsers) {
    user.renewPlan('free');
    await user.save();
  }
  
  return expiredUsers.length;
};

module.exports = mongoose.model('User', userSchema);

