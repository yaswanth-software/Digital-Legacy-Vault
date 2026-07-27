import app from '../backend/src/app.js';

export default function handler(req, res) {
  // CORS Headers for Serverless Handler
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.url && (req.url.endsWith('/health') || req.url.includes('health'))) {
    return res.status(200).json({
      success: true,
      message: 'LegacyOS backend is running on Vercel',
      timestamp: new Date().toISOString(),
    });
  }

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
