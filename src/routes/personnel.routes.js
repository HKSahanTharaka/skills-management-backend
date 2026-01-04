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
const { authenticateToken, requireAnyRole } = require('../middleware/auth');

router.get(
  '/',
  authenticateToken,
  requireAnyRole(['admin', 'manager']),
  getAllPersonnel
);
router.post(
  '/',
  authenticateToken,
  requireAnyRole(['admin', 'manager']),
  validateCreatePersonnel,
  createPersonnel
);
router.get('/:id/skills', authenticateToken, getPersonnelSkills);
router.post('/:id/skills', authenticateToken, assignSkillToPersonnel);
router.put(
  '/:personnelId/skills/:skillId',
  authenticateToken,
  updateSkillProficiency
);
router.delete(
  '/:personnelId/skills/:skillId',
  authenticateToken,
  removeSkillFromPersonnel
);
router.get('/:id', authenticateToken, getPersonnelById);
router.put('/:id', authenticateToken, validateUpdatePersonnel, updatePersonnel);
router.delete(
  '/:id',
  authenticateToken,
  requireAnyRole(['admin']),
  deletePersonnel
);

module.exports = router;
