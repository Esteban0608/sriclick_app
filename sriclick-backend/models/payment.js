const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido']
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'professional', 'unlimited'],
    required: [true, 'El plan es requerido']
  },
  amount: {
    type: Number,
    required: [true, 'El monto es requerido'],
    min: [0, 'El monto no puede ser negativo']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR']
  },
  paymentMethod: {
    type: String,
    required: [true, 'El método de pago es requerido'],
    enum: ['creditCard', 'transfer', 'deposit', 'free', 'paypal', 'stripe']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded', 'pending_verification'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    required: [true, 'El ID de transacción es requerido'],
    unique: true
  },
  externalTransactionId: {
    type: String, // ID del procesador de pagos externo
    sparse: true
  },
  paymentData: {
    // Datos específicos del método de pago (encriptados)
    cardLast4: String, // Últimos 4 dígitos de la tarjeta
    cardBrand: String, // Visa, Mastercard, etc.
    receiptNumber: String, // Para transferencias/depósitos
    bankReference: String,
    paypalEmail: String,
    // No guardar datos sensibles como números completos de tarjeta
  },
  billingInfo: {
    name: String,
    email: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    }
  },
  planDetails: {
    credits: mongoose.Schema.Types.Mixed, // Número o 'Ilimitados'
    duration: Number, // Días
    features: [String]
  },
  processedAt: {
    type: Date
  },
  failureReason: {
    type: String
  },
  refundInfo: {
    refundedAt: Date,
    refundAmount: Number,
    refundReason: String,
    refundTransactionId: String
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['extension', 'web', 'mobile', 'api'],
      default: 'extension'
    }
  },
  notifications: {
    emailSent: {
      type: Boolean,
      default: false
    },
    emailSentAt: Date,
    webhookSent: {
      type: Boolean,
      default: false
    },
    webhookSentAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar rendimiento
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ plan: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual para verificar si el pago está completado
paymentSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// Virtual para verificar si el pago está pendiente
paymentSchema.virtual('isPending').get(function() {
  return ['pending', 'pending_verification'].includes(this.status);
});

// Virtual para obtener descripción del plan
paymentSchema.virtual('planDescription').get(function() {
  const descriptions = {
    free: 'Plan Gratuito - 3,000 créditos por 30 días',
    basic: 'Plan Básico - 12,000 créditos por 1 año',
    professional: 'Plan Profesional - 75,000 créditos por 1 año',
    unlimited: 'Plan Ilimitado - Créditos ilimitados por 1 año'
  };
  return descriptions[this.plan] || 'Plan desconocido';
});

// Middleware pre-save para validaciones
paymentSchema.pre('save', function(next) {
  // Generar transactionId si no existe
  if (!this.transactionId) {
    this.transactionId = `${this.paymentMethod}_${Date.now()}_${this.user}`;
  }
  
  // Establecer processedAt cuando el estado cambia a completed
  if (this.isModified('status') && this.status === 'completed' && !this.processedAt) {
    this.processedAt = new Date();
  }
  
  // Validar que el monto sea consistente con el plan
  if (this.isNew) {
    const planPrices = {
      free: 0,
      basic: 40,
      professional: 75,
      unlimited: 100
    };
    
    const expectedAmount = planPrices[this.plan];
    if (expectedAmount !== undefined && this.amount !== expectedAmount) {
      return next(new Error(`El monto ${this.amount} no coincide con el precio del plan ${this.plan} ($${expectedAmount})`));
    }
  }
  
  next();
});

// Método para marcar como completado
paymentSchema.methods.markAsCompleted = async function(externalTransactionId = null) {
  this.status = 'completed';
  this.processedAt = new Date();
  if (externalTransactionId) {
    this.externalTransactionId = externalTransactionId;
  }
  await this.save();
  return this;
};

// Método para marcar como fallido
paymentSchema.methods.markAsFailed = async function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  await this.save();
  return this;
};

// Método para procesar reembolso
paymentSchema.methods.processRefund = async function(amount = null, reason = '') {
  if (this.status !== 'completed') {
    throw new Error('Solo se pueden reembolsar pagos completados');
  }
  
  const refundAmount = amount || this.amount;
  
  if (refundAmount > this.amount) {
    throw new Error('El monto del reembolso no puede ser mayor al monto original');
  }
  
  this.status = 'refunded';
  this.refundInfo = {
    refundedAt: new Date(),
    refundAmount,
    refundReason: reason,
    refundTransactionId: `refund_${this.transactionId}_${Date.now()}`
  };
  
  await this.save();
  return this;
};

// Método estático para obtener estadísticas de pagos
paymentSchema.statics.getPaymentStats = async function(dateFrom, dateTo) {
  const match = {};
  
  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
    if (dateTo) match.createdAt.$lte = new Date(dateTo);
  }
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        completedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        completedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
        },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);
  
  return stats[0] || {
    totalPayments: 0,
    totalAmount: 0,
    completedPayments: 0,
    completedAmount: 0,
    avgAmount: 0
  };
};

// Método estático para obtener pagos por plan
paymentSchema.statics.getPaymentsByPlan = async function(dateFrom, dateTo) {
  const match = { status: 'completed' };
  
  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
    if (dateTo) match.createdAt.$lte = new Date(dateTo);
  }
  
  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
};

module.exports = mongoose.model('Payment', paymentSchema);

