const mongoose = require('mongoose');
const validator = require('validator');

const paymentSchema = new mongoose.Schema({
  // Referencia al usuario
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El pago debe estar asociado a un usuario']
  },

  // Detalles del plan
  plan: {
    type: String,
    enum: ['free', 'basic', 'professional', 'unlimited'],
    required: [true, 'Debe especificar un plan']
  },

  // Monto y método de pago
  amount: {
    type: Number,
    required: [true, 'El monto es requerido'],
    min: [0, 'El monto no puede ser negativo']
  },
  method: {
    type: String,
    enum: ['credit_card', 'bank_transfer', 'deposit', 'free'],
    required: [true, 'El método de pago es requerido']
  },

  // Datos de transacción
  transactionId: {
    type: String,
    required: [true, 'El ID de transacción es requerido'],
    unique: true
  },
  receiptNumber: {
    type: String,
    validate: {
      validator: function(v) {
        return /^[A-Z0-9]{8,20}$/.test(v);
      },
      message: 'Número de comprobante inválido'
    }
  },

  // Estados y fechas
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: [true, 'La fecha de expiración es requerida']
  },

  // Datos de tarjeta (opcional, solo si aplica)
  cardLastFour: {
    type: String,
    validate: {
      validator: function(v) {
        return /^\d{4}$/.test(v);
      },
      message: 'Últimos 4 dígitos de tarjeta inválidos'
    },
    select: false
  }
}, {
  timestamps: true, // Crea createdAt y updatedAt automáticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejor rendimiento
paymentSchema.index({ user: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true });
paymentSchema.index({ status: 1 });
paymentSchema.index({ expiryDate: 1 });

// Validación personalizada: Plan free debe tener amount = 0
paymentSchema.pre('validate', function(next) {
  if (this.plan === 'free' && this.amount !== 0) {
    this.invalidate('amount', 'El plan gratuito debe tener monto cero', this.amount);
  }
  next();
});

// Método para verificar si el pago está activo
paymentSchema.methods.isActive = function() {
  return this.status === 'completed' && new Date() < this.expiryDate;
};

// Virtual: Días restantes del plan
paymentSchema.virtual('remainingDays').get(function() {
  const diff = this.expiryDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
