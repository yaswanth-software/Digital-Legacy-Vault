import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  activateRule,
  pauseRule,
  simulateRule,
  evaluateRule,
  getRuleEvaluations,
  executeRuleRelease
} from '../controllers/legacyRuleController.js';

const router = Router();

router.use(authenticate);

router.get('/', getRules);
router.post('/', createRule);
router.get('/:id', getRuleById);
router.patch('/:id', updateRule);
router.delete('/:id', deleteRule);

router.post('/:id/activate', activateRule);
router.post('/:id/pause', pauseRule);
router.post('/:id/simulate', simulateRule);
router.post('/:id/evaluate', evaluateRule);
router.get('/:id/evaluations', getRuleEvaluations);
router.post('/:id/release', executeRuleRelease);

export default router;

