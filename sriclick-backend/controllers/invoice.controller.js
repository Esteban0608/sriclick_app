const User = require('../models/User');
const Invoice = require('../models/Invoice');

// @desc    Obtener todas las facturas del usuario
// @route   GET /api/invoices
// @access  Private
const getUserInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, dateFrom, dateTo } = req.query;
    
    // Construir filtros
    const filters = { user: req.user._id };
    
    if (status) {
      filters.status = status;
    }
    
    if (dateFrom || dateTo) {
      filters.issueDate = {};
      if (dateFrom) filters.issueDate.$gte = new Date(dateFrom);
      if (dateTo) filters.issueDate.$lte = new Date(dateTo);
    }

    // Ejecutar consulta con paginación
    const invoices = await Invoice.find(filters)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Contar total de documentos
    const total = await Invoice.countDocuments(filters);

    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: invoices
    });

  } catch (error) {
    console.error('Error obteniendo facturas del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener una factura específica
// @route   GET /api/invoices/:id
// @access  Private
const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Error obteniendo factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Descargar facturas del SRI
// @route   POST /api/invoices/download
// @access  Private
const downloadInvoices = async (req, res) => {
  try {
    const { 
      dateFrom, 
      dateTo, 
      ruc, 
      invoiceType = 'all',
      maxInvoices = 100 
    } = req.body;

    // Validar datos requeridos
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        message: 'Fechas de inicio y fin son requeridas'
      });
    }

    // Validar fechas
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    
    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de inicio no puede ser mayor a la fecha de fin'
      });
    }

    // Verificar créditos del usuario
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Calcular créditos necesarios (estimado)
    const creditsNeeded = Math.min(maxInvoices, 50); // Estimación conservadora
    
    if (user.plan !== 'unlimited' && user.creditsTotal !== 'Ilimitados') {
      const creditsAvailable = user.creditsTotal - user.creditsUsed;
      
      if (creditsAvailable < creditsNeeded) {
        return res.status(403).json({
          success: false,
          message: `Créditos insuficientes. Necesitas aproximadamente ${creditsNeeded} créditos, tienes ${creditsAvailable}`,
          creditsNeeded,
          creditsAvailable,
          upgradeRequired: true
        });
      }
    }

    // Simular proceso de descarga del SRI
    // En una implementación real, aquí se haría la conexión al SRI
    const simulatedInvoices = await simulateSRIDownload({
      dateFrom: startDate,
      dateTo: endDate,
      ruc,
      invoiceType,
      maxInvoices,
      userId: user._id
    });

    // Actualizar créditos usados
    if (user.plan !== 'unlimited' && user.creditsTotal !== 'Ilimitados') {
      const actualCreditsUsed = simulatedInvoices.length;
      user.creditsUsed += actualCreditsUsed;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: `Descarga completada. ${simulatedInvoices.length} facturas procesadas`,
      data: {
        invoicesDownloaded: simulatedInvoices.length,
        creditsUsed: simulatedInvoices.length,
        creditsRemaining: user.plan === 'unlimited' ? 'Ilimitados' : user.creditsTotal - user.creditsUsed,
        downloadDate: new Date(),
        invoices: simulatedInvoices
      }
    });

  } catch (error) {
    console.error('Error descargando facturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener estadísticas de facturas
// @route   GET /api/invoices/stats
// @access  Private
const getInvoiceStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Estadísticas básicas
    const totalInvoices = await Invoice.countDocuments({ user: userId });
    const totalAmount = await Invoice.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Facturas por mes (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await Invoice.aggregate([
      { 
        $match: { 
          user: userId,
          issueDate: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$issueDate' },
            month: { $month: '$issueDate' }
          },
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Facturas por tipo
    const typeStats = await Invoice.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalInvoices,
        totalAmount: totalAmount[0]?.total || 0,
        monthlyStats,
        typeStats
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función auxiliar para simular descarga del SRI
const simulateSRIDownload = async ({ dateFrom, dateTo, ruc, invoiceType, maxInvoices, userId }) => {
  // Simular delay de descarga
  await new Promise(resolve => setTimeout(resolve, 2000));

  const invoices = [];
  const invoiceTypes = ['factura', 'nota_credito', 'nota_debito'];
  
  // Generar facturas simuladas
  const numberOfInvoices = Math.min(maxInvoices, Math.floor(Math.random() * 20) + 5);
  
  for (let i = 0; i < numberOfInvoices; i++) {
    const randomDate = new Date(dateFrom.getTime() + Math.random() * (dateTo.getTime() - dateFrom.getTime()));
    
    const invoice = {
      user: userId,
      number: `001-001-${String(Math.floor(Math.random() * 999999)).padStart(9, '0')}`,
      type: invoiceTypes[Math.floor(Math.random() * invoiceTypes.length)],
      issueDate: randomDate,
      ruc: ruc || `${Math.floor(Math.random() * 9999999999)}001`,
      businessName: `Empresa Simulada ${i + 1}`,
      total: Math.floor(Math.random() * 1000) + 10,
      subtotal: 0,
      iva: 0,
      status: 'downloaded',
      downloadDate: new Date(),
      sriData: {
        accessKey: `${Math.floor(Math.random() * 999999999999999999)}`,
        authorizationDate: randomDate,
        environment: 'PRODUCCION'
      }
    };

    // Calcular subtotal e IVA
    invoice.subtotal = Math.round(invoice.total / 1.12 * 100) / 100;
    invoice.iva = Math.round((invoice.total - invoice.subtotal) * 100) / 100;

    // Guardar en base de datos
    const savedInvoice = await Invoice.create(invoice);
    invoices.push(savedInvoice);
  }

  return invoices;
};

module.exports = {
  getUserInvoices,
  getInvoice,
  downloadInvoices,
  getInvoiceStats
};

