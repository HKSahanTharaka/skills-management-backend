/**
 * Personnel Validation Middleware
 * 
 * Uses express-validator to validate personnel data before processing.
 * Validates:
 * - name: must not be empty, max 255 characters
 * - email: must be valid email format, max 255 characters
 * - role_title: must not be empty
 * - experience_level: must be one of [Junior, Mid-Level, Senior]
 */

const { body, validationResult } = require('express-validator');

/**
 * Validation rules for creating personnel
 * All fields are required for creation
 */
const validateCreatePersonnel = [
  // Validate name: must not be empty, max 255 characters
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters'),

  // Validate email: must be valid email format, max 255 characters
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be a valid email format')
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .normalizeEmail(),

  // Validate role_title: must not be empty
  body('role_title')
    .trim()
    .notEmpty()
    .withMessage('Role title is required'),

  // Validate experience_level: must be one of [Junior, Mid-Level, Senior]
  body('experience_level')
    .notEmpty()
    .withMessage('Experience level is required')
    .isIn(['Junior', 'Mid-Level', 'Senior'])
    .withMessage('Experience level must be one of: Junior, Mid-Level, Senior'),

  // Optional fields validation
  body('profile_image_url')
    .optional()
    .isURL()
    .withMessage('Profile image URL must be a valid URL')
    .isLength({ max: 500 })
    .withMessage('Profile image URL must not exceed 500 characters'),

  body('bio')
    .optional()
    .isString()
    .withMessage('Bio must be a string'),

  body('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),

  // Middleware to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }
    next();
  }
];

/**
 * Validation rules for updating personnel
 * All fields are optional for updates
 */
const validateUpdatePersonnel = [
  // Validate name: if provided, must not be empty, max 255 characters
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters'),

  // Validate email: if provided, must be valid email format, max 255 characters
  body('email')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Email cannot be empty')
    .isEmail()
    .withMessage('Email must be a valid email format')
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .normalizeEmail(),

  // Validate role_title: if provided, must not be empty
  body('role_title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Role title cannot be empty'),

  // Validate experience_level: if provided, must be one of [Junior, Mid-Level, Senior]
  body('experience_level')
    .optional()
    .notEmpty()
    .withMessage('Experience level cannot be empty')
    .isIn(['Junior', 'Mid-Level', 'Senior'])
    .withMessage('Experience level must be one of: Junior, Mid-Level, Senior'),

  // Optional fields validation
  body('profile_image_url')
    .optional()
    .isURL()
    .withMessage('Profile image URL must be a valid URL')
    .isLength({ max: 500 })
    .withMessage('Profile image URL must not exceed 500 characters'),

  body('bio')
    .optional()
    .isString()
    .withMessage('Bio must be a string'),

  body('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),

  // Middleware to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }
    next();
  }
];

module.exports = {
  validateCreatePersonnel,
  validateUpdatePersonnel
};
