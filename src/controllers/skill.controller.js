/**
 * Skill Controller
 * 
 * This controller handles all CRUD operations for skills management.
 * Includes validation, database operations, and error handling.
 */

const { pool } = require('../config/database');

/**
 * Create Skill
 * 
 * Steps:
 * 1. Validate skill_name uniqueness
 * 2. Validate category is valid enum value
 * 3. Insert into database
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const createSkill = async (req, res, next) => {
  try {
    const { skill_name, category, description } = req.body;

    // Validate required fields
    if (!skill_name || !category) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields: skill_name and category are required'
        }
      });
    }

    // Validate category is valid enum value
    const validCategories = ['Programming Language', 'Framework', 'Tool', 'Soft Skill', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
        }
      });
    }

    // Validate skill_name uniqueness
    const [existingSkills] = await pool.execute(
      'SELECT id FROM skills WHERE skill_name = ?',
      [skill_name]
    );

    if (existingSkills.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Skill name already exists'
        }
      });
    }

    // Insert into database
    const [result] = await pool.execute(
      'INSERT INTO skills (skill_name, category, description) VALUES (?, ?, ?)',
      [skill_name, category, description || null]
    );

    // Fetch the created skill
    const [createdSkill] = await pool.execute(
      'SELECT * FROM skills WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Skill created successfully',
      data: createdSkill[0]
    });
  } catch (error) {
    // Handle duplicate skill_name error from database
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Skill name already exists'
        }
      });
    }
    next(error);
  }
};

/**
 * Get All Skills
 * 
 * Supports:
 * - Filtering by category
 * - Search by skill name
 * - Pagination (optional)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getAllSkills = async (req, res, next) => {
  try {
    const { category, search, page, limit } = req.query;

    // Build base query
    let query = 'SELECT * FROM skills';
    const conditions = [];
    const params = [];

    // Add category filter
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    // Add search by skill name
    if (search) {
      conditions.push('skill_name LIKE ?');
      const searchPattern = `%${search}%`;
      params.push(searchPattern);
    }

    // Add WHERE clause if conditions exist
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add pagination if provided
    if (page && limit) {
      // Get total count for pagination (before adding ORDER BY and LIMIT)
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const [countResult] = await pool.execute(countQuery, params);
      const total = countResult[0].total;

      // Add ordering and pagination to main query
      query += ' ORDER BY skill_name ASC';
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      // Execute query
      const [skills] = await pool.execute(query, params);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / parseInt(limit));

      res.status(200).json({
        success: true,
        data: skills,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: totalPages
        }
      });
    } else {
      // Add ordering and return all skills without pagination
      query += ' ORDER BY skill_name ASC';
      const [skills] = await pool.execute(query, params);

      res.status(200).json({
        success: true,
        data: skills
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Skill
 * 
 * Get a skill by ID
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getSkillById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Query database for skill
    const [skills] = await pool.execute(
      'SELECT * FROM skills WHERE id = ?',
      [id]
    );

    // Return 404 if not found
    if (skills.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Skill not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: skills[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Skill
 * 
 * Steps:
 * 1. Check skill exists
 * 2. Validate skill_name uniqueness if changed
 * 3. Validate category if changed
 * 4. Update fields
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateSkill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { skill_name, category, description } = req.body;

    // Check skill exists
    const [existingSkills] = await pool.execute(
      'SELECT * FROM skills WHERE id = ?',
      [id]
    );

    if (existingSkills.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Skill not found'
        }
      });
    }

    const existingSkill = existingSkills[0];

    // Validate skill_name uniqueness if changed
    if (skill_name && skill_name !== existingSkill.skill_name) {
      const [nameCheck] = await pool.execute(
        'SELECT id FROM skills WHERE skill_name = ? AND id != ?',
        [skill_name, id]
      );

      if (nameCheck.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Skill name already exists'
          }
        });
      }
    }

    // Validate category if provided
    if (category) {
      const validCategories = ['Programming Language', 'Framework', 'Tool', 'Soft Skill', 'Other'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
          }
        });
      }
    }

    // Build update query dynamically (only update provided fields)
    const updateFields = [];
    const updateParams = [];

    if (skill_name !== undefined) {
      updateFields.push('skill_name = ?');
      updateParams.push(skill_name);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateParams.push(category);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateParams.push(description);
    }

    // If no fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No fields provided to update'
        }
      });
    }

    // Add id to params for WHERE clause
    updateParams.push(id);

    // Execute update
    await pool.execute(
      `UPDATE skills SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Fetch updated skill
    const [updatedSkills] = await pool.execute(
      'SELECT * FROM skills WHERE id = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Skill updated successfully',
      data: updatedSkills[0]
    });
  } catch (error) {
    // Handle duplicate skill_name error from database
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Skill name already exists'
        }
      });
    }
    next(error);
  }
};

/**
 * Delete Skill
 * 
 * Steps:
 * 1. Check if skill exists
 * 2. Check if skill is used by any personnel
 * 3. If used, prevent deletion
 * 4. If not used, delete skill
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const deleteSkill = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if skill exists
    const [existingSkills] = await pool.execute(
      'SELECT id FROM skills WHERE id = ?',
      [id]
    );

    if (existingSkills.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Skill not found'
        }
      });
    }

    // Check if skill is used by any personnel
    const [personnelSkills] = await pool.execute(
      'SELECT COUNT(*) as count FROM personnel_skills WHERE skill_id = ?',
      [id]
    );

    const usageCount = personnelSkills[0].count;

    if (usageCount > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: `Cannot delete skill: It is currently assigned to ${usageCount} personnel. Please remove the skill from all personnel before deleting.`
        }
      });
    }

    // Delete skill if not used
    await pool.execute(
      'DELETE FROM skills WHERE id = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Skill deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSkill,
  getAllSkills,
  getSkillById,
  updateSkill,
  deleteSkill
};
