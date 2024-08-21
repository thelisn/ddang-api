module.exports = {
  origin: [
    process.env.CORS_URL || "http://localhost:8080",
    // ...(process.env.CORS_ALLOWED_URL ? process.env.CORS_ALLOWED_URL.split(',') : []),
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};
