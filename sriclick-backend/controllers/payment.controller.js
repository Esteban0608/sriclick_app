const User = require('../models/User');
const Payment = require('../models/payment');

// @desc    Activar plan gratuito
// @route   POST /api/payment/activate-free
// @access  Private
const activateFreePlan = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si ya tiene un plan activo
    if (user.plan !== 'free' && user.expiry && new Date() < user.expiry) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes un plan activo'
      });
    }

    // Activar plan gratuito
    user.plan = 'free';
    user.creditsTotal = 3000;
    user.creditsUsed = 0;
    user.expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días
    
    await user.save();

    // Registrar el "pago" gratuito
    await Payment.create({
      user: user._id,
      plan: 'free',
      amount: 0,
      paymentMethod: 'free',
      status: 'completed',
      transactionId: `free_${Date.now()}`
    });

    res.status(200).json({
      success: true,
      message: 'Plan gratuito activado exitosamente',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        creditsUsed: user.creditsUsed,
        creditsTotal: user.creditsTotal,
        expiry: user.expiry
      }
    });

  } catch (error) {
    console.error('Error activando plan gratuito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Procesar pago
// @route   POST /api/payment/process
// @access  Private
const processPayment = async (req, res) => {
  try {
    const { plan, paymentMethod, paymentData, amount } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Validar datos requeridos
    if (!plan || !paymentMethod || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: plan, paymentMethod, amount'
      });
    }

    // Definir planes disponibles
    const plans = {
      basic: { credits: 12000, price: 40, duration: 365 },
      professional: { credits: 75000, price: 75, duration: 365 },
      unlimited: { credits: 'Ilimitados', price: 100, duration: 365 }
    };

    const selectedPlan = plans[plan];
    if (!selectedPlan) {
      return res.status(400).json({
        success: false,
        message: 'Plan no válido'
      });
    }

    // Verificar que el monto coincida
    if (amount !== selectedPlan.price) {
      return res.status(400).json({
        success: false,
        message: 'El monto no coincide con el precio del plan'
      });
    }

    // Crear registro de pago
    const payment = await Payment.create({
      user: user._id,
      plan,
      amount,
      paymentMethod,
      paymentData: paymentData || {},
      status: 'pending',
      transactionId: `${paymentMethod}_${Date.now()}_${user._id}`
    });

    // Simular procesamiento de pago
    let paymentSuccess = false;
    let paymentMessage = '';

    switch (paymentMethod) {
      case 'creditCard':
        // Simular procesamiento de tarjeta de crédito
        if (paymentData && paymentData.cardNumber && paymentData.cvc) {
          paymentSuccess = true;
          paymentMessage = 'Pago con tarjeta procesado exitosamente';
        } else {
          paymentMessage = 'Datos de tarjeta incompletos';
        }
        break;

      case 'transfer':
      case 'deposit':
        // Para transferencias y depósitos, marcar como pendiente de verificación
        paymentSuccess = true;
        paymentMessage = 'Pago registrado, pendiente de verificación';
        payment.status = 'pending_verification';
        break;

      default:
        paymentMessage = 'Método de pago no válido';
    }

    if (paymentSuccess) {
      // Actualizar estado del pago
      if (paymentMethod === 'creditCard') {
        payment.status = 'completed';
      }
      await payment.save();

      // Si el pago es completado inmediatamente, actualizar el usuario
      if (payment.status === 'completed') {
        user.plan = plan;
        user.creditsTotal = selectedPlan.credits;
        user.creditsUsed = 0;
        user.expiry = new Date(Date.now() + selectedPlan.duration * 24 * 60 * 60 * 1000);
        await user.save();
      }

      res.status(200).json({
        success: true,
        message: paymentMessage,
        payment: {
          id: payment._id,
          transactionId: payment.transactionId,
          status: payment.status,
          amount: payment.amount,
          plan: payment.plan
        },
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          plan: user.plan,
          creditsUsed: user.creditsUsed,
          creditsTotal: user.creditsTotal,
          expiry: user.expiry
        }
      });

    } else {
      // Pago fallido
      payment.status = 'failed';
      payment.failureReason = paymentMessage;
      await payment.save();

      res.status(400).json({
        success: false,
        message: paymentMessage,
        payment: {
          id: payment._id,
          status: payment.status
        }
      });
    }

  } catch (error) {
    console.error('Error procesando pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener historial de pagos del usuario
// @route   GET /api/payment/history
// @access  Private
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-paymentData'); // No incluir datos sensibles

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });

  } catch (error) {
    console.error('Error obteniendo historial de pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Verificar estado de pago
// @route   GET /api/payment/:id
// @access  Private
const getPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      user: req.user._id
    }).select('-paymentData');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Error obteniendo estado de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  activateFreePlan,
  processPayment,
  getPaymentHistory,
  getPaymentStatus
};

