import app from '../backend/src/app.js';

export default function handler(req, res) {
  try {
    return app(req, res);
  } catch (error) {
    console.error('Vercel handler execution error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverless execution error: ' + error.message,
    });
  }
}
