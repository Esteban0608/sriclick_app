const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  sriId: { type: String, required: true },
  type: { type: String, enum: ['factura', 'nota_credito'], required: true },
  number: { type: String, required: true },
  date: { type: Date, required: true },
  emitter: {
    ruc: String,
    name: String,
    type: String
  },
  receiver: {
    ruc: String,
    name: String
  },
  amount: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
  xmlUrl: { type: String, required: true },
  downloadedAt: { type: Date, default: Date.now }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;
