const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido']
  },
  number: {
    type: String,
    required: [true, 'El número de factura es requerido'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'El tipo de documento es requerido'],
    enum: ['factura', 'nota_credito', 'nota_debito', 'comprobante_retencion', 'guia_remision'],
    default: 'factura'
  },
  issueDate: {
    type: Date,
    required: [true, 'La fecha de emisión es requerida']
  },
  ruc: {
    type: String,
    required: [true, 'El RUC es requerido'],
    trim: true,
    match: [/^\d{13}$/, 'El RUC debe tener 13 dígitos']
  },
  businessName: {
    type: String,
    required: [true, 'La razón social es requerida'],
    trim: true,
    maxlength: [300, 'La razón social no puede exceder 300 caracteres']
  },
  address: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  subtotal: {
    type: Number,
    required: [true, 'El subtotal es requerido'],
    min: [0, 'El subtotal no puede ser negativo']
  },
  iva: {
    type: Number,
    required: [true, 'El IVA es requerido'],
    min: [0, 'El IVA no puede ser negativo']
  },
  total: {
    type: Number,
    required: [true, 'El total es requerido'],
    min: [0, 'El total no puede ser negativo']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR']
  },
  status: {
    type: String,
    enum: ['downloaded', 'processed', 'exported', 'archived', 'error'],
    default: 'downloaded'
  },
  downloadDate: {
    type: Date,
    default: Date.now
  },
  sriData: {
    accessKey: {
      type: String,
      required: [true, 'La clave de acceso es requerida'],
      unique: true,
      length: [49, 'La clave de acceso debe tener 49 caracteres']
    },
    authorizationDate: {
      type: Date
    },
    authorizationNumber: {
      type: String
    },
    environment: {
      type: String,
      enum: ['PRUEBAS', 'PRODUCCION'],
      default: 'PRODUCCION'
    },
    emission: {
      type: String,
      enum: ['NORMAL', 'CONTINGENCIA'],
      default: 'NORMAL'
    },
    xmlPath: {
      type: String // Ruta donde se guardó el XML
    },
    pdfPath: {
      type: String // Ruta donde se guardó el PDF
    }
  },
  items: [{
    code: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      required: [true, 'La descripción del item es requerida'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'La cantidad es requerida'],
      min: [0, 'La cantidad no puede ser negativa']
    },
    unitPrice: {
      type: Number,
      required: [true, 'El precio unitario es requerido'],
      min: [0, 'El precio unitario no puede ser negativo']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'El descuento no puede ser negativo']
    },
    subtotal: {
      type: Number,
      required: [true, 'El subtotal del item es requerido']
    },
    taxes: [{
      code: String, // Código del impuesto
      rate: Number, // Tarifa del impuesto
      amount: Number // Monto del impuesto
    }]
  }],
  taxes: [{
    type: {
      type: String,
      enum: ['IVA', 'ICE', 'IRBPNR'],
      required: true
    },
    rate: {
      type: Number,
      required: true
    },
    base: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      required: true
    }
  }],
  additionalInfo: [{
    name: String,
    value: String
  }],
  relatedDocuments: [{
    type: String, // Tipo de documento relacionado
    number: String, // Número del documento
    date: Date // Fecha del documento
  }],
  exportInfo: {
    exportedAt: Date,
    exportFormat: {
      type: String,
      enum: ['excel', 'csv', 'pdf', 'xml']
    },
    exportPath: String
  },
  metadata: {
    downloadSource: {
      type: String,
      enum: ['manual', 'automatic', 'bulk'],
      default: 'manual'
    },
    processingTime: Number, // Tiempo en ms que tomó procesar
    fileSize: Number, // Tamaño del archivo en bytes
    checksum: String // Hash para verificar integridad
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar rendimiento
invoiceSchema.index({ user: 1, issueDate: -1 });
invoiceSchema.index({ 'sriData.accessKey': 1 });
invoiceSchema.index({ ruc: 1 });
invoiceSchema.index({ number: 1 });
invoiceSchema.index({ type: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ downloadDate: -1 });
invoiceSchema.index({ user: 1, type: 1, issueDate: -1 });

// Índice compuesto para búsquedas complejas
invoiceSchema.index({ 
  user: 1, 
  issueDate: -1, 
  type: 1, 
  status: 1 
});

// Virtual para obtener el año de emisión
invoiceSchema.virtual('issueYear').get(function() {
  return this.issueDate ? this.issueDate.getFullYear() : null;
});

// Virtual para obtener el mes de emisión
invoiceSchema.virtual('issueMonth').get(function() {
  return this.issueDate ? this.issueDate.getMonth() + 1 : null;
});

// Virtual para verificar si tiene archivos adjuntos
invoiceSchema.virtual('hasAttachments').get(function() {
  return !!(this.sriData.xmlPath || this.sriData.pdfPath);
});

// Virtual para obtener el nombre del archivo
invoiceSchema.virtual('fileName').get(function() {
  return `${this.type}_${this.number.replace(/[^a-zA-Z0-9]/g, '_')}_${this.ruc}`;
});

// Middleware pre-save para validaciones
invoiceSchema.pre('save', function(next) {
  // Validar que el total sea la suma del subtotal + IVA
  const calculatedTotal = Math.round((this.subtotal + this.iva) * 100) / 100;
  if (Math.abs(this.total - calculatedTotal) > 0.01) {
    return next(new Error('El total no coincide con la suma del subtotal + IVA'));
  }
  
  // Calcular subtotal de items si no está definido
  if (this.items && this.items.length > 0) {
    let itemsSubtotal = 0;
    this.items.forEach(item => {
      if (!item.subtotal) {
        item.subtotal = Math.round((item.quantity * item.unitPrice - item.discount) * 100) / 100;
      }
      itemsSubtotal += item.subtotal;
    });
    
    // Verificar que el subtotal coincida con la suma de items
    if (Math.abs(this.subtotal - itemsSubtotal) > 0.01) {
      console.warn(`Subtotal no coincide: factura ${this.subtotal}, items ${itemsSubtotal}`);
    }
  }
  
  next();
});

// Método para marcar como procesada
invoiceSchema.methods.markAsProcessed = async function() {
  this.status = 'processed';
  await this.save();
  return this;
};

// Método para marcar como exportada
invoiceSchema.methods.markAsExported = async function(format, path) {
  this.status = 'exported';
  this.exportInfo = {
    exportedAt: new Date(),
    exportFormat: format,
    exportPath: path
  };
  await this.save();
  return this;
};

// Método para obtener resumen de la factura
invoiceSchema.methods.getSummary = function() {
  return {
    id: this._id,
    number: this.number,
    type: this.type,
    issueDate: this.issueDate,
    businessName: this.businessName,
    ruc: this.ruc,
    total: this.total,
    status: this.status,
    hasAttachments: this.hasAttachments
  };
};

// Método estático para obtener estadísticas por usuario
invoiceSchema.statics.getUserStats = async function(userId, dateFrom, dateTo) {
  const match = { user: userId };
  
  if (dateFrom || dateTo) {
    match.issueDate = {};
    if (dateFrom) match.issueDate.$gte = new Date(dateFrom);
    if (dateTo) match.issueDate.$lte = new Date(dateTo);
  }
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        totalAmount: { $sum: '$total' },
        avgAmount: { $avg: '$total' },
        byType: {
          $push: {
            type: '$type',
            total: '$total'
          }
        }
      }
    },
    {
      $project: {
        totalInvoices: 1,
        totalAmount: 1,
        avgAmount: 1,
        typeStats: {
          $reduce: {
            input: '$byType',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [[{
                    k: '$$this.type',
                    v: {
                      $add: [
                        { $ifNull: [{ $getField: { field: '$$this.type', input: '$$value' } }, 0] },
                        1
                      ]
                    }
                  }]]
                }
              ]
            }
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalInvoices: 0,
    totalAmount: 0,
    avgAmount: 0,
    typeStats: {}
  };
};

// Método estático para buscar facturas
invoiceSchema.statics.searchInvoices = async function(userId, searchParams) {
  const {
    query,
    type,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    status,
    page = 1,
    limit = 10
  } = searchParams;
  
  const match = { user: userId };
  
  // Búsqueda por texto
  if (query) {
    match.$or = [
      { number: { $regex: query, $options: 'i' } },
      { businessName: { $regex: query, $options: 'i' } },
      { ruc: { $regex: query, $options: 'i' } }
    ];
  }
  
  // Filtros adicionales
  if (type) match.type = type;
  if (status) match.status = status;
  
  if (dateFrom || dateTo) {
    match.issueDate = {};
    if (dateFrom) match.issueDate.$gte = new Date(dateFrom);
    if (dateTo) match.issueDate.$lte = new Date(dateTo);
  }
  
  if (minAmount || maxAmount) {
    match.total = {};
    if (minAmount) match.total.$gte = minAmount;
    if (maxAmount) match.total.$lte = maxAmount;
  }
  
  const invoices = await this.find(match)
    .sort({ issueDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
  
  const total = await this.countDocuments(match);
  
  return {
    invoices,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit)
  };
};

module.exports = mongoose.model('Invoice', invoiceSchema);

