/**
 * Availability Routes
 * 
 * These routes handle personnel availability tracking.
 */

const express = require('express');
const router = express.Router();
const {
  setPersonnelAvailability,
  getPersonnelAvailability,
  updatePersonnelAvailability,
  deletePersonnelAvailability
} = require('../controllers/availability.controller');

// GET /api/availability/:personnelId - Get availability periods for a personnel
router.get('/:personnelId', getPersonnelAvailability);

// POST /api/availability - Set an availability period for personnel
router.post('/', setPersonnelAvailability);

// PUT /api/availability/:id - Update an availability period
router.put('/:id', updatePersonnelAvailability);

// DELETE /api/availability/:id - Delete an availability period
router.delete('/:id', deletePersonnelAvailability);

module.exports = router;

