const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/payment.controller');
const authMiddleware = require('../../middlewares/auth');

// Ruta para obtener planes disponibles
router.get('/plans', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      free: {
        name: 'Plan Gratuito',
        credits: 3000,
        price: 0,
        description: '3,000 facturas/notas de crédito por 1 mes'
      },
      basic: {
        name: 'Plan Básico',
        credits: 12000,
        price: 40,
        description: '12,000 facturas/notas de crédito por 1 año'
      },
      professional: {
        name: 'Plan Profesional',
        credits: 75000,
        price: 75,
        description: '75,000 facturas/notas de crédito por 1 año'
      },
      unlimited: {
        name: 'Plan Ilimitado',
        credits: 'Ilimitados',
        price: 100,
        description: 'Facturas/notas de crédito ilimitadas por 1 año'
      }
    }
  });
});

// Ruta para procesar pagos (requiere autenticación)
router.post('/process', authMiddleware.protect, paymentController.processPayment);

module.exports = router;
