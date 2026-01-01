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

router.get('/', authenticateToken, getAllSkills);
router.get('/:id', authenticateToken, getSkillById);
router.post(
  '/',
  authenticateToken,
  requireAnyRole(['admin', 'manager']),
  createSkill
);
router.put(
  '/:id',
  authenticateToken,
  requireAnyRole(['admin', 'manager']),
  updateSkill
);
router.delete(
  '/:id',
  authenticateToken,
  requireAnyRole(['admin']),
  deleteSkill
);

module.exports = router;
