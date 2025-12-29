const express = require('express');
const router = express.Router();
const {
  setPersonnelAvailability,
  getPersonnelAvailability,
  updatePersonnelAvailability,
  deletePersonnelAvailability,
} = require('../controllers/availability.controller');
const { authenticateToken } = require('../middleware/auth');

router.get('/:personnelId', authenticateToken, getPersonnelAvailability);
router.post('/', authenticateToken, setPersonnelAvailability);
router.put('/:id', authenticateToken, updatePersonnelAvailability);
router.delete('/:id', authenticateToken, deletePersonnelAvailability);

module.exports = router;
