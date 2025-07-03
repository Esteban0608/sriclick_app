module.exports = {
  rateLimits: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 20 // 20 intentos por IP
    },
    api: {
      windowMs: 15 * 60 * 1000,
      max: 100
    }
  },
  corsOptions: {
    origin: process.env.ALLOWED_ORIGINS.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
};
