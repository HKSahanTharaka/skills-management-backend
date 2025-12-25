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

// GET /api/skills - Get all skills with optional filters, search, and pagination
router.get('/', getAllSkills);

// GET /api/skills/:id - Get a single skill by ID
router.get('/:id', getSkillById);

// POST /api/skills - Create a new skill
router.post('/', createSkill);

// PUT /api/skills/:id - Update an existing skill
router.put('/:id', updateSkill);

// DELETE /api/skills/:id - Delete a skill
router.delete('/:id', deleteSkill);

module.exports = router;
