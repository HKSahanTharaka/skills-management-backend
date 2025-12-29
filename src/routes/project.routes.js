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

router.get('/', authenticateToken, getAllProjects);
router.post('/', authenticateToken, requireAnyRole(['admin', 'manager']), createProject);
router.post('/:id/required-skills', authenticateToken, requireAnyRole(['admin', 'manager']), addRequiredSkillToProject);
router.put('/:projectId/required-skills/:skillId', authenticateToken, requireAnyRole(['admin', 'manager']), updateRequiredSkill);
router.delete('/:projectId/required-skills/:skillId', authenticateToken, requireAnyRole(['admin', 'manager']), removeRequiredSkill);
router.get('/:id', authenticateToken, getProjectById);
router.put('/:id', authenticateToken, requireAnyRole(['admin', 'manager']), updateProject);
router.delete('/:id', authenticateToken, requireAnyRole(['admin']), deleteProject);

module.exports = router;
