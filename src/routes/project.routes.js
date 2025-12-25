/**
 * Project Routes
 *
 * These routes handle all CRUD operations for projects management.
 */

const express = require('express');
const router = express.Router();
const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addRequiredSkillToProject,
  updateRequiredSkill,
  removeRequiredSkill,
} = require('../controllers/project.controller');

// GET /api/projects - Get all projects with optional filters, search, date range, and pagination
router.get('/', getAllProjects);

// POST /api/projects - Create a new project
router.post('/', createProject);

// Required skills routes (must come before /:id routes to avoid conflicts)
// POST /api/projects/:id/required-skills - Add a required skill to a project
router.post('/:id/required-skills', addRequiredSkillToProject);

// PUT /api/projects/:projectId/required-skills/:skillId - Update minimum proficiency for a required skill
router.put('/:projectId/required-skills/:skillId', updateRequiredSkill);

// DELETE /api/projects/:projectId/required-skills/:skillId - Remove a required skill from a project
router.delete('/:projectId/required-skills/:skillId', removeRequiredSkill);

// GET /api/projects/:id - Get a single project by ID (includes required skills and allocated personnel)
router.get('/:id', getProjectById);

// PUT /api/projects/:id - Update an existing project
router.put('/:id', updateProject);

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', deleteProject);

module.exports = router;
