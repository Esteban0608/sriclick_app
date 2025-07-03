const express = require('express');
const router = express.Router();
const invoiceController = require('../../controllers/invoice.controller');
const authMiddleware = require('../../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.protect);

// Obtener todas las facturas del usuario
router.get('/', invoiceController.getUserInvoices);

// Obtener una factura específica
router.get('/:id', invoiceController.getInvoice);

// Descargar facturas del SRI
router.post('/download', invoiceController.downloadInvoices);

module.exports = router;
