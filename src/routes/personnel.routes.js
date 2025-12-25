/**
 * Personnel Routes
 *
 * These routes handle all CRUD operations for personnel management.
 */

const express = require('express');
const router = express.Router();
const {
  createPersonnel,
  getAllPersonnel,
  getPersonnelById,
  updatePersonnel,
  deletePersonnel,
  getPersonnelSkills,
  assignSkillToPersonnel,
  updateSkillProficiency,
  removeSkillFromPersonnel,
} = require('../controllers/personnel.controller');
const {
  validateCreatePersonnel,
  validateUpdatePersonnel,
} = require('../validators/personnel.validator');

// GET /api/personnel - Get all personnel with optional filters, search, and pagination
router.get('/', getAllPersonnel);

// POST /api/personnel - Create a new personnel record
router.post('/', validateCreatePersonnel, createPersonnel);

// Skill assignment routes (must come before /:id routes to avoid conflicts)
// GET /api/personnel/:id/skills - Get all skills assigned to a personnel
router.get('/:id/skills', getPersonnelSkills);

// POST /api/personnel/:id/skills - Assign a skill to personnel
router.post('/:id/skills', assignSkillToPersonnel);

// PUT /api/personnel/:personnelId/skills/:skillId - Update skill proficiency level for personnel
router.put('/:personnelId/skills/:skillId', updateSkillProficiency);

// DELETE /api/personnel/:personnelId/skills/:skillId - Remove a skill from personnel
router.delete('/:personnelId/skills/:skillId', removeSkillFromPersonnel);

// GET /api/personnel/:id - Get a single personnel by ID (includes skills)
router.get('/:id', getPersonnelById);

// PUT /api/personnel/:id - Update an existing personnel record
router.put('/:id', validateUpdatePersonnel, updatePersonnel);

// DELETE /api/personnel/:id - Delete a personnel record
router.delete('/:id', deletePersonnel);

module.exports = router;
