require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Configuración inicial
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(',')
}));
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 peticiones por IP
});
app.use('/api', limiter);

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error de MongoDB:', err));

// Rutas
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
