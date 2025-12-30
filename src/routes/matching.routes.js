const express = require('express');
const router = express.Router();
const { findMatchingPersonnel } = require('../controllers/matching.controller');
const { authenticateToken, requireAnyRole } = require('../middleware/auth');

router.get('/project/:id', authenticateToken, requireAnyRole(['admin', 'manager']), findMatchingPersonnel);

module.exports = router;
