const express = require('express');
const router = express.Router();
const {
  createProjectAllocation,
  getPersonnelUtilization,
  getProjectTeam,
  updateProjectAllocation,
  deleteProjectAllocation,
  getPersonnelAllocations,
} = require('../controllers/allocation.controller');
const { authenticateToken, requireAnyRole } = require('../middleware/auth');

router.get('/personnel/:id/utilization', authenticateToken, getPersonnelUtilization);
router.get('/personnel/:id', authenticateToken, getPersonnelAllocations);
router.get('/project/:id', authenticateToken, requireAnyRole(['admin', 'manager']), getProjectTeam);
router.post('/', authenticateToken, requireAnyRole(['admin', 'manager']), createProjectAllocation);
router.put('/:id', authenticateToken, requireAnyRole(['admin', 'manager']), updateProjectAllocation);
router.delete('/:id', authenticateToken, requireAnyRole(['admin', 'manager']), deleteProjectAllocation);

module.exports = router;
