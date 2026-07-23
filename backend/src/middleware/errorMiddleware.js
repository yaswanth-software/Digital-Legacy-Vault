import env from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);

  // Don't expose stack traces or internal details in production
  const statusCode = err.statusCode || 500;
  const message = env.isProduction()
    ? 'An internal server error occurred.'
    : err.message || 'An internal server error occurred.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.isDevelopment() && { stack: err.stack }),
  });
}
