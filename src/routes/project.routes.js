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
const { authenticateToken, requireAnyRole } = require('../middleware/auth');

// GET /api/projects - Get all projects with optional filters, search, date range, and pagination
// Admin & Manager get all, Users get assigned only (handled in controller)
router.get('/', authenticateToken, getAllProjects);

// POST /api/projects - Create a new project
// Admin & Manager only
router.post('/', authenticateToken, requireAnyRole(['admin', 'manager']), createProject);

// Required skills routes (must come before /:id routes to avoid conflicts)
// POST /api/projects/:id/required-skills - Add a required skill to a project
// Admin & Manager only
router.post('/:id/required-skills', authenticateToken, requireAnyRole(['admin', 'manager']), addRequiredSkillToProject);

// PUT /api/projects/:projectId/required-skills/:skillId - Update minimum proficiency for a required skill
// Admin & Manager only
router.put('/:projectId/required-skills/:skillId', authenticateToken, requireAnyRole(['admin', 'manager']), updateRequiredSkill);

// DELETE /api/projects/:projectId/required-skills/:skillId - Remove a required skill from a project
// Admin & Manager only
router.delete('/:projectId/required-skills/:skillId', authenticateToken, requireAnyRole(['admin', 'manager']), removeRequiredSkill);

// GET /api/projects/:id - Get a single project by ID (includes required skills and allocated personnel)
// Admin & Manager get all, Users get assigned only (handled in controller)
router.get('/:id', authenticateToken, getProjectById);

// PUT /api/projects/:id - Update an existing project
// Admin & Manager only
router.put('/:id', authenticateToken, requireAnyRole(['admin', 'manager']), updateProject);

// DELETE /api/projects/:id - Delete a project
// Admin only - Only admins can delete projects
router.delete('/:id', authenticateToken, requireAnyRole(['admin']), deleteProject);

module.exports = router;
