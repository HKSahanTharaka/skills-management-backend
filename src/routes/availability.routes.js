const express = require('express');
const router = express.Router();
const {
  setPersonnelAvailability,
  getPersonnelAvailability,
  updatePersonnelAvailability,
  deletePersonnelAvailability,
} = require('../controllers/availability.controller');
const { authenticateToken } = require('../middleware/auth');
const {
  availabilityPermissions,
  checkPermission,
} = require('../utils/permissions');

router.get('/:personnelId', authenticateToken, getPersonnelAvailability);
router.post('/', authenticateToken, setPersonnelAvailability);
router.put('/:id', authenticateToken, updatePersonnelAvailability);
router.delete(
  '/:id',
  authenticateToken,
  (req, res, next) => {
    if (
      !checkPermission(availabilityPermissions.canDeleteAvailability, req.user)
    ) {
      return res.status(403).json({
        success: false,
        error: {
          message:
            'Access denied. Only administrators can delete availability periods.',
        },
      });
    }
    next();
  },
  deletePersonnelAvailability
);

module.exports = router;
