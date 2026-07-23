import * as legacyRuleService from '../services/legacyRuleService.js';
import * as legacyRuleEngine from '../services/legacyRuleEngine.js';
import { getOrCreatePrimaryVault } from '../services/vaultService.js';
import { firestoreAdmin } from '../config/firebaseAdmin.js';

export async function getRules(req, res, next) {
  try {
    const { uid } = req.user;
    const rules = await legacyRuleService.getRules(uid);
    res.json({ success: true, data: { rules } });
  } catch (error) {
    next(error);
  }
}

export async function getRuleById(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const rule = await legacyRuleService.getRuleById(uid, id);
    res.json({ success: true, data: { rule } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function createRule(req, res, next) {
  try {
    const { uid } = req.user;
    const rule = await legacyRuleService.createRule(uid, req.body);
    res.status(201).json({ success: true, message: 'Legacy rule draft created.', data: { rule } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function updateRule(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const rule = await legacyRuleService.updateRule(uid, id, req.body);
    res.json({ success: true, message: 'Legacy rule updated successfully.', data: { rule } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function deleteRule(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const result = await legacyRuleService.deleteRule(uid, id);
    res.json({ success: true, message: 'Legacy rule deleted.', data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function activateRule(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const rule = await legacyRuleService.activateRule(uid, id);
    res.json({ success: true, message: 'Legacy rule activated.', data: { rule } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function pauseRule(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const rule = await legacyRuleService.pauseRule(uid, id);
    res.json({ success: true, message: 'Legacy rule paused.', data: { rule } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function simulateRule(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const vault = await getOrCreatePrimaryVault(uid);

    // Verify ownership
    await legacyRuleService.getRuleById(uid, id);

    const simulation = await legacyRuleEngine.simulateRule(vault.id, id, req.body);
    res.json({ success: true, data: { simulation } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function evaluateRule(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const vault = await getOrCreatePrimaryVault(uid);

    // Verify ownership
    await legacyRuleService.getRuleById(uid, id);

    const result = await legacyRuleEngine.evaluateRule(vault.id, id);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function getRuleEvaluations(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const vault = await getOrCreatePrimaryVault(uid);

    // Verify ownership
    await legacyRuleService.getRuleById(uid, id);

    const snapshot = await firestoreAdmin
      .collection('vaults')
      .doc(vault.id)
      .collection('ruleEvaluations')
      .where('ruleId', '==', id)
      .orderBy('evaluatedAt', 'desc')
      .limit(30)
      .get();

    const evaluations = snapshot.docs.map(doc => doc.data());
    res.json({ success: true, data: { evaluations } });
  } catch (error) {
    next(error);
  }
}

export async function executeRuleRelease(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const result = await legacyRuleService.executeRuleRelease(uid, id);
    res.json({
      success: true,
      message: 'Controlled release executed successfully! Tokens issued to recipients.',
      data: result
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

