/**
 * Allocation Routes
 *
 * These routes handle project allocation tracking.
 */

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

// GET /api/allocations/personnel/:id/utilization - Get personnel utilization (must come before /personnel/:id)
// Admin, Manager, or self (checked in controller)
router.get('/personnel/:id/utilization', authenticateToken, getPersonnelUtilization);

// GET /api/allocations/personnel/:id - Get all allocations for a specific personnel
// Admin, Manager, or self (checked in controller)
router.get('/personnel/:id', authenticateToken, getPersonnelAllocations);

// GET /api/allocations/project/:id - Get all allocations for a specific project (project team)
// Admin & Manager only
router.get('/project/:id', authenticateToken, requireAnyRole(['admin', 'manager']), getProjectTeam);

// POST /api/allocations - Create a new project allocation
// Admin & Manager only
router.post('/', authenticateToken, requireAnyRole(['admin', 'manager']), createProjectAllocation);

// PUT /api/allocations/:id - Update an existing allocation
// Admin & Manager only
router.put('/:id', authenticateToken, requireAnyRole(['admin', 'manager']), updateProjectAllocation);

// DELETE /api/allocations/:id - Delete an allocation
// Admin & Manager only
router.delete('/:id', authenticateToken, requireAnyRole(['admin', 'manager']), deleteProjectAllocation);

module.exports = router;
