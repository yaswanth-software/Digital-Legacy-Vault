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

import { firestoreAdmin } from './config/firebaseAdmin.js';

const app = express();

// ===== Security Middleware =====
app.use(securityHeaders);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl, postman) or any origin in dev
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Check if Firebase is initialized for API operations
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health' && req.path !== '/health') {
    if (!firestoreAdmin) {
      return res.status(503).json({
        success: false,
        message: 'Database service is unavailable. Please set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel Environment Variables.',
      });
    }
  }
  next();
});

// ===== Health Check =====
const handleHealth = (req, res) => {
  res.json({
    success: true,
    message: 'LegacyOS backend is running',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
};

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LegacyOS API is running',
    health: '/api/health',
  });
});

app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

// ===== API Router (supports both /api/* and /*) =====
const apiRouter = express.Router();
apiRouter.use('/users', userRoutes);
apiRouter.use('/vault', vaultRoutes);
apiRouter.use('/trusted-people', trustedPersonRoutes);
apiRouter.use('/invitations', invitationRoutes);
apiRouter.use('/continuity', continuityRoutes);
apiRouter.use('/legacy-rules', legacyRuleRoutes);
apiRouter.use('/confirmations', confirmationRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/internal', internalRoutes);
apiRouter.use('/emergency-access', emergencyAccessRoutes);
apiRouter.use('/verifications', verificationRoutes);
apiRouter.use('/releases', releaseRoutes);
apiRouter.use('/security', securityRoutes);
apiRouter.use('/privacy', privacyRoutes);
apiRouter.use('/dashboard', analyticsRoutes);
apiRouter.use('/activity', activityRoutes);
apiRouter.use('/search', searchRoutes);

app.use('/api', apiRouter);
app.use('/', apiRouter);

// ===== Error Handling =====
app.use(notFoundHandler);
app.use(errorHandler);

export default app;


