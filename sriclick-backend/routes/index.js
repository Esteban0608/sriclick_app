const express = require('express');
const router = express.Router();

// API Routes
router.use('/auth', require('./api/auth.routes'));
router.use('/payment', require('./api/payment.routes'));
router.use('/invoices', require('./api/invoice.routes'));

module.exports = router;
