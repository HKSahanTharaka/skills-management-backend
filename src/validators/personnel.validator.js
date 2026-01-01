const { body, validationResult } = require('express-validator');

const validateCreatePersonnel = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be a valid email format')
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .normalizeEmail(),

  body('role_title').trim().notEmpty().withMessage('Role title is required'),

  body('experience_level')
    .notEmpty()
    .withMessage('Experience level is required')
    .isIn(['Junior', 'Mid-Level', 'Senior'])
    .withMessage('Experience level must be one of: Junior, Mid-Level, Senior'),

  body('profile_image_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Profile image URL must be a valid URL')
    .isLength({ max: 500 })
    .withMessage('Profile image URL must not exceed 500 characters'),

  body('bio').optional({ checkFalsy: true }).isString().withMessage('Bio must be a string'),

  body('user_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),

  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),

  body('skills.*.skill_id')
    .optional()
    .notEmpty()
    .withMessage('Skill ID is required')
    .isInt({ min: 1 })
    .withMessage('Skill ID must be a positive integer'),

  body('skills.*.proficiency_level')
    .notEmpty()
    .withMessage('Proficiency level is required')
    .isIn(['Beginner', 'Intermediate', 'Advanced', 'Expert'])
    .withMessage('Proficiency level must be one of: Beginner, Intermediate, Advanced, Expert'),

  body('skills.*.years_of_experience')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Years of experience must be a positive number'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array(),
        },
      });
    }
    next();
  },
];

const validateUpdatePersonnel = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters'),

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

  body('role_title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Role title cannot be empty'),

  body('experience_level')
    .optional()
    .notEmpty()
    .withMessage('Experience level cannot be empty')
    .isIn(['Junior', 'Mid-Level', 'Senior'])
    .withMessage('Experience level must be one of: Junior, Mid-Level, Senior'),

  body('profile_image_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Profile image URL must be a valid URL')
    .isLength({ max: 500 })
    .withMessage('Profile image URL must not exceed 500 characters'),

  body('bio').optional({ checkFalsy: true }).isString().withMessage('Bio must be a string'),

  body('user_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),

  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),

  body('skills.*.skill_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Skill ID must be a positive integer'),

  body('skills.*.proficiency_level')
    .optional()
    .isIn(['Beginner', 'Intermediate', 'Advanced', 'Expert'])
    .withMessage('Proficiency level must be one of: Beginner, Intermediate, Advanced, Expert'),

  body('skills.*.years_of_experience')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Years of experience must be a positive number'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array(),
        },
      });
    }
    next();
  },
];

module.exports = {
  validateCreatePersonnel,
  validateUpdatePersonnel,
};
