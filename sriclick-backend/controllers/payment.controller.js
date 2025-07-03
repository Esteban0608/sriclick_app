const paymentService = require('../services/payment.service');
const AppError = require('../utils/appError');

exports.processPayment = async (req, res, next) => {
  try {
    const { planType, paymentMethod, receiptNumber } = req.body;
    
    const result = await paymentService.processPayment(
      req.user.id, 
      planType, 
      { method: paymentMethod, receiptNumber }
    );

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};
