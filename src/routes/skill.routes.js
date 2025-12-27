/**
 * Skill Routes
 *
 * These routes handle all CRUD operations for skills management.
 */

const express = require('express');
const router = express.Router();
const {
  createSkill,
  getAllSkills,
  getSkillById,
  updateSkill,
  deleteSkill,
} = require('../controllers/skill.controller');
const { authenticateToken, requireAnyRole } = require('../middleware/auth');

// GET /api/skills - Get all skills with optional filters, search, and pagination
// All authenticated users can view skills
router.get('/', authenticateToken, getAllSkills);

// GET /api/skills/:id - Get a single skill by ID
// All authenticated users can view skills
router.get('/:id', authenticateToken, getSkillById);

// POST /api/skills - Create a new skill
// Admin & Manager only
router.post('/', authenticateToken, requireAnyRole(['admin', 'manager']), createSkill);

// PUT /api/skills/:id - Update an existing skill
// Admin & Manager only
router.put('/:id', authenticateToken, requireAnyRole(['admin', 'manager']), updateSkill);

// DELETE /api/skills/:id - Delete a skill
// Admin only - Only admins can delete skills
router.delete('/:id', authenticateToken, requireAnyRole(['admin']), deleteSkill);

module.exports = router;
