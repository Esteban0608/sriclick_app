const nodemailer = require('nodemailer');
const User = require('../models/User');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

exports.sendPaymentConfirmation = async (userId, paymentId) => {
  const user = await User.findById(userId);
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: 'Confirmación de Pago SRICLICK',
    html: `
      <h1>¡Pago Recibido!</h1>
      <p>Hola ${user.name},</p>
      <p>Hemos procesado tu pago exitosamente (ID: ${paymentId}).</p>
      <p>Ahora tienes acceso a tu nuevo plan.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};
