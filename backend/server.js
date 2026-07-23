import env from './src/config/env.js';
import app from './src/app.js';

const PORT = env.port;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('');
  console.log('=======================================');
  console.log('  LegacyOS Backend Server');
  console.log('=======================================');
  console.log(`  Status:      Running`);
  console.log(`  Host:        ${HOST}`);
  console.log(`  Port:        ${PORT}`);
  console.log(`  Environment: ${env.nodeEnv}`);
  console.log(`  Health:      http://${HOST}:${PORT}/api/health`);
  console.log('=======================================');
  console.log('');
});
