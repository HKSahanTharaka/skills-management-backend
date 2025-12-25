/**
 * Matching Routes
 * 
 * These routes handle personnel matching for projects.
 */

const express = require('express');
const router = express.Router();
const {
  findMatchingPersonnel
} = require('../controllers/matching.controller');

// POST /api/matching/find-personnel - Find personnel matching project requirements
router.post('/find-personnel', findMatchingPersonnel);

module.exports = router;

