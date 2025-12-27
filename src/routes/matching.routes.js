/**
 * Matching Routes
 *
 * These routes handle personnel matching for projects.
 */

const express = require('express');
const router = express.Router();
const { findMatchingPersonnel } = require('../controllers/matching.controller');
const { authenticateToken, requireAnyRole } = require('../middleware/auth');

// GET /api/matching/project/:id - Find personnel matching project requirements
// Admin & Manager only - Users cannot use matching system
router.get('/project/:id', authenticateToken, requireAnyRole(['admin', 'manager']), findMatchingPersonnel);

module.exports = router;
