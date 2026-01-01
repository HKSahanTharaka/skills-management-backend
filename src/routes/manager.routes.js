const express = require('express');
const router = express.Router();
const managerController = require('../controllers/manager.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get(
  '/stats',
  authenticateToken,
  requireRole('admin'),
  managerController.getManagerStats
);

router.get(
  '/',
  authenticateToken,
  requireRole('admin'),
  managerController.getAllManagers
);

router.get(
  '/:id',
  authenticateToken,
  requireRole('admin'),
  managerController.getManagerById
);

router.put(
  '/:id/approve',
  authenticateToken,
  requireRole('admin'),
  managerController.approveManager
);

router.put(
  '/:id/reject',
  authenticateToken,
  requireRole('admin'),
  managerController.rejectManager
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('admin'),
  managerController.deleteManager
);

module.exports = router;
