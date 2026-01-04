const express = require('express');
const router = express.Router();
const { findMatchingPersonnel } = require('../controllers/matching.controller');
const { authenticateToken, requireAnyRole } = require('../middleware/auth');

// Route: GET /api/matching/projects/:id/personnel
router.get(
  '/projects/:id/personnel',
  authenticateToken,
  requireAnyRole(['admin', 'manager']),
  findMatchingPersonnel
);

module.exports = router;
