const Invoice = require('../models/Invoice');
const User = require('../models/User');
const AppError = require('../utils/appError');
const sriService = require('../services/sri.service');

// Método para obtener facturas del usuario
exports.getUserInvoices = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const invoices = await Invoice.find({ user: userId }).sort('-date');
    
    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (err) {
    next(err);
  }
};

// Método para descargar facturas del SRI
exports.downloadInvoices = async (req, res, next) => {
  try {
    const { startDate, endDate, types } = req.body;
    const userId = req.user.id;

    // 1. Verificar créditos del usuario
    const user = await User.findById(userId);
    if (user.credits.remaining <= 0) {
      throw new AppError('Créditos insuficientes', 402);
    }

    // 2. Descargar facturas del SRI
    const invoices = await sriService.fetchInvoicesFromSRI(startDate, endDate, types);

    // 3. Guardar en la base de datos y consumir créditos
    const savedInvoices = await Invoice.insertMany(
      invoices.map(inv => ({ ...inv, user: userId }))
    );

    await User.findByIdAndUpdate(userId, {
      $inc: { 'credits.remaining': -invoices.length, 'credits.used': invoices.length }
    });

    res.status(200).json({
      success: true,
      count: savedInvoices.length,
      data: savedInvoices
    });

  } catch (err) {
    next(err);
  }
};

// Método opcional para obtener una factura específica
exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!invoice) {
      throw new AppError('Factura no encontrada', 404);
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (err) {
    next(err);
  }
};
