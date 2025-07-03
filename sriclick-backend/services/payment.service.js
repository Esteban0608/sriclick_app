const Payment = require('../models/payment');
const User = require('../models/User');
const AppError = require('../utils/appError');
const emailService = require('./email.service');

const PLANS = {
  free: { credits: 3000, days: 30, price: 0 },
  basic: { credits: 12000, price: 40 },
  professional: { credits: 75000, price: 75 },
  unlimited: { credits: Number.MAX_SAFE_INTEGER, price: 100 }
};

exports.processPayment = async (userId, planType, paymentData) => {
  try {
    // 1. Verificar plan válido
    if (!PLANS[planType]) {
      throw new AppError('Plan no válido', 400);
    }
    
    // 2. Verificar datos de pago
    if (planType !== 'free' && !paymentData.receiptNumber) {
      throw new AppError('Número de comprobante requerido', 400);
    }
    
    // 3. Registrar pago
    const payment = await Payment.create({
      user: userId,
      plan: planType,
      amount: PLANS[planType].price,
      method: paymentData.method,
      receiptNumber: paymentData.receiptNumber,
      status: planType === 'free' ? 'completed' : 'pending'
    });
    
    // 4. Actualizar créditos del usuario
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + PLANS[planType].days);
    
    await User.findByIdAndUpdate(userId, {
      $set: {
        'credits.remaining': PLANS[planType].credits,
        'credits.used': 0,
        'credits.plan': planType,
        'credits.expiry': expiryDate
      }
    });
    
    // 5. Enviar email de confirmación
    if (planType !== 'free') {
      await emailService.sendPaymentConfirmation(userId, payment._id);
    }
    
    return {
      success: true,
      paymentId: payment._id,
      credits: PLANS[planType].credits,
      expiryDate
    };
  } catch (err) {
    throw err;
  }
};
