import env from './src/config/env.js';
import app from './src/app.js';

const PORT = env.port;

app.listen(PORT, () => {
  console.log('');
  console.log('=======================================');
  console.log('  LegacyOS Backend Server');
  console.log('=======================================');
  console.log(`  Status:      Running`);
  console.log(`  Port:        ${PORT}`);
  console.log(`  Environment: ${env.nodeEnv}`);
  console.log(`  Health:      http://localhost:${PORT}/api/health`);
  console.log('=======================================');
  console.log('');
});
