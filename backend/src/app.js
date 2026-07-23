import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import userRoutes from './routes/userRoutes.js';
import vaultRoutes from './routes/vaultRoutes.js';
import trustedPersonRoutes from './routes/trustedPersonRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import continuityRoutes from './routes/continuityRoutes.js';
import legacyRuleRoutes from './routes/legacyRuleRoutes.js';
import confirmationRoutes from './routes/confirmationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import internalRoutes from './routes/internalRoutes.js';
import emergencyAccessRoutes from './routes/emergencyAccessRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import releaseRoutes from './routes/releaseRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import privacyRoutes from './routes/privacyRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

// ===== Security Middleware =====
app.use(securityHeaders);
app.use(cors({
  origin: env.clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== Health Check =====
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LegacyOS API is running',
    health: '/api/health',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'LegacyOS backend is running',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// ===== API Routes =====
app.use('/api/users', userRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/trusted-people', trustedPersonRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/continuity', continuityRoutes);
app.use('/api/legacy-rules', legacyRuleRoutes);
app.use('/api/confirmations', confirmationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/emergency-access', emergencyAccessRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/releases', releaseRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/dashboard', analyticsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/search', searchRoutes);

// ===== Error Handling =====
app.use(notFoundHandler);
app.use(errorHandler);

export default app;


