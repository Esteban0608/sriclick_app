const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB conectado');
  } catch (err) {
    console.error('Error de conexión a MongoDB:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
