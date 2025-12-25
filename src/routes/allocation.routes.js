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

// GET /api/allocations/personnel/:id/utilization - Get personnel utilization (must come before /personnel/:id)
router.get('/personnel/:id/utilization', getPersonnelUtilization);

// GET /api/allocations/personnel/:id - Get all allocations for a specific personnel
router.get('/personnel/:id', getPersonnelAllocations);

// GET /api/allocations/project/:id - Get all allocations for a specific project (project team)
router.get('/project/:id', getProjectTeam);

// POST /api/allocations - Create a new project allocation
router.post('/', createProjectAllocation);

// PUT /api/allocations/:id - Update an existing allocation
router.put('/:id', updateProjectAllocation);

// DELETE /api/allocations/:id - Delete an allocation
router.delete('/:id', deleteProjectAllocation);

module.exports = router;
